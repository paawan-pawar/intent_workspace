import React, { useState } from 'react'
import { IntentLogo } from './IntentLogo'
import { Eye, EyeOff, Loader2, AlertCircle, ArrowRight } from 'lucide-react'
import { signUpWithEmail } from '@/lib/firebase'

interface SignupCardProps {
  onNavigateToLogin: () => void
  onSignupSuccess: (data: { email: string; name: string; profession: string }) => void
}

export const PROFESSION_OPTIONS = [
  'Software Engineer',
  'Doctor',
  'Trader',
  'Salesperson',
  'Project Manager',
  'Student',
  'Other',
]

export const SignupCard: React.FC<SignupCardProps> = ({
  onNavigateToLogin,
  onSignupSuccess,
}) => {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [profession, setProfession] = useState('Software Engineer')
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Field error messages
  const [nameError, setNameError] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [termsError, setTermsError] = useState<string | null>(null)
  const [generalError, setGeneralError] = useState<string | null>(null)

  // Password strength calculation (0 to 4)
  const calculateStrength = (pwd: string): { score: number; label: string; color: string } => {
    if (!pwd) return { score: 0, label: 'Empty', color: 'bg-surface-200' }
    let score = 0
    if (pwd.length >= 8) score += 1
    if (/[A-Z]/.test(pwd)) score += 1
    if (/[0-9]/.test(pwd)) score += 1
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1

    if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-amber-400' }
    if (score === 2) return { score: 2, label: 'Fair', color: 'bg-yellow-400' }
    if (score === 3) return { score: 3, label: 'Good', color: 'bg-blue-500' }
    return { score: 4, label: 'Strong', color: 'bg-emerald-500' }
  }

  const strength = calculateStrength(password)

  const validate = (): boolean => {
    let isValid = true
    setNameError(null)
    setEmailError(null)
    setPasswordError(null)
    setConfirmError(null)
    setTermsError(null)
    setGeneralError(null)

    if (!fullName.trim()) {
      setNameError('Full name is required.')
      isValid = false
    }

    if (!email.trim()) {
      setEmailError('Work email is required.')
      isValid = false
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError('Please enter a valid work email.')
      isValid = false
    }

    if (!password) {
      setPasswordError('Password is required.')
      isValid = false
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters.')
      isValid = false
    }

    if (!confirmPassword) {
      setConfirmError('Please confirm your password.')
      isValid = false
    } else if (password !== confirmPassword) {
      setConfirmError('Passwords do not match.')
      isValid = false
    }

    if (!agreeTerms) {
      setTermsError('You must accept the Terms and Privacy Policy to continue.')
      isValid = false
    }

    return isValid
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsLoading(true)

    try {
      await signUpWithEmail(email.trim(), password, fullName.trim())
      setIsLoading(false)
      onSignupSuccess({ email, name: fullName, profession })
    } catch (error) {
      setIsLoading(false)
      setGeneralError(error instanceof Error ? error.message : 'Unable to create your account. Please try again.')
    }
  }

  return (
    <div className="w-full bg-white rounded-3xl border border-surface-200/90 shadow-xl shadow-surface-300/20 p-7 sm:p-9 transition-all animate-fade-in">
      {/* Top Center App Icon */}
      <div className="flex flex-col items-center text-center mb-6">
        <IntentLogo size="lg" />
        <h1 className="mt-4 text-2xl sm:text-3xl font-extrabold text-surface-900 tracking-tight">
          Create your workspace
        </h1>
        <p className="mt-1 text-sm text-surface-500 font-medium">
          Tell us a little about yourself so we can personalize your dashboard.
        </p>
      </div>

      {generalError && (
        <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm font-medium text-red-700">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{generalError}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Full Name */}
        <div>
          <label
            htmlFor="signup-name"
            className="block text-xs font-bold uppercase tracking-wider text-surface-700 mb-1"
          >
            Full Name
          </label>
          <input
            id="signup-name"
            type="text"
            autoComplete="name"
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value)
              if (nameError) setNameError(null)
            }}
            placeholder="Jordan Patel"
            disabled={isLoading}
            className={`w-full px-4 py-2.5 rounded-xl border text-sm text-surface-900 placeholder:text-surface-400 bg-white transition-all focus:outline-none focus:ring-2 ${
              nameError
                ? 'border-red-400 focus:border-red-500 focus:ring-red-200/60 bg-red-50/20'
                : 'border-surface-300 focus:border-brand-500 focus:ring-brand-500/20'
            }`}
          />
          {nameError && (
            <p className="mt-1 text-xs text-red-600 font-medium flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {nameError}
            </p>
          )}
        </div>

        {/* Work Email */}
        <div>
          <label
            htmlFor="signup-email"
            className="block text-xs font-bold uppercase tracking-wider text-surface-700 mb-1"
          >
            Work Email
          </label>
          <input
            id="signup-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              if (emailError) setEmailError(null)
            }}
            placeholder="jordan@work.corp"
            disabled={isLoading}
            className={`w-full px-4 py-2.5 rounded-xl border text-sm text-surface-900 placeholder:text-surface-400 bg-white transition-all focus:outline-none focus:ring-2 ${
              emailError
                ? 'border-red-400 focus:border-red-500 focus:ring-red-200/60 bg-red-50/20'
                : 'border-surface-300 focus:border-brand-500 focus:ring-brand-500/20'
            }`}
          />
          {emailError && (
            <p className="mt-1 text-xs text-red-600 font-medium flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {emailError}
            </p>
          )}
        </div>

        {/* Profession Selector */}
        <div>
          <label
            htmlFor="signup-profession"
            className="block text-xs font-bold uppercase tracking-wider text-surface-700 mb-1"
          >
            Profession
          </label>
          <div className="relative">
            <select
              id="signup-profession"
              value={profession}
              onChange={(e) => setProfession(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-2.5 rounded-xl border border-surface-300 text-sm text-surface-900 bg-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 appearance-none font-medium cursor-pointer"
            >
              {PROFESSION_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            {/* Custom select arrow */}
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-surface-400 text-xs">
              ▼
            </div>
          </div>
          <p className="mt-1.5 text-xs text-surface-500 leading-normal">
            We’ll use this to suggest a starting dashboard. You can change it anytime.
          </p>
        </div>

        {/* Password & Strength Indicator */}
        <div>
          <label
            htmlFor="signup-password"
            className="block text-xs font-bold uppercase tracking-wider text-surface-700 mb-1"
          >
            Password
          </label>
          <div className="relative">
            <input
              id="signup-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (passwordError) setPasswordError(null)
              }}
              placeholder="At least 6 characters"
              disabled={isLoading}
              className={`w-full px-4 py-2.5 pr-11 rounded-xl border text-sm text-surface-900 placeholder:text-surface-400 bg-white transition-all focus:outline-none focus:ring-2 ${
                passwordError
                  ? 'border-red-400 focus:border-red-500 focus:ring-red-200/60 bg-red-50/20'
                  : 'border-surface-300 focus:border-brand-500 focus:ring-brand-500/20'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-700 p-1"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Password Strength Meter */}
          {password && (
            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between text-[11px] font-semibold text-surface-500">
                <span>Strength</span>
                <span className={strength.score >= 3 ? 'text-emerald-600' : 'text-amber-600'}>
                  {strength.label}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1 h-1.5 w-full bg-surface-100 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    strength.score >= 1 ? strength.color : 'bg-transparent'
                  }`}
                />
                <div
                  className={`h-full transition-all ${
                    strength.score >= 2 ? strength.color : 'bg-transparent'
                  }`}
                />
                <div
                  className={`h-full transition-all ${
                    strength.score >= 3 ? strength.color : 'bg-transparent'
                  }`}
                />
                <div
                  className={`h-full transition-all ${
                    strength.score >= 4 ? strength.color : 'bg-transparent'
                  }`}
                />
              </div>
            </div>
          )}

          {passwordError && (
            <p className="mt-1 text-xs text-red-600 font-medium flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {passwordError}
            </p>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label
            htmlFor="signup-confirm-password"
            className="block text-xs font-bold uppercase tracking-wider text-surface-700 mb-1"
          >
            Confirm Password
          </label>
          <input
            id="signup-confirm-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value)
              if (confirmError) setConfirmError(null)
            }}
            placeholder="Re-enter password"
            disabled={isLoading}
            className={`w-full px-4 py-2.5 rounded-xl border text-sm text-surface-900 placeholder:text-surface-400 bg-white transition-all focus:outline-none focus:ring-2 ${
              confirmError
                ? 'border-red-400 focus:border-red-500 focus:ring-red-200/60 bg-red-50/20'
                : 'border-surface-300 focus:border-brand-500 focus:ring-brand-500/20'
            }`}
          />
          {confirmError && (
            <p className="mt-1 text-xs text-red-600 font-medium flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {confirmError}
            </p>
          )}
        </div>

        {/* Terms Checkbox */}
        <div className="pt-1">
          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={agreeTerms}
              onChange={(e) => {
                setAgreeTerms(e.target.checked)
                if (termsError) setTermsError(null)
              }}
              disabled={isLoading}
              className="mt-0.5 w-4 h-4 rounded text-brand-600 border-surface-300 focus:ring-brand-500/20 focus:outline-none"
            />
            <span className="text-xs text-surface-600 leading-snug">
              I agree to the{' '}
              <a href="#terms" onClick={(e) => e.preventDefault()} className="font-semibold text-brand-600 hover:underline">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#privacy" onClick={(e) => e.preventDefault()} className="font-semibold text-brand-600 hover:underline">
                Privacy Policy
              </a>
              .
            </span>
          </label>
          {termsError && (
            <p className="mt-1 text-xs text-red-600 font-medium flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {termsError}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full mt-3 py-3 px-5 rounded-xl bg-brand-600 hover:bg-brand-500 active:bg-brand-700 text-white font-semibold text-sm shadow-md shadow-brand-500/25 transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Creating your workspace...</span>
            </>
          ) : (
            <>
              <span>Create account</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Footer Link */}
      <div className="mt-6 text-center text-xs text-surface-500 font-medium">
        Already have an account?{' '}
        <button
          type="button"
          onClick={onNavigateToLogin}
          className="font-bold text-brand-600 hover:text-brand-700 hover:underline transition-colors"
        >
          Sign in
        </button>
      </div>
    </div>
  )
}
