/**
 * AnimatedButton Component
 * Wrapper para botões com animações de hover e tap
 *
 * Props:
 * - whileHover: escala no hover (default: 1.05)
 * - whileTap: escala no tap (default: 0.95)
 * - variant: tipo de animação ('scale' | 'lift' | 'pulse') (default: 'scale')
 */

import { motion } from 'framer-motion';

const hoverVariants = {
  scale: {
    scale: 1.05,
  },
  lift: {
    y: -4,
    boxShadow: '0 8px 16px rgba(0,0,0,0.15)',
  },
  pulse: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 0.6,
      repeat: Infinity,
      repeatType: 'reverse',
    },
  },
};

const tapVariants = {
  scale: {
    scale: 0.95,
  },
  lift: {
    y: 0,
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  pulse: {
    scale: 0.95,
  },
};

export const AnimatedButton = ({
  children,
  variant = 'scale',
  className,
  onClick,
  disabled = false,
  ...props
}) => {
  const whileHover = disabled ? {} : hoverVariants[variant] || hoverVariants.scale;
  const whileTap = disabled ? {} : tapVariants[variant] || tapVariants.scale;

  return (
    <motion.button
      whileHover={whileHover}
      whileTap={whileTap}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      className={className}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </motion.button>
  );
};

export default AnimatedButton;
