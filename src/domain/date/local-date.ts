export type LocalDate = `${number}-${number}-${number}`

const LOCAL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function getTodayLocal(date = new Date()): LocalDate {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}` as LocalDate
}

export function isLocalDate(value: string): value is LocalDate {
  if (!LOCAL_DATE_PATTERN.test(value)) return false

  const [year, month, day] = value.split('-').map(Number)
  if (year === undefined || month === undefined || day === undefined)
    return false

  const candidate = new Date(year, month - 1, day)
  return (
    candidate.getFullYear() === year &&
    candidate.getMonth() === month - 1 &&
    candidate.getDate() === day
  )
}

export function compareLocalDate(a: LocalDate, b: LocalDate): -1 | 0 | 1 {
  if (a === b) return 0
  return a < b ? -1 : 1
}
