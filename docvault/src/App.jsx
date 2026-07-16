import { Routes, Route, Navigate } from 'react-router-dom'
import { useApp } from './context/AppContext'
import LoginPage from './pages/LoginPage'
import AdminLayout from './pages/admin/AdminLayout'
import UserLayout from './pages/user/UserLayout'
import Toast from './components/shared/Toast'

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard'
import UsersPage from './pages/admin/UsersPage'
import DepartmentsPage from './pages/admin/DepartmentsPage'
import CategoriesPage from './pages/admin/CategoriesPage'
import AdminDocsPage from './pages/admin/AdminDocsPage'

// User pages
import DocumentsPage from './pages/user/DocumentsPage'
import DocumentDetailPage from './pages/user/DocumentDetailPage'
import UserDashboard from './pages/user/UserDashboard'

function RequireAuth({ children, role }) {
  const { user } = useApp()
  if (!user) return <Navigate to="/login" replace />
  if (role && user.role !== role) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/app'} replace />
  }
  return children
}

export default function App() {
  const { user } = useApp()

  return (
    <>
      <Toast />
      <Routes>
        <Route path="/login" element={
          user ? <Navigate to={user.role === 'admin' ? '/admin' : '/app'} replace /> : <LoginPage />
        } />

        {/* Admin routes */}
        <Route path="/admin" element={
          <RequireAuth role="admin">
            <AdminLayout />
          </RequireAuth>
        }>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="departments" element={<DepartmentsPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="documents" element={<AdminDocsPage />} />
        </Route>

        {/* User routes */}
        <Route path="/app" element={
          <RequireAuth>
            <UserLayout />
          </RequireAuth>
        }>
          <Route index element={<UserDashboard />} />
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="documents/:id" element={<DocumentDetailPage />} />
        </Route>

        <Route path="/" element={
          <Navigate to={user ? (user.role === 'admin' ? '/admin' : '/app') : '/login'} replace />
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
