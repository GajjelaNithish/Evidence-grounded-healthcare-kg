import React from 'react';
import Skeleton from './Skeleton';
import EmptyState from './EmptyState';

export default function DataTable({
  columns,
  data,
  loading,
  emptyTitle = 'No records found',
  emptyMessage = 'There is no data to display right now.',
  onRowClick
}) {
  if (loading) {
    return (
      <div className="table-responsive" style={{ width: '100%', overflowX: 'auto', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', background: 'var(--bg-card)' }}>
          <thead>
            <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
              {columns.map((col, idx) => (
                <th
                  key={col.key || idx}
                  style={{
                    padding: '0.85rem 1rem',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    width: col.width
                  }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4].map((i) => (
              <tr key={i} style={{ borderBottom: i < 4 ? '1px solid var(--border-subtle)' : 'none' }}>
                {columns.map((col, cIdx) => (
                  <td key={col.key || cIdx} style={{ padding: '1rem', verticalAlign: 'middle' }}>
                    <Skeleton width={cIdx === 0 ? '60%' : '85%'} height="18px" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyMessage} />;
  }

  return (
    <div className="table-responsive" style={{ width: '100%', overflowX: 'auto', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
      <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', background: 'var(--bg-card)' }}>
        <thead>
          <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
            {columns.map((col, idx) => (
              <th
                key={col.key || idx}
                style={{
                  padding: '0.85rem 1rem',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  width: col.width,
                  textAlign: col.align || 'left'
                }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rIdx) => (
            <tr
              key={row.id || row.user_id || row.assignment_id || rIdx}
              onClick={() => onRowClick && onRowClick(row)}
              style={{
                borderBottom: rIdx < data.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                cursor: onRowClick ? 'pointer' : 'default',
                transition: 'background 0.15s ease'
              }}
              className="table-row-hover"
            >
              {columns.map((col, cIdx) => (
                <td
                  key={col.key || cIdx}
                  style={{
                    padding: '0.9rem 1rem',
                    fontSize: '0.88rem',
                    color: 'var(--text-primary)',
                    verticalAlign: 'middle',
                    textAlign: col.align || 'left'
                  }}
                >
                  {col.render ? col.render(row, rIdx) : row[col.accessor || col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
