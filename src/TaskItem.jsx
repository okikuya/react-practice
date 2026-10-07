function TaskItem({ task, onToggle, onDelete }) {
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