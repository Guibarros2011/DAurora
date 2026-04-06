# STORIAFORGE · BRIEFING PARA O CLAUDE CODE
*Arquivo de handoff do Lanĉvenko → Claude Code*
*Gerado em: Abril 2026*

---

## QUEM SOU EU

Você é o agente de desenvolvimento do projeto **StoriaForge**, operando na pasta `C:\Users\guiba\DAurora`.

Seu parceiro estratégico é o **Lanĉvenko** (agente no Claude.ai). Ele pensa, você executa. Quando houver dúvida sobre decisão criativa ou estratégica, a resposta está neste arquivo ou deve ser perguntada ao operador (Vilhelmo/Guilherme).

---

## O PROJETO

**StoriaForge** é um laboratório narrativo criado por Vilhelmo de Bahxos (Guilherme Barros), operando dentro da FishJourneyXR. Tem dois projetos ativos:

- **A Cruzada dos Oceanos (ACO)** — romance de fantasia ambientado no universo de Akvon, com Esperanto como língua in-world. Fase 1 em curso: convocação da Primeira Tripulação.
- **Pedro Rocha e o Poder do CoMEx** — romance juvenil/educacional. Em desenvolvimento.

---

## INFRAESTRUTURA EXISTENTE

### Repositório
- Pasta local: `C:\Users\guiba\DAurora`
- Repositório GitHub: conectado ao Cloudflare Pages
- Deploy: automático via `git push` (Cloudflare Pages)
- Tool: Wrangler (Cloudflare Workers)

### Domínios ativos (todos no Cloudflare)
| Domínio | Projeto Pages | Status |
|---|---|---|
| `storiaforge.com` | a criar: `storiaforge-web` | DNS ativo, sem conteúdo |
| `aco.storiaforge.com` | `cruzadadosoceanoscap1` | 🟢 No ar |
| `akvon.storiaforge.com` | `cruzadadosoceanoscap1` | 🟢 Aponta para ACO agora |
| `admin.storiaforge.com` | `daurora` | 🟢 No ar |

### Backend (projeto `daurora` — `C:\Users\guiba\DAurora`)
- **Cloudflare Pages Functions** em `functions/api/`
- **Notion** como banco de dados (NOTION_TOKEN configurado)
- **Brevo** para e-mail marketing (BREVO_KEY configurado)
- **R2** para assets/tiles do mapa (bucket: `daurora-mapas`)
- **Anthropic API** para o chat com Aldric (ANTHROPIC_KEY configurado)

### Variáveis de ambiente (já configuradas no Cloudflare Pages — NUNCA colocar no código)
```
ANTHROPIC_KEY
BREVO_KEY
SENDER_EMAIL
NOTION_TOKEN
NOTION_DB_LOCACOES
NOTION_DB_CAPITULOS
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
```

---

## ARQUIVOS EXISTENTES — O QUE CADA UM FAZ

```
DAurora/
├── public/
│   ├── index.html          ← Chat com Aldric (entrevista com personagem) — NÃO MEXER
│   ├── admin.html          ← Painel administrativo completo — NÃO MEXER
│   ├── personagem.html     ← Ficha de personagem (Notion) — NÃO MEXER
│   ├── dauranto.html       ← Ficha do entrevistado — NÃO MEXER
│   └── locacao.html        ← Hotsite de locação no universo — NÃO MEXER
├── functions/api/
│   ├── chat.js             ← Proxy Anthropic API — NÃO MEXER
│   ├── contact.js          ← Salva contato no Brevo — NÃO MEXER
│   ├── personagem.js       ← CRUD personagens no Notion — NÃO MEXER
│   ├── dauranto.js         ← Lê ficha do Notion — NÃO MEXER
│   ├── admin.js            ← API do painel — NÃO MEXER
│   ├── marcadores.js       ← Pins do mapa no R2 — NÃO MEXER
│   ├── locacao.js          ← Dados de locação — NÃO MEXER
│   ├── email.js            ← Envia email com DOCX via Brevo — NÃO MEXER
│   └── notion.js           ← Helpers Notion — NÃO MEXER
└── wrangler.toml           ← Config Cloudflare Workers — NÃO MEXER
```

**Regra de ouro: não altere nenhum arquivo existente sem instrução explícita.**

---

## SISTEMA DE DESIGN — USE SEMPRE ESTES TOKENS

```css
:root {
  /* Cores base */
  --ink: #1a1410;
  --parchment: #f5f0e8;
  --cream: #ede8dc;
  --cream-dim: rgba(237,232,220,0.65);
  --cream-faint: rgba(237,232,220,0.12);
  --muted: #7a6f60;

  /* Ouro — acento principal */
  --gold: #b08830;
  --gold-dim: #8a6a28;
  --gold-pale: #e8d49a;
  --gold-glow: rgba(176,136,48,0.15);
  --gold-border: rgba(176,136,48,0.28);
  --gold-border-strong: rgba(176,136,48,0.55);

  /* Mar — fundo e profundidade */
  --sea: #2a4a5e;
  --sea-dark: #16303f;
  --sea-mid: #1e3d4f;
  --sea-deep: #0f2535;

  /* Forge — face operacional */
  --forge-navy: #0f2240;
  --forge-blue: #7aa3c8;
}
```

**Tipografia:**
- Display/títulos: `'Cormorant Garamond'` (serif, elegante, editorial)
- Corpo/UI: `'EB Garamond'` (serif, legível, quente)
- Operacional/dados: `'DM Sans'` (sans, limpo, secundário)
- Google Fonts link: `https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500;1,600&family=EB+Garamond:ital,wght@0,400;0,500;1,400;1,500&family=DM+Sans:wght@300;400;500&display=swap`

**Elementos de identidade:**
- Ícone/ornamento da marca: `⚓` (âncora)
- Separador decorativo: `⚓ ✦ ⚓`
- Borda padrão: `1px solid var(--gold-border)`
- Sombra padrão: `0 48px 96px rgba(0,0,0,0.7)`
- STORIA = âmbar/dourado + itálico (face literária)
- FORGE = azul aço `#7aa3c8` + bold (face operacional)

---

## O QUE PRECISA SER CONSTRUÍDO — ESCOPO COMPLETO

### 1. `storiaforge.com` → novo repositório `storiaforge-web`
**Status:** arquivo `index.html` já gerado pelo Lanĉvenko.
**Sua tarefa:**
```bash
# Criar repositório e conectar ao Cloudflare Pages
mkdir C:\Users\guiba\storiaforge-web
cd C:\Users\guiba\storiaforge-web
git init
git remote add origin [URL_DO_REPO_GITHUB]
```
Receber o `index.html` do Lanĉvenko, salvar em `storiaforge-web/index.html`, fazer commit e push.

---

### 2. `/entrevista` → página de entrada para o Aldric
**Onde:** `DAurora/public/entrevista.html`
**O que é:** página que apresenta Aldric, contextualiza o ritual da entrevista e leva o usuário para `index.html` (o chat).

**Conteúdo da página:**
- Hero com nome "Aldric" em Cormorant Garamond grande
- Subtítulo: "Guardião do Promontório Silenciado"
- Parágrafo de contexto: "D'Aurora pediu que eu conduzisse esta conversa. Antes de entrar, preciso do seu nome e de como você chegou até aqui."
- Formulário de entrada: campo Nome + campo "Como chegou" + botão "Entrar"
- Ao submeter: salva no estado local e redireciona para `index.html` com os dados via query params ou localStorage
- O `index.html` já lê `state.nome` e `state.como` — integrar com essa estrutura existente

**Tom visual:** idêntico ao `index.html` (phone shell, fundo sea-dark, Cormorant Garamond, ouro)

---

### 3. `aco.storiaforge.com` → landing page de conversão
**Onde:** repositório `cruzadadosoceanoscap1` (já existe no Cloudflare Pages)
**Localizar o repositório local** e substituir/criar o `index.html` da landing.

**Seções:**
1. Hero — "A Cruzada dos Oceanos" + subtítulo + botão "Assistir à Convocação"
2. Embed do vídeo NoteBookLM (URL a ser fornecida)
3. O que é a ACO — parágrafo de posicionamento
4. As 7 etapas da jornada (lista visual, ícones náuticos)
5. Doação — 3 cards: R$47 / R$97 / R$197 com links
6. CTA final → link para `admin.storiaforge.com/entrevista` ou `entrevista.html`

---

### 4. `akvon.storiaforge.com` → portal do universo
**Onde:** mesmo repositório `cruzadadosoceanoscap1`, criar `akvon/index.html`
**Seções:**
1. Hero do universo — "Akvon" + frase cosmológica
2. As Três Camadas (Mares de Cima / Mar do Meio / Mares de Baixo) — três blocos com paletas distintas
3. Card central → "Entrar na Cruzada" → `aco.storiaforge.com`
4. Glossário — termos em Esperanto: Luminávio, Dipé, Aurora Negra, Lernantoj, Ĉielpeceto

---

### 5. Templates de e-mail — 5 mensagens (pasta `emails/`)
**Onde:** `DAurora/emails/` (criar pasta)
**Stack:** HTML puro, compatível com Brevo

| Arquivo | Gatilho | Assunto |
|---|---|---|
| `email-01-boas-vindas.html` | Cadastro | O porto te espera |
| `email-02-reativacao.html` | +48h sem ler | Dipé ainda está à deriva |
| `email-03-pos-leitura.html` | Leu Cap.1 | Você viu o vórtice |
| `email-04-pos-doacao.html` | Doou | Sua prancha está no casco |
| `email-05-pos-entrevista.html` | Completou entrevista | A tripulação te reconhece |

**Design:** fundo `#0f2240`, texto `#ede8dc`, acento `#b08830`, logo StoriaForge no topo, rodapé com ⚓ e link de descadastro. Tom narrativo — cada e-mail é uma cena.

---

### 6. Admin — ajuste de identidade visual (OPCIONAL — baixa prioridade)
Apenas trocar o título da página e adicionar o logo StoriaForge no header do `admin.html`. Nada estrutural.

---

## FLUXO DE TRABALHO PADRÃO

Para cada entrega:
```bash
# 1. Ler os arquivos relacionados antes de criar qualquer coisa
# 2. Criar/editar o arquivo
# 3. Verificar que não quebrou nada existente
# 4. Commitar com mensagem descritiva
git add [arquivo]
git commit -m "feat: [descrição do que foi criado]"
git push
# 5. Confirmar que o Cloudflare Pages fez o deploy
```

Mensagens de commit em português, prefixo semântico:
- `feat:` novo arquivo/funcionalidade
- `fix:` correção
- `style:` ajuste visual sem mudança de lógica
- `refactor:` reestruturação sem mudança de comportamento

---

## CONTEXTO NARRATIVO (para escrever copy correto)

**Aldric:** Guardião do Promontório Silenciado. Direto, econômico, sem ornamentos. Conduz entrevistas em 4 etapas para mapear perfil profundo. Entrega relatório técnico + ficha de personagem no universo ACO.

**Dipé:** Protagonista da ACO. Foi notado a bordo do Aurora Negra por estar de pé enquanto todos estavam curvados sobre seu ofício. Seu nome vem disso.

**D'Aurora:** Fundador da Guilda Luminávio. Figura de autoridade e sabedoria. Pediu a Aldric que conduzisse as entrevistas.

**Universo de Akvon — 3 camadas:**
- Mares de Cima: reino espiritual. Paleta: ouro e azul celeste.
- Mar do Meio: plano material, escolhas reais. Paleta: azul profundo e verde.
- Mares de Baixo: poder imediato sem consequência visível. Paleta: vermelho e negro.

**Tom geral:** ritual de pertencimento, não produto. Missão, não marketing. Nascente, não rio.

---

## CONTATOS E ACESSOS

- Operador: Vilhelmo de Bahxos / Guilherme Barros
- Email: guibarros2011@gmail.com
- Cloudflare: conta vinculada ao email acima
- GitHub: repositórios vinculados ao mesmo email

---

## PRIMEIRA TAREFA AO LER ESTE ARQUIVO

1. Confirme que está na pasta correta: `C:\Users\guiba\DAurora`
2. Liste os repositórios Git configurados: `git remote -v`
3. Verifique o status atual: `git status`
4. Leia o `public/index.html` para entender a estrutura do Aldric
5. Informe o que encontrou e pergunte por qual entrega começar

---

*"O que lança e vence."*
*Lanĉvenko · Handoff para Claude Code · Abril 2026*
⚓
