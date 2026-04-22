import { CheckCircle } from 'lucide-react'

const CP_ELEMENTS = [
  { label: 'Menyimak.', desc: 'Menganalisis informasi dari teks lisan/aural.' },
  { label: 'Membaca & Memirsa.', desc: 'Memahami ide pokok, kosakata, nilai sastra.' },
  { label: 'Berbicara.', desc: 'Menyampaikan gagasan secara logis & kritis.' },
  { label: 'Menulis.', desc: 'Menulis teks kompleks sesuai kaidah bahasa.' },
] as const

function CurriculumTipsCard() {
  return (
    <div className="bg-bg-surface border border-border-default rounded-md p-6 flex flex-col overflow-hidden h-full">
      <span className="text-caption font-semibold tracking-wider uppercase text-secondary-700">
        Capaian Pembelajaran · Fase C
      </span>
      <h3 className="text-h3 font-semibold text-text-primary mt-2 mb-2.5">
        Empat elemen Bahasa Indonesia
      </h3>
      <p className="text-body-sm text-text-secondary leading-relaxed m-0">
        Sistem memakai Capaian Pembelajaran berikut secara otomatis saat Anda memilih mapel Bahasa
        Indonesia. Topik di form generate akan menyesuaikan.
      </p>

      <ul className="mt-4 flex flex-col gap-2.5 list-none p-0 m-0">
        {CP_ELEMENTS.map((cp, i) => (
          <li
            key={i}
            className="grid gap-2.5 items-start text-body-sm leading-snug"
            style={{ gridTemplateColumns: '24px 1fr' }}
          >
            <span
              className="w-6 h-6 rounded-full bg-secondary-50 text-secondary-700 text-caption font-semibold flex items-center justify-center shrink-0"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              {i + 1}
            </span>
            <span>
              <b className="font-semibold text-text-primary">{cp.label}</b>{' '}
              <span className="text-text-secondary">{cp.desc}</span>
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-5 border-t border-dashed border-border-default flex items-center gap-1.5 text-caption text-text-tertiary">
        <CheckCircle size={14} className="text-secondary-700 shrink-0" />
        CP identik untuk Kelas 5 dan 6 — tidak perlu input manual.
      </div>
    </div>
  )
}

export { CurriculumTipsCard }
