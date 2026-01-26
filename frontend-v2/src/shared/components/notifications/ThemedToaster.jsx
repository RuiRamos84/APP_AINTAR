/**
 * ThemedToaster Component
 * Componente Sonner Toaster adaptado ao tema MUI
 */

import { Toaster } from 'sonner';
import { useTheme } from '@mui/material/styles';

export const ThemedToaster = () => {
  const theme = useTheme();

  return (
    <Toaster
      richColors
      toastOptions={{
        style: {
          background: theme.palette.background.paper,
          color: theme.palette.text.primary,
          border: `1px solid ${theme.palette.divider}`,
        },
      }}
      position="top-right"
      closeButton
      expand={false}
      visibleToasts={5}
    />
  );
};

export default ThemedToaster;
