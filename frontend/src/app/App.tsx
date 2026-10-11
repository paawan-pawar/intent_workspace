import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { StatusIndicator } from '@/components/StatusIndicator'
import { UserProvider } from '@/app/providers/UserProvider'
import { ToastProvider } from '@/app/providers/ToastProvider'
import { OnboardingPage } from '@/features/onboarding/OnboardingPage'
import { WorkspacePage } from '@/features/workspace/WorkspacePage'
import { ProfilePage } from '@/features/profile/ProfilePage'
import { AuthPage } from '@/features/auth/AuthPage'
import { ArrowRight, LogIn, Sparkles } from 'lucide-react'
import { IntentLogo } from '@/features/auth/components/IntentLogo'
// Home page component
function Home() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen flex flex-col bg-surface-50 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 inset-x-0 h-[500px] bg-gradient-to-b from-brand-100/50 to-transparent pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-400 rounded-full opacity-10 blur-[100px] pointer-events-none" />
      {/* Top Navbar */}
      <nav className="w-full max-w-6xl mx-auto px-6 py-5 flex items-center justify-between relative z-20">
        <IntentLogo size="md" showText subtitle="Adaptive Productivity Workspace" />
      </nav>
      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
        <div className="flex flex-col items-center text-center gap-6 mb-12 max-w-2xl animate-slide-up">
          <div className="w-16 h-16 rounded-2xl bg-gradient-brand p-0.5 shadow-md mb-2 hover-lift">
            <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
              <IntentLogo size="sm" />
            </div>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-brand-100 text-brand-800 border border-brand-200">
            <Sparkles className="w-3.5 h-3.5 text-brand-600" />
            <span>Adaptive Workspace Platform</span>
          </div>
          <h1 className="text-5xl font-bold tracking-tight text-surface-900 mb-2">
            Intent Workspace
          </h1>
          <p className="text-xl text-surface-600 max-w-lg mx-auto leading-relaxed">
            An AI-powered adaptive professional workspace that organizes meetings, tasks, notes, and messages around your intent.
          </p>
          {/* Centered action buttons */}
          <div className="mt-4 flex flex-col items-center justify-center gap-4 w-full">
            <button
              onClick={() => navigate('/login')}
              className="btn-primary shadow-lg shadow-brand-500/20 text-lg px-8 py-3"
            >
              <LogIn className="w-5 h-5 mr-1" />
              <span>Sign In to Workspace</span>
              <ArrowRight className="w-5 h-5 ml-1" />
            </button>
            <button
              onClick={() => navigate('/signup')}
              className="btn-ghost text-base px-6 py-3 border border-surface-300 bg-white"
            >
              Get Started
            </button>
          </div>
        </div>
        {/* API Status */}
        <div
          className="w-full animate-slide-up"
          style={{ animationDelay: '0.1s' }}
        >
          <StatusIndicator />
        </div>
      </main>
      {/* Footer */}
      <footer className="py-6 text-center text-sm text-surface-500 relative z-10 border-t border-surface-200 bg-white/50 backdrop-blur-sm">
        <p>
          Intent Workspace Prototype &copy; {new Date().getFullYear()} — Built with AI-driven adaptive design
        </p>
      </footer>
    </div>
  )
}
function App() {
  return (
    <ToastProvider>
      <UserProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/login" element={<AuthPage />} />
            <Route path="/signup" element={<AuthPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/workspace" element={<WorkspacePage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="*" element={<WorkspacePage />} />
          </Routes>
        </BrowserRouter>
      </UserProvider>
    </ToastProvider>
  )
}
export default App