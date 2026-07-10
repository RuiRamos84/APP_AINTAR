/**
 * Placeholder de carregamento para rotas com code-splitting (React.lazy + Suspense).
 * Minimalista e coerente com a identidade visual do site.
 */
export default function RouteFallback() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 rounded-full border-2 border-aintar-sky/30 border-t-aintar-sky animate-spin" />
        <span className="text-sm text-gray-400">A carregar…</span>
      </div>
    </div>
  )
}
