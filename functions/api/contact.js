const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

export async function onRequestOptions() {
  return new Response(null, { headers: cors });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const contact = await request.json();

    const res = await fetch("https://api.brevo.com/v3/contacts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": env.BREVO_KEY
      },
      body: JSON.stringify({
        email: contact.email,
        attributes: {
          FIRSTNAME: contact.nome ? contact.nome.split(" ")[0] : "",
          LASTNAME: contact.nome ? contact.nome.split(" ").slice(1).join(" ") : "",
          NOME: contact.nome || "",
          COMO_CHEGOU: contact.como || "",
          OBS_DAURORA: contact.obs || "",
          NOTION_ID: contact.notionId || ""
        },
        listIds: [5],
        updateEnabled: true
      })
    });

    // Brevo retorna 204 No Content em updates — sem body para parsear
    if (res.status === 204 || res.headers.get("content-length") === "0") {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...cors }
      });
    }

    const data = await res.json();
    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: { "Content-Type": "application/json", ...cors }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...cors }
    });
  }
}
