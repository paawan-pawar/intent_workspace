import React from 'react'

interface IntentLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  showText?: boolean
  subtitle?: string
}

export const IntentLogo: React.FC<IntentLogoProps> = ({
  size = 'md',
  className = '',
  showText = false,
  subtitle,
}) => {
  const sizeMap = {
    sm: { box: 'w-8 h-8 rounded-lg', icon: 'w-4 h-4', text: 'text-base', sub: 'text-xs' },
    md: { box: 'w-11 h-11 rounded-xl', icon: 'w-6 h-6', text: 'text-lg', sub: 'text-xs' },
    lg: { box: 'w-14 h-14 rounded-2xl', icon: 'w-7 h-7', text: 'text-xl', sub: 'text-sm' },
    xl: { box: 'w-16 h-16 rounded-2xl', icon: 'w-8 h-8', text: 'text-2xl', sub: 'text-sm' },
  }

  const { box, icon, text, sub } = sizeMap[size]

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* Visual Anchor App Icon: rounded square combining spark, adaptive dashboard grid, and focus symbol */}
      <div
        className={`${box} relative flex items-center justify-center bg-gradient-to-br from-brand-600 via-brand-700 to-indigo-900 shadow-md shadow-brand-500/25 ring-1 ring-white/20 transition-transform duration-200 hover:scale-[1.03] group`}
      >
        {/* Subtle inner highlight */}
        <div className="absolute inset-0 rounded-[inherit] bg-gradient-to-t from-transparent via-white/5 to-white/25 pointer-events-none" />

        {/* Distinctive custom SVG combining spark, dashboard grid & adaptive center mark */}
        <svg
          className={`${icon} text-white transition-transform duration-300 group-hover:rotate-6`}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Adaptive dashboard grid cells with rounded corners */}
          <rect x="3.5" y="3.5" width="7" height="7" rx="2" className="fill-white/80" />
          <rect x="13.5" y="3.5" width="7" height="7" rx="2" className="fill-brand-200" />
          <rect x="3.5" y="13.5" width="7" height="7" rx="2" className="fill-brand-300" />

          {/* AI Spark mark in the fourth quadrant */}
          <path
            d="M17 12.5C17 14.5 17.8 15.2 19.8 15.2C17.8 15.2 17 15.9 17 17.9C17 15.9 16.2 15.2 14.2 15.2C16.2 15.2 17 14.5 17 12.5Z"
            className="fill-white drop-shadow-[0_0_4px_rgba(255,255,255,0.8)]"
          />
          {/* Tiny companion spark */}
          <circle cx="14" cy="18.5" r="0.9" className="fill-brand-100" />
          <circle cx="19.5" cy="19" r="0.8" className="fill-brand-200" />
        </svg>

        {/* Outer ambient glow pulse */}
        <div className="absolute -inset-1 rounded-[inherit] bg-brand-500/20 blur-sm -z-10 group-hover:bg-brand-500/35 transition-colors" />
      </div>

      {showText && (
        <div className="flex flex-col text-left">
          <span className={`${text} font-bold tracking-tight text-surface-900 leading-none`}>
            Intent <span className="text-brand-600 font-semibold">Workspace</span>
          </span>
          {subtitle && (
            <span className={`${sub} text-surface-500 font-medium mt-1 leading-tight`}>
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
