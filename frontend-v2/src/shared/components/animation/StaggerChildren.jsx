/**
 * StaggerChildren Component
 * Anima filhos em sequência (stagger effect)
 * Perfeito para listas, grids, etc.
 *
 * Props:
 * - staggerDelay: delay entre cada filho (default: 0.1)
 * - duration: duração de cada animação (default: 0.3)
 * - variant: tipo de animação ('fade' | 'slideUp' | 'scale') (default: 'fade')
 */

import { motion } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: (staggerDelay) => ({
    opacity: 1,
    transition: {
      staggerChildren: staggerDelay,
      delayChildren: 0,
    },
  }),
};

const itemVariants = {
  fade: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  },
  slideUp: {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  },
  slideDown: {
    hidden: { opacity: 0, y: -20 },
    visible: { opacity: 1, y: 0 },
  },
  scale: {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1 },
  },
};

export const StaggerChildren = ({
  children,
  staggerDelay = 0.1,
  duration = 0.3,
  variant = 'fade',
  className,
}) => {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      custom={staggerDelay}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/**
 * StaggerItem - Componente filho para usar com StaggerChildren
 * Deve ser usado dentro de StaggerChildren
 */
export const StaggerItem = ({ children, variant = 'fade', duration = 0.3, className }) => {
  const selectedVariant = itemVariants[variant] || itemVariants.fade;

  return (
    <motion.div
      variants={selectedVariant}
      transition={{ duration, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export default StaggerChildren;
