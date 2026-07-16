import { useState, useEffect } from 'react'
import { api } from '../../utils/api'
import { formatDate, formatBytes } from '../../utils/helpers'
import { Users, FileText, Building2, Tag, Eye, TrendingUp, ArrowUpRight } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const chartData = [
  { name: 'Oct', docs: 3 }, { name: 'Nov', docs: 5 }, { name: 'Dec', docs: 4 },
  { name: 'Jan', docs: 7 }, { name: 'Feb', docs: 6 }, { name: 'Mar', docs: 9 },
]

export default function AdminDashboard() {
  const [stats, setStats] = useState({ users: 0, docs: 0, depts: 0, cats: 0 })
  const [recentDocs, setRecentDocs] = useState([])
  const [recentUsers, setRecentUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [users, docs, depts, cats] = await Promise.all([
        api.users.list(), api.documents.list(), api.departments.list(), api.categories.list()
      ])
      setStats({ users: users.length, docs: docs.length, depts: depts.length, cats: cats.length })
      setRecentDocs([...docs].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 5))
      setRecentUsers([...users].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5))
      setLoading(false)
    }
    load().catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 320 }}>
      <span className="spinner" style={{ width: 28, height: 28 }} />
    </div>
  )

  const statCards = [
    { label: 'Total Users',  value: stats.users, icon: Users,     color: 'var(--accent-2)', bg: 'var(--accent-dim)', trend: '+12%' },
    { label: 'Documents',    value: stats.docs,  icon: FileText,  color: 'var(--teal)',     bg: 'var(--teal-dim)',   trend: '+8%'  },
    { label: 'Departments',  value: stats.depts, icon: Building2, color: 'var(--amber)',    bg: 'var(--amber-dim)',  trend: null   },
    { label: 'Categories',   value: stats.cats,  icon: Tag,       color: 'var(--rose)',     bg: 'var(--rose-dim)',   trend: null   },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        {statCards.map(({ label, value, icon: Icon, color, bg, trend }) => (
          <div key={label} className="stat-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={18} color={color} />
              </div>
              {trend && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.75rem', color: 'var(--green)', fontWeight: 600 }}>
                  <TrendingUp size={12} />{trend}
                </div>
              )}
            </div>
            <div>
              <div className="stat-value">{value}</div>
              <div className="stat-label">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Middle row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '1.5rem' }}>
        {/* Chart */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '0.9375rem', marginBottom: '0.2rem' }}>Document Uploads</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>Last 6 months</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', color: 'var(--green)', fontWeight: 600, background: 'var(--green-dim)', padding: '0.25rem 0.625rem', borderRadius: '99px', border: '1px solid rgba(34,211,165,0.2)' }}>
              <TrendingUp size={12} /> +24% vs last period
            </div>
          </div>
          <ResponsiveContainer width="100%" height={175}>
            <BarChart data={chartData} barSize={26} barCategoryGap="35%">
              <XAxis dataKey="name" tick={{ fill: 'var(--text-3)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-3)', fontSize: 11 }} axisLine={false} tickLine={false} width={24} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-3)', border: '1px solid var(--border-2)', borderRadius: 8, fontSize: 12, boxShadow: 'var(--shadow)' }}
                cursor={{ fill: 'rgba(124,106,247,0.06)', radius: 4 }}
                formatter={(v) => [v, 'Documents']}
              />
              <Bar dataKey="docs" radius={[5, 5, 0, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={i === chartData.length - 1 ? 'var(--accent)' : 'var(--bg-4)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent users */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '0.9375rem' }}>Recent Users</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Last joined</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {recentUsers.map(u => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div className="avatar avatar-sm" style={{
                  background: `hsl(${u.name.charCodeAt(0) * 47 % 360}, 55%, 42%)`,
                  color: '#fff', flexShrink: 0,
                }}>
                  {u.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                </div>
                <span className={`badge ${u.status === 'active' ? 'badge-green' : 'badge-rose'}`}>{u.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent documents table */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '0.9375rem', fontFamily: 'var(--font-display)' }}>Recent Documents</h3>
        </div>
        <div className="table-container">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Type</th>
                  <th>Size</th>
                  <th>Views</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {recentDocs.map(doc => (
                  <tr key={doc.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--bg-4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <FileText size={13} color="var(--accent-2)" />
                        </div>
                        <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>{doc.title}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${doc.status === 'published' ? 'badge-green' : 'badge-amber'}`}>{doc.status}</span>
                    </td>
                    <td><span className="badge badge-gray">{doc.fileType?.toUpperCase()}</span></td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--text-3)' }}>{formatBytes(doc.fileSize)}</td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8125rem', color: 'var(--text-2)' }}>
                        <Eye size={13} color="var(--text-3)" />{doc.views}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--text-3)' }}>{formatDate(doc.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
