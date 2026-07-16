import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { api } from '../../utils/api'
import { formatDate, timeAgo } from '../../utils/helpers'
import { FileText, Eye, Download, Clock, TrendingUp, ArrowRight, Sparkles } from 'lucide-react'

export default function UserDashboard() {
  const { user } = useApp()
  const [docs, setDocs] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [d, cats] = await Promise.all([
        api.documents.list({ status: 'published' }),
        api.categories.list()
      ])
      setDocs(d); setCategories(cats); setLoading(false)
    }
    load()
  }, [])

  const recent = [...docs].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 5)
  const topViewed = [...docs].sort((a, b) => b.views - a.views).slice(0, 4)
  const getCat = id => categories.find(c => c.id === id)

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
      <span className="spinner" style={{ width: 28, height: 28 }} />
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Welcome banner */}
      <div
        data-testid="welcome-banner"
        style={{
          background: 'linear-gradient(135deg, var(--bg-2) 0%, rgba(124,106,247,0.08) 100%)',
          border: '1.5px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem 1.75rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
          position: 'relative', overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', right: -20, top: -20, width: 160, height: 160, background: 'radial-gradient(circle, rgba(124,106,247,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '0.3rem' }}>
            Good to see you, {user?.name?.split(' ')[0]} 👋
          </h2>
          <p style={{ color: 'var(--text-3)', fontSize: '0.875rem' }}>
            {docs.length} documents available across {categories.length} categories
          </p>
        </div>
        <Link to="/app/documents" className="btn btn-primary btn-sm" style={{ flexShrink: 0 }}>
          Browse <ArrowRight size={13} />
        </Link>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
        {[
          { label: 'Available Docs',  value: docs.length,                                  icon: FileText,  color: 'var(--accent-2)', bg: 'var(--accent-dim)' },
          { label: 'Total Views',     value: docs.reduce((a, d) => a + (d.views || 0), 0), icon: Eye,       color: 'var(--teal)',     bg: 'var(--teal-dim)'   },
          { label: 'Categories',      value: categories.length,                             icon: TrendingUp,color: 'var(--amber)',    bg: 'var(--amber-dim)'  },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={18} color={color} />
            </div>
            <div>
              <div className="stat-value" style={{ fontSize: '1.5rem' }}>{value}</div>
              <div className="stat-label">{label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '1.5rem' }}>
        {/* Recently updated */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '0.9375rem' }}>Recently Updated</h3>
            <Link to="/app/documents" style={{ fontSize: '0.8rem', color: 'var(--accent-2)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {recent.map(doc => {
              const cat = getCat(doc.categoryId)
              return (
                <Link
                  key={doc.id} to={`/app/documents/${doc.id}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.875rem',
                    padding: '0.75rem',
                    background: 'var(--bg-3)',
                    borderRadius: 'var(--radius)',
                    border: '1.5px solid transparent',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-2)'; e.currentTarget.style.background = 'var(--bg-4)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'var(--bg-3)' }}
                >
                  <div style={{
                    width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                    background: cat ? `${cat.color}18` : 'var(--bg-4)',
                    border: `1px solid ${cat?.color || 'var(--border)'}33`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <FileText size={15} color={cat?.color || 'var(--text-3)'} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {doc.title}
                    </div>
                    <div style={{ fontSize: '0.73rem', color: 'var(--text-3)', display: 'flex', gap: '0.75rem', marginTop: '0.15rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Clock size={11} />{timeAgo(doc.updatedAt)}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Eye size={11} />{doc.views}
                      </span>
                    </div>
                  </div>
                  <span className="badge badge-gray" style={{ fontSize: '0.68rem', flexShrink: 0 }}>
                    {doc.fileType?.toUpperCase()}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Top viewed */}
        <div className="card">
          <h3 style={{ fontSize: '0.9375rem', marginBottom: '1.25rem' }}>Most Viewed</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {topViewed.map((doc, i) => {
              const cat = getCat(doc.categoryId)
              return (
                <Link key={doc.id} to={`/app/documents/${doc.id}`}
                  style={{ display: 'flex', gap: '0.875rem', alignItems: 'center', textDecoration: 'none' }}>
                  <span style={{
                    fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 800,
                    color: i === 0 ? 'var(--accent-2)' : 'var(--text-3)',
                    width: 20, flexShrink: 0, textAlign: 'center',
                  }}>
                    {i + 1}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, fontSize: '0.8125rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '0.2rem', color: 'var(--text-1)' }}>
                      {doc.title}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Eye size={11} /> {doc.views} views
                      {cat && <span style={{ color: cat.color, marginLeft: '0.4rem' }}>· {cat.name}</span>}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>

          {/* Quick categories */}
          <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600, marginBottom: '0.625rem' }}>
              Categories
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
              {categories.map(cat => (
                <Link key={cat.id} to={`/app/documents?cat=${cat.id}`}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.5rem', background: `${cat.color}14`, border: `1px solid ${cat.color}30`, borderRadius: '99px', fontSize: '0.72rem', color: cat.color, fontWeight: 500 }}>
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
