import api from "./api";
import { processApiResponse, processDocument } from "../pages/ModernDocuments/utils/documentUtils";

/**
 * Processa a resposta da API e extrai os documentos
 * @param {Object} response - Resposta bruta da API 
 * @returns {Array} - Array de documentos
 */
const handleResponse = (response) => {
  try {
    // Usar a nova função de processamento
    const documents = processApiResponse(response);

    // Fallback para o método anterior se não encontrar documentos
    if (documents.length === 0) {
      // Processamento original
      if (response.data.document_self) {
        return response.data.document_self.map(processDocument);
      } else if (response.data.document_owner) {
        return response.data.document_owner.map(processDocument);
      } else if (response.data.documents) {
        return response.data.documents.map(processDocument);
      }else if (response.data.documentId) {
        return response.data.document.map(processDocument);
      } else if (response.data.mensagem) {
        // console.log(response.data.mensagem);
        return [];
      } else if (Array.isArray(response.data)) {
        return response.data.map(processDocument);
      }
    }

    return documents;
  } catch (error) {
    console.error("Erro ao processar resposta:", error);
    return [];
  }
};

/**
 * Mapeia documentos com formatação de data adicional
 * @deprecated Use processApiResponse diretamente
 */
const mapDocuments = (data) => {
  if (!Array.isArray(data) || data.length === 0) {
    return [];
  }

  // Usar processDocument para cada item
  return data.map(processDocument);
};

export const getDocuments = async () => {
  try {
    const response = await api.get("/documents");
    // console.log("Todos os pedidos:", response);
    return handleResponse(response);
  } catch (error) {
    console.error("Erro ao buscar documentos:", error);
    throw error;
  }
};

export const getDocumentById = async (documentId) => {
  try {
    // console.log("Buscando pedido por ID:", documentId);
    

    const response = await api.get(`/document/${documentId}`);
    console.log("Resposta bruta por ID:", response);

    // Retorna diretamente a resposta para endpoints que já tem estrutura definida
    return response.data; // Isso preservará { document: {...} }

  } catch (error) {
    console.error("Erro ao buscar pedido por ID:", error);
    throw error;
  }
};

export const getDocumentsCreatedByMe = async () => {
  try {
    const response = await api.get("/document_owner");
    // console.log("Pedidos criados por mim:", response);
    return handleResponse(response);
  } catch (error) {
    console.error("Erro ao buscar documentos criados por mim:", error);
    throw error;
  }
};

export const getDocumentsAssignedToMe = async () => {
  try {
    const response = await api.get("/document_self");
    // console.log("Pedidos atribuídos a mim:", response);
    return handleResponse(response);
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

export const updateDocumentNotification = async (documentId) => {
  try {
    const response = await api.put(`/update_document_notification/${documentId}`);
    return response.data;
  } catch (error) {
    console.error("Erro ao atualizar notificação:", error);
    throw error;
  }
};

export const getDocumentStep = async (documentId) => {
  const response = await api.get(`/get_document_step/${documentId}`);
  // console.log(response);
  return handleResponse(response);
};

export const getDocumentAnnex = async (documentId) => {
  const response = await api.get(`/get_document_anex/${documentId}`);
  // console.log('anexos', response);
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
    // console.log(documentData)
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
    console.log('parametro', response.data);
    return response.data;
  } catch (error) {
    console.error("Erro ao buscar parâmetros do tipo de documento:", error);
    throw error;
  }
};

export const updateDocumentParams = async (documentId, paramsData) => {
  try {
    // Debug: Log what we're sending
    // console.log('Sending params to server:', paramsData);

    // Verify if paramsData is an array or has a params property
    const params = Array.isArray(paramsData) ? paramsData : paramsData.params;

    if (!Array.isArray(params)) {
      throw new Error("Params must be an array");
    }

    const response = await api.put(`/document_type_params/${documentId}`, params, {
      headers: {
        'Content-Type': 'application/json',
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error in updateDocumentParams:', error);
    throw error;
  }
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

    // Não force a conversão para int se o regnumber não for numérico
    return {
      success: true,
      message: response.data.message || 'Documento replicado com sucesso',
      newDocumentId: response.data.new_document_id, // Mantém como string se necessário
      regnumber: response.data.regnumber // Adiciona o número de registro completo
    };
  } catch (error) {
    console.error('Erro ao replicar documento:', error);
    throw new Error(error.response?.data?.error || 'Erro ao replicar documento');
  }
};

export const reopenDocument = async (regnumber, user_id) => {
  try {
    const response = await api.post('/document/reopen', {
      regnumber,
      user_id
    });
    return response.data;
  } catch (error) {
    throw new Error(`Failed to reopen document: ${error.message}`);
  }
};

/**
 * Atualizar informações de pagamento de um documento
 * @param {Object} paymentData - Dados do pagamento
 * @returns {Promise<Object>} Resultado da operação
 */
export const updateDocumentPayment = async (paymentData) => {
  try {
    if (!paymentData.regnumber) {
      throw new Error("Número do documento é obrigatório");
    }

    const response = await api.post(`/documents/${paymentData.regnumber}/payment`, paymentData);
    return response.data;
  } catch (error) {
    console.error("Erro ao atualizar pagamento do documento:", error);
    throw error;
  }
};

/**
 * Obter documento pelo número de registro
 * @param {string} regnumber - Número de registro do documento
 * @returns {Promise<Object>} Documento encontrado
 */
export const getDocumentByRegnumber = async (regnumber) => {
  try {
    const response = await api.get(`/documents/${regnumber}`);
    return response.data;
  } catch (error) {
    console.error("Erro ao buscar documento:", error);
    throw error;
  }
};