const API = import.meta.env.VITE_API_URL || 'https://app.aintar.pt/api/v1'

async function get(path) {
  const res = await fetch(`${API}/website${path}`)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export const getOrgaosSociais      = ()          => get('/orgaos-sociais')
export const getAlertas            = ()          => get('/alertas')
export const getNoticias           = (params = {}) => {
  const qs = new URLSearchParams(params).toString()
  return get(`/noticias${qs ? `?${qs}` : ''}`)
}
export const getNoticia            = (pk)        => get(`/noticias/${pk}`)
export const getDocumentos         = (categoria) => get(`/documentos${categoria ? `?categoria=${categoria}` : ''}`)
export const getPublicacoes        = (tipo)      => get(`/publicacoes${tipo ? `?tipo=${tipo}` : ''}`)
export const getProcedimentos      = ()          => get('/procedimentos')
export const getProcedimento       = (pk)        => get(`/procedimentos/${pk}`)
export const getProcessosFinanceiros = ()        => get('/processos-financeiros')

export const sendContacto = (data) =>
  fetch(`${API}/website/contacto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(r => { if (!r.ok) throw new Error(); return r.json() })

export const getConcursalProcedimentos  = ()     => get('/concursal/procedimentos')
export const getConcursalForSiteProc    = (pk)   => get(`/concursal/for-site-proc/${pk}`)
export const getConcursalReferencias    = ()     => get('/concursal/referencias')
export const submitConcursalCandidatura = (data) =>
  fetch(`${API}/website/concursal/candidatura`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(async r => {
    const json = await r.json()
    if (!r.ok) throw new Error(json.erro || json.message || 'Erro ao submeter candidatura')
    return json
  })

export function fileUrl(path) {
  if (!path) return null
  if (path.startsWith('http') || path.startsWith('/api')) return path
  return `${API}/website/files/${path}`
}

export function procDocUrl(path) {
  if (!path) return null
  if (path.startsWith('http') || path.startsWith('/api')) return path
  return `${API}/website/procedimento-doc/${path}`
}
