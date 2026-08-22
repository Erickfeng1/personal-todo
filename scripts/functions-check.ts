import { GET as checkHealth } from '../api/health.js'
import { GET as getSession } from '../api/auth/session.js'
import { GET as getCloudState } from '../api/data/state.js'

const healthResponse = await checkHealth()
if (healthResponse.status !== 200) {
  throw new Error(`Health Function returned ${healthResponse.status}`)
}

const sessionResponse = await getSession(
  new Request('http://localhost/api/auth/session')
)
if (sessionResponse.status !== 200) {
  throw new Error(`Session Function returned ${sessionResponse.status}`)
}

const dataResponse = await getCloudState(
  new Request('http://localhost/api/data/state')
)
if (dataResponse.status !== 401) {
  throw new Error(
    `Unauthenticated data Function returned ${dataResponse.status}`
  )
}

console.info(
  'Function handlers are healthy; unauthenticated cloud data is rejected.'
)
