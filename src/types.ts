export type Task = {
  id: number
  title: string
  description: string | null
  due_on: string | null
  done: boolean
}

export type Board = {
  id: number
  title: string
}
