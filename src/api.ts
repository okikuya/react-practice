export async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

// 書き込み（POST / PATCH / DELETE）。
//
// 戻り値が void なのは、呼び出し側が invalidateQueries で一覧ごと
// 取り直すから。サーバーが返した1件を解析しても使い道がない。
//
// CSRF トークンを引数で受け取るのは、ここが React の外（ただの関数）で、
// hook を呼べないため。csrfToken は App が持っている。
export async function sendJson(
  method: "POST" | "PATCH" | "DELETE",
  url: string,
  csrfToken: string,
  body?: unknown,
): Promise<void> {
  const res = await fetch(url, {
    method,
    headers: {
      // body が無いときに Content-Type を付けない。
      // DELETE に付けると「JSON を送る」と言いながら何も送らないことになる。
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      "X-CSRF-Token": csrfToken,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  // throw しておくと useMutation の onError が拾う。
  // catch の書き忘れが起きるのは、投げる場所と拾う場所が離れているため。
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}
