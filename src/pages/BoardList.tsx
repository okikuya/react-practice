import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getJson } from "../api";
import type { Board } from "../types";

// 「/」の画面。ボードを選ぶだけ。
function BoardList() {
  // boards はめったに変わらない。
  const {
    data: boards = [],
    isPending: loading,
    isError: failed,
  } = useQuery({
    queryKey: ["boards"],
    queryFn: () => getJson<Board[]>("/api/boards"),
    staleTime: 5 * 60_000,
  });

  const isEmpty = !loading && !failed && boards.length === 0;

  return (
    <>
      <h1 className="mb-4 text-2xl font-bold">ボード一覧</h1>

      {loading && <p className="text-slate-500">読み込み中…</p>}
      {failed && (
        <p className="text-red-700">ボードを取得できませんでした。</p>
      )}
      {isEmpty && <p className="text-slate-500">ボードがありません。</p>}

      <ul className="divide-y divide-slate-200 border-y border-slate-200">
        {boards.map((board) => (
          <li key={board.id} className="py-2">
            {/* <a href> だとページ全体が作り直される。Link は履歴だけ書き換える。 */}
            <Link
              className="text-sky-700 underline underline-offset-2 hover:text-sky-900"
              to={`/boards/${board.id}`}
            >
              {board.title}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

export default BoardList;
