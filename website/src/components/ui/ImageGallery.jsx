import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, X, ZoomIn } from 'lucide-react'

export default function ImageGallery({ images = [] }) {
  const [current, setCurrent]     = useState(0)
  const [lightbox, setLightbox]   = useState(false)

  const prev = useCallback(() => setCurrent(i => (i - 1 + images.length) % images.length), [images.length])
  const next = useCallback(() => setCurrent(i => (i + 1) % images.length), [images.length])
  const open  = (idx) => { setCurrent(idx); setLightbox(true) }
  const close = () => setLightbox(false)

  useEffect(() => {
    if (!lightbox) return
    const handler = (e) => {
      if (e.key === 'ArrowLeft')  prev()
      if (e.key === 'ArrowRight') next()
      if (e.key === 'Escape')     close()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightbox, prev, next])

  if (images.length < 2) return null

  const img = images[current]

  return (
    <div className="mt-10">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">
        Galeria
      </h3>

      {/* Carousel */}
      <div className="relative rounded-2xl overflow-hidden bg-gray-100 aspect-[16/9] group">
        <img
          src={img.url}
          alt={img.legenda || `Foto ${current + 1}`}
          className="w-full h-full object-cover transition-opacity duration-300"
        />

        {/* Overlay click → lightbox */}
        <button
          onClick={() => open(current)}
          className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors duration-200"
          aria-label="Abrir em ecrã inteiro"
        >
          <ZoomIn size={32} className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 drop-shadow-lg" />
        </button>

        {/* Setas */}
        {images.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); prev() }}
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 transition-colors duration-200"
              aria-label="Anterior"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); next() }}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 transition-colors duration-200"
              aria-label="Próxima"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}

        {/* Legenda */}
        {img.legenda && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-4 py-3">
            <p className="text-white text-sm">{img.legenda}</p>
          </div>
        )}
      </div>

      {/* Dots */}
      <div className="flex justify-center gap-1.5 mt-3">
        {images.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`rounded-full transition-all duration-200 ${
              i === current
                ? 'w-5 h-2 bg-aintar-sky'
                : 'w-2 h-2 bg-gray-300 hover:bg-gray-400'
            }`}
            aria-label={`Foto ${i + 1}`}
          />
        ))}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={close}
        >
          <div
            className="relative max-w-5xl w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={img.url}
              alt={img.legenda || `Foto ${current + 1}`}
              className="w-full max-h-[85vh] object-contain rounded-xl"
            />

            {img.legenda && (
              <p className="text-white/80 text-sm text-center mt-3">{img.legenda}</p>
            )}

            {/* Contador */}
            <div className="absolute top-3 left-3 bg-black/50 text-white text-xs px-2.5 py-1 rounded-full">
              {current + 1} / {images.length}
            </div>

            {/* Fechar */}
            <button
              onClick={close}
              className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 transition-colors duration-200"
              aria-label="Fechar"
            >
              <X size={18} />
            </button>

            {/* Setas lightbox */}
            {images.length > 1 && (
              <>
                <button
                  onClick={prev}
                  className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors duration-200"
                  aria-label="Anterior"
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  onClick={next}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors duration-200"
                  aria-label="Próxima"
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
