// /utils/errorHandler.js
import { notifyError } from "../../../components/common/Toaster/ThemedToaster";

export const handleApiError = (error, defaultMessage = "Ocorreu um erro") => {
    console.error(error);

    let errorMessage = defaultMessage;

    if (error.response) {
        // O servidor respondeu com um status diferente de 2xx
        if (error.response.data && error.response.data.error) {
            errorMessage = error.response.data.error;
        } else {
            errorMessage = `Erro ${error.response.status}: ${error.response.statusText}`;
        }
    } else if (error.request) {
        // A requisição foi feita mas não recebeu resposta
        errorMessage = "Não foi possível contactar o servidor";
    } else {
        // Algo aconteceu na configuração da requisição
        errorMessage = error.message || defaultMessage;
    }

    notifyError(errorMessage);
    return errorMessage;
};