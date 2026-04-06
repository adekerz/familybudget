interface FluxLogoProps {
  /** Высота иконки в px, текст масштабируется пропорционально */
  size?: number;
  className?: string;
}

/**
 * FluxLogo — icon + gradient text.
 * Не использует flux-logo.png с чёрным фоном.
 * На тёмной теме: cyan gradient text.
 * На светлой теме: solid #0284C7 (через CSS var).
 */
export function FluxLogo({ size = 32, className = '' }: FluxLogoProps) {
  const fontSize = Math.round(size * 0.56);
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img
        src="/icons/flux-icon.png"
        alt=""
        style={{ width: size, height: size, borderRadius: size * 0.25 }}
      />
      <span
        className="font-extrabold tracking-tight flux-gradient-text"
        style={{ fontSize }}
      >
        Flux
      </span>
    </div>
  );
}
