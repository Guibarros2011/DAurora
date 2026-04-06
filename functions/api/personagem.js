/**
 * functions/api/personagem.js
 * GET  /api/personagem?id=NOTION_PAGE_ID  → dados do personagem
 * POST /api/personagem                    → cria novo personagem
 */

const NOTION_VERSION = '2022-06-28';

function notionHeaders(env) {
  return {
    'Authorization': `Bearer ${env.NOTION_TOKEN}`,
    'Content-Type': 'application/json',
    'Notion-Version': NOTION_VERSION,
  };
}

function prop(page, key, type) {
  const p = page.properties?.[key];
  if (!p) return '';
  switch (type) {
    case 'title':       return p.title?.[0]?.plain_text || '';
    case 'rich_text':   return p.rich_text?.[0]?.plain_text || '';
    case 'select':      return p.select?.name || '';
    case 'multi_select':return (p.multi_select || []).map(o => o.name).join(', ');
    case 'url':         return p.url || '';
    case 'relation':    return (p.relation || []).map(r => r.id);
    default:            return '';
  }
}

async function getPersonagem(id, env) {
  const r = await fetch(`https://api.notion.com/v1/pages/${id}`, {
    headers: notionHeaders(env)
  });
  if (!r.ok) return null;
  const page = await r.json();

  return {
    id: page.id,
    nome:       prop(page, 'Nome em Akvon', 'title'),
    nomeReal:   prop(page, 'Nome real / apelido', 'rich_text'),
    descricao:  prop(page, 'Descrição narrativa', 'rich_text'),
    conexao:    prop(page, 'Conexão com Dipé', 'rich_text'),
    promptVisual: prop(page, 'Prompt visual', 'rich_text'),
    urlFicha:   prop(page, 'URL da ficha', 'url'),
    guilda:     prop(page, 'Guilda / Filiação', 'select'),
    mares:      prop(page, 'Posição nos Mares', 'select'),
    status:     prop(page, 'Status', 'select'),
    tipo:       prop(page, 'Tipo', 'multi_select'),
    capitulos:  prop(page, 'Capítulos', 'multi_select'),
    papelId:    prop(page, 'Papel Narrativo', 'relation')[0] || null,
    entrevistadoId: prop(page, 'Entrevistado vinculado', 'relation')[0] || null,
  };
}

async function listarPersonagens(env) {
  const dbId = env.NOTION_PERSONAGENS_DB;
  if (!dbId) return [];
  const r = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
    method: 'POST',
    headers: notionHeaders(env),
    body: JSON.stringify({ sorts: [{ property: 'Nome em Akvon', direction: 'ascending' }] })
  });
  if (!r.ok) return [];
  const data = await r.json();
  return data.results.map(page => ({
    id: page.id,
    nome:     prop(page, 'Nome em Akvon', 'title'),
    guilda:   prop(page, 'Guilda / Filiação', 'select'),
    status:   prop(page, 'Status', 'select'),
    tipo:     prop(page, 'Tipo', 'multi_select'),
    capitulos:prop(page, 'Capítulos', 'multi_select'),
  }));
}

async function criarPersonagem(dados, env) {
  const dbId = env.NOTION_PERSONAGENS_DB;
  if (!dbId) throw new Error('NOTION_PERSONAGENS_DB não configurado');

  const properties = {
    'Nome em Akvon': { title: [{ text: { content: dados.nome || '' } }] },
  };
  if (dados.nomeReal)  properties['Nome real / apelido']  = { rich_text: [{ text: { content: dados.nomeReal } }] };
  if (dados.descricao) properties['Descrição narrativa']  = { rich_text: [{ text: { content: dados.descricao } }] };
  if (dados.conexao)   properties['Conexão com Dipé']     = { rich_text: [{ text: { content: dados.conexao } }] };
  if (dados.guilda)    properties['Guilda / Filiação']     = { select: { name: dados.guilda } };
  if (dados.mares)     properties['Posição nos Mares']     = { select: { name: dados.mares } };
  if (dados.status)    properties['Status']                = { select: { name: dados.status } };
  if (dados.tipo?.length) properties['Tipo'] = { multi_select: dados.tipo.map(t => ({ name: t })) };
  if (dados.capitulos?.length) properties['Capítulos'] = { multi_select: dados.capitulos.map(c => ({ name: c })) };
  if (dados.papelId)   properties['Papel Narrativo'] = { relation: [{ id: dados.papelId }] };
  if (dados.entrevistadoId) properties['Entrevistado vinculado'] = { relation: [{ id: dados.entrevistadoId }] };

  const r = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: notionHeaders(env),
    body: JSON.stringify({ parent: { database_id: dbId }, properties })
  });
  const page = await r.json();
  if (!r.ok) throw new Error(page.message || 'Erro ao criar personagem');
  return { id: page.id, url: page.url };
}

export async function onRequest(ctx) {
  const { request, env } = ctx;
  const url = new URL(request.url);
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

  try {
    // GET /api/personagem?id=xxx → busca um
    // GET /api/personagem         → lista todos
    if (request.method === 'GET') {
      const id = url.searchParams.get('id');
      if (id) {
        const p = await getPersonagem(id, env);
        if (!p) return new Response(JSON.stringify({ error: 'Não encontrado' }), { status: 404, headers: cors });
        return new Response(JSON.stringify(p), { headers: cors });
      } else {
        const lista = await listarPersonagens(env);
        return new Response(JSON.stringify({ items: lista }), { headers: cors });
      }
    }

    // POST /api/personagem → cria novo
    if (request.method === 'POST') {
      const dados = await request.json();
      const result = await criarPersonagem(dados, env);
      return new Response(JSON.stringify(result), { headers: cors });
    }

    return new Response(JSON.stringify({ error: 'Método não permitido' }), { status: 405, headers: cors });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: cors });
  }
}
