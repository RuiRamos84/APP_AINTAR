import { createTheme } from "@mui/material/styles";

const lightTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#1976d2",
    },
    secondary: {
      main: "#dc004e",
    },
    background: {
      default: "#f4f6f8",
      paper: "#fff",
    },
    text: {
      primary: "#000",
      secondary: "#555",
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
  typography: {
    fontFamily: "Roboto, sans-serif",
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          "--bg-color-default": "#f4f6f8",
          "--bg-color-paper": "#fff",
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
  },
});

const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#90caf9",
    },
    secondary: {
      main: "#f48fb1",
    },
    background: {
      default: "#121212",
      paper: "#1e1e1e",
    },
    text: {
      primary: "#fff",
      secondary: "#ccc",
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
  typography: {
    fontFamily: "Roboto, sans-serif",
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
  },
});

export { lightTheme, darkTheme };
