import { forwardRef } from 'react'

const Input = forwardRef(({ label, error, className = '', ...props }, ref) => (
  <div className="flex flex-col gap-1">
    {label && <label className="text-xs font-medium text-slate-600">{label}</label>}
    <input
      ref={ref}
      className={`h-9 w-full rounded-md border px-3 text-sm bg-white
        placeholder:text-slate-400 transition-colors
        focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
        disabled:bg-slate-50 disabled:text-slate-400
        ${error ? 'border-red-400' : 'border-slate-300'}
        ${className}`}
      {...props}
    />
    {error && <span className="text-xs text-red-500">{error}</span>}
  </div>
))
Input.displayName = 'Input'
export default Input
