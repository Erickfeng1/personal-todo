import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  CloudAuthContext,
  unavailableCloudAuth
} from '../../auth/cloud-auth-context'
import { legacyLocalDataReader } from '../../data/migration/legacy-local-data'
import { AccountSyncSection } from './AccountSyncSection'

const statistics = {
  activeTaskCount: 2,
  completedTaskCount: 3,
  deletedTaskCount: 1,
  projectCount: 1,
  tagCount: 2
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('cloud access settings', () => {
  it('shows Neon as the source and locks the session explicitly', async () => {
    vi.spyOn(legacyLocalDataReader, 'getSummary').mockResolvedValue({
      taskCount: 0,
      projectCount: 0,
      tagCount: 0
    })
    const signOut = vi.fn().mockResolvedValue(undefined)
    render(
      <CloudAuthContext.Provider
        value={{
          ...unavailableCloudAuth,
          status: 'signed-in',
          userId: 'single-user',
          userLabel: '私人云端',
          signOut
        }}
      >
        <AccountSyncSection statistics={statistics} />
      </CloudAuthContext.Provider>
    )

    expect(screen.getByText(/Neon 是任务/)).toBeInTheDocument()
    expect(screen.getByText('6')).toBeInTheDocument()
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: '锁定并退出' }))
    expect(signOut).toHaveBeenCalledOnce()
  })

  it('offers legacy import only when the cloud is empty', async () => {
    vi.spyOn(legacyLocalDataReader, 'getSummary').mockResolvedValue({
      taskCount: 4,
      projectCount: 1,
      tagCount: 2
    })
    render(
      <CloudAuthContext.Provider
        value={{ ...unavailableCloudAuth, status: 'signed-in' }}
      >
        <AccountSyncSection
          statistics={{
            activeTaskCount: 0,
            completedTaskCount: 0,
            deletedTaskCount: 0,
            projectCount: 0,
            tagCount: 0
          }}
        />
      </CloudAuthContext.Provider>
    )

    expect(
      await screen.findByRole('button', { name: '导入旧数据到云端' })
    ).toBeInTheDocument()
  })
})
