const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PATCH, OPTIONS",
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
      fichaCompleta:  p["Ficha Completa"]?.rich_text?.[0]?.plain_text || "",
      nomeNarrativo:  p["Nome Narrativo"]?.rich_text?.[0]?.plain_text || "",
      background:     p["Background"]?.rich_text?.[0]?.plain_text || ""
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

// ── PATCH /api/dauranto — edição pelo colaborador ──
export async function onRequestPatch(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return new Response(JSON.stringify({ error: "ID não informado" }), {
      status: 400, headers: { "Content-Type": "application/json", ...cors }
    });
  }

  try {
    const d = await request.json();

    // Campos editáveis pelo colaborador
    const props = {};
    if (d.nomeNarrativo !== undefined) {
      props["Nome Narrativo"] = { rich_text: [{ text: { content: d.nomeNarrativo.substring(0, 500) } }] };
    }
    if (d.papel !== undefined) {
      props["Papel narrativo"] = { rich_text: [{ text: { content: d.papel.substring(0, 500) } }] };
    }
    if (d.mares !== undefined && ["Mares de Cima", "Mar do Meio", "Mares de Baixo", "Transversal"].includes(d.mares)) {
      props["Posição nos Mares"] = { select: { name: d.mares } };
    }
    if (d.background !== undefined) {
      props["Background"] = { rich_text: [{ text: { content: d.background.substring(0, 2000) } }] };
    }

    const res = await fetch(`https://api.notion.com/v1/pages/${id}`, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${env.NOTION_TOKEN}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28"
      },
      body: JSON.stringify({ properties: props })
    });

    const data = await res.json();
    if (data.status >= 400) throw new Error(data.message);

    return new Response(JSON.stringify({ ok: true }), {
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
