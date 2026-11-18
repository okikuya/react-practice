import { describe, it, expect, afterEach, vi } from "vitest";
import { cleanup, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp } from "./test/renderApp";
import { installFakeApi } from "./test/fakeApi";

// 2026-11-18、Phase 2-4。それまでフォームはテキスト入力1つで、
// 「空なら送らない」を if 文1行で書いていた。
// react-hook-form + zod にして、ルールを1か所（newTaskSchema）に集めた。
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

// 送れる状態（csrf 到着済み・ボード確定）になるまで待つ
async function readyForm() {
  await screen.findByRole("heading", { name: "テスト用ボード" });
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "追加" })).toBeEnabled(),
  );
}

const dayBefore = (days: number) =>
  new Date(Date.now() - days * 86_400_000).toLocaleDateString("sv-SE");

describe("新規タスクのバリデーション", () => {
  it("タイトルが空なら、エラーを出して送らない", async () => {
    const api = installFakeApi({ tasks: [] });
    const user = userEvent.setup();
    renderApp();
    await readyForm();

    await user.click(screen.getByRole("button", { name: "追加" }));

    expect(
      await screen.findByText("タイトルを入力してください"),
    ).toBeInTheDocument();
    expect(api.countOf("POST", "/tasks")).toBe(0);
  });

  it("空白だけでも送らない（trim している）", async () => {
    const api = installFakeApi({ tasks: [] });
    const user = userEvent.setup();
    renderApp();
    await readyForm();

    await user.type(screen.getByLabelText("タイトル"), "   ");
    await user.click(screen.getByRole("button", { name: "追加" }));

    expect(
      await screen.findByText("タイトルを入力してください"),
    ).toBeInTheDocument();
    expect(api.countOf("POST", "/tasks")).toBe(0);
  });

  it("タイトルが51文字なら、エラーを出して送らない", async () => {
    const api = installFakeApi({ tasks: [] });
    const user = userEvent.setup();
    renderApp();
    await readyForm();

    await user.type(screen.getByLabelText("タイトル"), "あ".repeat(51));
    await user.click(screen.getByRole("button", { name: "追加" }));

    expect(
      await screen.findByText("タイトルは50文字以内で入力してください"),
    ).toBeInTheDocument();
    expect(api.countOf("POST", "/tasks")).toBe(0);
  });

  // これが zod を使う理由。HTML の required / maxlength では書けない。
  it("期限が昨日なら、エラーを出して送らない", async () => {
    const api = installFakeApi({ tasks: [] });
    const user = userEvent.setup();
    renderApp();
    await readyForm();

    await user.type(screen.getByLabelText("タイトル"), "過去の期限");
    fireEvent.change(screen.getByLabelText("期限（任意）"), {
      target: { value: dayBefore(1) },
    });
    await user.click(screen.getByRole("button", { name: "追加" }));

    expect(
      await screen.findByText("今日より前の日付は選べません"),
    ).toBeInTheDocument();
    expect(api.countOf("POST", "/tasks")).toBe(0);
  });

  it("一度出たエラーは、直したら消える", async () => {
    installFakeApi({ tasks: [] });
    const user = userEvent.setup();
    renderApp();
    await readyForm();

    await user.click(screen.getByRole("button", { name: "追加" }));
    expect(
      await screen.findByText("タイトルを入力してください"),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText("タイトル"), "直した");

    await waitFor(() =>
      expect(
        screen.queryByText("タイトルを入力してください"),
      ).not.toBeInTheDocument(),
    );
  });

  it("正しく入れると、3項目を送る", async () => {
    const api = installFakeApi({ tasks: [] });
    const user = userEvent.setup();
    renderApp();
    await readyForm();

    await user.type(screen.getByLabelText("タイトル"), "買い物");
    await user.type(screen.getByLabelText("説明（任意）"), "牛乳とパン");
    await user.click(screen.getByRole("button", { name: "追加" }));

    await waitFor(() => expect(api.countOf("POST", "/tasks")).toBe(1));

    const post = api.calls.find((c) => c.method === "POST");
    expect(JSON.parse(String(post?.body))).toEqual({
      task: { title: "買い物", description: "牛乳とパン", due_on: null },
    });
  });

  it("空欄は null で送る（空文字では送らない）", async () => {
    const api = installFakeApi({ tasks: [] });
    const user = userEvent.setup();
    renderApp();
    await readyForm();

    await user.type(screen.getByLabelText("タイトル"), "説明なし");
    await user.click(screen.getByRole("button", { name: "追加" }));

    await waitFor(() => expect(api.countOf("POST", "/tasks")).toBe(1));

    const post = api.calls.find((c) => c.method === "POST");
    const sent = JSON.parse(String(post?.body)).task;
    expect(sent.description).toBeNull();
    expect(sent.due_on).toBeNull();
  });
});
