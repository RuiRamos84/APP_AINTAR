export const useOperationCardStyles = () => ({
    card: {
        cursor: 'pointer',
        position: 'relative',
        minHeight: 200,
        transition: 'all 0.3s ease',
        '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: 6
        },
        borderRadius: 3,
        overflow: 'hidden'
    },
    cardContent: {
        p: 3,
        position: 'relative'
    },
    cardActions: {
        justifyContent: 'space-around',
        p: 1.5,
        bgcolor: 'action.hover',
        borderTop: 1,
        borderColor: 'divider'
    },
    touchIndicator: {
        position: 'absolute',
        bottom: 12,
        right: 12,
        display: 'flex',
        gap: 0.5,
        opacity: 0.7
    }
});