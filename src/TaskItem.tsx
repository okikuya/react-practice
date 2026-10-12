import type { Task } from './types'

type Props = {
  task: Task
  onToggle: (id: number) => void
  onDelete: (id: number) => void
}

function TaskItem({ task, onToggle, onDelete }: Props) {
  return (
    <div>
      <input
        type="checkbox"
        checked={task.done}
        onChange={() => onToggle(task.id)}
      />
      <span>{task.title}</span>
      <span>{task.done ? "完了" : "未完了"}</span>
      <button onClick={() => onDelete(task.id)}>削除</button>
    </div>
  )
}

export default TaskItem