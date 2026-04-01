// POST /api/marcadores  → cria pin no R2 + página no Notion
// GET  /api/marcadores  → lista todos os marcadores
// Usa R2 binding nativo (wrangler.toml) — sem assinatura AWS

const R2_PUBLIC   = 'https://pub-45a49d6ca0624c49b17b329f06171787.r2.dev';
const MARCADORES_KEY = 'marcadores.json';

// ── R2 helpers ────────────────────────────────────────────────────────────────

async function r2Get(env) {
  // Lê via URL pública (sem autenticação)
  const res = await fetch(`${R2_PUBLIC}/${MARCADORES_KEY}?_=${Date.now()}`);
  if (!res.ok) return { marcadores: [] };
  return res.json();
}

async function r2Put(env, data) {
  // Escreve via binding nativo — env.MAPAS_BUCKET é o bucket daurora-mapas
  const body = JSON.stringify(data, null, 2);
  await env.MAPAS_BUCKET.put(MARCADORES_KEY, body, {
    httpMetadata: { contentType: 'application/json' },
  });
}

// ── Notion helpers ────────────────────────────────────────────────────────────

async function notionPost(env, path, body) {
  const res = await fetch('https://api.notion.com/v1' + path, {
    method: 'POST',
    headers: {
      'Authorization':  `Bearer ${env.NOTION_TOKEN}`,
      'Notion-Version': '2022-06-28',
      'Content-Type':   'application/json',
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

// ── GET ───────────────────────────────────────────────────────────────────────

export async function onRequestGet({ env }) {
  try {
    const data = await r2Get(env);
    return json(data);
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function onRequestPost({ request, env }) {
  const ADMIN_BASE = 'https://daurora.pages.dev';

  try {
    const body = await request.json();
    const { nome, tipo, capitulo, descricao, personagens, localReal, x, y } = body;

    if (!nome || x == null || y == null) {
      return json({ error: 'nome, x e y são obrigatórios' }, 400);
    }

    const id           = crypto.randomUUID();
    const urlHotsite   = `${ADMIN_BASE}/locacao.html?id=${id}`;
    const urlMapaAdmin = `${ADMIN_BASE}/admin.html#mapa-marcador-${id}`;

    // ── 1. Cria página no Notion ──────────────────────────────────────────────
    const personagensArr = (personagens || []).map(p => ({ name: p }));

    const paginaNotion = await notionPost(env, '/pages', {
      parent: { database_id: env.NOTION_DB_LOCACOES },
      icon:   { type: 'emoji', emoji: '📍' },
      properties: {
        'Nome':           { title:     [{ text: { content: nome } }] },
        'Tipo':           tipo        ? { select:    { name: tipo } }                          : undefined,
        'Descrição':      descricao   ? { rich_text: [{ text: { content: descricao } }] }      : undefined,
        'Local Real':     localReal   ? { rich_text: [{ text: { content: localReal } }] }      : undefined,
        'Personagens':    personagensArr.length ? { multi_select: personagensArr }             : undefined,
        'Coordenadas X':  { number: x },
        'Coordenadas Y':  { number: y },
        'URL Hotsite':    { url: urlHotsite },
        'URL Mapa Admin': { url: urlMapaAdmin },
      },
      children: [
        {
          object: 'block', type: 'heading_2',
          heading_2: { rich_text: [{ text: { content: '📌 Sobre esta locação' } }] }
        },
        {
          object: 'block', type: 'paragraph',
          paragraph: { rich_text: [{ text: { content: descricao || 'Descrição a ser preenchida.' } }] }
        },
        { object: 'block', type: 'divider', divider: {} },
        {
          object: 'block', type: 'heading_3',
          heading_3: { rich_text: [{ text: { content: '🔗 Links' } }] }
        },
        {
          object: 'block', type: 'bulleted_list_item',
          bulleted_list_item: { rich_text: [{ type: 'text', text: { content: '🌐 Hotsite da locação', link: { url: urlHotsite } } }] }
        },
        {
          object: 'block', type: 'bulleted_list_item',
          bulleted_list_item: { rich_text: [{ type: 'text', text: { content: '🗺️ Ver pin no mapa interativo', link: { url: urlMapaAdmin } } }] }
        },
      ]
    });

    if (paginaNotion.object === 'error') {
      throw new Error('Notion: ' + paginaNotion.message);
    }

    const notionPageId = paginaNotion.id;
    const notionUrl    = `https://www.notion.so/${notionPageId.replace(/-/g, '')}`;

    // ── 2. Lê marcadores atuais e adiciona o novo ─────────────────────────────
    const dados      = await r2Get(env);
    const marcadores = dados.marcadores || [];

    const novoMarcador = {
      id, nome, tipo: tipo || null,
      capitulo:    capitulo    || null,
      descricao:   descricao   || null,
      personagens: personagens || [],
      localReal:   localReal   || null,
      x, y,
      notionPageId,
      notionUrl,
      urlHotsite,
      urlMapaAdmin,
      criadoEm: new Date().toISOString(),
    };

    marcadores.push(novoMarcador);

    // ── 3. Salva no R2 via binding ────────────────────────────────────────────
    await r2Put(env, { marcadores });

    return json({ ok: true, marcador: novoMarcador });

  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

// ── PATCH /api/marcadores?id=UUID — edita marcador existente ─────────────────

export async function onRequestPatch({ request, env }) {
  const url = new URL(request.url);
  const id  = url.searchParams.get('id');
  if (!id) return json({ error: 'id obrigatório' }, 400);

  try {
    const body = await request.json();
    const { nome, tipo, status, capitulo, descricao, personagens, localReal } = body;

    // 1. Lê marcadores atuais
    const dados      = await r2Get(env);
    const marcadores = dados.marcadores || [];
    const idx        = marcadores.findIndex(m => m.id === id);
    if (idx === -1) return json({ error: 'Marcador não encontrado' }, 404);

    const atual = marcadores[idx];

    // 2. Aplica apenas os campos enviados
    const atualizado = {
      ...atual,
      nome:        nome        ?? atual.nome,
      tipo:        tipo        ?? atual.tipo,
      status:      status      ?? atual.status,
      capitulo:    capitulo    ?? atual.capitulo,
      descricao:   descricao   ?? atual.descricao,
      personagens: personagens ?? atual.personagens,
      localReal:   localReal   ?? atual.localReal,
      editadoEm:   new Date().toISOString(),
    };
    marcadores[idx] = atualizado;

    // 3. Atualiza no R2
    await r2Put(env, { marcadores });

    // 4. Atualiza página no Notion (se tiver notionPageId)
    if (atualizado.notionPageId && env.NOTION_TOKEN) {
      const personagensArr = (atualizado.personagens || []).map(p => ({ name: p }));
      const props = {
        'Nome':          { title:     [{ text: { content: atualizado.nome } }] },
        'Descrição':     { rich_text: [{ text: { content: atualizado.descricao   || '' } }] },
        'Local Real':    { rich_text: [{ text: { content: atualizado.localReal   || '' } }] },
      };
      if (atualizado.tipo)     props['Tipo']       = { select: { name: atualizado.tipo } };
      if (atualizado.status)   props['Status']     = { select: { name: atualizado.status } };
      if (personagensArr.length) props['Personagens'] = { multi_select: personagensArr };

      await fetch(`https://api.notion.com/v1/pages/${atualizado.notionPageId}`, {
        method: 'PATCH',
        headers: {
          'Authorization':  `Bearer ${env.NOTION_TOKEN}`,
          'Notion-Version': '2022-06-28',
          'Content-Type':   'application/json',
        },
        body: JSON.stringify({ properties: props }),
      });
    }

    return json({ ok: true, marcador: atualizado });

  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

// ── DELETE /api/marcadores?id=UUID — remove marcador ─────────────────────────

export async function onRequestDelete({ request, env }) {
  const url = new URL(request.url);
  const id  = url.searchParams.get('id');
  if (!id) return json({ error: 'id obrigatório' }, 400);

  try {
    // 1. Lê marcadores atuais
    const dados      = await r2Get(env);
    const marcadores = dados.marcadores || [];
    const idx        = marcadores.findIndex(m => m.id === id);
    if (idx === -1) return json({ error: 'Marcador não encontrado' }, 404);

    const removido = marcadores[idx];
    marcadores.splice(idx, 1);

    // 2. Salva lista atualizada no R2
    await r2Put(env, { marcadores });

    // 3. Arquiva (não deleta) a página no Notion — marca como Ruínas
    if (removido.notionPageId && env.NOTION_TOKEN) {
      await fetch(`https://api.notion.com/v1/pages/${removido.notionPageId}`, {
        method: 'PATCH',
        headers: {
          'Authorization':  `Bearer ${env.NOTION_TOKEN}`,
          'Notion-Version': '2022-06-28',
          'Content-Type':   'application/json',
        },
        body: JSON.stringify({ archived: true }),
      });
    }

    return json({ ok: true, id });

  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

// ── OPTIONS (CORS) ────────────────────────────────────────────────────────────

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}

// ── util ──────────────────────────────────────────────────────────────────────

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type':                 'application/json',
      'Access-Control-Allow-Origin':  '*',
    }
  });
}
