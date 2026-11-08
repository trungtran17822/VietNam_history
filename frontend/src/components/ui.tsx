// Small shared pieces: authored SVG icons, modal, status chip, labelled field.
import { Link } from '@tanstack/react-router';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import type { Status } from '../lib/lesson-schema';

// 24px stroke icons drawn for this app (no icon font, no emoji).
const PATHS = {
  play: 'M8 5.5v13l10.5-6.5z',
  pause: 'M8 5v14M16 5v14',
  rewind: 'M6 5v14M19 5.5v13L9 12z',
  next: 'M5 12h14M13 6l6 6-6 6',
  back: 'M19 12H5M11 6l-6 6 6 6',
  check: 'M5 12.5l4.5 4.5L19 7',
  close: 'M6 6l12 12M18 6L6 18',
  plus: 'M12 5v14M5 12h14',
  trash: 'M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12',
  copy: 'M9 9h10v10H9zM5 15V5h10',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  eye: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM12 15a3 3 0 100-6 3 3 0 000 6z',
  upload: 'M12 16V4M7 9l5-5 5 5M5 20h14',
  download: 'M12 4v12M7 11l5 5 5-5M5 20h14',
  sound: 'M4 9.5h4L13 5v14l-5-4.5H4zM16.5 8.5a5 5 0 010 7M19 6a8.5 8.5 0 010 12',
  mute: 'M4 9.5h4L13 5v14l-5-4.5H4zM17 9.5l5 5M22 9.5l-5 5',
  gauge: 'M4 16a8 8 0 1116 0M12 16l4-5',
  screen: 'M3.5 5h17v11h-17zM8 20h8M12 16v4',
  user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4.5 20a7.5 7.5 0 0115 0',
  logout: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10',
  undo: 'M9 7L4.5 11.5 9 16M5 11.5h9a5 5 0 010 10h-2',
  redo: 'M15 7l4.5 4.5L15 16M19 11.5h-9a5 5 0 000 10h2',
  book: 'M5 4.5h11a3 3 0 013 3V20H8a3 3 0 01-3-3zM5 17a3 3 0 013-3h11',
  lock: 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 017 0v3',
  search: 'M10.5 17a6.5 6.5 0 100-13 6.5 6.5 0 000 13zM15.5 15.5L20 20',
  menu: 'M4 7h16M4 12h16M4 17h16',
  map: 'M3.5 6l5.5-2 6 2 5.5-2v14l-5.5 2-6-2-5.5 2zM9 4v14M15 6v14',
  warning: 'M12 4l9 16H3zM12 10v4.5M12 17.5v.5',
  chevron: 'M8 10l4 4 4-4',
  up: 'M12 19V5M6 11l6-6 6 6',
  down: 'M12 5v14M6 13l6 6 6-6',
  people: 'M9 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM2.5 20a6.5 6.5 0 0113 0M16 4.5a3.5 3.5 0 010 6.5M18 14a6.5 6.5 0 013.5 6',
  sliders: 'M4 7h10M18 7h2M4 17h4M12 17h8M14 4.5v5M8 14.5v5'
} as const;
export type IconName = keyof typeof PATHS;

export function Icon({ name, className = 'icon', label }: { name: IconName; className?: string; label?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={name === 'play' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden={label ? undefined : true} role={label ? 'img' : undefined} aria-label={label}>
      <path d={PATHS[name]} />
    </svg>
  );
}

const STATUS_CLASS: Record<string, string> = { 'Đã dạy': 'published', 'Đã lên lịch': 'scheduled', Nháp: 'draft' };
export function StatusChip({ status }: { status: Status | string }) {
  return <span className={`status-chip ${STATUS_CLASS[status] ?? 'draft'}`}>{status === 'Đã dạy' ? 'Đã phát hành' : status}</span>;
}

/** Dialog with focus moved in on open, Escape to close and focus returned to the opener. */
export function Modal({ id, open, title, onClose, children, footer }: { id: string; open: boolean; title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const first = panel.current?.querySelector<HTMLElement>('input, textarea, select, button:not([data-close])') ?? panel.current;
    first?.focus();
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      opener?.focus?.();
    };
  }, [open, onClose]);
  return (
    <div id={id} className={`modal-backdrop${open ? ' active' : ''}`} aria-hidden={!open} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      {open && (
        <div ref={panel} className="modal-panel" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
          <div className="flex items-start justify-between gap-4 border-b border-rule px-5 py-4">
            <h2 id={titleId} className="t-xl font-semibold">{title}</h2>
            <button type="button" className="btn btn-quiet btn-sm btn-close-modal" data-close onClick={onClose} aria-label="Đóng">
              <Icon name="close" />
            </button>
          </div>
          <div className="px-5 py-4">{children}</div>
          {footer && <div className="flex flex-wrap justify-end gap-3 border-t border-rule px-5 py-4">{footer}</div>}
        </div>
      )}
    </div>
  );
}

export function Field({ label, hint, children, className = '' }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="label">{label}</span>
      {children}
      {hint && <span className="hint block">{hint}</span>}
    </label>
  );
}

/** Dashboard entry to the atlas (both roles). */
export function AtlasCard() {
  return (
    <Link to="/atlas" className="atlas-card card mt-6 flex items-center gap-4 p-4 text-ink no-underline hover:border-[var(--sepia)]">
      <span className="grid h-11 w-11 flex-none place-items-center rounded-full bg-silk text-lacquer"><Icon name="map" /></span>
      <span className="min-w-0">
        <span className="block font-semibold">Atlas Việt Nam</span>
        <span className="block t-sm muted">34 tỉnh, thành phố, Hoàng Sa, Trường Sa và các địa danh lịch sử; mỗi chiến trường dẫn tới bài học của nó.</span>
      </span>
      <Icon name="next" className="icon ml-auto flex-none muted" />
    </Link>
  );
}

export const SIMULATION_NOTICE = 'ĐÂY LÀ MÔ PHỎNG DỰA TRÊN Ý KIẾN CỦA HỌC SINH VÀ SỰ KIỆN THỰC TẾ, KHÔNG PHẢI SỰ THẬT LỊCH SỬ.';
export const PROTOTYPE_NOTICE = 'Nội dung minh họa, chưa được chuyên gia duyệt';
