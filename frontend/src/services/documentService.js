import api from "./api";

const handleResponse = (response) => {
  if (response.data.document_self) {
    return response.data.document_self;
  } else if (response.data.document_owner) {
    return response.data.document_owner;
  } else if (response.data.documents) {
    return response.data.documents;
  } else if (response.data.mensagem) {
    // Se há uma mensagem, provavelmente não há documentos
    console.log(response.data.mensagem);
    return [];
  } else if (Array.isArray(response.data)) {
    return response.data;
  } else {
    return [];
  }
};

const mapDocuments = (data) => {
  if (!Array.isArray(data) || data.length === 0) {
    return [];
  }
  return data.map((doc) => ({
    ...doc,
    submissionDate: doc.submission
      ? new Date(doc.submission).toLocaleDateString()
      : "",
  }));
};

export const getDocuments = async () => {
  try {
    const response = await api.get("/documents");
    // console.log(response)
    return mapDocuments(handleResponse(response));
  } catch (error) {
    console.error("Erro ao buscar documentos:", error);
    throw error;
  }
};

export const getDocumentsCreatedByMe = async () => {
  try {
    const response = await api.get("/document_owner");
    // console.log(response);
    return mapDocuments(handleResponse(response));
  } catch (error) {
    console.error("Erro ao buscar documentos criados por mim:", error);
    throw error;
  }
};

export const getDocumentsAssignedToMe = async () => {
  try {
    const response = await api.get("/document_self");
    // console.log(response);
    return mapDocuments(handleResponse(response));
  } catch (error) {
    console.error("Erro ao buscar documentos atribuídos a mim:", error);
    throw error;
  }
};

export const checkVacationStatus = async (userPk) => {
  const response = await api.get(`/check_vacation_status/${userPk}`);
  if (!response) {
    throw new Error("Erro ao verificar o status de férias");
  }
  return response.data.vacation;
};

export const getDocumentStep = async (documentId) => {
  const response = await api.get(`/get_document_step/${documentId}`);
  return handleResponse(response);
};

export const getDocumentAnnex = async (documentId) => {
  const response = await api.get(`/get_document_anex/${documentId}`);
  return handleResponse(response);
};

export const addDocumentStep = async (documentId, stepData) => {
  const formData = new FormData();
  Object.keys(stepData).forEach((key) => formData.append(key, stepData[key]));
  const response = await api.post(
    `/add_document_step/${documentId}`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return handleResponse(response);
};

export const addDocumentAnnex = async (formData) => {
  const response = await api.post(`/add_document_annex`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return handleResponse(response);
};

export const createDocument = async (documentData) => {
  try {
    console.log(documentData)
    const response = await api.post("/create_document", documentData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getDocumentTypeParams = async (typeId) => {
  try {
    const response = await api.get(`/document_type_params/${typeId}`);
    return response.data;
  } catch (error) {
    console.error("Erro ao buscar parâmetros do tipo de documento:", error);
    throw error;
  }
};

export const updateDocumentParams = async (documentId, params) => {
  const response = await api.put(`/document_type_params/${documentId}`, { params });
  return response.data; // Atualiza os parâmetros
};

export const getEntityCountTypes = async (entityPk) => {
  try {
    const response = await api.get(`/entity_count_types/${entityPk}`);
    const data = response.data[0]; // Acessando a primeira posição do array

    if (data && data.count_types) {
      return data.count_types; // Retorna a lista de tipos de pedidos
    } else {
      console.error("Nenhum tipo de pedido encontrado.");
      return [];
    }
  } catch (error) {
    console.error("Erro ao buscar tipos de pedidos:", error);
    throw error;
  }
};

export const downloadComprovativo = async (documentId) => {
  try {
    const response = await api.get(`/extrair_comprovativo/${documentId}`, {
      responseType: "arraybuffer",
      headers: {
        Accept: "application/pdf",
      },
    });
    return response.data;
  } catch (error) {
    console.error("Erro ao baixar o comprovativo:", error);
    throw error;
  }
};

export const getDocumentRamais = async () => {
  try {
    const response = await api.get("/document_ramais");
    // console.log(response.data);
    return response.data.ramais
  } catch (error) {
    console.error("Erro ao buscar ramais:", error);
    throw error;
  }
};

export const updateDocumentPavenext = async (pk) => {
  try {
    const response = await api.put(`/document_pavenext/${pk}`);
    return response.data;
  } catch (error) {
    console.error("Erro ao atualizar estado do documento:", error);
    throw error;
  }
};

export const getDocumentRamaisConcluded = async () => {
  try {
    const response = await api.get("/document_ramais_concluded");
    // console.log(response.data);
    return response.data.ramais;
  } catch (error) {
    console.error("Erro ao buscar ramais concluídos:", error);
    throw error;
  }
};

export const replicateDocument = async (documentId, newType) => {
  try {
    const response = await api.post(`/document/replicate/${documentId}`, {
      new_type: newType
    });

    if (response.data.error) {
      throw new Error(response.data.error);
    }

    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Erro ao replicar documento');
  }
};