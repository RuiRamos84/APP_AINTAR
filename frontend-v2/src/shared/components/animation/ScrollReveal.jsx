/**
 * ScrollReveal Component
 * Anima elementos quando entram no viewport (scroll)
 *
 * Props:
 * - direction: 'up' | 'down' | 'left' | 'right' (default: 'up')
 * - delay: atraso em segundos (default: 0)
 * - duration: duração em segundos (default: 0.5)
 * - once: animar apenas uma vez (default: true)
 */

import { motion } from 'framer-motion';

const variants = {
  up: {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0 },
  },
  down: {
    hidden: { opacity: 0, y: -40 },
    visible: { opacity: 1, y: 0 },
  },
  left: {
    hidden: { opacity: 0, x: 40 },
    visible: { opacity: 1, x: 0 },
  },
  right: {
    hidden: { opacity: 0, x: -40 },
    visible: { opacity: 1, x: 0 },
  },
};

export const ScrollReveal = ({
  children,
  direction = 'up',
  delay = 0,
  duration = 0.5,
  once = true,
  className,
}) => {
  const selectedVariant = variants[direction] || variants.up;

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once, margin: '-50px' }}
      variants={selectedVariant}
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

export default ScrollReveal;
