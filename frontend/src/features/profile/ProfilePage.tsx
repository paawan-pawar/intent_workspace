import { ArrowLeft, BriefcaseBusiness, CheckCircle2, Mail, User } from 'lucide-react'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '@/app/providers/UserProvider'

export function ProfilePage() {
  const { role } = useUser()
  const navigate = useNavigate()

  useEffect(() => {
    if (!role) navigate('/onboarding')
  }, [role, navigate])

  if (!role) return null

  return (
    <div className="min-h-screen bg-surface-50 text-surface-900">
      <header className="border-b border-surface-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <button
            type="button"
            onClick={() => navigate('/workspace')}
            className="inline-flex items-center gap-2 text-sm font-semibold text-surface-600 transition-colors hover:text-surface-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to workspace
          </button>
          <span className="text-sm font-bold text-surface-900">Profile</span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <section className="rounded-2xl border border-surface-200 bg-white p-8 shadow-card sm:p-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
              <User className="h-10 w-10" />
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-brand-600">Personal profile</p>
              <h1 className="text-3xl font-bold text-surface-900">Prototype User</h1>
              <p className="mt-2 flex items-center gap-2 text-surface-600">
                <Mail className="h-4 w-4" />
                alex.chen@intent.workspace
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-surface-200 bg-white p-6 shadow-card">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <BriefcaseBusiness className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-bold text-surface-900">Current role</h2>
                <p className="text-sm text-surface-500">Your workspace is tailored to this role.</p>
              </div>
            </div>
            <h3 className="text-xl font-bold text-surface-900">{role.name}</h3>
            <p className="mt-2 text-sm leading-relaxed text-surface-600">{role.description}</p>
          </div>

          <div className="rounded-2xl border border-surface-200 bg-white p-6 shadow-card">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-bold text-surface-900">Workspace focus</h2>
                <p className="text-sm text-surface-500">Widgets currently available to you.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {role.widgets.map((widget) => (
                <span key={widget} className="rounded-md border border-surface-200 bg-surface-50 px-3 py-1.5 text-sm text-surface-600">
                  {widget}
                </span>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
