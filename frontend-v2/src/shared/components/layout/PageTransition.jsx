import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useUIStore } from '@/core/store/uiStore';
import { DURATION, EASING } from './layoutConstants';

/**
 * PageTransition
 *
 * - Troca de módulo: slide horizontal na direção correta (esquerda/direita)
 * - Navegação dentro do mesmo módulo: fade vertical suave
 */
export const PageTransition = ({ children }) => {
  const moduleDirection = useUIStore((state) => state.moduleDirection);
  const clearModuleDirection = useUIStore((state) => state.clearModuleDirection);
  const directionRef = useRef(moduleDirection);

  // Captura a direção no momento do render (antes de ser limpa)
  directionRef.current = moduleDirection;

  useEffect(() => {
    if (moduleDirection) {
      // Limpa após a transição ter sido lida
      const timer = setTimeout(clearModuleDirection, (DURATION.moderate + 0.05) * 1000);
      return () => clearTimeout(timer);
    }
  }, [moduleDirection, clearModuleDirection]);

  const dir = directionRef.current;
  const xOffset = 48;

  const variants = dir
    ? {
        initial: { opacity: 0, x: dir === 'left' ? xOffset : -xOffset },
        animate: { opacity: 1, x: 0 },
        exit:    { opacity: 0, x: dir === 'left' ? -xOffset : xOffset },
      }
    : {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        exit:    { opacity: 0, y: -4 },
      };

  const transition = dir
    ? { duration: DURATION.moderate, ease: EASING.snappy }
    : { duration: DURATION.fast,     ease: EASING.snappy };

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants}
      transition={transition}
      style={{ width: '100%', height: '100%' }}
    >
      {children}
    </motion.div>
  );
};
