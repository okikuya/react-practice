import { vi } from "vitest";
import type { Task, Board } from "../types";

// 本物の Rails を立てずに /api/* の返事を差し替えるための道具。
//
// MSW のような本格的なものは入れていない。このアプリが叩く口は4本しかなく、
// 「何を返すか」より「いつ返すか」を操りたいため（CSRF未着・送信中の連打）。
// 口が増えたら MSW に移す。

export type Pending = { resolve: () => void };

type Options = {
  tasks?: Task[];
  boards?: Board[];
  // 500 を返したいエンドポイント
  failTasks?: boolean;
  failPost?: boolean;
  // 返事を保留して、テスト側から好きなときに返す
  holdCsrf?: boolean;
  holdPatch?: boolean;
};

export type FakeApi = {
  calls: { method: string; url: string; body?: unknown }[];
  countOf: (method: string, pattern: string) => number;
  releaseCsrf: () => void;
  releasePatch: () => void;
};

export function installFakeApi(options: Options = {}): FakeApi {
  const {
    tasks = [],
    boards = [{ id: 1, title: "テスト用ボード" }],
    failTasks = false,
    failPost = false,
    holdCsrf = false,
    holdPatch = false,
  } = options;

  const calls: FakeApi["calls"] = [];
  let releaseCsrf = () => {};
  let releasePatch = () => {};

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      calls.push({ method, url, body: init?.body });

      if (url.endsWith("/api/csrf_token")) {
        if (holdCsrf) {
          await new Promise<void>((r) => {
            releaseCsrf = r;
          });
        }
        return json({ token: "テスト用トークン" });
      }

      if (url.endsWith("/api/boards")) return json(boards);

      if (url.endsWith("/api/tasks") && method === "GET") {
        return failTasks ? new Response("", { status: 500 }) : json(tasks);
      }

      if (method === "POST") {
        return failPost
          ? new Response("", { status: 422 })
          : json({ id: 99, title: "新しいタスク", done: false, editable: true }, 201);
      }

      if (method === "PATCH") {
        if (holdPatch) {
          await new Promise<void>((r) => {
            releasePatch = r;
          });
        }
        return json({ ok: true });
      }

      if (method === "DELETE") return new Response("", { status: 204 });

      throw new Error(`fakeApi が知らない口: ${method} ${url}`);
    }),
  );

  return {
    calls,
    countOf: (method, pattern) =>
      calls.filter((c) => c.method === method && c.url.includes(pattern)).length,
    releaseCsrf: () => releaseCsrf(),
    releasePatch: () => releasePatch(),
  };
}

export function task(over: Partial<Task> = {}): Task {
  return {
    id: 1,
    title: "テストタスク",
    description: null,
    due_on: null,
    done: false,
    editable: true,
    ...over,
  };
}
