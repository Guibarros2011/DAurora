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
    const { to, toName, subject, htmlContent, attachment, attachmentName } = await request.json();

    const payload = {
      sender: { name: "D'Aurora · Cruzada dos Oceanos", email: env.SENDER_EMAIL },
      to: [{ email: to, name: toName }],
      subject,
      htmlContent,
      attachment: [{
        content: attachment,
        name: attachmentName,
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      }]
    };

    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": env.BREVO_KEY },
      body: JSON.stringify(payload)
    });

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
