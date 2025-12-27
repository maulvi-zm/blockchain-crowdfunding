import { COLORS } from '../../theme/colors'

type ProgressBarProps = {
  percent: number
  className?: string
}

export function ProgressBar({ percent, className = '' }: ProgressBarProps) {
  return (
    <div className={`w-full h-3 bg-slate-100 rounded-full overflow-hidden ${className}`}>
      <div
        className={`h-full ${COLORS.primary} transition-all duration-1000 ease-out`}
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}
