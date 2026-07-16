import { useState, useEffect } from 'react'
import { useApp } from '../../context/AppContext'
import { api } from '../../utils/api'
import { formatDate, formatBytes } from '../../utils/helpers'
import { Search, Trash2, Eye, Edit2, FileText } from 'lucide-react'
import Pagination from '../../components/shared/Pagination'

const PAGE_SIZE = 10

export default function AdminDocsPage() {
  const { showToast } = useApp()
  const [docs, setDocs] = useState([])
  const [categories, setCategories] = useState([])
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    const [d, c, u] = await Promise.all([api.documents.list(), api.categories.list(), api.users.list()])
    setDocs(d); setCategories(c); setUsers(u)
    setLoading(false)
  }

  async function toggleStatus(doc) {
    const newStatus = doc.status === 'published' ? 'draft' : 'published'
    await api.documents.update(doc.id, { status: newStatus })
    setDocs(ds => ds.map(d => d.id === doc.id ? { ...d, status: newStatus } : d))
    showToast(`Document ${newStatus}`, 'success')
  }

  async function deleteDoc(doc) {
    if (!confirm(`Delete "${doc.title}"?`)) return
    await api.documents.delete(doc.id)
    setDocs(ds => ds.filter(d => d.id !== doc.id))
    showToast('Document deleted', 'success')
  }

  const filtered = docs.filter(d => {
    if (search && !d.title.toLowerCase().includes(search.toLowerCase())) return false
    if (filterCat && d.categoryId !== filterCat) return false
    if (filterStatus && d.status !== filterStatus) return false
    return true
  })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const getCat = id => categories.find(c => c.id === id)
  const getUser = id => users.find(u => u.id === id)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 220px' }}>
          <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
          <input className="input" placeholder="Search documents…" value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }} style={{ paddingLeft: '2.25rem' }} />
        </div>
        <select className="input" style={{ width: 'auto' }} value={filterCat} onChange={e => { setFilterCat(e.target.value); setPage(1) }}>
          <option value="">All categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="input" style={{ width: 'auto' }} value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1) }}>
          <option value="">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <span className="spinner" style={{ width: 28, height: 28 }} />
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Uploaded by</th>
                  <th>Status</th>
                  <th>Type</th>
                  <th>Size</th>
                  <th>Version</th>
                  <th>Updated</th>
                  <th style={{ width: 90 }}></th>
                </tr>
              </thead>
              <tbody>
                {paged.map(doc => {
                  const cat = getCat(doc.categoryId)
                  const uploader = getUser(doc.uploadedBy)
                  return (
                    <tr key={doc.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <FileText size={15} color="var(--accent-2)" style={{ flexShrink: 0 }} />
                          <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>{doc.title}</span>
                        </div>
                      </td>
                      <td>
                        {cat ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8125rem', color: cat.color }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
                            {cat.name}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ fontSize: '0.8125rem', color: 'var(--text-2)' }}>{uploader?.name || '—'}</td>
                      <td>
                        <button onClick={() => toggleStatus(doc)}
                          className={`badge ${doc.status === 'published' ? 'badge-green' : 'badge-amber'}`}
                          style={{ cursor: 'pointer', border: 'none' }}>
                          {doc.status}
                        </button>
                      </td>
                      <td><span className="badge badge-gray">{doc.fileType?.toUpperCase()}</span></td>
                      <td style={{ fontSize: '0.8125rem', color: 'var(--text-3)' }}>{formatBytes(doc.fileSize)}</td>
                      <td style={{ fontSize: '0.8125rem', color: 'var(--text-3)' }}>v{doc.currentVersion}</td>
                      <td style={{ fontSize: '0.8125rem', color: 'var(--text-3)' }}>{formatDate(doc.updatedAt)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          <button className="btn-icon" onClick={() => deleteDoc(doc)} style={{ color: 'var(--rose)' }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {paged.length === 0 && (
                  <tr><td colSpan={9}>
                    <div className="empty-state">
                      <div className="empty-state-icon">📄</div>
                      <h3>No documents found</h3>
                    </div>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-3)' }}>{filtered.length} documents</span>
          <Pagination page={page} totalPages={totalPages} onPage={setPage} />
        </div>
      </div>
    </div>
  )
}
