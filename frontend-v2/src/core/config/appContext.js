/**
 * appContext.js
 * Detecta o contexto de execução da app com base no hostname.
 *
 * Contextos possíveis:
 *   'portal'     → clientes.aintar.pt  (Portal do Cliente)
 *   'backoffice' → app.aintar.pt       (Backoffice interno)
 *
 * Em desenvolvimento, a variável de ambiente VITE_APP_CONTEXT
 * permite forçar o contexto sem alterar o hostname:
 *   VITE_APP_CONTEXT=portal  npm run dev
 */

const PORTAL_HOSTNAMES = ['clientes.aintar.pt', 'clientes.localhost'];

/**
 * Devolve 'portal' ou 'backoffice' consoante o hostname actual.
 * Em desenvolvimento, VITE_APP_CONTEXT tem prioridade.
 */
function detectContext() {
  // Override por variável de ambiente (dev only)
  const envOverride = import.meta.env.VITE_APP_CONTEXT;
  if (envOverride === 'portal' || envOverride === 'backoffice') {
    return envOverride;
  }

  const hostname = window.location.hostname.toLowerCase();
  if (PORTAL_HOSTNAMES.includes(hostname)) {
    return 'portal';
  }

  return 'backoffice';
}

/** Contexto activo — imutável durante o ciclo de vida da página. */
export const APP_CONTEXT = detectContext();

/** true quando corremos no Portal do Cliente */
export const IS_PORTAL = APP_CONTEXT === 'portal';

/** true quando corremos no Backoffice */
export const IS_BACKOFFICE = APP_CONTEXT === 'backoffice';
