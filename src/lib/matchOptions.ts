import type { DashboardMatchOption } from '../types'

export function compareMatchOptionDesc(
  left: DashboardMatchOption,
  right: DashboardMatchOption,
): number {
  const leftDate = left.matchDateCode
  const rightDate = right.matchDateCode
  const leftHasDate = leftDate !== null
  const rightHasDate = rightDate !== null

  if (leftHasDate && rightHasDate && leftDate !== rightDate) {
    const byDate = rightDate.localeCompare(leftDate)
    if (byDate !== 0) {
      return byDate
    }
  } else {
    const byUpdatedAt = right.updatedAt.localeCompare(left.updatedAt)
    if (byUpdatedAt !== 0) {
      return byUpdatedAt
    }
  }

  const byUpdatedAt = right.updatedAt.localeCompare(left.updatedAt)
  if (byUpdatedAt !== 0) {
    return byUpdatedAt
  }

  if (leftDate !== rightDate) {
    if (leftDate === null) {
      return 1
    }
    if (rightDate === null) {
      return -1
    }
    const byDate = rightDate.localeCompare(leftDate)
    if (byDate !== 0) {
      return byDate
    }
  }

  return right.matchId.localeCompare(left.matchId)
}
