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

    const fileBuffer = await file.arrayBuffer();
    const ext = (file.name || "avatar.jpg").split(".").pop().toLowerCase();
    const fileName = `avatars/${notionId || "anon"}-${Date.now()}.${ext}`;
    const contentType = file.type || "image/jpeg";

    // ── Upload via R2 Binding ──
    await env.AVATAR_BUCKET.put(fileName, fileBuffer, {
      httpMetadata: { contentType }
    });

    const publicUrl = `https://pub-06bd955ab8934c659efe6c112f23c443.r2.dev/${fileName}`;

    // ── Atualizar Notion ──
    if (notionId) {
      await fetch(`https://api.notion.com/v1/pages/${notionId}`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${env.NOTION_TOKEN}`,
          "Content-Type": "application/json",
          "Notion-Version": "2022-06-28"
        },
        body: JSON.stringify({
          cover: { type: "external", external: { url: publicUrl } },
          properties: { "Avatar URL": { url: publicUrl } }
        })
      });
    }

    return new Response(JSON.stringify({ url: publicUrl }), {
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
