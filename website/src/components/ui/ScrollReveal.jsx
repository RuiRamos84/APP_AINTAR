import { motion, useReducedMotion } from 'framer-motion'

const variants = {
  hidden: {
    opacity: 0,
    y: 30,
  },
  visible: {
    opacity: 1,
    y: 0,
  },
}

const reducedVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
}

export default function ScrollReveal({
  children,
  delay = 0,
  duration = 0.6,
  className = '',
  once = true,
}) {
  const prefersReduced = useReducedMotion()

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once, margin: '-60px' }}
      transition={{
        duration: prefersReduced ? 0.2 : duration,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      variants={prefersReduced ? reducedVariants : variants}
      className={className}
    >
      {children}
    </motion.div>
  )
}
