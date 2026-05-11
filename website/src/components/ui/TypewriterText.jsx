import { motion } from 'framer-motion'

export const getGradientColor = (index, total) => {
  const ratio = total > 1 ? index / (total - 1) : 0;
  // Interpolação entre AINTAR Sky (#29B5E8) e AINTAR Teal (#2ABB9B)
  const r = Math.round(41 + (42 - 41) * ratio);
  const g = Math.round(181 + (187 - 181) * ratio);
  const b = Math.round(232 + (155 - 232) * ratio);
  return `rgb(${r}, ${g}, ${b})`;
};

const letterVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      damping: 12,
      stiffness: 200,
      delay: i * 0.03 + 0.2
    }
  }),
}

/**
 * TypewriterText
 * 
 * Componente que anima um texto letra a letra com um efeito de "salto elástico".
 * Se `gradient=true`, calcula matematicamente as cores de cada letra para simular
 * o gradiente da marca, evitando bugs de renderização dos browsers (bg-clip-text).
 * 
 * @param {string} text - O texto a animar
 * @param {number} startIndex - Índice global (útil se existirem várias linhas em sequência)
 * @param {boolean} gradient - Ativa a coloração letra-a-letra
 * @param {string} className - Classes extra
 */
export default function TypewriterText({ text, startIndex = 0, gradient = false, className = "" }) {
  const chars = text.split('');
  
  return (
    <span className={className}>
      {chars.map((char, i) => {
        const style = gradient && char !== ' ' 
          ? { color: getGradientColor(i, chars.length) } 
          : {};
          
        return (
          <motion.span
            key={i}
            custom={startIndex + i}
            variants={letterVariants}
            className="inline-block"
            style={style}
          >
            {char === ' ' ? '\u00A0' : char}
          </motion.span>
        )
      })}
    </span>
  )
}
