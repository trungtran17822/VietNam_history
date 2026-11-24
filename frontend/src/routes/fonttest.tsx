import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

// Glyph check for Vietnamese diacritics in the local Noto files (no login needed).
export const Route = createFileRoute('/fonttest')({ component: FontTest });

const SAMPLE = 'Đại thắng mùa xuân Kỷ Dậu 1789 · Ngọc Hồi – Đống Đa · ă â đ ê ô ơ ư · ầ ẩ ẫ ấ ậ · ợ ữ ỹ ỵ ự';

function FontTest() {
  const [status, setStatus] = useState<string[]>([]);
  useEffect(() => {
    document.fonts.ready.then(() =>
      setStatus(
        ['Noto Serif', 'Noto Sans'].flatMap((family) =>
          [400, 600, 700].map((w) => `${family} ${w}: ${document.fonts.check(`${w} 16px "${family}"`, 'Đạợữ') ? 'đã tải' : 'chưa tải'}`)
        )
      )
    );
  }, []);
  return (
    <main id="view-fonttest" className="app-view active mx-auto max-w-5xl px-4 py-10">
      <h1 className="t-2xl font-bold">Kiểm tra phông chữ tiếng Việt</h1>
      <ul className="mt-3 grid gap-1 t-sm sm:grid-cols-2" aria-live="polite">{status.map((s) => <li key={s}>{s}</li>)}</ul>
      {(['font-serif', 'font-sans'] as const).map((family) => (
        <section key={family} className="mt-8">
          <h2 className="t-lg font-semibold">{family === 'font-serif' ? 'Noto Serif' : 'Noto Sans'}</h2>
          {[400, 600, 700].map((weight) =>
            [16, 22, 32].map((size) => (
              <p key={`${weight}-${size}`} className={`${family} mt-2`} style={{ fontWeight: weight, fontSize: size }}>
                {weight}/{size}px · {SAMPLE}
              </p>
            ))
          )}
        </section>
      ))}
    </main>
  );
}
