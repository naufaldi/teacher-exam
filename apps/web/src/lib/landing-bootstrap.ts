export function shouldHydratePrerenderedRoot(
  pathname: string,
  search: string,
  rootText: string
): boolean {
  if (search !== "") return false
  const path = pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname
  if (path !== "/") return false
  return rootText.includes("LULUS KURIKULUM")
}
