import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { api, uploadFileToS3 } from '../../utils/api'
import { formatDate, formatBytes, generateId, timeAgo } from '../../utils/helpers'
import Pagination from '../../components/shared/Pagination'
import {
  Search, Upload, FileText, Eye, Download, X,
  SlidersHorizontal, LayoutGrid, List, Clock, ArrowRight,
  CheckCircle, AlertCircle, Loader
} from 'lucide-react'

const PAGE_SIZE = 9

export default function DocumentsPage() {
  const { user, showToast } = useApp()
  const [docs, setDocs] = useState([])
  const [categories, setCategories] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [filterDept, setFilterDept] = useState('')
  const [filterType, setFilterType] = useState('')
  const [page, setPage] = useState(1)
  const [view, setView] = useState('grid')
  const [showUpload, setShowUpload] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [uploadForm, setUploadForm] = useState({
    title: '', description: '', categoryId: '',
    departmentId: '', fileType: 'pdf', tags: ''
  })
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadStage, setUploadStage] = useState('') // 's3' | 'saving' | 'ai' | ''
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef()
  const dropRef = useRef()

  useEffect(() => { load() }, [])

  async function load() {
    const [d, c, dept] = await Promise.all([
      api.documents.list({ status: 'published' }),
      api.categories.list(),
      api.departments.list()
    ])
    setDocs(d); setCategories(c); setDepartments(dept)
    setLoading(false)
  }

  const filtered = docs.filter(d => {
    if (search && !d.title?.toLowerCase().includes(search.toLowerCase()) &&
      !d.description?.toLowerCase().includes(search.toLowerCase()) &&
      !d.tags?.some(t => t.toLowerCase().includes(search.toLowerCase()))) return false
    if (filterCat  && d.categoryId   !== filterCat)  return false
    if (filterDept && d.departmentId !== filterDept)  return false
    if (filterType && d.fileType     !== filterType)  return false
    return true
  })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged      = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const getCat     = id => categories.find(c => c.id === id)
  const activeFilters = [filterCat, filterDept, filterType].filter(Boolean).length

  function handleFileDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      setSelectedFile(file)
      // Auto-detect file type
      const ext = file.name.split('.').pop().toLowerCase()
      if (['pdf','docx','xlsx','pptx','txt'].includes(ext)) {
        setUploadForm(f => ({ ...f, fileType: ext }))
      }
      // Auto-fill title from filename if empty
      if (!uploadForm.title) {
        setUploadForm(f => ({ ...f, title: file.name.replace(/\.[^/.]+$/, '') }))
      }
    }
  }

  function handleFileSelect(e) {
    const file = e.target.files[0]
    if (!file) return
    setSelectedFile(file)
    const ext = file.name.split('.').pop().toLowerCase()
    if (['pdf','docx','xlsx','pptx','txt'].includes(ext)) {
      setUploadForm(f => ({ ...f, fileType: ext }))
    }
    if (!uploadForm.title) {
      setUploadForm(f => ({ ...f, title: file.name.replace(/\.[^/.]+$/, '') }))
    }
  }

  async function handleUpload(e) {
    e.preventDefault()
    if (!uploadForm.title.trim()) {
      showToast('Title is required', 'error')
      return
    }
    setUploading(true)
    try {
      const tags  = uploadForm.tags.split(',').map(t => t.trim()).filter(Boolean)
      const docId = crypto.randomUUID ? crypto.randomUUID() : generateId()
      let s3Key   = null

      // ── Step 1: Upload file to S3 ───────────────────────────────────────────
      if (selectedFile) {
        setUploadStage('s3')
        try {
          s3Key = await uploadFileToS3(selectedFile, docId)
        } catch (s3Err) {
          showToast(`File upload failed: ${s3Err.message}`, 'error')
          setUploading(false)
          setUploadStage('')
          return
        }
      }

      // ── Step 2: Create document record in backend ───────────────────────────
      setUploadStage('saving')
      const doc = await api.documents.create({
        title:        uploadForm.title.trim(),
        description:  uploadForm.description.trim(),
        categoryId:   uploadForm.categoryId || null,
        departmentId: uploadForm.departmentId || null,
        fileType:     uploadForm.fileType,
        fileSize:     selectedFile ? selectedFile.size : 0,
        tags,
        status: 'published',
        s3Key,
      })

      setDocs(ds => [doc, ...ds])
      showToast('Document uploaded successfully', 'success')

      // ── Step 3: Trigger AI summary (async, non-blocking) ────────────────────
      setUploadStage('ai')
      api.ai.processDocument(doc.id, doc.title, doc.description)
        .then(result => {
          // Update the doc in state with AI summary
          if (result?.summary) {
            setDocs(ds => ds.map(d =>
              d.id === doc.id
                ? { ...d, aiSummary: result.summary, aiSummaryFr: result.summaryFr }
                : d
            ))
            showToast('AI summary generated ✓', 'info')
          }
        })
        .catch(err => console.warn('AI summary (non-critical):', err.message))

      // Close modal and reset
      setShowUpload(false)
      setUploadForm({ title:'', description:'', categoryId:'', departmentId:'', fileType:'pdf', tags:'' })
      setSelectedFile(null)
      setUploadStage('')
    } catch (err) {
      showToast(`Upload failed: ${err.message}`, 'error')
    }
    setUploading(false)
    setUploadStage('')
  }

  const fileTypeColors = {
    pdf: 'var(--rose)', docx: '#60a5fa',
    xlsx: 'var(--green)', pptx: 'var(--amber)', txt: 'var(--text-3)'
  }

  function UploadProgress() {
    const stages = [
      { key: 's3',     label: 'Uploading file to S3…' },
      { key: 'saving', label: 'Saving document record…' },
      { key: 'ai',     label: 'Generating AI summary…' },
    ]
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
        {stages.map(({ key, label }) => {
          const stageIdx   = stages.findIndex(s => s.key === uploadStage)
          const thisIdx    = stages.findIndex(s => s.key === key)
          const isDone     = thisIdx < stageIdx
          const isCurrent  = key === uploadStage
          return (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', opacity: (isDone || isCurrent) ? 1 : 0.35 }}>
              {isDone
                ? <CheckCircle size={16} color="var(--green)" />
                : isCurrent
                  ? <Loader size={16} color="var(--accent-2)" style={{ animation: 'spin 0.8s linear infinite' }} />
                  : <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid var(--border)' }} />
              }
              <span style={{ fontSize: '0.875rem', color: isCurrent ? 'var(--text-1)' : 'var(--text-3)' }}>
                {label}
              </span>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 260px' }}>
          <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
          <input
            className="input"
            placeholder="Search documents, tags…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            style={{ paddingLeft: '2.25rem' }}
            data-testid="doc-search"
          />
        </div>

        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setShowFilters(v => !v)}
          style={activeFilters > 0 ? { borderColor: 'var(--accent)', color: 'var(--accent-2)', background: 'var(--accent-dim)' } : {}}
        >
          <SlidersHorizontal size={14} />
          Filters
          {activeFilters > 0 && (
            <span style={{ background: 'var(--accent)', color: '#fff', fontSize: '0.65rem', fontWeight: 700, padding: '0.05rem 0.4rem', borderRadius: '99px', lineHeight: 1.6 }}>
              {activeFilters}
            </span>
          )}
        </button>

        {/* View toggle */}
        <div style={{ display: 'flex', background: 'var(--bg-3)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', flexShrink: 0 }}>
          {[['grid', LayoutGrid], ['list', List]].map(([v, Icon]) => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: '0.4rem 0.6rem',
              background: view === v ? 'var(--bg-4)' : 'transparent',
              border: 'none',
              color: view === v ? 'var(--text-1)' : 'var(--text-3)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center',
              transition: 'all 0.12s',
            }}>
              <Icon size={15} />
            </button>
          ))}
        </div>

        <button className="btn btn-primary btn-sm" onClick={() => setShowUpload(true)} data-testid="upload-btn">
          <Upload size={14} /> Upload
        </button>
      </div>

      {/* Filter bar */}
      {showFilters && (
        <div style={{
          display: 'flex', gap: '0.625rem', flexWrap: 'wrap', alignItems: 'center',
          padding: '0.875rem 1rem',
          background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)',
          animation: 'slideUp 0.15s ease',
        }}>
          <select className="input" style={{ width: 'auto' }} value={filterCat} onChange={e => { setFilterCat(e.target.value); setPage(1) }}>
            <option value="">All categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="input" style={{ width: 'auto' }} value={filterDept} onChange={e => { setFilterDept(e.target.value); setPage(1) }}>
            <option value="">All departments</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select className="input" style={{ width: 'auto' }} value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1) }}>
            <option value="">All types</option>
            {['pdf','docx','xlsx','pptx','txt'].map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
          </select>
          {activeFilters > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setFilterCat(''); setFilterDept(''); setFilterType(''); setPage(1) }}>
              <X size={13} /> Clear
            </button>
          )}
        </div>
      )}

      {/* Result count */}
      <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', fontWeight: 500 }}>
        {filtered.length} document{filtered.length !== 1 ? 's' : ''}
        {search && <span style={{ color: 'var(--text-2)' }}> matching "{search}"</span>}
      </div>

      {/* Document grid */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <span className="spinner" style={{ width: 28, height: 28 }} />
        </div>
      ) : view === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {paged.map(doc => {
            const cat       = getCat(doc.categoryId)
            const typeColor = fileTypeColors[doc.fileType] || 'var(--text-3)'
            return (
              <Link
                key={doc.id} to={`/app/documents/${doc.id}`}
                data-testid="doc-card"
                style={{
                  display: 'flex', flexDirection: 'column', gap: '0.875rem',
                  padding: '1.125rem', textDecoration: 'none',
                  background: 'var(--bg-2)', border: '1.5px solid var(--border)',
                  borderRadius: 'var(--radius-lg)', transition: 'all 0.18s',
                  position: 'relative', overflow: 'hidden',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-2)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
              >
                {cat && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: cat.color }} />}

                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', paddingTop: cat ? '0.25rem' : 0 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 9, flexShrink: 0, background: cat ? `${cat.color}16` : 'var(--bg-4)', border: `1.5px solid ${cat?.color || 'var(--border)'}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileText size={17} color={cat?.color || 'var(--text-3)'} />
                  </div>
                  <span style={{ background: `${typeColor}18`, color: typeColor, border: `1px solid ${typeColor}30`, fontSize: '0.68rem', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: '99px', letterSpacing: '0.04em' }}>
                    {doc.fileType?.toUpperCase()}
                  </span>
                </div>

                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.35rem', lineHeight: 1.35, color: 'var(--text-1)' }}>
                    {doc.title}
                  </div>
                  {/* Show AI summary if available, else description */}
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', lineHeight: 1.55, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {doc.aiSummary || doc.description || '—'}
                  </div>
                  {doc.aiSummary && (
                    <span style={{ fontSize: '0.65rem', color: 'var(--accent-2)', marginTop: '0.25rem', display: 'inline-block' }}>
                      ✦ AI summary
                    </span>
                  )}
                </div>

                {doc.tags?.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                    {doc.tags.slice(0, 3).map(t => <span key={t} className="tag">{t}</span>)}
                    {doc.tags.length > 3 && <span className="tag">+{doc.tags.length - 3}</span>}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '0.25rem', borderTop: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', gap: '0.875rem', fontSize: '0.72rem', color: 'var(--text-3)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Eye size={11} />{doc.views || 0}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Download size={11} />{doc.downloads || 0}</span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Clock size={11} />{timeAgo(doc.updatedAt)}
                  </span>
                </div>
              </Link>
            )
          })}

          {paged.length === 0 && (
            <div className="empty-state" data-testid="empty-state" style={{ gridColumn: '1 / -1' }}>
              <div className="empty-state-icon">📄</div>
              <h3>No documents found</h3>
              <p style={{ fontSize: '0.8125rem', marginTop: '0.35rem' }}>Try adjusting your search or filters</p>
            </div>
          )}
        </div>
      ) : (
        /* List view */
        <div className="table-container">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Document</th><th>Category</th><th>Type</th>
                  <th>Size</th><th>Version</th><th>Views</th><th>Updated</th><th></th>
                </tr>
              </thead>
              <tbody>
                {paged.map(doc => {
                  const cat = getCat(doc.categoryId)
                  return (
                    <tr key={doc.id} data-testid="doc-card">
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                          <div style={{ width: 30, height: 30, borderRadius: 7, background: cat ? `${cat.color}16` : 'var(--bg-4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <FileText size={14} color={cat?.color || 'var(--text-3)'} />
                          </div>
                          <div>
                            <Link to={`/app/documents/${doc.id}`} style={{ fontWeight: 500, fontSize: '0.875rem', color: 'var(--text-1)' }}>{doc.title}</Link>
                            {doc.aiSummary && <div style={{ fontSize: '0.65rem', color: 'var(--accent-2)' }}>✦ AI summary</div>}
                          </div>
                        </div>
                      </td>
                      <td>{cat ? <span style={{ fontSize: '0.8rem', color: cat.color, fontWeight: 500 }}>{cat.name}</span> : '—'}</td>
                      <td><span className="badge badge-gray">{doc.fileType?.toUpperCase()}</span></td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>{formatBytes(doc.fileSize)}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>v{doc.currentVersion || 1}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>{doc.views || 0}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>{formatDate(doc.updatedAt)}</td>
                      <td>
                        <Link to={`/app/documents/${doc.id}`} className="btn-icon" title="Open"><ArrowRight size={14} /></Link>
                      </td>
                    </tr>
                  )
                })}
                {paged.length === 0 && (
                  <tr><td colSpan={8}>
                    <div className="empty-state" data-testid="empty-state">
                      <div className="empty-state-icon">📄</div>
                      <h3>No documents found</h3>
                    </div>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Pagination page={page} totalPages={totalPages} onPage={setPage} />
        </div>
      )}

      {/* ── Upload Modal ──────────────────────────────────────────────────────── */}
      {showUpload && (
        <div className="modal-overlay" onClick={e => !uploading && e.target === e.currentTarget && setShowUpload(false)}>
          <div className="modal modal-lg" data-testid="upload-modal">
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Upload Document</h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginTop: '0.2rem' }}>
                  File is uploaded directly to S3 storage
                </p>
              </div>
              {!uploading && (
                <button className="btn-icon" onClick={() => setShowUpload(false)}><X size={18} /></button>
              )}
            </div>

            {uploading && <UploadProgress />}

            <form onSubmit={handleUpload}>
              {/* Drop zone */}
              <div
                ref={dropRef}
                className={`upload-zone${dragOver ? ' drag-over' : ''}`}
                style={{ marginBottom: '1.25rem', gap: '0.5rem', cursor: 'pointer' }}
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.xlsx,.pptx,.txt"
                  style={{ display: 'none' }}
                  onChange={handleFileSelect}
                />
                {selectedFile ? (
                  <>
                    <CheckCircle size={24} color="var(--green)" />
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--green)' }}>
                      {selectedFile.name}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>
                      {formatBytes(selectedFile.size)} · Click to change file
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--bg-4)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.25rem' }}>
                      <Upload size={20} style={{ opacity: 0.6 }} />
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                      {dragOver ? 'Drop file here' : 'Drag & drop or click to select file'}
                    </div>
                    <div style={{ fontSize: '0.8rem' }}>PDF, DOCX, XLSX, PPTX up to 50MB → uploaded to S3</div>
                  </>
                )}
              </div>

              <div className="form-row form-row-2" style={{ gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Document title *</label>
                  <input
                    className="input" required
                    value={uploadForm.title}
                    onChange={e => setUploadForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Q2 Financial Report 2024"
                    data-testid="doc-title-input"
                  />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">
                    Description
                    <span style={{ color: 'var(--accent-2)', fontSize: '0.72rem', marginLeft: '0.5rem' }}>
                      ✦ Used for AI summary generation
                    </span>
                  </label>
                  <textarea className="input" rows={2}
                    value={uploadForm.description}
                    onChange={e => setUploadForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Describe this document — the AI will summarise and translate it automatically…"
                    style={{ resize: 'vertical' }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="input" value={uploadForm.categoryId}
                    onChange={e => setUploadForm(f => ({ ...f, categoryId: e.target.value }))}>
                    <option value="">Select category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <select className="input" value={uploadForm.departmentId}
                    onChange={e => setUploadForm(f => ({ ...f, departmentId: e.target.value }))}>
                    <option value="">Select department</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">File type</label>
                  <select className="input" value={uploadForm.fileType}
                    onChange={e => setUploadForm(f => ({ ...f, fileType: e.target.value }))}>
                    {['pdf','docx','xlsx','pptx','txt'].map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Tags <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(comma-separated)</span></label>
                  <input className="input" value={uploadForm.tags}
                    onChange={e => setUploadForm(f => ({ ...f, tags: e.target.value }))}
                    placeholder="policy, hr, 2024" />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowUpload(false)}
                  disabled={uploading} data-testid="upload-cancel">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={uploading} data-testid="upload-submit">
                  {uploading
                    ? <><span className="spinner" style={{ width: 14, height: 14 }} /> {uploadStage === 's3' ? 'Uploading to S3…' : uploadStage === 'saving' ? 'Saving…' : 'Processing…'}</>
                    : <><Upload size={14} /> Upload Document</>
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
