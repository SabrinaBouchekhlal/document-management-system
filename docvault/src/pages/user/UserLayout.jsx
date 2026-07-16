import { Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useApp } from '../../context/AppContext'
import { api } from '../../utils/api'
import Sidebar from '../../components/shared/Sidebar'
import Header from '../../components/shared/Header'

const titles = {
  '/app': 'Dashboard',
  '/app/documents': 'Documents',
}

export default function UserLayout() {
  const location = useLocation()
  const { user, setNotifications } = useApp()
  const title = location.pathname.startsWith('/app/documents/')
    ? 'Document Detail'
    : titles[location.pathname] || 'DocVault'

  useEffect(() => {
    if (user?.id) {
      api.notifications.list({ userId: user.id }).then(res => setNotifications(res.content || [])).catch(() => {})
    }
  }, [user?.id])

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar role="user" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Header title={title} />
        <main style={{ flex: 1, padding: '1.75rem', overflow: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
