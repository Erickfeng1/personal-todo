import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { taskService } from '../../app/services'
import { QuickAdd } from './QuickAdd'

describe('QuickAdd', () => {
  afterEach(() => vi.restoreAllMocks())

  it('creates an Inbox task, clears the input, and keeps focus', async () => {
    const user = userEvent.setup()
    const create = vi
      .spyOn(taskService, 'create')
      .mockResolvedValue({} as never)
    render(<QuickAdd context={{ source: 'inbox' }} placeholder="记下一件事" />)

    const input = screen.getByLabelText('新任务标题')
    await user.type(input, '提交周报{Enter}')

    expect(create).toHaveBeenCalledWith(
      { title: '提交周报' },
      { source: 'inbox' }
    )
    expect(input).toHaveValue('')
    expect(input).toHaveFocus()
  })

  it('keeps the draft visible when persistence fails', async () => {
    const user = userEvent.setup()
    vi.spyOn(taskService, 'create').mockRejectedValue(
      new Error('storage failed')
    )
    render(<QuickAdd context={{ source: 'inbox' }} placeholder="记下一件事" />)

    const input = screen.getByLabelText('新任务标题')
    await user.type(input, '保留草稿{Enter}')

    expect(input).toHaveValue('保留草稿')
    expect(screen.getByRole('alert')).toHaveTextContent('输入内容已保留')
  })
})
