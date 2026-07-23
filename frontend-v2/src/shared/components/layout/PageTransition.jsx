import { motion, useReducedMotion } from 'framer-motion';
import { easingTokensFramer, durationTokens } from '@/styles/tokens';

const variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
};

const reducedVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const PageTransition = ({ children }) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={prefersReducedMotion ? reducedVariants : variants}
      transition={{
        duration: prefersReducedMotion ? 0.15 : durationTokens.base / 1000,
        ease: easingTokensFramer.out,
      }}
      style={{ width: '100%', height: '100%' }}
    >
      {children}
    </motion.div>
  );
};
