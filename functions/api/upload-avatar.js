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
    const formData = await request.formData();
    const file = formData.get("file");
    const notionId = formData.get("notionId");

    if (!file) {
      return new Response(JSON.stringify({ error: "Arquivo não encontrado" }), {
        status: 400, headers: { "Content-Type": "application/json", ...cors }
      });
    }

    // ── 1. Upload para Cloudflare Images ──
    const cfForm = new FormData();
    cfForm.append("file", file);

    const cfRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/images/v1`,
      {
        method: "POST",
        headers: { "Authorization": `Bearer ${env.CF_IMAGES_TOKEN}` },
        body: cfForm
      }
    );

    const cfData = await cfRes.json();

    if (!cfData.success) {
      throw new Error(cfData.errors?.[0]?.message || "Erro no upload");
    }

    const imageUrl = cfData.result.variants[0];

    // ── 2. Atualizar Avatar URL no Notion ──
    if (notionId) {
      await fetch(`https://api.notion.com/v1/pages/${notionId}`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${env.NOTION_TOKEN}`,
          "Content-Type": "application/json",
          "Notion-Version": "2022-06-28"
        },
        body: JSON.stringify({
          cover: { type: "external", external: { url: imageUrl } },
          properties: {
            "Avatar URL": { url: imageUrl }
          }
        })
      });
    }

    return new Response(JSON.stringify({ url: imageUrl }), {
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
