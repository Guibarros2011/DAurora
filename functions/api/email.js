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


    // ── Notificação para Vilhelmo ──
    await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": env.BREVO_KEY },
      body: JSON.stringify({
        sender: { name: "Sistema D'Aurora", email: env.SENDER_EMAIL },
        to: [{ email: env.SENDER_EMAIL, name: "Vilhelmo" }],
        subject: `📜 Ficha gerada — ${toName} (${to})`,
        htmlContent: `
          <div style="font-family:Georgia,serif;max-width:500px;margin:0 auto;padding:32px;background:#f5f0e8">
            <p style="font-size:12px;letter-spacing:0.2em;text-transform:uppercase;color:#b08830">
              Sistema D'Aurora · Cruzada dos Oceanos
            </p>
            <h2 style="color:#16303f;margin:16px 0 8px">Entrevista concluída</h2>
            <p style="color:#3a3028;margin-bottom:8px"><strong>Nome:</strong> ${toName}</p>
            <p style="color:#3a3028;margin-bottom:8px"><strong>Email:</strong> ${to}</p>
            <p style="color:#3a3028;margin-bottom:24px"><strong>Ficha:</strong> gerada e enviada para o entrevistado</p>
            <p style="font-size:12px;color:#8a6a28;border-top:1px solid rgba(176,136,48,0.3);padding-top:16px">
              Acesse o painel admin para confirmar pagamento e mover para DAurora sim.
            </p>
          </div>`
      })
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
