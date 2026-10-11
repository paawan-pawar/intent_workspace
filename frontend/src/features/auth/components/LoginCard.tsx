import React, { useState } from 'react'
import { IntentLogo } from './IntentLogo'
import { Eye, EyeOff, Loader2, AlertCircle, ArrowRight } from 'lucide-react'
import { signInWithEmail } from '@/lib/firebase'

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

    try {
      const user = await signInWithEmail(email.trim(), password)
      setIsLoading(false)
      onLoginSuccess(user.email ?? email.trim())
    } catch (error) {
      setIsLoading(false)
      setGeneralError(error instanceof Error ? error.message : 'Unable to sign in. Please try again.')
    }
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

      </form>

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
