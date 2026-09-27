# JK System — Monorepo

Monorepo da Plataforma multi-tenant e da Central Admin da JK System, construido
com Next.js + Supabase, pnpm workspaces e Turborepo.

Contexto e decisoes de arquitetura completas estao no blueprint do projeto
"JK SYSTEM LTDA" (ver Claude Project).

## Estrutura

```
apps/
  platform/   → Plataforma SaaS (data plane) — cada salao/tenant opera aqui
  admin/      → Central JK / Admin (control plane) — equipe JK administra Contratantes
packages/
  database/   → migrations SQL + clientes Supabase compartilhados
```

## Infraestrutura

- **GitHub:** organizacao `jk-system`, repositorio `jk-system/app`.
- **Supabase:** organizacao "JK System", projeto `jk-system-platform` (regiao `sa-east-1`).
- **Banco:** ver `packages/database/migrations/`:
  - `0001_init.sql` — `tenants`, `user_tenants`, `modules`, `tenant_modules`, `plans`,
    `subscriptions`, RLS de `select`.
  - `0002_seed_modules.sql` — catalogo inicial de modulos.
  - `0003_admin_and_monitoring.sql` — `jk_admins` (quem loga na Central Admin),
    `system_events` (auditoria/log) e `health_checks` + `run_health_checks()`
    (verificacoes automaticas de saude, agendadas via `pg_cron` a cada 5 min quando
    a extensao esta disponivel no projeto).

## Central Admin — o que ja funciona

- **Login** (`/login`) via Supabase Auth (e-mail/senha). Middleware protege todas as
  rotas e redireciona quem nao esta logado.
- **Controle de acesso**: so quem tem uma linha em `jk_admins` consegue ver as telas
  (ver "Bootstrap do primeiro usuario admin" abaixo) — uma conta autenticada no
  projeto Supabase que pertenca a um tenant da Plataforma, por exemplo, NAO tem
  acesso a Central Admin so por estar autenticada.
- **Visao geral** (`/`) — contagem de contratantes por status + alertas das ultimas 24h.
- **Contratantes** (`/contratantes`) — listagem, criacao, edicao, ativar/suspender/
  cancelar, habilitar/desabilitar modulos por contratante, definir plano/assinatura,
  ver usuarios vinculados e atividade recente.
- **Planos** (`/planos`) e **Modulos** (`/modulos`) — catalogo com criacao simples.
- **Monitoramento** (`/monitoramento`) — resultado das verificacoes automaticas de
  saude (`health_checks`) e feed de eventos do sistema (`system_events`), com botao
  para rodar uma verificacao manualmente.

## Setup local

```bash
pnpm install

# em cada app, copie o exemplo de env:
cp apps/platform/.env.local.example apps/platform/.env.local
cp apps/admin/.env.local.example apps/admin/.env.local
# preencha SUPABASE_SERVICE_ROLE_KEY em apps/admin/.env.local
# (pegue em: Supabase Dashboard > Project Settings > API Keys — nunca commitar)

pnpm dev        # roda os dois apps em paralelo (via turbo)
pnpm build      # build de producao dos dois apps
pnpm typecheck  # checagem de tipos
pnpm lint       # lint
```

## Bootstrap do primeiro usuario admin (Central Admin)

A Central Admin nao tem tela de "criar conta" de proposito — usuarios internos da
JK sao adicionados manualmente, pelo Supabase Dashboard:

1. **Supabase Dashboard → Authentication → Users → Add user.** Crie o usuario com
   seu e-mail e uma senha (isso precisa ser feito por uma pessoa, nunca automatizado
   com uma senha real digitada por terceiros).
2. Copie o **UUID** desse usuario (aparece na lista de Users).
3. No **SQL Editor**, rode (trocando o UUID, o nome e o CPF — só números, sem
   pontuação):
   ```sql
   insert into public.jk_admins (user_id, full_name, cpf, role)
   values ('COLE-O-UUID-AQUI', 'Seu Nome', '12345678901', 'super_admin');
   ```
   O CPF passa por validação de dígito verificador (`is_valid_cpf`) — um CPF
   inválido é rejeitado pelo banco.
4. Faça login em `/login` no app `admin` com e-mail, senha **e o CPF cadastrado**.
   O login exige os três: e-mail/senha autenticam no Supabase Auth, e o CPF é
   conferido como segunda camada de identidade logo em seguida (ver
   `app/login/actions.ts`) — se não bater, a sessão é encerrada na hora.

Sem o passo 3, o login funciona mas a Central Admin mostra "Acesso não liberado"
— é a proteção funcionando como esperado (ver `app/(app)/layout.tsx`).

## Regras de seguranca importantes

- A chave **publishable/anon** (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) e segura para uso
  no client, em ambos os apps. Todo acesso a dados via essa chave passa por RLS.
- A chave **secret/service_role** (`SUPABASE_SERVICE_ROLE_KEY`) faz bypass de RLS
  por design. So deve existir em `apps/admin`, nunca prefixada com `NEXT_PUBLIC_`,
  e nunca deve ir para o repositorio (ja esta no `.gitignore`).
- `jk_admins`, `system_events` e `health_checks` NAO tem nenhuma policy de RLS para
  `anon`/`authenticated` — leitura e escrita so acontecem via `service_role`, no
  backend do app `admin`. Isso é intencional: mesmo um usuario autenticado de um
  tenant da Plataforma nao consegue ler essas tabelas diretamente.
- Terminologia: no banco e no codigo, `tenants` = empresas/saloes contratantes.
  Na interface da Central Admin, o rotulo exibido ao usuario e "Contratantes".

## Monitoramento / observabilidade

`run_health_checks()` (banco de dados) roda periodicamente (via `pg_cron`, a cada 5
minutos, quando a extensao esta habilitada no projeto Supabase) e grava o resultado
em `health_checks`. Verificacoes atuais:

- contratante ativo sem nenhum modulo habilitado;
- contratante ativo sem nenhum usuario vinculado (ninguem consegue operar);
- assinatura vencida ainda marcada como ativa;
- contratante suspenso/cancelado ha mais de 30 dias com modulos ainda habilitados.

Problemas encontrados tambem geram uma linha em `system_events`, que aparece no
mesmo feed usado pela tela de auditoria. Se `pg_cron` nao estiver disponivel no
projeto, a migration avisa (via `raise notice`) e a verificacao continua disponivel
manualmente pelo botao "Rodar verificação agora" em `/monitoramento`.

**Alertas ativos (e-mail/Slack) ainda não estão implementados** — hoje o sinal fica
disponível na tela de Monitoramento e no feed de eventos. Ligar uma notificação de
verdade quando algo vier como "crítico" depende de decidir qual serviço usar (ex.:
Resend/SendGrid para e-mail, um webhook para Slack) e configurar a credencial
correspondente — ver Seção 11 do blueprint.

## Publicar no GitHub

O jeito recomendado agora é pelo **GitHub Desktop** (sem terminal) — ver instruções
na conversa/blueprint. Como referência, o equivalente por linha de comando seria:

```bash
cd app
git init
git add .
git commit -m "chore: scaffold inicial do monorepo (apps/platform, apps/admin, packages/database)"
git branch -M main
git remote add origin https://github.com/jk-system/app.git
git push -u origin main
```
