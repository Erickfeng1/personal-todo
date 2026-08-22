import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type PropsWithChildren
} from 'react'
import { cloudStore } from '../cloud/cloud-store'
import { settingsService } from '../app/services'
import {
  CloudAuthContext,
  unavailableCloudAuth,
  type CloudAuthStatus,
  type CloudAuthValue
} from './cloud-auth-context'

let cloudInitialization: Promise<void> | null = null

async function initializeCloud(): Promise<void> {
  cloudInitialization ??= (async () => {
    await cloudStore.load()
    await settingsService.get()
  })()
  try {
    await cloudInitialization
  } finally {
    cloudInitialization = null
  }
}

function AccessGate(props: {
  status: CloudAuthStatus
  error: string | null
  login: (password: string) => Promise<void>
  retry: () => Promise<void>
}) {
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setLoginError(null)
    try {
      await props.login(password)
      setPassword('')
    } catch (cause) {
      setLoginError(cause instanceof Error ? cause.message : '解锁失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="access-gate">
      <section className="access-card" aria-labelledby="access-title">
        <span className="brand-mark" aria-hidden="true">
          序
        </span>
        <p className="eyebrow">PRIVATE CLOUD</p>
        <h1 id="access-title">解锁你的待办</h1>
        {props.status === 'loading' ? (
          <p role="status">正在验证会话并加载云端数据…</p>
        ) : props.status === 'error' ? (
          <>
            <p role="alert">{props.error ?? '暂时无法连接云端数据。'}</p>
            <button
              className="primary-button"
              type="button"
              onClick={() => void props.retry()}
            >
              重新连接
            </button>
          </>
        ) : (
          <form onSubmit={(event) => void submit(event)}>
            <label htmlFor="access-password">访问密码</label>
            <input
              id="access-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            {loginError ? (
              <p className="inline-error" role="alert">
                {loginError}
              </p>
            ) : null}
            <button
              className="primary-button"
              type="submit"
              disabled={submitting}
            >
              {submitting ? '正在解锁…' : '解锁并加载云端数据'}
            </button>
          </form>
        )}
        <small>任务只通过受保护接口保存到你的 Neon 数据库。</small>
      </section>
    </main>
  )
}

export function CloudAuthProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<CloudAuthStatus>('loading')
  const [error, setError] = useState<string | null>(null)

  const restore = useCallback(async () => {
    setStatus('loading')
    setError(null)
    try {
      const response = await fetch('/api/auth/session', {
        headers: { accept: 'application/json' }
      })
      if (!response.ok) throw new Error('暂时无法验证访问会话。')
      const body = (await response.json()) as { authenticated?: boolean }
      if (!body.authenticated) {
        cloudStore.clear()
        setStatus('signed-out')
        return
      }
      await initializeCloud()
      setStatus('signed-in')
    } catch {
      setError('暂时无法连接云端数据。请确认网络与服务端配置后重试。')
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    void Promise.resolve().then(restore)
    const expire = () => {
      cloudStore.clear()
      setStatus('signed-out')
    }
    window.addEventListener('personal-todo-session-expired', expire)
    return () =>
      window.removeEventListener('personal-todo-session-expired', expire)
  }, [restore])

  const login = useCallback(async (password: string) => {
    const response = await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password })
    })
    if (!response.ok) {
      if (response.status === 429)
        throw new Error('尝试次数过多，请 15 分钟后再试。')
      if (response.status === 401) throw new Error('访问密码不正确。')
      throw new Error('暂时无法验证访问密码。')
    }
    await initializeCloud()
    setStatus('signed-in')
  }, [])

  const signOut = useCallback(async () => {
    await fetch('/api/auth/session', { method: 'DELETE' })
    cloudStore.clear()
    setStatus('signed-out')
  }, [])

  const value = useMemo<CloudAuthValue>(
    () => ({
      ...unavailableCloudAuth,
      status,
      userId: status === 'signed-in' ? 'single-user' : null,
      userLabel: status === 'signed-in' ? '私人云端' : null,
      login,
      retry: restore,
      signOut
    }),
    [login, restore, signOut, status]
  )

  return (
    <CloudAuthContext.Provider value={value}>
      {status === 'signed-in' ? (
        children
      ) : (
        <AccessGate
          status={status}
          error={error}
          login={login}
          retry={restore}
        />
      )}
    </CloudAuthContext.Provider>
  )
}
