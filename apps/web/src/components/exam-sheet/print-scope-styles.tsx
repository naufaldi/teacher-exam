function ExamSheetPrintStyles() {
  return (
    <style>
      {`
        @media screen {
          [data-print-content][data-screen-tab="soal"] [data-print-section="lj"],
          [data-print-content][data-screen-tab="soal"] [data-print-section="kunci"],
          [data-print-content][data-screen-tab="soal"] [data-print-section="pembahasan"],
          [data-print-content][data-screen-tab="lj"] [data-print-section="soal"],
          [data-print-content][data-screen-tab="lj"] [data-print-section="kunci"],
          [data-print-content][data-screen-tab="lj"] [data-print-section="pembahasan"],
          [data-print-content][data-screen-tab="kunci"] [data-print-section="soal"],
          [data-print-content][data-screen-tab="kunci"] [data-print-section="lj"],
          [data-print-content][data-screen-tab="kunci"] [data-print-section="pembahasan"],
          [data-print-content][data-screen-tab="pembahasan"] [data-print-section="soal"],
          [data-print-content][data-screen-tab="pembahasan"] [data-print-section="lj"],
          [data-print-content][data-screen-tab="pembahasan"] [data-print-section="kunci"] {
            display: none !important;
          }
        }
        @media print {
          body[data-print-scope="soal"] [data-print-section="lj"],
          body[data-print-scope="soal"] [data-print-section="kunci"],
          body[data-print-scope="soal"] [data-print-section="pembahasan"],
          body[data-print-scope="lj"] [data-print-section="soal"],
          body[data-print-scope="lj"] [data-print-section="kunci"],
          body[data-print-scope="lj"] [data-print-section="pembahasan"],
          body[data-print-scope="kunci"] [data-print-section="soal"],
          body[data-print-scope="kunci"] [data-print-section="lj"],
          body[data-print-scope="kunci"] [data-print-section="pembahasan"],
          body[data-print-scope="pembahasan"] [data-print-section="soal"],
          body[data-print-scope="pembahasan"] [data-print-section="lj"],
          body[data-print-scope="pembahasan"] [data-print-section="kunci"] {
            display: none !important;
          }
          [data-preview-frame] {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            background: white !important;
          }
        }
      `}
    </style>
  )
}

export { ExamSheetPrintStyles }
