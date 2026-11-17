import type { Task } from './types'

type Props = {
  task: Task
  // このタスクへの送信が進行中。押せなくするために使う。
  busy: boolean
  onToggle: (id: number) => void
  onDelete: (id: number) => void
}

function TaskItem({ task, busy, onToggle, onDelete }: Props) {
  // 押せない理由は2つある。別物なので分けて持つ。
  //   他人のタスク → ずっと押せない
  //   送信中       → 終われば押せる
  const disabled = !task.editable || busy

  return (
    <div>
      <input
        type="checkbox"
        checked={task.done}
        disabled={disabled}
        onChange={() => onToggle(task.id)}
      />
      <span>{task.title}</span>
      <span>{task.done ? "完了" : "未完了"}</span>
      <button onClick={() => onDelete(task.id)} disabled={disabled}>
        削除
      </button>
      {!task.editable && <span>（他の人のタスク）</span>}
    </div>
  )
}

export default TaskItem
