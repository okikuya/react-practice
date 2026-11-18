import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import App from "../App";

// 行き先を指定して描く。App に <BrowserRouter> を置いていないのは、
// ここで MemoryRouter に差し替えたいから（本番は main.tsx が包む）。
export function renderApp(path = "/boards/1") {
  // retry を false にする。既定の「1回＋再試行3回、待ち 1→2→4 秒」のままだと、
  // 失敗を確かめるテストが7秒待つことになる（2026-11-17 に実測した値）。
  // ここは本番の挙動ではなくテストの都合なので、テスト側で上書きする。
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
