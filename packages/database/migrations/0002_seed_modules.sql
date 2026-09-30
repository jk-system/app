-- Seed inicial do catálogo de módulos, levantado a partir do que já existe na Guitart.
-- Fase 1 do blueprint: "Quais módulos existem?"

insert into public.modules (key, name, description) values
  ('agendamento', 'Agendamento', 'Agenda de horários e serviços do salão.'),
  ('financeiro', 'Financeiro', 'Fluxo de caixa, contas a pagar/receber.'),
  ('comissoes', 'Comissões', 'Cálculo de comissão por funcionário/serviço.'),
  ('estoque', 'Estoque', 'Controle de produtos e insumos.'),
  ('funcionarios', 'Funcionários', 'Cadastro de equipe, cargos e permissões.'),
  ('servicos', 'Serviços', 'Catálogo de serviços e categorias oferecidos pelo salão.'),
  ('relatorios', 'Relatórios', 'Relatórios e dashboard operacional.')
on conflict (key) do nothing;
