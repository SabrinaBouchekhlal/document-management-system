import { Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useApp } from '../../context/AppContext'
import { api } from '../../utils/api'
import Sidebar from '../../components/shared/Sidebar'
import Header from '../../components/shared/Header'

const titles = {
  '/admin': 'Dashboard',
  '/admin/users': 'User Management',
  '/admin/departments': 'Department Management',
  '/admin/categories': 'Category Management',
  '/admin/documents': 'Documents',
}

export default function AdminLayout() {
  const location = useLocation()
  const { user, setNotifications } = useApp()
  const title = titles[location.pathname] || 'Admin'

  useEffect(() => {
    if (user?.id) {
      api.notifications.list({ userId: user.id }).then(res => setNotifications(res.content || [])).catch(() => {})
    }
  }, [user?.id])

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar role="admin" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Header title={title} />
        <main style={{ flex: 1, padding: '1.75rem', overflow: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
