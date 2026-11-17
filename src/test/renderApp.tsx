import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "../App";

export function renderApp() {
  // retry を false にする。既定の「1回＋再試行3回、待ち 1→2→4 秒」のままだと、
  // 失敗を確かめるテストが7秒待つことになる（2026-11-17 に実測した値）。
  // ここは本番の挙動ではなくテストの都合なので、テスト側で上書きする。
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  );
}
