import React, { useState } from 'react'
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Mail, RefreshCw, ShieldCheck } from 'lucide-react'
import { IntentLogo } from './IntentLogo'
import { refreshVerifiedUser, resendVerificationEmail } from '@/lib/firebase'

interface OtpVerificationCardProps {
  email?: string
  onVerifySuccess: () => void
  onBackToLogin: () => void
}

export const OtpVerificationCard: React.FC<OtpVerificationCardProps> = ({
  email = 'name@example.com',
  onVerifySuccess,
  onBackToLogin,
}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const handleCheckVerification = async () => {
    setIsLoading(true)
    setError(null)
    setMessage(null)

    try {
      await refreshVerifiedUser()
      onVerifySuccess()
    } catch (verificationError) {
      setError(verificationError instanceof Error ? verificationError.message : 'Unable to check email verification.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResend = async () => {
    setIsResending(true)
    setError(null)
    setMessage(null)

    try {
      await resendVerificationEmail()
      setMessage('A new verification link has been sent. Check your Gmail inbox and spam folder.')
    } catch (resendError) {
      setError(resendError instanceof Error ? resendError.message : 'Unable to resend the verification email.')
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="w-full rounded-3xl border border-surface-200/90 bg-white p-7 text-center shadow-xl shadow-surface-300/20 transition-all animate-fade-in sm:p-10">
      <div className="mb-6 flex flex-col items-center">
        <IntentLogo size="lg" />
        <div className="mt-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
          <Mail className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-surface-900 sm:text-3xl">
          Verify your email
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-surface-600">
          We sent a verification link to <span className="font-semibold text-surface-900">{email}</span>. Open it in Gmail, then return here.
        </p>
      </div>

      {error && (
        <div role="alert" className="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5 text-left text-sm font-medium text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {message && (
        <div role="status" className="mb-5 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-left text-sm font-medium text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          <span>{message}</span>
        </div>
      )}

      <div className="mb-6 flex items-center gap-2 rounded-xl border border-surface-200 bg-surface-50 p-3 text-left text-xs leading-relaxed text-surface-600">
        <ShieldCheck className="h-4 w-4 shrink-0 text-brand-600" />
        <span>The link is handled securely by Firebase and does not expose your password.</span>
      </div>

      <button
        type="button"
        onClick={handleCheckVerification}
        disabled={isLoading || isResending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition-all hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
        {isLoading ? 'Checking verification...' : 'I verified my email'}
      </button>

      <button
        type="button"
        onClick={handleResend}
        disabled={isLoading || isResending}
        className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-brand-600 transition-colors hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${isResending ? 'animate-spin' : ''}`} />
        {isResending ? 'Sending new link...' : 'Resend verification link'}
      </button>

      <button
        type="button"
        onClick={onBackToLogin}
        className="mt-6 flex w-full items-center justify-center gap-1.5 text-xs font-bold text-surface-600 transition-colors hover:text-surface-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to sign in
      </button>
    </div>
  )
}
