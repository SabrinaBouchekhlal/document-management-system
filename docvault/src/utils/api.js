// ─────────────────────────────────────────────────────────────────────────────
// DocVault API — unified service layer
// VITE_API_BASE_URL set → real backend (JWT Bearer)
// not set            → json-server fallback (local dev)
// ─────────────────────────────────────────────────────────────────────────────

const GATEWAY    = import.meta.env.VITE_API_BASE_URL || ''
const USE_BACKEND = Boolean(import.meta.env.VITE_API_BASE_URL)

// ── Token storage ─────────────────────────────────────────────────────────────
const TOKEN_KEY = 'docvault_token'
export const tokenStore = {
  get:    ()      => localStorage.getItem(TOKEN_KEY),
  set:    (t)     => localStorage.setItem(TOKEN_KEY, t),
  clear:  ()      => localStorage.removeItem(TOKEN_KEY),
  headers: () => {
    const t = localStorage.getItem(TOKEN_KEY)
    if (!t) return {}
    return { Authorization: `Bearer ${t}` }
  }
}

// ── Core request helpers ──────────────────────────────────────────────────────
async function gatewayReq(path, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY)
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  const res = await fetch(`${GATEWAY}${path}`, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  if (res.status === 401) {
    tokenStore.clear()
    window.location.href = '/login'
    throw new Error('Session expired — please log in again')
  }

  if (!res.ok) {
    let msg = `API error ${res.status}`
    try {
      const err = await res.json()
      msg = err.message || msg
    } catch (_) {}
    throw new Error(msg)
  }

  if (res.status === 204) return null
  const json = await res.json()
  // Gateway wraps in { success, data } — unwrap transparently
  return json && json.data !== undefined ? json.data : json
}

async function jsonReq(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  if (res.status === 204) return null
  return res.json()
}

function qs(p = {}) {
  const s = Object.entries(p)
    .filter(([, v]) => v !== undefined && v !== '' && v !== null)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')
  return s ? `?${s}` : ''
}

// ── S3 direct upload helper ───────────────────────────────────────────────────
export async function uploadFileToS3(file, documentId) {
  if (!USE_BACKEND) {
    console.log('[S3] Simulated upload for', file.name)
    return `documents/${documentId || 'local'}/${file.name}`
  }
  const token = localStorage.getItem(TOKEN_KEY)
  const presignedRes = await fetch(`${GATEWAY}/api/presigned/upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({
      documentId:  documentId,
      fileName:    file.name,
      contentType: file.type || 'application/octet-stream',
    })
  })
  if (!presignedRes.ok) throw new Error(`Failed to get upload URL: ${presignedRes.status}`)
  const presigned = await presignedRes.json()
  const uploadUrl = presigned.data?.uploadUrl || presigned.uploadUrl
  const s3Key     = presigned.data?.s3Key     || presigned.s3Key

  const uploadRes = await fetch(uploadUrl, {
    method:  'PUT',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body:    file,
  })
  if (!uploadRes.ok) throw new Error(`S3 upload failed: ${uploadRes.status}`)
  return s3Key
}

// ─────────────────────────────────────────────────────────────────────────────
// API NAMESPACES
// ─────────────────────────────────────────────────────────────────────────────
export const api = {

  // ── AUTH ────────────────────────────────────────────────────────────────────
  auth: {
    login: async (email, password) => {
      if (!USE_BACKEND) {
        const users = await jsonReq(`/users?email=${encodeURIComponent(email)}`)
        const user  = users.find(u => u.email === email && u.password === password)
        if (!user) throw new Error('Invalid credentials')
        if (user.status === 'suspended') throw new Error('Account suspended')
        return user
      }
      const res  = await fetch(`${GATEWAY}/auth/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.message || 'Login failed')
      tokenStore.set(json.data.accessToken)
      return json.data.user
    },

    register: async (data) => {
      if (!USE_BACKEND) throw new Error('Register only works with backend')
      const res  = await fetch(`${GATEWAY}/auth/register`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.message || 'Registration failed')
      tokenStore.set(json.data.accessToken)
      return json.data.user
    },

    logout: async () => {
      if (USE_BACKEND) {
        const token = localStorage.getItem(TOKEN_KEY)
        if (token) {
          try {
            await fetch(`${GATEWAY}/auth/logout`, {
              method:  'POST',
              headers: { Authorization: `Bearer ${token}` }
            })
          } catch (_) {}
        }
      }
      tokenStore.clear()
    },
  },

  // ── USERS — live in gateway (/auth/users) ────────────────────────────────────
 
  users: USE_BACKEND ? {
    list:   (p = {}) => gatewayReq(`/auth/users${qs(p)}`),
    get:    (id)     => gatewayReq(`/auth/users/${id}`),
    create: async (d) => {
      const res = await gatewayReq('/auth/register', { method: 'POST', body: d })
      return res?.user || res
    },
    update: (id, d)  => gatewayReq(`/auth/users/${id}`, { method: 'PATCH', body: d }),
    delete: (id)     => gatewayReq(`/auth/users/${id}`, { method: 'DELETE' }),
  } : {                                                          // ← this was missing
    list:   (p = {}) => jsonReq(`/users${qs(p)}`),
    get:    (id)     => jsonReq(`/users/${id}`),
    create: (d)      => jsonReq('/users',      { method: 'POST',  body: d }),
    update: (id, d)  => jsonReq(`/users/${id}`,{ method: 'PATCH', body: d }),
    delete: (id)     => jsonReq(`/users/${id}`,{ method: 'DELETE' }),
  },

  // ── DEPARTMENTS ─────────────────────────────────────────────────────────────
  departments: USE_BACKEND ? {
    list:   ()       => gatewayReq('/api/departments'),
    get:    (id)     => gatewayReq(`/api/departments/${id}`),
    create: (d)      => gatewayReq('/api/departments',       { method: 'POST',   body: d }),
    update: (id, d)  => gatewayReq(`/api/departments/${id}`, { method: 'PATCH',  body: d }),
    delete: (id)     => gatewayReq(`/api/departments/${id}`, { method: 'DELETE' }),
  } : {
    list:   ()       => jsonReq('/departments'),
    get:    (id)     => jsonReq(`/departments/${id}`),
    create: (d)      => jsonReq('/departments',       { method: 'POST',  body: d }),
    update: (id, d)  => jsonReq(`/departments/${id}`, { method: 'PATCH', body: d }),
    delete: (id)     => jsonReq(`/departments/${id}`, { method: 'DELETE' }),
  },

  // ── CATEGORIES ──────────────────────────────────────────────────────────────
  categories: USE_BACKEND ? {
    list:   ()       => gatewayReq('/api/categories'),
    get:    (id)     => gatewayReq(`/api/categories/${id}`),
    create: (d)      => gatewayReq('/api/categories',       { method: 'POST',   body: d }),
    update: (id, d)  => gatewayReq(`/api/categories/${id}`, { method: 'PATCH',  body: d }),
    delete: (id)     => gatewayReq(`/api/categories/${id}`, { method: 'DELETE' }),
  } : {
    list:   ()       => jsonReq('/categories'),
    get:    (id)     => jsonReq(`/categories/${id}`),
    create: (d)      => jsonReq('/categories',       { method: 'POST',  body: d }),
    update: (id, d)  => jsonReq(`/categories/${id}`, { method: 'PATCH', body: d }),
    delete: (id)     => jsonReq(`/categories/${id}`, { method: 'DELETE' }),
  },

  // ── DOCUMENTS ───────────────────────────────────────────────────────────────
  documents: USE_BACKEND ? {
    list:        (p = {}) => gatewayReq(`/api/documents${qs(p)}`),
    get:         (id)     => gatewayReq(`/api/documents/${id}`),
    create:      (d)      => gatewayReq('/api/documents',       { method: 'POST',   body: d }),
    update:      (id, d)  => gatewayReq(`/api/documents/${id}`, { method: 'PATCH',  body: d }),
    delete:      (id)     => gatewayReq(`/api/documents/${id}`, { method: 'DELETE' }),
    downloadUrl: (id)     => gatewayReq(`/api/documents/${id}/download`),
  } : {
    list:        (p = {}) => jsonReq(`/documents${qs(p)}`),
    get:         (id)     => jsonReq(`/documents/${id}`),
    create:      (d)      => jsonReq('/documents',       { method: 'POST',  body: d }),
    update:      (id, d)  => jsonReq(`/documents/${id}`, { method: 'PATCH', body: d }),
    delete:      (id)     => jsonReq(`/documents/${id}`, { method: 'DELETE' }),
    downloadUrl: ()       => Promise.resolve({ downloadUrl: '#' }),
  },

  // ── VERSIONS ────────────────────────────────────────────────────────────────
  versions: USE_BACKEND ? {
    list:   (p = {}) => gatewayReq(`/api/versions${qs(p)}`),
    create: (d)      => gatewayReq(`/api/versions?documentId=${d.documentId}`, { method: 'POST', body: d }),
  } : {
    list:   (p = {}) => jsonReq(`/versions${qs(p)}`),
    create: (d)      => jsonReq('/versions', { method: 'POST', body: d }),
  },

  // ── COMMENTS ────────────────────────────────────────────────────────────────
  comments: USE_BACKEND ? {
    list:   (p = {})         => gatewayReq(`/api/comments${qs(p)}`),
    create: (d)              => gatewayReq('/api/comments', { method: 'POST', body: d }),
    update: (id, d, docId)   => gatewayReq(`/api/comments/${docId}/${id}`, { method: 'PATCH',  body: d }),
    delete: (id, docId)      => gatewayReq(`/api/comments/${docId}/${id}`, { method: 'DELETE' }),
  } : {
    list:   (p = {}) => jsonReq(`/comments${qs(p)}`),
    create: (d)      => jsonReq('/comments',        { method: 'POST',  body: d }),
    update: (id, d)  => jsonReq(`/comments/${id}`,  { method: 'PATCH', body: d }),
    delete: (id)     => jsonReq(`/comments/${id}`,  { method: 'DELETE' }),
  },

  // ── AI ───────────────────────────────────────────────────────────────────────
  ai: {
    processDocument: (documentId, title, description) => {
      if (!USE_BACKEND) return Promise.resolve({
        summary: `Summary of "${title}": ${(description || '').substring(0, 150)}`,
        summaryFr: `Résumé de "${title}".`
      })
      return gatewayReq('/api/ai/process', {
        method: 'POST',
        body: { documentId, title, description }
      })
    },
    summarise: (text) => {
      if (!USE_BACKEND) return Promise.resolve({ summary: text.substring(0, 150) })
      return gatewayReq('/api/ai/summarise', { method: 'POST', body: { text } })
    },
    translate: (text, target = 'fr') => {
      if (!USE_BACKEND) return Promise.resolve({ translated: `[FR] ${text}` })
      return gatewayReq('/api/ai/translate', { method: 'POST', body: { text, target } })
    },
  },

  // ── NOTIFICATIONS — graceful fallback (feature may not exist in backend) ─────
  notifications: {
    list: async (p = {}) => {
      if (!USE_BACKEND) return jsonReq(`/notifications${qs(p)}`)
      try {
        return await gatewayReq(`/api/notifications${qs(p)}`)
      } catch (_) {
        return []   // notifications are optional — never crash the app
      }
    },
    update: async (id, d) => {
      if (!USE_BACKEND) return jsonReq(`/notifications/${id}`, { method: 'PATCH', body: d })
      try {
        return await gatewayReq(`/api/notifications/${id}`, { method: 'PATCH', body: d })
      } catch (_) {
        return null
      }
    },
  },

  // ── AUDIT LOG ────────────────────────────────────────────────────────────────
  audit: {
    list:       (p = {}) => USE_BACKEND
      ? gatewayReq(`/api/events/audit${qs(p)}`)
      : jsonReq(`/activityLog${qs(p)}`),
    byDocument: (id) => USE_BACKEND
      ? gatewayReq(`/api/events/audit/document/${id}`)
      : jsonReq(`/activityLog?resourceId=${id}`),
  },

  // ── ACTIVITY LOG (json-server alias) ─────────────────────────────────────────
  activityLog: {
    list:   (p = {}) => USE_BACKEND
      ? gatewayReq(`/api/events/audit${qs(p)}`).catch(() => [])
      : jsonReq(`/activityLog${qs(p)}`),
    create: (d) => USE_BACKEND
      ? Promise.resolve(d)
      : jsonReq('/activityLog', { method: 'POST', body: d }),
  },
}