/**
 * Permission Groups Service
 * CRUD para gestão de grupos/templates de permissões (ts_interface.groups)
 *
 * Endpoints (user_bp, prefix /api/v1/user):
 *   GET    /user/interfaces/groups           → listar grupos
 *   POST   /user/interfaces/groups/:name     → criar/sincronizar grupo
 *   PUT    /user/interfaces/groups/:name     → renomear grupo
 *   DELETE /user/interfaces/groups/:name     → eliminar grupo
 *
 * NOTA: apiClient tem interceptor response => response.data.
 * Nunca fazer res.data — já vem desembrulhado.
 */

import { apiClient } from './api/client';

const BASE = '/user/interfaces/groups';
const enc  = (name) => encodeURIComponent(name);

/**
 * Lista todos os grupos com contagem e IDs de permissões.
 * @returns {{ groups: Array<{ name, permission_count, permission_ids }> }}
 */
export const listPermissionGroups = async () => {
  const res = await apiClient.get(BASE);
  return res;
};

/**
 * Cria ou sincroniza um grupo (operação atómica: substitui permissões do grupo).
 * @param {string} name
 * @param {number[]} permissions
 */
export const syncPermissionGroup = async (name, permissions) => {
  const res = await apiClient.post(`${BASE}/${enc(name)}`, { permissions });
  return res;
};

/**
 * Renomeia um grupo em todas as permissões.
 * @param {string} oldName
 * @param {string} newName
 */
export const renamePermissionGroup = async (oldName, newName) => {
  const res = await apiClient.put(`${BASE}/${enc(oldName)}`, { name: newName });
  return res;
};

/**
 * Elimina um grupo de todas as permissões.
 * @param {string} name
 */
export const deletePermissionGroup = async (name) => {
  const res = await apiClient.delete(`${BASE}/${enc(name)}`);
  return res;
};
