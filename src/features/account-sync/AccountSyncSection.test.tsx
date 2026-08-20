import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  CloudAuthContext,
  type CloudAuthValue
} from '../../auth/cloud-auth-context'
import {
  CloudSyncClientError,
  type CloudSyncClient
} from '../../sync/cloud-sync-client'
import { AccountSyncSection } from './AccountSyncSection'

const statistics = {
  activeTaskCount: 2,
  completedTaskCount: 3,
  deletedTaskCount: 1,
  projectCount: 1,
  tagCount: 2
}

function renderSection(auth: CloudAuthValue, client?: CloudSyncClient) {
  return render(
    <CloudAuthContext.Provider value={auth}>
      {client ? (
        <AccountSyncSection statistics={statistics} client={client} />
      ) : (
        <AccountSyncSection statistics={statistics} />
      )}
    </CloudAuthContext.Provider>
  )
}

afterEach(cleanup)

function authValue(overrides: Partial<CloudAuthValue>): CloudAuthValue {
  return {
    status: 'signed-out',
    userId: null,
    userLabel: null,
    getToken: () => Promise.resolve(null),
    openSignIn: vi.fn(),
    signOut: vi.fn().mockResolvedValue(undefined),
    ...overrides
  }
}

describe('account and sync settings', () => {
  it('keeps local mode available and opens sign in explicitly', async () => {
    const user = userEvent.setup()
    const openSignIn = vi.fn()
    renderSection(authValue({ openSignIn }))

    expect(screen.getByText('未登录')).toBeInTheDocument()
    expect(
      screen.getByText(/登录只会读取云端概况，不会自动上传/)
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '登录账号' }))
    expect(openSignIn).toHaveBeenCalledOnce()
  })

  it('shows local and empty cloud summaries after a read-only inspection', async () => {
    const inspect = vi.fn().mockResolvedValue({
      state: {
        protocolVersion: 1,
        requestId: '05f76645-562a-4584-956a-25c7739b5be9',
        cloudEmpty: true,
        counts: { tasks: 0, projects: 0, tags: 0, settings: 0 }
      },
      firstPull: {
        protocolVersion: 1,
        requestId: '7e80f954-0b52-447d-9f73-6cb6885d311c',
        changes: [],
        nextCursor: null,
        hasMore: false
      }
    })
    const getToken = vi.fn().mockResolvedValue('token')
    renderSection(
      authValue({
        status: 'signed-in',
        userId: 'user_a',
        userLabel: 'owner@example.com',
        getToken
      }),
      { inspect }
    )

    expect(screen.getByText('owner@example.com')).toBeInTheDocument()
    expect(screen.getByText('6')).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByText('云端为空')).toBeInTheDocument()
    )
    expect(inspect).toHaveBeenCalledOnce()
    expect(screen.getByText(/首次上传会在下一阶段/)).toBeInTheDocument()
  })

  it('keeps local data visible when the cloud session has expired', async () => {
    const inspect = vi
      .fn()
      .mockRejectedValue(new CloudSyncClientError('unauthorized'))
    renderSection(authValue({ status: 'signed-in', userId: 'user_a' }), {
      inspect
    })

    await waitFor(() =>
      expect(screen.getByText('会话已失效')).toBeInTheDocument()
    )
    expect(screen.getByText('6')).toBeInTheDocument()
  })

  it('logs out without clearing or changing the local summary', async () => {
    const user = userEvent.setup()
    const signOut = vi.fn().mockResolvedValue(undefined)
    renderSection(
      authValue({
        status: 'signed-in',
        userId: 'user_a',
        signOut
      }),
      { inspect: vi.fn().mockReturnValue(new Promise(() => undefined)) }
    )

    await user.click(screen.getByRole('button', { name: '退出登录' }))
    expect(signOut).toHaveBeenCalledOnce()
    expect(screen.getByText('6')).toBeInTheDocument()
  })
})
