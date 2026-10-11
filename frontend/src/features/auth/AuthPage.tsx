import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AuthLayout } from './components/AuthLayout'
import { LoginCard } from './components/LoginCard'
import { SignupCard } from './components/SignupCard'
import { OtpVerificationCard } from './components/OtpVerificationCard'
import { ForgotPasswordCard } from './components/ForgotPasswordCard'
import { useUser } from '@/app/providers/UserProvider'
import { useToast } from '@/app/providers/ToastProvider'

export type AuthScreenType = 'login' | 'signup' | 'otp' | 'forgot'

export const AuthPage: React.FC = () => {
  const location = useLocation()
  const [currentScreen, setCurrentScreen] = useState<AuthScreenType>(
    location.pathname === '/signup' ? 'signup' : 'login',
  )
  const [pendingEmail, setPendingEmail] = useState('alex.chen@intent.workspace')
  const { setRole } = useUser()
  const { showToast } = useToast()
  const navigate = useNavigate()

  // Handler for successful login
  const handleLoginSuccess = (email: string) => {
    showToast(`Welcome back, ${email.split('@')[0]}!`)
    const saved = localStorage.getItem('intent-workspace-role')
    let existingRole = null
    try {
      if (saved) existingRole = JSON.parse(saved)
    } catch (e) {}

    if (!existingRole || existingRole.id === 'swe' || !existingRole.id) {
      const defaultRole = {
        id: 'software-engineer',
        name: 'Software Engineer',
        description: 'Code, review, and deploy with complete visibility.',
        icon: 'code',
        widgets: ['sprint board', 'assigned tickets', 'pull requests', 'incidents', 'calendar', 'messages']
      }
      setRole(defaultRole)
    }
    navigate('/workspace')
  }

  // Handler for successful signup -> proceeds to Screen 3 OTP Verification
  const handleSignupSuccess = (data: { email: string; name: string; profession: string }) => {
    setPendingEmail(data.email)
    showToast('Account created. Please verify your email.')
    setCurrentScreen('otp')
  }

  // Handler for successful OTP verification -> proceeds to onboarding / workspace
  const handleOtpSuccess = () => {
    showToast('Email verified! Let us set up your workspace.')
    navigate('/onboarding')
  }

  return (
    <AuthLayout
      currentScreen={currentScreen}
      onSwitchScreen={(screen) => setCurrentScreen(screen)}
      splitScreen={currentScreen !== 'otp'} // Screen 3 OTP is centered focused card as requested
    >
      {currentScreen === 'login' && (
        <LoginCard
          onNavigateToSignup={() => setCurrentScreen('signup')}
          onNavigateToForgot={() => setCurrentScreen('forgot')}
          onLoginSuccess={handleLoginSuccess}
        />
      )}

      {currentScreen === 'signup' && (
        <SignupCard
          onNavigateToLogin={() => setCurrentScreen('login')}
          onSignupSuccess={handleSignupSuccess}
        />
      )}

      {currentScreen === 'otp' && (
        <OtpVerificationCard
          email={pendingEmail}
          onVerifySuccess={handleOtpSuccess}
          onBackToLogin={() => setCurrentScreen('login')}
        />
      )}

      {currentScreen === 'forgot' && (
        <ForgotPasswordCard
          onBackToLogin={() => setCurrentScreen('login')}
        />
      )}
    </AuthLayout>
  )
}
