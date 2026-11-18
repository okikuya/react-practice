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
      <h1>ボード一覧</h1>

      {loading && <p>読み込み中…</p>}
      {failed && (
        <p style={{ color: "crimson" }}>ボードを取得できませんでした。</p>
      )}
      {isEmpty && <p>ボードがありません。</p>}

      <ul>
        {boards.map((board) => (
          <li key={board.id}>
            {/* <a href> だとページ全体が作り直される。Link は履歴だけ書き換える。 */}
            <Link to={`/boards/${board.id}`}>{board.title}</Link>
          </li>
        ))}
      </ul>
    </>
  );
}

export default BoardList;
