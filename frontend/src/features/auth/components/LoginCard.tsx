import React, { useState } from 'react'
import { IntentLogo } from './IntentLogo'
import { Eye, EyeOff, Loader2, AlertCircle, ArrowRight, Sparkles } from 'lucide-react'

interface LoginCardProps {
  onNavigateToSignup: () => void
  onNavigateToForgot: () => void
  onLoginSuccess: (email: string) => void
}

export const LoginCard: React.FC<LoginCardProps> = ({
  onNavigateToSignup,
  onNavigateToForgot,
  onLoginSuccess,
}) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Validation states
  const [emailError, setEmailError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [generalError, setGeneralError] = useState<string | null>(null)

  const validate = (): boolean => {
    let isValid = true;
    setEmailError(null)
    setPasswordError(null)
    setGeneralError(null)

    if (!email.trim()) {
      setEmailError('Please enter your email address.')
      isValid = false
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError('Please enter a valid email address.')
      isValid = false
    }

    if (!password) {
      setPasswordError('Please enter your password.')
      isValid = false
    }

    return isValid
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsLoading(true)
    setGeneralError(null)

    // Simulate authentication call
    setTimeout(() => {
      setIsLoading(false)
      // Realistic simulation: if wrong demo credential entered, show friendly non-alarming banner
      if (email.includes('fail') || password === 'wrong') {
        setGeneralError('Incorrect email or password. Please try again.')
      } else {
        onLoginSuccess(email)
      }
    }, 750)
  }

  const handleDemoLogin = (roleEmail = 'alex.chen@intent.workspace') => {
    setEmail(roleEmail)
    setPassword('••••••••••••')
    setEmailError(null)
    setPasswordError(null)
    setGeneralError(null)
    setIsLoading(true)

    setTimeout(() => {
      setIsLoading(false)
      onLoginSuccess(roleEmail)
    }, 550)
  }

  return (
    <div className="w-full bg-white rounded-3xl border border-surface-200/90 shadow-xl shadow-surface-300/20 p-7 sm:p-9 transition-all animate-fade-in">
      {/* Top Center App Icon */}
      <div className="flex flex-col items-center text-center mb-6">
        <IntentLogo size="lg" />
        <h1 className="mt-4 text-2xl sm:text-3xl font-extrabold text-surface-900 tracking-tight">
          Welcome back
        </h1>
        <p className="mt-1 text-sm text-surface-500 font-medium">
          Sign in to continue to your workspace.
        </p>
      </div>

      {/* Accessible Error Banner */}
      {generalError && (
        <div
          role="alert"
          className="mb-5 p-3.5 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-900 text-sm flex items-start gap-3 animate-slide-up"
        >
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium leading-snug">{generalError}</div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Email Field */}
        <div>
          <label
            htmlFor="login-email"
            className="block text-xs font-bold uppercase tracking-wider text-surface-700 mb-1.5"
          >
            Work Email
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              if (emailError) setEmailError(null)
            }}
            placeholder="alex@company.com"
            disabled={isLoading}
            className={`w-full px-4 py-3 rounded-xl border text-sm text-surface-900 placeholder:text-surface-400 bg-white transition-all focus:outline-none focus:ring-2 ${
              emailError
                ? 'border-red-400 focus:border-red-500 focus:ring-red-200/60 bg-red-50/20'
                : 'border-surface-300 focus:border-brand-500 focus:ring-brand-500/20'
            } disabled:opacity-60 disabled:cursor-not-allowed`}
          />
          {emailError && (
            <p className="mt-1.5 text-xs text-red-600 font-medium flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {emailError}
            </p>
          )}
        </div>

        {/* Password Field */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="login-password"
              className="block text-xs font-bold uppercase tracking-wider text-surface-700"
            >
              Password
            </label>
            <button
              type="button"
              onClick={onNavigateToForgot}
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline transition-colors"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (passwordError) setPasswordError(null)
              }}
              placeholder="••••••••••••"
              disabled={isLoading}
              className={`w-full px-4 py-3 pr-11 rounded-xl border text-sm text-surface-900 placeholder:text-surface-400 bg-white transition-all focus:outline-none focus:ring-2 ${
                passwordError
                  ? 'border-red-400 focus:border-red-500 focus:ring-red-200/60 bg-red-50/20'
                  : 'border-surface-300 focus:border-brand-500 focus:ring-brand-500/20'
              } disabled:opacity-60 disabled:cursor-not-allowed`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-700 p-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400/40"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {passwordError && (
            <p className="mt-1.5 text-xs text-red-600 font-medium flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {passwordError}
            </p>
          )}
        </div>

        {/* Primary Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full mt-2 py-3 px-5 rounded-xl bg-brand-600 hover:bg-brand-500 active:bg-brand-700 text-white font-semibold text-sm shadow-md shadow-brand-500/25 transition-all duration-150 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Signing in...</span>
            </>
          ) : (
            <>
              <span>Sign in</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        {/* Prototype Demo Login Button */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => handleDemoLogin()}
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-xl border border-brand-200/80 bg-brand-50/60 hover:bg-brand-100/60 text-brand-800 text-xs font-bold transition-all flex items-center justify-center gap-2 group"
          >
            <Sparkles className="w-3.5 h-3.5 text-brand-600 group-hover:rotate-12 transition-transform" />
            <span>⚡ Instant Demo Access (1-Click Prototype Login)</span>
          </button>
        </div>
      </form>

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-surface-200" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-3 text-surface-400 font-semibold tracking-wider">
            or continue with
          </span>
        </div>
      </div>

      {/* Social / SSO Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => handleDemoLogin('google.user@intent.workspace')}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-surface-200 bg-white hover:bg-surface-50 text-surface-700 text-xs font-semibold shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-400/30"
        >
          {/* Google SVG */}
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Google</span>
        </button>

        <button
          type="button"
          onClick={() => handleDemoLogin('microsoft.user@intent.workspace')}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-surface-200 bg-white hover:bg-surface-50 text-surface-700 text-xs font-semibold shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-400/30"
        >
          {/* Microsoft SVG */}
          <svg className="w-4 h-4" viewBox="0 0 23 23">
            <path fill="#f35325" d="M1 1h10v10H1z" />
            <path fill="#81bc06" d="M12 1h10v10H12z" />
            <path fill="#05a6f0" d="M1 12h10v10H1z" />
            <path fill="#ffba08" d="M12 12h10v10H12z" />
          </svg>
          <span>Microsoft</span>
        </button>
      </div>

      {/* Footer Link */}
      <div className="mt-8 text-center text-xs text-surface-500 font-medium">
        New to Intent Workspace?{' '}
        <button
          type="button"
          onClick={onNavigateToSignup}
          className="font-bold text-brand-600 hover:text-brand-700 hover:underline transition-colors"
        >
          Create an account
        </button>
      </div>
    </div>
  )
}
