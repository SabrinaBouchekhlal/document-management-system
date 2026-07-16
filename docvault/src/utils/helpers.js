export function formatBytes(bytes) {
  if (!bytes) return '0 B'
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric'
  })
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

export function timeAgo(dateStr) {
  const now = new Date()
  const date = new Date(dateStr)
  const diff = Math.floor((now - date) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`
  if (diff < 2592000) return `${Math.floor(diff/86400)}d ago`
  return formatDate(dateStr)
}

export function fileTypeColor(type) {
  const map = { pdf: '#fb7185', docx: '#60a5fa', xlsx: '#34d399', pptx: '#fbbf24', txt: '#9898bb' }
  return map[type] || '#9898bb'
}

export function fileTypeLabel(type) {
  return type?.toUpperCase() || 'FILE'
}

export function avatarColor(name) {
  const colors = [
    '#6366f1','#14b8a6','#f59e0b','#ec4899','#8b5cf6',
    '#06b6d4','#10b981','#f97316','#e11d48','#3b82f6'
  ]
  const idx = name ? name.charCodeAt(0) % colors.length : 0
  return colors[idx]
}

export function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7)
}

export function paginate(arr, page, size) {
  const start = (page - 1) * size
  return arr.slice(start, start + size)
}

export function exportToCSV(data, filename) {
  if (!data.length) return
  const headers = Object.keys(data[0])
  const rows = data.map(row => headers.map(h => JSON.stringify(row[h] ?? '')).join(','))
  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `${filename}.csv`; a.click()
  URL.revokeObjectURL(url)
}
