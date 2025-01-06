import api from "./api";

let isCreatingEntity = false;
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
    return response.data || null;
  } catch (error) {
    if (error.response && error.response.status === 204) {
      return null;
    }
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

export const updateEntity = async (entity) => {
  try {
    await api.put(`/entity/${entity.pk}`, entity);
  } catch (error) {
    throw error;
  }
};


let lastCreatedEntity = null;
let lastCreationTime = 0;

export const addEntity = async (entityData) => {
  const now = Date.now();
  if (isCreatingEntity) {
    console.warn("Uma criação de entidade já está em andamento.");
    return { error: "Uma criação de entidade já está em andamento." };
  }

  // Verifica se a mesma entidade foi criada nos últimos 5 segundos
  if (
    lastCreatedEntity &&
    JSON.stringify(lastCreatedEntity) === JSON.stringify(entityData) &&
    now - lastCreationTime < 5000
  ) {
    console.warn(
      "Tentativa de criar a mesma entidade em um curto período de tempo."
    );
    return { error: "Entidade já foi criada recentemente." };
  }

  isCreatingEntity = true;
  // console.log("Iniciando criação de entidade com dados:", entityData);

  try {
    const response = await api.post("/entity", entityData);
    // console.log("Resposta da API:", response);

    if (response.status === 201) {
      // console.log("Entidade criada com sucesso:", response.data);
      lastCreatedEntity = entityData;
      lastCreationTime = now;
      return { success: true, data: response.data };
    } else {
      console.warn("Resposta inesperada da API:", response);
      return { error: "Resposta inesperada do servidor" };
    }
  } catch (error) {
    console.error("Erro ao criar entidade:", error);
    return { error: error.response?.data?.message || "Erro ao criar entidade" };
  } finally {
    isCreatingEntity = false;
  }
};