import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  const pages = [];
  const start = Math.max(1, currentPage - 2);
  const end   = Math.min(totalPages, currentPage + 2);

  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className="ss-pagination">
      <button
        className="ss-page-btn"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
      >
        <ChevronLeft size={14} />
      </button>

      {start > 1 && (
        <>
          <button className="ss-page-btn" onClick={() => onPageChange(1)}>1</button>
          {start > 2 && <span style={{ padding: '0 4px', color: 'var(--ss-text-muted)' }}>…</span>}
        </>
      )}

      {pages.map((p) => (
        <button
          key={p}
          className={`ss-page-btn ${p === currentPage ? 'active' : ''}`}
          onClick={() => onPageChange(p)}
        >
          {p}
        </button>
      ))}

      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span style={{ padding: '0 4px', color: 'var(--ss-text-muted)' }}>…</span>}
          <button className="ss-page-btn" onClick={() => onPageChange(totalPages)}>{totalPages}</button>
        </>
      )}

      <button
        className="ss-page-btn"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
      >
        <ChevronRight size={14} />
      </button>

      <span style={{ fontSize: 12, color: 'var(--ss-text-muted)', marginLeft: 8 }}>
        Page {currentPage} of {totalPages}
      </span>
    </div>
  );
};

export default Pagination;
