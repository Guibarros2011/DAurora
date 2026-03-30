// GET /api/locacao?id=UUID
// Busca dados da locação no R2 (marcadores.json) e enriquece com capítulos do Notion

const R2_BASE = 'https://pub-45a49d6ca0624c49b17b329f06171787.r2.dev';

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const id  = url.searchParams.get('id');

  if (!id) {
    return json({ error: 'id obrigatório' }, 400);
  }

  try {
    // 1. Busca marcadores.json no R2
    const r2Res = await fetch(`${R2_BASE}/marcadores.json`);
    if (!r2Res.ok) return json({ error: 'marcadores.json não encontrado' }, 404);

    const { marcadores } = await r2Res.json();
    const loc = (marcadores || []).find(m => m.id === id);
    if (!loc) return json({ error: 'Locação não encontrada' }, 404);

    // 2. Busca página do Notion para dados extras e capítulos relacionados
    let capitulosRelacionados = [];
    let notionBody = null;

    if (loc.notionPageId && env.NOTION_TOKEN) {
      // Busca a página
      const pageRes = await fetch(`https://api.notion.com/v1/pages/${loc.notionPageId}`, {
        headers: {
          'Authorization': `Bearer ${env.NOTION_TOKEN}`,
          'Notion-Version': '2022-06-28',
        }
      });

      if (pageRes.ok) {
        notionBody = await pageRes.json();
        // Pega IDs de capítulos relacionados (property Relation)
        const capRels = notionBody.properties?.Capítulos?.relation || [];

        if (capRels.length && env.NOTION_DB_CAPITULOS) {
          // Busca cada capítulo em paralelo
          capitulosRelacionados = await Promise.all(
            capRels.map(async ({ id: capId }) => {
              const capRes = await fetch(`https://api.notion.com/v1/pages/${capId}`, {
                headers: {
                  'Authorization': `Bearer ${env.NOTION_TOKEN}`,
                  'Notion-Version': '2022-06-28',
                }
              });
              if (!capRes.ok) return null;
              const cap = await capRes.json();
              return {
                id:      cap.id,
                titulo:  cap.properties?.Título?.title?.[0]?.plain_text  || '',
                numero:  cap.properties?.Número?.number                   || null,
                resumo:  cap.properties?.Resumo?.rich_text?.[0]?.plain_text || '',
                status:  cap.properties?.Status?.select?.name            || '',
              };
            })
          );
          capitulosRelacionados = capitulosRelacionados.filter(Boolean);
        }
      }
    }

    // 3. Monta resposta
    return json({
      id:          loc.id,
      nome:        loc.nome,
      tipo:        loc.tipo,
      descricao:   loc.descricao,
      localReal:   loc.localReal,
      personagens: loc.personagens || [],
      x:           loc.x,
      y:           loc.y,
      notionUrl:   loc.notionUrl,
      urlHotsite:  loc.urlHotsite,
      urlMapaAdmin: loc.urlMapaAdmin,
      criadoEm:    loc.criadoEm,
      capitulos:   capitulosRelacionados,
    });

  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    }
  });
}
