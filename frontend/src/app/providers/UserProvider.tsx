import React, { createContext, useContext, useEffect, useState } from 'react'
import { Role } from '@/lib/api'
import { auth, logOut as firebaseLogOut, onAuthStateChanged, updateUserDisplayName } from '@/lib/firebase'

export interface UserProfile {
  displayName: string
  email: string
  photoURL?: string
  avatarColor?: string
  title?: string
  bio?: string
  timezone?: string
  location?: string
  emailVerified?: boolean
  theme?: 'light' | 'dark' | 'system'
  density?: 'comfortable' | 'compact'
  timeFormat?: '12h' | '24h'
  weekStart?: 'monday' | 'sunday'
  aiAssistance?: boolean
  aiTone?: 'concise' | 'balanced' | 'deep'
  smartSummaries?: boolean
  emailNotifications?: boolean
  soundAlerts?: boolean
  meetingReminders?: boolean
  autoSave?: boolean
}

export const DEFAULT_PROFILE: UserProfile = {
  displayName: 'Prototype User',
  email: 'alex.chen@intent.workspace',
  photoURL: '',
  avatarColor: '#6366f1',
  title: 'Lead Software Architect',
  bio: 'Building intelligent adaptive workspaces with role-based workflows and real-time planning.',
  timezone: 'Asia/Kolkata (GMT+5:30)',
  location: 'Bengaluru, India',
  emailVerified: true,
  theme: 'light',
  density: 'comfortable',
  timeFormat: '12h',
  weekStart: 'monday',
  aiAssistance: true,
  aiTone: 'balanced',
  smartSummaries: true,
  emailNotifications: true,
  soundAlerts: false,
  meetingReminders: true,
  autoSave: true,
}

interface UserContextType {
  role: Role | null
  setRole: (role: Role) => void
  clearRole: () => void
  profile: UserProfile
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>
  logout: () => Promise<void>
  isFirebaseUser: boolean
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<Role | null>(null)
  const [profile, setProfileState] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('intent-workspace-profile')
      if (saved) {
        return { ...DEFAULT_PROFILE, ...JSON.parse(saved) }
      }
    } catch (e) {
      console.error('Failed to load profile from localStorage', e)
    }
    return DEFAULT_PROFILE
  })
  const [isFirebaseUser, setIsFirebaseUser] = useState(false)

  useEffect(() => {
    // Load role from localStorage on mount
    const savedRole = localStorage.getItem('intent-workspace-role')
    if (savedRole) {
      try {
        setRoleState(JSON.parse(savedRole))
      } catch (e) {
        console.error('Failed to parse role from localStorage', e)
      }
    }

    // Subscribe to Firebase auth state if auth is configured
    if (auth) {
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        if (firebaseUser) {
          setIsFirebaseUser(true)
          setProfileState((prev) => {
            const updated: UserProfile = {
              ...prev,
              displayName: firebaseUser.displayName || prev.displayName || firebaseUser.email?.split('@')[0] || 'User',
              email: firebaseUser.email || prev.email,
              photoURL: firebaseUser.photoURL || prev.photoURL || '',
              emailVerified: firebaseUser.emailVerified,
            }
            localStorage.setItem('intent-workspace-profile', JSON.stringify(updated))
            return updated
          })
        } else {
          setIsFirebaseUser(false)
        }
      })
      return () => unsubscribe()
    }
  }, [])

  const setRole = (newRole: Role) => {
    setRoleState(newRole)
    localStorage.setItem('intent-workspace-role', JSON.stringify(newRole))
  }

  const clearRole = () => {
    setRoleState(null)
    localStorage.removeItem('intent-workspace-role')
  }

  const updateProfile = async (updates: Partial<UserProfile>) => {
    setProfileState((prev) => {
      const merged = { ...prev, ...updates }
      localStorage.setItem('intent-workspace-profile', JSON.stringify(merged))
      return merged
    })

    if (updates.displayName !== undefined || updates.photoURL !== undefined) {
      try {
        await updateUserDisplayName(
          updates.displayName ?? profile.displayName,
          updates.photoURL ?? profile.photoURL
        )
      } catch (err) {
        console.warn('Could not sync profile name to Firebase:', err)
      }
    }
  }

  const logout = async () => {
    try {
      await firebaseLogOut()
    } catch (e) {
      console.warn('Firebase logout failed:', e)
    }
    clearRole()
    localStorage.removeItem('intent-workspace-role')
  }

  return (
    <UserContext.Provider
      value={{
        role,
        setRole,
        clearRole,
        profile,
        updateProfile,
        logout,
        isFirebaseUser,
      }}
    >
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}