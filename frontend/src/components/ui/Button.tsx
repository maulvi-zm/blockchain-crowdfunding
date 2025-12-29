import type { ReactNode, ButtonHTMLAttributes } from 'react'
import { COLORS } from '../../theme/colors'

export type ButtonProps = {
  children: ReactNode
  primary?: boolean
  outline?: boolean
  className?: string
} & ButtonHTMLAttributes<HTMLButtonElement>

export function Button({
  children,
  primary = false,
  outline = false,
  className = '',
  ...props
}: ButtonProps) {
  const baseStyle =
    'px-6 py-3 rounded-full font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-sm disabled:active:scale-100'

  const variantStyle = primary
    ? `${COLORS.primary} text-white ${COLORS.primaryHover}`
    : outline
      ? 'bg-white border-2 border-teal-700 text-teal-700 hover:bg-teal-50'
      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'

  return (
    <button
      {...props}
      className={`${baseStyle} ${variantStyle} ${className}`}
    >
      {children}
    </button>
  )
}
