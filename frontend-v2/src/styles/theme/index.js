/**
 * Tema Material-UI
 * Tema principal da aplicação com suporte a modo claro/escuro
 * Mobile-first approach
 */

import { createTheme } from '@mui/material/styles';
import {
  colorTokens,
  spacingTokens,
  typographyTokens,
  breakpointsTokens,
  elevationTokens,
  elevationDarkTokens,
} from '../tokens';

/**
 * Criar tema baseado no modo (light/dark)
 */
export const getTheme = (mode = 'light') => {
  const isLight = mode === 'light';

  return createTheme({
    // Paleta de cores
    palette: {
      mode,
      primary: {
        main: colorTokens.primary[500],
        light: colorTokens.primary[300],
        dark: colorTokens.primary[700],
        contrastText: '#fff',
      },
      secondary: {
        main: colorTokens.secondary[500],
        light: colorTokens.secondary[300],
        dark: colorTokens.secondary[700],
        contrastText: '#fff',
      },
      error: colorTokens.error,
      warning: colorTokens.warning,
      info: colorTokens.info,
      success: colorTokens.success,
      background: isLight ? colorTokens.background : colorTokens.backgroundDark,
      text: isLight ? colorTokens.text : colorTokens.textDark,
      divider: isLight ? colorTokens.divider : colorTokens.dividerDark,
    },

    // Breakpoints (Mobile-first)
    breakpoints: {
      values: breakpointsTokens.values,
    },

    // Espaçamento (base de 8px)
    spacing: spacingTokens.base,

    // Tipografia
    typography: {
      fontFamily: typographyTokens.fontFamily.primary,
      fontSize: 16, // Base font size

      // Headings - Responsivos
      h1: {
        fontSize: typographyTokens.fontSize.mobile['3xl'],
        fontWeight: typographyTokens.fontWeight.bold,
        lineHeight: typographyTokens.lineHeight.tight,
        // Desktop
        '@media (min-width:960px)': {
          fontSize: typographyTokens.fontSize.desktop['4xl'],
        },
      },

      h2: {
        fontSize: typographyTokens.fontSize.mobile['2xl'],
        fontWeight: typographyTokens.fontWeight.semibold,
        lineHeight: typographyTokens.lineHeight.tight,
        '@media (min-width:960px)': {
          fontSize: typographyTokens.fontSize.desktop['3xl'],
        },
      },

      h3: {
        fontSize: typographyTokens.fontSize.mobile.xl,
        fontWeight: typographyTokens.fontWeight.semibold,
        lineHeight: typographyTokens.lineHeight.snug,
        '@media (min-width:960px)': {
          fontSize: typographyTokens.fontSize.desktop['2xl'],
        },
      },

      h4: {
        fontSize: typographyTokens.fontSize.mobile.lg,
        fontWeight: typographyTokens.fontWeight.medium,
        lineHeight: typographyTokens.lineHeight.snug,
        '@media (min-width:960px)': {
          fontSize: typographyTokens.fontSize.desktop.xl,
        },
      },

      h5: {
        fontSize: typographyTokens.fontSize.mobile.md,
        fontWeight: typographyTokens.fontWeight.medium,
        lineHeight: typographyTokens.lineHeight.normal,
        '@media (min-width:960px)': {
          fontSize: typographyTokens.fontSize.desktop.lg,
        },
      },

      h6: {
        fontSize: typographyTokens.fontSize.mobile.sm,
        fontWeight: typographyTokens.fontWeight.medium,
        lineHeight: typographyTokens.lineHeight.normal,
        '@media (min-width:960px)': {
          fontSize: typographyTokens.fontSize.desktop.md,
        },
      },

      // Body text
      body1: {
        fontSize: typographyTokens.fontSize.mobile.md,
        fontWeight: typographyTokens.fontWeight.regular,
        lineHeight: typographyTokens.lineHeight.normal,
      },

      body2: {
        fontSize: typographyTokens.fontSize.mobile.sm,
        fontWeight: typographyTokens.fontWeight.regular,
        lineHeight: typographyTokens.lineHeight.normal,
      },

      // Button
      button: {
        fontSize: typographyTokens.fontSize.mobile.sm,
        fontWeight: typographyTokens.fontWeight.medium,
        textTransform: 'none', // Manter capitalização normal (PT-PT)
        letterSpacing: '0.025em',
      },

      // Caption
      caption: {
        fontSize: typographyTokens.fontSize.mobile.xs,
        fontWeight: typographyTokens.fontWeight.regular,
        lineHeight: typographyTokens.lineHeight.normal,
      },
    },

    // Shape (bordas arredondadas)
    shape: {
      borderRadius: 8, // 8px padrão
    },

    // Shadows (elevação)
    shadows: [
      'none',
      isLight ? elevationTokens[1] : elevationDarkTokens[1],
      isLight ? elevationTokens[2] : elevationDarkTokens[2],
      isLight ? elevationTokens[3] : elevationDarkTokens[3],
      isLight ? elevationTokens[4] : elevationDarkTokens[4],
      isLight ? elevationTokens[4] : elevationDarkTokens[4],
      isLight ? elevationTokens[6] : elevationDarkTokens[6],
      isLight ? elevationTokens[6] : elevationDarkTokens[6],
      isLight ? elevationTokens[8] : elevationDarkTokens[8],
      isLight ? elevationTokens[8] : elevationDarkTokens[8],
      isLight ? elevationTokens[8] : elevationDarkTokens[8],
      isLight ? elevationTokens[8] : elevationDarkTokens[8],
      isLight ? elevationTokens[12] : elevationDarkTokens[12],
      isLight ? elevationTokens[12] : elevationDarkTokens[12],
      isLight ? elevationTokens[12] : elevationDarkTokens[12],
      isLight ? elevationTokens[12] : elevationDarkTokens[12],
      isLight ? elevationTokens[16] : elevationDarkTokens[16],
      isLight ? elevationTokens[16] : elevationDarkTokens[16],
      isLight ? elevationTokens[16] : elevationDarkTokens[16],
      isLight ? elevationTokens[16] : elevationDarkTokens[16],
      isLight ? elevationTokens[16] : elevationDarkTokens[16],
      isLight ? elevationTokens[16] : elevationDarkTokens[16],
      isLight ? elevationTokens[16] : elevationDarkTokens[16],
      isLight ? elevationTokens[16] : elevationDarkTokens[16],
      isLight ? elevationTokens[24] : elevationDarkTokens[24],
    ],

    // Componentes MUI - Overrides globais
    components: {
      // Button
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            padding: '10px 20px',
            minHeight: spacingTokens.touch.minTarget, // Touch-friendly
            textTransform: 'none',
            fontWeight: typographyTokens.fontWeight.medium,
          },
          sizeLarge: {
            padding: '14px 28px',
            minHeight: spacingTokens.touch.large,
            fontSize: typographyTokens.fontSize.mobile.md,
          },
          sizeSmall: {
            padding: '6px 16px',
            minHeight: 36,
            fontSize: typographyTokens.fontSize.mobile.sm,
          },
        },
        defaultProps: {
          disableElevation: true, // Flat buttons por padrão
        },
      },

      // Card
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            boxShadow: isLight ? elevationTokens.card : elevationDarkTokens.card,
            '&:hover': {
              boxShadow: isLight ? elevationTokens.cardHover : elevationDarkTokens.cardHover,
            },
          },
        },
      },

      // Paper
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none', // Remover gradient em dark mode
          },
        },
      },

      // TextField
      MuiTextField: {
        defaultProps: {
          variant: 'outlined',
        },
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 8,
            },
          },
        },
      },

      // AppBar
      MuiAppBar: {
        styleOverrides: {
          root: {
            boxShadow: isLight ? elevationTokens.appBar : elevationDarkTokens.appBar,
          },
        },
        defaultProps: {
          elevation: 0,
        },
      },

      // Drawer
      MuiDrawer: {
        styleOverrides: {
          paper: {
            borderRight: 'none',
            boxShadow: isLight ? elevationTokens.drawer : elevationDarkTokens.drawer,
          },
        },
      },

      // Dialog
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 16,
            boxShadow: isLight ? elevationTokens.dialog : elevationDarkTokens.dialog,
          },
        },
      },

      // Tooltip
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            borderRadius: 6,
            fontSize: typographyTokens.fontSize.mobile.xs,
            padding: '8px 12px',
          },
        },
      },
    },
  });
};

// Tema padrão (light)
export const theme = getTheme('light');

// Tema dark
export const darkTheme = getTheme('dark');
