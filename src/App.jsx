import { useState, useEffect } from 'react'
import TaskItem from './TaskItem'

function App() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState("")
  const [csrfToken, setCsrfToken] = useState("")
  const [boards, setBoards] = useState([])
  const [boardId, setBoardId] = useState("")
  
  useEffect(() => {
    fetch("/api/csrf_token")
    .then((res) => res.json())
    .then((data) => setCsrfToken(data.token))
  }, [])
  
  useEffect(() => {
    fetch("/api/tasks")
    .then((res) => res.json())
    .then((data) => {
      setTasks(data)
      setLoading(false)
    })
  }, [])
  
  useEffect(() => {
    fetch("/api/boards")
      .then((res) => res.json())
      .then((data) => {
        setBoards(data)
        if (data.length > 0) setBoardId(String(data[0].id))
      })
  }, [])

  const toggleTask = (id) => {
    const task = tasks.find((t) => t.id === id)

    fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
      },
      body: JSON.stringify({ task: { done: !task.done } }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((updated) => {
        setTasks(tasks.map((t) => (t.id === id ? updated : t)))
      })
      .catch((err) => console.error(err))
  }

  const deleteTask = (id) => {
    fetch(`/api/tasks/${id}`, {
      method: "DELETE",
      headers: { "X-CSRF-Token": csrfToken },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        setTasks(tasks.filter((t) => t.id !== id))
      })
      .catch((err) => console.error(err))
  }

  const addTask = (e) => {
    e.preventDefault()
    if (text.trim() === "") return

    fetch(`/api/boards/${boardId}/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
      },
      body: JSON.stringify({ task: { title: text } }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((created) => {
        setTasks([ ...tasks, created ])
        setText("")
      })
      .catch((err) => console.error(err))
  }

  if (loading) return <p>読み込み中...</p>

  return (
    <>
      <h1>タスク一覧</h1>

      <form onSubmit={addTask}>
        <select value={boardId} onChange={(e) => setBoardId(e.target.value)}>
          {boards.map((board) => (
            <option key={board.id} value={board.id}>{board.title}</option>
          ))}
        </select>

        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="タスクを入力" />
        <button type="submit">追加</button>
      </form>

      {tasks.map((task) => (
        <TaskItem key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} />
      ))}
    </>
  )
}

export default App