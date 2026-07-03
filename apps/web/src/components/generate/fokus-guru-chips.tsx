interface FokusGuruChipsProps {
  topik: string
  onAppend: (snippet: string) => void
}

export function FokusGuruChips({ onAppend, topik }: FokusGuruChipsProps) {
  const focusOnTopik = topik.trim() !== ""
  const chips: ReadonlyArray<{ label: string; snippet: string; disabled: boolean }> = [
    {
      label: focusOnTopik ? `Fokus pada: ${topik}` : "Fokus pada: (pilih topik)",
      snippet: focusOnTopik ? `Fokus pada: ${topik}.` : "",
      disabled: !focusOnTopik
    },
    { label: "Kesalahan umum: …", snippet: "Kesalahan umum: ", disabled: false },
    { label: "Buat soal kontekstual tentang …", snippet: "Buat soal kontekstual tentang ", disabled: false },
    { label: "Hubungkan dengan: …", snippet: "Hubungkan dengan: ", disabled: false }
  ]

  return (
    <div className="flex flex-wrap gap-1.5 pt-1">
      {chips.map((chip) => (
        <button
          key={chip.label}
          type="button"
          disabled={chip.disabled}
          onClick={() => onAppend(chip.snippet)}
          className={[
            "inline-flex items-center gap-1 px-2.5 py-1 rounded-pill text-caption",
            "border transition-all duration-[120ms]",
            chip.disabled
              ? "border-border-default bg-bg-muted text-text-tertiary cursor-not-allowed opacity-60"
              : "border-border-ui bg-bg-surface text-text-secondary hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 active:scale-[0.97]"
          ].join(" ")}
          aria-label={`Tambahkan template: ${chip.label}`}
        >
          + {chip.label}
        </button>
      ))}
    </div>
  )
}
