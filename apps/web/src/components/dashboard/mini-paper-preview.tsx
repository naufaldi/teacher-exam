import type { Exam } from '@teacher-exam/shared'

interface MiniPaperPreviewProps {
  exam: Exam
}

function formatTopicsDisplay(topics: readonly string[]): string {
  if (topics.length <= 2) {
    return topics.join(' · ')
  }
  const visible = topics.slice(0, 2).join(' · ')
  const remaining = topics.length - 2
  return `${visible} +${remaining}`
}

const SUBJECT_SHORT: Record<string, string> = {
  bahasa_indonesia: 'BI',
  pendidikan_pancasila: 'PPKN',
}

const QUESTION_SKELETONS = [
  { num: '1.', widths: ['100%', '70%', '50%'] },
  { num: '11.', widths: ['100%', '60%', '45%'] },
  { num: '2.', widths: ['90%', '75%', '55%'] },
  { num: '12.', widths: ['100%', '65%', '40%'] },
  { num: '3.', widths: ['95%', '70%', '50%'] },
  { num: '13.', widths: ['100%', '80%', '60%'] },
  { num: '4.', widths: ['85%', '60%', '45%'] },
  { num: '14.', widths: ['100%', '70%', '50%'] },
] as const

function MiniPaperPreview({ exam }: MiniPaperPreviewProps) {
  const subjectShort = SUBJECT_SHORT[exam.subject] ?? exam.subject
  const topicsDisplay = formatTopicsDisplay(exam.topics)

  return (
    <div
      className="aspect-[1/1.414] bg-bg-surface border border-kertas-300 rounded-xs shadow-xs overflow-hidden w-full"
      style={{ padding: '10px 8px 6px', fontFamily: 'var(--font-serif)' }}
      aria-hidden="true"
    >
      {/* Kop header */}
      <div className="text-center border-b border-kertas-900 pb-1 mb-2">
        <div className="text-[7px] font-bold tracking-wider uppercase leading-tight">
          {exam.schoolName}
        </div>
        <div className="text-[5px] mt-0.5 text-text-secondary">
          {exam.examType} {subjectShort} · {exam.academicYear}
        </div>
        {topicsDisplay !== '' && (
          <div className="text-[4.5px] mt-0.5 text-text-secondary truncate">
            {topicsDisplay}
          </div>
        )}
      </div>

      {/* Title */}
      <div className="text-center text-[6px] font-bold uppercase underline mb-1.5">
        Lembar Soal
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[4.5px] mb-2 text-text-primary">
        <span>Nama : ......</span>
        <span>Mapel : {subjectShort}</span>
        <span>No. : ......</span>
        <span>Kelas : {exam.grade} SD</span>
      </div>

      {/* Question skeletons */}
      <div className="grid grid-cols-2 gap-x-1.5 gap-y-1">
        {QUESTION_SKELETONS.map((q) => (
          <div key={q.num} className="flex gap-1">
            <span className="text-[4.5px] font-semibold shrink-0">{q.num}</span>
            <div className="flex flex-col gap-0.5 flex-1">
              {q.widths.map((w, i) => (
                <span
                  key={i}
                  className="h-[2px] bg-kertas-200 rounded-full block"
                  style={{ width: w }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export { MiniPaperPreview, formatTopicsDisplay }
