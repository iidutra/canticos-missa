# Cânticos da Missa

Aplicativo web para montar, salvar e apresentar repertório litúrgico católico — com cifras, transposição de tom, calendário Músicas para Missa (MPM), liturgia CNBB e importação de folhetos (PDF, DOC, DOCX).

**Produção:** https://canticos-app-production.up.railway.app  
**Repositório:** https://github.com/iidutra/canticos-missa

---

## Funcionalidades

| Área | Descrição |
|------|-----------|
| **Início** | Calendário litúrgico híbrido (MPM + CNBB), sugestões de cantos, leituras do dia |
| **Montar** | 14 seções da missa, busca Cifra Club, transposição, importação de documentos |
| **Biblioteca** | Acervo pessoal de músicas com categoria e busca |
| **Salvos** | Repertórios salvos com data/título da missa e histórico |
| **Apresentação** | Modo tela cheia, cifra colorida, só letra justificado, A+/A−, troca de tom |
| **Exportação** | DOC, DOCX e JSON |

---

## Stack

- **Frontend:** React 19, Vite 6, CSS responsivo (mobile / tablet / desktop)
- **Backend:** Express 5 (produção), plugins Vite (desenvolvimento)
- **Banco:** PostgreSQL (Railway) em produção; `localStorage` em dev
- **Deploy:** Railway (Nixpacks), Node ≥ 20

---

## Estrutura do projeto

```
repertorio/
├── src/
│   ├── App.jsx                 # Shell principal e abas
│   ├── components/             # UI (apresentação, import, liturgia, nav)
│   ├── lib/                    # transpose, pdf-import, liturgia, doc, lyrics
│   ├── styles/app.css          # Estilos globais e modo apresentação
│   └── storage.js              # Cliente storage (API ou localStorage)
├── server/
│   ├── index.js                # Express produção
│   ├── db.js                   # PostgreSQL
│   ├── calendar-store.js       # Acervo calendário MPM
│   ├── cifraclub.js            # Proxy busca/parsing Cifra Club
│   └── routes/                 # storage, liturgia, cifraclub, import
├── data/mpm-calendar.json      # Acervo local MPM (sync acumulativo)
├── public/data/                # Cópia servida estaticamente
├── scripts/                    # sync calendário, utilitários
├── railway.toml
└── nixpacks.toml
```

---

## Desenvolvimento local

### Pré-requisitos

- Node.js 20+
- npm

### Instalação e execução

```bash
npm install
npm run dev
```

Abre em `http://localhost:5173`. APIs (`/api/liturgia`, `/api/cifraclub`, `/api/import`) rodam via plugins Vite — **sem Postgres**; dados ficam em `localStorage`.

### Build e preview de produção

```bash
npm run build
npm start          # serve dist/ + APIs na porta 3000
```

Para testar storage com Postgres localmente, defina `DATABASE_URL` antes de `npm start`.

### Scripts úteis

| Script | Uso |
|--------|-----|
| `npm run dev` | Desenvolvimento com hot reload |
| `npm run build` | Build Vite → `dist/` |
| `npm start` | Servidor Express (produção) |
| `npm run sync-calendar` | Atualiza acervo MPM (`data/` + `public/data/`) |

---

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `DATABASE_URL` | Produção | Connection string PostgreSQL (Railway) |
| `PORT` | Não | Porta do servidor (padrão `3000`) |
| `NODE_ENV` | Não | `production` em deploy |
| `WORKSPACE_ID` | Não | Isolamento de dados (padrão `default`) |
| `PGSSL` | Não | `false` para desabilitar SSL local |

---

## Armazenamento

### Desenvolvimento

Chaves em `localStorage` (`canticos:lib`, `canticos:reps`, `canticos:cur`).

### Produção

PostgreSQL, tabela `app_data`:

| Chave | Conteúdo |
|-------|----------|
| `lib` | Biblioteca de músicas |
| `reps` | Repertórios salvos |
| `cur` | Repertório atual (montagem) |

API: `GET/PUT /api/storage/:key` (chaves permitidas: `lib`, `reps`, `cur`).

> **Limitação atual:** não há autenticação. Todos os usuários do mesmo deploy compartilham o workspace `default`. Para uso multi-equipe, configure `WORKSPACE_ID` por instância ou implemente auth (roadmap).

---

## Calendário MPM

Acervo acumulativo em `data/mpm-calendar.json`, mesclado com Músicas para Missa e CNBB.

```bash
npm run sync-calendar
```

No GitLab CI (`.gitlab-ci.yml`), agende pipeline mensal ou dispare manualmente para commitar atualizações do calendário.

APIs:

- `GET /api/liturgia/calendar` — calendário + próximas missas
- `GET /api/liturgia/missa?date=DD/MM/AAAA` — liturgia do dia
- `POST /api/liturgia/sync` — força sync remoto

---

## Importação de documentos

Formatos: **PDF** (cliente, pdf.js), **DOCX** (mammoth), **DOC** (servidor, word-extractor).

Fluxo: upload → extração de texto → parser de seções (`src/lib/pdf-import.js`) → preview → aplicar ao repertório.

Endpoint: `POST /api/import/extract-text` (multipart, `.doc`).

---

## Modo apresentação

Componentes: `PresentationMode`, `CifraView`, `LetraView`.

| Modo | Comportamento |
|------|---------------|
| **Cifra** | Acordes laranja, letras claras, alinhamento monospace; transposição inline |
| **Só letra** | Cifras removidas, texto justificado (linhas longas), marcadores dourados |
| **Responsivo** | Fontes menores no mobile; quebra de linha; barra de tom oculta sem cifra |

Atalhos: setas / espaço (navegar), `+`/`-` (fonte), `Esc` (sair).

---

## APIs (resumo)

| Rota | Método | Descrição |
|------|--------|-----------|
| `/api/health` | GET | Saúde do app e DB |
| `/api/storage/:key` | GET/PUT | Persistência (`lib`, `reps`, `cur`) |
| `/api/liturgia/calendar` | GET | Calendário litúrgico |
| `/api/liturgia/missa` | GET | Missa por data |
| `/api/liturgia/sync` | POST | Sync calendário MPM |
| `/api/cifraclub/fetch` | GET | Busca cifra no Cifra Club |
| `/api/import/extract-text` | POST | Extrai texto de `.doc` |

---

## Deploy (Railway)

1. Conecte o repositório GitHub ao Railway
2. Adicione serviço **PostgreSQL** e vincule `DATABASE_URL`
3. Build: Nixpacks (`nixpacks.toml`) — `npm ci`, `npm run build`, `npm start`
4. Health check: `/api/health`

Deploy manual via CLI:

```bash
railway up --detach
```

---

## Commits e MRs

Use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` nova funcionalidade
- `fix:` correção de bug
- `docs:` documentação
- `chore:` manutenção (ex.: sync calendário)
- `refactor:` refatoração sem mudança de comportamento

Referencie issues GitLab com `#123` quando aplicável.

---

## Roadmap / limitações conhecidas

- [ ] Autenticação / workspace por equipe ou paróquia
- [ ] PWA / offline para apresentação na missa
- [ ] Preview colorido de cifra na tela Montar
- [ ] Testes automatizados (parser PDF, transposição)
- [ ] CI/CD automático (push → deploy)
- [ ] Migração localStorage → Postgres para usuários existentes

---

## Licença

Projeto privado — uso interno da equipe litúrgica.
