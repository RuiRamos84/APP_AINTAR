/**
 * Estilos reutilizáveis para os componentes da seção de documentos
 */

// Estilos para cartões de documento
export const cardStyles = {
    root: {
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        transition: 'all 0.2s ease',
        '&:hover': {
            boxShadow: 3,
            transform: 'translateY(-3px)'
        }
    },
    notification: {
        borderLeft: '4px solid #f44336'
    },
    header: {
        pb: 0
    },
    content: {
        pt: 0,
        flexGrow: 1
    }
};

// Estilos para os cartões de estatísticas
export const statCardStyles = {
    root: {
        position: 'relative',
        overflow: 'hidden',
        height: '100%',
        boxShadow: 2,
        borderRadius: 2,
        transition: 'transform 0.3s, box-shadow 0.3s, opacity 0.3s',
    },
    clickable: {
        cursor: 'pointer',
        '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: 4
        }
    },
    loading: {
        opacity: 0.7
    },
    bubble: {
        position: 'absolute',
        top: -10,
        right: -10,
        borderRadius: '50%',
        width: 70,
        height: 70,
        opacity: 0.1
    },
    content: {
        position: 'relative',
        zIndex: 1
    },
    icon: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '50%',
        width: 48,
        height: 48,
        color: '#fff'
    },
    pulse: {
        animation: 'pulse 1.5s infinite',
        '@keyframes pulse': {
            '0%': { boxShadow: '0 0 0 0 rgba(var(--color), 0.4)' },
            '70%': { boxShadow: '0 0 0 10px rgba(var(--color), 0)' },
            '100%': { boxShadow: '0 0 0 0 rgba(var(--color), 0)' }
        }
    }
};

// Estilos para notificações
export const notificationStyles = {
    bellIcon: (hasNotification = true) => ({
        position: 'absolute',
        top: -10,
        right: -10,
        zIndex: 10,
        color: theme => theme.palette.error.main,
        fontSize: '1.5rem',
        animation: hasNotification ?
            'bellShake 0.9s cubic-bezier(.36,.07,.19,.97) infinite' :
            'fadeOut 0.5s forwards',
        transformOrigin: 'top',
        '@keyframes bellShake': {
            '0%': { transform: 'rotate(0)' },
            '10%': { transform: 'rotate(10deg)' },
            '20%': { transform: 'rotate(-8deg)' },
            '30%': { transform: 'rotate(6deg)' },
            '40%': { transform: 'rotate(-4deg)' },
            '50%': { transform: 'rotate(2deg)' },
            '60%': { transform: 'rotate(0)' },
            '100%': { transform: 'rotate(0)' }
        },
        '@keyframes fadeOut': {
            '0%': { opacity: 1 },
            '100%': { opacity: 0, visibility: 'hidden' }
        }
    }),
    chipNotification: {
        position: 'relative',
        ml: 0.5,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: -5,  // Ajustado para a visualização em linha na tabela
        height: 15
    },
    tableNotification: {
        // Estilo específico para notificações em tabelas
        position: 'relative',
        display: 'inline-flex',
        // fontSize: 'small',
        marginLeft: 1,
        color: theme => theme.palette.error.main,
        animation: 'bellShake 0.9s cubic-bezier(.36,.07,.19,.97) infinite',
        transformOrigin: 'center'
    }
};

// Estilos para o componente de filtros
export const filterStyles = {
    paper: {
        p: 2,
        mb: 2,
        bgcolor: theme => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'
    },
    searchField: {
        minWidth: { xs: '100%', sm: '250px' }
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 2
    }
};

// Estilos para as visualizações de documento
export const viewStyles = {
    container: {
        p: 3,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 'calc(100vh - 280px)',
        position: 'relative'
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 2,
        flexWrap: { xs: 'wrap', sm: 'nowrap' },
        gap: 1
    },
    title: {
        display: 'flex',
        alignItems: 'center'
    },
    actionButtons: {
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        flexWrap: { xs: 'wrap', sm: 'nowrap' },
        justifyContent: { xs: 'flex-end', sm: 'flex-start' },
        flex: { xs: '1 0 100%', sm: '0 1 auto' }
    },
    emptyState: {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px'
    },
    pagination: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        mt: 2,
        flexWrap: { xs: 'wrap', sm: 'nowrap' },
        gap: 1
    },
    fabButton: {
        position: 'fixed',
        bottom: 20,
        right: 20,
        display: { xs: 'block', md: 'none' },
        zIndex: 10,
        boxShadow: 3
    }
};

// Estilos para modais
export const modalStyles = {
    title: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    content: {
        p: { xs: 1, sm: 2 }
    },
    actions: {
        px: 3,
        py: 2
    },
    paper: {
        p: 2,
        mb: 2,
        borderRadius: 1,
        boxShadow: 'rgb(0 0 0 / 5%) 0px 1px 3px'
    },
    infoBox: {
        bgcolor: theme => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.01)'
    }
};

// Estilos para os componentes de preview de arquivos
export const previewStyles = {
    dialog: {
        height: { xs: '90vh', sm: '80vh' },
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: theme => `1px solid ${theme.palette.divider}`,
        pb: 1
    },
    content: {
        flexGrow: 1,
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
        p: 1
    },
    actions: {
        justifyContent: 'space-between',
        borderTop: theme => `1px solid ${theme.palette.divider}`,
        p: 1
    },
    previewContainer: {
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        transition: 'transform 0.2s ease'
    },
    previewImage: {
        maxWidth: '100%',
        maxHeight: '100%',
        objectFit: 'contain'
    },
    previewFrame: {
        width: '100%',
        height: '100%',
        border: 'none'
    }
};