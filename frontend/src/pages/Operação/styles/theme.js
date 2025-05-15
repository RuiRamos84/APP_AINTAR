export const operationsTheme = {
    palette: {
        status: {
            critical: '#d32f2f',
            warning: '#f57c00',
            moderate: '#fbc02d',
            good: '#388e3c'
        }
    },
    spacing: {
        drawerMargin: '8.5vw',
        sidebarMargin: '2.5vw',
        touchTarget: 48
    },
    breakpoints: {
        values: {
            xs: 0,
            sm: 600,
            md: 960,
            lg: 1280,
            xl: 1536,
            xxl: 1920
        }
    },
    components: {
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 12
                }
            }
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    minHeight: 48,
                    '@media (max-width:960px)': {
                        minHeight: 56
                    }
                }
            }
        },
        MuiIconButton: {
            styleOverrides: {
                root: {
                    '@media (max-width:960px)': {
                        padding: 12
                    }
                }
            }
        }
    }
};