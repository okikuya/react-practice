// 【このファイルはもう使っていない】2026-11-17 に TanStack Query へ移行した。
// 消さずに置いてあるのは、README の「2. カスタムHook に切り出せるものと、
// 切り出せないもの」がこのコードを指しているため。学習の記録として残す。
//
// 分かったこと: data しか返していないので、取ってきた後に書き換えるもの
// （/api/tasks）は切り出せなかった。setData も返せば切り出せるが、そこから
// キャッシュ・再取得・画面間の共有と増え続ける。それを引き受けるのが
// TanStack Query だった。
//
// いま同じことをするなら:
//   useQuery({ queryKey: ["csrf_token"], queryFn: () => getJson(...) })

import { useState, useEffect } from "react";
import { getJson } from "./api";

// カスタムHook。特別な仕組みではなく「ただの関数」。
// 名前が use で始まり、中で useState や useEffect を呼ぶ、それだけ。
//
// この関数がやっているのは、App.tsx に3回書いてあったことと同じ。
//   URL を叩く → 結果を state に入れる → 失敗したら控えておく
//
// <T> は「取ってくるものの型を、呼ぶ側が決める」という印。
//   useFetch<Task[]>("/api/tasks")  → data の型は Task[] | null
//   useFetch<Board[]>("/api/boards") → data の型は Board[] | null
export function useFetch<T>(url: string) {
  // まだ取れていないので null から始める。だから型は T | null。
  const [data, setData] = useState<T | null>(null);

  // 最初は読み込み中。
  const [loading, setLoading] = useState(true);

  // 失敗していないので null から始める。
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // url が変わったときのために、毎回ここから読み込み中に戻す。
    setLoading(true);

    getJson<T>(url)
      .then((取れたもの) => {
        setData(取れたもの);
        setError(null);
      })
      .catch((err) => {
        // console.error だけだと画面に何も出ない。state に入れておけば表示できる。
        setError(String(err));
      })
      .finally(() => {
        // 成功でも失敗でも、読み込みは終わっている。
        // then と catch の両方に書くより、finally に1回書くほうが漏れない。
        setLoading(false);
      });
  }, [url]); // url が変わったら取り直す。[] だと最初の1回だけ。

  return { data, loading, error };
}
