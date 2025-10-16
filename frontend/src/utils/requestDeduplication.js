/**
 * Request Deduplication Utility
 * ==============================
 *
 * Previne múltiplas chamadas idênticas ao backend em curto espaço de tempo.
 *
 * Problema:
 * - Quando um componente re-renders múltiplas vezes, pode fazer várias
 *   chamadas idênticas ao backend
 * - Exemplo: /api/v1/documents chamado 2x em paralelo
 *
 * Solução:
 * - Intercepta requests no axios
 * - Se já existe um request igual em andamento, reutiliza a Promise
 * - Limpa após o request completar
 */

// Mapa de requests pendentes
// Chave: "METHOD:URL"
// Valor: Promise do request
const pendingRequests = new Map();

// Tempo máximo para considerar um request como "pendente" (ms)
const DEDUP_WINDOW = 1000; // 1 segundo

/**
 * Gera chave única para um request
 */
const getRequestKey = (config) => {
    const { method, url, params } = config;
    // Incluir params na chave para diferenciar requests com query strings diferentes
    const paramsStr = params ? JSON.stringify(params) : '';
    return `${method}:${url}:${paramsStr}`;
};

/**
 * Configura interceptors no axios para deduplicate
 */
export const setupRequestDeduplication = (axiosInstance) => {
    // Request interceptor
    axiosInstance.interceptors.request.use(
        (config) => {
            const requestKey = getRequestKey(config);

            // Verificar se já existe um request idêntico em andamento
            if (pendingRequests.has(requestKey)) {
                const pendingRequest = pendingRequests.get(requestKey);

                // Retornar a Promise existente ao invés de fazer novo request
                console.log(`[Dedup] Reutilizando request: ${requestKey}`);

                // Criar um adapter que retorna a Promise pendente
                config.adapter = () => pendingRequest.promise;
            } else {
                // Novo request - criar Promise e guardar
                console.log(`[Dedup] Novo request: ${requestKey}`);

                const controller = new AbortController();

                const promise = new Promise((resolve, reject) => {
                    pendingRequests.set(requestKey, {
                        promise: null, // Será definido abaixo
                        resolve,
                        reject,
                        controller,
                        timestamp: Date.now()
                    });
                });

                // Atualizar com a promise
                const entry = pendingRequests.get(requestKey);
                entry.promise = promise;

                // Adicionar signal de abort no config
                config.signal = controller.signal;

                // Cleanup após DEDUP_WINDOW
                setTimeout(() => {
                    if (pendingRequests.has(requestKey)) {
                        const entry = pendingRequests.get(requestKey);
                        if (Date.now() - entry.timestamp > DEDUP_WINDOW) {
                            pendingRequests.delete(requestKey);
                            console.log(`[Dedup] Timeout cleanup: ${requestKey}`);
                        }
                    }
                }, DEDUP_WINDOW);
            }

            return config;
        },
        (error) => {
            return Promise.reject(error);
        }
    );

    // Response interceptor
    axiosInstance.interceptors.response.use(
        (response) => {
            const requestKey = getRequestKey(response.config);

            // Resolver a Promise pendente com a resposta
            if (pendingRequests.has(requestKey)) {
                const entry = pendingRequests.get(requestKey);
                entry.resolve(response);
                pendingRequests.delete(requestKey);
                console.log(`[Dedup] Request completo: ${requestKey}`);
            }

            return response;
        },
        (error) => {
            const requestKey = error.config ? getRequestKey(error.config) : null;

            // Rejeitar a Promise pendente com o erro
            if (requestKey && pendingRequests.has(requestKey)) {
                const entry = pendingRequests.get(requestKey);
                entry.reject(error);
                pendingRequests.delete(requestKey);
                console.log(`[Dedup] Request falhou: ${requestKey}`);
            }

            return Promise.reject(error);
        }
    );
};

/**
 * Limpa todos os requests pendentes (útil ao fazer logout)
 */
export const clearPendingRequests = () => {
    console.log(`[Dedup] Limpando ${pendingRequests.size} requests pendentes`);

    // Abortar todos os requests
    pendingRequests.forEach((entry, key) => {
        if (entry.controller) {
            entry.controller.abort();
        }
    });

    pendingRequests.clear();
};

/**
 * Obtém estatísticas de deduplication
 */
export const getDeduplicationStats = () => {
    return {
        pendingCount: pendingRequests.size,
        pendingKeys: Array.from(pendingRequests.keys())
    };
};

export default {
    setupRequestDeduplication,
    clearPendingRequests,
    getDeduplicationStats
};
