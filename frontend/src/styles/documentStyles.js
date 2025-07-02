export const notificationStyles = {
    bellIcon: (isActive = false) => ({
        fontSize: 14,
        color: isActive ? '#ff6b35' : '#ff9800',
        animation: isActive ? 'bellRing 1.5s ease-in-out infinite' : 'none',
    }),

    chipNotification: {
        position: 'absolute',
        top: -8,
        right: -8,
        width: 20,
        height: 20,
        borderRadius: '50%',
        backgroundColor: '#ff6b35',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
    }
  };