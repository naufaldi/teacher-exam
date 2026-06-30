export function buildPdfStorageKey(userId: string, docId: string): string {
  return `documents/${userId}/${docId}/original.pdf`
}
