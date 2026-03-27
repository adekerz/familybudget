import { useBudgetSummary } from '../../store/useBudgetStore';
import { calcHealthScore } from '../../lib/budget';

function getScoreColor(score: number): string {
  if (score >= 80) return '#15664E';
  if (score >= 60) return '#7A5210';
  return '#9B2525';
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'Отлично';
  if (score >= 60) return 'Хорошо';
  if (score >= 40) return 'Внимание';
  return 'Критично';
}

export function HealthScoreCard() {
  const summary = useBudgetSummary();
  const score = calcHealthScore(summary);
  const color = getScoreColor(score);
  const label = getScoreLabel(score);

  // SVG дуга (полукруг)
  const r = 28;
  const cx = 36, cy = 36;
  const circumference = Math.PI * r;
  const progress = (score / 100) * circumference;

  return (
    <div className="bg-card border border-border rounded-2xl p-3 flex items-center gap-3">
      {/* Gauge */}
      <div className="relative shrink-0" style={{ width: 72, height: 44 }}>
        <svg width={72} height={44} viewBox="0 0 72 44">
          {/* Фон дуги */}
          <path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
            fill="none"
            stroke="var(--border)"
            strokeWidth="6"
            strokeLinecap="round"
          />
          {/* Прогресс */}
          <path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${progress} ${circumference}`}
            style={{ transition: 'stroke-dasharray 0.6s ease' }}
          />
        </svg>
        <div
          className="absolute bottom-0 left-0 right-0 text-center text-base font-bold font-sans leading-none"
          style={{ color }}
        >
          {score}
        </div>
      </div>

      <div className="min-w-0">
        <p className="text-xs text-muted uppercase tracking-wider font-sans">Здоровье бюджета</p>
        <p className="text-sm font-bold font-sans" style={{ color }}>{label}</p>
        <p className="text-[10px] text-muted font-sans">{score}/100</p>
      </div>
    </div>
  );
}
