// postalCodeService.js
import axios from "axios";

const api = axios.create({
  baseURL:
    "https://www.cttcodigopostal.pt/api/v1/8a21fc4e22fc480994321a46f6bddc6b",
  headers: {
    "Content-Type": "application/json",
  },
});

export const getAddressByPostalCode = async (postalCode) => {
  try {
    const response = await api.get(`/${postalCode}`);
    if (response.data && response.data.length > 0) {
      return response.data;
    } else {
      return null; // Retorna nulo se não encontrar o endereço
    }
  } catch (error) {
    console.error("Error fetching address", error);
    throw error;
  }
};
