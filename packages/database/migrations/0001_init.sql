-- JK System Platform — schema inicial
-- Referência: blueprint do projeto "JK SYSTEM LTDA" (Fase 1/2 — Arquitetura do produto e Multi-tenancy).
--
-- Convenções de nomenclatura (ver Seção 1 do blueprint):
--   tenant / empresa   = o salão que contrata a JK System (chamado de "Contratante" na Central Admin)
--   cliente_final      = o freguês do salão (tabela ainda não criada nesta migration inicial)
--   modules            = catálogo global de funcionalidades que podem ser ativadas por tenant
--
-- Estratégia de isolamento: banco compartilhado + RLS por tenant_id (não schema/banco por tenant).
-- Estratégia de RLS: checagem via subquery em user_tenants (auth.uid()), não via custom JWT claim —
-- mais simples de operar agora; migrar para claim customizada no JWT é uma otimização de performance
-- que pode ser feita depois, sem mudar o modelo de dados.

create extension if not exists "pgcrypto";

-- ============================================================
-- TENANTS
-- ============================================================
create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status text not null default 'active' check (status in ('active','suspended','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.tenants is 'Empresas/salões contratantes da plataforma. Rótulo de interface na Central Admin: "Contratantes".';

-- ============================================================
-- USER_TENANTS (many-to-many: um usuário pode pertencer a mais de um tenant)
-- ============================================================
create table if not exists public.user_tenants (
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  role text not null check (role in ('owner','manager','staff')),
  created_at timestamptz not null default now(),
  primary key (user_id, tenant_id)
);

create index if not exists idx_user_tenants_tenant on public.user_tenants(tenant_id);
create index if not exists idx_user_tenants_user on public.user_tenants(user_id);

comment on table public.user_tenants is 'Vínculo usuário<->tenant com papel (role). Um admin da JK NÃO tem linha aqui — vive fora do escopo de tenant.';

-- ============================================================
-- MODULES (catálogo global de módulos do produto)
-- ============================================================
create table if not exists public.modules (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- TENANT_MODULES (quais módulos cada tenant tem ativado)
-- ============================================================
create table if not exists public.tenant_modules (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  module_id uuid not null references public.modules(id) on delete cascade,
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (tenant_id, module_id)
);

create index if not exists idx_tenant_modules_tenant on public.tenant_modules(tenant_id);

-- ============================================================
-- PLANS + SUBSCRIPTIONS (esqueleto simples para a Central Admin)
-- ============================================================
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  price_cents integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  plan_id uuid not null references public.plans(id),
  status text not null default 'active' check (status in ('active','past_due','cancelled')),
  current_period_end timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_subscriptions_tenant on public.subscriptions(tenant_id);

-- ============================================================
-- HELPER: checa se o usuário autenticado pertence a um tenant
-- ===============================================================
create or replace function public.is_member_of(check_tenant_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.user_tenants
    where user_tenants.tenant_id = check_tenant_id
      and user_tenants.user_id = auth.uid()
  );
$$;

-- ============================================================
-- RLS
-- ============================================================
alter table public.tenants enable row level security;
alter table public.user_tenants enable row level security;
alter table public.modules enable row level security;
alter table public.tenant_modules enable row level security;
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;

-- tenants: usuário só vê os tenants dos quais é membro
create policy "tenants_select_member" on public.tenants
  for select using (public.is_member_of(id));

-- user_tenants: usuário só vê seus próprios vínculos
create policy "user_tenants_select_own" on public.user_tenants
  for select using (user_id = auth.uid());

-- modules: catálogo global, leitura liberada para qualquer usuário autenticado
create policy "modules_select_authenticated" on public.modules
  for select using (auth.role() = 'authenticated');

-- tenant_modules: só membros do tenant enxergam
create policy "tenant_modules_select_member" on public.tenant_modules
  for select using (public.is_member_of(tenant_id));

-- plans: catálogo global, leitura liberada
create policy "plans_select_authenticated" on public.plans
  for select using (auth.role() = 'authenticated');

-- subscriptions: só membros do tenant enxergam
create policy "subscriptions_select_member" on public.subscriptions
  for select using (public.is_member_of(tenant_id));

-- Nota: políticas de INSERT/UPDATE/DELETE ficam para quando as telas
-- forem implementadas — dependem de regra de negócio por papel (role).
-- A Central Admin acessa tudo via chave "secret" (service_role) no backend,
-- que bypassa RLS por design. Essa chave NUNCA deve ir para o app da Plataforma
-- nem para o repositório de código.
