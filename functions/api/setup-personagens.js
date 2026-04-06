/**
 * setup-personagens.js — Cria database Personagens no Notion
 * Uso: NOTION_TOKEN=secret_xxx node setup-personagens.js
 */

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const PAGE_ID = '32ba86cd3e8981f081c0d91f42cec2b2';

if (!NOTION_TOKEN) { console.error('Defina NOTION_TOKEN=secret_xxx'); process.exit(1); }

const H = {
  'Authorization': `Bearer ${NOTION_TOKEN}`,
  'Content-Type': 'application/json',
  'Notion-Version': '2022-06-28'
};

async function n(method, path, body) {
  const r = await fetch(`https://api.notion.com/v1${path}`, {
    method, headers: H, body: body ? JSON.stringify(body) : undefined
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.message || JSON.stringify(d));
  return d;
}

async function main() {
  console.log('\n══════════════════════════════════════════');
  console.log('  Setup · Personagens · Universo ACO');
  console.log('══════════════════════════════════════════\n');

  // Busca databases existentes para criar relações
  console.log('Buscando databases existentes...');
  const search = await n('POST', '/search', {
    filter: { property: 'object', value: 'database' }, page_size: 20
  });
  const dbs = {};
  for (const db of search.results) {
    const t = db.title?.[0]?.plain_text || '';
    if (t.includes('Papéis Narrativos')) dbs.papeis = db.id;
    if (t.includes('Entrevistados'))     dbs.entrevistados = db.id;
    if (t.includes('Personagens'))       dbs.personagens = db.id;
    console.log(`  "${t}" → ${db.id}`);
  }

  if (dbs.personagens) {
    console.log('\nDatabase Personagens já existe:', dbs.personagens);
    console.log('NOTION_PERSONAGENS_DB=' + dbs.personagens);
    return;
  }

  // Monta properties
  const properties = {
    'Nome em Akvon':         { title: {} },
    'Nome real / apelido':   { rich_text: {} },
    'Descrição narrativa':   { rich_text: {} },
    'Conexão com Dipé':      { rich_text: {} },
    'Prompt visual':         { rich_text: {} },
    'URL da ficha':          { url: {} },
    'Guilda / Filiação': { select: { options: [
      { name: 'Luminávio',      color: 'yellow' },
      { name: 'Preloma',        color: 'blue'   },
      { name: 'Ordo Malpeza',   color: 'red'    },
      { name: 'Ligo Senradika', color: 'green'  },
      { name: 'Sem filiação',   color: 'gray'   },
    ]}},
    'Posição nos Mares': { select: { options: [
      { name: 'Mares de Cima',  color: 'blue'   },
      { name: 'Homa Maro',      color: 'purple' },
      { name: 'Mares de Baixo', color: 'gray'   },
    ]}},
    'Status': { select: { options: [
      { name: 'Vivo',         color: 'green'  },
      { name: 'Morto',        color: 'red'    },
      { name: 'Desaparecido', color: 'yellow' },
      { name: 'Desconhecido', color: 'gray'   },
    ]}},
    'Tipo': { multi_select: { options: [
      { name: 'Protagonista', color: 'yellow' },
      { name: 'Secundário',   color: 'blue'   },
      { name: 'Antagonista',  color: 'red'    },
      { name: 'Mencionado',   color: 'gray'   },
    ]}},
    'Capítulos': { multi_select: { options: [
      { name: 'Cap. 1', color: 'blue'   },
      { name: 'Cap. 2', color: 'green'  },
      { name: 'Cap. 3', color: 'yellow' },
    ]}},
  };

  if (dbs.papeis) {
    properties['Papel Narrativo'] = { relation: { database_id: dbs.papeis, single_property: {} }};
    console.log('\n✓ Relação com Papéis Narrativos');
  }
  if (dbs.entrevistados) {
    properties['Entrevistado vinculado'] = { relation: { database_id: dbs.entrevistados, single_property: {} }};
    console.log('✓ Relação com Entrevistados');
  }

  console.log('\nCriando database...');
  const db = await n('POST', '/databases', {
    parent: { type: 'page_id', page_id: PAGE_ID },
    icon: { type: 'emoji', emoji: '⚓' },
    title: [{ type: 'text', text: { content: 'Personagens · Universo ACO' } }],
    properties
  });
  console.log('✓ Database criada:', db.id);

  // Popula personagens iniciais conhecidos
  const personagens = [
    { nome: 'Dipé',    tipo: ['Protagonista'], status: 'Vivo', caps: ['Cap. 1','Cap. 2','Cap. 3'],
      conexao: 'O próprio protagonista', desc: 'Navegante central da Cruzada dos Oceanos.' },
    { nome: "D'Aurora", tipo: ['Secundário'], status: 'Vivo', caps: ['Cap. 1','Cap. 2'],
      conexao: 'Mentor / guardião do Promontório Silenciado', desc: 'Guardião do Promontório. Conduz a iniciação de Dipé.' },
    { nome: 'Aldric',  tipo: ['Secundário'], status: 'Vivo', caps: ['Cap. 1','Cap. 2'],
      conexao: 'Guardião das entradas · Guilda Luminávio', desc: 'Voz seca e precisa. Guardião das entradas da Guilda.' },
    { nome: 'Sefa',    tipo: ['Secundário'], status: 'Vivo', caps: ['Cap. 2'],
      conexao: 'Chegou por necessidade, ficou por convicção', desc: 'Representa o Promontório em miniatura.' },
  ];

  console.log('\nPopulando personagens iniciais...');
  for (const p of personagens) {
    await n('POST', '/pages', {
      parent: { database_id: db.id },
      properties: {
        'Nome em Akvon':       { title:        [{ text: { content: p.nome } }] },
        'Descrição narrativa': { rich_text:    [{ text: { content: p.desc } }] },
        'Conexão com Dipé':    { rich_text:    [{ text: { content: p.conexao } }] },
        'Status':              { select:       { name: p.status } },
        'Tipo':                { multi_select: p.tipo.map(t => ({ name: t })) },
        'Capítulos':           { multi_select: p.caps.map(c => ({ name: c })) },
      }
    });
    console.log('  ✓', p.nome);
  }

  console.log('\n══════════════════════════════════════════');
  console.log('Adicione ao wrangler.toml:');
  console.log('NOTION_PERSONAGENS_DB=' + db.id);
  console.log('══════════════════════════════════════════\n');
}

main().catch(console.error);
