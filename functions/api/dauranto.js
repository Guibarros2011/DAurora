const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

export async function onRequestOptions() {
  return new Response(null, { headers: cors });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return new Response(JSON.stringify({ error: "ID não informado" }), {
      status: 400, headers: { "Content-Type": "application/json", ...cors }
    });
  }

  try {
    const res = await fetch(`https://api.notion.com/v1/pages/${id}`, {
      headers: {
        "Authorization": `Bearer ${env.NOTION_TOKEN}`,
        "Notion-Version": "2022-06-28"
      }
    });
    const page = await res.json();
    if (page.status >= 400) throw new Error(page.message);

    const p = page.properties;

    const dauranto = {
      nome:           p["Nome"]?.title?.[0]?.plain_text || "",
      email:          p["Email"]?.email || "",
      data:           p["Data"]?.date?.start || "",
      como:           p["Como chegou"]?.rich_text?.[0]?.plain_text || "",
      eneagrama:      p["Eneagrama"]?.select?.name || "",
      disc:           p["DISC dominante"]?.select?.name || "",
      arquetipo:      p["Arquétipo central"]?.rich_text?.[0]?.plain_text || "",
      empreendimento: p["Empreendimento sugerido"]?.select?.name || "",
      funcao:         p["Função sugerida"]?.rich_text?.[0]?.plain_text || "",
      papel:          p["Papel narrativo"]?.rich_text?.[0]?.plain_text || "",
      mares:          p["Posição nos Mares"]?.select?.name || "",
      nota:           p["Nota de D'Aurora"]?.rich_text?.[0]?.plain_text || "",
      avatar:         p["Avatar URL"]?.url || "",
      status:         p["Status"]?.select?.name || "",
      cover:          page.cover?.external?.url || page.cover?.file?.url || "",
      fichaCompleta:  p["Ficha Completa"]?.rich_text?.[0]?.plain_text || ""
    };

    return new Response(JSON.stringify(dauranto), {
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
