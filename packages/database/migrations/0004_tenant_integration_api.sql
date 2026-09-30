-- JK System Platform — Integração externa por tenant (status + heartbeat)
-- Referência: blueprint do projeto "JK SYSTEM LTDA", Fase 3 (Seção 6) — decisão de
-- NÃO migrar/unificar fisicamente o banco da Guitart (ou de qualquer outro
-- contratante que ainda opere um sistema próprio) com o banco da JK, e sim
-- conectar os dois sistemas por API, mantendo cada banco com sua própria
-- credencial e seu próprio isolamento de segurança.
--
-- Esta migration adiciona:
--   1) tenants.integration_secret  -> segredo por contratante, usado para autenticar
--      chamadas feitas PELO sistema do contratante (ex.: Guitart) para a Central Admin.
--      NÃO é a mesma coisa que SUPABASE_SERVICE_ROLE_KEY — não dá acesso a nenhum
--      banco de dados, só permite consultar/reportar status deste único tenant.
--   2) tenants.last_heartbeat_at   -> último sinal de vida recebido do sistema do
--      contratante, para exibir rapidamente na tela "Contratantes".
--
-- Fluxo de uso (ver apps/admin/app/api/integracao/*):
--   - GET  /api/integracao/status?slug=<slug>     (header X-Tenant-Secret) -> {status}
--     O sistema do contratante chama isso para decidir se libera ou bloqueia acesso
--     (ex.: mostrar tela de "sistema suspenso" quando a Central Admin cancelar o tenant).
--   - POST /api/integracao/heartbeat              (header X-Tenant-Secret) -> grava
--     um sinal de vida/erro em health_checks + system_events (mesmas tabelas da
--     migration 0003) e atualiza tenants.last_heartbeat_at.
--
-- Nenhum dado operacional do contratante trafega por aqui — só status
-- (active/suspended/cancelled) e sinais de saúde (ok/warning/critical + mensagem).

alter table public.tenants
  add column if not exists integration_secret text,
  add column if not exists last_heartbeat_at timestamptz;

-- Gera um segredo para tenants que já existiam antes desta migration (ex.: o
-- contratante de teste criado durante a auditoria). Novos tenants recebem o
-- default abaixo automaticamente a partir de agora.
update public.tenants
  set integration_secret = encode(gen_random_bytes(24), 'hex')
  where integration_secret is null;

alter table public.tenants
  alter column integration_secret set default encode(gen_random_bytes(24), 'hex');

alter table public.tenants
  alter column integration_secret set not null;

do $$
begin
  alter table public.tenants
    add constraint tenants_integration_secret_unique unique (integration_secret);
exception when duplicate_object then
  null; -- migration idempotente: constraint já existe
end
$$;

comment on column public.tenants.integration_secret is
  'Segredo unico por contratante, usado pelo PROPRIO sistema do contratante (ex.: Guitart) para se autenticar ao chamar /api/integracao/status e /api/integracao/heartbeat na Central Admin. Nao e a SUPABASE_SERVICE_ROLE_KEY e nao da acesso a banco nenhum — so permite consultar/reportar o status deste unico tenant. Pode ser regenerado a qualquer momento pela tela de detalhe do contratante (isso invalida o segredo anterior).';

comment on column public.tenants.last_heartbeat_at is
  'Ultimo heartbeat recebido de POST /api/integracao/heartbeat para este contratante. Null = nunca recebeu (contratante ainda nao integrado, ou integracao fora do ar).';

-- ============================================================
-- SEGURANÇA EM CAMADAS: mesmo um usuário autenticado de um tenant (que já pode
-- ler sua própria linha em `tenants` via a policy "tenants_select_member" da
-- migration 0001) NUNCA deve conseguir ler o segredo de integração pela API
-- pública do Supabase (PostgREST) usando a chave anon/authenticated — só o
-- backend da Central Admin, via service_role, que bypassa privilégios de
-- coluna. RLS é por linha, não por coluna — por isso o REVOKE explícito abaixo.
-- ============================================================
revoke select (integration_secret) on public.tenants from authenticated, anon;
