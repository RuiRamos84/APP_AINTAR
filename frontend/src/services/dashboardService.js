import api from "./api";

export const fetchDashboardData = async () => {
  try {
    const response = await api.get("/dashboard");
    // console.log(response.data)
    return response.data;
  } catch (error) {
    console.error("Erro ao buscar dados do dashboard:", error);
    throw error;
  }
};
