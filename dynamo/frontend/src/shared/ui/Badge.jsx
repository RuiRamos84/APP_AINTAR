const colours = {
  default: 'bg-slate-100 text-slate-700',
  green:   'bg-emerald-100 text-emerald-700',
  red:     'bg-red-100 text-red-700',
  yellow:  'bg-amber-100 text-amber-700',
  blue:    'bg-blue-100 text-blue-700',
}

export default function Badge({ children, colour = 'default', className = '' }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colours[colour]} ${className}`}>
      {children}
    </span>
  )
}
