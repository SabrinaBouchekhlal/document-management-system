import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function Pagination({ page, totalPages, onPage }) {
  if (totalPages <= 1) return null
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
      <button className="page-btn" onClick={() => onPage(page - 1)} disabled={page === 1}>
        <ChevronLeft size={14} />
      </button>
      {pages.map(p => (
        <button
          key={p}
          className={`page-btn${p === page ? ' active' : ''}`}
          onClick={() => onPage(p)}
        >
          {p}
        </button>
      ))}
      <button className="page-btn" onClick={() => onPage(page + 1)} disabled={page === totalPages}>
        <ChevronRight size={14} />
      </button>
    </div>
  )
}
