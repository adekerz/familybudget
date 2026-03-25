import { Sparkles, RefreshCw } from 'lucide-react'

interface AIInsightCardProps {
  insight: string | null
  isLoading?: boolean
  onRefresh?: () => void
  className?: string
}

export function AIInsightCard({ insight, isLoading, onRefresh, className = '' }: AIInsightCardProps) {
  if (!insight && !isLoading) return null

  return (
    <div className={`bg-accent-light border border-accent/20 rounded-2xl px-4 py-3 ${className}`}>
      <div className="flex items-start gap-2.5">
        <div className="w-6 h-6 rounded-lg bg-accent flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles size={12} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <div className="space-y-1.5">
              <div className="skeleton h-3 w-full rounded" />
              <div className="skeleton h-3 w-3/4 rounded" />
            </div>
          ) : (
            <p className="text-xs text-ink leading-relaxed">{insight}</p>
          )}
        </div>
        {onRefresh && !isLoading && (
          <button
            onClick={onRefresh}
            className="text-muted hover:text-accent transition-colors p-0.5 shrink-0"
            title="Обновить"
          >
            <RefreshCw size={12} />
          </button>
        )}
      </div>
    </div>
  )
}
