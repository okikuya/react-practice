import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import TaskItem from "./TaskItem";
import type { Task, Board } from "./types";
import { getJson, sendJson } from "./api";
import { useFetch } from "./useFetch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";


function App() {
  const queryClient = useQueryClient();

  // queryKey はこのデータの名前（キャッシュの住所）。
  // invalidateQueries で同じ名前を指せば、取り直しは任せられる。
  const {
    data: tasks = [],
    isPending: loading,
    isError: tasksFailed,
  } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => getJson<Task[]>("/api/tasks"),
  });

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
  getJson<Board[]>("/api/boards")
    .then((data) => {
      setBoards(data);
      if (data.length > 0) setBoardId(String(data[0].id));
    })
    .catch((err) => console.error(err));
}, []);

  const invalidateTasks = () =>
    void queryClient.invalidateQueries({ queryKey: ["tasks"] });

  // useMutation にすると、失敗したときの置き場所が onError に決まる。
  // 自分で書いた .catch は、書き忘れても何も言われない（2026-11-17 に
  // addTask だけ直して toggleTask と deleteTask を2か所残していた）。
  const addMutation = useMutation({
    mutationFn: (title: string) =>
      sendJson("POST", `/api/boards/${boardId}/tasks`, csrfToken, {
        task: { title },
      }),
    onSuccess: () => {
      setActionError(null);
      setText("");
      invalidateTasks();
    },
    onError: (err) => setActionError(`追加できませんでした（${String(err)}）`),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, done }: { id: number; done: boolean }) =>
      sendJson("PATCH", `/api/tasks/${id}`, csrfToken, { task: { done } }),
    onSuccess: () => {
      setActionError(null);
      invalidateTasks();
    },
    onError: (err) => setActionError(`切り替えできませんでした（${String(err)}）`),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => sendJson("DELETE", `/api/tasks/${id}`, csrfToken),
    onSuccess: () => {
      setActionError(null);
      invalidateTasks();
    },
    onError: (err) => setActionError(`削除できませんでした（${String(err)}）`),
  });

  // 以前ここにあった TODO は解決した。
  // 「同じタスクを素早く2回押すと { done: true } が2回送られる」問題は、
  // 送信中そのタスクを押せなくすることで起きなくなる（直し方 A）。
  // isPending は useMutation が持っているので、自前で
  // const [sending, setSending] = useState(false) を書かなくていい。
  // 再現実験は残してある: node ~/study-log/js-practice/closure-practice.js
  const toggleTask = (id: number) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    toggleMutation.mutate({ id, done: !task.done });
  };

  const deleteTask = (id: number) => {
    deleteMutation.mutate(id);
  };

  const addTask = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (text.trim() === "") return;
    addMutation.mutate(text);
  };

  // いま送信中のタスクはどれか。variables には最後に mutate へ渡した値が入る。
  const togglingId = toggleMutation.isPending
    ? toggleMutation.variables?.id
    : undefined;
  const deletingId = deleteMutation.isPending
    ? deleteMutation.variables
    : undefined;

  if (loading) return <p>読み込み中...</p>;

  return (
    <>
      <h1>タスク一覧</h1>

      {csrfError && (
        <p style={{ color: "crimson" }}>
          送信の準備に失敗しました（{csrfError}）。再読み込みしてください。
        </p>
      )}
      {tasksFailed && (
        <p style={{ color: "crimson" }}>一覧を取得できませんでした。</p>
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
        <button
          type="submit"
          disabled={!csrfToken || addMutation.isPending}
        >
          {!csrfToken ? "準備中…" : addMutation.isPending ? "追加中…" : "追加"}
        </button>
      </form>

      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          busy={task.id === togglingId || task.id === deletingId}
          onToggle={toggleTask}
          onDelete={deleteTask}
        />
      ))}
    </>
  );
}

export default App;
