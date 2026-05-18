import api from '@/services/api/client';

const BASE = '/alertas/whatsapp';

export const whatsappAlertasService = {
  // ligação
  getStatus:          ()                      => api.get(`${BASE}/status`),
  getQr:              ()                      => api.get(`${BASE}/qr`),
  abrirWhatsApp:      ()                      => api.post(`${BASE}/open`),
  ligar:              ()                      => api.post(`${BASE}/connect`),
  desligar:           ()                      => api.post(`${BASE}/desligar`),

  // grupos disponíveis no WhatsApp (microserviço)
  getGrupos:          ()                      => api.get(`${BASE}/grupos`),
  entrarGrupo:        (inviteCode)            => api.post(`${BASE}/entrar-grupo`, { invite_code: inviteCode }),

  // configuração de grupos auto-alerta (BD)
  getGruposConfig:    ()                      => api.get(`${BASE}/config/grupos`),
  addGrupoConfig:     (groupId, groupName, inviteLink) => api.post(`${BASE}/config/grupos`, { group_id: groupId, group_name: groupName, ...(inviteLink ? { invite_link: inviteLink } : {}) }),
  removeGrupoConfig:  (pk)                    => api.delete(`${BASE}/config/grupos/${pk}`),
  toggleGrupoConfig:  (pk, ativo)             => api.patch(`${BASE}/config/grupos/${pk}/toggle`, { ativo }),

  // grupo padrão (configurado em .env)
  getGrupoPadrao:     ()                      => api.get(`${BASE}/grupo-padrao`),

  // envio manual
  getUltimoAlerta:    (pk)                    => api.get(`${BASE}/ultimo`, { params: pk ? { pk } : {} }),
  enviarParaGrupo:    (groupId, pk)           => api.post(`${BASE}/enviar-grupo`, { group_id: groupId, ...(pk ? { pk } : {}) }),
  enviarGrupoPadrao:  (pk)                    => api.post(`${BASE}/enviar-padrao`, pk ? { pk } : {}),
};
