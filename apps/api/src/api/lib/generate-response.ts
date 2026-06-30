export async function adjustGenerateResponseStatus(
  request: Request,
  response: Response
): Promise<Response> {
  if (request.method !== "POST") {
    return response
  }

  const url = new URL(request.url)
  if (url.pathname !== "/api/ai/generate") {
    return response
  }

  if (response.status !== 201) {
    return response
  }

  let body: unknown
  try {
    body = await response.clone().json()
  } catch {
    return response
  }

  if (
    typeof body === "object" &&
    body !== null &&
    "jobId" in body &&
    "examId" in body &&
    !("questions" in body)
  ) {
    const headers = new Headers(response.headers)
    headers.set("Content-Type", "application/json; charset=utf-8")
    return new Response(JSON.stringify(body), { status: 202, headers })
  }

  return response
}
