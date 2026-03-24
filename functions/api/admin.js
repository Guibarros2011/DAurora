const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-admin-password"
};

export async function onRequestOptions() {
  return new Response(null, { headers: cors });
}

const BREVO_LIST_ENTREVISTADOS = 5; // "Entrevistados D'Aurora"
const BREVO_LIST_FUNDADORES    = 6; // "DAurora sim"
const BREVO_LIST_NAO_CONV      = 7; // "DAurora nao"
const ADMIN_PASSWORD           = "prakto1234";

// ── AUTH ──
function checkAuth(request) {
  const auth = request.headers.get("x-admin-password") || "";
  return auth === ADMIN_PASSWORD;
}

function unauthorized() {
  return new Response(JSON.stringify({ error: "unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json", ...cors }
  });
}

// ── GET — listar contatos da lista de entrevistados ──
export async function onRequestGet(context) {
  const { request, env } = context;
  if (!checkAuth(request)) return unauthorized();

  try {
    const res = await fetch(
      `https://api.brevo.com/v3/contacts/lists/${BREVO_LIST_ENTREVISTADOS}/contacts/all?limit=100&sort=desc`,
      { headers: { "api-key": env.BREVO_KEY, "Content-Type": "application/json" } }
    );
    const data = await res.json();

    // Para cada contato, busca detalhes (incluindo listIds e atributos)
    const detalhes = await Promise.all(
      (data.contacts || []).map(async c => {
        try {
          const r = await fetch(`https://api.brevo.com/v3/contacts/${encodeURIComponent(c.email)}`, {
            headers: { "api-key": env.BREVO_KEY }
          });
          return await r.json();
        } catch {
          return c;
        }
      })
    );

    return new Response(JSON.stringify({ contacts: detalhes }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...cors }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...cors }
    });
  }
}

// ── POST — ações: confirmar | rejeitar ──
export async function onRequestPost(context) {
  const { request, env } = context;
  if (!checkAuth(request)) return unauthorized();

  try {
    const body = await request.json();
    const { action, contactId, email, tier } = body;

    if (action === "confirmar") {
      // 1. Adiciona à lista "DAurora sim" (#6)
      await fetch("https://api.brevo.com/v3/contacts/lists/addContact", {
        method: "POST",
        headers: { "Content-Type": "application/json", "api-key": env.BREVO_KEY },
        body: JSON.stringify({ emails: [email], ids: [BREVO_LIST_FUNDADORES] })
      });

      // 2. Atualiza atributo TIER no contato
      if (tier) {
        await fetch(`https://api.brevo.com/v3/contacts/${encodeURIComponent(email)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", "api-key": env.BREVO_KEY },
          body: JSON.stringify({ attributes: { TIER: String(tier) } })
        });
      }

      // 3. Notifica Vilhelmo por email via Brevo
      await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "Content-Type": "application/json", "api-key": env.BREVO_KEY },
        body: JSON.stringify({
          sender: { name: "Sistema D'Aurora", email: env.SENDER_EMAIL },
          to: [{ email: env.SENDER_EMAIL, name: "Vilhelmo" }],
          subject: `⚓ Fundador confirmado — ${email}`,
          htmlContent: `
            <div style="font-family:Georgia,serif;max-width:500px;margin:0 auto;padding:32px;background:#f5f0e8">
              <p style="font-size:12px;letter-spacing:0.2em;text-transform:uppercase;color:#b08830">
                Painel D'Aurora · Cruzada dos Oceanos
              </p>
              <h2 style="color:#16303f;margin:16px 0 8px">Novo Fundador confirmado</h2>
              <p style="color:#3a3028;margin-bottom:8px"><strong>Email:</strong> ${email}</p>
              <p style="color:#3a3028;margin-bottom:8px"><strong>Tier:</strong> R$${tier || '—'}</p>
              <p style="color:#3a3028;margin-bottom:24px"><strong>Lista:</strong> DAurora sim (#${BREVO_LIST_FUNDADORES})</p>
              <p style="font-size:12px;color:#8a6a28;border-top:1px solid rgba(176,136,48,0.3);padding-top:16px">
                Automação 2 (Sefa + convocação Aldric) será disparada automaticamente pelo Brevo.
              </p>
            </div>`
        })
      });

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...cors }
      });
    }

    if (action === "rejeitar") {
      // Adiciona à lista "DAurora nao"
      await fetch("https://api.brevo.com/v3/contacts/lists/addContact", {
        method: "POST",
        headers: { "Content-Type": "application/json", "api-key": env.BREVO_KEY },
        body: JSON.stringify({ emails: [email], ids: [BREVO_LIST_NAO_CONV] })
      });

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...cors }
      });
    }

    return new Response(JSON.stringify({ error: "Ação desconhecida" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...cors }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...cors }
    });
  }
}
