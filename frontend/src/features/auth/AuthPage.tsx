import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthLayout } from './components/AuthLayout'
import { LoginCard } from './components/LoginCard'
import { SignupCard } from './components/SignupCard'
import { OtpVerificationCard } from './components/OtpVerificationCard'
import { ForgotPasswordCard } from './components/ForgotPasswordCard'
import { useUser } from '@/app/providers/UserProvider'
import { useToast } from '@/app/providers/ToastProvider'

export type AuthScreenType = 'login' | 'signup' | 'otp' | 'forgot'

export const AuthPage: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<AuthScreenType>('login')
  const [pendingEmail, setPendingEmail] = useState('alex.chen@intent.workspace')
  const [pendingProfession, setPendingProfession] = useState('Software Engineer')
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
    setPendingProfession(data.profession)
    showToast('Account created. Please verify your email.')
    setCurrentScreen('otp')
  }

  // Handler for successful OTP verification -> proceeds to onboarding / workspace
  const handleOtpSuccess = () => {
    showToast('Email verified! Initializing your workspace...')
    // Map chosen profession to initial role
    const professionSlugMap: Record<string, { id: string; name: string; description: string; icon: string; widgets: string[] }> = {
      'Software Engineer': {
        id: 'software-engineer',
        name: 'Software Engineer',
        description: 'Code, review, and deploy with complete visibility.',
        icon: 'code',
        widgets: ['sprint board', 'assigned tickets', 'pull requests', 'incidents', 'calendar', 'messages']
      },
      'Doctor': {
        id: 'doctor',
        name: 'Doctor',
        description: 'Focus on patient care with an organized daily schedule.',
        icon: 'stethoscope',
        widgets: ['patient schedule', 'appointments', 'lab results', 'prescriptions', 'notes', 'messages']
      },
      'Trader': {
        id: 'trader',
        name: 'Trader',
        description: 'Monitor the markets and manage your portfolios in real-time.',
        icon: 'trending-up',
        widgets: ['market watch', 'portfolio', 'watchlist', 'risk alerts', 'news', 'calendar']
      },
      'Salesperson': {
        id: 'salesperson',
        name: 'Salesperson',
        description: 'Track leads, close deals, and hit your quotas.',
        icon: 'briefcase',
        widgets: ['lead pipeline', 'recent contacts', 'tasks', 'meeting notes', 'performance metrics', 'inbox']
      },
      'Project Manager': {
        id: 'project-manager',
        name: 'Project Manager',
        description: 'Keep teams aligned and deliver projects on time.',
        icon: 'kanban',
        widgets: ['project roadmap', 'team velocity', 'blockers', 'milestones', 'resource allocation', 'updates']
      },
      'Student': {
        id: 'student',
        name: 'Student',
        description: 'Manage assignments, exams, and study schedules.',
        icon: 'graduation-cap',
        widgets: ['class schedule', 'assignments due', 'grades', 'study timer', 'notes', 'university news']
      },
      'Other': {
        id: 'software-engineer',
        name: 'Software Engineer',
        description: 'Code, review, and deploy with complete visibility.',
        icon: 'code',
        widgets: ['sprint board', 'assigned tickets', 'pull requests', 'incidents', 'calendar', 'messages']
      }
    }

    const fallbackRole = professionSlugMap['Software Engineer']!
    const matchedRole = professionSlugMap[pendingProfession] || fallbackRole
    setRole(matchedRole)
    navigate('/workspace')
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
