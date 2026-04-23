import api from '@/services/api/client';

const BASE = '/cms';

// ─── Metadados ────────────────────────────────────────────────────────────────

export const getMetadados = () => api.get(`${BASE}/metadados`);

// ─── Notícias ─────────────────────────────────────────────────────────────────

export const getNoticias     = ()       => api.get(`${BASE}/noticias`);
export const getNoticia      = (pk)     => api.get(`${BASE}/noticias/${pk}`);
export const saveNoticia     = (data)   => data.pk
  ? api.put(`${BASE}/noticias/${data.pk}`, data)
  : api.post(`${BASE}/noticias`, data);
export const deleteNoticia   = (pk)     => api.delete(`${BASE}/noticias/${pk}`);
export const uploadNoticiaImagem = (pk, file) => {
  const fd = new FormData();
  fd.append('file', file);
  return api.post(`${BASE}/noticias/${pk}/imagem`, fd, { headers: { 'Content-Type': undefined } });
};

// ─── Galeria de imagens ───────────────────────────────────────────────────────

export const getNoticiasImagens = (pk) =>
  api.get(`${BASE}/noticias/${pk}/imagens`);

export const uploadNoticiasImagens = (pk, files) => {
  const fd = new FormData();
  files.forEach(f => fd.append('files[]', f));
  return api.post(`${BASE}/noticias/${pk}/imagens`, fd, { headers: { 'Content-Type': undefined } });
};

export const reorderNoticiasImagens = (pk, ordemList) =>
  api.patch(`${BASE}/noticias/${pk}/imagens/ordem`, ordemList);

export const updateNoticiasImagemLegenda = (pk, imgPk, legenda) =>
  api.patch(`${BASE}/noticias/${pk}/imagens/${imgPk}`, { legenda });

export const deleteNoticiasImagem = (pk, imgPk) =>
  api.delete(`${BASE}/noticias/${pk}/imagens/${imgPk}`);

// ─── Alertas ──────────────────────────────────────────────────────────────────

export const getAlertas    = ()     => api.get(`${BASE}/alertas`);
export const saveAlerta    = (data) => data.pk
  ? api.put(`${BASE}/alertas/${data.pk}`, data)
  : api.post(`${BASE}/alertas`, data);
export const deleteAlerta  = (pk)   => api.delete(`${BASE}/alertas/${pk}`);

// ─── Documentos ───────────────────────────────────────────────────────────────

export const getDocumentos  = ()       => api.get(`${BASE}/documentos`);
export const saveDocumento  = (data)   => data.pk
  ? api.put(`${BASE}/documentos/${data.pk}`, data)
  : api.post(`${BASE}/documentos`, data);
export const deleteDocumento = (pk)    => api.delete(`${BASE}/documentos/${pk}`);
export const uploadDocumentoFile = (pk, file) => {
  const fd = new FormData();
  fd.append('file', file);
  return api.post(`${BASE}/documentos/${pk}/ficheiro`, fd, { headers: { 'Content-Type': undefined } });
};

// ─── Publicações ──────────────────────────────────────────────────────────────

export const getPublicacoes   = ()     => api.get(`${BASE}/publicacoes`);
export const savePublicacao   = (data) => data.pk
  ? api.put(`${BASE}/publicacoes/${data.pk}`, data)
  : api.post(`${BASE}/publicacoes`, data);
export const deletePublicacao = (pk)   => api.delete(`${BASE}/publicacoes/${pk}`);
export const uploadPublicacaoFile = (pk, file) => {
  const fd = new FormData();
  fd.append('file', file);
  return api.post(`${BASE}/publicacoes/${pk}/ficheiro`, fd, { headers: { 'Content-Type': undefined } });
};

// ─── Procedimentos RH ─────────────────────────────────────────────────────────

export const getProcedimentos          = ()             => api.get(`${BASE}/procedimentos`);
export const toggleProcedimentoVisivel = (pk, visivel) => api.patch(`${BASE}/procedimentos/${pk}/visivel`, { visivel });
export const getProcedimento      = (pk)   => api.get(`${BASE}/procedimentos/${pk}`);
export const saveProcedimento     = (data) => data.pk
  ? api.put(`${BASE}/procedimentos/${data.pk}`, data)
  : api.post(`${BASE}/procedimentos`, data);
export const saveProcedimentoFase = (data) => data.pk
  ? api.put(`${BASE}/procedimentos/fases/${data.pk}`, data)
  : api.post(`${BASE}/procedimentos/fases`, data);
export const deleteProcedimentoFase = (pk)  => api.delete(`${BASE}/procedimentos/fases/${pk}`);
export const uploadFaseFile = (pk, file) => {
  const fd = new FormData();
  fd.append('file', file);
  return api.post(`${BASE}/procedimentos/fases/${pk}/ficheiro`, fd, { headers: { 'Content-Type': undefined } });
};
export const uploadProcedimentoImagem = (pk, file) => {
  const fd = new FormData();
  fd.append('file', file);
  return api.post(`${BASE}/procedimentos/${pk}/imagem`, fd, { headers: { 'Content-Type': undefined } });
};
export const getProcedimentoDocs      = (pk)                        => api.get(`${BASE}/procedimentos/${pk}/documentos`);
export const getProcedimentoCandidatos = (pk)                       => api.get(`${BASE}/procedimentos/${pk}/candidatos`);
export const deleteProcedimentoDoc    = (docPk)                     => api.delete(`${BASE}/procedimentos/documentos/${docPk}`);
export const uploadProcedimentoDoc    = (pk, categoria, titulo, file) => {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('categoria', categoria);
  if (titulo) fd.append('titulo', titulo);
  return api.post(`${BASE}/procedimentos/${pk}/documentos`, fd, { headers: { 'Content-Type': undefined } });
};

// ─── Processos Financeiros ────────────────────────────────────────────────────

export const getProcessos       = ()     => api.get(`${BASE}/processos-financeiros`);
export const getProcesso        = (pk)   => api.get(`${BASE}/processos-financeiros/${pk}`);
export const saveProcesso       = (data) => data.pk
  ? api.put(`${BASE}/processos-financeiros/${data.pk}`, data)
  : api.post(`${BASE}/processos-financeiros`, data);
export const saveProcessoDoc    = (data) => data.pk
  ? api.put(`${BASE}/processos-financeiros/documentos/${data.pk}`, data)
  : api.post(`${BASE}/processos-financeiros/documentos`, data);
export const deleteProcessoDoc  = (pk)   => api.delete(`${BASE}/processos-financeiros/documentos/${pk}`);
export const uploadProcessoDocFile = (pk, file) => {
  const fd = new FormData();
  fd.append('file', file);
  return api.post(`${BASE}/processos-financeiros/documentos/${pk}/ficheiro`, fd, { headers: { 'Content-Type': undefined } });
};
