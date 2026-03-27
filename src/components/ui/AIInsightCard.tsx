import { useState, useEffect } from 'react'
import { Sparkle } from '@phosphor-icons/react'

const CACHE_TTL = 2 * 60 * 60 * 1000

interface AIInsightCardProps {
  insight: string | null
  isLoading?: boolean
  insightAt?: number | null
  className?: string
}

function CircularProgress({ insightAt }: { insightAt: number }) {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  const elapsed = now - insightAt
  const progress = Math.min(elapsed / CACHE_TTL, 1)

  const r = 5
  const size = 14
  const cx = size / 2
  const circumference = 2 * Math.PI * r
  // dashoffset: полный = пусто, 0 = заполнен
  const dashoffset = circumference * (1 - progress)

  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90" aria-hidden>
      {/* трек */}
      <circle
        cx={cx} cy={cx} r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        className="text-accent/20"
      />
      {/* прогресс */}
      <circle
        cx={cx} cy={cx} r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeDasharray={circumference}
        strokeDashoffset={dashoffset}
        strokeLinecap="round"
        className="text-accent transition-all duration-500"
      />
    </svg>
  )
}

export function AIInsightCard({ insight, isLoading, insightAt, className = '' }: AIInsightCardProps) {
  if (!insight && !isLoading) return null

  return (
    <div className={`bg-accent-light border border-accent/20 rounded-2xl px-4 py-3 ${className}`}>
      <div className="flex items-start gap-2.5">
        <div className="w-6 h-6 rounded-lg bg-accent flex items-center justify-center shrink-0 mt-0.5">
          <Sparkle size={12} className="text-white" />
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
        {insightAt && !isLoading && (
          <div className="mt-0.5">
            <CircularProgress insightAt={insightAt} />
          </div>
        )}
      </div>
    </div>
  )
}
