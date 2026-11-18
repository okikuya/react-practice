import { Routes, Route, Link } from "react-router-dom";
import BoardList from "./pages/BoardList";
import BoardTasks from "./pages/BoardTasks";

// ここに <BrowserRouter> は置かない。
// 本番は main.tsx で BrowserRouter、テストは MemoryRouter で包む。
// App が Router を抱え込むと、テストから行き先を指定できなくなる。
function App() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 text-slate-800">
      <Routes>
        <Route path="/" element={<BoardList />} />
        <Route path="/boards/:boardId" element={<BoardTasks />} />
        <Route
          path="*"
          element={
            <>
              <h1 className="mb-4 text-2xl font-bold">見つかりません</h1>
              <p>
                <Link className="text-sky-700 underline" to="/">
                  ← ボード一覧
                </Link>
              </p>
            </>
          }
        />
      </Routes>
    </div>
  );
}

export default App;
