/**
 * PageTransition Component
 * Transições suaves entre páginas usando Framer Motion
 *
 * Variants disponíveis:
 * - fade: simples fade in/out
 * - slideUp: slide de baixo para cima
 * - slideDown: slide de cima para baixo
 * - slideLeft: slide da direita para esquerda
 * - slideRight: slide da esquerda para direita
 * - scale: scale + fade
 */

import { motion } from 'framer-motion';

const variants = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  },
  slideDown: {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
  },
  slideLeft: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  },
  slideRight: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
  },
  scale: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
  },
};

export const PageTransition = ({
  children,
  variant = 'fade',
  duration = 0.3,
  delay = 0,
}) => {
  const selectedVariant = variants[variant] || variants.fade;

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={selectedVariant}
      transition={{
        duration,
        delay,
        ease: 'easeInOut',
      }}
      style={{ width: '100%', height: '100%' }}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
