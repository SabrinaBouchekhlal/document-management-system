import { useState, useEffect } from 'react'
import { useApp } from '../../context/AppContext'
import { api } from '../../utils/api'
import { generateId, avatarColor, getInitials } from '../../utils/helpers'
import { Plus, Edit2, Trash2, X, Building2, Users } from 'lucide-react'

export default function DepartmentsPage() {
  const { showToast } = useApp()
  const [departments, setDepartments] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | 'create' | 'edit' | 'assign'
  const [current, setCurrent] = useState(null)
  const [form, setForm] = useState({ name: '', description: '' })
  const [assignDeptId, setAssignDeptId] = useState(null)
  const [selectedUsers, setSelectedUsers] = useState(new Set())
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [d, u] = await Promise.all([api.departments.list(), api.users.list()])
    setDepartments(d)
    setUsers(u)
    setLoading(false)
  }

  function openCreate() {
    setForm({ name: '', description: '' })
    setCurrent(null)
    setModal('create')
  }

  function openEdit(dept) {
    setForm({ name: dept.name, description: dept.description || '' })
    setCurrent(dept)
    setModal('edit')
  }

  function openAssign(dept) {
    setAssignDeptId(dept.id)
    const deptUsers = users.filter(u => u.departmentId === dept.id).map(u => u.id)
    setSelectedUsers(new Set(deptUsers))
    setModal('assign')
  }

  async function saveDept(e) {
    e.preventDefault()
    setSaving(true)
    try {
      if (current) {
        const updated = await api.departments.update(current.id, form)
        setDepartments(ds => ds.map(d => d.id === current.id ? { ...d, ...updated } : d))
        showToast('Department updated', 'success')
      } else {
        const created = await api.departments.create({ ...form, id: generateId(), memberCount: 0 })
        setDepartments(ds => [...ds, created])
        showToast('Department created', 'success')
      }
      setModal(null)
    } catch { showToast('Failed to save', 'error') }
    setSaving(false)
  }

  async function deleteDept(dept) {
    if (!confirm(`Delete department "${dept.name}"?`)) return
    await api.departments.delete(dept.id)
    setDepartments(ds => ds.filter(d => d.id !== dept.id))
    showToast('Department deleted', 'success')
  }

  async function saveAssignments() {
    setSaving(true)
    try {
      // Update all users
      const updates = users.map(u => {
        const shouldBeInDept = selectedUsers.has(u.id)
        const isInDept = u.departmentId === assignDeptId
        if (shouldBeInDept && !isInDept) {
          return api.users.update(u.id, { departmentId: assignDeptId })
        }
        if (!shouldBeInDept && isInDept) {
          return api.users.update(u.id, { departmentId: '' })
        }
        return Promise.resolve(u)
      })
      const updated = await Promise.all(updates)
      // Refresh users
      const freshUsers = await api.users.list()
      setUsers(freshUsers)
      // Update member count
      const count = freshUsers.filter(u => u.departmentId === assignDeptId).length
      await api.departments.update(assignDeptId, { memberCount: count })
      setDepartments(ds => ds.map(d => d.id === assignDeptId ? { ...d, memberCount: count } : d))
      showToast('Assignments saved', 'success')
      setModal(null)
    } catch { showToast('Failed to save', 'error') }
    setSaving(false)
  }

  function toggleUser(uid) {
    setSelectedUsers(s => { const n = new Set(s); n.has(uid) ? n.delete(uid) : n.add(uid); return n })
  }

  const getDeptUsers = (deptId) => users.filter(u => u.departmentId === deptId)

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
      <span className="spinner" style={{ width: 28, height: 28 }} />
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-primary btn-sm" onClick={openCreate}>
          <Plus size={14} /> Add Department
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
        {departments.map(dept => {
          const deptUsers = getDeptUsers(dept.id)
          return (
            <div key={dept.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: 'var(--accent-dim)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Building2 size={18} color="var(--accent-2)" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{dept.name}</div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-3)' }}>
                      {deptUsers.length} member{deptUsers.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <button className="btn-icon" onClick={() => openEdit(dept)} title="Edit"><Edit2 size={14} /></button>
                  <button className="btn-icon" onClick={() => deleteDept(dept)} title="Delete" style={{ color: 'var(--rose)' }}><Trash2 size={14} /></button>
                </div>
              </div>

              {dept.description && (
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-3)', lineHeight: 1.5 }}>{dept.description}</p>
              )}

              {/* Members preview */}
              <div>
                <div style={{ display: 'flex', marginBottom: '0.5rem' }}>
                  {deptUsers.slice(0, 5).map((u, i) => (
                    <div key={u.id} className="avatar avatar-sm"
                      style={{
                        background: avatarColor(u.name), color: '#fff',
                        border: '2px solid var(--bg-2)',
                        marginLeft: i > 0 ? -8 : 0,
                        zIndex: 5 - i
                      }}
                      title={u.name}
                    >
                      {getInitials(u.name)}
                    </div>
                  ))}
                  {deptUsers.length > 5 && (
                    <div className="avatar avatar-sm"
                      style={{ background: 'var(--bg-4)', color: 'var(--text-3)', border: '2px solid var(--bg-2)', marginLeft: -8, fontSize: '0.6rem' }}>
                      +{deptUsers.length - 5}
                    </div>
                  )}
                  {deptUsers.length === 0 && (
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-3)' }}>No members yet</span>
                  )}
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => openAssign(dept)}>
                  <Users size={13} /> Manage Members
                </button>
              </div>
            </div>
          )
        })}
        {departments.length === 0 && (
          <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
            <div className="empty-state-icon">🏢</div>
            <h3>No departments yet</h3>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(modal === 'create' || modal === 'edit') && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">{current ? 'Edit Department' : 'New Department'}</h2>
              <button className="btn-icon" onClick={() => setModal(null)}><X size={18} /></button>
            </div>
            <form onSubmit={saveDept}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Name *</label>
                <input className="input" required value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Engineering" />
              </div>
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Description</label>
                <textarea className="input" rows={3} value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Brief description of this department…" />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <span className="spinner" style={{ width: 14, height: 14 }} /> : null}
                  {current ? 'Save' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Members Modal */}
      {modal === 'assign' && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">
                Manage Members — {departments.find(d => d.id === assignDeptId)?.name}
              </h2>
              <button className="btn-icon" onClick={() => setModal(null)}><X size={18} /></button>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-3)', marginBottom: '1rem' }}>
              Select users to assign to this department.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 320, overflowY: 'auto', marginBottom: '1.5rem' }}>
              {users.map(u => (
                <label key={u.id} style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.625rem 0.75rem',
                  borderRadius: 'var(--radius)',
                  background: selectedUsers.has(u.id) ? 'var(--accent-dim)' : 'var(--bg-3)',
                  border: `1.5px solid ${selectedUsers.has(u.id) ? 'rgba(124,106,247,0.3)' : 'var(--border)'}`,
                  cursor: 'pointer', transition: 'all 0.15s'
                }}>
                  <input type="checkbox" className="checkbox"
                    checked={selectedUsers.has(u.id)} onChange={() => toggleUser(u.id)} />
                  <div className="avatar avatar-sm" style={{ background: avatarColor(u.name), color: '#fff' }}>
                    {getInitials(u.name)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{u.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{u.email}</div>
                  </div>
                  <span className={`badge ${u.role === 'admin' ? 'badge-purple' : 'badge-teal'}`}>{u.role}</span>
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveAssignments} disabled={saving}>
                {saving ? <span className="spinner" style={{ width: 14, height: 14 }} /> : null}
                Save ({selectedUsers.size} members)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
