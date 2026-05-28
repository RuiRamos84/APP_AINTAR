import client from './client'

export const dynamoApi = {
  list: (entity, params = {}) =>
    client.get(`/${entity}`, { params }),

  get: (entity, pk) =>
    client.get(`/${entity}/${pk}`),

  create: (entity, data) =>
    client.post(`/${entity}`, data),

  update: (entity, pk, data) =>
    client.put(`/${entity}/${pk}`, data),

  remove: (entity, pk) =>
    client.delete(`/${entity}/${pk}`),

  listRelated: (entity, pk, relation, params = {}) =>
    client.get(`/${entity}/${pk}/${relation}`, { params }),

  meta: () =>
    client.get('/meta'),

  schema: (entity) =>
    client.get(`/schema/${entity}`),

  login: (username, password) =>
    client.post('/auth/login', { username, password }),
}
