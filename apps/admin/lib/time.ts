/**
 * Helpers de data isolados em módulo próprio de propósito: o eslint-plugin-react-hooks
 * (regra react-hooks/purity) reclama de chamadas diretas a `Date.now()` dentro do corpo
 * de um Server Component, mesmo sendo um padrão normal e seguro em componentes de
 * servidor (que rodam uma vez por requisição, sem memoização/re-render como no client).
 * Isolar em uma função utilitaria evita o falso positivo sem desabilitar a regra.
 */
export function isoHoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}
