import { createTheme, alpha } from "@mui/material/styles";
import { applyResponsiveTypography } from "../theme/responsiveTypography";

// Configurações comuns para ambos os temas
const commonComponents = {
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: 6,
        textTransform: "none",
        fontSize: "0.9rem",
        boxShadow: "none",
      },
      contained: {
        boxShadow: "0 1px 3px 0 rgba(0,0,0,0.1)",
        "&:hover": {
          boxShadow: "0 2px 6px 0 rgba(0,0,0,0.1)",
        },
      },
      outlined: {
        borderWidth: 1.5,
      },
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: {
        backgroundImage: "none",
      },
    },
  },
  MuiTableCell: {
    styleOverrides: {
      head: {
        fontWeight: 600,
      },
    },
  },
  MuiChip: {
    styleOverrides: {
      root: {
        borderRadius: 6,
        fontWeight: 500,
      },
      filled: {
        boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)",
      },
      deleteIcon: {
        color: "inherit",
        opacity: 0.7,
      },
    },
  },
  MuiToggleButton: {
    styleOverrides: {
      root: {
        textTransform: "none",
        fontWeight: 500,
      },
    },
  },
  MuiOutlinedInput: {
    styleOverrides: {
      root: {
        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
          borderWidth: 2,
        },
      },
    },
  },
  MuiFormLabel: {
    styleOverrides: {
      root: {
        "&.Mui-focused": {
          fontWeight: 600,
        },
      },
    },
  },
  MuiListItem: {
    styleOverrides: {
      root: {
        borderRadius: 6,
      },
    },
  },
  MuiMenuItem: {
    styleOverrides: {
      root: {
        borderRadius: 4,
        "&.Mui-selected": {
          fontWeight: 500,
        },
      },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: 8,
        overflow: "hidden",
        transition: "box-shadow 0.2s ease-in-out, transform 0.2s ease-in-out",
      },
    },
  },
  MuiIconButton: {
    styleOverrides: {
      root: {
        transition: "background-color 0.2s, transform 0.2s",
      },
    },
  },
  MuiBadge: {
    styleOverrides: {
      badge: {
        fontWeight: "bold",
      },
    },
  },
  MuiTooltip: {
    defaultProps: {
      disableInteractive: true, // Remove o comportamento "hoverable" que causa redimensionamento
      enterDelay: 300,          // Delay mais suave para aparecer
      leaveDelay: 200,          // Delay para desaparecer
    },
    styleOverrides: {
      tooltip: {
        fontSize: "0.75rem",
        padding: "8px 12px",    // Padding ligeiramente maior para melhor legibilidade
        fontWeight: 500,
        color: "#ffffff",
        minWidth: "max-content", // Garante que não mude de tamanho abruptamente
        maxWidth: "300px",       // Largura máxima para evitar tooltips muito largos
        transition: "opacity 0.2s ease, transform 0.2s ease", // Transição suave
        transformOrigin: "center", // Centraliza a animação
        willChange: "transform, opacity", // Otimização de performance
      },
      popper: {
        pointerEvents: "none",   // Remove interferência de eventos
      },
      arrow: {
        color: "inherit",
        fontSize: "0.75rem",     // Tamanho consistente com o texto
      },
    },
  },
};

// Criar tema base (será aplicado o responsive typography depois)
let lightTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#1976d2", // Azul original
      light: "#42a5f5",
      dark: "#1565c0",
      contrastText: "#fff",
    },
    secondary: {
      main: "#0277bd",
      light: "#58a5f0",
      dark: "#004c8c",
      contrastText: "#ffffff",
    },
    background: {
      default: "#f5f5f5",
      paper: "#ffffff",
    },
    text: {
      primary: "#000",
      secondary: "#555",
    },
    error: {
      main: "#d32f2f",
    },
    warning: {
      main: "#ed6c02",
    },
    info: {
      main: "#0288d1",
    },
    success: {
      main: "#2e7d32",
    },
    grey: {
      50: "#fafafa",
      100: "#f5f5f5",
      200: "#eeeeee",
      300: "#e0e0e0",
      400: "#bdbdbd",
      500: "#9e9e9e",
      600: "#757575",
      700: "#616161",
      800: "#424242",
      900: "#212121",
    },
    table: {
      header: {
        backgroundColor: "#e0e0e0",
        color: "#000",
      },
      rowHover: {
        backgroundColor: "#f5f5f5",
      },
    },
  },
  shape: {
    borderRadius: 8,
  },
  typography: {
    fontFamily: [
      "Inter",
      "-apple-system",
      "BlinkMacSystemFont",
      '"Segoe UI"',
      "Roboto",
      '"Helvetica Neue"',
      "Arial",
      "sans-serif",
    ].join(","),
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
    button: {
      fontWeight: 500,
      textTransform: "none",
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          "--bg-color-default": "#f5f5f5",
          "--bg-color-paper": "#ffffff",
          "--text-color-primary": "#000",
          "--text-color-secondary": "#555",
          "*::-webkit-scrollbar": {
            width: "8px",
          },
          "*::-webkit-scrollbar-track": {
            background: "#f1f1f1",
          },
          "*::-webkit-scrollbar-thumb": {
            background: "#888",
            borderRadius: "4px",
          },
          "*::-webkit-scrollbar-thumb:hover": {
            background: "#555",
          },
          "*": {
            scrollbarWidth: "thin",
            scrollbarColor: "#888 #f1f1f1",
          },
        },
      },
    },
    ...commonComponents,
    MuiPaper: {
      styleOverrides: {
        ...commonComponents.MuiPaper.styleOverrides,
        outlined: {
          borderColor: alpha("#000000", 0.12),
        },
        elevation1: {
          boxShadow: "0 1px 4px 0 rgba(0,0,0,0.08)",
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        ...commonComponents.MuiTableCell.styleOverrides,
        head: {
          ...commonComponents.MuiTableCell.styleOverrides.head,
          backgroundColor: alpha("#000000", 0.03),
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        ...commonComponents.MuiToggleButton.styleOverrides,
        root: {
          ...commonComponents.MuiToggleButton.styleOverrides.root,
          color: alpha("#000000", 0.7),
          "&.Mui-selected": {
            color: "#000000",
            backgroundColor: alpha("#1976d2", 0.1),
            "&:hover": {
              backgroundColor: alpha("#1976d2", 0.2),
            },
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        ...commonComponents.MuiOutlinedInput.styleOverrides,
        notchedOutline: {
          borderColor: alpha("#000000", 0.2),
        },
        root: {
          ...commonComponents.MuiOutlinedInput.styleOverrides.root,
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: alpha("#000000", 0.3),
          },
        },
      },
    },
    MuiListItem: {
      styleOverrides: {
        ...commonComponents.MuiListItem.styleOverrides,
        root: {
          ...commonComponents.MuiListItem.styleOverrides.root,
          "&.Mui-selected": {
            backgroundColor: alpha("#1976d2", 0.1),
            "&:hover": {
              backgroundColor: alpha("#1976d2", 0.2),
            },
          },
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        ...commonComponents.MuiMenuItem.styleOverrides,
        root: {
          ...commonComponents.MuiMenuItem.styleOverrides.root,
          "&.Mui-selected": {
            ...commonComponents.MuiMenuItem.styleOverrides.root["&.Mui-selected"],
            backgroundColor: alpha("#1976d2", 0.1),
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        ...commonComponents.MuiCard.styleOverrides,
        root: {
          ...commonComponents.MuiCard.styleOverrides.root,
          "&:hover": {
            boxShadow: "0 4px 12px 0 rgba(0,0,0,0.1)",
            transform: "translateY(-2px)",
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        ...commonComponents.MuiIconButton.styleOverrides,
        root: {
          ...commonComponents.MuiIconButton.styleOverrides.root,
          "&:hover": {
            transform: "scale(1.05)",
          },
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: "#616161",
          border: "1px solid #e0e0e0",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)", // Sombra sutil
        },
      },
    },
  },
});

// Aplicar responsive typography ao lightTheme
lightTheme = applyResponsiveTypography(lightTheme);

// Criar tema dark base (será aplicado o responsive typography depois)
let darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#90caf9", // Azul claro original
      light: "#b3e5fc",
      dark: "#42a5f5",
      contrastText: "rgba(0, 0, 0, 0.87)",
    },
    secondary: {
      main: "#58a5f0",
      light: "#83bfff",
      dark: "#0277bd",
      contrastText: "#ffffff",
    },
    background: {
      default: "#121212",
      paper: "#1e1e1e",
    },
    text: {
      primary: "#fff",
      secondary: "#ccc",
    },
    error: {
      main: "#f44336",
    },
    warning: {
      main: "#ffa726",
    },
    info: {
      main: "#29b6f6",
    },
    success: {
      main: "#66bb6a",
    },
    grey: {
      50: "#212121",
      100: "#424242",
      200: "#616161",
      300: "#757575",
      400: "#9e9e9e",
      500: "#bdbdbd",
      600: "#e0e0e0",
      700: "#eeeeee",
      800: "#f5f5f5",
      900: "#fafafa",
    },
    table: {
      header: {
        backgroundColor: "#333",
        color: "#fff",
      },
      rowHover: {
        backgroundColor: "#2c2c2c",
      },
    },
  },
  shape: {
    borderRadius: 8,
  },
  typography: {
    fontFamily: lightTheme.typography.fontFamily,
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
    button: {
      fontWeight: 500,
      textTransform: "none",
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          "--bg-color-default": "#121212",
          "--bg-color-paper": "#1e1e1e",
          "--text-color-primary": "#fff",
          "--text-color-secondary": "#ccc",
          "*::-webkit-scrollbar": {
            width: "8px",
          },
          "*::-webkit-scrollbar-track": {
            background: "rgba(0, 0, 0, 0.2)",
          },
          "*::-webkit-scrollbar-thumb": {
            background: "rgba(255, 255, 255, 0.2)",
            borderRadius: "4px",
          },
          "*::-webkit-scrollbar-thumb:hover": {
            background: "rgba(255, 255, 255, 0.3)",
          },
          "*": {
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(255, 255, 255, 0.2) rgba(0, 0, 0, 0.2)",
          },
        },
      },
    },
    ...commonComponents,
    MuiButton: {
      styleOverrides: {
        ...commonComponents.MuiButton.styleOverrides,
        contained: {
          boxShadow: "0 1px 3px 0 rgba(0,0,0,0.4)",
          "&:hover": {
            boxShadow: "0 2px 6px 0 rgba(0,0,0,0.5)",
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        ...commonComponents.MuiPaper.styleOverrides,
        outlined: {
          borderColor: alpha("#ffffff", 0.12),
        },
        elevation1: {
          boxShadow: "0 1px 4px 0 rgba(0,0,0,0.4)",
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        ...commonComponents.MuiTableCell.styleOverrides,
        head: {
          ...commonComponents.MuiTableCell.styleOverrides.head,
          backgroundColor: alpha("#ffffff", 0.05),
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        ...commonComponents.MuiToggleButton.styleOverrides,
        root: {
          ...commonComponents.MuiToggleButton.styleOverrides.root,
          color: alpha("#ffffff", 0.7),
          "&.Mui-selected": {
            color: "#ffffff",
            backgroundColor: alpha("#1976d2", 0.2),
            "&:hover": {
              backgroundColor: alpha("#1976d2", 0.3),
            },
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        ...commonComponents.MuiOutlinedInput.styleOverrides,
        notchedOutline: {
          borderColor: alpha("#ffffff", 0.2),
        },
        root: {
          ...commonComponents.MuiOutlinedInput.styleOverrides.root,
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: alpha("#ffffff", 0.3),
          },
        },
      },
    },
    MuiListItem: {
      styleOverrides: {
        ...commonComponents.MuiListItem.styleOverrides,
        root: {
          ...commonComponents.MuiListItem.styleOverrides.root,
          "&.Mui-selected": {
            backgroundColor: alpha("#1976d2", 0.2),
            "&:hover": {
              backgroundColor: alpha("#1976d2", 0.3),
            },
          },
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        ...commonComponents.MuiMenuItem.styleOverrides,
        root: {
          ...commonComponents.MuiMenuItem.styleOverrides.root,
          "&.Mui-selected": {
            ...commonComponents.MuiMenuItem.styleOverrides.root["&.Mui-selected"],
            backgroundColor: alpha("#1976d2", 0.2),
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        ...commonComponents.MuiCard.styleOverrides,
        root: {
          ...commonComponents.MuiCard.styleOverrides.root,
          "&:hover": {
            boxShadow: "0 4px 12px 0 rgba(0,0,0,0.6)",
            transform: "translateY(-2px)",
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        ...commonComponents.MuiIconButton.styleOverrides,
        root: {
          ...commonComponents.MuiIconButton.styleOverrides.root,
          "&:hover": {
            transform: "scale(1.05)",
          },
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: "#424242",
          border: "1px solid #757575",
          boxShadow: "0 2px 4px rgba(0,0,0,0.3)", // Sombra mais visível no dark
        },
      },
    },
  },
});

// Aplicar responsive typography ao darkTheme
darkTheme = applyResponsiveTypography(darkTheme);

export { lightTheme, darkTheme };