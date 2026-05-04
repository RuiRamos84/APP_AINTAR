import { motion } from 'framer-motion';

const variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
};

// Cubic bezier: snappy ease-out — rápido sem parecer abrupto
const easing = [0.25, 0.46, 0.45, 0.94];

export const PageTransition = ({ children }) => {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants}
      transition={{ duration: 0.22, ease: easing }}
      style={{ width: '100%', height: '100%' }}
    >
      {children}
    </motion.div>
  );
};
