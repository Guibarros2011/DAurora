const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const contact = await request.clone().json();
    const res = await fetch("https://api.brevo.com/v3/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": env.BREVO_KEY },
      body: JSON.stringify({
        email: contact.email,
        attributes: {
          FIRSTNAME: contact.nome.split(" ")[0],
          LASTNAME: contact.nome.split(" ").slice(1).join(" "),
          COMO_CHEGOU: contact.como || "",
          OBS_DAURORA: contact.obs || "",
        },
        listIds: [3], // ← Trocar pelo ID da lista D'Aurora no Brevo
        updateEnabled: true,
      }),
    });
    const data = await res.json();
    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
}
