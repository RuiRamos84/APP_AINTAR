/**
 * WaveDivider — onda animada de transição entre secções escuras e claras.
 *
 * direction="down"  → secção escura acima, clara abaixo (ex: pé de secção dark)
 * direction="up"    → secção clara acima, escura abaixo (ex: cabeça de secção dark)
 * color             → cor de preenchimento sólido (deve casar com o fundo da secção adjacente)
 */
export default function WaveDivider({ direction = 'down', color = '#ffffff' }) {
  const isDown = direction === 'down'

  // Cor semi-transparente para a camada de fundo
  // converte hex para rgba com 30% de opacidade
  const hexToRgba = (hex, alpha) => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r},${g},${b},${alpha})`
  }
  const colorFaint = hexToRgba(color, 0.35)

  const layer1Path = isDown
    // preenche para baixo (dark → light)
    ? 'M0,32 C180,52 360,12 540,32 C720,52 900,12 1080,32 C1260,52 1440,12 1620,32 C1800,52 1980,12 2160,32 C2340,52 2520,12 2700,32 L2880,32 L2880,64 L0,64 Z'
    // preenche para cima (light → dark)
    : 'M0,32 C180,12 360,52 540,32 C720,12 900,52 1080,32 C1260,12 1440,52 1620,32 C1800,12 1980,52 2160,32 C2340,12 2520,52 2700,32 L2880,32 L2880,0 L0,0 Z'

  const layer2Path = isDown
    ? 'M0,24 C240,48 480,8 720,24 C960,40 1200,8 1440,24 C1680,40 1920,8 2160,24 C2400,40 2640,8 2880,24 L2880,64 L0,64 Z'
    : 'M0,40 C240,16 480,56 720,40 C960,16 1200,56 1440,40 C1680,16 1920,56 2160,40 C2400,16 2640,56 2880,40 L2880,0 L0,0 Z'

  const pos = isDown ? 'bottom-0' : 'top-0'

  return (
    <div className={`absolute left-0 right-0 h-16 overflow-hidden pointer-events-none ${pos}`}>

      {/* Camada 1 — semi-transparente */}
      <div
        className={`absolute left-0 h-full ${pos}`}
        style={{
          width: '200%',
          animationName: 'waveSlide',
          animationDuration: '12s',
          animationTimingFunction: 'linear',
          animationIterationCount: 'infinite',
          animationDirection: isDown ? 'normal' : 'reverse',
        }}
      >
        <svg viewBox="0 0 2880 64" xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none" className="w-full h-full">
          <path d={layer1Path} fill={colorFaint} />
        </svg>
      </div>

      {/* Camada 2 — cor sólida */}
      <div
        className={`absolute left-0 h-full ${pos}`}
        style={{
          width: '200%',
          animationName: 'waveSlide',
          animationDuration: '8s',
          animationTimingFunction: 'linear',
          animationIterationCount: 'infinite',
          animationDirection: isDown ? 'reverse' : 'normal',
        }}
      >
        <svg viewBox="0 0 2880 64" xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none" className="w-full h-full">
          <path d={layer2Path} fill={color} />
        </svg>
      </div>

    </div>
  )
}
