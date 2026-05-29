import axios from 'axios'

const client = axios.create({
  baseURL: (import.meta.env.VITE_API_URL ?? 'http://localhost:8000') + '/api',
  timeout: 30000,
})

// injector de token — preenchido pelo AuthContext no login
let _token = null
export const setAuthToken  = (t) => { _token = t }
export const clearAuthToken = () => { _token = null }

client.interceptors.request.use((cfg) => {
  if (_token) cfg.headers.Authorization = `Bearer ${_token}`
  return cfg
})

// unwrap automático — todas as chamadas devolvem response.data directamente
client.interceptors.response.use(
  (res) => res.data,
  (err) => Promise.reject(err),
)

export default client
