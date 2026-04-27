import api from '@/services/api/client';

const BASE = '/rh';

export const getLookups       = ()      => api.get(`${BASE}/lookups`);
export const getColaboradores     = ()  => api.get(`${BASE}/colaboradores`);
export const getColaboradoresLista = () => api.get(`${BASE}/colaboradores/lista`);
export const getSaldoFerias   = (pk)    => api.get(`${BASE}/colaboradores/${pk}/saldo`);

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
export const getPiquete        = (p)    => api.get(`${BASE}/piquete`, { params: p });
export const gerarEscala       = (data) => api.post(`${BASE}/piquete/gerar`, data);
export const confirmarPiquete  = (pk)   => api.put(`${BASE}/piquete/${pk}/confirmar`, {});
export const getOcorrencias    = (p)    => api.get(`${BASE}/piquete/ocorrencias`, { params: p });
export const criarOcorrencia   = (data) => api.post(`${BASE}/piquete/ocorrencias`, data);
export const editarOcorrencia  = (pk, d) => api.put(`${BASE}/piquete/ocorrencias/${pk}`, d);
