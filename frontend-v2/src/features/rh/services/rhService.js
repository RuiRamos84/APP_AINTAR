import api from '@/services/api/client';

const BASE = '/rh';

export const getLookups           = ()      => api.get(`${BASE}/lookups`);
export const getColaboradores     = ()      => api.get(`${BASE}/colaboradores`);
export const getColaboradoresLista = ()     => api.get(`${BASE}/colaboradores/lista`);
export const getColaborador       = (pk)    => api.get(`${BASE}/colaboradores/${pk}`);
export const getSaldoFerias       = (pk)    => api.get(`${BASE}/colaboradores/${pk}/saldo`);
export const upsertColaboradorPerfil = (data) => api.post(`${BASE}/colaboradores/perfil`, data);
export const getConfigColaborador = (pk)    => api.get(`${BASE}/config`, { params: { user_fk: pk } });
export const upsertConfigAno      = (data)  => api.post(`${BASE}/config`, data);
export const initConfigAno        = (data)  => api.post(`${BASE}/config/ano/init`, data);
export const initConfigAnoTodos   = (data)  => api.post(`${BASE}/config/ano/init-todos`, data);

// Ponto
export const registarPontoEvento  = (data) => api.post(`${BASE}/ponto/evento`, data);
export const submeterPontoMensal  = (data) => api.post(`${BASE}/ponto/submeter`, data);
export const getPonto             = (p)    => api.get(`${BASE}/ponto`, { params: p });
export const getPontoMensal       = (p)    => api.get(`${BASE}/ponto/mensal`, { params: p });
export const corrigirPonto        = (pk, d) => api.put(`${BASE}/ponto/${pk}/corrigir`, d);

// Workflow
export const executarWorkflow = (data) => api.post(`${BASE}/workflow`, data);

// Férias
export const getFerias  = (p)       => api.get(`${BASE}/ferias`, { params: p });
export const criarFerias = (data)   => api.post(`${BASE}/ferias`, data);
export const editarFerias = (pk, d) => api.put(`${BASE}/ferias/${pk}`, d);

// Faltas
export const getFaltas   = (p)      => api.get(`${BASE}/faltas`, { params: p });
export const criarFalta  = (data)   => api.post(`${BASE}/faltas`, data);
export const editarFalta = (pk, d)  => api.put(`${BASE}/faltas/${pk}`, d);

// Horários
export const getHorarios    = (p)       => api.get(`${BASE}/horarios`, { params: p });
export const criarHorario   = (data)    => api.post(`${BASE}/horarios`, data);
export const editarHorario  = (pk, d)   => api.put(`${BASE}/horarios/${pk}`, d);

// Config (saldo)
export const getConfig    = (p)    => api.get(`${BASE}/config`, { params: p });
export const upsertConfig = (data) => api.post(`${BASE}/config`, data);

// Piquete
export const getPiquete = (params) => api.get('/rh/piquete', { params });
export const gerarEscala = (data) => api.post('/rh/piquete/gerar', data);
export const confirmarPiquete = (pk) => api.put(`/rh/piquete/${pk}/confirmar`);
export const criarEscalaPiquete = (data) => api.post('/rh/piquete', data);
export const editarEscalaPiquete = (pk, data) => api.put(`/rh/piquete/${pk}`, data);

export const getPiqueteRegras = () => api.get('/rh/piquete/regras');
export const upsertPiqueteRegras = (data) => api.post('/rh/piquete/regras', data);

export const getOcorrencias    = (p)    => api.get(`${BASE}/piquete/ocorrencias`, { params: p });
export const criarOcorrencia   = (data) => api.post(`${BASE}/piquete/ocorrencias`, data);
export const editarOcorrencia  = (pk, d) => api.put(`${BASE}/piquete/ocorrencias/${pk}`, d);

// Geofencing — Locais
export const getLocais          = ()      => api.get(`${BASE}/locais`);
export const criarLocal         = (data)  => api.post(`${BASE}/locais`, data);
export const editarLocal        = (pk, d) => api.put(`${BASE}/locais/${pk}`, d);
export const eliminarLocal      = (pk)    => api.delete(`${BASE}/locais/${pk}`);
export const setLocalColaborador = (pk, d) => api.put(`${BASE}/colaboradores/${pk}/local`, d);

// Geofencing — Alertas
export const getPontoAlertas = (p) => api.get(`${BASE}/ponto/alertas`, { params: p });
