-- JK System Platform — Central Admin: usuários internos + monitoramento/observabilidade
-- Referência: blueprint do projeto "JK SYSTEM LTDA", Seção 7 (Fase 4 — Central JK) e
-- pedido de "sistema de administração de sistemas completo" para prever falhas antes
-- que interrompam operação.
--
-- Esta migration adiciona:
--   1) jk_admins        -> quem é usuário interno da JK e pode logar na Central Admin
--   2) system_events    -> trilha de auditoria/log de eventos (criação de tenant, erros, etc.)
--   3) health_checks    -> resultado de verificações periódicas de saúde do sistema
--   4) run_health_checks() -> função que roda as verificações e grava em health_checks/system_events
--   5) agendamento via pg_cron (se disponível no projeto) para rodar run_health_checks() a cada 5 min
--
-- Nenhuma destas tabelas tem policy de RLS para anon/authenticated: são tabelas de
-- controle interno da JK, acessadas exclusivamente pelo backend da Central Admin via
-- service_role key (que bypassa RLS por design — ver packages/database/src/index.ts).

-- ============================================================
-- VALIDAÇÃO DE CPF — usada como checagem extra de identidade no login da Central Admin
-- ============================================================
-- Implementa o algoritmo padrão de dígito verificador do CPF. Espera uma string
-- com EXATAMENTE 11 dígitos (sem pontuação) — normalização acontece na aplicação
-- antes de chegar ao banco.
create or replace function public.is_valid_cpf(cpf text)
returns boolean
language plpgsql
immutable
as $$
declare
  digits int[];
  sum1 int := 0;
  sum2 int := 0;
  d1 int;
  d2 int;
  i int;
begin
  if cpf is null or cpf !~ '^[0-9]{11}$' then
    return false;
  end if;

  -- rejeita sequências óbvias tipo 00000000000, 11111111111, etc.
  if cpf ~ '^(\d)\1{10}$' then
    return false;
  end if;

  for i in 1..11 loop
    digits[i] := substring(cpf from i for 1)::int;
  end loop;

  for i in 1..9 loop
    sum1 := sum1 + digits[i] * (11 - i);
  end loop;
  d1 := 11 - (sum1 % 11);
  if d1 >= 10 then d1 := 0; end if;

  for i in 1..10 loop
    sum2 := sum2 + digits[i] * (12 - i);
  end loop;
  d2 := 11 - (sum2 % 11);
  if d2 >= 10 then d2 := 0; end if;

  return digits[10] = d1 and digits[11] = d2;
end;
$$;

comment on function public.is_valid_cpf(text) is
  'Valida digito verificador de CPF (11 digitos, sem pontuacao). Usado como checagem extra de identidade no login da Central Admin (jk_admins.cpf).';

-- ============================================================
-- JK_ADMINS — usuários internos da JK System (equipe, não são tenants)
-- ============================================================
create table if not exists public.jk_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  cpf text not null unique check (public.is_valid_cpf(cpf)),
  role text not null default 'admin' check (role in ('super_admin', 'admin')),
  created_at timestamptz not null default now()
);

comment on table public.jk_admins is
  'Usuários internos da JK System com acesso à Central Admin. Um usuário aqui NÃO é membro de nenhum tenant (ver user_tenants) — vive fora do escopo de tenant, conforme Seção 5 do blueprint. Login exige e-mail+senha (Supabase Auth) E o CPF cadastrado aqui baterem — ver app/login.';

comment on column public.jk_admins.cpf is
  'Somente digitos (11 caracteres), sem pontuacao. Conferido no login como segundo fator de identidade, alem de e-mail/senha.';

alter table public.jk_admins enable row level security;
-- Sem policies: leitura/escrita apenas via service_role (backend da Central Admin).

-- ============================================================
-- SYSTEM_EVENTS — trilha de auditoria e log de eventos do sistema
-- ============================================================
create table if not exists public.system_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  tenant_id uuid references public.tenants(id) on delete set null,
  severity text not null check (severity in ('info', 'warning', 'error', 'critical')),
  source text not null,
  message text not null,
  metadata jsonb not null default '{}'::jsonb
);

comment on table public.system_events is
  'Log/auditoria de eventos do sistema (ações da Central Admin, erros de aplicação, alertas). Fonte de dados da tela "Monitoramento".';

create index if not exists idx_system_events_created_at on public.system_events (created_at desc);
create index if not exists idx_system_events_severity on public.system_events (severity);
create index if not exists idx_system_events_tenant on public.system_events (tenant_id);

alter table public.system_events enable row level security;
-- Sem policies: leitura/escrita apenas via service_role (backend da Central Admin).

-- ============================================================
-- HEALTH_CHECKS — resultado de verificações periódicas de saúde
-- ============================================================
create table if not exists public.health_checks (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  check_key text not null,
  status text not null check (status in ('ok', 'warning', 'critical')),
  tenant_id uuid references public.tenants(id) on delete set null,
  message text not null,
  details jsonb not null default '{}'::jsonb
);

comment on table public.health_checks is
  'Resultado de verificações automáticas de saúde do sistema (rodadas por run_health_checks(), agendadas via pg_cron quando disponível). Objetivo: identificar/prever problemas antes que interrompam operação.';

create index if not exists idx_health_checks_created_at on public.health_checks (created_at desc);
create index if not exists idx_health_checks_check_key on public.health_checks (check_key, created_at desc);
create index if not exists idx_health_checks_status on public.health_checks (status);

alter table public.health_checks enable row level security;
-- Sem policies: leitura/escrita apenas via service_role (backend da Central Admin).

-- ============================================================
-- RUN_HEALTH_CHECKS() — motor de verificações
-- ============================================================
-- Cada verificação grava 1 linha em health_checks. Verificações que encontram
-- problema (warning/critical) também geram uma linha espelho em system_events,
-- para aparecerem no mesmo feed de eventos da Central Admin.
create or replace function public.run_health_checks()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  issues_found integer := 0;
  r record;
begin
  -- 1) Heartbeat: banco alcançável e função rodando normalmente.
  insert into public.health_checks (check_key, status, message)
  values ('database_heartbeat', 'ok', 'Banco de dados respondendo normalmente.');

  -- 2) Tenants ativos sem nenhum módulo habilitado (provável erro de configuração).
  for r in
    select t.id, t.name
    from public.tenants t
    where t.status = 'active'
      and not exists (
        select 1 from public.tenant_modules tm
        where tm.tenant_id = t.id and tm.enabled = true
      )
  loop
    issues_found := issues_found + 1;
    insert into public.health_checks (check_key, status, tenant_id, message, details)
    values (
      'tenant_sem_modulo_ativo', 'warning', r.id,
      format('Contratante "%s" está ativo mas não tem nenhum módulo habilitado.', r.name),
      jsonb_build_object('tenant_id', r.id, 'tenant_name', r.name)
    );
    insert into public.system_events (tenant_id, severity, source, message, metadata)
    values (
      r.id, 'warning', 'run_health_checks',
      format('Contratante "%s" está ativo mas não tem nenhum módulo habilitado.', r.name),
      jsonb_build_object('check_key', 'tenant_sem_modulo_ativo')
    );
  end loop;

  -- 3) Tenants ativos sem nenhum usuário vinculado (ninguém consegue logar/operar).
  for r in
    select t.id, t.name
    from public.tenants t
    where t.status = 'active'
      and not exists (
        select 1 from public.user_tenants ut where ut.tenant_id = t.id
      )
  loop
    issues_found := issues_found + 1;
    insert into public.health_checks (check_key, status, tenant_id, message, details)
    values (
      'tenant_sem_usuario', 'critical', r.id,
      format('Contratante "%s" está ativo mas não tem nenhum usuário vinculado — ninguém consegue operar.', r.name),
      jsonb_build_object('tenant_id', r.id, 'tenant_name', r.name)
    );
    insert into public.system_events (tenant_id, severity, source, message, metadata)
    values (
      r.id, 'critical', 'run_health_checks',
      format('Contratante "%s" está ativo mas não tem nenhum usuário vinculado.', r.name),
      jsonb_build_object('check_key', 'tenant_sem_usuario')
    );
  end loop;

  -- 4) Assinaturas vencidas (current_period_end no passado) ainda marcadas como 'active'.
  for r in
    select s.id, s.tenant_id, t.name as tenant_name, s.current_period_end
    from public.subscriptions s
    join public.tenants t on t.id = s.tenant_id
    where s.status = 'active'
      and s.current_period_end is not null
      and s.current_period_end < now()
  loop
    issues_found := issues_found + 1;
    insert into public.health_checks (check_key, status, tenant_id, message, details)
    values (
      'assinatura_vencida', 'critical', r.tenant_id,
      format('Assinatura do contratante "%s" venceu em %s e ainda consta como ativa.', r.tenant_name, r.current_period_end),
      jsonb_build_object('subscription_id', r.id, 'current_period_end', r.current_period_end)
    );
    insert into public.system_events (tenant_id, severity, source, message, metadata)
    values (
      r.tenant_id, 'critical', 'run_health_checks',
      format('Assinatura do contratante "%s" venceu em %s.', r.tenant_name, r.current_period_end),
      jsonb_build_object('check_key', 'assinatura_vencida', 'subscription_id', r.id)
    );
  end loop;

  -- 5) Tenants suspensos/cancelados há mais de 30 dias que ainda têm módulos habilitados
  --    (custo/risco de acesso indevido residual).
  for r in
    select t.id, t.name
    from public.tenants t
    where t.status in ('suspended', 'cancelled')
      and t.updated_at < now() - interval '30 days'
      and exists (
        select 1 from public.tenant_modules tm where tm.tenant_id = t.id and tm.enabled = true
      )
  loop
    issues_found := issues_found + 1;
    insert into public.health_checks (check_key, status, tenant_id, message, details)
    values (
      'tenant_inativo_com_modulos_ativos', 'warning', r.id,
      format('Contratante "%s" está %s há mais de 30 dias mas ainda tem módulos habilitados.', r.name,
        (select status from public.tenants where id = r.id)),
      jsonb_build_object('tenant_id', r.id, 'tenant_name', r.name)
    );
  end loop;

  return issues_found;
end;
$$;

comment on function public.run_health_checks() is
  'Roda as verificações de saúde do sistema e grava resultados em health_checks (+ system_events quando há problema). Retorna a quantidade de problemas encontrados. Chamada manualmente pela tela Monitoramento ou automaticamente via pg_cron.';

-- ============================================================
-- AGENDAMENTO (pg_cron) — roda run_health_checks() a cada 5 minutos
-- ============================================================
-- Feito de forma defensiva: nem todo plano/projeto Supabase tem pg_cron disponível
-- por padrão. Se a extensão não puder ser habilitada aqui, a migration não falha —
-- ela apenas avisa, e a verificação continua disponível para rodar manualmente
-- (botão "Rodar verificação agora" na Central Admin) até o cron ser habilitado
-- manualmente em Database → Extensions → pg_cron no Supabase Dashboard.
do $$
begin
  create extension if not exists pg_cron;
exception when others then
  raise notice 'pg_cron nao pode ser habilitado automaticamente (%). Habilite manualmente em Database > Extensions se quiser checagens automaticas.';
end
$$;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    -- remove agendamento anterior com o mesmo nome, se existir, para manter a migration idempotente
    delete from cron.job where jobname = 'jk_run_health_checks';
    perform cron.schedule(
      'jk_run_health_checks',
      '*/5 * * * *',
      $cron$select public.run_health_checks();$cron$
    );
    raise notice 'pg_cron habilitado: run_health_checks() agendado para rodar a cada 5 minutos.';
  else
    raise notice 'pg_cron nao disponivel neste projeto — checagens automaticas nao agendadas. Rode manualmente pela tela Monitoramento ou habilite a extensao e rode esta migration novamente.';
  end if;
end
$$;

-- Roda uma vez agora, para a tela de Monitoramento já nascer com dados.
select public.run_health_checks();
