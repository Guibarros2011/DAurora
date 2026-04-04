const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

export async function onRequestOptions() {
  return new Response(null, { headers: cors });
}

async function notionFetch(endpoint, method, token, body) {
  const res = await fetch(`https://api.notion.com/v1/${endpoint}`, {
    method,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28"
    },
    body: body ? JSON.stringify(body) : undefined
  });
  return res.json();
}

// ── GET /api/notion?tipo=vagas|papeis ──
export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const tipo = url.searchParams.get("tipo");

  try {
    let dbId;
    if (tipo === "vagas") dbId = env.NOTION_DB_VAGAS;
    else if (tipo === "papeis") dbId = env.NOTION_DB_PAPEIS;
    else if (tipo === "entrevistados") dbId = env.NOTION_DB_ENTREVISTADOS;
    else return new Response(JSON.stringify({ error: "tipo inválido" }), {
      status: 400, headers: { "Content-Type": "application/json", ...cors }
    });

    const data = await notionFetch(`databases/${dbId}/query`, "POST", env.NOTION_TOKEN, {});

    const items = (data.results || []).map(page => {
      const props = page.properties;
      if (tipo === "vagas") {
        return {
          id: page.id,
          url: page.url || "",
          nome: props["Nome da vaga"]?.title?.[0]?.plain_text || "",
          empreendimento: props["Empreendimento"]?.select?.name || "",
          funcao: props["Função real"]?.rich_text?.[0]?.plain_text || "",
          eneagrama: props["Eneagrama"]?.multi_select?.map(e => e.name).join(", ") || "",
          disc: props["DISC"]?.multi_select?.map(d => d.name).join(", ") || "",
          arquetipo: props["Arquétipo"]?.rich_text?.[0]?.plain_text || "",
          descricao: props["Descrição"]?.rich_text?.[0]?.plain_text || "",
          status: props["Status"]?.select?.name || ""
        };
      } else if (tipo === "papeis") {
        return {
          id: page.id,
          url: page.url || "",
          nome: props["Nome do papel"]?.title?.[0]?.plain_text || "",
          guilda: props["Guilda / Filiação"]?.select?.name || "",
          mar: props["Mar de atuação"]?.select?.name || "",
          habilidades: props["Habilidades"]?.rich_text?.[0]?.plain_text || "",
          conexao: props["Conexão com Dipé"]?.rich_text?.[0]?.plain_text || "",
          descricao: props["Descrição narrativa"]?.rich_text?.[0]?.plain_text || "",
          status: props["Status"]?.select?.name || ""
        };
      } else {
        // entrevistados
        return {
          id: page.id,
          url: page.url || "",
          nome: props["Nome"]?.title?.[0]?.plain_text || "",
          email: props["Email"]?.email || "",
          status: props["Status"]?.select?.name || "",
          vagaMatched: (props["Vaga matched"]?.relation || []).map(r => r.id),
          papelMatched: (props["Papel narrativo matched"]?.relation || []).map(r => r.id)
        };
      }
    });

    return new Response(JSON.stringify({ items }), {
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

// ── POST /api/notion ──
// Roteamento por campo "tipo": entrevistado | vaga | papel
export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const d = await request.json();

    // ── CRIAR VAGA ──
    if (d.tipo === "vaga") {
      const props = {
        "Nome da vaga": { title: [{ text: { content: d.nome || "" } }] },
        "Descrição":    { rich_text: [{ text: { content: d.descricao || "" } }] },
        "Função real":  { rich_text: [{ text: { content: d.funcao || "" } }] },
        "Arquétipo":    { rich_text: [{ text: { content: d.arquetipo || "" } }] },
        "Status":       { select: { name: d.status || "Em avaliação" } }
      };
      if (d.empreendimento) props["Empreendimento"] = { select: { name: d.empreendimento } };
      if (d.eneagrama && d.eneagrama.length) props["Eneagrama"] = { multi_select: d.eneagrama.map(n => ({ name: n })) };
      if (d.disc && d.disc.length) props["DISC"] = { multi_select: d.disc.map(n => ({ name: n })) };

      const data = await notionFetch("pages", "POST", env.NOTION_TOKEN, {
        parent: { database_id: env.NOTION_DB_VAGAS },
        properties: props
      });
      return new Response(JSON.stringify({ id: data.id }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...cors }
      });
    }

    // ── CRIAR PAPEL NARRATIVO ──
    if (d.tipo === "papel") {
      const props = {
        "Nome do papel":       { title: [{ text: { content: d.nome || "" } }] },
        "Habilidades":         { rich_text: [{ text: { content: d.habilidades || "" } }] },
        "Conexão com Dipé":    { rich_text: [{ text: { content: d.conexao || "" } }] },
        "Descrição narrativa": { rich_text: [{ text: { content: d.descricao || "" } }] },
        "Status":              { select: { name: d.status || "Disponível" } }
      };
      if (d.guilda) props["Guilda / Filiação"] = { select: { name: d.guilda } };
      if (d.mar) props["Mar de atuação"] = { select: { name: d.mar } };

      const data = await notionFetch("pages", "POST", env.NOTION_TOKEN, {
        parent: { database_id: env.NOTION_DB_PAPEIS },
        properties: props
      });
      return new Response(JSON.stringify({ id: data.id }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...cors }
      });
    }

    // ── SALVAR ENTREVISTADO (comportamento original) ──
    const props = {
      "Nome":                 { title: [{ text: { content: d.nome || "" } }] },
      "Email":                { email: d.email || null },
      "Data":                 { date: { start: new Date().toISOString().split("T")[0] } },
      "Como chegou":          { rich_text: [{ text: { content: d.como || "" } }] },
      "Arquétipo central":    { rich_text: [{ text: { content: d.arquetipo || "" } }] },
      "Função sugerida":      { rich_text: [{ text: { content: d.funcao || "" } }] },
      "Papel narrativo":      { rich_text: [{ text: { content: d.papelNarrativo || "" } }] },
      "Nota de D'Aurora":     { rich_text: [{ text: { content: (d.nota || "").substring(0, 4000) } }] },
      "Ficha Completa":       { rich_text: [{ text: { content: (d.fichaCompleta || "").substring(0, 4000) } }] },
      "Status":               { select: { name: "Entrevistado" } }
    };
    if (d.eneagrama) props["Eneagrama"] = { select: { name: d.eneagrama } };
    if (d.disc) props["DISC dominante"] = { select: { name: d.disc } };
    if (d.empreendimento) props["Empreendimento sugerido"] = { select: { name: d.empreendimento } };
    if (d.posicaoMares) props["Posição nos Mares"] = { select: { name: d.posicaoMares } };

    const data = await notionFetch("pages", "POST", env.NOTION_TOKEN, {
      parent: { database_id: env.NOTION_DB_ENTREVISTADOS },
      properties: props
    });

    return new Response(JSON.stringify({ id: data.id }), {
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

// ── PATCH /api/notion — candidatura (associar entrevistado a vaga/papel) ──
export async function onRequestPatch(context) {
  const { request, env } = context;
  try {
    const d = await request.json();

    if (d.tipo !== "candidatura" || !d.entrevistadoId || !d.itemId || !d.itemTipo) {
      return new Response(JSON.stringify({ error: "Payload inválido" }), {
        status: 400, headers: { "Content-Type": "application/json", ...cors }
      });
    }

    const resolveId = (val) => {
      const clean = val.replace("https://www.notion.so/", "").replace(/-/g, "");
      return clean.length === 32 ? clean : clean.substring(0, 32);
    };
    const entrevistadoPageId = resolveId(d.entrevistadoId);
    const itemPageId = resolveId(d.itemId);

    const properties = {};
    if (d.itemTipo === "vaga") {
      properties["Vaga matched"] = { relation: [{ id: itemPageId }] };
    } else if (d.itemTipo === "papel") {
      properties["Papel narrativo matched"] = { relation: [{ id: itemPageId }] };
    }
    properties["Status"] = { select: { name: "Na tripulação" } };

    const data = await notionFetch(`pages/${entrevistadoPageId}`, "PATCH", env.NOTION_TOKEN, {
      properties
    });

    if (data.object === "error") {
      return new Response(JSON.stringify({ error: data.message }), {
        status: 400, headers: { "Content-Type": "application/json", ...cors }
      });
    }

    return new Response(JSON.stringify({ ok: true, id: data.id }), {
      status: 200, headers: { "Content-Type": "application/json", ...cors }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { "Content-Type": "application/json", ...cors }
    });
  }
}
