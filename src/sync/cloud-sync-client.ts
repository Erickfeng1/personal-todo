import {
  SYNC_PROTOCOL_VERSION,
  syncPullResponseSchema,
  syncStateSchema,
  type SyncPullResponse,
  type SyncState
} from './protocol'

export type CloudSyncClientErrorCode =
  'unauthorized' | 'unavailable' | 'invalid_response'

export class CloudSyncClientError extends Error {
  constructor(readonly code: CloudSyncClientErrorCode) {
    super(code)
    this.name = 'CloudSyncClientError'
  }
}

export interface CloudSyncInspection {
  state: SyncState
  firstPull: SyncPullResponse
}

export interface CloudSyncClient {
  inspect(
    getToken: () => Promise<string | null>,
    signal?: AbortSignal
  ): Promise<CloudSyncInspection>
}

export interface HttpCloudSyncClientOptions {
  baseUrl?: string
  fetcher?: typeof fetch
}

export class HttpCloudSyncClient implements CloudSyncClient {
  private readonly baseUrl: string
  private readonly fetcher: typeof fetch

  constructor(options: HttpCloudSyncClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? ''
    this.fetcher = options.fetcher ?? fetch
  }

  async inspect(
    getToken: () => Promise<string | null>,
    signal?: AbortSignal
  ): Promise<CloudSyncInspection> {
    const token = await getToken()
    if (!token) throw new CloudSyncClientError('unauthorized')

    const headers = { authorization: `Bearer ${token}` }
    const requestInit: RequestInit = {
      method: 'GET',
      headers,
      ...(signal ? { signal } : {})
    }
    const [stateResponse, pullResponse] = await Promise.all([
      this.fetcher(
        `${this.baseUrl}/api/sync/state?protocolVersion=${String(SYNC_PROTOCOL_VERSION)}`,
        requestInit
      ),
      this.fetcher(
        `${this.baseUrl}/api/sync/pull?protocolVersion=${String(SYNC_PROTOCOL_VERSION)}&limit=1`,
        requestInit
      )
    ])
    const [state, firstPull] = await Promise.all([
      this.parseResponse(stateResponse, syncStateSchema),
      this.parseResponse(pullResponse, syncPullResponseSchema)
    ])

    return { state, firstPull }
  }

  private async parseResponse<T>(
    response: Response,
    schema: {
      safeParse(value: unknown): { success: true; data: T } | { success: false }
    }
  ): Promise<T> {
    if (response.status === 401) {
      throw new CloudSyncClientError('unauthorized')
    }
    if (!response.ok) throw new CloudSyncClientError('unavailable')

    let body: unknown
    try {
      body = await response.json()
    } catch {
      throw new CloudSyncClientError('invalid_response')
    }

    const parsed = schema.safeParse(body)
    if (!parsed.success) throw new CloudSyncClientError('invalid_response')
    return parsed.data
  }
}

export const cloudSyncClient = new HttpCloudSyncClient()
