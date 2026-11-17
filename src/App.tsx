import { useState } from 'react';
import type { FormEvent } from 'react';
import TaskItem from "./TaskItem";
import type { Task, Board } from "./types";
import { getJson, sendJson } from "./api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";


function App() {
  const queryClient = useQueryClient();

  // staleTime は「何秒キャッシュを信じるか」。既定は 0（取った瞬間から古い扱い）。
  // 書き込み後は invalidateQueries が必ず取り直すので、この値が効くのは
  // 「別のタブから戻ってきたとき」だけ。だから基準は「誰が変えるか」。
  //
  //   実測 2026-11-17（window に visibilitychange を送って計測）
  //     staleTime 既定(0)  合図4回 → 4件 取り直し
  //     staleTime 30秒     合図4回 → 0件 ／ 約35秒後に1回 → 1件

  // tasks は他人も変える。戻ってきたら気づきたいので 0（既定）のまま。
  const {
    data: tasks = [],
    isPending: loading,
    isError: tasksFailed,
  } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => getJson<Task[]>("/api/tasks"),
  });

  // boards はめったに変わらない。
  const { data: boards = [] } = useQuery({
    queryKey: ["boards"],
    queryFn: () => getJson<Board[]>("/api/boards"),
    staleTime: 5 * 60_000,
  });

  // csrf トークンはセッション中ずっと同じ。取り直す理由が無い。
  const { data: csrf, error: csrfError } = useQuery({
    queryKey: ["csrf_token"],
    queryFn: () => getJson<{ token: string }>("/api/csrf_token"),
    staleTime: Infinity,
  });
  const csrfToken = csrf?.token ?? "";

  const [text, setText] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  // 「まだ選んでいない」だけを state に持ち、表示する値は毎回計算する。
  // 以前は useEffect の中で setBoardId(data[0].id) と“写して”いた。
  // useQuery の data は写せない（setBoards が無い）ので、写すのをやめた。
  // 第21章で /api/boards を「△ おまけがあるので切り出せない」とした
  // 理由が、これで消える。state が1つ減る。
  const [selectedBoardId, setSelectedBoardId] = useState("");
  const boardId = selectedBoardId || String(boards[0]?.id ?? "");

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
          送信の準備に失敗しました（{csrfError.message}）。再読み込みしてください。
        </p>
      )}
      {tasksFailed && (
        <p style={{ color: "crimson" }}>一覧を取得できませんでした。</p>
      )}
      {actionError && <p style={{ color: "crimson" }}>{actionError}</p>}

      <form onSubmit={addTask}>
        <select
          value={boardId}
          onChange={(e) => setSelectedBoardId(e.target.value)}
        >
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
