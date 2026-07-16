import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { Bell, FileText } from 'lucide-react'
import { timeAgo, avatarColor, getInitials } from '../../utils/helpers'
import { api } from '../../utils/api'

export default function Header({ title }) {
  const { user, notifications, markNotificationRead } = useApp()
  const [showNotifs, setShowNotifs] = useState(false)
  const notifRef = useRef()
  const navigate = useNavigate()
  const unread = notifications.filter(n => !n.read).length

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function handleNotifClick(n) {
    markNotificationRead(n.id)
    await api.notifications.update(n.id, { read: true }).catch(() => {})
    setShowNotifs(false)
    if (n.documentId) navigate(`/app/documents/${n.documentId}`)
  }

  return (
    <header style={{
      height: 60,
      borderBottom: '1.5px solid var(--border)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 1.5rem',
      background: 'rgba(7,7,13,0.85)',
      backdropFilter: 'blur(12px)',
      position: 'sticky', top: 0, zIndex: 50,
      flexShrink: 0,
    }}>
      <h1 style={{ fontSize: '1rem', fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '-0.01em' }}>
        {title}
      </h1>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
        {/* Notification bell */}
        <div className="dropdown" ref={notifRef}>
          <button
            className="btn-icon"
            onClick={() => setShowNotifs(v => !v)}
            style={{ position: 'relative', color: 'var(--text-2)' }}
            title="Notifications"
          >
            <Bell size={17} />
            {unread > 0 && (
              <span style={{
                position: 'absolute', top: 3, right: 3,
                width: 7, height: 7, borderRadius: '50%',
                background: 'var(--accent)',
                border: '1.5px solid var(--bg)',
              }} />
            )}
          </button>

          {showNotifs && (
            <div className="dropdown-menu" style={{ width: 300, right: 0 }}>
              <div style={{
                padding: '0.75rem 1rem',
                borderBottom: '1px solid var(--border)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontWeight: 600, fontSize: '0.875rem', fontFamily: 'var(--font-display)' }}>
                  Notifications
                </span>
                {unread > 0 && <span className="badge badge-purple">{unread} new</span>}
              </div>

              {notifications.length === 0 ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-3)', fontSize: '0.8125rem' }}>
                  All caught up ✓
                </div>
              ) : notifications.slice(0, 6).map(n => (
                <button key={n.id} className="dropdown-item" onClick={() => handleNotifClick(n)}
                  style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 0, padding: '0.7rem 1rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', width: '100%' }}>
                    {!n.read && (
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, marginTop: 5 }} />
                    )}
                    <span style={{
                      fontSize: '0.8125rem', lineHeight: 1.45,
                      color: !n.read ? 'var(--text-1)' : 'var(--text-2)',
                    }}>{n.message}</span>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginTop: '0.2rem', paddingLeft: n.read ? 0 : '0.875rem' }}>
                    {timeAgo(n.createdAt)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* User pill */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.3rem 0.625rem 0.3rem 0.375rem',
          background: 'var(--bg-3)',
          border: '1.5px solid var(--border)',
          borderRadius: '99px',
          fontSize: '0.8125rem',
        }}>
          <div className="avatar avatar-sm" style={{ background: avatarColor(user?.name || ''), color: '#fff' }}>
            {getInitials(user?.name || '')}
          </div>
          <span style={{ color: 'var(--text-2)', fontWeight: 500 }}>{user?.name?.split(' ')[0]}</span>
          <span className={`badge ${user?.role === 'admin' ? 'badge-purple' : 'badge-teal'}`} style={{ fontSize: '0.65rem' }}>
            {user?.role}
          </span>
        </div>
      </div>
    </header>
  )
}
