export function jsonResponse(body: unknown, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers)
  headers.set('content-type', 'application/json; charset=utf-8')
  headers.set('cache-control', 'no-store')

  return new Response(JSON.stringify(body), { ...init, headers })
}

export function errorResponse(status: number, code: string): Response {
  return jsonResponse(
    { error: { code, requestId: crypto.randomUUID() } },
    { status }
  )
}
