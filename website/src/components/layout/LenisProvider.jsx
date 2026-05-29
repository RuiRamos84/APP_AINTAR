import { createContext, useContext, useEffect, useRef } from 'react'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const LenisCtx = createContext(null)
export const useLenis = () => useContext(LenisCtx)

export default function LenisProvider({ children }) {
  const lenisRef = useRef(null)

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      smoothWheel: true,
    })
    lenisRef.current = lenis

    // Connect Lenis scroll events → GSAP ScrollTrigger stays in sync
    lenis.on('scroll', ScrollTrigger.update)

    function onTick(time) {
      lenis.raf(time * 1000)
    }
    gsap.ticker.add(onTick)
    gsap.ticker.lagSmoothing(0)

    function onFullscreenChange() {
      if (document.fullscreenElement) {
        lenis.stop()
      } else {
        lenis.start()
      }
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)

    return () => {
      gsap.ticker.remove(onTick)
      document.removeEventListener('fullscreenchange', onFullscreenChange)
      lenis.destroy()
    }
  }, [])

  return (
    <LenisCtx.Provider value={lenisRef}>
      {children}
    </LenisCtx.Provider>
  )
}
