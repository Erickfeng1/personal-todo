import { GET as checkHealth } from '../api/health.js'
import { GET as pullSyncChanges } from '../api/sync/pull.js'
import { GET as getSyncState } from '../api/sync/state.js'

const healthResponse = await checkHealth()
if (healthResponse.status !== 200) {
  throw new Error(`Health Function returned ${healthResponse.status}`)
}

const syncResponse = await getSyncState(
  new Request('http://localhost/api/sync/state?protocolVersion=1')
)
if (syncResponse.status !== 401) {
  throw new Error(
    `Unauthenticated sync Function returned ${syncResponse.status}`
  )
}

const pullResponse = await pullSyncChanges(
  new Request('http://localhost/api/sync/pull?protocolVersion=1')
)
if (pullResponse.status !== 401) {
  throw new Error(
    `Unauthenticated pull Function returned ${pullResponse.status}`
  )
}

console.info(
  'Function handlers are healthy; unauthenticated state and pull requests are rejected.'
)
