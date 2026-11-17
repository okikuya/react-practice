import { describe, it, expect, afterEach, vi } from "vitest";
import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp } from "./test/renderApp";
import { installFakeApi, task } from "./test/fakeApi";

// このファイルに並んでいるのは、2026-11-17 に実際にブラウザを開いて
// 見つけた不具合と、その日に決めた表示の約束。
// それまでこのリポジトリはテストが0本で、tsc も lint も緑のままバグが在った。

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("一覧が空っぽに見える3つの状態", () => {
  it("0件のときは案内を出す", async () => {
    installFakeApi({ tasks: [] });
    renderApp();

    expect(
      await screen.findByText(/タスクはまだありません/),
    ).toBeInTheDocument();
  });

  it("取得に失敗したときは、0件ではなく失敗として伝える", async () => {
    installFakeApi({ failTasks: true });
    renderApp();

    expect(
      await screen.findByText(/一覧を取得できませんでした/),
    ).toBeInTheDocument();
    // 0件の案内を出してはいけない。壊れているのであって、空ではない。
    expect(screen.queryByText(/タスクはまだありません/)).not.toBeInTheDocument();
  });
});

describe("CSRFトークンが届くまで送信させない", () => {
  it("届くまで追加ボタンを押せない", async () => {
    const api = installFakeApi({ tasks: [], holdCsrf: true });
    renderApp();

    // 先に boards の到着を待つ。これを待たないと boardId が "" のままで、
    // ボタンは csrf とは無関係に「準備中…」になる。
    // 2026-11-17: 待たずに書いたせいで、csrf の判定を消してもテストが
    // 緑のままだった（別の理由で通っていた）。
    await screen.findByRole("option", { name: "テスト用ボード" });

    const button = screen.getByRole("button", { name: /準備中/ });
    expect(button).toBeDisabled();
    expect(api.countOf("POST", "/tasks")).toBe(0);

    api.releaseCsrf();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "追加" })).toBeEnabled(),
    );
  });

  it("追加に失敗したら画面に出す（console.error で握りつぶさない）", async () => {
    installFakeApi({ tasks: [], failPost: true });
    const user = userEvent.setup();
    renderApp();

    await screen.findByRole("button", { name: "追加" });
    await user.type(screen.getByPlaceholderText("タスクを入力"), "失敗する追加");
    await user.click(screen.getByRole("button", { name: "追加" }));

    expect(
      await screen.findByText(/追加できませんでした/),
    ).toBeInTheDocument();
  });
});

describe("押すと失敗するボタンを出さない", () => {
  it("他人のタスクはチェックも削除も押せない", async () => {
    installFakeApi({
      tasks: [
        task({ id: 1, title: "自分のタスク", editable: true }),
        task({ id: 2, title: "他人のタスク", editable: false }),
      ],
    });
    renderApp();

    await screen.findByText("他人のタスク");

    const checkboxes = screen.getAllByRole("checkbox");
    const deletes = screen.getAllByRole("button", { name: "削除" });

    expect(checkboxes[0]).toBeEnabled();
    expect(deletes[0]).toBeEnabled();
    expect(checkboxes[1]).toBeDisabled();
    expect(deletes[1]).toBeDisabled();
    expect(screen.getByText("（他の人のタスク）")).toBeInTheDocument();
  });

  it("送信中は同じタスクを押せない（連打しても1回しか送らない）", async () => {
    const api = installFakeApi({
      tasks: [task({ id: 1, title: "自分のタスク", editable: true })],
      holdPatch: true,
    });
    const user = userEvent.setup();
    renderApp();

    await screen.findByText("自分のタスク");
    const checkbox = screen.getByRole("checkbox");

    await user.click(checkbox);
    await waitFor(() => expect(checkbox).toBeDisabled());
    await user.click(checkbox);
    await user.click(checkbox);

    expect(api.countOf("PATCH", "/api/tasks/1")).toBe(1);

    api.releasePatch();
  });
});
