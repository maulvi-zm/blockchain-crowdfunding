import type { ReactNode } from 'react'

import { COLORS } from '../../theme/colors'

type ButtonProps = {
  children: ReactNode
  primary?: boolean
  outline?: boolean
  className?: string
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
}

export function Button({
  children,
  primary = false,
  outline = false,
  className = '',
  onClick,
  type = 'button',
}: ButtonProps) {
  const baseStyle =
    'px-6 py-3 rounded-full font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-md active:scale-95'
  const variantStyle = primary
    ? `${COLORS.primary} text-white ${COLORS.primaryHover}`
    : outline
      ? 'bg-white border-2 border-teal-700 text-teal-700 hover:bg-teal-50'
      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'

  return (
    <button type={type} onClick={onClick} className={`${baseStyle} ${variantStyle} ${className}`}>
      {children}
    </button>
  )
}
