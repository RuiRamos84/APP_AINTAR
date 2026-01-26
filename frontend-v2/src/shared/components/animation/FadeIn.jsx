/**
 * FadeIn Component
 * Fade in simples com opções de direção
 *
 * Props:
 * - direction: 'up' | 'down' | 'left' | 'right' | null (default: null)
 * - delay: atraso em segundos (default: 0)
 * - duration: duração em segundos (default: 0.3)
 * - distance: distância do movimento em pixels (default: 20)
 */

import { motion } from 'framer-motion';

export const FadeIn = ({
  children,
  direction = null,
  delay = 0,
  duration = 0.3,
  distance = 20,
  className,
}) => {
  const getInitial = () => {
    const initial = { opacity: 0 };

    switch (direction) {
      case 'up':
        return { ...initial, y: distance };
      case 'down':
        return { ...initial, y: -distance };
      case 'left':
        return { ...initial, x: distance };
      case 'right':
        return { ...initial, x: -distance };
      default:
        return initial;
    }
  };

  return (
    <motion.div
      initial={getInitial()}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{
        duration,
        delay,
        ease: 'easeOut',
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export default FadeIn;
