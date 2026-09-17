import { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost'

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const base =
    'rounded-lg px-4 py-2.5 font-body font-medium text-sm transition-colors disabled:opacity-40 disabled:pointer-events-none'
  const variants: Record<Variant, string> = {
    primary: 'bg-pitch text-night hover:bg-pitch-dim',
    secondary: 'bg-surface-raised text-chalk hover:bg-surface',
    ghost: 'bg-transparent text-mist hover:text-chalk',
  }
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />
}
