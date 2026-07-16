import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { api } from '../utils/api'
import { Eye, EyeOff, ArrowRight, ShieldCheck, Users } from 'lucide-react'

export default function LoginPage() {
  const { login, showToast } = useApp()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await api.auth.login(form.email, form.password)
      login(user)
      showToast(`Welcome back, ${user.name.split(' ')[0]}!`, 'success')
      navigate(user.role === 'admin' ? '/admin' : '/app', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background grid pattern */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `
          linear-gradient(rgba(124,106,247,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(124,106,247,0.03) 1px, transparent 1px)
        `,
        backgroundSize: '48px 48px',
        pointerEvents: 'none',
      }} />

      {/* Glow blobs */}
      <div style={{ position:'absolute', top:'-15%', left:'-10%', width:'500px', height:'500px', background:'radial-gradient(circle, rgba(124,106,247,0.12) 0%, transparent 65%)', pointerEvents:'none' }} />
      <div style={{ position:'absolute', bottom:'-10%', right:'-5%', width:'400px', height:'400px', background:'radial-gradient(circle, rgba(45,212,191,0.08) 0%, transparent 65%)', pointerEvents:'none' }} />

      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '420px',
        animation: 'slideUp 0.4s ease',
      }}>
        {/* Logo mark */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 56, height: 56,
            background: 'linear-gradient(135deg, var(--accent) 0%, #a78bfa 100%)',
            borderRadius: 16,
            boxShadow: '0 8px 32px var(--accent-glow)',
            marginBottom: '1rem',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="14 2 14 8 20 8" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="16" y1="13" x2="8" y2="13" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
              <line x1="16" y1="17" x2="8" y2="17" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            Doc<span style={{ color: 'var(--accent-2)' }}>Vault</span>
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-3)', marginTop: '0.25rem' }}>
            Document Management System
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--bg-2)',
          border: '1.5px solid var(--border)',
          borderRadius: '20px',
          padding: '2rem',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}>
          <h1
            data-testid="login-heading"
            style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '0.375rem' }}
          >
            Sign in
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-3)', marginBottom: '1.75rem' }}>
            Enter your credentials to access your workspace
          </p>

          {/* Quick access chips */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '0.625rem' }}>
              Quick access
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                data-testid="quick-admin"
                onClick={() => setForm({ email: 'admin@docvault.com', password: 'admin123' })}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                  padding: '0.5rem 0.75rem',
                  background: 'var(--accent-dim)',
                  border: '1.5px solid rgba(124,106,247,0.25)',
                  borderRadius: '10px',
                  color: 'var(--accent-2)',
                  fontSize: '0.8125rem', fontWeight: 500,
                  cursor: 'pointer', transition: 'all 0.15s',
                  fontFamily: 'var(--font-body)',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(124,106,247,0.2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--accent-dim)'}
              >
                <ShieldCheck size={13} /> Admin
              </button>
              <button
                data-testid="quick-user"
                onClick={() => setForm({ email: 'bob@docvault.com', password: 'user123' })}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                  padding: '0.5rem 0.75rem',
                  background: 'var(--teal-dim)',
                  border: '1.5px solid rgba(45,212,191,0.25)',
                  borderRadius: '10px',
                  color: 'var(--teal)',
                  fontSize: '0.8125rem', fontWeight: 500,
                  cursor: 'pointer', transition: 'all 0.15s',
                  fontFamily: 'var(--font-body)',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(45,212,191,0.2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--teal-dim)'}
              >
                <Users size={13} /> End User
              </button>
            </div>
          </div>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>or sign in manually</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 500 }}>Email address</label>
              <input
                className="input"
                type="email"
                placeholder="you@company.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required
                data-testid="email-input"
                style={{ background: 'var(--bg-3)' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 500 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="input"
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required
                  style={{ paddingRight: '2.75rem', background: 'var(--bg-3)' }}
                  data-testid="password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  style={{
                    position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', display: 'flex', padding: 0,
                  }}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div
                data-testid="login-error"
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.625rem',
                  padding: '0.75rem 1rem',
                  background: 'var(--rose-dim)',
                  border: '1.5px solid rgba(251,113,133,0.25)',
                  borderRadius: '10px',
                  color: 'var(--rose)',
                  fontSize: '0.875rem',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              data-testid="login-btn"
              disabled={loading}
              style={{
                marginTop: '0.5rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                padding: '0.75rem',
                background: loading ? 'var(--bg-4)' : 'var(--accent)',
                border: 'none', borderRadius: '12px',
                color: '#fff', fontFamily: 'var(--font-body)',
                fontSize: '0.9375rem', fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
                boxShadow: loading ? 'none' : '0 4px 16px var(--accent-glow)',
              }}
              onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 24px var(--accent-glow)' }}}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px var(--accent-glow)' }}
            >
              {loading
                ? <span className="spinner" style={{ width: 18, height: 18 }} />
                : <><span>Sign in</span><ArrowRight size={16} /></>
              }
            </button>
          </form>
        </div>

        {/* Demo credentials note */}
        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex', gap: '1.5rem',
            padding: '0.625rem 1.25rem',
            background: 'var(--bg-2)',
            border: '1px solid var(--border)',
            borderRadius: '99px',
            fontSize: '0.75rem', color: 'var(--text-3)',
          }}>
            <span>Admin: <strong style={{ color: 'var(--text-2)' }}>admin123</strong></span>
            <span style={{ color: 'var(--border)' }}>|</span>
            <span>User: <strong style={{ color: 'var(--text-2)' }}>user123</strong></span>
          </div>
        </div>
      </div>
    </div>
  )
}
