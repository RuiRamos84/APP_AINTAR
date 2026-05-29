import { forwardRef } from 'react'

const variants = {
  primary:   'bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800',
  secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50',
  danger:    'bg-red-600 text-white hover:bg-red-700',
  ghost:     'text-slate-600 hover:bg-slate-100',
}
const sizes = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-9 px-4 text-sm gap-2',
  lg: 'h-10 px-5 text-sm gap-2',
}

const Button = forwardRef(({ variant = 'primary', size = 'md', className = '', disabled, children, ...props }, ref) => (
  <button
    ref={ref}
    disabled={disabled}
    className={`inline-flex items-center justify-center font-medium rounded-md transition-colors
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
      disabled:opacity-50 disabled:pointer-events-none
      ${variants[variant]} ${sizes[size]} ${className}`}
    {...props}
  >
    {children}
  </button>
))
Button.displayName = 'Button'
export default Button
