import React from 'react'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  secondaryActionLabel?: string
  onSecondaryAction?: () => void
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 rounded-ios bg-white/70 border border-warm-200/80 shadow-soft-sm ${className}`}
    >
      {icon && (
        <div className="w-14 h-14 rounded-2xl bg-warm-100 flex items-center justify-center text-warm-700 mb-4 shadow-inner">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-warm-900 mb-1 font-display">{title}</h3>
      {description && (
        <p className="text-sm text-warm-700/80 max-w-sm mb-6 leading-relaxed">
          {description}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            type="button"
            className="px-4 py-2 rounded-xl bg-warm-800 hover:bg-warm-900 active:scale-95 text-white text-sm font-medium shadow-soft-sm transition-all"
          >
            {actionLabel}
          </button>
        )}
        {secondaryActionLabel && onSecondaryAction && (
          <button
            onClick={onSecondaryAction}
            type="button"
            className="px-4 py-2 rounded-xl bg-warm-100 hover:bg-warm-200 active:scale-95 text-warm-800 text-sm font-medium transition-all"
          >
            {secondaryActionLabel}
          </button>
        )}
      </div>
    </div>
  )
}
