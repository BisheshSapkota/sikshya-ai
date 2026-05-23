import { useState } from "react";
import { PanelLeftClose, SquarePen } from "lucide-react";
import AiTutor from "./components/AiTutor";
import Dashboard from "./components/Dashboard";
import type { ExamLevelId } from "./types/cdcGrid";

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [gridLevel, setGridLevel] = useState<ExamLevelId>("SEE");
  const [chatKey, setChatKey] = useState(0);

  const newChat = () => {
    setChatKey((k) => k + 1);
    setSidebarOpen(false);
  };

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-[#f4f4f5] text-slate-900 antialiased">
      {/* Sidebar — CDC reference only */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-200 bg-white shadow-xl transition-transform duration-200 lg:static lg:translate-x-0 lg:shadow-none ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-3 py-3">
          <span className="text-sm font-semibold">Sikshya AI</span>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden"
            aria-label="Close sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={newChat}
          className="mx-3 mt-3 flex items-center justify-center gap-2 rounded-lg border border-slate-200 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          <SquarePen className="h-3.5 w-3.5" />
          New chat
        </button>
        <div className="mt-2 min-h-0 flex-1">
          <Dashboard level={gridLevel} onLevelChange={setGridLevel} />
        </div>
      </aside>

      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          aria-label="Close overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main chat — default view */}
      <main className="flex min-w-0 flex-1 flex-col">
        <AiTutor
          key={chatKey}
          onMenuClick={() => setSidebarOpen(true)}
          onNewChat={newChat}
        />
      </main>
    </div>
  );
}
