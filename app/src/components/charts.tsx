import React from 'react';

// Hand-rolled SVG charts (no chart library): ring, donut, bars, funnel, columns.

export function Ring({ value, max = 100, size = 120, stroke = 12, color = 'var(--accent)', label, sub }: { value: number; max?: number; size?: number; stroke?: number; color?: string; label?: React.ReactNode; sub?: string }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, pct = Math.max(0, Math.min(1, value / max));
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--track)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${c * pct} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} className="ring-arc" />
      </svg>
      <div className="ring-label"><b>{label ?? Math.round(value)}</b>{sub && <span>{sub}</span>}</div>
    </div>
  );
}

export interface Slice { label: string; value: number; color: string }

export function Donut({ data, size = 170, stroke = 26, center }: { data: Slice[]; size?: number; stroke?: number; center?: React.ReactNode }) {
  const total = data.reduce((a, d) => a + d.value, 0) || 1;
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  let off = 0;
  return (
    <div className="donut-wrap">
      <div className="ring" style={{ width: size, height: size }}>
        <svg width={size} height={size}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--track)" strokeWidth={stroke} />
          {data.filter((d) => d.value > 0).map((d) => {
            const len = (d.value / total) * c;
            const el = <circle key={d.label} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={d.color} strokeWidth={stroke}
              strokeDasharray={`${Math.max(0, len - 2)} ${c}`} strokeDashoffset={-off} transform={`rotate(-90 ${size / 2} ${size / 2})`} className="ring-arc"><title>{`${d.label}: ${d.value}`}</title></circle>;
            off += len; return el;
          })}
        </svg>
        <div className="ring-label">{center ?? <><b>{total}</b><span>total</span></>}</div>
      </div>
      <ul className="legend">
        {data.map((d) => <li key={d.label}><i style={{ background: d.color }} />{d.label}<b>{d.value}</b><em>{Math.round((d.value / total) * 100)}%</em></li>)}
      </ul>
    </div>
  );
}

export function HBars({ data, max, suffix = '', onClick }: { data: { label: string; value: number; color?: string; hint?: string }[]; max?: number; suffix?: string; onClick?: (label: string) => void }) {
  const m = max ?? Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="hbars">
      {data.map((d, i) => (
        <div key={d.label} className={onClick ? 'hbar click' : 'hbar'} onClick={() => onClick?.(d.label)} title={d.hint}>
          <span className="hbar-l">{d.label}</span>
          <div className="hbar-t"><div className="hbar-f" style={{ width: `${(d.value / m) * 100}%`, background: d.color || 'linear-gradient(90deg,var(--accent),var(--accent-2))', animationDelay: `${i * 50}ms` }} /></div>
          <b>{d.value}{suffix}</b>
        </div>
      ))}
    </div>
  );
}

export function Funnel({ data }: { data: { label: string; value: number }[] }) {
  const m = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="funnel">
      {data.map((d, i) => {
        const w = 28 + (d.value / m) * 72;
        return (
          <div key={d.label} className="funnel-row">
            <div className="funnel-bar" style={{ width: `${w}%`, opacity: 1 - i * 0.1, animationDelay: `${i * 70}ms` }}><span>{d.label}</span><b>{d.value}</b></div>
          </div>
        );
      })}
    </div>
  );
}

export function Columns({ data, height = 140, color = 'var(--accent)' }: { data: { label: string; value: number }[]; height?: number; color?: string }) {
  const m = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="cols" style={{ height }}>
      {data.map((d, i) => (
        <div className="col" key={d.label + i} title={`${d.label}: ${d.value}`}>
          <div className="col-b" style={{ height: `${(d.value / m) * 100}%`, background: color, animationDelay: `${i * 25}ms` }}>{d.value > 0 && <em>{d.value}</em>}</div>
          <span>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export function Spark({ values, w = 110, h = 34, color = 'var(--accent)' }: { values: number[]; w?: number; h?: number; color?: string }) {
  if (values.length < 2) return null;
  const m = Math.max(1, ...values);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - (v / m) * (h - 4) - 2}`).join(' ');
  return (
    <svg width={w} height={h} className="spark">
      <polyline points={`0,${h} ${pts} ${w},${h}`} fill={color} opacity="0.12" stroke="none" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
