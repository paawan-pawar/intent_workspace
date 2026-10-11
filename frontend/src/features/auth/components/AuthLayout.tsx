import React from 'react'
import { AuthBrandPanel } from './AuthBrandPanel'
import { IntentLogo } from './IntentLogo'

interface AuthLayoutProps {
  children: React.ReactNode
  splitScreen?: boolean
  currentScreen?: 'login' | 'signup' | 'otp' | 'forgot'
  onSwitchScreen?: (screen: 'login' | 'signup' | 'otp' | 'forgot') => void
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  splitScreen = true,
  currentScreen,
  onSwitchScreen,
}) => {
  const showQuickFlowSwitcher = Boolean(
    onSwitchScreen && currentScreen !== 'login' && currentScreen !== 'signup',
  )

  return (
    <div className="min-h-screen w-full bg-surface-50 flex flex-col justify-between selection:bg-brand-500 selection:text-white">
      {/* Top utility bar with quick screen switcher tabs for demo/testing */}
      <header className="w-full bg-white/90 backdrop-blur border-b border-surface-200 px-4 sm:px-8 py-2.5 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-3">
          <IntentLogo size="sm" showText />
          <span className="hidden md:inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-surface-100 text-surface-600 border border-surface-200">
            Auth Flow Demo
          </span>
        </div>

        {/* Quick flow switcher tabs */}
        {showQuickFlowSwitcher && (
          <div className="flex items-center gap-1 bg-surface-100/90 p-1 rounded-xl border border-surface-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => onSwitchScreen?.('login')}
              className={`px-3 py-1 rounded-lg transition-all ${
                currentScreen === 'login'
                  ? 'bg-white text-brand-700 shadow-sm font-bold'
                  : 'text-surface-600 hover:text-surface-900'
              }`}
            >
              1. Sign In
            </button>
            <button
              type="button"
              onClick={() => onSwitchScreen?.('signup')}
              className={`px-3 py-1 rounded-lg transition-all ${
                currentScreen === 'signup'
                  ? 'bg-white text-brand-700 shadow-sm font-bold'
                  : 'text-surface-600 hover:text-surface-900'
              }`}
            >
              2. Sign Up
            </button>
            <button
              type="button"
              onClick={() => onSwitchScreen?.('otp')}
              className={`px-3 py-1 rounded-lg transition-all ${
                currentScreen === 'otp'
                  ? 'bg-white text-brand-700 shadow-sm font-bold'
                  : 'text-surface-600 hover:text-surface-900'
              }`}
            >
              3. OTP Verify
            </button>
            <button
              type="button"
              onClick={() => onSwitchScreen?.('forgot')}
              className={`px-3 py-1 rounded-lg transition-all ${
                currentScreen === 'forgot'
                  ? 'bg-white text-brand-700 shadow-sm font-bold'
                  : 'text-surface-600 hover:text-surface-900'
              }`}
            >
              4. Reset
            </button>
          </div>
        )}
      </header>

      {/* Main Flow Content Container */}
      <main className="flex-1 flex flex-col items-center justify-center">
        {splitScreen ? (
          <div className="w-full h-full flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-[calc(100vh-53px)]">
            {/* Left brand panel (5 columns on large screens) */}
            <div className="hidden lg:block lg:col-span-5 xl:col-span-5 h-full">
              <AuthBrandPanel />
            </div>

            {/* Right auth panel (7 columns on large screens) */}
            <div className="col-span-1 lg:col-span-7 xl:col-span-7 flex flex-col items-center justify-center p-4 sm:p-8 lg:p-12 relative overflow-y-auto">
              {/* Subtle ambient light */}
              <div className="absolute top-10 right-10 w-72 h-72 rounded-full bg-brand-100/40 blur-3xl pointer-events-none -z-10" />
              <div className="w-full max-w-md py-6 my-auto">
                {children}
              </div>
            </div>
          </div>
        ) : (
          /* Centered Single Card (Used for OTP screen as requested) */
          <div className="w-full flex-1 flex flex-col items-center justify-center p-4 sm:p-8 relative">
            <div className="absolute top-12 -left-12 w-80 h-80 rounded-full bg-brand-100/40 blur-3xl pointer-events-none -z-10" />
            <div className="absolute bottom-12 -right-12 w-80 h-80 rounded-full bg-indigo-100/30 blur-3xl pointer-events-none -z-10" />
            <div className="w-full max-w-md my-auto">
              {children}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
