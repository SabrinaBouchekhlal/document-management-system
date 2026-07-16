import { useState, useEffect, useRef } from 'react'
import { useApp } from '../../context/AppContext'
import { api } from '../../utils/api'
import { formatDate, exportToCSV, generateId, avatarColor, getInitials } from '../../utils/helpers'
import Pagination from '../../components/shared/Pagination'
import Papa from 'papaparse'
import {
  Plus, Search, Filter, Download, Upload, UserX, Edit2,
  Trash2, CheckSquare, Square, X, ChevronDown, MoreHorizontal,
  Eye, AlertTriangle, Users
} from 'lucide-react'

const PAGE_SIZE = 8

export default function UsersPage() {
  const { showToast } = useApp()
  const [users, setUsers] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterDept, setFilterDept] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(new Set())
  const [modal, setModal] = useState(null) // null | 'create' | 'edit' | 'import'
  const [editUser, setEditUser] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user', departmentId: '', status: 'active' })
  const [saving, setSaving] = useState(false)
  const [importStep, setImportStep] = useState(1)
  const [importData, setImportData] = useState([])
  const [importErrors, setImportErrors] = useState([])
  const fileRef = useRef()
  const csvRef = useRef()

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [u, d] = await Promise.all([api.users.list(), api.departments.list()])
    setUsers(u)
    setDepartments(d)
    setLoading(false)
  }

  const filtered = users.filter(u => {
    if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false
    if (filterRole && u.role !== filterRole) return false
    if (filterStatus && u.status !== filterStatus) return false
    if (filterDept && u.departmentId !== filterDept) return false
    return true
  })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function toggleSelect(id) {
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function toggleAll() {
    if (selected.size === paged.length) setSelected(new Set())
    else setSelected(new Set(paged.map(u => u.id)))
  }

  function openCreate() {
    setForm({ name: '', email: '', password: 'user123', role: 'user', departmentId: '', status: 'active' })
    setEditUser(null)
    setModal('create')
  }
  
  function openEdit(u) {
    setForm({ 
      name: u.name, 
      email: u.email, 
      password: '',              // ← change u.password to ''
      role: u.role, 
      departmentId: u.departmentId || '', 
      status: u.status 
    })
    setEditUser(u)
    setModal('edit')
  }

  async function saveUser(e) {
    e.preventDefault()
    setSaving(true)
    try {
      if (editUser) {
        const updated = await api.users.update(editUser.id, { ...form })
        setUsers(us => us.map(u => u.id === editUser.id ? { ...u, ...updated } : u))
        showToast('User updated', 'success')
      } else {
        const created = await api.users.create({ ...form, id: generateId(), avatar: getInitials(form.name), createdAt: new Date().toISOString() })
        setUsers(us => [...us, created])
        showToast('User created', 'success')
      }
      setModal(null)
    } catch { showToast('Failed to save', 'error') }
    setSaving(false)
  }

  async function deleteUser(u) {
    if (!confirm(`Delete ${u.name}?`)) return
    await api.users.delete(u.id)
    setUsers(us => us.filter(x => x.id !== u.id))
    showToast('User deleted', 'success')
  }

  async function bulkSuspend() {
    for (const id of selected) {
      await api.users.update(id, { status: 'suspended' })
      setUsers(us => us.map(u => u.id === id ? { ...u, status: 'suspended' } : u))
    }
    showToast(`${selected.size} users suspended`, 'success')
    setSelected(new Set())
  }

  function bulkExport() {
    const toExport = users.filter(u => selected.has(u.id)).map(({ password, ...u }) => u)
    exportToCSV(toExport, 'users-export')
    showToast('Export downloaded', 'success')
  }

  function exportAll() {
    exportToCSV(users.map(({ password, ...u }) => u), 'all-users')
    showToast('All users exported', 'success')
  }

  function handleCSVUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const errors = []
        const data = result.data.map((row, i) => {
          const errs = []
          if (!row.name) errs.push('Missing name')
          if (!row.email) errs.push('Missing email')
          if (!row.role || !['user', 'admin'].includes(row.role)) errs.push('Invalid role (must be user or admin)')
          if (errs.length) errors.push({ row: i + 1, errors: errs })
          return { ...row, id: generateId(), password: 'user123', status: row.status || 'active', avatar: getInitials(row.name || ''), createdAt: new Date().toISOString() }
        })
        setImportData(data)
        setImportErrors(errors)
        setImportStep(2)
      }
    })
  }

  async function confirmImport() {
    setSaving(true)
    let count = 0
    for (const user of importData) {
      try { await api.users.create(user); count++ } catch {}
    }
    await load()
    setModal(null)
    setImportStep(1)
    setImportData([])
    showToast(`${count} users imported`, 'success')
    setSaving(false)
  }

  function downloadTemplate() {
    exportToCSV([{ name: 'John Doe', email: 'john@example.com', role: 'user', departmentId: '1', status: 'active' }], 'import-template')
  }

  const dept = (id) => departments.find(d => d.id === id)?.name || '—'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 220px' }}>
          <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
          <input className="input" placeholder="Search users…" value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            style={{ paddingLeft: '2.25rem' }} data-testid="user-search" />
        </div>

        <select className="input" style={{ width: 'auto' }} value={filterRole} onChange={e => { setFilterRole(e.target.value); setPage(1) }}>
          <option value="">All roles</option>
          <option value="admin">Admin</option>
          <option value="user">User</option>
        </select>

        <select className="input" style={{ width: 'auto' }} value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1) }}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>

        <select className="input" style={{ width: 'auto' }} value={filterDept} onChange={e => { setFilterDept(e.target.value); setPage(1) }}>
          <option value="">All departments</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>

        <button className="btn btn-secondary btn-sm" onClick={exportAll}>
          <Download size={14} /> Export All
        </button>
        <button className="btn btn-secondary btn-sm" onClick={() => { setImportStep(1); setModal('import') }}>
          <Upload size={14} /> Import CSV
        </button>
        <button className="btn btn-primary btn-sm" onClick={openCreate} data-testid="create-user-btn">
          <Plus size={14} /> Add User
        </button>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'var(--accent-dim)', border: '1px solid rgba(124,106,247,0.2)', borderRadius: 'var(--radius)' }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--accent-2)' }}>{selected.size} selected</span>
          <button className="btn btn-secondary btn-sm" onClick={bulkSuspend}>
            <UserX size={13} /> Suspend Selected
          </button>
          <button className="btn btn-secondary btn-sm" onClick={bulkExport}>
            <Download size={13} /> Export Selected
          </button>
          <button className="btn-icon btn-sm" onClick={() => setSelected(new Set())} style={{ marginLeft: 'auto' }}>
            <X size={15} />
          </button>
        </div>
      )}

      {/* Table */}
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
                  <th style={{ width: 40 }}>
                    <input type="checkbox" className="checkbox"
                      checked={selected.size === paged.length && paged.length > 0}
                      onChange={toggleAll} />
                  </th>
                  <th>User</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th style={{ width: 80 }}></th>
                </tr>
              </thead>
              <tbody>
                {paged.map(u => (
                  <tr key={u.id} style={{ opacity: u.status === 'suspended' ? 0.65 : 1 }}>
                    <td>
                      <input type="checkbox" className="checkbox"
                        checked={selected.has(u.id)} onChange={() => toggleSelect(u.id)} />
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div className="avatar avatar-sm" style={{ background: avatarColor(u.name), color: '#fff' }}>
                          {getInitials(u.name)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{u.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${u.role === 'admin' ? 'badge-purple' : 'badge-teal'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.875rem', color: 'var(--text-2)' }}>{dept(u.departmentId)}</td>
                    <td>
                      <span className={`badge ${u.status === 'active' ? 'badge-green' : 'badge-rose'}`}>
                        {u.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--text-3)' }}>{formatDate(u.createdAt)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button className="btn-icon" onClick={() => openEdit(u)} title="Edit">
                          <Edit2 size={14} />
                        </button>
                        <button className="btn-icon" onClick={() => deleteUser(u)} title="Delete" style={{ color: 'var(--rose)' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {paged.length === 0 && (
                  <tr><td colSpan={7}>
                    <div className="empty-state">
                      <div className="empty-state-icon">👤</div>
                      <h3>No users found</h3>
                    </div>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-3)' }}>
            {filtered.length} user{filtered.length !== 1 ? 's' : ''}
          </span>
          <Pagination page={page} totalPages={totalPages} onPage={setPage} />
        </div>
      </div>

      {/* Create/Edit Modal */}
      {(modal === 'create' || modal === 'edit') && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal" data-testid="user-modal">
            <div className="modal-header">
              <h2 className="modal-title">{editUser ? 'Edit User' : 'Create User'}</h2>
              <button className="btn-icon" onClick={() => setModal(null)}><X size={18} /></button>
            </div>
            <form onSubmit={saveUser}>
              <div className="form-row form-row-2" style={{ marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Full name *</label>
                  <input className="input" required value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Jane Smith" />
                </div>
                <div className="form-group">
                  <label className="form-label">Email *</label>
                  <input className="input" type="email" required value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@company.com" />
                </div>
              </div>
              <div className="form-row form-row-2" style={{ marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Password *</label>
                  <input className="input" value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" />
                </div>
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select className="input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <div className="form-row form-row-2" style={{ marginBottom: '1.5rem' }}>
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <select className="input" value={form.departmentId} onChange={e => setForm(f => ({ ...f, departmentId: e.target.value }))}>
                    <option value="">None</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving} data-testid="user-modal-save">
                  {saving ? <span className="spinner" style={{ width: 14, height: 14 }} /> : null}
                  {editUser ? 'Save changes' : 'Create user'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import CSV Modal */}
      {modal === 'import' && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Import Users from CSV</h2>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                  {[1, 2, 3].map(s => (
                    <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.7rem', fontWeight: 700,
                        background: importStep >= s ? 'var(--accent)' : 'var(--bg-4)',
                        color: importStep >= s ? '#fff' : 'var(--text-3)',
                        transition: 'all 0.2s'
                      }}>{s}</div>
                      <span style={{ fontSize: '0.75rem', color: importStep >= s ? 'var(--text-1)' : 'var(--text-3)' }}>
                        {['Upload', 'Validate', 'Import'][s - 1]}
                      </span>
                      {s < 3 && <ChevronDown size={12} style={{ transform: 'rotate(-90deg)', color: 'var(--text-3)' }} />}
                    </div>
                  ))}
                </div>
              </div>
              <button className="btn-icon" onClick={() => { setModal(null); setImportStep(1) }}><X size={18} /></button>
            </div>

            {importStep === 1 && (
              <div>
                <div className="upload-zone" onClick={() => csvRef.current?.click()}
                  style={{ marginBottom: '1rem' }}>
                  <Upload size={32} style={{ marginBottom: '0.75rem', opacity: 0.5 }} />
                  <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>Click to upload CSV file</div>
                  <div style={{ fontSize: '0.8125rem' }}>Required columns: name, email, role</div>
                  <input ref={csvRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleCSVUpload} />
                </div>
                <button className="btn btn-ghost btn-sm" onClick={downloadTemplate}>
                  <Download size={13} /> Download template
                </button>
              </div>
            )}

            {importStep === 2 && (
              <div>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{ padding: '0.75rem 1rem', background: 'var(--green-dim)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 'var(--radius)', fontSize: '0.875rem', color: 'var(--green)' }}>
                    ✓ {importData.length - importErrors.length} valid rows
                  </div>
                  {importErrors.length > 0 && (
                    <div style={{ padding: '0.75rem 1rem', background: 'var(--rose-dim)', border: '1px solid rgba(251,113,133,0.2)', borderRadius: 'var(--radius)', fontSize: '0.875rem', color: 'var(--rose)' }}>
                      ✗ {importErrors.length} errors
                    </div>
                  )}
                </div>
                {importErrors.length > 0 && (
                  <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'var(--bg-3)', borderRadius: 'var(--radius)', maxHeight: 160, overflowY: 'auto' }}>
                    {importErrors.map(e => (
                      <div key={e.row} style={{ fontSize: '0.8125rem', color: 'var(--rose)', marginBottom: '0.25rem' }}>
                        Row {e.row}: {e.errors.join(', ')}
                      </div>
                    ))}
                  </div>
                )}
                <div className="table-wrap" style={{ maxHeight: 280, overflow: 'auto', marginBottom: '1.5rem' }}>
                  <table className="table">
                    <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th></tr></thead>
                    <tbody>
                      {importData.slice(0, 10).map((u, i) => (
                        <tr key={i}><td>{u.name}</td><td>{u.email}</td><td>{u.role}</td><td>{u.status}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button className="btn btn-secondary" onClick={() => setImportStep(1)}>Back</button>
                  <button className="btn btn-primary" onClick={confirmImport} disabled={saving}>
                    {saving ? <span className="spinner" style={{ width: 14, height: 14 }} /> : null}
                    Import {importData.length} users
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
