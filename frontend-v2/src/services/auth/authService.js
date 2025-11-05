/**
 * Authentication Service
 * Serviço para gestão de autenticação de utilizadores
 */

import apiClient from '@/services/api/client';

/**
 * Realiza login do utilizador
 * @param {Object} credentials - Credenciais do utilizador
 * @param {string} credentials.email - Email do utilizador
 * @param {string} credentials.password - Password do utilizador
 * @returns {Promise<Object>} Dados do utilizador e token
 */
export const login = async ({ email, password }) => {
  const response = await apiClient.post('/auth/login', {
    email,
    password,
  });

  return response.data;
};

/**
 * Realiza registo de novo utilizador
 * @param {Object} userData - Dados do novo utilizador
 * @param {string} userData.name - Nome do utilizador
 * @param {string} userData.email - Email do utilizador
 * @param {string} userData.password - Password do utilizador
 * @returns {Promise<Object>} Dados do utilizador criado
 */
export const register = async ({ name, email, password }) => {
  const response = await apiClient.post('/auth/register', {
    name,
    email,
    password,
  });

  return response.data;
};

/**
 * Realiza logout do utilizador
 * @returns {Promise<void>}
 */
export const logout = async () => {
  try {
    await apiClient.post('/auth/logout');
  } catch (error) {
    // Mesmo que falhe no servidor, fazemos logout no cliente
    console.error('Erro ao fazer logout no servidor:', error);
  }
};

/**
 * Obtém os dados do utilizador atual
 * @returns {Promise<Object>} Dados do utilizador
 */
export const getCurrentUser = async () => {
  const response = await apiClient.get('/auth/me');
  return response.data;
};

/**
 * Refresh do token de autenticação
 * @returns {Promise<Object>} Novo token
 */
export const refreshToken = async () => {
  const response = await apiClient.post('/auth/refresh');
  return response.data;
};

/**
 * Verifica se o utilizador está autenticado
 * @returns {boolean}
 */
export const isAuthenticated = () => {
  const token = localStorage.getItem('auth_token');
  return !!token;
};

/**
 * Guarda o token de autenticação
 * @param {string} token - Token de autenticação
 */
export const setAuthToken = (token) => {
  localStorage.setItem('auth_token', token);
};

/**
 * Remove o token de autenticação
 */
export const removeAuthToken = () => {
  localStorage.removeItem('auth_token');
};

/**
 * Obtém o token de autenticação
 * @returns {string|null}
 */
export const getAuthToken = () => {
  return localStorage.getItem('auth_token');
};

export default {
  login,
  register,
  logout,
  getCurrentUser,
  refreshToken,
  isAuthenticated,
  setAuthToken,
  removeAuthToken,
  getAuthToken,
};
