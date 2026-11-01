import React from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

function renderInline(text) {
  if (!text) return null;
  // Match **bold**, `code`, or regular text
  const regex = /(\*\*.*?\*\*|`.*?`)/g;
  const segments = text.split(regex);

  return segments.map((seg, i) => {
    if (seg.startsWith('**') && seg.endsWith('**') && seg.length >= 4) {
      return (
        <strong key={i} className="font-semibold text-slate-100">
          {seg.slice(2, -2)}
        </strong>
      );
    }
    if (seg.startsWith('`') && seg.endsWith('`') && seg.length >= 2) {
      return (
        <code key={i} className="px-1.5 py-0.5 rounded text-xs font-mono bg-slate-800 text-sky-300 border border-slate-700">
          {seg.slice(1, -1)}
        </code>
      );
    }
    // Remove isolated stray asterisks while preserving legitimate punctuation
    const cleaned = seg.replace(/\*+/g, '');
    return <span key={i}>{cleaned}</span>;
  });
}

export default function FormattedAnswer({ text, className = '' }) {
  if (!text) return null;

  // Handle special notices
  if (text.startsWith('Clinical synthesis error:')) {
    return (
      <div className="flex items-start gap-3 p-3.5 rounded-lg bg-red-950/40 border border-red-800/60 text-red-200 text-sm">
        <AlertCircle size={18} className="shrink-0 text-red-400 mt-0.5" />
        <span>Unable to synthesize an answer from the available evidence. Please review retrieved sources below.</span>
      </div>
    );
  }

  if (text.startsWith('INSUFFICIENT_EVIDENCE:') || text.includes('Insufficient Evidence Notice')) {
    const cleanMsg = text.replace('INSUFFICIENT_EVIDENCE:', '').trim();
    return (
      <div className="flex items-start gap-3 p-3.5 rounded-lg bg-amber-950/40 border border-amber-800/60 text-amber-200 text-sm">
        <AlertCircle size={18} className="shrink-0 text-amber-400 mt-0.5" />
        <div>
          <strong className="block font-medium text-amber-300 mb-1">Insufficient Clinical Evidence</strong>
          <p className="leading-relaxed">{cleanMsg || 'There is insufficient evidence in this patient record to answer that question without speculation.'}</p>
        </div>
      </div>
    );
  }

  const lines = text.split('\n');

  return (
    <div className={`space-y-2 text-slate-200 leading-relaxed ${className}`}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1.5" />;
        }

        // Markdown headings
        if (trimmed.startsWith('### ')) {
          return (
            <h4 key={idx} className="text-sm font-semibold text-sky-400 mt-3 pt-1 border-t border-slate-800 flex items-center gap-1.5">
              {renderInline(trimmed.replace(/^###\s*/, ''))}
            </h4>
          );
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h3 key={idx} className="text-base font-semibold text-slate-100 mt-4 mb-1">
              {renderInline(trimmed.replace(/^##\s*/, ''))}
            </h3>
          );
        }

        // Bullet lists (- or * or •)
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
          const itemText = trimmed.replace(/^[-*•]\s*/, '');
          return (
            <div key={idx} className="flex items-start gap-2.5 pl-1.5 py-0.5 text-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-2 shrink-0" />
              <div className="flex-1">{renderInline(itemText)}</div>
            </div>
          );
        }

        // Numbered list (e.g. 1. , 2. )
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-2.5 pl-1.5 py-0.5 text-sm">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded text-xs font-semibold bg-slate-800 text-sky-400 border border-slate-700 shrink-0 mt-0.5">
                {numMatch[1]}
              </span>
              <div className="flex-1">{renderInline(numMatch[2])}</div>
            </div>
          );
        }

        // Reasoning / Note blocks
        if (trimmed.toLowerCase().startsWith('reason:') || trimmed.toLowerCase().startsWith('reason / context:')) {
          const content = trimmed.replace(/^reason\s*(\/\s*context)?:\s*/i, '');
          return (
            <div key={idx} className="p-3 my-2 rounded bg-slate-800/60 border border-slate-700/70 text-xs text-slate-300">
              <span className="font-semibold text-sky-300 block mb-1 uppercase tracking-wider text-[10px]">Clinical Reasoning</span>
              <div>{renderInline(content)}</div>
            </div>
          );
        }

        return (
          <p key={idx} className="text-sm text-slate-200">
            {renderInline(line)}
          </p>
        );
      })}
    </div>
  );
}

