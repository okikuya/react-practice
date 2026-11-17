import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import TaskItem from "./TaskItem";
import type { Task, Board } from "./types";
import { getJson } from "./api";
import { useFetch } from "./useFetch";


function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const {
    data: csrf,
    error: csrfError,
  } = useFetch<{ token: string }>("/api/csrf_token");
  const csrfToken = csrf?.token ?? "";
  const [boards, setBoards] = useState<Board[]>([]);
  const [boardId, setBoardId] = useState("");

  useEffect(() => {
  getJson<Task[]>("/api/tasks")
    .then((data) => {
      setTasks(data);
      setLoading(false);
    })
    .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
  getJson<Board[]>("/api/boards")
    .then((data) => {
      setBoards(data);
      if (data.length > 0) setBoardId(String(data[0].id));
    })
    .catch((err) => console.error(err));
}, []);

  // TODO(next): 同じタスクを素早く2回押すと、2回とも { done: true } が送られる。
  // 送る値を「抱え込んだ古い tasks」から決めているため。setTasks を prev に
  // しても直らない（直るのは画面の書き換えだけで、送る値は押した瞬間に決まる）。
  // 直し方は3つ。A 送信中は押せなくする（2-5 の題材）/ B API をトグルにする
  // （PATCH /tasks/:id/toggle。meal-requests の accept・complete と同じ形）/
  // C 楽観的更新にして失敗時に巻き戻す。
  // 再現: node ~/study-log/js-practice/closure-practice.js
  const toggleTask = (id: number) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
      },
      body: JSON.stringify({ task: { done: !task.done } }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((updated) => {
        setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
      })
      .catch((err) => console.error(err));
  };

  const deleteTask = (id: number) => {
    fetch(`/api/tasks/${id}`, {
      method: "DELETE",
      headers: { "X-CSRF-Token": csrfToken },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setTasks((prev) => prev.filter((t) => t.id !== id));
      })
      .catch((err) => console.error(err));
  };

  const addTask = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (text.trim() === "") return;

    fetch(`/api/boards/${boardId}/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
      },
      body: JSON.stringify({ task: { title: text } }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((created) => {
        setActionError(null);
        setTasks((prev) => [...prev, created]);
        setText("");
      })
      .catch((err) => setActionError(`追加できませんでした（${String(err)}）`));
  };

  if (loading) return <p>読み込み中...</p>;

  return (
    <>
      <h1>タスク一覧</h1>

      {csrfError && (
        <p style={{ color: "crimson" }}>
          送信の準備に失敗しました（{csrfError}）。再読み込みしてください。
        </p>
      )}
      {actionError && <p style={{ color: "crimson" }}>{actionError}</p>}

      <form onSubmit={addTask}>
        <select value={boardId} onChange={(e) => setBoardId(e.target.value)}>
          {boards.map((board) => (
            <option key={board.id} value={board.id}>
              {board.title}
            </option>
          ))}
        </select>

        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="タスクを入力"
        />
        <button type="submit" disabled={!csrfToken}>
          {csrfToken ? "追加" : "準備中…"}
        </button>
      </form>

      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          onToggle={toggleTask}
          onDelete={deleteTask}
        />
      ))}
    </>
  );
}

export default App;
