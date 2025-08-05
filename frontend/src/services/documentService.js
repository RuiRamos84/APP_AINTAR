import api from "./api";
import { processApiResponse, processDocument } from "../pages/ModernDocuments/utils/documentUtils";

/**
 * Processa a resposta da API e extrai os documentos
 * @param {Object} response - Resposta bruta da API 
 * @returns {Array} - Array de documentos
 */
const handleResponse = (response) => {
  try {
    // Verificar primeiro se é uma resposta direta
    if (response.data.document) {
      return [processDocument(response.data.document)];
    }

    // Depois verificar arrays conhecidos
    if (response.data.document_self) {
      return response.data.document_self.map(processDocument);
    } else if (response.data.document_owner) {
      return response.data.document_owner.map(processDocument);
    } else if (response.data.documents) {
      return response.data.documents.map(processDocument);
    } else if (Array.isArray(response.data)) {
      return response.data.map(processDocument);
    }

    // Caso seja apenas uma mensagem ou objeto vazio
    return [];
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

// Corrigir o serviço para usar o formato correto
export const getDocumentById = async (documentId) => {
  try {
    const response = await api.get(`/document/${documentId}`);
    return response.data;
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

export const getDocumentTypeParams = async (documentId) => {
  try {
    const response = await api.get(`/document/${documentId}/params`);
    return response.data;
  } catch (error) {
    console.error("Erro ao buscar parâmetros:", error);
    throw error;
  }
};

export const updateDocumentParams = async (documentId, paramsData) => {
  try {
    const params = Array.isArray(paramsData) ? paramsData : paramsData.params;
    const response = await api.put(`/document/${documentId}/params`, params);
    return response.data;
  } catch (error) {
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

// ===== SERVIÇOS DOS RAMAIS =====

/**
 * Obter ramais para pavimentar (vbr_document_pav01)
 */
export const getDocumentRamais = async () => {
  const response = await api.get("/document_ramais");
  console.log("Ramais para pavimentar:", response.data);
  return response.data.ramais;
};

/**
 * Obter ramais executados mas não pagos (vbr_document_pav02)
 */
export const getDocumentRamaisExecuted = async () => {
  try {
    const response = await api.get("/document_ramais_executed");
    console.log("Ramais executados:", response.data);
    return response.data.ramais;
  } catch (error) {
    console.error("Erro ao buscar ramais executados:", error);
    throw error;
  }
};

/**
 * Obter ramais concluídos e pagos (vbr_document_pav03)
 */
export const getDocumentRamaisConcluded = async () => {
  try {
    const response = await api.get("/document_ramais_concluded");
    console.log("Ramais concluídos:", response.data);
    return response.data.ramais;
  } catch (error) {
    console.error("Erro ao buscar ramais concluídos:", error);
    throw error;
  }
};

/**
 * Marcar ramal como executado (para pavimentar -> executado)
 */
export const updateDocumentPavenext = async (pk) => {
  try {
    const response = await api.put(`/document_pavenext/${pk}`);
    console.log("Ramal marcado como executado:", response.data);
    return response.data;
  } catch (error) {
    console.error("Erro ao marcar ramal como executado:", error);
    throw error;
  }
};

/**
 * Marcar ramal como pago (executado -> concluído)
 */
export const updateDocumentPavpaid = async (pk) => {
  try {
    const response = await api.put(`/document_pavpaid/${pk}`);
    console.log("Ramal marcado como pago:", response.data);
    return response.data;
  } catch (error) {
    console.error("Erro ao marcar ramal como pago:", error);
    throw error;
  }
};

// ===== OUTROS SERVIÇOS =====

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

/**
 * Obter dados da fatura/pagamento para um documento específico
 * @param {number|string} documentId - ID do documento
 * @returns {Promise<Object>} Detalhes da fatura
 */
export const getInvoiceData = async (documentId) => {
  try {
    // Tentar primeiro o endpoint específico para fatura
    const response = await api.get(`/document/${documentId}/invoice`);
    return response.data;
  } catch (error) {
    console.error('Erro ao obter dados da fatura via endpoint específico:', error);

    // Tentar alternativa 1: endpoint document_invoice
    try {
      const invoiceResponse = await api.get(`/document_invoice/${documentId}`);
      return invoiceResponse.data;
    } catch (invoiceError) {
      console.error('Erro ao obter dados via document_invoice:', invoiceError);

      // Tentar alternativa 2: dados do documento completo
      try {
        const docResponse = await api.get(`/document/${documentId}`);

        // Verificar se tem invoice como propriedade
        if (docResponse.data && docResponse.data.invoice) {
          return docResponse.data.invoice;
        }

        // Verificar estrutura alternativa com tb_document_invoice
        if (docResponse.data && docResponse.data.tb_document_invoice) {
          return docResponse.data.tb_document_invoice;
        }

        // Se não tiver invoice, mas tiver amount diretamente no documento
        if (docResponse.data && (docResponse.data.amount || docResponse.data.value)) {
          return {
            amount: docResponse.data.amount || docResponse.data.value,
            status: 'PENDING'
          };
        }

        // Se nenhuma das opções funcionou, retornar null
        return null;
      } catch (docError) {
        console.error('Erro ao tentar obter documento completo:', docError);

        // Se todas as tentativas falharem, lançar o erro original
        throw error;
      }
    }
  }
};

export const getDocumentsLate = async () => {
  try {
    const response = await api.get("/documents/late");
    // console.log("Documentos em atraso:", response);
    return response.data.late_documents;
  } catch (error) {
    console.error("Erro ao buscar documentos em atraso:", error);
    throw error;
  }
};

export const downloadFile = async (regnumber, filename, displayName = null) => {
  const response = await api.get(`/files/${regnumber}/${filename}`, {
    responseType: 'blob',
    headers: { 'Accept': '*/*' }
  });

  const blob = response.data;
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = displayName || filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export const previewFile = async (regnumber, filename) => {
  const url = `/files/${regnumber}/${filename}?v=${Date.now()}`;
  console.log('📡 API call URL:', url);

  try {
    const response = await api.get(url, {
      responseType: 'blob',
      headers: { 'Accept': '*/*' }
    });

    console.log('✅ Response status:', response.status);
    const blob = response.data;
    return {
      url: window.URL.createObjectURL(blob),
      type: blob.type,
      size: blob.size
    };
  } catch (error) {
    console.error('❌ API Error:', error.response?.status, error.response?.data);
    throw error;
  }
};

export const getDocumentWorkflow = async (doctypeId) => {
  try {
    const response = await api.get(`/step_hierarchy/${doctypeId}`);
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar workflow:', error);
    throw error;
  }
};