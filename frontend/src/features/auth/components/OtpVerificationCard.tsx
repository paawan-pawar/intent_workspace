import React, { useState, useEffect, useRef } from 'react'
import { IntentLogo } from './IntentLogo'
import { Loader2, AlertCircle, CheckCircle2, RotateCw, ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react'

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
  // Pre-fill with prototype demo code '123456' as requested, but allow user to change or paste
  const [digits, setDigits] = useState<string[]>(['1', '2', '3', '4', '5', '6'])
  const [countdown, setCountdown] = useState(30)
  const [canResend, setCanResend] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Resend Countdown Timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    } else {
      setCanResend(true)
    }
  }, [countdown])

  // Handle single digit input
  const handleChange = (index: number, val: string) => {
    setError(null)
    const cleanVal = val.replace(/\D/g, '')

    if (!cleanVal) {
      // User erased
      const newDigits = [...digits]
      newDigits[index] = ''
      setDigits(newDigits)
      return
    }

    // Single digit entry
    const char = cleanVal.slice(-1)
    const newDigits = [...digits]
    newDigits[index] = char
    setDigits(newDigits)

    // Move to next box
    if (index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  // Handle Backspace navigation
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus()
      }
    }
  }

  // Handle Paste of complete 6-digit code
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    setError(null)
    const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasteData) return

    const newDigits = [...digits]
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasteData[i] || ''
    }
    setDigits(newDigits)

    const nextFocus = Math.min(pasteData.length, 5)
    inputRefs.current[nextFocus]?.focus()
  }

  const handleVerify = () => {
    const code = digits.join('')
    if (code.length < 6 || digits.some((d) => d === '')) {
      setError('Please enter the complete 6-digit code.')
      return
    }

    setIsLoading(true)
    setError(null)

    // Simulate OTP verification
    setTimeout(() => {
      setIsLoading(false)
      setIsSuccess(true)

      // Transition after success state
      setTimeout(() => {
        onVerifySuccess()
      }, 1200)
    }, 700)
  }

  const handleResend = () => {
    if (!canResend) return
    setCountdown(30)
    setCanResend(false)
    setError(null)
    setDigits(['', '', '', '', '', ''])
    inputRefs.current[0]?.focus()
  }

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60)
    const remaining = secs % 60
    return `${String(mins).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`
  }

  return (
    <div className="w-full bg-white rounded-3xl border border-surface-200/90 shadow-xl shadow-surface-300/20 p-7 sm:p-10 transition-all animate-fade-in text-center">
      {/* Visual Anchor App Icon above heading */}
      <div className="flex flex-col items-center mb-6">
        <IntentLogo size="lg" />
        <h1 className="mt-4 text-2xl sm:text-3xl font-extrabold text-surface-900 tracking-tight">
          Verify your email
        </h1>
        <p className="mt-1.5 text-sm text-surface-600 max-w-xs mx-auto leading-relaxed">
          We sent a 6-digit code to{' '}
          <span className="font-semibold text-surface-900">{email}</span>. Enter it below to continue.
        </p>
      </div>

      {/* Success banner */}
      {isSuccess && (
        <div
          role="status"
          className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm flex items-center justify-center gap-3 animate-slide-up"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-bold">Email verified. Setting up your workspace…</span>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div
          role="alert"
          className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 animate-slide-up"
        >
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 6-Digit OTP Inputs */}
      <div className="my-6">
        <div className="flex justify-center items-center gap-2 sm:gap-3" onPaste={handlePaste}>
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              disabled={isLoading || isSuccess}
              className={`w-11 h-13 sm:w-13 sm:h-16 text-center text-xl sm:text-2xl font-bold font-mono rounded-xl sm:rounded-2xl border transition-all duration-150 focus:outline-none focus:ring-2 ${
                error
                  ? 'border-red-400 focus:border-red-500 focus:ring-red-200/60 bg-red-50/20'
                  : digit
                  ? 'border-brand-500 bg-brand-50/20 text-surface-900 ring-1 ring-brand-500/30'
                  : 'border-surface-300 bg-surface-50 text-surface-900 focus:border-brand-500 focus:ring-brand-500/20 focus:bg-white'
              } disabled:opacity-60 disabled:cursor-not-allowed`}
              aria-label={`Digit ${index + 1}`}
            />
          ))}
        </div>

        {/* Demo Mode Helper Note */}
        <p className="mt-4 text-xs font-medium text-surface-500 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-brand-600" />
          <span>Demo mode: enter any 6-digit code or keep prefilled “123456” to continue.</span>
        </p>
      </div>

      {/* Primary Verification Button */}
      <button
        type="button"
        onClick={handleVerify}
        disabled={isLoading || isSuccess}
        className="w-full py-3 px-5 rounded-xl bg-brand-600 hover:bg-brand-500 active:bg-brand-700 text-white font-semibold text-sm shadow-md shadow-brand-500/25 transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Verifying code...</span>
          </>
        ) : isSuccess ? (
          <>
            <CheckCircle2 className="w-4 h-4" />
            <span>Success! Launching...</span>
          </>
        ) : (
          <>
            <span>Verify and continue</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>

      {/* Resend Code with Countdown Timer */}
      <div className="mt-6 flex flex-col items-center gap-2 text-xs text-surface-500 font-medium">
        <div>
          Didn’t receive the code?{' '}
          {canResend ? (
            <button
              type="button"
              onClick={handleResend}
              className="font-bold text-brand-600 hover:text-brand-700 hover:underline inline-flex items-center gap-1"
            >
              <RotateCw className="w-3 h-3" /> Resend code
            </button>
          ) : (
            <span className="font-semibold text-surface-700">
              Resend code in {formatTimer(countdown)}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onBackToLogin}
          className="mt-2 text-surface-500 hover:text-surface-900 inline-flex items-center gap-1 font-semibold transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
        </button>
      </div>
    </div>
  )
}
