import { useState, useEffect } from 'react'
import { useApp } from '../../context/AppContext'
import { api } from '../../utils/api'
import { generateId } from '../../utils/helpers'
import { Plus, Edit2, Trash2, X, Tag, FileText } from 'lucide-react'

const COLORS = [
  '#6366f1','#14b8a6','#f59e0b','#ec4899','#8b5cf6',
  '#06b6d4','#10b981','#f97316','#e11d48','#3b82f6'
]

const ICONS = ['Tag','FileText','Shield','Code','DollarSign','Users','Globe','BookOpen','Briefcase','Star']

export default function CategoriesPage() {
  const { showToast } = useApp()
  const [categories, setCategories] = useState([])
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [current, setCurrent] = useState(null)
  const [form, setForm] = useState({ name: '', color: COLORS[0], icon: 'Tag' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const [c, d] = await Promise.all([api.categories.list(), api.documents.list()])
    setCategories(c)
    setDocuments(d)
    setLoading(false)
  }

  function openCreate() {
    setForm({ name: '', color: COLORS[0], icon: 'Tag' })
    setCurrent(null)
    setModal('form')
  }

  function openEdit(cat) {
    setForm({ name: cat.name, color: cat.color || COLORS[0], icon: cat.icon || 'Tag' })
    setCurrent(cat)
    setModal('form')
  }

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const docCount = documents.filter(d => d.categoryId === current?.id).length
      if (current) {
        const updated = await api.categories.update(current.id, form)
        setCategories(cs => cs.map(c => c.id === current.id ? { ...c, ...updated } : c))
        showToast('Category updated', 'success')
      } else {
        const created = await api.categories.create({ ...form, id: generateId(), docCount: 0 })
        setCategories(cs => [...cs, created])
        showToast('Category created', 'success')
      }
      setModal(null)
    } catch { showToast('Failed to save', 'error') }
    setSaving(false)
  }

  async function deleteCategory(cat) {
    const docsInCat = documents.filter(d => d.categoryId === cat.id).length
    if (docsInCat > 0) {
      showToast(`Cannot delete: ${docsInCat} documents use this category`, 'error')
      return
    }
    if (!confirm(`Delete category "${cat.name}"?`)) return
    await api.categories.delete(cat.id)
    setCategories(cs => cs.filter(c => c.id !== cat.id))
    showToast('Category deleted', 'success')
  }

  const getDocCount = (catId) => documents.filter(d => d.categoryId === catId).length

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
      <span className="spinner" style={{ width: 28, height: 28 }} />
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-primary btn-sm" onClick={openCreate}>
          <Plus size={14} /> Add Category
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
        {categories.map(cat => {
          const count = getDocCount(cat.id)
          return (
            <div key={cat.id} className="card" style={{ position: 'relative', overflow: 'hidden' }}>
              {/* Color strip */}
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                background: cat.color || 'var(--accent)'
              }} />
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', paddingTop: '0.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                    background: `${cat.color}22`,
                    border: `1.5px solid ${cat.color}44`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Tag size={18} color={cat.color} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{cat.name}</div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <FileText size={12} />{count} document{count !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <button className="btn-icon" onClick={() => openEdit(cat)}><Edit2 size={14} /></button>
                  <button className="btn-icon" onClick={() => deleteCategory(cat)} style={{ color: 'var(--rose)' }}><Trash2 size={14} /></button>
                </div>
              </div>

              {/* Progress bar showing relative doc count */}
              <div style={{ marginTop: '1rem' }}>
                <div className="progress-bar">
                  <div className="progress-fill" style={{
                    width: `${Math.min(100, (count / Math.max(1, documents.length)) * 100 * 3)}%`,
                    background: cat.color
                  }} />
                </div>
              </div>
            </div>
          )
        })}
        {categories.length === 0 && (
          <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
            <div className="empty-state-icon">🏷️</div>
            <h3>No categories yet</h3>
          </div>
        )}
      </div>

      {modal === 'form' && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">{current ? 'Edit Category' : 'New Category'}</h2>
              <button className="btn-icon" onClick={() => setModal(null)}><X size={18} /></button>
            </div>
            <form onSubmit={save}>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Name *</label>
                <input className="input" required value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Technical Docs" />
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Color</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                  {COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))}
                      style={{
                        width: 28, height: 28, borderRadius: '50%', background: c,
                        border: form.color === c ? '3px solid var(--text-1)' : '3px solid transparent',
                        outline: form.color === c ? '2px solid var(--bg-4)' : 'none',
                        cursor: 'pointer', transition: 'all 0.15s'
                      }} />
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div style={{
                padding: '0.875rem', background: 'var(--bg-3)', borderRadius: 'var(--radius)',
                marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem'
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8, background: `${form.color}22`,
                  border: `1.5px solid ${form.color}44`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Tag size={16} color={form.color} />
                </div>
                <span style={{ fontWeight: 500 }}>{form.name || 'Preview'}</span>
                <span style={{
                  marginLeft: 'auto', padding: '0.15rem 0.5rem', borderRadius: 99,
                  background: `${form.color}22`, color: form.color, fontSize: '0.75rem', fontWeight: 600
                }}>Category</span>
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
    </div>
  )
}
