import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { StatusIndicator } from '@/components/StatusIndicator'
import { UserProvider, useUser } from '@/app/providers/UserProvider'
import { ToastProvider } from '@/app/providers/ToastProvider'
import { OnboardingPage } from '@/features/onboarding/OnboardingPage'
import { WorkspacePage } from '@/features/workspace/WorkspacePage'
import { ArrowRight } from 'lucide-react'

// Home page component
function Home() {
  const navigate = useNavigate()
  const { role } = useUser()

  return (
    <div className="min-h-screen flex flex-col bg-surface-50 relative overflow-hidden">
      {/* Background decorations - light theme variations */}
      <div className="absolute top-0 inset-x-0 h-[500px] bg-gradient-to-b from-brand-100/50 to-transparent pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-400 rounded-full opacity-10 blur-[100px] pointer-events-none" />
      
      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
        <div className="flex flex-col items-center text-center gap-6 mb-12 max-w-2xl animate-slide-up">
          <div className="w-16 h-16 rounded-2xl bg-gradient-brand p-0.5 shadow-md mb-4 hover-lift">
            <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
              <svg className="w-8 h-8 text-brand-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          <h1 className="text-5xl font-bold tracking-tight text-surface-900 mb-2">
            Intent Workspace
          </h1>
          <p className="text-xl text-surface-600 max-w-lg mx-auto leading-relaxed">
            An AI-powered adaptive professional workspace that learns your workflow.
          </p>

          <div className="mt-4 flex gap-4">
            <button 
              onClick={() => navigate(role ? '/workspace' : '/onboarding')}
              className="btn-primary shadow-lg shadow-brand-500/20 text-lg px-8 py-3"
            >
              {role ? 'Go to Workspace' : 'Get Started'}
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="w-full animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <StatusIndicator />
        </div>
      </main>
      
      {/* Footer */}
      <footer className="py-6 text-center text-sm text-surface-500 relative z-10 border-t border-surface-200 bg-white/50 backdrop-blur-sm">
        <p>Intent Workspace Prototype &copy; {new Date().getFullYear()}</p>
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
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/workspace" element={<WorkspacePage />} />
            <Route path="*" element={<WorkspacePage />} />
          </Routes>
        </BrowserRouter>
      </UserProvider>
    </ToastProvider>
  )
}

export default App
