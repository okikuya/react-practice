import type { Task } from './types'

type Props = {
  task: Task
  // このタスクへの送信が進行中。押せなくするために使う。
  busy: boolean
  onToggle: (id: number) => void
  onDelete: (id: number) => void
}

// memo で包んでいない。2026-11-18 に測ったうえで、要らないと判断した。
//
// 入力欄に1文字打つたびに、親（BoardTasks）と一緒にすべての TaskItem が
// 描き直される。タスク102件で実測:
//
//   memo なし   1打鍵あたり 206回の描き直し   平均 20.4ms（最大 33.6ms）
//   memo あり   1打鍵あたり   2回の描き直し   平均  9.2ms（最大 12.1ms）
//
// 60fps の1フレームは 16.7ms なので、102件では memo が要る水準。
// ただしこのアプリの実データは2件で、そこでは差が誤差に埋もれる。
//
// memo の代償は、渡す関数を useCallback で安定させる必要が出ること。
// 依存配列を間違えると古い値を掴む（2026-11-15 の stale closure と同じ事故）。
//
// 行数が増えたら入れる。そのときは上の数字を測り直してから決める。
function TaskItem({ task, busy, onToggle, onDelete }: Props) {
  // 押せない理由は2つある。別物なので分けて持つ。
  //   他人のタスク → ずっと押せない
  //   送信中       → 終われば押せる
  const disabled = !task.editable || busy

  return (
    <div className="flex items-center gap-2 border-b border-slate-200 py-2">
      <input
        type="checkbox"
        checked={task.done}
        disabled={disabled}
        className="size-4 disabled:opacity-40"
        onChange={() => onToggle(task.id)}
      />
      <span className={task.done ? "flex-1 text-slate-400 line-through" : "flex-1"}>
        {task.title}
      </span>
      <span className="text-xs text-slate-500">
        {task.done ? "完了" : "未完了"}
      </span>
      <button
        onClick={() => onDelete(task.id)}
        disabled={disabled}
        className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100 disabled:opacity-40"
      >
        削除
      </button>
      {!task.editable && (
        <span className="text-xs text-slate-400">（他の人のタスク）</span>
      )}
    </div>
  )
}

export default TaskItem
