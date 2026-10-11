import React, { useState } from 'react'
import { IntentLogo } from './IntentLogo'
import { Loader2, AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, ShieldAlert } from 'lucide-react'

interface ForgotPasswordCardProps {
  onBackToLogin: () => void
}

export const ForgotPasswordCard: React.FC<ForgotPasswordCardProps> = ({
  onBackToLogin,
}) => {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setEmailError(null)

    if (!email.trim()) {
      setEmailError('Please enter your email address.')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError('Please enter a valid email address.')
      return
    }

    setIsLoading(true)

    // Simulate reset link dispatch
    setTimeout(() => {
      setIsLoading(false)
      setIsSubmitted(true)
    }, 700)
  }

  return (
    <div className="w-full bg-white rounded-3xl border border-surface-200/90 shadow-xl shadow-surface-300/20 p-7 sm:p-9 transition-all animate-fade-in">
      {/* Top Center App Icon */}
      <div className="flex flex-col items-center text-center mb-6">
        <IntentLogo size="lg" />
        <h1 className="mt-4 text-2xl sm:text-3xl font-extrabold text-surface-900 tracking-tight">
          Reset your password
        </h1>
        <p className="mt-1 text-sm text-surface-500 font-medium">
          Enter your email and we’ll send you a reset link.
        </p>
      </div>

      {isSubmitted ? (
        /* Success Confirmation State */
        <div className="space-y-6 text-center animate-slide-up">
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm flex items-start gap-3 text-left">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-emerald-950">
                Check your inbox
              </p>
              <p className="text-emerald-800 text-xs mt-1 leading-relaxed">
                If an account exists for <span className="font-semibold">{email}</span>, we’ve sent a reset link.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-50 border border-surface-200/80 text-xs text-surface-600 flex items-center justify-center gap-2">
            <ShieldAlert className="w-4 h-4 text-brand-600 shrink-0" />
            <span>For your security, reset links expire after 15 minutes.</span>
          </div>

          <button
            type="button"
            onClick={onBackToLogin}
            className="w-full py-3 px-5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm shadow-md shadow-brand-500/25 transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to sign in</span>
          </button>
        </div>
      ) : (
        /* Form State */
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <div>
            <label
              htmlFor="reset-email"
              className="block text-xs font-bold uppercase tracking-wider text-surface-700 mb-1.5"
            >
              Work Email
            </label>
            <input
              id="reset-email"
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

          {/* Security Note */}
          <div className="p-3 rounded-xl bg-surface-50 border border-surface-200 text-xs text-surface-600 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-brand-600 shrink-0" />
            <span>For your security, reset links expire after 15 minutes.</span>
          </div>

          {/* Primary Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-5 rounded-xl bg-brand-600 hover:bg-brand-500 active:bg-brand-700 text-white font-semibold text-sm shadow-md shadow-brand-500/25 transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Sending link...</span>
              </>
            ) : (
              <>
                <span>Send reset link</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Back to sign-in link */}
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={onBackToLogin}
              className="text-xs text-surface-600 hover:text-surface-900 font-bold inline-flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
