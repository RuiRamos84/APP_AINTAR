import api from '@/services/api/client';

export const getEquipamentos = async () => {
  const res = await api.get('/equipamento_list');
  return res;
};

export const getEquipamentosByInstalacao = async (tbInstalacao) => {
  const res = await api.get(`/equipamento_list/${tbInstalacao}`);
  return res;
};

export const createEquipamento = async (formData) => {
  const res = await api.post('/equipamento_create', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res;
};

export const updateEquipamento = async (pk, formData) => {
  const res = await api.put(`/equipamento_update/${pk}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res;
};

export const deleteEquipamento = async (pk) => {
  const res = await api.delete(`/equipamento_delete/${pk}`);
  return res;
};
