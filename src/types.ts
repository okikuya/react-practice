export type Task = {
  id: number
  title: string
  description: string | null
  due_on: string | null
  done: boolean
  // このログインユーザーが update / destroy できるか。
  // board_app は「全員が見られる・編集は所有者だけ」という設計なので、
  // 一覧には他人のタスクも載る。誰のものかを知らずにボタンを出すと、
  // 押したときに 404 が返る（2026-11-17 に実際に起きた）。
  // user_id をそのまま返すと誰のものかが全部漏れるので、真偽値だけ受け取る。
  editable: boolean
}

export type Board = {
  id: number
  title: string
}
