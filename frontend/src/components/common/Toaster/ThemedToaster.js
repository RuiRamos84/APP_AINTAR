import React from "react";
import { Toaster, toast } from "sonner";
import { useTheme } from "@mui/material/styles";
import { Button, Typography, Box } from "@mui/material";

const ThemedToaster = () => {
  const theme = useTheme();

  return (
    <Toaster
      richColors
      toastOptions={{
        style: {
          background: theme.palette.background.paper,
          color: theme.palette.text.primary,
        },
        className: "class",
      }}
      // theme="system"
      dir="auto"
      position="top-center"
      reverseOrder={false}
      closeButton
      invert={true}
    />
  );
};

/**
 * Notificação com uma descrição adicional.
 * @param {string} message - Mensagem principal.
 * @param {string} description - Descrição adicional.
 */
const notifyDescription = (message, description) => {
  toast(message, {
    description: description,
    autoClose: 5000,
  });
};

/**
 * Notificação de aviso.
 * @param {string} message - Mensagem de aviso.
 */
const notifyWarning = (message) => {
  toast.warning(message, {
    autoClose: 5000,
  });
};

/**
 * Notificação informativa.
 * @param {string} message - Mensagem informativa.
 */
const notifyInfo = (message) => {
  toast.info(message, {
    autoClose: 5000,
  });
};

/**
 * Notificação de sucesso.
 * @param {string} message - Mensagem de sucesso.
 */
const notifySuccess = (message) => {
  toast.success(message, {
    autoClose: 5000,
  });
};

/**
 * Notificação de erro.
 * @param {string} message - Mensagem de erro.
 */
const notifyError = (message) => {
  toast.error(message, {
    autoClose: 5000,
  });
};

/**
 * Notificação com uma ação customizada.
 * @param {string} message - Mensagem principal.
 */
const notifyAction = (message) => {
  toast(message, {
    action: {
      label: "Action",
      onClick: () => console.log("Undo"),
    },
  });
};

/**
 * Notificação de carregamento com promessa.
 * @param {Function} promiseFn - Função assíncrona que retorna uma promessa.
 * @param {string} loadingMessage - Mensagem de carregamento.
 * @param {Function} successMessageFn - Função para gerar a mensagem de sucesso a partir dos dados de resposta.
 * @param {string} errorMessage - Mensagem de erro.
 * @returns {Promise} - Retorna a promessa original para permitir encadeamento.
 */
const notifyLoading = async (promiseFn, loadingMessage = "Loading...", successMessageFn = (data) => "Success", errorMessage = "Error") => {
  try {
    const result = await toast.promise(promiseFn(), {
      loading: loadingMessage,
      success: successMessageFn,
      error: errorMessage,
    });
    return result;
  } catch (error) {
    throw error;
  }
};


/**
 * Notificação customizada.
 * @param {function} content - Função que retorna o conteúdo customizado do toast.
 */
const notifyCustom = (content) => {
  toast.custom((t) => (
    <Box
      sx={{
        padding: 2,
        backgroundColor: 'background.paper',
        borderRadius: 1,
        boxShadow: 3,
      }}
    >
      {content(t)}
    </Box>
  ), {
    duration: 10000, // 10 segundos
  });
};

export {
  ThemedToaster,
  notifySuccess,
  notifyError,
  notifyAction,
  notifyCustom,
  notifyDescription,
  notifyWarning,
  notifyInfo,
  notifyLoading,
  toast,
};
