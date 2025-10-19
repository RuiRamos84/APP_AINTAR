/**
 * HELPER DE ESTILOS PARA DARK MODE
 * Elimina duplicação de código e centraliza a lógica de tema
 */

/**
 * Retorna estilos para TextField com suporte a dark mode
 */
export const getTextFieldStyles = (isDarkMode) => ({
  '& .MuiInputBase-input': {
    color: isDarkMode ? 'rgba(255, 255, 255, 0.9)' : undefined
  },
  '& .MuiInputLabel-root': {
    color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : undefined
  },
  '& .MuiFilledInput-root': {
    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : undefined
  },
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : undefined
  },
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.4)' : undefined
  },
  '& .Mui-disabled .MuiOutlinedInput-notchedOutline': {
    borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : undefined
  },
  '& .Mui-disabled': {
    color: isDarkMode ? 'rgba(255, 255, 255, 0.5)' : undefined
  }
});

/**
 * Retorna estilos para Select/FormControl com suporte a dark mode
 */
export const getSelectStyles = (isDarkMode) => ({
  '& .MuiInputLabel-root': {
    color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : undefined
  },
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : undefined
  },
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.4)' : undefined
  },
  '& .MuiSelect-select': {
    color: isDarkMode ? 'rgba(255, 255, 255, 0.9)' : undefined
  },
  '& .MuiSvgIcon-root': {
    color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : undefined
  }
});

/**
 * Retorna estilos para MenuItem com suporte a dark mode
 */
export const getMenuItemStyles = (isDarkMode) => ({
  color: isDarkMode ? 'rgba(255, 255, 255, 0.9)' : undefined
});

/**
 * Retorna estilos para Chip com suporte a dark mode
 */
export const getChipStyles = (isDarkMode) => ({
  bgcolor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : undefined,
  color: isDarkMode ? 'white' : undefined,
  borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : undefined
});

/**
 * Retorna estilos para Divider com suporte a dark mode
 */
export const getDividerStyles = (isDarkMode) => ({
  borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : undefined
});

/**
 * Retorna estilos para Button (outlined) com suporte a dark mode
 */
export const getButtonOutlinedStyles = (isDarkMode) => ({
  borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.5)' : undefined,
  color: isDarkMode ? 'white' : undefined,
  '&:hover': {
    borderColor: isDarkMode ? 'white' : undefined,
    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : undefined
  }
});

/**
 * Retorna estilos para Button error (outlined) com suporte a dark mode
 */
export const getButtonErrorOutlinedStyles = (isDarkMode) => ({
  borderColor: isDarkMode ? 'rgba(255, 99, 99, 0.5)' : undefined,
  color: isDarkMode ? 'rgba(255, 99, 99, 1)' : undefined,
  '&:hover': {
    borderColor: isDarkMode ? 'rgba(255, 99, 99, 0.8)' : undefined,
    backgroundColor: isDarkMode ? 'rgba(255, 99, 99, 0.08)' : undefined
  }
});

/**
 * Retorna estilos para Paper com suporte a dark mode
 */
export const getPaperStyles = (isDarkMode, theme) => ({
  bgcolor: isDarkMode ? theme.palette.background.paper : undefined,
  boxShadow: isDarkMode ? '0 2px 4px rgba(0, 0, 0, 0.3)' : undefined
});

/**
 * Retorna estilos para Timeline com suporte a dark mode
 */
export const getTimelineConnectorStyles = (isDarkMode) => ({
  bgcolor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : undefined
});

/**
 * Retorna estilos de scrollbar customizada
 */
export const getScrollbarStyles = (isDarkMode) => ({
  '&::-webkit-scrollbar': {
    width: '8px'
  },
  '&::-webkit-scrollbar-track': {
    backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.2)' : '#f1f1f1'
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : '#888',
    borderRadius: '4px'
  },
  '&::-webkit-scrollbar-thumb:hover': {
    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.3)' : '#555'
  }
});

/**
 * Retorna estilos para Typography com suporte a dark mode
 */
export const getTypographyStyles = (isDarkMode) => ({
  color: isDarkMode ? 'white' : undefined
});

/**
 * Retorna estilos para Typography (secondary text) com suporte a dark mode
 */
export const getTypographySecondaryStyles = (isDarkMode) => ({
  color: isDarkMode ? 'rgba(255, 255, 255, 0.6)' : 'text.secondary'
});

/**
 * Retorna estilos para Tabs com suporte a dark mode
 */
export const getTabsStyles = (isDarkMode) => ({
  '& .MuiTab-root': {
    color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : undefined
  },
  '& .Mui-selected': {
    color: isDarkMode ? 'white !important' : undefined
  },
  '& .MuiTabs-indicator': {
    backgroundColor: isDarkMode ? 'white' : undefined
  }
});

/**
 * Retorna estilos para box de header com border
 */
export const getHeaderBoxStyles = (isDarkMode, theme) => ({
  p: 2,
  bgcolor: isDarkMode ? theme.palette.background.paper : 'background.paper',
  borderBottom: 1,
  borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'divider'
});

/**
 * Retorna estilos para content box com scrollbar
 */
export const getContentBoxStyles = (isDarkMode, theme) => ({
  flexGrow: 1,
  overflow: 'auto',
  display: 'flex',
  flexDirection: 'column',
  bgcolor: isDarkMode ? theme.palette.background.paper : undefined,
  ...getScrollbarStyles(isDarkMode)
});
