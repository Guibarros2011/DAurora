// POST /api/marcadores  → cria pin no R2 + página no Notion
// GET  /api/marcadores  → lista todos os marcadores

const R2_BUCKET_URL = 'https://pub-45a49d6ca0624c49b17b329f06171787.r2.dev';
const MARCADORES_KEY = 'marcadores.json';
const ACCOUNT_ID     = '4a63bed3df747f03a75ad838248403dd';

// ── helpers R2 ────────────────────────────────────────────────────────────────

async function r2Get(env) {
  const url = `${R2_BUCKET_URL}/${MARCADORES_KEY}`;
  const res = await fetch(url);
  if (!res.ok) return { marcadores: [] };
  return res.json();
}

async function r2Put(env, data) {
  // Usa a API S3-compatível do R2
  const body = JSON.stringify(data, null, 2);
  const endpoint = `https://${ACCOUNT_ID}.r2.cloudflarestorage.com/daurora-mapas/${MARCADORES_KEY}`;

  // Assina com AWS Signature V4
  const signed = await signedR2Request(env, 'PUT', endpoint, body);
  const res = await fetch(endpoint, {
    method: 'PUT',
    headers: {
      ...signed,
      'Content-Type': 'application/json',
    },
    body,
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error('R2 PUT falhou: ' + txt);
  }
}

// ── AWS Signature V4 para R2 ──────────────────────────────────────────────────

async function signedR2Request(env, method, url, body = '') {
  const accessKeyId     = env.R2_ACCESS_KEY_ID;
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY;
  const region          = 'auto';
  const service         = 's3';

  const now     = new Date();
  const date    = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const dateDay = date.slice(0, 8);

  const parsedUrl  = new URL(url);
  const host       = parsedUrl.host;
  const path       = parsedUrl.pathname;

  const bodyHash = await sha256hex(body);

  const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';
  const canonicalHeaders = [
    `content-type:application/json`,
    `host:${host}`,
    `x-amz-content-sha256:${bodyHash}`,
    `x-amz-date:${date}`,
  ].join('\n') + '\n';

  const canonicalRequest = [
    method,
    path,
    '',
    canonicalHeaders,
    signedHeaders,
    bodyHash,
  ].join('\n');

  const credentialScope = `${dateDay}/${region}/${service}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    date,
    credentialScope,
    await sha256hex(canonicalRequest),
  ].join('\n');

  const signingKey = await getSigningKey(secretAccessKey, dateDay, region, service);
  const signature  = await hmacHex(signingKey, stringToSign);

  return {
    'x-amz-date':          date,
    'x-amz-content-sha256': bodyHash,
    'Authorization': [
      `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}`,
      `SignedHeaders=${signedHeaders}`,
      `Signature=${signature}`,
    ].join(', '),
  };
}

async function sha256hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hmac(key, msg) {
  const k = typeof key === 'string'
    ? await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    : await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return crypto.subtle.sign('HMAC', k, new TextEncoder().encode(msg));
}

async function hmacHex(key, msg) {
  const buf = await hmac(key, msg);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getSigningKey(secret, date, region, service) {
  const kDate    = await hmac('AWS4' + secret, date);
  const kRegion  = await hmac(kDate, region);
  const kService = await hmac(kRegion, service);
  return hmac(kService, 'aws4_request');
}

// ── Notion helpers ────────────────────────────────────────────────────────────

async function notionPost(env, path, body) {
  const res = await fetch('https://api.notion.com/v1' + path, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.NOTION_TOKEN}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function notionPatch(env, path, body) {
  const res = await fetch('https://api.notion.com/v1' + path, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${env.NOTION_TOKEN}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

// Busca capítulos que mencionam a locação pelo nome
async function buscarCapitulos(env, nomeLocacao) {
  if (!env.NOTION_DB_CAPITULOS) return [];
  const res = await fetch(`https://api.notion.com/v1/databases/${env.NOTION_DB_CAPITULOS}/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.NOTION_TOKEN}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      filter: {
        property: 'Locações',
        relation: { is_not_empty: true }
      }
    })
  });
  if (!res.ok) return [];
  const data = await res.json();
  // Filtra apenas os capítulos que de fato têm relação com alguma locação
  // (a relação real será feita via ID após criar a página)
  return (data.results || []).map(p => ({
    id: p.id,
    titulo: p.properties?.Título?.title?.[0]?.plain_text || '',
    numero: p.properties?.Número?.number || null,
  }));
}

// ── Handler principal ─────────────────────────────────────────────────────────

export async function onRequestGet({ env }) {
  try {
    const data = await r2Get(env);
    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}

export async function onRequestPost({ request, env }) {
  const ADMIN_BASE = 'https://daurora.pages.dev';

  try {
    const body = await request.json();
    const { nome, tipo, capitulo, descricao, personagens, localReal, x, y } = body;

    if (!nome || x == null || y == null) {
      return new Response(JSON.stringify({ error: 'nome, x e y são obrigatórios' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Gera ID único para o marcador
    const id = crypto.randomUUID();
    const urlHotsite   = `${ADMIN_BASE}/locacao.html?id=${id}`;
    const urlMapaAdmin = `${ADMIN_BASE}/admin.html#mapa-marcador-${id}`;

    // ── 1. Cria página no Notion ──────────────────────────────────────────────
    const personagensArr = (personagens || []).map(p => ({ name: p }));

    const paginaNotion = await notionPost(env, '/pages', {
      parent: { database_id: env.NOTION_DB_LOCACOES },
      icon: { type: 'emoji', emoji: '📍' },
      properties: {
        'Nome':           { title: [{ text: { content: nome } }] },
        'Tipo':           tipo        ? { select: { name: tipo } }               : undefined,
        'Descrição':      descricao   ? { rich_text: [{ text: { content: descricao } }] } : undefined,
        'Local Real':     localReal   ? { rich_text: [{ text: { content: localReal } }] } : undefined,
        'Personagens':    personagensArr.length ? { multi_select: personagensArr } : undefined,
        'Coordenadas X':  { number: x },
        'Coordenadas Y':  { number: y },
        'URL Hotsite':    { url: urlHotsite },
        'URL Mapa Admin': { url: urlMapaAdmin },
      },
      children: [
        {
          object: 'block',
          type: 'heading_2',
          heading_2: { rich_text: [{ text: { content: '📌 Sobre esta locação' } }] }
        },
        {
          object: 'block',
          type: 'paragraph',
          paragraph: { rich_text: [{ text: { content: descricao || 'Descrição a ser preenchida.' } }] }
        },
        {
          object: 'block',
          type: 'divider',
          divider: {}
        },
        {
          object: 'block',
          type: 'heading_3',
          heading_3: { rich_text: [{ text: { content: '🔗 Links' } }] }
        },
        {
          object: 'block',
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: [{
              type: 'text',
              text: { content: '🌐 Hotsite da locação', link: { url: urlHotsite } }
            }]
          }
        },
        {
          object: 'block',
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: [{
              type: 'text',
              text: { content: '🗺️ Ver pin no mapa interativo', link: { url: urlMapaAdmin } }
            }]
          }
        },
      ].filter(Boolean)
    });

    if (paginaNotion.object === 'error') {
      throw new Error('Notion: ' + paginaNotion.message);
    }

    const notionPageId = paginaNotion.id;
    const notionUrl    = `https://www.notion.so/${notionPageId.replace(/-/g, '')}`;

    // ── 2. Salva no R2 ────────────────────────────────────────────────────────
    const dados = await r2Get(env);
    const marcadores = dados.marcadores || [];

    const novoMarcador = {
      id,
      nome,
      tipo:        tipo        || null,
      capitulo:    capitulo    || null,
      descricao:   descricao   || null,
      personagens: personagens || [],
      localReal:   localReal   || null,
      x,
      y,
      notionPageId,
      notionUrl,
      urlHotsite,
      urlMapaAdmin,
      criadoEm: new Date().toISOString(),
    };

    marcadores.push(novoMarcador);
    await r2Put(env, { marcadores });

    // ── 3. Retorna resposta ───────────────────────────────────────────────────
    return new Response(JSON.stringify({
      ok: true,
      marcador: novoMarcador,
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}
