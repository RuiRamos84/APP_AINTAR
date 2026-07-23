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
  fluidFontSize,
  breakpointsTokens,
  elevationTokens,
  elevationDarkTokens,
} from '../tokens';

/**
 * Criar tema baseado no modo (light/dark)
 */
export const getTheme = (mode = 'light', prefersReducedMotion = false) => {
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
      fontSize: 16,

      // Headings - Outfit (display) + fluidos (clamp entre 360px e 1280px)
      h1: {
        fontFamily: typographyTokens.fontFamily.display,
        fontSize: fluidFontSize.h1,
        fontWeight: typographyTokens.fontWeight.bold,
        lineHeight: typographyTokens.lineHeight.tight,
        letterSpacing: '-0.02em',
      },

      h2: {
        fontFamily: typographyTokens.fontFamily.display,
        fontSize: fluidFontSize.h2,
        fontWeight: typographyTokens.fontWeight.semibold,
        lineHeight: typographyTokens.lineHeight.tight,
        letterSpacing: '-0.015em',
      },

      h3: {
        fontFamily: typographyTokens.fontFamily.display,
        fontSize: fluidFontSize.h3,
        fontWeight: typographyTokens.fontWeight.semibold,
        lineHeight: typographyTokens.lineHeight.snug,
        letterSpacing: '-0.01em',
      },

      h4: {
        fontFamily: typographyTokens.fontFamily.display,
        fontSize: fluidFontSize.h4,
        fontWeight: typographyTokens.fontWeight.semibold,
        lineHeight: typographyTokens.lineHeight.snug,
        letterSpacing: '-0.01em',
      },

      h5: {
        fontFamily: typographyTokens.fontFamily.display,
        fontSize: fluidFontSize.h5,
        fontWeight: typographyTokens.fontWeight.medium,
        lineHeight: typographyTokens.lineHeight.normal,
      },

      h6: {
        fontFamily: typographyTokens.fontFamily.display,
        fontSize: fluidFontSize.h6,
        fontWeight: typographyTokens.fontWeight.medium,
        lineHeight: typographyTokens.lineHeight.normal,
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

    // Shape (bordas arredondadas — matching rounded-2xl do website)
    shape: {
      borderRadius: 16, 
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

    // Transições — neutralizadas quando o utilizador pede reduced motion
    transitions: prefersReducedMotion
      ? {
          duration: {
            shortest: 1, shorter: 1, short: 1,
            standard: 1, complex: 1,
            enteringScreen: 1, leavingScreen: 1,
          },
        }
      : undefined,

    // Componentes MUI - Overrides globais
    components: {
      // Button
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 100, // Full rounded (matching website buttons)
            padding: '10px 24px',
            minHeight: spacingTokens.touch.minTarget, 
            textTransform: 'none',
            fontWeight: 600,
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: '0 4px 12px rgba(27, 94, 142, 0.2)',
            }
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
            borderRadius: 24, // 24px (Premium cards)
            border: `1px solid ${isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)'}`,
            boxShadow: isLight ? '0 4px 20px rgba(0,0,0,0.03)' : '0 4px 20px rgba(0,0,0,0.2)',
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: isLight ? '0 12px 30px rgba(0,0,0,0.08)' : '0 12px 30px rgba(0,0,0,0.4)',
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
              borderRadius: 12,
              backgroundColor: isLight ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.2)',
              '& fieldset': {
                borderColor: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)',
              },
              '&:hover fieldset': {
                borderColor: colorTokens.primary[300],
              },
            },
          },
        },
      },

      // AppBar
      MuiAppBar: {
        styleOverrides: {
          root: {
            backdropFilter: 'blur(12px)',
            backgroundColor: isLight ? 'rgba(255,255,255,0.8)' : 'rgba(10, 22, 40, 0.8)',
            borderBottom: `1px solid ${isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)'}`,
            color: isLight ? colorTokens.primary[900] : '#fff',
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

      // Chip
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            fontFamily: typographyTokens.fontFamily.primary,
            fontWeight: typographyTokens.fontWeight.medium,
            fontSize: '0.75rem',
            letterSpacing: '0.02em',
            height: 26,
          },
          label: {
            paddingLeft: 10,
            paddingRight: 10,
          },
        },
      },

      // Tabs
      MuiTabs: {
        styleOverrides: {
          root: {
            minHeight: 44,
          },
          indicator: {
            height: 3,
            borderRadius: '3px 3px 0 0',
          },
        },
      },

      MuiTab: {
        styleOverrides: {
          root: {
            fontFamily: typographyTokens.fontFamily.primary,
            fontWeight: typographyTokens.fontWeight.medium, // 500 — menos pesado que semibold
            fontSize: '0.8rem', // reduzido face ao x-height maior do Manrope
            letterSpacing: '0.02em',
            textTransform: 'none',
            minHeight: 44,
            padding: '8px 14px',
          },
        },
      },

      // ListItemButton
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            transition: 'background-color 0.15s ease, transform 0.15s ease',
          },
        },
      },

      // TableCell
      MuiTableCell: {
        styleOverrides: {
          head: {
            fontFamily: typographyTokens.fontFamily.primary,
            fontWeight: typographyTokens.fontWeight.semibold,
            fontSize: typographyTokens.fontSize.mobile.xs,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: isLight ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)',
          },
        },
      },

      // CssBaseline — atmosfera e estilos globais theme-aware
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundImage: isLight
              ? 'radial-gradient(circle, rgba(14, 99, 181, 0.045) 1px, transparent 1px)'
              : 'none',
            backgroundSize: '28px 28px',
            fontFeatureSettings: '"cv02", "cv03", "cv04"',
          },
          '::selection': {
            backgroundColor: isLight
              ? 'rgba(14, 99, 181, 0.18)'
              : 'rgba(61, 142, 217, 0.35)',
            color: 'inherit',
          },
          '::-webkit-scrollbar': {
            width: '7px',
            height: '7px',
          },
          '::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '::-webkit-scrollbar-thumb': {
            background: isLight
              ? 'rgba(14, 99, 181, 0.2)'
              : 'rgba(255, 255, 255, 0.15)',
            borderRadius: '100vw',
          },
          '::-webkit-scrollbar-thumb:hover': {
            background: isLight
              ? 'rgba(14, 99, 181, 0.35)'
              : 'rgba(255, 255, 255, 0.25)',
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
