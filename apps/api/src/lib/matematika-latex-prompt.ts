/** System-prompt lines for Matematika LaTeX (generate, regenerate, pembahasan). */
export function buildMatematikaLatexPromptRules(): readonly string[] {
  return [
    '',
    '- Khusus Matematika: semua notasi matematika WAJIB memakai delimiter LaTeX.',
    '  Gunakan `$inline$` untuk ekspresi pendek di dalam kalimat dan `$$display$$` untuk ekspresi panjang.',
    '  Contoh benar: `$\\frac{3}{4}$`, `$x^2$`, `$\\sqrt{16}$`, `$124 \\times 36$`, `$1824 \\div 12$`.',
    '  Jangan tulis notasi matematika ambigu seperti 3/4, x^2, atau akar 16 tanpa delimiter LaTeX.',
    '  Jangan tulis perintah LaTeX tanpa delimiter (mis. `12 \\div 3` tanpa `$...$`).',
    '- Dalam JSON, setiap backslash LaTeX wajib ditulis dua kali: `\\\\times`, `\\\\div`, `\\\\frac`, `\\\\sqrt`.',
    '  Jangan menulis `imes`, `rac`, atau `div` tanpa backslash — itu akan rusak saat disimpan.',
    '- Hanya bungkus ekspresi matematika dengan `$...$` — jangan bungkus kalimat narasi utuh.',
    '  Jangan mulai field "text" dengan `$` diikuti huruf (salah: `$Satu liter...`; benar: `Satu liter... $\\frac{3}{4}$ liter`).',
    '- Angka dengan pemisah ribuan Indonesia (titik, mis. 5.678, 1.824) tulis di teks biasa, BUKAN di dalam `$...$`',
    '  (di dalam `$...$` titik dianggap desimal oleh LaTeX). Contoh benar: `Hasil dari 5.678 + 3.421 adalah ....`',
    '- Nilai uang (Rp18.500, Rp10.000) dan satuan selalu teks biasa — jangan masukkan ke dalam `$...$`.',
    '- Khusus Matematika: nilai uang, satuan, atau teks numerik di field string (mis. "Rp350.000", "1/2 kg") WAJIB diapit tanda kutip ganda JSON — jangan tulis Rp350.000 tanpa kutip.',
  ]
}
