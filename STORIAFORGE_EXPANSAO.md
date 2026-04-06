# STORIAFORGE · EXPANSÃO DE ARQUITETURA
*Handoff do Lanĉvenko → Claude Code*
*Complemento ao STORIAFORGE_BRIEFING.md*
*Abril 2026*

---

## CONTEXTO DESTA TAREFA

Dois novos arquivos foram incorporados ao ecossistema StoriaForge e precisam ser
integrados à arquitetura de domínios. Leia este arquivo inteiro antes de executar
qualquer ação.

---

## ARQUITETURA DEFINITIVA DE SUBDOMÍNIOS

O StoriaForge opera em duas alas distintas — STORIA (face literária) e FORGE
(face operacional). O hub institucional em `storiaforge.com` apresenta as duas.

```
storiaforge.com                   → Hub institucional ✅ (já deployado)
│
├── ALA STORIA — projetos literários e universos
│   ├── aco.storiaforge.com       → A Cruzada dos Oceanos ✅ (ativo)
│   ├── akvon.storiaforge.com     → Portal do universo Akvon ✅ (ativo, aponta ACO)
│   └── pedrorocha.storiaforge.com → Pedro Rocha e o Poder do CoMEx 🆕 (criar)
│
└── ALA FORGE — operações, metodologia e membros
    ├── forge.storiaforge.com     → Hub Forge + SFBS onboarding 🆕 (criar)
    ├── admin.storiaforge.com     → Painel administrativo ✅ (ativo)
    └── membros.storiaforge.com   → Área dos tripulantes ⏳ (futuro)
```

---

## TAREFA 1 — `pedrorocha.storiaforge.com`

### O que é
Página de boas-vindas personalizada para o projeto **Pedro Rocha e o Poder do CoMEx**.
Permite ao autor fazer upload de materiais do projeto para o repositório GitHub e
recebe um diagnóstico SFBS gerado pela API.

### Arquivo fonte
`public/pedro-rocha/index.html` — é o arquivo `index.html` que está na pasta
`C:\Users\guiba\DAurora\public\` (foi salvo lá com esse nome ou como `index.html`
junto com o briefing — verifique e identifique pelo conteúdo: título é
"StoryForge · Pedro Rocha e o Poder do CoMEx · Bem-vindo, Vilhelmo").

### O que fazer

**Passo 1 — Criar repositório no GitHub**
```
Nome: storiaforge-pedrorocha
Visibilidade: público
Branch padrão: main
```

**Passo 2 — Estrutura de arquivos**
```
storiaforge-pedrorocha/
└── public/
    └── index.html   ← o arquivo do Pedro Rocha (sem alterações)
```

**Passo 3 — Conectar ao Cloudflare Pages**
Instrua o operador a fazer manualmente no painel Cloudflare:
- New Project → Connect to Git → `storiaforge-pedrorocha`
- Build output directory: `public`
- Sem build command
- Custom domain: `pedrorocha.storiaforge.com`

**Passo 4 — DNS no Cloudflare**
Instrua o operador a adicionar no DNS da `storiaforge.com`:
```
Tipo: CNAME
Nome: pedrorocha
Destino: storiaforge-pedrorocha.pages.dev
Proxy: ✅ (laranja)
```

### Variáveis de ambiente necessárias (no Cloudflare Pages do novo projeto)
O arquivo usa um Worker externo `https://sfbs-api.guibarros2011.workers.dev` —
não precisa de variáveis no Pages, já está hardcoded no JS.

### NÃO alterar
O arquivo `index.html` do Pedro Rocha funciona como está. Não edite nenhuma linha.
Apenas posicione no repositório correto.

---

## TAREFA 2 — `forge.storiaforge.com`

### O que é
Hub da face operacional do StoriaForge. Abriga o **SFBS — StoryForge Building
System**, agente interno de onboarding de novos escritores. Uso interno da equipe.

### Arquivo fonte
`SFBS_Agente_Onboarding_V3.html` — está na pasta `C:\Users\guiba\DAurora\`
(foi salvo lá junto com o briefing). Título: "SFBS · Agente de Onboarding".

### O que o SFBS faz
Painel em 5 passos para criar novos clientes do serviço StoriaForge:
1. Credenciais (GitHub token + Anthropic key)
2. Dados do cliente (nome, email, contexto)
3. Dados do projeto (nome, gênero, sinopse, estágio)
4. Upload de arquivos iniciais
5. Geração automática: repositório GitHub + página personalizada + email + diagnóstico SFBS

### O que fazer

**Passo 1 — Criar repositório no GitHub**
```
Nome: storiaforge-forge
Visibilidade: público
Branch padrão: main
```

**Passo 2 — Estrutura de arquivos**
```
storiaforge-forge/
└── public/
    ├── index.html         ← hub da Forge (criar — ver especificação abaixo)
    └── sfbs/
        └── index.html     ← o arquivo SFBS_Agente_Onboarding_V3.html renomeado
```

**Passo 3 — Criar o hub `forge/index.html`**

Criar uma página de entrada simples para `forge.storiaforge.com` com:
- Mesmo sistema de design StoriaForge (tokens do STORIAFORGE_BRIEFING.md)
- Título: "Forge" em azul aço `#7aa3c8`, subtítulo: "A estrutura que sustenta o sonho"
- Dois cards de acesso:
  - **SFBS** → link para `/sfbs/` — "Onboarding de novos autores"
  - **Admin** → link para `https://admin.storiaforge.com` — "Painel administrativo"
- Rodapé com ⚓ e "StoriaForge · Uso Interno"
- Sem autenticação por enquanto (isso vem depois)

**Passo 4 — Conectar ao Cloudflare Pages**
Instrua o operador a fazer manualmente:
- New Project → Connect to Git → `storiaforge-forge`
- Build output directory: `public`
- Sem build command
- Custom domain: `forge.storiaforge.com`

**Passo 5 — DNS no Cloudflare**
Instrua o operador a adicionar:
```
Tipo: CNAME
Nome: forge
Destino: storiaforge-forge.pages.dev
Proxy: ✅ (laranja)
```

### NÃO alterar
O arquivo `SFBS_Agente_Onboarding_V3.html` funciona como está. Apenas renomeie
para `index.html` e posicione em `public/sfbs/`.

---

## TAREFA 3 — Atualizar `storiaforge.com`

O institucional precisa refletir a arquitetura das duas alas.

### Arquivo a editar
`storiaforge-web/index.html` — o hub institucional já criado.

### Alterações necessárias

**3a — Nav: adicionar link Forge**
No `<ul class="nav-links">`, adicionar após "Akvon":
```html
<li><a href="https://forge.storiaforge.com">Forge</a></li>
```

**3b — Seção hemisfério FORGE: atualizar links**
No bloco `.hemi-forge`, substituir os links existentes por:
```html
<a href="https://forge.storiaforge.com" class="hemi-link">
  Hub da Forge <span class="hemi-link-arrow">→</span>
</a>
<a href="https://forge.storiaforge.com/sfbs/" class="hemi-link">
  SFBS · Onboarding <span class="hemi-link-arrow">→</span>
</a>
<a href="https://admin.storiaforge.com" class="hemi-link">
  Painel Administrativo <span class="hemi-link-arrow">→</span>
</a>
```

**3c — Seção hemisfério STORIA: adicionar Pedro Rocha**
No bloco `.hemi-storia`, nos `.hemi-links`, adicionar:
```html
<a href="https://pedrorocha.storiaforge.com" class="hemi-link">
  Pedro Rocha e o CoMEx <span class="hemi-link-arrow">→</span>
</a>
```

**3d — Card Pedro Rocha nos Projetos: ativar link**
O card do Pedro Rocha está com `cursor:default` e sem link. Envolver em `<a>` e ativar:
- Trocar `<div class="project-card reveal"` por `<a href="https://pedrorocha.storiaforge.com" class="project-card reveal"`
- Remover `style="cursor:default"`
- Trocar o `<span class="project-action" style="color:var(--muted)">Em breve</span>`
  por `<span class="project-action">Entrar no Projeto →</span>`

**3e — Footer: adicionar links**
No `<ul class="footer-links">`, adicionar:
```html
<li><a href="https://forge.storiaforge.com">Forge</a></li>
<li><a href="https://pedrorocha.storiaforge.com">Pedro Rocha</a></li>
```

---

## SEQUÊNCIA DE EXECUÇÃO RECOMENDADA

```
1. Localizar os dois arquivos em C:\Users\guiba\DAurora\public\
2. Criar repositório storiaforge-pedrorocha → push do pedro rocha index.html
3. Criar repositório storiaforge-forge → push do SFBS + criar hub forge/index.html
4. Editar storiaforge-web/index.html com as 5 alterações da Tarefa 3 → push
5. Informar o operador quais passos manuais fazer no Cloudflare (DNS + Pages)
6. Confirmar que todos os deploys ficaram no ar
```

---

## CHECKLIST FINAL

Ao terminar, confirme cada item:

- [ ] `storiaforge-pedrorocha` criado no GitHub e com `public/index.html`
- [ ] `storiaforge-forge` criado com `public/index.html` (hub) e `public/sfbs/index.html`
- [ ] `storiaforge-web/index.html` atualizado com os 5 ajustes
- [ ] Operador instruído sobre DNS: `pedrorocha` e `forge` no Cloudflare
- [ ] Operador instruído sobre Pages: dois novos projetos a conectar
- [ ] Todos os repositórios com commit `feat: integração arquitetura StoriaForge`

---

## MAPA DNS COMPLETO PÓS-EXPANSÃO

Para o operador configurar de uma vez no painel Cloudflare (storiaforge.com):

| Tipo  | Nome         | Destino                               | Proxy |
|-------|--------------|---------------------------------------|-------|
| CNAME | www          | storiaforge.com                       | ✅    |
| CNAME | aco          | cruzadadosoceanoscap1.pages.dev       | ✅    |
| CNAME | akvon        | cruzadadosoceanoscap1.pages.dev       | ✅    |
| CNAME | admin        | daurora.pages.dev                     | ✅    |
| CNAME | pedrorocha   | storiaforge-pedrorocha.pages.dev      | ✅    |
| CNAME | forge        | storiaforge-forge.pages.dev           | ✅    |

---

*"O que lança e vence."*
*Lanĉvenko · Expansão de Arquitetura v1.0 · Abril 2026*
⚓
