import { rasterBytesLookValid, type SoalImageMediaType } from "@teacher-exam/shared"

export async function fileToSoalUpload(file: File): Promise<
  { mediaType: SoalImageMediaType; dataBase64: string } | null
> {
  const mediaType = file.type
  if (mediaType !== "image/png" && mediaType !== "image/jpeg" && mediaType !== "image/webp") return null
  const bytes = new Uint8Array(await file.arrayBuffer())
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  const dataBase64 = btoa(binary)
  if (!rasterBytesLookValid(mediaType, dataBase64)) return null
  return { mediaType, dataBase64 }
}
