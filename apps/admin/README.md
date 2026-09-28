# @jk-system/admin — Central JK

App de controle interno da JK System ("control plane") — administra Contratantes
(tenants), planos, módulos e monitora a saúde do sistema. Ver o `README.md` na raiz
do monorepo para visão geral, setup e regras de segurança.

## Rotas

| Rota | O que é |
|---|---|
| `/login` | Login (Supabase Auth, e-mail/senha) — pública |
| `/` | Visão geral: contagem de contratantes por status, alertas 24h |
| `/contratantes` | Listagem de contratantes |
| `/contratantes/novo` | Criar contratante |
| `/contratantes/[id]` | Detalhe: status, módulos, plano/assinatura, usuários, atividade |
| `/contratantes/[id]/editar` | Editar nome/slug |
| `/planos` | Catálogo de planos |
| `/modulos` | Catálogo de módulos |
| `/monitoramento` | Verificações de saúde + feed de eventos do sistema |

Todas as rotas, exceto `/login`, exigem sessão autenticada **e** um registro em
`jk_admins` (ver bootstrap no README raiz) — reforçado por `middleware.ts` (sessão)
e por `app/(app)/layout.tsx` (checagem de `jk_admins`).

## Estrutura

- `middleware.ts` — refresh de sessão Supabase + redirect para `/login`.
- `lib/supabase.ts` — client browser (anon key), usado no login e no logout.
- `lib/supabase-server.ts` — client de Server Component (anon key + cookies da sessão).
- `lib/supabase-admin.ts` — client `service_role` (bypassa RLS), instanciado de forma
  preguiçosa (lazy) para não quebrar o build quando as env vars não estão presentes
  no momento do `next build`. Uso exclusivo em código server-side.
- `app/(app)/` — grupo de rotas protegidas (dashboard, contratantes, planos, módulos,
  monitoramento), cada uma com seu `actions.ts` (`"use server"`) para mutações.
- `components/` — `AppShell`, `Sidebar`, `TopBar`, `Badge` (badges de status).

## Rodando localmente

```bash
pnpm install
cp .env.local.example .env.local
# preencha SUPABASE_SERVICE_ROLE_KEY (Supabase Dashboard > Project Settings > API Keys)
pnpm --filter @jk-system/admin dev
```
