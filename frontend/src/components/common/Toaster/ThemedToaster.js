import React from "react";
import { Toaster, toast } from "sonner";
import { useTheme } from "@mui/material/styles";
import { Box } from "@mui/material";

const DEFAULT_AUTO_CLOSE = 5000;

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
      }}
      position="top-center"
      closeButton
      invert
    />
  );
};

/**
 * Notificação com uma descrição adicional.
 */
const notifyDescription = (message, description) => {
  toast(message, {
    description,
    autoClose: DEFAULT_AUTO_CLOSE,
  });
};

/**
 * Notificação de aviso.
 */
const notifyWarning = (message) => {
  toast.warning(message, {
    autoClose: DEFAULT_AUTO_CLOSE,
  });
};

/**
 * Notificação informativa.
 */
const notifyInfo = (message) => {
  toast.info(message, {
    autoClose: DEFAULT_AUTO_CLOSE,
  });
};

/**
 * Notificação de sucesso.
 */
const notifySuccess = (message) => {
  toast.success(message, {
    autoClose: DEFAULT_AUTO_CLOSE,
  });
};

/**
 * Notificação de erro.
 */
const notifyError = (message) => {
  toast.error(message, {
    autoClose: DEFAULT_AUTO_CLOSE,
  });
};

/**
 * Notificação com uma ação customizada.
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
 */
const notifyLoading = async (
  promiseFn,
  loadingMessage = "Loading...",
  successMessageFn = (data) => "Success",
  errorMessage = "Error"
) => {
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
 */
const notifyCustom = (content) => {
  toast.custom(
    (t) => (
      <Box
        sx={{
          p: 2,
          backgroundColor: "background.paper",
          borderRadius: 1,
          boxShadow: 3,
        }}
      >
        {content(t)}
      </Box>
    ),
    { duration: 10000 } // 10 segundos
  );
};

// Cria um objeto com todas as funções de notificação
const notification = {
  success: notifySuccess,
  error: notifyError,
  info: notifyInfo,
  warning: notifyWarning,
  description: notifyDescription,
  loading: notifyLoading,
  custom: notifyCustom,
  action: notifyAction,
  toast // exporta a função toast direta também
};

export {
  ThemedToaster,
  notification, // Exporta o objeto consolidado
  notifySuccess,
  notifyError,
  notifyInfo,
  notifyWarning,
  notifyDescription,
  notifyLoading,
  notifyCustom,
  notifyAction,
  toast
};
