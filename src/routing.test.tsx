import { describe, it, expect, afterEach, vi } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp } from "./test/renderApp";
import { installFakeApi, task } from "./test/fakeApi";

// 2026-11-18 に React Router を入れた。画面が1つしか無かったので、
// それまでルーティングは要らなかった。
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("ルーティング", () => {
  it("「/」はボード一覧で、各ボードへのリンクが出る", async () => {
    installFakeApi({
      boards: [
        { id: 1, title: "マーケ" },
        { id: 2, title: "開発" },
      ],
    });
    renderApp("/");

    expect(await screen.findByRole("link", { name: "マーケ" })).toHaveAttribute(
      "href",
      "/boards/1",
    );
    expect(screen.getByRole("link", { name: "開発" })).toHaveAttribute(
      "href",
      "/boards/2",
    );
  });

  it("ボードを押すと、そのボードのタスクを取りに行く", async () => {
    const api = installFakeApi({
      boards: [
        { id: 1, title: "マーケ" },
        { id: 2, title: "開発" },
      ],
      tasks: [task({ id: 7, title: "開発のタスク" })],
    });
    const user = userEvent.setup();
    renderApp("/");

    await user.click(await screen.findByRole("link", { name: "開発" }));

    // 見出しがボード名に変わる
    expect(
      await screen.findByRole("heading", { name: "開発" }),
    ).toBeInTheDocument();

    // 全件ではなく、そのボードの口を叩いている
    expect(api.countOf("GET", "/api/boards/2/tasks")).toBe(1);
    expect(api.countOf("GET", "/api/tasks")).toBe(0);
  });

  it("ボードを戻ると一覧に帰れる", async () => {
    installFakeApi({ boards: [{ id: 1, title: "マーケ" }], tasks: [] });
    const user = userEvent.setup();
    renderApp("/boards/1");

    await user.click(await screen.findByRole("link", { name: "← ボード一覧" }));

    expect(
      await screen.findByRole("heading", { name: "ボード一覧" }),
    ).toBeInTheDocument();
  });

  it("知らないURLなら「見つかりません」を出す", async () => {
    installFakeApi();
    renderApp("/no/such/page");

    expect(
      await screen.findByRole("heading", { name: "見つかりません" }),
    ).toBeInTheDocument();
  });

  it("ボードが0件なら、その旨を出す", async () => {
    installFakeApi({ boards: [] });
    renderApp("/");

    expect(await screen.findByText(/ボードがありません/)).toBeInTheDocument();
  });
});
