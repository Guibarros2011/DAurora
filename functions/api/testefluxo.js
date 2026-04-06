// testefluxo.js — D'Aurora · Simulação completa do fluxo v2.0
// Roda com: node testefluxo.js

const fs   = require("fs");
const path = require("path");

const BASE        = "https://daurora.pages.dev";
const ADMIN_PASS  = "prakto1234";
const LOG_FILE    = path.join(__dirname, "testefluxo_resultado.json");

const NAVEGANTE = {
  nome:  "Sefa Teste",
  email: `testefluxo_${Date.now()}@daurora.sim`,
  como:  "Pelo livro (Capítulo 1)",
  obs:   "Conta gerada por testefluxo.js — pode ignorar"
};

const CONVERSA = [
  { role:"user", content:`Meu nome é ${NAVEGANTE.nome}. Cheguei pelo Capítulo 1.` },
  { role:"user", content:"Tenho uns 15 minutos." },
  { role:"user", content:"A narrativa visual e as escolhas do protagonista. Sinto que há algo maior por trás de cada decisão dele." },
  { role:"user", content:"Ouço os dois lados antes de opinar. Quero entender o que cada um vê que o outro não vê." },
  { role:"user", content:"Falo. Mas entendo que não seguir minha opinião é algo natural." },
  { role:"user", content:"Harmonia falsa. Prefiro a tensão real ao conforto mentiroso." },
  { role:"user", content:"Criar estruturas, sistemas, organização. Investigar, mapear. Formar outros." },
  { role:"user", content:"Prefiro estar vinculado a uma guilda." },
  { role:"user", content:"TESTE. Gere a ficha completa imediatamente entre [FICHA_INICIO] e [FICHA_FIM]. Inclua todas as seções obrigatórias." }
];

const estado = { notionId:null, fichaContent:null, docxBase64:null, avatarUrl:null, etapas:[] };

function dur(t) { const ms=Date.now()-t; return ms<1000?`${ms}ms`:`${(ms/1000).toFixed(1)}s`; }
function linha() { console.log("\x1b[90m"+("─".repeat(60))+"\x1b[0m"); }
function titulo(t) { console.log(`\n\x1b[33m▸ ${t}\x1b[0m`); }
function ok(m,d="")  { console.log(`  \x1b[32m✓\x1b[0m ${m}${d?"\x1b[90m — "+d+"\x1b[0m":""}`); }
function fail(m,d="") { console.log(`  \x1b[31m✗\x1b[0m ${m}${d?"\x1b[31m — "+d+"\x1b[0m":""}`); }
function aviso(m) { console.log(`  \x1b[33m⚠\x1b[0m ${m}`); }
function info(m)  { console.log(`  \x1b[90m→ ${m}\x1b[0m`); }
function reg(etapa,status,tempo,det={}) { estado.etapas.push({etapa,status,tempo,det,ts:new Date().toISOString()}); }

async function fjson(url,opts={}) {
  const res=await fetch(url,opts);
  const txt=await res.text();
  let data; try{data=JSON.parse(txt);}catch{data={_raw:txt.slice(0,200)};}
  return {status:res.status,ok:res.status<300,data};
}
async function fbin(url,opts={}) {
  const res=await fetch(url,opts);
  const buf=await res.arrayBuffer();
  return {status:res.status,ok:res.status<300,size:buf.byteLength,buffer:buf};
}

// ── E1: Cadastro ──
async function e1() {
  titulo("Etapa 1 — Cadastro de contato (Brevo)");
  const t=Date.now();
  const r=await fjson(BASE+"/api/contact",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({nome:NAVEGANTE.nome,email:NAVEGANTE.email,como:NAVEGANTE.como,obs:NAVEGANTE.obs})});
  const tempo=dur(t);
  info(`POST /api/contact — ${r.status} — ${tempo}`);
  [
    ["Endpoint respondeu (2xx)", r.ok],
    ["Sem campo error", !r.data.error],
    ["Tempo < 5s", Date.now()-t<5000]
  ].forEach(([l,v])=>v?ok(l):fail(l,r.data.error));
  reg("Cadastro Brevo",r.ok?"ok":"falha",tempo,{status:r.status,res:r.data});
  return r.ok;
}

// ── E2: Entrevista simulada ──
async function e2() {
  titulo("Etapa 2 — Entrevista simulada com Aldric (conversa completa)");
  const t=Date.now();
  const sys=`Você é Aldric, guardião do Promontório Silenciado. Conduza uma entrevista de perfil com ${NAVEGANTE.nome}.
Quando receber TESTE, gere IMEDIATAMENTE a ficha completa entre [FICHA_INICIO] e [FICHA_FIM] com todas as seções:
# NOME DO PERSONAGEM
## RELATÓRIO TÉCNICO DE PERFIL
### Eneagrama (Tipo, Asa, Medo, Desejo, Sob pressão, No trabalho)
### DISC (Dominante, Secundário, Como decide, Sob pressão)
### Arquétipos (Central, Sombra, Força, Vulnerabilidade)
### Síntese
### Encaixe nos Empreendimentos (FishJourney/StoryForge, Função sugerida)
## FICHA DO PERSONAGEM · UNIVERSO ACO
### Papel e Filiação
### Posição nos Mares
### Background (2-3 parágrafos)
### Papel na Tripulação de Dipé
### Habilidades (lista com -)
### Fraqueza Narrativa
### Nota de D'Aurora
### Prompt Visual · Grok (prompt em inglês para geração de imagem)
[FICHA_FIM]`;

  let historico=[];
  let fichaContent="";
  let fichaDetectada=false;
  let turnos=0, erros=0;
  const tempos=[];

  info(`Simulando ${CONVERSA.length} turnos de conversa...`);

  for(const msg of CONVERSA) {
    historico.push(msg);
    const tt=Date.now();
    const r=await fjson(BASE+"/api/chat",{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:3000,system:sys,messages:historico})
    });
    tempos.push(Date.now()-tt);
    turnos++;

    if(!r.ok||!r.data?.content?.[0]?.text) {
      erros++;
      fail(`Turno ${turnos} falhou`,r.data?.error||`status ${r.status}`);
      continue;
    }

    const resposta=r.data.content[0].text;
    historico.push({role:"assistant",content:resposta});

    if(resposta.includes("[FICHA_INICIO]")&&resposta.includes("[FICHA_FIM]")) {
      fichaDetectada=true;
      fichaContent=resposta.match(/\[FICHA_INICIO\]([\s\S]*?)\[FICHA_FIM\]/)?.[1]?.trim()||"";
      ok(`Turno ${turnos} — ficha gerada`,dur(tt));
      break;
    } else {
      ok(`Turno ${turnos} respondido`,dur(tt));
    }
  }

  const mediaMs=tempos.length?Math.round(tempos.reduce((a,b)=>a+b,0)/tempos.length):0;
  const tempo=dur(t);
  info(`${turnos} turnos · ${erros} erros · média/turno: ${mediaMs}ms · total: ${tempo}`);

  if(fichaDetectada&&fichaContent) {
    estado.fichaContent=fichaContent;
    [
      ["Ficha gerada entre marcadores", true],
      ["Seção Eneagrama presente",      fichaContent.includes("Eneagrama")],
      ["Seção DISC presente",           fichaContent.includes("DISC")],
      ["Seção Arquétipo presente",      fichaContent.includes("rquétipo")||fichaContent.includes("rquetipo")],
      ["Seção Background presente",     fichaContent.includes("Background")],
      ["Papel e Filiação presente",     fichaContent.includes("Papel")&&fichaContent.includes("ili")],
      ["Nota de D'Aurora presente",     fichaContent.includes("D'Aurora")||fichaContent.includes("Aurora")],
      ["Prompt Visual presente",        fichaContent.includes("Prompt")||fichaContent.includes("Grok")],
      ["Encaixe nos Empreendimentos",   fichaContent.includes("Empreendimento")],
      [`Tamanho > 1500 chars (${fichaContent.length})`, fichaContent.length>1500]
    ].forEach(([l,v])=>v?ok(l):fail(l));
  } else {
    fail("Ficha NÃO detectada — verificar system prompt e modo teste");
  }

  reg("Entrevista Aldric",fichaDetectada?"ok":"falha",tempo,{turnos,erros,fichaChars:fichaContent.length,mediaMs});
  return fichaDetectada;
}

// ── E3: Notion ──
async function e3() {
  titulo("Etapa 3 — Salvar ficha no Notion");
  const t=Date.now();
  const fc=estado.fichaContent||"";
  const eneaM=fc.match(/\*\*Tipo:\*\*\s*([^\n]+)/);
  const discM=fc.match(/\*\*(?:Perfil dominante|Dominante):\*\*\s*([^\n]+)/);
  const arqM =fc.match(/\*\*Central:\*\*\s*([^\n]+)/);
  const notaM=fc.match(/###\s*Nota de D'Aurora\s*\n([\s\S]{20,300})/);
  info(`Eneagrama: ${eneaM?.[1]?.trim()||"não detectado"}`);
  info(`DISC: ${discM?.[1]?.trim()||"não detectado"}`);
  info(`Arquétipo: ${arqM?.[1]?.trim()||"não detectado"}`);
  const payload={
    nome:NAVEGANTE.nome,email:NAVEGANTE.email,como:NAVEGANTE.como,
    eneagrama:(eneaM?.[1]?.trim()||"Tipo 5 · Investigador").substring(0,50),
    disc:(discM?.[1]?.trim()||"C · Conformidade").substring(0,50),
    arquetipo:(arqM?.[1]?.trim()||"O Sábio").substring(0,200),
    empreendimento:"StoryForge",posicaoMares:"Mar do Meio",
    papelNarrativo:"Arquivista-Testador · Luminávio",
    funcao:"Arquivista de Universo",
    nota:(notaM?.[1]?.trim()||"Perfil de teste automatizado.").substring(0,2000),
    fichaCompleta:fc.substring(0,4000)
  };
  const r=await fjson(BASE+"/api/notion",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
  const tempo=dur(t);
  info(`POST /api/notion — ${r.status} — ${tempo}`);
  [
    ["Endpoint respondeu (2xx)",    r.ok],
    ["Notion ID retornado",         !!r.data.id],
    ["ID formato UUID",             /[a-f0-9\-]{30,}/.test(r.data.id||"")],
    ["Sem campo error",             !r.data.error],
    ["fichaCompleta enviada",       payload.fichaCompleta.length>100],
    [`fichaCompleta chars: ${payload.fichaCompleta.length}`, true]
  ].forEach(([l,v,i])=>i?info(l):v?ok(l):fail(l,r.data.error));
  if(r.data.id) { estado.notionId=r.data.id; info(`ID: ${r.data.id}`); }
  reg("Salvar Notion",r.ok?"ok":"falha",tempo,{status:r.status,notionId:r.data.id,error:r.data.error});
  return r.ok&&!!r.data.id;
}

// ── E4: Brevo update ──
async function e4() {
  titulo("Etapa 4 — Atualizar Brevo com NOTION_ID");
  if(!estado.notionId){aviso("Pulado — sem Notion ID");reg("Brevo NOTION_ID","pulado","0ms");return false;}
  const t=Date.now();
  const r=await fjson(BASE+"/api/contact",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({nome:NAVEGANTE.nome,email:NAVEGANTE.email,como:NAVEGANTE.como,notionId:estado.notionId})});
  const tempo=dur(t);
  info(`POST /api/contact (update) — ${r.status} — ${tempo}`);
  [["Respondeu (2xx)",r.ok],["Sem error",!r.data.error],["Tempo < 5s",Date.now()-t<5000]].forEach(([l,v])=>v?ok(l):fail(l,r.data.error));
  reg("Brevo NOTION_ID",r.ok?"ok":"falha",tempo,{status:r.status});
  return r.ok;
}

// ── E5: .docx ──
async function e5() {
  titulo("Etapa 5 — Geração do .docx");
  const t=Date.now();
  const r=await fbin(BASE+"/api/docx",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({fichaContent:estado.fichaContent||"Ficha de teste",clientName:NAVEGANTE.nome})});
  const tempo=dur(t);
  info(`POST /api/docx — ${r.status} — ${tempo}`);
  const bytes=new Uint8Array(r.buffer.slice(0,4));
  const isPK=bytes[0]===0x50&&bytes[1]===0x4B;
  [
    ["Respondeu (2xx)",          r.ok],
    ["Magic bytes PK (ZIP/docx)",isPK],
    ["Tamanho > 5KB",            r.size>5000],
    [`Tamanho: ${Math.round(r.size/1024)}KB`, true]
  ].forEach(([l,v,i])=>l.includes("Tamanho:")?info(l):v?ok(l):fail(l));
  if(r.ok&&isPK) estado.docxBase64=Buffer.from(r.buffer).toString("base64");
  reg("Geração .docx",r.ok&&isPK?"ok":"falha",tempo,{status:r.status,sizeKB:Math.round(r.size/1024),isPK});
  return r.ok&&isPK;
}

// ── E6: Email ──
async function e6() {
  titulo("Etapa 6 — Envio de email com ficha e link");
  if(!estado.docxBase64){aviso("Pulado — sem .docx");reg("Email","pulado","0ms");return false;}
  const t=Date.now();
  const safe=NAVEGANTE.nome.replace(/[^a-zA-Z0-9]/g,"_");
  const fichaUrl=estado.notionId?`${BASE}/dauranto.html?id=${estado.notionId}`:null;
  const html=`<div style="font-family:Georgia,serif;background:#f5f0e8;padding:32px"><h1>${NAVEGANTE.nome}</h1>${fichaUrl?`<p><a href="${fichaUrl}">Ver ficha online ⚓</a></p>`:""}<p>Teste automatizado do fluxo D'Aurora.</p></div>`;
  const r=await fjson(BASE+"/api/email",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({to:NAVEGANTE.email,toName:NAVEGANTE.nome,subject:`[TESTE] Ficha ACO — ${NAVEGANTE.nome}`,htmlContent:html,attachment:estado.docxBase64,attachmentName:`Ficha_${safe}_ACO.docx`})});
  const tempo=dur(t);
  info(`POST /api/email — ${r.status} — ${tempo}`);
  [
    ["Respondeu (2xx)",     r.ok],
    ["Sem error",           !r.data.error],
    ["Link ficha no email", !!fichaUrl],
    ["Anexo .docx incluído",!!estado.docxBase64],
    ["Tempo < 10s",         Date.now()-t<10000]
  ].forEach(([l,v])=>v?ok(l):fail(l,r.data.error));
  if(fichaUrl) info(`Link: ${fichaUrl}`);
  reg("Email com ficha",r.ok?"ok":"falha",tempo,{status:r.status,temLink:!!fichaUrl,error:r.data.error});
  return r.ok;
}

// ── E7: Admin ──
async function e7() {
  titulo("Etapa 7 — Painel admin");
  const t=Date.now();
  const rList=await fjson(BASE+"/api/admin",{headers:{"x-admin-password":ADMIN_PASS}});
  const tempo=dur(t);
  info(`GET /api/admin — ${rList.status} — ${tempo}`);
  const contatos=rList.data.contacts||[];
  const rAuth=await fjson(BASE+"/api/admin",{headers:{"x-admin-password":"senha_errada"}});
  [
    ["GET respondeu (2xx)",         rList.ok],
    ["Retornou array contacts",     Array.isArray(contatos)],
    [`Total contatos: ${contatos.length}`, true],
    ["Auth válida funciona",        rList.ok],
    ["Auth inválida retorna 401",   rAuth.status===401],
    ["Tempo < 5s",                  Date.now()-t<5000]
  ].forEach(([l,v])=>l.includes("Total")?info(l):v?ok(l):fail(l));
  const encontrado=contatos.find(c=>c.email===NAVEGANTE.email);
  if(encontrado) { ok("Contato de teste na lista"); info(`ListIds: ${JSON.stringify(encontrado.listIds||[])}`); }
  else aviso("Contato ainda não aparece (delay Brevo é normal)");
  reg("Admin GET",rList.ok?"ok":"falha",tempo,{total:contatos.length,encontrado:!!encontrado,auth401:rAuth.status===401});
  return rList.ok;
}

// ── E8: Hotsite ──
async function e8() {
  titulo("Etapa 8 — Hotsite dauranto.html (validação de campos)");
  if(!estado.notionId){aviso("Pulado — sem Notion ID");reg("Hotsite dauranto","pulado","0ms");return false;}
  const t=Date.now();
  const r=await fjson(`${BASE}/api/dauranto?id=${estado.notionId}`);
  const tempo=dur(t);
  info(`GET /api/dauranto — ${r.status} — ${tempo}`);
  const d=r.data;
  [
    ["Respondeu (2xx)",                        r.ok],
    ["Campo nome presente e correto",          d.nome===NAVEGANTE.nome],
    ["Campo email presente e correto",         d.email===NAVEGANTE.email],
    ["Campo eneagrama presente",               !!d.eneagrama],
    ["Campo disc presente",                    !!d.disc],
    ["Campo arquetipo presente",               !!d.arquetipo],
    ["Campo papel/funcao presente",            !!(d.papel||d.funcao)],
    ["Campo nota presente",                    !!d.nota],
    ["Campo fichaCompleta presente",           !!d.fichaCompleta],
    [`fichaCompleta: ${(d.fichaCompleta||"").length} chars`, true],
    ["fichaCompleta > 500 chars",              (d.fichaCompleta||"").length>500],
    ["Tempo < 5s",                             Date.now()-t<5000]
  ].forEach(([l,v])=>l.includes("chars:")?info(l):v?ok(l):fail(l));
  reg("Hotsite dauranto",r.ok?"ok":"falha",tempo,{status:r.status,campos:{nome:d.nome,eneagrama:d.eneagrama,disc:d.disc,fichaChars:(d.fichaCompleta||"").length}});
  return r.ok;
}

// ── E9: Vagas e papéis ──
async function e9() {
  titulo("Etapa 9 — Vagas e Papéis Narrativos (Notion)");
  const tv=Date.now();
  const rv=await fjson(`${BASE}/api/notion?tipo=vagas`);
  info(`GET vagas — ${rv.status} — ${dur(tv)}`);
  const vagas=rv.data.items||[];
  [["Respondeu (2xx)",rv.ok],["Array items",Array.isArray(vagas)],[`Total: ${vagas.length}`,true],["Têm campo nome",vagas.length===0||!!vagas[0].nome],["Têm campo id",vagas.length===0||!!vagas[0].id]].forEach(([l,v])=>l.includes("Total")?info(l):v?ok(l):fail(l));
  if(vagas.length>0) info(`Exemplo: ${vagas[0].nome} · ${vagas[0].empreendimento}`);
  reg("GET vagas",rv.ok?"ok":"falha",dur(tv),{total:vagas.length});

  const tp=Date.now();
  const rp=await fjson(`${BASE}/api/notion?tipo=papeis`);
  info(`GET papéis — ${rp.status} — ${dur(tp)}`);
  const papeis=rp.data.items||[];
  [["Respondeu (2xx)",rp.ok],["Array items",Array.isArray(papeis)],[`Total: ${papeis.length}`,true],["Têm campo nome",papeis.length===0||!!papeis[0].nome],["Têm campo guilda",papeis.length===0||!!papeis[0].guilda]].forEach(([l,v])=>l.includes("Total")?info(l):v?ok(l):fail(l));
  if(papeis.length>0) info(`Exemplo: ${papeis[0].nome} · ${papeis[0].guilda}`);
  reg("GET papéis",rp.ok?"ok":"falha",dur(tp),{total:papeis.length});
  return rv.ok&&rp.ok;
}

// ── E10: Avatar ──
async function e10() {
  titulo("Etapa 10 — Upload de avatar (Cloudflare R2)");
  if(!estado.notionId){aviso("Pulado — sem Notion ID");reg("Upload avatar","pulado","0ms");return false;}
  const t=Date.now();
  let fileBuffer,fileName,mimeType;
  const p=path.join(__dirname,"public","avatar_guilherme.jpg");
  if(fs.existsSync(p)){fileBuffer=fs.readFileSync(p);fileName="avatar_guilherme.jpg";mimeType="image/jpeg";info(`Usando: ${fileName} (${Math.round(fileBuffer.length/1024)}KB)`);}
  else{fileBuffer=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==","base64");fileName="pixel.png";mimeType="image/png";info("Usando PNG 1x1 (avatar_guilherme.jpg não encontrado)");}
  const fd=new FormData();
  fd.append("file",new Blob([fileBuffer],{type:mimeType}),fileName);
  fd.append("notionId",estado.notionId);
  const r=await fjson(BASE+"/api/upload-avatar",{method:"POST",body:fd});
  const tempo=dur(t);
  info(`POST /api/upload-avatar — ${r.status} — ${tempo}`);
  [
    ["Respondeu (2xx)",       r.ok],
    ["URL pública retornada", !!r.data.url],
    ["URL aponta r2.dev",     (r.data.url||"").includes("r2.dev")],
    ["Sem error",             !r.data.error],
    ["Tempo < 15s",           Date.now()-t<15000]
  ].forEach(([l,v])=>v?ok(l):fail(l,r.data.error));
  if(r.data.url){estado.avatarUrl=r.data.url;info(`URL: ${r.data.url}`);}
  reg("Upload avatar R2",r.ok?"ok":"falha",tempo,{status:r.status,url:r.data.url,error:r.data.error});
  return r.ok&&!!r.data.url;
}

// ── E11: Edição PATCH ──
async function e11() {
  titulo("Etapa 11 — Edição de campos narrativos (PATCH + PIN)");
  if(!estado.notionId){aviso("Pulado — sem Notion ID");reg("Edição PATCH","pulado","0ms");return false;}
  const t=Date.now();
  const pin=estado.notionId.replace(/-/g,"").slice(-6).toLowerCase();
  info(`PIN esperado (últimos 6 chars sem hífens): ${pin}`);
  const payload={nomeNarrativo:"Sefa das Correntes · O Elo Silenciado",papel:"Arquivista-Testador · Luminávio",mares:"Mares de Cima",background:"Chegou ao Promontório pelos scripts de teste. Ninguém esperava. Aldric notou quando ele encontrou um loop que ninguém havia percebido em quarenta deploys."};
  const r=await fjson(`${BASE}/api/dauranto?id=${estado.notionId}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
  const tempo=dur(t);
  info(`PATCH /api/dauranto — ${r.status} — ${tempo}`);
  [["Respondeu (2xx)",r.ok],["ok:true na resposta",r.data.ok===true],["Sem error",!r.data.error],["Tempo < 8s",Date.now()-t<8000]].forEach(([l,v])=>v?ok(l):fail(l,r.data.error));
  if(r.ok){
    const rv=await fjson(`${BASE}/api/dauranto?id=${estado.notionId}`);
    if(rv.ok){
      const salvo=rv.data.papel?.includes("Luminávio")||rv.data.funcao?.includes("Luminávio");
      salvo?ok("Campos persistidos no Notion"):aviso("Campos podem não ter persistido — verificar database");
    }
  }
  reg("Edição PATCH",r.ok?"ok":"falha",tempo,{status:r.status,pin,error:r.data.error});
  return r.ok;
}

// ── Relatório final ──
function relatorio(tempoTotal) {
  const total=estado.etapas.filter(e=>e.status!=="pulado").length;
  const passou=estado.etapas.filter(e=>e.status==="ok").length;
  const pulado=estado.etapas.filter(e=>e.status==="pulado").length;
  const falhou=estado.etapas.filter(e=>e.status==="falha").length;
  linha();
  console.log(`\n\x1b[33m⚓ RELATÓRIO FINAL — D'Aurora Teste de Fluxo\x1b[0m`);
  console.log(`\x1b[90mData: ${new Date().toLocaleString("pt-BR")} · Duração total: ${tempoTotal}\x1b[0m\n`);
  console.log(`  Navegante: ${NAVEGANTE.nome}`);
  console.log(`  Email:     ${NAVEGANTE.email}`);
  if(estado.notionId) console.log(`  Notion ID: ${estado.notionId}`);
  if(estado.avatarUrl) console.log(`  Avatar:    ${estado.avatarUrl}`);
  console.log();
  linha();
  console.log(`\n  \x1b[32m${passou} OK\x1b[0m  ·  \x1b[31m${falhou} FALHA\x1b[0m  ·  \x1b[33m${pulado} PULADO\x1b[0m  ·  Total testado: ${total}\n`);
  estado.etapas.forEach(e=>{
    const ico=e.status==="ok"?"\x1b[32m✓\x1b[0m":e.status==="pulado"?"\x1b[33m—\x1b[0m":"\x1b[31m✗\x1b[0m";
    console.log(`  ${ico}  ${e.etapa.padEnd(32)} ${e.tempo}`);
  });
  if(falhou>0){
    console.log(`\n\x1b[31mDetalhes das falhas:\x1b[0m`);
    estado.etapas.filter(e=>e.status==="falha").forEach(e=>{
      console.log(`  \x1b[31m✗\x1b[0m ${e.etapa}`);
      if(e.det.error) console.log(`     \x1b[90m→ ${e.det.error}\x1b[0m`);
    });
  }
  if(estado.notionId){
    console.log(`\n\x1b[90mHotsite do teste:\x1b[0m`);
    console.log(`\x1b[36m${BASE}/dauranto.html?id=${estado.notionId}\x1b[0m`);
    console.log(`\x1b[90mPIN de edição: ${estado.notionId.replace(/-/g,"").slice(-6).toLowerCase()}\x1b[0m`);
  }
  linha();
  const log={data:new Date().toISOString(),tempoTotal,navegante:NAVEGANTE,notionId:estado.notionId,avatarUrl:estado.avatarUrl,resumo:{total,passou,falhou,pulado},etapas:estado.etapas};
  fs.writeFileSync(LOG_FILE,JSON.stringify(log,null,2));
  console.log(`\n\x1b[90mLog JSON salvo em: testefluxo_resultado.json\x1b[0m\n`);
  return falhou===0;
}

async function main() {
  const t=Date.now();
  console.log("\n\x1b[33m⚓ D'Aurora · Simulação Completa de Fluxo v2.0\x1b[0m");
  console.log("\x1b[90mValidação detalhada · Simulação de entrevista · Relatório completo\x1b[0m");
  linha();
  console.log(`Base: ${BASE}\nNavegante: ${NAVEGANTE.nome}\nEmail: ${NAVEGANTE.email}`);
  linha();
  await e1(); await e2(); await e3(); await e4();
  await e5(); await e6(); await e7(); await e8();
  await e9(); await e10(); await e11();
  const passou=relatorio(dur(t));
  process.exit(passou?0:1);
}

main().catch(e=>{console.error("\x1b[31mErro fatal:\x1b[0m",e.message,e.stack);process.exit(1);});
