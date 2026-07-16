import { NavLink, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useApp } from '../../context/AppContext'
import { avatarColor, getInitials } from '../../utils/helpers'
import {
  FileText, LayoutDashboard, Users, Building2, Tag,
  LogOut, ChevronLeft, ChevronRight
} from 'lucide-react'

const adminNav = [
  { to: '/admin',             icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/users',       icon: Users,            label: 'Users'       },
  { to: '/admin/departments', icon: Building2,        label: 'Departments' },
  { to: '/admin/categories',  icon: Tag,              label: 'Categories'  },
  { to: '/admin/documents',   icon: FileText,         label: 'Documents'   },
]
const userNav = [
  { to: '/app',          icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/app/documents', icon: FileText,        label: 'Documents'            },
]

export default function Sidebar({ role = 'user' }) {
  const { user, logout, sidebarOpen, toggleSidebar, notifications } = useApp()
  const navigate = useNavigate()
  const nav = role === 'admin' ? adminNav : userNav
  const unread = notifications.filter(n => !n.read).length

  function handleLogout() { logout(); navigate('/login') }

  return (
    <aside style={{
      width: sidebarOpen ? 216 : 60,
      flexShrink: 0,
      background: 'var(--bg-2)',
      borderRight: '1.5px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      height: '100vh', position: 'sticky', top: 0,
      transition: 'width 0.22s cubic-bezier(.4,0,.2,1)',
      overflow: 'hidden',
    }}>
      {/* Brand */}
      <div style={{
        height: 60, padding: '0 0.875rem',
        borderBottom: '1.5px solid var(--border)',
        display: 'flex', alignItems: 'center',
        justifyContent: sidebarOpen ? 'space-between' : 'center',
        flexShrink: 0,
      }}>
        {sidebarOpen && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: 28, height: 28,
              background: 'linear-gradient(135deg, var(--accent) 0%, #a78bfa 100%)',
              borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              boxShadow: '0 2px 8px var(--accent-glow)',
            }}>
              <FileText size={14} color="#fff" />
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
              Doc<span style={{ color: 'var(--accent-2)' }}>Vault</span>
            </span>
          </div>
        )}
        <button
          className="btn-icon"
          onClick={toggleSidebar}
          style={{ flexShrink: 0, color: 'var(--text-3)' }}
          title={sidebarOpen ? 'Collapse' : 'Expand'}
        >
          {sidebarOpen ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
        </button>
      </div>

      {/* Nav */}
      <nav style={{
        flex: 1, padding: '0.625rem',
        display: 'flex', flexDirection: 'column', gap: '2px',
        overflowY: 'auto', overflowX: 'hidden',
      }}>
        {/* Role label */}
        {sidebarOpen && (
          <div style={{ padding: '0.75rem 0.5rem 0.375rem', fontSize: '0.675rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
            {role === 'admin' ? 'Administration' : 'Workspace'}
          </div>
        )}
        {nav.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to} to={to} end={end}
            title={!sidebarOpen ? label : undefined}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            style={{ justifyContent: sidebarOpen ? 'flex-start' : 'center' }}
          >
            <Icon size={16} style={{ flexShrink: 0 }} />
            {sidebarOpen && (
              <span style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                {label}
              </span>
            )}
            {sidebarOpen && label === 'Documents' && unread > 0 && (
              <span className="nav-badge">{unread}</span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div style={{ padding: '0.625rem', borderTop: '1.5px solid var(--border)', flexShrink: 0 }}>
        {sidebarOpen ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.625rem',
            padding: '0.5rem 0.5rem',
            borderRadius: 'var(--radius)',
            marginBottom: '2px',
          }}>
            <div className="avatar avatar-sm" style={{ background: avatarColor(user?.name || ''), color: '#fff', flexShrink: 0 }}>
              {getInitials(user?.name || '')}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3 }}>
                {user?.name}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', textTransform: 'capitalize' }}>{user?.role}</div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '0.25rem 0', marginBottom: '2px' }} title={user?.name}>
            <div className="avatar avatar-sm" style={{ background: avatarColor(user?.name || ''), color: '#fff' }}>
              {getInitials(user?.name || '')}
            </div>
          </div>
        )}
        <button
          className="nav-item"
          onClick={handleLogout}
          style={{
            width: '100%',
            justifyContent: sidebarOpen ? 'flex-start' : 'center',
            color: 'var(--rose)',
          }}
          title={!sidebarOpen ? 'Sign out' : undefined}
        >
          <LogOut size={15} />
          {sidebarOpen && <span style={{ whiteSpace: 'nowrap' }}>Sign out</span>}
        </button>
      </div>
    </aside>
  )
}
