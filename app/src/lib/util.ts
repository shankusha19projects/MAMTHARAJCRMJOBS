// Links + clipboard helpers that work even from file:// (see skill spec).
export function openJobUrl(url: string) {
  const w = window.open(url, '_blank', 'noopener');
  if (!w) window.location.href = url;
}

export function copyText(txt: string): Promise<boolean> {
  return new Promise((res) => {
    const fallback = () => {
      try {
        const ta = document.createElement('textarea');
        ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.focus(); ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta); res(ok);
      } catch { res(false); }
    };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(txt).then(() => res(true)).catch(fallback);
    else fallback();
  });
}

/** Copy with the guaranteed prompt() fallback; returns true if copied silently. */
export async function copyOrPrompt(txt: string) {
  const ok = await copyText(txt);
  if (!ok) window.prompt('Copy this (Ctrl+C):', txt);
  return ok;
}

export function timeAgo(iso?: string | null, now = Date.now()) {
  if (!iso) return '—';
  const s = Math.max(0, (now - Date.parse(iso)) / 1000);
  if (s < 45) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  const d = Math.round(s / 86400);
  if (d < 30) return `${d}d ago`;
  return `${Math.round(d / 30)}mo ago`;
}
export const ageHours = (iso?: string) => (iso ? (Date.now() - Date.parse(iso)) / 36e5 : 1e9);

export function hashHue(s: string) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % 360; }
export const initials = (s: string) => s.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ');
export const shortUrl = (u: string) => u.replace(/^https?:\/\/(www\.)?/, '');
export const prColor = (p: string) => ({ A: 'var(--good)', B: 'var(--accent)', C: 'var(--warn)', D: 'var(--bad)' } as Record<string, string>)[p] || 'var(--muted)';
