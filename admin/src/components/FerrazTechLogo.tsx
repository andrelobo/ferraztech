interface Props {
  compact?: boolean
}

export function FerrazTechLogo({ compact = false }: Props) {
  return (
    <div
      aria-label="Logo Ferraz Tech"
      className={`ferraz-logo${compact ? ' ferraz-logo--compact' : ''}`}
    >
      <svg
        aria-hidden="true"
        className="ferraz-logo__symbol"
        viewBox="0 0 220 220"
      >
        <defs>
          <linearGradient id="ferraz-logo-silver" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="52%" stopColor="#cfd5dd" />
            <stop offset="100%" stopColor="#6f7a86" />
          </linearGradient>
          <linearGradient id="ferraz-logo-blue" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#55d2ff" />
            <stop offset="56%" stopColor="#008dff" />
            <stop offset="100%" stopColor="#0037ff" />
          </linearGradient>
          <filter id="ferraz-logo-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#139cff" floodOpacity="0.45" />
          </filter>
        </defs>

        <path
          d="M47 163C22 121 32 70 70 40c34-27 84-24 113 8"
          fill="none"
          stroke="url(#ferraz-logo-silver)"
          strokeLinecap="round"
          strokeWidth="11"
        />
        <path
          d="M96 49c16-26 36-34 59-33-2 24-18 42-48 44-7 0-12-5-11-11Z"
          fill="url(#ferraz-logo-blue)"
          filter="url(#ferraz-logo-glow)"
        />
        <path
          d="M69 77h94l-18 22H94l-8 13h44l-16 23H72l-17 45H24l45-103Z"
          fill="url(#ferraz-logo-silver)"
        />
        <path
          d="M114 112h77l-18 23h-24l-19 46h-33l18-46h-23z"
          fill="url(#ferraz-logo-blue)"
          filter="url(#ferraz-logo-glow)"
        />
        <path
          d="M94 66c29-8 72-3 98 10"
          fill="none"
          stroke="url(#ferraz-logo-blue)"
          strokeLinecap="round"
          strokeWidth="8"
          filter="url(#ferraz-logo-glow)"
        />
      </svg>

      <div className="ferraz-logo__wordmark">
        <span className="ferraz-logo__ferraz">FERRAZ</span>
        <span className="ferraz-logo__tech">TECH</span>
        {!compact && (
          <span className="ferraz-logo__tagline">DESBLOQUEIO DE IPHONE</span>
        )}
      </div>
    </div>
  )
}
