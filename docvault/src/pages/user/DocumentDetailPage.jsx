import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { api } from '../../utils/api'
import {
  formatDate, formatDateTime, formatBytes,
  timeAgo, generateId, avatarColor, getInitials
} from '../../utils/helpers'
import {
  ArrowLeft, FileText, Eye, Download, Clock, Tag,
  Building2, User, GitBranch, Plus, Send,
  Check, X, Sparkles, ChevronRight, Upload,
  Languages, Loader, ExternalLink
} from 'lucide-react'

export default function DocumentDetailPage() {
  const { id } = useParams()
  const { user, showToast } = useApp()
  const [doc, setDoc] = useState(null)
  const [category, setCategory] = useState(null)
  const [department, setDepartment] = useState(null)
  const [uploader, setUploader] = useState(null)
  const [versions, setVersions] = useState([])
  const [comments, setComments] = useState([])
  const [users, setUsers] = useState([])
  const [activeTab, setActiveTab] = useState('overview')
  const [newComment, setNewComment] = useState('')
  const [postingComment, setPostingComment] = useState(false)
  const [showNewVersion, setShowNewVersion] = useState(false)
  const [versionForm, setVersionForm] = useState({ changelog: '' })
  const [creatingVersion, setCreatingVersion] = useState(false)
  const [loading, setLoading] = useState(true)
  const [summaryLang, setSummaryLang] = useState('en')
  const [generatingSummary, setGeneratingSummary] = useState(false)
  const [downloadUrl, setDownloadUrl] = useState(null)
  const [fetchingDownload, setFetchingDownload] = useState(false)

  useEffect(() => { load() }, [id])

  async function load() {
    setLoading(true)
    try {
      
      const [d, vs, cs] = await Promise.all([
        api.documents.get(id),
        api.versions.list({ documentId: id }),
        api.comments.list({ documentId: id }),
      ])

      setDoc(d)

      setVersions(
        Array.isArray(vs)
          ? vs.sort((a, b) => b.version - a.version)
          : []
      )

      setComments(
        Array.isArray(cs)
          ? cs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          : []
      )

      setUsers([]) // not needed anymore

      // fetch ONLY what you need
      const [cat, dept, upl] = await Promise.all([
        d.categoryId
          ? api.categories.get(d.categoryId)
          : Promise.resolve(null),

        d.departmentId
          ? api.departments.get(d.departmentId)
          : Promise.resolve(null),

        d.uploadedBy
          ? api.users.get(d.uploadedBy)
          : Promise.resolve(null),
      ])

      setCategory(cat)
      setDepartment(dept)
      setUploader(upl)

      // increment views (fire and forget)
      api.documents.update(id, { views: (d.views || 0) + 1 }).catch(() => {})

    } catch (err) {
      showToast('Document not found', 'error')
    }
    setLoading(false)
  }

  const getUser = uid => users.find(u => u.id === uid)

  async function generateSummary() {
    if (!doc) return
    setGeneratingSummary(true)
    try {
      const result = await api.ai.processDocument(id, doc.title, doc.description)
      if (result?.summary) {
        setDoc(d => ({ ...d, aiSummary: result.summary, aiSummaryFr: result.summaryFr }))
        showToast('AI summary generated', 'success')
      }
    } catch (err) {
      showToast('AI service unavailable: ' + err.message, 'error')
    }
    setGeneratingSummary(false)
  }

  async function getDownloadUrl() {
    if (downloadUrl) { window.open(downloadUrl, '_blank'); return }
    setFetchingDownload(true)
    try {
      const result = await api.documents.downloadUrl(id)
      const url = result?.downloadUrl || result
      setDownloadUrl(url)
      window.open(url, '_blank')
      showToast('Download started', 'success')
    } catch (err) {
      showToast('Download failed: ' + err.message, 'error')
    }
    setFetchingDownload(false)
  }

  async function postComment(e) {
    e.preventDefault()
    if (!newComment.trim()) return
    setPostingComment(true)
    try {
      const comment = await api.comments.create({
        documentId: id,
        content:    newComment.trim(),
      })
      // Normalise — backend returns different shape than json-server
      const normalised = {
        id:          comment.id || comment._id || generateId(),
        documentId:  comment.documentId || id,
        userId:      comment.userId   || user.id,
        userEmail:   comment.userEmail|| user.email,
        userName:    comment.userName || user.name,
        content:     comment.content,
        resolved:    comment.resolved || false,
        createdAt:   comment.createdAt|| new Date().toISOString(),
      }
      setComments(cs => [normalised, ...cs])
      setNewComment('')
      showToast('Comment posted', 'success')
    } catch (err) { showToast('Failed: ' + err.message, 'error') }
    setPostingComment(false)
  }

  async function resolveComment(commentId, resolved) {
    try {
      await api.comments.update(commentId, { resolved: !resolved }, id)
      setComments(cs => cs.map(c => c.id === commentId ? { ...c, resolved: !resolved } : c))
    } catch {}
  }

  async function deleteComment(commentId) {
    try {
      await api.comments.delete(commentId, id)
      setComments(cs => cs.filter(c => c.id !== commentId))
      showToast('Comment deleted', 'success')
    } catch {}
  }

  async function createNewVersion(e) {
    e.preventDefault()
    setCreatingVersion(true)
    try {
      const newVersion = (doc.currentVersion || 1) + 1
      const version = await api.versions.create({
        documentId: id,
        version:    newVersion,
        changelog:  versionForm.changelog,
        fileSize:   doc.fileSize,
      })
      await api.documents.update(id, { currentVersion: newVersion, updatedAt: new Date().toISOString() })
      setDoc(d => ({ ...d, currentVersion: newVersion }))
      setVersions(vs => [version, ...vs])
      setShowNewVersion(false)
      setVersionForm({ changelog: '' })
      showToast(`Version ${newVersion} created`, 'success')
    } catch (err) { showToast('Failed: ' + err.message, 'error') }
    setCreatingVersion(false)
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem' }}>
      <span className="spinner" style={{ width: 30, height: 30 }} />
    </div>
  )

  if (!doc) return (
    <div className="empty-state">
      <div className="empty-state-icon">❌</div>
      <h3>Document not found</h3>
      <Link to="/app/documents" className="btn btn-secondary" style={{ marginTop: '1rem', display: 'inline-flex' }}>
        ← Back
      </Link>
    </div>
  )

  const tabs = [
    { id: 'overview', label: 'Overview',                         testid: 'tab-overview' },
    { id: 'versions', label: `Versions (${versions.length})`,   testid: 'tab-versions' },
    { id: 'comments', label: `Comments (${comments.length})`,   testid: 'tab-comments' },
  ]

  const currentSummary = summaryLang === 'fr' && doc.aiSummaryFr ? doc.aiSummaryFr : doc.aiSummary

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 1100, margin: '0 auto', width: '100%' }}>

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8125rem', color: 'var(--text-3)' }}>
        <Link to="/app/documents" style={{ color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-1)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}>
          <ArrowLeft size={13} /> Documents
        </Link>
        <ChevronRight size={12} />
        <span style={{ color: 'var(--text-2)', fontWeight: 500 }}>{doc.title}</span>
      </div>

      {/* Hero header */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap',
        padding: '1.5rem', background: 'var(--bg-2)', border: '1.5px solid var(--border)',
        borderRadius: 'var(--radius-lg)', position: 'relative', overflow: 'hidden',
      }}>
        {category && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: category.color }} />}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingTop: category ? '0.25rem' : 0 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, flexShrink: 0, background: category ? `${category.color}18` : 'var(--bg-4)', border: `1.5px solid ${category?.color || 'var(--border)'}35`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={24} color={category?.color || 'var(--text-3)'} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.3rem', marginBottom: '0.5rem' }}>{doc.title}</h1>
            <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <span className={`badge ${doc.status === 'published' ? 'badge-green' : 'badge-amber'}`}>{doc.status}</span>
              <span className="badge badge-gray">{doc.fileType?.toUpperCase()}</span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <GitBranch size={12} /> v{doc.currentVersion || 1}
              </span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Eye size={12} /> {doc.views || 0} views
              </span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Clock size={12} /> Updated {timeAgo(doc.updatedAt)}
              </span>
            </div>
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={getDownloadUrl} disabled={fetchingDownload}>
          {fetchingDownload ? <span className="spinner" style={{ width: 13, height: 13 }} /> : <Download size={13} />}
          {doc.s3Key ? 'Download from S3' : 'Download'}
        </button>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {tabs.map(t => (
          <button key={t.id} className={`tab${activeTab === t.id ? ' active' : ''}`}
            data-testid={t.testid} onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ─────────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '1.5rem', alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* Description */}
            <div className="card">
              <h3 style={{ fontSize: '0.8rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Description</h3>
              <p style={{ color: 'var(--text-2)', lineHeight: 1.75, fontSize: '0.9375rem' }}>
                {doc.description || <span style={{ color: 'var(--text-3)', fontStyle: 'italic' }}>No description.</span>}
              </p>
            </div>

            {/* Tags */}
            {doc.tags?.length > 0 && (
              <div className="card">
                <h3 style={{ fontSize: '0.8rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Tags</h3>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {doc.tags.map(t => (
                    <span key={t} className="tag" style={{ fontSize: '0.8rem', padding: '0.25rem 0.625rem' }}>
                      <Tag size={10} /> {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* ── AI Summary card ─────────────────────────────────────────────── */}
            <div className="card" style={{ background: 'linear-gradient(135deg, var(--bg-2) 0%, rgba(124,106,247,0.06) 100%)', borderColor: 'rgba(124,106,247,0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Sparkles size={14} color="var(--accent-2)" />
                  </div>
                  <h3 style={{ fontSize: '0.9rem', color: 'var(--accent-2)', fontWeight: 600 }}>AI Summary</h3>
                  <span className="badge badge-purple" style={{ fontSize: '0.62rem' }}>
                    HuggingFace + LibreTranslate
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {/* Language toggle */}
                  {doc.aiSummary && (
                    <div style={{ display: 'flex', background: 'var(--bg-4)', border: '1px solid var(--border)', borderRadius: '99px', overflow: 'hidden' }}>
                      {[['en', '🇬🇧 EN'], ['fr', '🇫🇷 FR']].map(([lang, label]) => (
                        <button key={lang} onClick={() => setSummaryLang(lang)} style={{
                          padding: '0.2rem 0.625rem', border: 'none', cursor: 'pointer',
                          background: summaryLang === lang ? 'var(--accent)' : 'transparent',
                          color: summaryLang === lang ? '#fff' : 'var(--text-3)',
                          fontSize: '0.72rem', fontWeight: 600, transition: 'all 0.15s',
                          fontFamily: 'var(--font-body)',
                        }}>
                          {label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Generate / Regenerate button */}
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={generateSummary}
                    disabled={generatingSummary}
                    style={{ fontSize: '0.75rem' }}
                  >
                    {generatingSummary
                      ? <><Loader size={12} style={{ animation: 'spin 0.8s linear infinite' }} /> Generating…</>
                      : doc.aiSummary
                        ? <><Sparkles size={12} /> Regenerate</>
                        : <><Sparkles size={12} /> Generate Summary</>
                    }
                  </button>
                </div>
              </div>

              {currentSummary ? (
                <>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-2)', lineHeight: 1.7 }}>
                    {currentSummary}
                  </p>
                  {summaryLang === 'fr' && doc.aiSummaryFr && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.72rem', color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Languages size={11} /> Translated to French via LibreTranslate
                    </div>
                  )}
                  {summaryLang === 'en' && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.72rem', color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Sparkles size={11} /> Summarised by facebook/bart-large-cnn via HuggingFace
                    </div>
                  )}
                </>
              ) : generatingSummary ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-3)', fontSize: '0.875rem' }}>
                  <span className="spinner" style={{ width: 16, height: 16 }} />
                  Processing through AI pipeline…
                </div>
              ) : (
                <p style={{ color: 'var(--text-3)', fontSize: '0.875rem', fontStyle: 'italic' }}>
                  No summary yet. Click "Generate Summary" to analyse this document with AI.
                  {!doc.description && ' Add a description first for best results.'}
                </p>
              )}
            </div>
          </div>

          {/* Metadata panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'sticky', top: '80px' }}>
            <div className="card">
              <h3 style={{ fontSize: '0.8rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '1rem' }}>Metadata</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                {[
                  { icon: User,      label: 'Uploaded by', value: uploader?.name || '—'   },
                  { icon: Tag,       label: 'Category',    value: category?.name || '—',   color: category?.color },
                  { icon: Building2, label: 'Department',  value: department?.name || '—'  },
                  { icon: Clock,     label: 'Created',     value: formatDate(doc.createdAt)},
                  { icon: Clock,     label: 'Updated',     value: formatDate(doc.updatedAt)},
                  { icon: GitBranch, label: 'Version',     value: `v${doc.currentVersion || 1}` },
                  { icon: Eye,       label: 'Views',       value: doc.views || 0           },
                  { icon: Download,  label: 'Downloads',   value: doc.downloads || 0       },
                ].map(({ icon: Icon, label, value, color }) => (
                  <div key={label} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <Icon size={13} style={{ color: 'var(--text-3)', flexShrink: 0, marginTop: 2 }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, marginBottom: '0.1rem' }}>{label}</div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 500, color: color || 'var(--text-1)' }}>{value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* S3 info */}
            {doc.s3Key && (
              <div className="card">
                <h3 style={{ fontSize: '0.8rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.875rem' }}>File Storage</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                    <span style={{ color: 'var(--text-3)' }}>Size</span>
                    <span style={{ fontWeight: 500 }}>{formatBytes(doc.fileSize)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                    <span style={{ color: 'var(--text-3)' }}>Format</span>
                    <span style={{ fontWeight: 500 }}>{doc.fileType?.toUpperCase()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                    <span style={{ color: 'var(--text-3)' }}>Storage</span>
                    <span style={{ fontWeight: 500, color: 'var(--teal)' }}>S3 ✓</span>
                  </div>
                  <button className="btn btn-secondary btn-sm" style={{ marginTop: '0.25rem', justifyContent: 'center' }}
                    onClick={getDownloadUrl} disabled={fetchingDownload}>
                    {fetchingDownload
                      ? <span className="spinner" style={{ width: 12, height: 12 }} />
                      : <ExternalLink size={12} />
                    }
                    Get download link
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── VERSIONS ─────────────────────────────────────────────────────────── */}
      {activeTab === 'versions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary btn-sm" onClick={() => setShowNewVersion(v => !v)}>
              <Plus size={13} /> New Version
            </button>
          </div>

          {showNewVersion && (
            <div className="card" style={{ borderColor: 'rgba(124,106,247,0.3)', background: 'rgba(124,106,247,0.04)' }}>
              <h3 style={{ fontSize: '0.9375rem', marginBottom: '1rem' }}>Create Version {(doc.currentVersion || 1) + 1}</h3>
              <form onSubmit={createNewVersion}>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Changelog *</label>
                  <textarea className="input" rows={3} required
                    value={versionForm.changelog}
                    onChange={e => setVersionForm(f => ({ ...f, changelog: e.target.value }))}
                    placeholder="Describe what changed…" style={{ resize: 'vertical' }} />
                </div>
                <div style={{ display: 'flex', gap: '0.625rem', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowNewVersion(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={creatingVersion}>
                    {creatingVersion ? <span className="spinner" style={{ width: 12, height: 12 }} /> : null}
                    Create version
                  </button>
                </div>
              </form>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {versions.map((v, i) => {
              const vUploader = getUser(v.uploadedBy || v.uploadedBy)
              return (
                <div key={v.id || i} style={{ display: 'flex', gap: '1rem', position: 'relative' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, paddingBottom: '1rem' }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                      background: i === 0 ? 'var(--accent)' : 'var(--bg-4)',
                      border: `2px solid ${i === 0 ? 'var(--accent)' : 'var(--border-2)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.72rem', fontWeight: 700, color: i === 0 ? '#fff' : 'var(--text-3)', zIndex: 1,
                    }}>
                      v{v.version}
                    </div>
                    {i < versions.length - 1 && (
                      <div style={{ width: 2, flex: 1, background: 'var(--border)', marginTop: '0.25rem' }} />
                    )}
                  </div>
                  <div className="card" style={{ flex: 1, padding: '1rem', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center' }}>
                        {vUploader && (
                          <div className="avatar avatar-sm" style={{ background: avatarColor(vUploader.name), color: '#fff' }}>
                            {getInitials(vUploader.name)}
                          </div>
                        )}
                        <div>
                          <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{vUploader?.name || 'Unknown'}</span>
                          {i === 0 && <span className="badge badge-green" style={{ marginLeft: '0.5rem', fontSize: '0.62rem' }}>Latest</span>}
                        </div>
                      </div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                        {formatDateTime(v.createdAt)}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-2)', lineHeight: 1.6 }}>{v.changelog}</p>
                    {v.fileSize && (
                      <div style={{ marginTop: '0.5rem', fontSize: '0.72rem', color: 'var(--text-3)' }}>
                        {formatBytes(v.fileSize)}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
            {versions.length === 0 && (
              <div className="empty-state"><div className="empty-state-icon">📋</div><h3>No versions yet</h3></div>
            )}
          </div>
        </div>
      )}

      {/* ── COMMENTS ─────────────────────────────────────────────────────────── */}
      {activeTab === 'comments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Compose */}
          <div className="card">
            <div style={{ display: 'flex', gap: '0.875rem', alignItems: 'flex-start' }}>
              <div className="avatar avatar-md" style={{ background: avatarColor(user?.name || ''), color: '#fff', flexShrink: 0, marginTop: '0.1rem' }}>
                {getInitials(user?.name || '')}
              </div>
              <form onSubmit={postComment} style={{ flex: 1 }}>
                <textarea
                  className="input" rows={3}
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  placeholder="Share feedback, ask a question, or leave a note…"
                  style={{ marginBottom: '0.75rem', resize: 'vertical' }}
                  data-testid="comment-input"
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" className="btn btn-primary btn-sm"
                    disabled={postingComment || !newComment.trim()}
                    data-testid="comment-submit">
                    {postingComment ? <span className="spinner" style={{ width: 12, height: 12 }} /> : <Send size={13} />}
                    Post comment
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Comments list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {comments.map(c => {
              const commentUser = getUser(c.userId)
              const canModify   = c.userId === user.id || user.role === 'admin'
              return (
                <div key={c.id || c.commentId} className="card" style={{ opacity: c.resolved ? 0.65 : 1 }}>
                  <div style={{ display: 'flex', gap: '0.875rem' }}>
                    <div className="avatar avatar-md" style={{ background: avatarColor(commentUser?.name || c.userName || '?'), color: '#fff', flexShrink: 0 }}>
                      {getInitials(commentUser?.name || c.userName || '?')}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                          {commentUser?.name || c.userName || c.userEmail || 'User'}
                        </span>
                        <span className={`badge ${(commentUser?.role || 'user') === 'admin' ? 'badge-purple' : 'badge-gray'}`} style={{ fontSize: '0.62rem' }}>
                          {commentUser?.role || 'user'}
                        </span>
                        {c.resolved && <span className="badge badge-green" style={{ fontSize: '0.62rem' }}><Check size={9} /> Resolved</span>}
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginLeft: 'auto' }}>
                          {timeAgo(c.createdAt)}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-2)', lineHeight: 1.65 }}>{c.content}</p>
                      {canModify && (
                        <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.625rem' }}>
                          <button className="btn btn-ghost btn-sm"
                            onClick={() => resolveComment(c.id, c.resolved)}
                            style={{ fontSize: '0.73rem', color: c.resolved ? 'var(--text-3)' : 'var(--green)', padding: '0.25rem 0.5rem' }}>
                            <Check size={11} /> {c.resolved ? 'Unresolve' : 'Resolve'}
                          </button>
                          <button className="btn btn-ghost btn-sm" onClick={() => deleteComment(c.id)}
                            style={{ fontSize: '0.73rem', color: 'var(--rose)', padding: '0.25rem 0.5rem' }}>
                            <X size={11} /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
            {comments.length === 0 && (
              <div className="empty-state">
                <div className="empty-state-icon">💬</div>
                <h3>No comments yet</h3>
                <p style={{ fontSize: '0.8125rem', marginTop: '0.35rem' }}>Be the first to share feedback</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
