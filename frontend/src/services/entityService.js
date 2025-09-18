import api from "./api";

export const getEntities = async () => {
  try {
    const response = await api.get("/entities");
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getEntityByNIF = async (nipc) => {
  try {
    const response = await api.get(`/entity/nipc/${nipc}`);
    // Se a resposta for 204, response.data será undefined. Se for 200, terá dados.
    // O `|| null` garante que retornamos `null` em caso de 204.
    return response.data || null;
  } catch (error) {
    throw error;
  }
};

export const getEntity = async (id) => {
  try {
    const response = await api.get(`/entity/${id}`);
    // console.log(response)
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateEntity = async (pk, entityData) => {
  try {
    const response = await api.put(`/entity/${pk}`, entityData);
    if (response.status === 200) {
      return { success: true, data: response.data };
    } else {
      throw new Error(response.data.message || "Resposta inesperada do servidor ao atualizar");
    }
  } catch (error) {
    console.error("Erro ao atualizar entidade:", error);
    // Lança o erro para que o useMutation o capture no `onError`
    throw new Error(error.response?.data?.error || "Erro ao atualizar entidade");
  }
};

export const addEntity = async (entityData) => {
  try {
    const response = await api.post("/entity", entityData);
    if (response.status === 201) {
      return { success: true, data: response.data };
    } else {
      // Lançar um erro para que o React Query o possa capturar
      throw new Error(response.data.message || "Resposta inesperada do servidor");
    }
  } catch (error) {
    console.error("Erro ao criar entidade:", error);
    // Lançar o erro para que o useMutation o capture no `onError`
    throw new Error(error.response?.data?.error || "Erro ao criar entidade");
  }
};