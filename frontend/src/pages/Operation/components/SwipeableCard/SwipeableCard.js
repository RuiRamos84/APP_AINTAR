import React from 'react';
import { Box } from '@mui/material';

/**
 * Componente wrapper simples para SwipeableCard
 * Versão simplificada para o módulo legacy
 *
 * Para funcionalidade completa de swipe gestures em produção,
 * considere usar bibliotecas como:
 * - react-swipeable
 * - framer-motion
 * - react-use-gesture
 */
const SwipeableCard = ({
    children,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown
}) => {
    // Versão simplificada - apenas renderiza os children
    // Para tablet, os gestos de swipe podem ser menos críticos
    // pois o utilizador pode clicar diretamente nos botões

    return (
        <Box
            sx={{
                width: '100%',
                height: '100%',
                position: 'relative',
                touchAction: 'pan-y' // Permite scroll vertical
            }}
        >
            {children}
        </Box>
    );
};

export default SwipeableCard;
