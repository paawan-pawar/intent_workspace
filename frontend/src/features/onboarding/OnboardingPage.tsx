import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import * as LucideIcons from 'lucide-react'
import { apiService, Role } from '@/lib/api'
import { useUser } from '@/app/providers/UserProvider'
import { cn } from '@/lib/utils'

export function OnboardingPage() {
  const { setRole } = useUser()
  const navigate = useNavigate()
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)

  const { data: roles, isLoading, isError } = useQuery({
    queryKey: ['roles'],
    queryFn: apiService.getRoles,
  })

  const handleContinue = () => {
    if (selectedRole) {
      setRole(selectedRole)
      navigate('/workspace')
    }
  }

  const renderIcon = (iconName: string) => {
    // Convert generic names like 'code' to 'Code' (Lucide component names are PascalCase)
    const formattedName = iconName
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join('')
    
    // Fallback icon if not found
    const IconComponent = (LucideIcons as any)[formattedName] || LucideIcons.User
    
    return <IconComponent className="w-6 h-6" />
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen">
        <LucideIcons.Loader2 className="w-10 h-10 animate-spin text-brand-500 mb-4" />
        <p className="text-surface-600 font-medium">Loading professions...</p>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen">
        <div className="glass-card p-8 text-center max-w-md">
          <LucideIcons.AlertTriangle className="w-12 h-12 text-danger mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2 text-surface-900">Failed to load</h2>
          <p className="text-surface-600 mb-6">We couldn't load the professions list from the server.</p>
          <button 
            className="btn-primary w-full justify-center"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col p-6 max-w-6xl mx-auto">
      <header className="mb-10 text-center animate-slide-up">
        <h1 className="text-3xl font-bold text-surface-900 mb-3">Choose your profession</h1>
        <p className="text-surface-600 text-lg max-w-2xl mx-auto">
          Intent Workspace adapts entirely to what you do. Select your role below so we can configure your perfect dashboard.
        </p>
      </header>

      <main className="flex-1">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          {roles?.map((role) => {
            const isSelected = selectedRole?.id === role.id
            
            return (
              <button
                key={role.id}
                onClick={() => setSelectedRole(role)}
                className={cn(
                  "glass-card text-left p-6 transition-all duration-200 group relative border-2",
                  isSelected 
                    ? "border-brand-500 shadow-glow bg-brand-50/30" 
                    : "border-transparent hover:border-surface-300 hover:shadow-md"
                )}
              >
                {isSelected && (
                  <div className="absolute top-4 right-4 text-brand-500">
                    <LucideIcons.CheckCircle2 className="w-6 h-6" />
                  </div>
                )}
                
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors",
                  isSelected ? "bg-brand-500 text-white" : "bg-surface-100 text-surface-600 group-hover:text-brand-500 group-hover:bg-brand-50"
                )}>
                  {renderIcon(role.icon)}
                </div>
                
                <h3 className="text-lg font-bold text-surface-900 mb-2">{role.name}</h3>
                <p className="text-surface-600 text-sm mb-4 min-h-[40px]">
                  {role.description}
                </p>
                
                <div className="divider mb-4" />
                
                <div>
                  <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2 block">
                    Example Widgets
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {role.widgets.slice(0, 3).map((widget) => (
                      <span key={widget} className="badge bg-surface-100 text-surface-600 border border-surface-200">
                        {widget}
                      </span>
                    ))}
                    {role.widgets.length > 3 && (
                      <span className="badge bg-surface-50 text-surface-400 border border-surface-100">
                        +{role.widgets.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        <div className="mt-12 flex justify-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <button
            onClick={handleContinue}
            disabled={!selectedRole}
            className="btn-primary px-8 py-3 text-lg w-full max-w-sm justify-center shadow-md disabled:bg-surface-200 disabled:text-surface-400 disabled:shadow-none"
          >
            Continue to Workspace
            <LucideIcons.ArrowRight className="w-5 h-5 ml-2" />
          </button>
        </div>
      </main>
    </div>
  )
}
