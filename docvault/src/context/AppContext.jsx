import { createContext, useContext, useReducer, useCallback } from 'react'

const AppContext = createContext(null)

const initialState = {
  user: null,
  token: null,
  toasts: [],
  notifications: [],
  sidebarOpen: true,
}

function reducer(state, action) {
  switch (action.type) {
    case 'LOGIN':
      return { ...state, user: action.payload.user }
    case 'LOGOUT':
      return { ...state, user: null, notifications: [] }
    case 'SET_NOTIFICATIONS':
      return { ...state, notifications: action.payload }
    case 'MARK_NOTIFICATION_READ':
      return {
        ...state,
        notifications: state.notifications.map(n =>
          n.id === action.payload ? { ...n, read: true } : n
        )
      }
    case 'ADD_TOAST':
      return { ...state, toasts: [...state.toasts, action.payload] }
    case 'REMOVE_TOAST':
      return { ...state, toasts: state.toasts.filter(t => t.id !== action.payload) }
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarOpen: !state.sidebarOpen }
    case 'UPDATE_USER':
      return { ...state, user: { ...state.user, ...action.payload } }
    default:
      return state
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  const login = useCallback((user) => {
    dispatch({ type: 'LOGIN', payload: { user } })
  }, [])

  const logout = useCallback(() => {
    dispatch({ type: 'LOGOUT' })
  }, [])

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now().toString()
    dispatch({ type: 'ADD_TOAST', payload: { id, message, type } })
    setTimeout(() => dispatch({ type: 'REMOVE_TOAST', payload: id }), 3500)
  }, [])

  const setNotifications = useCallback((notifs) => {
    dispatch({ type: 'SET_NOTIFICATIONS', payload: notifs })
  }, [])

  const markNotificationRead = useCallback((id) => {
    dispatch({ type: 'MARK_NOTIFICATION_READ', payload: id })
  }, [])

  const toggleSidebar = useCallback(() => {
    dispatch({ type: 'TOGGLE_SIDEBAR' })
  }, [])

  const updateUser = useCallback((data) => {
    dispatch({ type: 'UPDATE_USER', payload: data })
  }, [])

  return (
    <AppContext.Provider value={{
      ...state,
      login,
      logout,
      showToast,
      setNotifications,
      markNotificationRead,
      toggleSidebar,
      updateUser,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be inside AppProvider')
  return ctx
}
