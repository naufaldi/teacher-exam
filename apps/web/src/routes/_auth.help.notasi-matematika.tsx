import { createFileRoute } from "@tanstack/react-router"
import { Card } from "@teacher-exam/ui"
import { MathText } from "../components/math-text.js"

export const Route = createFileRoute("/_auth/help/notasi-matematika")({
  component: NotasiMatematikaHelpPage
})

const WRONG_TIMES_PREVIEW = String.raw`Hasil dari $124 imes 36$`
const CORRECT_TIMES_PREVIEW = String.raw`Hasil dari $124 \times 36$`

const EXAMPLES = [
  {
    title: "Perkalian",
    input: "Hasil dari $124 \\times 36$ adalah ....",
    wrong: "Hasil dari $124 imes 36$ adalah ...."
  },
  {
    title: "Pembagian",
    input: "Hasil dari $1824 \\div 12$ adalah ...."
  },
  {
    title: "Pecahan",
    input: "Bu Ratna membeli $\\frac{3}{4}$ liter minyak."
  },
  {
    title: "Akar",
    input: "Nilai $\\sqrt{16}$ adalah ...."
  },
  {
    title: "Pangkat",
    input: "Hasil dari $2^3$ adalah ...."
  },
  {
    title: "Angka ribuan (di luar $...$)",
    input: "Hasil dari 5.678 + 3.421 adalah ...."
  }
] as const

const SYMBOL_ROWS = [
  { label: "Kali (×)", code: String.raw`$124 \times 36$` },
  { label: "Bagi (÷)", code: String.raw`$1824 \div 12$` },
  { label: "Pecahan", code: String.raw`$\frac{3}{4}$` },
  { label: "Akar", code: String.raw`$\sqrt{16}$` }
] as const

function ComparisonCard({
  borderClassName,
  code,
  label,
  labelClassName,
  preview,
  repair
}: {
  label: string
  labelClassName: string
  borderClassName: string
  code: string
  preview: string
  repair?: boolean
}) {
  return (
    <div className={`min-w-0 rounded-sm border bg-bg-surface p-3 space-y-2 ${borderClassName}`}>
      <p className={`text-caption font-medium ${labelClassName}`}>{label}</p>
      <div>
        <p className="text-caption text-text-tertiary mb-0.5">Tulis</p>
        <p className="font-mono text-text-secondary">{code}</p>
      </div>
      <div className="overflow-x-auto [&_.katex]:whitespace-nowrap">
        <p className="text-caption text-text-tertiary mb-0.5">Pratinjau</p>
        <p className="text-text-primary">
          <MathText text={preview} repair={repair ?? true} />
        </p>
      </div>
    </div>
  )
}

function NotasiMatematikaHelpPage() {
  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <a
          href="/dashboard"
          className="text-body-sm text-text-tertiary hover:text-text-primary transition-colors"
        >
          ← Kembali
        </a>
        <h1 className="text-h2 text-text-primary mt-4">Panduan notasi matematika</h1>
        <p className="text-body text-text-secondary mt-2">
          Soal Matematika memakai notasi LaTeX sederhana. Bungkus ekspresi matematika dengan{" "}
          <code className="font-mono text-body-sm bg-kertas-100 px-1 rounded-sm">$...$</code>.
        </p>
      </div>

      <Card className="p-5 space-y-4">
        <h2 className="text-h4 text-text-primary">Contoh simbol umum</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-body-sm">
            <thead>
              <tr className="border-b border-border-default text-left">
                <th className="pb-2 pr-4 font-medium text-text-tertiary">Simbol</th>
                <th className="pb-2 font-medium text-text-tertiary">Tulis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {SYMBOL_ROWS.map((row) => (
                <tr key={row.label}>
                  <td className="py-2.5 pr-4 align-top font-medium text-text-primary whitespace-nowrap">
                    {row.label}
                  </td>
                  <td className="py-2.5 align-top font-mono text-text-secondary">{row.code}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-5 space-y-3 border-warning-border bg-warning-bg/30">
        <h2 className="text-h4 text-text-primary">Kesalahan umum</h2>
        <p className="text-body-sm text-text-secondary">
          Jika pratinjau menampilkan <strong>imes</strong> (huruf miring), backslash hilang. Perbaiki dengan menulis
          {" "}
          <code className="font-mono bg-kertas-100 px-1">\times</code> di dalam $...$.
        </p>
        <div className="grid gap-2 sm:grid-cols-2 items-stretch text-body-sm">
          <ComparisonCard
            label="Salah"
            labelClassName="text-danger-fg"
            borderClassName="border-danger-border"
            code="$124 imes 36$"
            preview={WRONG_TIMES_PREVIEW}
            repair={false}
          />
          <ComparisonCard
            label="Benar"
            labelClassName="text-success-fg"
            borderClassName="border-success-border"
            code="$124 \times 36$"
            preview={CORRECT_TIMES_PREVIEW}
          />
        </div>
      </Card>

      <div className="space-y-4">
        <h2 className="text-h4 text-text-primary">Contoh pratinjau</h2>
        {EXAMPLES.map((example) => (
          <Card key={example.title} className="p-4 space-y-2">
            <h3 className="text-body font-semibold text-text-primary">{example.title}</h3>
            <div>
              <p className="text-caption text-text-tertiary mb-0.5">Tulis</p>
              <p className="font-mono text-caption text-text-tertiary">{example.input}</p>
            </div>
            <div className="border-t border-border-default pt-2 overflow-x-auto [&_.katex]:whitespace-nowrap">
              <p className="text-caption text-text-tertiary mb-0.5">Pratinjau</p>
              <p className="text-body text-text-primary">
                <MathText text={example.input} />
              </p>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <h2 className="text-h4 text-text-primary mb-2">Angka ribuan Indonesia</h2>
        <p className="text-body-sm text-text-secondary">
          Angka dengan titik pemisah ribuan (mis. 5.678, 1.824) tulis sebagai teks biasa — <strong>jangan</strong>{" "}
          masukkan ke dalam $...$. Di dalam $...$, titik dianggap desimal oleh LaTeX.
        </p>
      </Card>
    </div>
  )
}
