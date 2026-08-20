import { getSql } from '../server/db/client.js'
import { errorResponse, jsonResponse } from '../server/http/responses.js'

export async function GET(): Promise<Response> {
  try {
    await getSql().query('SELECT 1 AS healthy')
    return jsonResponse({ status: 'ok' })
  } catch {
    return errorResponse(503, 'database_unavailable')
  }
}
