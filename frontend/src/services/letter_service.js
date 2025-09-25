import api from "./api";

export const getLetters = async () => {
  try {
    const response = await api.get("/letters");
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const createLetter = async (letterData) => {
  try {
    const response = await api.post("/letters", letterData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateLetter = async (letterId, letterData) => {
  try {
    const response = await api.put(`/letters/${letterId}`, letterData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const deleteLetter = async (letterId) => {
  try {
    const response = await api.delete(`/letters/${letterId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const generateLetter = async (letterId, documentData) => {
  try {
    const response = await api.post(
      `/letters/${letterId}/generate`,
      documentData,
      {
        responseType: 'blob',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Erro ao gerar ofício:', error);
    throw error;
  }
};

export const generateFreeLetter = async (documentData) => {
  try {
    const response = await api.post(
      '/letters/generate-free',
      documentData,
      {
        responseType: 'blob',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Erro ao gerar ofício livre:', error);
    throw error;
  }
};


export const listLetterStores = async () => {
  try {
    console.log("Requesting letterstores");
    const response = await api.get("/letterstores");
    console.log("Letterstores response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching letterstores:", error);
    throw error;
  }
};

export const viewLetter = async (letterstoreId) => {
  try {
    const response = await api.get(`/letters/view/${letterstoreId}`, {
      responseType: "blob",
      headers: {
        Accept: "application/pdf",
      },
    });

    // Verificar se a resposta é um PDF
    if (response.headers["content-type"].includes("application/pdf")) {
      // Criar URL do blob
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);

      // Abrir em nova janela
      const newWindow = window.open(url, "_blank");

      // Se o navegador bloqueou o popup, tentar abrir na mesma janela
      if (!newWindow) {
        window.location.href = url;
      }

      // Limpar a URL após um tempo
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 100);
    } else {
      throw new Error("Formato de arquivo inválido");
    }
  } catch (error) {
    console.error("Erro ao visualizar ofício:", error);
    throw error;
  }
};

export const downloadLetter = async (letterstoreId) => {
  try {
    // Verificar se document está disponível
    if (typeof document === 'undefined' || !document.createElement || !document.body) {
      throw new Error("document.createElement não está disponível para download");
    }

    const response = await api.get(`/letters/download/${letterstoreId}`, {
      responseType: "blob",
      headers: {
        Accept: "application/pdf",
      },
    });

    // Verificar se a resposta é um PDF
    if (response.headers["content-type"].includes("application/pdf")) {
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `oficio_${letterstoreId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Limpar a URL
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 100);
    } else {
      throw new Error("Formato de arquivo inválido");
    }
  } catch (error) {
    console.error("Erro ao fazer download do ofício:", error);
    throw error;
  }
};