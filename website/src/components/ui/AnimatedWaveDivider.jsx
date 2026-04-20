import { motion } from 'framer-motion'

/**
 * AnimatedWaveDivider
 *
 * Props:
 *   fill    — cor da secção ABAIXO (a onda preenche para essa cor)
 *   bgColor — cor de fundo da própria div (cor da secção ACIMA). Default: transparent
 *   flip    — inverte verticalmente (quando a onda aponta para cima)
 *   height  — altura em px da zona de onda. Default: 90
 */
export default function AnimatedWaveDivider({
  fill = '#ffffff',
  bgColor = 'transparent',
  flip = false,
  height = 90,
  className = '',
}) {
  const h = height
  // Extra margin at bottom of SVG so the fill never shows a gap during vertical bob
  const svgH = h + 24

  // ── Caminhos irregulares para sensação de agitação real ──────────────────
  // Cada caminho cobre 2880px (2 períodos de 1440px) para loop sem costura.
  // Condição: y(0) = y(1440) = y(2880)

  // Camada traseira — amplos vaivéns, movimento lento
  const pathBg = [
    `M0,${h * 0.52}`,
    `C140,${h * 0.06} 310,${h * 0.92} 540,${h * 0.40}`,
    `C700,${h * 0.07} 880,${h * 0.88} 1080,${h * 0.58}`,
    `C1250,${h * 0.24} 1390,${h * 0.88} 1440,${h * 0.52}`,
    `C1580,${h * 0.06} 1750,${h * 0.92} 1980,${h * 0.40}`,
    `C2140,${h * 0.07} 2320,${h * 0.88} 2520,${h * 0.58}`,
    `C2690,${h * 0.24} 2830,${h * 0.88} 2880,${h * 0.52}`,
    `L2880,${svgH} L0,${svgH} Z`,
  ].join(' ')

  // Camada intermédia — ritmo diferente, dentes mais aguçados
  const pathMid = [
    `M0,${h * 0.60}`,
    `C170,${h * 0.22} 360,${h * 0.90} 580,${h * 0.48}`,
    `C750,${h * 0.16} 920,${h * 0.84} 1120,${h * 0.56}`,
    `C1270,${h * 0.24} 1410,${h * 0.84} 1440,${h * 0.60}`,
    `C1610,${h * 0.22} 1800,${h * 0.90} 2020,${h * 0.48}`,
    `C2190,${h * 0.16} 2360,${h * 0.84} 2560,${h * 0.56}`,
    `C2710,${h * 0.24} 2850,${h * 0.84} 2880,${h * 0.60}`,
    `L2880,${svgH} L0,${svgH} Z`,
  ].join(' ')

  // Camada principal — cristas acentuadas e irregulares
  const pathFront = [
    `M0,${h * 0.56}`,
    `C150,${h * 0.14} 300,${h * 0.86} 480,${h * 0.40}`,
    `C630,${h * 0.08} 780,${h * 0.82} 970,${h * 0.52}`,
    `C1110,${h * 0.18} 1300,${h * 0.90} 1440,${h * 0.56}`,
    `C1590,${h * 0.14} 1740,${h * 0.86} 1920,${h * 0.40}`,
    `C2070,${h * 0.08} 2220,${h * 0.82} 2410,${h * 0.52}`,
    `C2550,${h * 0.18} 2740,${h * 0.90} 2880,${h * 0.56}`,
    `L2880,${svgH} L0,${svgH} Z`,
  ].join(' ')

  // Camada superficial — pequenas rugas de agitação, movimento rápido
  const pathRipple = [
    `M0,${h * 0.66}`,
    `C80,${h * 0.52} 160,${h * 0.76} 280,${h * 0.63}`,
    `C380,${h * 0.50} 500,${h * 0.78} 640,${h * 0.65}`,
    `C760,${h * 0.52} 880,${h * 0.75} 1000,${h * 0.64}`,
    `C1110,${h * 0.51} 1300,${h * 0.77} 1440,${h * 0.66}`,
    `C1520,${h * 0.52} 1600,${h * 0.76} 1720,${h * 0.63}`,
    `C1820,${h * 0.50} 1940,${h * 0.78} 2080,${h * 0.65}`,
    `C2200,${h * 0.52} 2320,${h * 0.75} 2440,${h * 0.64}`,
    `C2550,${h * 0.51} 2740,${h * 0.77} 2880,${h * 0.66}`,
    `L2880,${svgH} L0,${svgH} Z`,
  ].join(' ')

  // ── Camadas: ordem traseira → frente ────────────────────────────────────
  // xDuration: velocidade de translação horizontal
  // xDir: normal (→ esquerda) | reverse (→ direita)
  // bobAmp: amplitude do bobbing vertical (px)
  // bobDur: período do bobbing (s)
  // bobDelay: desfasagem entre camadas para movimento assíncrono
  const layers = [
    { path: pathBg,     opacity: 0.20, xDuration: '20s', xDir: 'normal',  bobAmp: 8, bobDur: 5.4, bobDelay: 0 },
    { path: pathMid,    opacity: 0.45, xDuration: '12s', xDir: 'reverse', bobAmp: 6, bobDur: 3.9, bobDelay: 0.9 },
    { path: pathFront,  opacity: 1,    xDuration: '7s',  xDir: 'normal',  bobAmp: 4, bobDur: 2.7, bobDelay: 1.6 },
    { path: pathRipple, opacity: 0.55, xDuration: '4s',  xDir: 'reverse', bobAmp: 2, bobDur: 1.8, bobDelay: 0.4 },
  ]

  return (
    <div
      className={`relative overflow-hidden leading-none ${className}`}
      style={{
        height: `${height}px`,
        background: bgColor,
        transform: flip ? 'scaleY(-1)' : undefined,
        flexShrink: 0,
      }}
    >
      {layers.map((layer, i) => (
        /* Wrapper com bobbing vertical via Framer Motion */
        <motion.div
          key={i}
          className="absolute bottom-0 left-0 w-full"
          style={{ height: `${svgH}px` }}
          animate={{ y: [-layer.bobAmp, 0, layer.bobAmp, 0, -layer.bobAmp] }}
          transition={{
            duration: layer.bobDur,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: layer.bobDelay,
            times: [0, 0.25, 0.5, 0.75, 1],
          }}
        >
          {/* Inner div com translação horizontal via CSS animation */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: '200%',
              height: `${svgH}px`,
              animation: `wave ${layer.xDuration} linear infinite`,
              animationDirection: layer.xDir,
            }}
          >
            <svg
              viewBox={`0 0 2880 ${svgH}`}
              preserveAspectRatio="none"
              style={{ width: '100%', height: '100%', display: 'block' }}
            >
              <path fill={fill} fillOpacity={layer.opacity} d={layer.path} />
            </svg>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
