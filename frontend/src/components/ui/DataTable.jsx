import React from 'react';

export default function DataTable({ columns, data, loading, emptyMessage = 'No data available', onRowClick }) {
  if (loading) {
    return (
      <div className="table-loading" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading data...
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="table-empty" style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
        {emptyMessage}
      </div>
    );
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
          {data.map((row, rIdx) => (
            <tr
              key={row.id || rIdx}
              onClick={() => onRowClick && onRowClick(row)}
              style={{
                borderBottom: rIdx < data.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                cursor: onRowClick ? 'pointer' : 'default',
                transition: 'background 0.15s ease'
              }}
              className="table-row-hover"
            >
              {columns.map((col, cIdx) => (
                <td key={col.key || cIdx} style={{ padding: '0.9rem 1rem', fontSize: '0.9rem', color: 'var(--text-primary)', verticalAlign: 'middle' }}>
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
