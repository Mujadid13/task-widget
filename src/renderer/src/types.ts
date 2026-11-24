// Built-in categories, plus anything the user types via "Custom…".
export type Category = string
export type Status = 'backlog' | 'in-progress' | 'done'
export type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' // resize grips

export interface Task {
  id: string
  title: string
  due?: string // ISO date-time, optional
  priority: 1 | 2 | 3 // 1 = highest
  category: Category
  status: Status
  createdAt: string // ISO date-time
}

export const categories: Category[] = ['work', 'uni', 'personal'] // built-ins

// Board columns, in display order.
export const statusLabels: Record<Status, string> = {
  backlog: 'Backlog',
  'in-progress': 'In progress',
  done: 'Completed'
}
export const statuses = Object.keys(statusLabels) as Status[]
