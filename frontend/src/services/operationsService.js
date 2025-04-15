import api from "./api";

export const fetchOperationsData = async () => {
  try {
    const response = await api.get("/operations");
    // console.log(response.data);
    return response.data;
  } catch (error) {
    console.error("Erro ao buscar dados de operações:", error);
    throw error;
  }
};