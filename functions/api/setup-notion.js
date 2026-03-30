// GET /api/setup-notion
// Roda UMA VEZ para criar DB Locações + DB Capítulos + Relation bidirecional
// Acesse: https://daurora.pages.dev/api/setup-notion?token=SEU_NOTION_TOKEN

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token') || env.NOTION_TOKEN;
  const PAI = '32ba86cd-3e89-81f0-81c0-d91f42cec2b2'; // raiz ACO

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json',
  };

  const log = [];

  try {
    // 1. Criar DB Locações
    log.push('Criando DB Locações...');
    const dbLocRes = await fetch('https://api.notion.com/v1/databases', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        parent: { type: 'page_id', page_id: PAI },
        icon: { type: 'emoji', emoji: '🗺️' },
        title: [{ type: 'text', text: { content: 'Locações · ACO' } }],
        properties: {
          'Nome': { title: {} },
          'Tipo': {
            select: {
              options: [
                { name: 'Cidade', color: 'blue' },
                { name: 'Ruína', color: 'orange' },
                { name: 'Mar / Oceano', color: 'green' },
                { name: 'Montanha', color: 'gray' },
                { name: 'Floresta', color: 'green' },
                { name: 'Ilha', color: 'yellow' },
                { name: 'Porto', color: 'blue' },
                { name: 'Fortaleza', color: 'red' },
                { name: 'Sagrado', color: 'purple' },
                { name: 'Submerso', color: 'blue' },
                { name: 'Desconhecido', color: 'default' },
              ]
            }
          },
          'Status': {
            select: {
              options: [
                { name: 'Habitado', color: 'green' },
                { name: 'Submerso', color: 'blue' },
                { name: 'Ruínas', color: 'orange' },
                { name: 'Hostil', color: 'red' },
                { name: 'Sagrado', color: 'purple' },
                { name: 'Desconhecido', color: 'default' },
              ]
            }
          },
          'Descrição': { rich_text: {} },
          'Local Real': { rich_text: {} },
          'Personagens': { multi_select: {} },
          'Coordenadas X': { number: { format: 'number' } },
          'Coordenadas Y': { number: { format: 'number' } },
          'URL Hotsite': { url: {} },
          'URL Mapa Admin': { url: {} },
        }
      })
    });

    const dbLoc = await dbLocRes.json();
    if (!dbLocRes.ok) throw new Error('DB Locações: ' + JSON.stringify(dbLoc));
    const DB_LOCACOES = dbLoc.id;
    log.push('✅ DB Locações criado: ' + DB_LOCACOES);

    // 2. Criar DB Capítulos
    log.push('Criando DB Capítulos...');
    const dbCapRes = await fetch('https://api.notion.com/v1/databases', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        parent: { type: 'page_id', page_id: PAI },
        icon: { type: 'emoji', emoji: '📖' },
        title: [{ type: 'text', text: { content: 'Capítulos · ACO' } }],
        properties: {
          'Título': { title: {} },
          'Número': { number: { format: 'number' } },
          'Status': {
            select: {
              options: [
                { name: 'Rascunho', color: 'gray' },
                { name: 'Em revisão', color: 'yellow' },
                { name: 'Publicado', color: 'green' },
              ]
            }
          },
          'Resumo': { rich_text: {} },
          'Personagens': { multi_select: {} },
        }
      })
    });

    const dbCap = await dbCapRes.json();
    if (!dbCapRes.ok) throw new Error('DB Capítulos: ' + JSON.stringify(dbCap));
    const DB_CAPITULOS = dbCap.id;
    log.push('✅ DB Capítulos criado: ' + DB_CAPITULOS);

    // 3. Adicionar Relation de Capítulos → Locações no DB Locações
    log.push('Criando Relation Locações ↔ Capítulos...');
    const relLocRes = await fetch(`https://api.notion.com/v1/databases/${DB_LOCACOES}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        properties: {
          'Capítulos': {
            relation: {
              database_id: DB_CAPITULOS,
              type: 'dual_property',
              dual_property: {}
            }
          }
        }
      })
    });
    const relLoc = await relLocRes.json();
    if (!relLocRes.ok) throw new Error('Relation: ' + JSON.stringify(relLoc));
    log.push('✅ Relation criada');

    // 4. Retorna os IDs para salvar nos secrets
    return new Response(JSON.stringify({
      ok: true,
      log,
      secrets: {
        NOTION_DB_LOCACOES: DB_LOCACOES,
        NOTION_DB_CAPITULOS: DB_CAPITULOS,
        instrucoes: 'Adicione esses dois valores como secrets nas Cloudflare Pages e faça um novo deploy.'
      }
    }, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ ok: false, log, error: err.message }, null, 2), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
