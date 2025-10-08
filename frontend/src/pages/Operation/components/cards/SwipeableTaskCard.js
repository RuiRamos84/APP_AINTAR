import React, { useState } from 'react';
import { useSwipeable } from 'react-swipeable';
import {
  Card, CardContent, Box, Typography, Chip, IconButton,
  LinearProgress, alpha
} from '@mui/material';
import {
  CheckCircle, Delete, LocationOn, Schedule,
  TrendingFlat, SwipeLeft, SwipeRight
} from '@mui/icons-material';

/**
 * SWIPEABLE TASK CARD - Touch Gestures Nativos
 *
 * Gestures:
 * - Swipe Right → Completar tarefa
 * - Swipe Left → Eliminar/Arquivar
 * - Tap → Ver detalhes
 *
 * UX Mobile-First:
 * - Feedback visual durante swipe
 * - Animações fluidas
 * - Haptic feedback (se suportado)
 * - Desfazer ação
 */

const SwipeableTaskCard = ({
  task,
  onComplete,
  onDelete,
  onTap,
  variant = 'elevated',
  showActions = true,
}) => {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);

  // Threshold para ação (40% da largura do card)
  const SWIPE_THRESHOLD = 0.4;

  // ============================================================
  // SWIPE HANDLERS
  // ============================================================

  const handlers = useSwipeable({
    onSwiping: (eventData) => {
      setIsSwiping(true);
      // Calcular offset baseado no movimento
      const offset = eventData.deltaX;
      // Limitar entre -200 e 200
      setSwipeOffset(Math.max(-200, Math.min(200, offset)));
    },

    onSwipedRight: (eventData) => {
      setIsSwiping(false);

      // Se passou o threshold, completar
      if (Math.abs(eventData.deltaX) > eventData.event.target.offsetWidth * SWIPE_THRESHOLD) {
        handleComplete();
      } else {
        // Voltar à posição inicial
        animateReset();
      }
    },

    onSwipedLeft: (eventData) => {
      setIsSwiping(false);

      // Se passou o threshold, deletar
      if (Math.abs(eventData.deltaX) > eventData.event.target.offsetWidth * SWIPE_THRESHOLD) {
        handleDelete();
      } else {
        // Voltar à posição inicial
        animateReset();
      }
    },

    onSwiped: () => {
      setIsSwiping(false);
      if (Math.abs(swipeOffset) < 50) {
        animateReset();
      }
    },

    preventScrollOnSwipe: true,
    trackMouse: true, // Também funcionar no desktop
    trackTouch: true,
    delta: 10, // Sensibilidade
  });

  // ============================================================
  // ACTIONS
  // ============================================================

  const handleComplete = () => {
    // Haptic feedback (se suportado)
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    animateComplete(() => {
      onComplete?.(task);
    });
  };

  const handleDelete = () => {
    if (navigator.vibrate) {
      navigator.vibrate([50, 100, 50]);
    }

    animateDelete(() => {
      onDelete?.(task);
    });
  };

  const handleTap = () => {
    if (!isSwiping && Math.abs(swipeOffset) < 5) {
      onTap?.(task);
    }
  };

  // ============================================================
  // ANIMATIONS
  // ============================================================

  const animateReset = () => {
    setSwipeOffset(0);
  };

  const animateComplete = (callback) => {
    // Animar para a direita e fade out
    setSwipeOffset(400);
    setTimeout(() => {
      callback?.();
      setSwipeOffset(0);
    }, 300);
  };

  const animateDelete = (callback) => {
    // Animar para a esquerda e fade out
    setSwipeOffset(-400);
    setTimeout(() => {
      callback?.();
      setSwipeOffset(0);
    }, 300);
  };

  // ============================================================
  // VISUAL FEEDBACK
  // ============================================================

  // Calcular opacidade dos indicadores baseado no swipe
  const rightIndicatorOpacity = Math.max(0, Math.min(1, swipeOffset / 100));
  const leftIndicatorOpacity = Math.max(0, Math.min(1, -swipeOffset / 100));

  // Cor de fundo muda durante swipe
  const getBackgroundColor = () => {
    if (swipeOffset > 50) return alpha('#4caf50', 0.1); // Verde
    if (swipeOffset < -50) return alpha('#f44336', 0.1); // Vermelho
    return 'background.paper';
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <Box
      sx={{
        position: 'relative',
        mb: 2,
        overflow: 'hidden',
        borderRadius: 2,
      }}
    >
      {/* Indicador de ação à direita (Completar) */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          width: 80,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'success.main',
          opacity: rightIndicatorOpacity,
          transition: 'opacity 0.2s',
          zIndex: 0,
        }}
      >
        <CheckCircle sx={{ color: 'white', fontSize: 32 }} />
      </Box>

      {/* Indicador de ação à esquerda (Eliminar) */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: 80,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'error.main',
          opacity: leftIndicatorOpacity,
          transition: 'opacity 0.2s',
          zIndex: 0,
        }}
      >
        <Delete sx={{ color: 'white', fontSize: 32 }} />
      </Box>

      {/* Card principal (swipeable) */}
      <Card
        {...handlers}
        onClick={handleTap}
        elevation={variant === 'elevated' ? 3 : 0}
        sx={{
          position: 'relative',
          transform: `translateX(${swipeOffset}px)`,
          transition: isSwiping ? 'none' : 'transform 0.3s ease-out',
          bgcolor: getBackgroundColor(),
          cursor: 'pointer',
          touchAction: 'pan-y', // Permitir scroll vertical
          userSelect: 'none',
          zIndex: 1,
          '&:active': {
            transform: `translateX(${swipeOffset}px) scale(0.98)`,
          },
        }}
      >
        <CardContent>
          {/* Progress bar se em progresso */}
          {task.inProgress && (
            <LinearProgress
              sx={{ position: 'absolute', top: 0, left: 0, right: 0 }}
            />
          )}

          {/* Header com prioridade e tipo */}
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Chip
              size="small"
              label={task.instalacao_tipo || 'ETAR'}
              color={task.instalacao_tipo === 'EE' ? 'secondary' : 'primary'}
            />
            {task.priority === 'high' && (
              <Chip
                size="small"
                label="Urgente"
                color="error"
                sx={{ fontWeight: 'bold' }}
              />
            )}
          </Box>

          {/* Título e localização */}
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
            {task.acao_operacao || task.description}
          </Typography>

          <Box display="flex" alignItems="center" gap={1} color="text.secondary" mb={1}>
            <LocationOn fontSize="small" />
            <Typography variant="body2">
              {task.location || task.instalacao_nome?.replace(/\s*\((ETAR|EE)\)\s*$/, '') || 'N/A'}
            </Typography>
          </Box>

          {/* Duração estimada */}
          {task.estimatedDuration && (
            <Box display="flex" alignItems="center" gap={1} color="text.secondary">
              <Schedule fontSize="small" />
              <Typography variant="body2">
                {task.estimatedDuration}
              </Typography>
            </Box>
          )}

          {/* Hint visual para gestures (apenas primeiras vezes) */}
          {showActions && !task.completed && (
            <Box
              display="flex"
              justifyContent="space-between"
              mt={2}
              pt={2}
              borderTop={1}
              borderColor="divider"
              sx={{ opacity: 0.6 }}
            >
              <Box display="flex" alignItems="center" gap={0.5} fontSize="0.75rem">
                <SwipeRight fontSize="small" />
                <Typography variant="caption">Deslizar para concluir</Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={0.5} fontSize="0.75rem">
                <Typography variant="caption">Eliminar</Typography>
                <SwipeLeft fontSize="small" />
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default SwipeableTaskCard;
