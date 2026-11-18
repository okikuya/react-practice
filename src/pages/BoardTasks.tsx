import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import TaskItem from "../TaskItem";
import NewTaskForm from "../NewTaskForm";
import type { NewTask } from "../NewTaskForm";
import type { Task, Board } from "../types";
import { getJson, sendJson } from "../api";

// 「/boards/:boardId」の画面。そのボードのタスクだけを扱う。
function BoardTasks() {
  const { boardId } = useParams<{ boardId: string }>();
  const queryClient = useQueryClient();

  // staleTime は「何秒キャッシュを信じるか」。既定は 0（取った瞬間から古い扱い）。
  // 書き込み後は invalidateQueries が必ず取り直すので、この値が効くのは
  // 「別のタブから戻ってきたとき」だけ。だから基準は「誰が変えるか」。
  //
  //   実測 2026-11-17（window に visibilitychange を送って計測）
  //     staleTime 既定(0)  合図4回 → 4件 取り直し
  //     staleTime 30秒     合図4回 → 0件 ／ 約35秒後に1回 → 1件

  // queryKey に boardId を含める。これが「キャッシュの住所」なので、
  // ボードごとに別の棚になる。["tasks"] のままだと、別のボードへ移っても
  // 前のボードの結果が出てしまう。
  const {
    data: tasks = [],
    isPending: loading,
    isError: tasksFailed,
    failureCount: tasksRetries,
  } = useQuery({
    queryKey: ["tasks", boardId],
    queryFn: () => getJson<Task[]>(`/api/boards/${boardId}/tasks`),
    enabled: Boolean(boardId),
  });

  // ボード名を出すためだけに一覧を使う。staleTime 5分のキャッシュに
  // 乗るので、「/」から来たときは通信が起きない。
  const { data: boards = [] } = useQuery({
    queryKey: ["boards"],
    queryFn: () => getJson<Board[]>("/api/boards"),
    staleTime: 5 * 60_000,
  });
  const board = boards.find((b) => String(b.id) === boardId);

  // csrf トークンはセッション中ずっと同じ。取り直す理由が無い。
  // 画面をまたいでも TanStack Query のキャッシュが共有するので、
  // Context で配る必要が無い（それも検討したが、要らなかった）。
  const { data: csrf, error: csrfError } = useQuery({
    queryKey: ["csrf_token"],
    queryFn: () => getJson<{ token: string }>("/api/csrf_token"),
    staleTime: Infinity,
  });
  const csrfToken = csrf?.token ?? "";

  const [actionError, setActionError] = useState<string | null>(null);

  const invalidateTasks = () =>
    void queryClient.invalidateQueries({ queryKey: ["tasks", boardId] });

  // useMutation にすると、失敗したときの置き場所が onError に決まる。
  // 自分で書いた .catch は、書き忘れても何も言われない（2026-11-17 に
  // addTask だけ直して toggleTask と deleteTask を2か所残していた）。
  const addMutation = useMutation({
    mutationFn: (values: NewTask) =>
      sendJson("POST", `/api/boards/${boardId}/tasks`, csrfToken, {
        // 空文字は送らない。送ると description: "" が保存されて、
        // 「未入力」と「空文字を入れた」が区別できなくなる。
        task: {
          title: values.title,
          description: values.description || null,
          due_on: values.due_on || null,
        },
      }),
    onSuccess: () => {
      setActionError(null);
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

  // いま送信中のタスクはどれか。variables には最後に mutate へ渡した値が入る。
  const togglingId = toggleMutation.isPending
    ? toggleMutation.variables?.id
    : undefined;
  const deletingId = deleteMutation.isPending
    ? deleteMutation.variables
    : undefined;

  // 「一覧が空っぽに見える」状態は3つあり、言うべきことが違う。
  //   loading      まだ分からない
  //   tasksFailed  壊れている（0件ではない）
  //   0件          正常。ただし空
  const isEmpty = !loading && !tasksFailed && tasks.length === 0;

  // 送れない理由は2つあり、別物なので分けて渡す。
  //   トークン未着 / ボード未確定 → ずっと送れない
  //   送信中                      → 終われば送れる
  const notReady = !csrfToken || !boardId;

  return (
    <>
      <p className="mb-2 text-sm">
        <Link className="text-sky-700 underline" to="/">
          ← ボード一覧
        </Link>
      </p>

      <h1 className="mb-4 text-2xl font-bold">
        {board ? board.title : "タスク一覧"}
      </h1>

      {csrfError && (
        <p className="mb-3 rounded bg-red-50 px-3 py-2 text-red-700">
          送信の準備に失敗しました（{csrfError.message}）。再読み込みしてください。
        </p>
      )}
      {tasksFailed && (
        <p className="mb-3 rounded bg-red-50 px-3 py-2 text-red-700">
          一覧を取得できませんでした。
        </p>
      )}
      {actionError && (
        <p className="mb-3 rounded bg-red-50 px-3 py-2 text-red-700">{actionError}</p>
      )}

      <NewTaskForm
        onSubmit={(values) => addMutation.mutate(values)}
        disabled={notReady}
        pending={addMutation.isPending}
      />

      {/*
        既定では失敗しても3回まで自動で再試行する（待ちは 1→2→4 秒）。
        実測 2026-11-17: /api/tasks を 500 にすると
          176ms 試行1 ／ 1182ms 試行2 ／ 3190ms 試行3 ／ 7213ms 試行4 でエラー表示
        つまり「読み込み中…」のまま7.2秒放置されていた。
        failureCount を出せば、黙って待たせずに済む。
      */}
      {loading &&
        (tasksRetries > 0 ? (
          <p className="text-slate-500">
            つながりません。再試行中…（{tasksRetries}回目）
          </p>
        ) : (
          <p className="text-slate-500">読み込み中…</p>
        ))}

      {isEmpty && (
        <p className="text-slate-500">
          タスクはまだありません。上のフォームから追加できます。
        </p>
      )}

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

export default BoardTasks;
