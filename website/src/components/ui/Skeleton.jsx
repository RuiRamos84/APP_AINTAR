import { motion } from 'framer-motion'

export default function Skeleton({ className, variant = 'rect' }) {
  const baseClasses = "relative overflow-hidden bg-gray-200"
  const variants = {
    rect: "rounded-lg",
    circle: "rounded-full",
    text: "rounded h-4 w-full"
  }

  return (
    <div className={`${baseClasses} ${variants[variant]} ${className}`}>
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
        animate={{
          x: ['-100%', '100%'],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "linear",
        }}
      />
    </div>
  )
}
