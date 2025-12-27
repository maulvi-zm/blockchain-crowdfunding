import type { ReactNode } from 'react'

import { COLORS } from '../../theme/colors'

type BadgeProps = {
  type?: 'success' | 'warning' | 'error' | 'primary'
  className?: string
  children: ReactNode
}

export function Badge({ type, className = '', children }: BadgeProps) {
  let style = 'bg-slate-100 text-slate-600'
  if (type === 'success') style = COLORS.success
  if (type === 'warning') style = COLORS.warning
  if (type === 'error') style = COLORS.error
  if (type === 'primary') style = `${COLORS.secondary} ${COLORS.accent}`

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${style} ${className}`}
    >
      {children}
    </span>
  )
}
