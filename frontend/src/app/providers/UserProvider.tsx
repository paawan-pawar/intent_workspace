import React, { createContext, useContext, useEffect, useState } from 'react'
import { Role } from '@/lib/api'

interface UserContextType {
  role: Role | null
  setRole: (role: Role) => void
  clearRole: () => void
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<Role | null>(null)

  useEffect(() => {
    // Load from localStorage on mount
    const saved = localStorage.getItem('intent-workspace-role')
    if (saved) {
      try {
        setRoleState(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to parse role from localStorage', e)
      }
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

  return (
    <UserContext.Provider value={{ role, setRole, clearRole }}>
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
