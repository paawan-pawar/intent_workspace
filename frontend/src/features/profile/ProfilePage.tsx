import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  BriefcaseBusiness,
  CheckCircle2,
  Mail,
  User,
  LogOut,
  Settings,
  Shield,
  Bell,
  Sparkles,
  Palette,
  Clock,
  MapPin,
  RefreshCw,
  AlertCircle,
  Check,
  RotateCcw,
  Monitor,
  Sun,
  Moon,
  Lock,
  ShieldCheck,
  Code,
  Stethoscope,
  TrendingUp,
  Briefcase,
  Kanban,
  GraduationCap,
  Save
} from 'lucide-react'
import { useUser, UserProfile } from '@/app/providers/UserProvider'
import { useToast } from '@/app/providers/ToastProvider'
import { apiService, Role } from '@/lib/api'
import { sendResetEmail } from '@/lib/firebase'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

type TabType = 'profile' | 'role' | 'preferences' | 'ai' | 'notifications' | 'security'

const AVATAR_COLORS = [
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#f43f5e', // Rose
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#3b82f6', // Blue
]

const TIMEZONES = [
  'Asia/Kolkata (GMT+5:30)',
  'America/New_York (EST / GMT-5)',
  'America/Los_Angeles (PST / GMT-8)',
  'America/Chicago (CST / GMT-6)',
  'Europe/London (GMT+0)',
  'Europe/Paris (CET / GMT+1)',
  'Europe/Berlin (CET / GMT+1)',
  'Asia/Tokyo (JST / GMT+9)',
  'Asia/Singapore (SGT / GMT+8)',
  'Australia/Sydney (AEST / GMT+10)',
]

export function ProfilePage() {
  const { role, setRole, profile, updateProfile, logout, isFirebaseUser } = useUser()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState<TabType>('profile')
  const [isSaving, setIsSaving] = useState(false)
  const [isSendingReset, setIsSendingReset] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [showRoleModal, setShowRoleModal] = useState(false)

  // Local form state initialized from profile
  const [formData, setFormData] = useState<UserProfile>(profile)
  const [hasChanges, setHasChanges] = useState(false)

  // Load available roles from API
  const { data: availableRoles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: apiService.getRoles,
  })

  useEffect(() => {
    if (!role) {
      navigate('/onboarding')
    }
  }, [role, navigate])

  useEffect(() => {
    setFormData(profile)
    setHasChanges(false)
  }, [profile])

  const handleFieldChange = <K extends keyof UserProfile>(field: K, value: UserProfile[K]) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value }
      setHasChanges(true)
      return next
    })
  }

  const handleSaveChanges = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setIsSaving(true)
    try {
      await updateProfile(formData)
      setHasChanges(false)
      showToast('Profile and settings saved successfully!')
    } catch (err) {
      showToast('Failed to save profile changes.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSendPasswordReset = async () => {
    if (!formData.email) {
      showToast('No email address provided.')
      return
    }
    setIsSendingReset(true)
    try {
      await sendResetEmail(formData.email)
      showToast(`Password reset link sent to ${formData.email}`)
    } catch (err: any) {
      showToast(err?.message || 'Failed to send reset email. Ensure Firebase is configured.')
    } finally {
      setIsSendingReset(false)
    }
  }

  const handleConfirmLogout = async () => {
    setShowLogoutModal(false)
    showToast('Signed out of Intent Workspace.')
    await logout()
    navigate('/login')
  }

  const handleSwitchRole = (newRole: Role) => {
    setRole(newRole)
    setShowRoleModal(false)
    showToast(`Switched active role to ${newRole.name}!`)
  }

  const handleResetLayout = () => {
    try {
      localStorage.removeItem(`intent-dashboard-layout-${role?.id}`)
      showToast('Dashboard layout reset to role defaults.')
    } catch (e) {
      showToast('Failed to reset layout.')
    }
  }

  const renderRoleIcon = (iconName: string) => {
    switch (iconName) {
      case 'code':
        return <Code className="w-5 h-5" />
      case 'stethoscope':
        return <Stethoscope className="w-5 h-5" />
      case 'trending-up':
        return <TrendingUp className="w-5 h-5" />
      case 'briefcase':
        return <Briefcase className="w-5 h-5" />
      case 'kanban':
        return <Kanban className="w-5 h-5" />
      case 'graduation-cap':
        return <GraduationCap className="w-5 h-5" />
      default:
        return <BriefcaseBusiness className="w-5 h-5" />
    }
  }

  if (!role) return null

  return (
    <div className="min-h-screen bg-surface-50 text-surface-900 pb-20">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-surface-200/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/workspace')}
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-surface-600 transition-colors hover:bg-surface-100 hover:text-surface-900"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to workspace</span>
            </button>
            <div className="hidden h-5 w-[1px] bg-surface-200 sm:block" />
            <span className="hidden text-sm font-bold text-surface-800 sm:inline-flex items-center gap-2">
              <Settings className="w-4 h-4 text-brand-600" />
              Account & Settings
            </span>
          </div>

          <div className="flex items-center gap-3">
            {hasChanges && (
              <Button
                size="sm"
                variant="primary"
                onClick={handleSaveChanges}
                disabled={isSaving}
                className="gap-2 shadow-sm animate-pulse-glow"
              >
                {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Changes
              </Button>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowLogoutModal(true)}
              className="gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
            >
              <LogOut className="h-4 w-4" />
              <span>Log out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pt-8">
        {/* Profile Hero Header Card */}
        <section className="relative overflow-hidden rounded-3xl border border-surface-200 bg-white p-6 sm:p-8 shadow-card">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 h-64 w-64 rounded-full bg-gradient-to-br from-brand-100/60 to-purple-100/40 blur-3xl pointer-events-none" />

          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center justify-between">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              {/* Dynamic Avatar with color swatch */}
              <div className="relative group shrink-0">
                <div
                  className="flex h-24 w-24 items-center justify-center rounded-3xl text-3xl font-black text-white shadow-md shadow-brand-500/20 overflow-hidden transition-transform duration-200 group-hover:scale-[1.02]"
                  style={{ backgroundColor: formData.avatarColor || '#6366f1' }}
                >
                  {formData.photoURL ? (
                    <img src={formData.photoURL} alt={formData.displayName} className="h-full w-full object-cover" />
                  ) : (
                    formData.displayName ? formData.displayName.charAt(0).toUpperCase() : 'U'
                  )}
                </div>
              </div>

              {/* Identity Info */}
              <div>
                <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                  <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700 border border-brand-200/60">
                    {role.name}
                  </span>
                  <span className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border",
                    formData.emailVerified
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  )}>
                    {formData.emailVerified ? (
                      <>
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                        Verified Account
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                        Pending Verification
                      </>
                    )}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold text-surface-900 tracking-tight">
                  {formData.displayName || 'Intent User'}
                </h1>

                <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-surface-600">
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-4 w-4 text-surface-400" />
                    {formData.email || 'user@intent.workspace'}
                  </span>
                  {formData.location && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-surface-400" />
                      {formData.location}
                    </span>
                  )}
                  {formData.timezone && (
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-surface-400" />
                      {formData.timezone}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions / Role Switcher Trigger */}
            <div className="flex sm:flex-col items-stretch gap-2.5 pt-2 sm:pt-0">
              <button
                type="button"
                onClick={() => setShowRoleModal(true)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-surface-200 bg-surface-50 px-4 py-2.5 text-sm font-semibold text-surface-700 transition-all hover:bg-surface-100 hover:border-surface-300"
              >
                <BriefcaseBusiness className="h-4 w-4 text-brand-600" />
                <span>Change Role</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Strip */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-surface-100 pt-5">
            <div className="rounded-xl bg-surface-50 p-3">
              <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Active Role</span>
              <p className="text-sm font-bold text-surface-900 mt-0.5 truncate">{role.name}</p>
            </div>
            <div className="rounded-xl bg-surface-50 p-3">
              <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Role Widgets</span>
              <p className="text-sm font-bold text-surface-900 mt-0.5">{role.widgets.length} enabled</p>
            </div>
            <div className="rounded-xl bg-surface-50 p-3">
              <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Auth Provider</span>
              <p className="text-sm font-bold text-surface-900 mt-0.5 truncate">
                {isFirebaseUser ? 'Firebase Email/Pass' : 'Local Workspace'}
              </p>
            </div>
            <div className="rounded-xl bg-surface-50 p-3">
              <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider">UI Theme</span>
              <p className="text-sm font-bold text-surface-900 mt-0.5 capitalize">{formData.theme || 'Light'}</p>
            </div>
          </div>
        </section>

        {/* Tab Navigation */}
        <div className="mt-8 flex border-b border-surface-200 overflow-x-auto no-scrollbar gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={cn(
              "flex items-center gap-2 py-3 px-4 text-sm font-bold border-b-2 transition-all whitespace-nowrap",
              activeTab === 'profile'
                ? "border-brand-600 text-brand-600"
                : "border-transparent text-surface-500 hover:text-surface-900 hover:border-surface-300"
            )}
          >
            <User className="w-4 h-4" />
            Personal Profile
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('role')}
            className={cn(
              "flex items-center gap-2 py-3 px-4 text-sm font-bold border-b-2 transition-all whitespace-nowrap",
              activeTab === 'role'
                ? "border-brand-600 text-brand-600"
                : "border-transparent text-surface-500 hover:text-surface-900 hover:border-surface-300"
            )}
          >
            <BriefcaseBusiness className="w-4 h-4" />
            Role & Focus
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('preferences')}
            className={cn(
              "flex items-center gap-2 py-3 px-4 text-sm font-bold border-b-2 transition-all whitespace-nowrap",
              activeTab === 'preferences'
                ? "border-brand-600 text-brand-600"
                : "border-transparent text-surface-500 hover:text-surface-900 hover:border-surface-300"
            )}
          >
            <Palette className="w-4 h-4" />
            Preferences
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ai')}
            className={cn(
              "flex items-center gap-2 py-3 px-4 text-sm font-bold border-b-2 transition-all whitespace-nowrap",
              activeTab === 'ai'
                ? "border-brand-600 text-brand-600"
                : "border-transparent text-surface-500 hover:text-surface-900 hover:border-surface-300"
            )}
          >
            <Sparkles className="w-4 h-4" />
            AI & Intelligence
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('notifications')}
            className={cn(
              "flex items-center gap-2 py-3 px-4 text-sm font-bold border-b-2 transition-all whitespace-nowrap",
              activeTab === 'notifications'
                ? "border-brand-600 text-brand-600"
                : "border-transparent text-surface-500 hover:text-surface-900 hover:border-surface-300"
            )}
          >
            <Bell className="w-4 h-4" />
            Notifications
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={cn(
              "flex items-center gap-2 py-3 px-4 text-sm font-bold border-b-2 transition-all whitespace-nowrap",
              activeTab === 'security'
                ? "border-brand-600 text-brand-600"
                : "border-transparent text-surface-500 hover:text-surface-900 hover:border-surface-300"
            )}
          >
            <Shield className="w-4 h-4" />
            Security & Account
          </button>
        </div>

        {/* Tab Content */}
        <div className="mt-8">
          {/* TAB 1: PERSONAL PROFILE */}
          {activeTab === 'profile' && (
            <div className="space-y-6 animate-fade-in">
              <div className="rounded-2xl border border-surface-200 bg-white p-6 sm:p-8 shadow-card">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-surface-900">Personal Information</h2>
                    <p className="text-sm text-surface-500">Update your public name, headline, and profile appearance.</p>
                  </div>
                  {hasChanges && (
                    <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                      Unsaved changes
                    </span>
                  )}
                </div>

                <form onSubmit={handleSaveChanges} className="space-y-6">
                  {/* Avatar Color Picker */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-surface-600 mb-2">
                      Avatar Accent Color
                    </label>
                    <div className="flex items-center gap-3">
                      {AVATAR_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => handleFieldChange('avatarColor', color)}
                          className={cn(
                            "w-8 h-8 rounded-full transition-transform flex items-center justify-center",
                            formData.avatarColor === color ? "scale-110 ring-2 ring-offset-2 ring-brand-500" : "hover:scale-105"
                          )}
                          style={{ backgroundColor: color }}
                        >
                          {formData.avatarColor === color && <Check className="w-4 h-4 text-white" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-surface-600 mb-2">
                        Display Name
                      </label>
                      <input
                        type="text"
                        value={formData.displayName}
                        onChange={(e) => handleFieldChange('displayName', e.target.value)}
                        placeholder="e.g. Alex Chen"
                        className="w-full rounded-xl border border-surface-200 px-4 py-2.5 text-sm font-medium text-surface-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-surface-600 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleFieldChange('email', e.target.value)}
                        placeholder="user@intent.workspace"
                        className="w-full rounded-xl border border-surface-200 px-4 py-2.5 text-sm font-medium text-surface-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-surface-600 mb-2">
                        Professional Title
                      </label>
                      <input
                        type="text"
                        value={formData.title || ''}
                        onChange={(e) => handleFieldChange('title', e.target.value)}
                        placeholder="e.g. Senior Software Architect"
                        className="w-full rounded-xl border border-surface-200 px-4 py-2.5 text-sm font-medium text-surface-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-surface-600 mb-2">
                        Location
                      </label>
                      <input
                        type="text"
                        value={formData.location || ''}
                        onChange={(e) => handleFieldChange('location', e.target.value)}
                        placeholder="e.g. Bengaluru, India or Remote"
                        className="w-full rounded-xl border border-surface-200 px-4 py-2.5 text-sm font-medium text-surface-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-surface-600 mb-2">
                      Timezone
                    </label>
                    <select
                      value={formData.timezone || TIMEZONES[0]}
                      onChange={(e) => handleFieldChange('timezone', e.target.value)}
                      className="w-full rounded-xl border border-surface-200 px-4 py-2.5 text-sm font-medium text-surface-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 bg-white"
                    >
                      {TIMEZONES.map((tz) => (
                        <option key={tz} value={tz}>
                          {tz}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-surface-600 mb-2">
                      Bio & Intent Statement
                    </label>
                    <textarea
                      rows={3}
                      value={formData.bio || ''}
                      onChange={(e) => handleFieldChange('bio', e.target.value)}
                      placeholder="What is your primary focus or intent this month?"
                      className="w-full rounded-xl border border-surface-200 px-4 py-2.5 text-sm font-medium text-surface-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-surface-600 mb-2">
                      Avatar Image URL (Optional)
                    </label>
                    <input
                      type="url"
                      value={formData.photoURL || ''}
                      onChange={(e) => handleFieldChange('photoURL', e.target.value)}
                      placeholder="https://example.com/photo.jpg"
                      className="w-full rounded-xl border border-surface-200 px-4 py-2.5 text-sm font-medium text-surface-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    />
                  </div>

                  <div className="flex items-center justify-end pt-4 border-t border-surface-100">
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={isSaving}
                      className="gap-2"
                    >
                      {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Save Profile Details
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* TAB 2: ROLE & FOCUS */}
          {activeTab === 'role' && (
            <div className="space-y-6 animate-fade-in">
              <div className="rounded-2xl border border-surface-200 bg-white p-6 sm:p-8 shadow-card">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-surface-900">Active Workspace Role</h2>
                    <p className="text-sm text-surface-500">Your daily dashboard structure, tools, and AI suggestions adapt to this persona.</p>
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => setShowRoleModal(true)}
                    className="gap-2 shrink-0 border-brand-200 text-brand-700 bg-brand-50/50 hover:bg-brand-100/50"
                  >
                    <BriefcaseBusiness className="w-4 h-4" />
                    Switch Role
                  </Button>
                </div>

                <div className="rounded-2xl border-2 border-brand-200 bg-brand-50/30 p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-md shadow-brand-500/20 shrink-0">
                      {renderRoleIcon(role.icon)}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-surface-900">{role.name}</h3>
                      <p className="mt-1 text-sm text-surface-600 leading-relaxed">{role.description}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-8">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-surface-700 mb-3">
                    Widgets tailored for this role ({role.widgets.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {role.widgets.map((widget) => (
                      <div
                        key={widget}
                        className="flex items-center gap-2.5 rounded-xl border border-surface-200 bg-surface-50 p-3.5 transition-colors hover:border-brand-300"
                      >
                        <CheckCircle2 className="w-4 h-4 text-brand-600 shrink-0" />
                        <span className="text-sm font-semibold capitalize text-surface-800">{widget}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* All Available Roles Showcase */}
              <div className="rounded-2xl border border-surface-200 bg-white p-6 sm:p-8 shadow-card">
                <h3 className="text-base font-bold text-surface-900 mb-2">Available Professions</h3>
                <p className="text-sm text-surface-500 mb-6">Select any profession to instantly morph your workspace.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availableRoles.map((r) => {
                    const isCurrent = r.id === role.id
                    return (
                      <div
                        key={r.id}
                        className={cn(
                          "rounded-xl border p-5 transition-all text-left flex flex-col justify-between",
                          isCurrent
                            ? "border-brand-500 bg-brand-50/20 shadow-sm"
                            : "border-surface-200 hover:border-surface-300 hover:shadow-sm"
                        )}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center",
                              isCurrent ? "bg-brand-600 text-white" : "bg-surface-100 text-surface-600"
                            )}>
                              {renderRoleIcon(r.icon)}
                            </div>
                            {isCurrent && (
                              <span className="text-xs font-bold text-brand-700 bg-brand-100 px-2 py-0.5 rounded-full">
                                Active
                              </span>
                            )}
                          </div>
                          <h4 className="font-bold text-surface-900">{r.name}</h4>
                          <p className="text-xs text-surface-500 mt-1 line-clamp-2">{r.description}</p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-surface-100 flex items-center justify-between">
                          <span className="text-xs text-surface-400 font-medium">{r.widgets.length} widgets</span>
                          {!isCurrent ? (
                            <button
                              type="button"
                              onClick={() => handleSwitchRole(r)}
                              className="text-xs font-bold text-brand-600 hover:text-brand-800 transition-colors"
                            >
                              Switch to this →
                            </button>
                          ) : (
                            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" /> Current
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: WORKSPACE PREFERENCES */}
          {activeTab === 'preferences' && (
            <div className="space-y-6 animate-fade-in">
              <div className="rounded-2xl border border-surface-200 bg-white p-6 sm:p-8 shadow-card">
                <h2 className="text-lg font-bold text-surface-900 mb-1">Appearance & Layout</h2>
                <p className="text-sm text-surface-500 mb-6">Customize how the dashboard and controls look and feel.</p>

                <div className="space-y-6">
                  {/* Theme Mode */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-surface-600 mb-3">
                      Interface Theme
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {[
                        { id: 'light', label: 'Light Mode', icon: Sun, desc: 'Clean, high contrast for bright rooms' },
                        { id: 'dark', label: 'Dark Mode', icon: Moon, desc: 'Sleek dark surfaces that reduce eye strain' },
                        { id: 'system', label: 'System Default', icon: Monitor, desc: 'Syncs automatically with your OS preference' },
                      ].map((themeOpt) => {
                        const Icon = themeOpt.icon
                        const isSelected = (formData.theme || 'light') === themeOpt.id
                        return (
                          <button
                            key={themeOpt.id}
                            type="button"
                            onClick={() => handleFieldChange('theme', themeOpt.id as any)}
                            className={cn(
                              "rounded-2xl border-2 p-4 text-left transition-all",
                              isSelected
                                ? "border-brand-500 bg-brand-50/30 shadow-sm"
                                : "border-surface-200 hover:border-surface-300 bg-surface-50/50"
                            )}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <Icon className={cn("w-5 h-5", isSelected ? "text-brand-600" : "text-surface-500")} />
                              {isSelected && <Check className="w-4 h-4 text-brand-600" />}
                            </div>
                            <h4 className="font-bold text-sm text-surface-900">{themeOpt.label}</h4>
                            <p className="text-xs text-surface-500 mt-1">{themeOpt.desc}</p>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Density */}
                  <div className="pt-4 border-t border-surface-100">
                    <label className="block text-xs font-bold uppercase tracking-wider text-surface-600 mb-3">
                      Display Density
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {[
                        { id: 'comfortable', label: 'Comfortable', desc: 'Relaxed widget spacing with clear breathing room' },
                        { id: 'compact', label: 'Compact', desc: 'Denser information density for power users' },
                      ].map((densityOpt) => {
                        const isSelected = (formData.density || 'comfortable') === densityOpt.id
                        return (
                          <button
                            key={densityOpt.id}
                            type="button"
                            onClick={() => handleFieldChange('density', densityOpt.id as any)}
                            className={cn(
                              "rounded-2xl border-2 p-4 text-left transition-all",
                              isSelected
                                ? "border-brand-500 bg-brand-50/30 shadow-sm"
                                : "border-surface-200 hover:border-surface-300 bg-surface-50/50"
                            )}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="font-bold text-sm text-surface-900">{densityOpt.label}</h4>
                              {isSelected && <Check className="w-4 h-4 text-brand-600" />}
                            </div>
                            <p className="text-xs text-surface-500">{densityOpt.desc}</p>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Clock & Calendar Settings */}
                  <div className="pt-4 border-t border-surface-100 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-surface-600 mb-2">
                        Time Format
                      </label>
                      <select
                        value={formData.timeFormat || '12h'}
                        onChange={(e) => handleFieldChange('timeFormat', e.target.value as any)}
                        className="w-full rounded-xl border border-surface-200 px-4 py-2.5 text-sm font-medium text-surface-900 bg-white focus:border-brand-500 focus:outline-none"
                      >
                        <option value="12h">12-Hour (e.g. 2:30 PM)</option>
                        <option value="24h">24-Hour (e.g. 14:30)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-surface-600 mb-2">
                        First Day of Week
                      </label>
                      <select
                        value={formData.weekStart || 'monday'}
                        onChange={(e) => handleFieldChange('weekStart', e.target.value as any)}
                        className="w-full rounded-xl border border-surface-200 px-4 py-2.5 text-sm font-medium text-surface-900 bg-white focus:border-brand-500 focus:outline-none"
                      >
                        <option value="monday">Monday (Standard)</option>
                        <option value="sunday">Sunday</option>
                      </select>
                    </div>
                  </div>

                  {/* Layout Controls */}
                  <div className="pt-4 border-t border-surface-100 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-surface-900">Auto-save layout modifications</h4>
                        <p className="text-xs text-surface-500">Automatically save widget positions when moved or resized</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={formData.autoSave !== false}
                        onChange={(e) => handleFieldChange('autoSave', e.target.checked)}
                        className="h-5 w-5 rounded text-brand-600 focus:ring-brand-500 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end pt-4 border-t border-surface-100">
                    <Button
                      type="button"
                      variant="primary"
                      onClick={() => handleSaveChanges()}
                      disabled={isSaving}
                      className="gap-2"
                    >
                      {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Apply Preferences
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: AI & INTELLIGENCE */}
          {activeTab === 'ai' && (
            <div className="space-y-6 animate-fade-in">
              <div className="rounded-2xl border border-surface-200 bg-white p-6 sm:p-8 shadow-card">
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-surface-900">Intent AI Assistant</h2>
                    <p className="text-sm text-surface-500">Orchestrate proactive planning, prompt ideas, and automated summaries.</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 rounded-xl border border-surface-200 bg-surface-50/50">
                    <div>
                      <h4 className="font-bold text-sm text-surface-900">Proactive Intent Prompt Suggestions</h4>
                      <p className="text-xs text-surface-500 mt-0.5">Show AI suggestions in the workspace prompt bar based on your active role</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.aiAssistance !== false}
                      onChange={(e) => handleFieldChange('aiAssistance', e.target.checked)}
                      className="h-5 w-5 rounded text-brand-600 focus:ring-brand-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-surface-600 mb-3">
                      AI Assistant Personality & Tone
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {[
                        { id: 'concise', label: 'Concise & Actionable', desc: 'Direct bullet points and quick action steps' },
                        { id: 'balanced', label: 'Balanced & Structured', desc: 'Structured analysis with key context' },
                        { id: 'deep', label: 'Analytical & Thorough', desc: 'Detailed explanations, risk factors, and scenarios' },
                      ].map((toneOpt) => {
                        const isSelected = (formData.aiTone || 'balanced') === toneOpt.id
                        return (
                          <button
                            key={toneOpt.id}
                            type="button"
                            onClick={() => handleFieldChange('aiTone', toneOpt.id as any)}
                            className={cn(
                              "rounded-2xl border-2 p-4 text-left transition-all",
                              isSelected
                                ? "border-brand-500 bg-brand-50/30 shadow-sm"
                                : "border-surface-200 hover:border-surface-300 bg-surface-50/50"
                            )}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="font-bold text-sm text-surface-900">{toneOpt.label}</h4>
                              {isSelected && <Check className="w-4 h-4 text-brand-600" />}
                            </div>
                            <p className="text-xs text-surface-500">{toneOpt.desc}</p>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl border border-surface-200 bg-surface-50/50">
                    <div>
                      <h4 className="font-bold text-sm text-surface-900">Auto-Extract Action Items from Meetings</h4>
                      <p className="text-xs text-surface-500 mt-0.5">Generate follow-up tasks and notes when processing meeting transcripts</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.smartSummaries !== false}
                      onChange={(e) => handleFieldChange('smartSummaries', e.target.checked)}
                      className="h-5 w-5 rounded text-brand-600 focus:ring-brand-500 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-end pt-4 border-t border-surface-100">
                    <Button
                      type="button"
                      variant="primary"
                      onClick={() => handleSaveChanges()}
                      disabled={isSaving}
                      className="gap-2"
                    >
                      {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Save AI Preferences
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="space-y-6 animate-fade-in">
              <div className="rounded-2xl border border-surface-200 bg-white p-6 sm:p-8 shadow-card">
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <Bell className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-surface-900">Notification Preferences</h2>
                    <p className="text-sm text-surface-500">Configure what alerts and digests you receive.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-xl border border-surface-200 bg-surface-50/50">
                    <div>
                      <h4 className="font-bold text-sm text-surface-900">Daily Morning Briefing</h4>
                      <p className="text-xs text-surface-500 mt-0.5">Receive an email digest of scheduled calendar events and high-priority tasks</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.emailNotifications !== false}
                      onChange={(e) => handleFieldChange('emailNotifications', e.target.checked)}
                      className="h-5 w-5 rounded text-brand-600 focus:ring-brand-500 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl border border-surface-200 bg-surface-50/50">
                    <div>
                      <h4 className="font-bold text-sm text-surface-900">Calendar Event Reminders</h4>
                      <p className="text-xs text-surface-500 mt-0.5">Show browser notifications 10 minutes prior to upcoming meetings</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.meetingReminders !== false}
                      onChange={(e) => handleFieldChange('meetingReminders', e.target.checked)}
                      className="h-5 w-5 rounded text-brand-600 focus:ring-brand-500 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl border border-surface-200 bg-surface-50/50">
                    <div>
                      <h4 className="font-bold text-sm text-surface-900">Action Sound Effects</h4>
                      <p className="text-xs text-surface-500 mt-0.5">Play subtle audio chime when completing tasks or scheduling meetings</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.soundAlerts === true}
                      onChange={(e) => handleFieldChange('soundAlerts', e.target.checked)}
                      className="h-5 w-5 rounded text-brand-600 focus:ring-brand-500 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-end pt-4 border-t border-surface-100">
                    <Button
                      type="button"
                      variant="primary"
                      onClick={() => handleSaveChanges()}
                      disabled={isSaving}
                      className="gap-2"
                    >
                      {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Save Notification Settings
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: SECURITY & ACCOUNT */}
          {activeTab === 'security' && (
            <div className="space-y-6 animate-fade-in">
              {/* Account Security Card */}
              <div className="rounded-2xl border border-surface-200 bg-white p-6 sm:p-8 shadow-card">
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <Lock className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-surface-900">Security & Authentication</h2>
                    <p className="text-sm text-surface-500">Manage your password, verification, and credentials.</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-surface-200 bg-surface-50/50">
                    <div>
                      <h4 className="font-bold text-sm text-surface-900">Password Reset</h4>
                      <p className="text-xs text-surface-500 mt-0.5">
                        Send a secure Firebase password reset email to <strong>{formData.email}</strong>
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSendPasswordReset}
                      disabled={isSendingReset}
                      className="gap-2 shrink-0"
                    >
                      {isSendingReset ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                      Send Reset Link
                    </Button>
                  </div>

                  <div className="flex items-start gap-3 p-4 rounded-xl bg-surface-50 border border-surface-200">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-surface-900">Email Verification</h4>
                      <p className="text-xs text-surface-600 mt-0.5">
                        {formData.emailVerified
                          ? 'Your email address is verified with Firebase Authentication.'
                          : 'Your email address is currently unverified. Check your inbox for the activation link.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="rounded-2xl border border-red-200 bg-red-50/30 p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-red-950">Danger Zone</h2>
                    <p className="text-sm text-red-700">Account session actions and layout resets.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white border border-red-200">
                    <div>
                      <h4 className="font-bold text-sm text-surface-900">Reset Dashboard Customizations</h4>
                      <p className="text-xs text-surface-500 mt-0.5">
                        Restores the default widget order, sizes, and layout for {role.name}.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResetLayout}
                      className="gap-2 shrink-0 border-surface-300 text-surface-700 hover:bg-surface-100"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Reset Layout
                    </Button>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white border border-red-200">
                    <div>
                      <h4 className="font-bold text-sm text-red-900">Sign Out of Session</h4>
                      <p className="text-xs text-surface-500 mt-0.5">
                        End your active Firebase workspace session and return to the login screen.
                      </p>
                    </div>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setShowLogoutModal(true)}
                      className="gap-2 shrink-0 shadow-sm"
                    >
                      <LogOut className="w-4 h-4" />
                      Log Out
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* CONFIRM LOGOUT MODAL */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-900/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-7 shadow-2xl border border-surface-200 animate-slide-up">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600 mb-4">
              <LogOut className="h-6 w-6" />
            </div>

            <h3 className="text-xl font-bold text-surface-900">Sign out of workspace?</h3>
            <p className="mt-2 text-sm text-surface-600 leading-relaxed">
              Are you sure you want to sign out? You will need to sign in with your email and password to access your role dashboard again.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => setShowLogoutModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleConfirmLogout}
                className="gap-2"
              >
                <LogOut className="w-4 h-4" />
                Yes, Sign Out
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ROLE SWITCHER MODAL */}
      {showRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-900/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-surface-200 animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <BriefcaseBusiness className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-surface-900">Switch Profession</h3>
                  <p className="text-xs text-surface-500">Pick a new role to instantly load its specialized dashboard widgets.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRoleModal(false)}
                className="text-surface-400 hover:text-surface-700 p-1 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              {availableRoles.map((r) => {
                const isCurrent = r.id === role.id
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleSwitchRole(r)}
                    className={cn(
                      "flex items-start gap-3.5 rounded-2xl border-2 p-4 text-left transition-all",
                      isCurrent
                        ? "border-brand-500 bg-brand-50/40 shadow-sm"
                        : "border-surface-200 hover:border-surface-300 hover:bg-surface-50"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                      isCurrent ? "bg-brand-600 text-white" : "bg-surface-100 text-surface-600"
                    )}>
                      {renderRoleIcon(r.icon)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-sm text-surface-900 truncate">{r.name}</h4>
                        {isCurrent && <Check className="w-4 h-4 text-brand-600 shrink-0" />}
                      </div>
                      <p className="text-xs text-surface-500 mt-1 line-clamp-2">{r.description}</p>
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="mt-6 flex justify-end">
              <Button
                variant="ghost"
                onClick={() => setShowRoleModal(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}