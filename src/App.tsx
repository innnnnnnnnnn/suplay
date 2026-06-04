import { useState } from "react";
import { Tv, Film, Clapperboard, HardDrive, ChevronLeft } from "lucide-react";
import IptvPlayer from "./components/IptvPlayer";
import NetflixUI from "./components/NetflixUI";
import NasBrowser from "./components/NasBrowser";

const isTauri = "__TAURI_INTERNALS__" in window;

function App() {
  const [activeTab, setActiveTab] = useState("movie");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const tabs = [
    { id: "tv", name: "電視頻道", icon: Tv },
    { id: "movie", name: "熱門電影", icon: Film },
    { id: "show", name: "電視影集", icon: Clapperboard },
    // NAS tab only shown in Tauri (desktop) mode
    ...(isTauri ? [{ id: "nas", name: "本地 NAS", icon: HardDrive }] : []),
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground font-sans">

      {/* ── Desktop Sidebar hover trigger when collapsed ── */}
      {sidebarCollapsed && (
        <div
          className="absolute left-0 top-0 bottom-0 w-3 z-50 hidden md:block"
          onMouseEnter={() => setSidebarCollapsed(false)}
        />
      )}

      {/* ── Desktop Sidebar (hidden on mobile via md:flex) ── */}
      <nav
        className={`
          relative hidden md:flex flex-col items-center py-8 border-r border-gray-800 bg-gray-950 gap-10
          transition-all duration-300 ease-in-out overflow-hidden shrink-0
          ${sidebarCollapsed ? "w-0 border-r-0 py-0 gap-0" : "w-20"}
        `}
      >
        {/* Logo */}
        <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center text-primary font-black text-2xl cursor-pointer shrink-0">
          S
        </div>

        {/* Nav Items */}
        <div className="flex flex-col gap-6 w-full flex-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative group flex flex-col items-center justify-center w-full py-2 transition-colors ${
                  isActive ? "text-primary" : "text-gray-500 hover:text-gray-300"
                }`}
                title={tab.name}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-12 bg-primary rounded-r-full" />
                )}
                <Icon size={26} className="mb-1 shrink-0" />
                <span className="text-[10px] font-medium tracking-wider uppercase whitespace-nowrap">{tab.id}</span>
              </button>
            );
          })}
        </div>

        {/* Collapse Button */}
        <button
          onClick={() => setSidebarCollapsed(true)}
          className="w-10 h-10 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-all duration-200 shrink-0"
          title="隱藏選單"
        >
          <ChevronLeft size={20} />
        </button>
      </nav>

      {/* ── Main Content Area ── */}
      <main className="flex-1 overflow-hidden relative bg-[#0a0a0a] pb-16 md:pb-0">
        {activeTab === "tv" && <IptvPlayer />}
        {activeTab === "movie" && <NetflixUI type="movie" />}
        {activeTab === "show" && <NetflixUI type="show" />}
        {activeTab === "nas" && <NasBrowser />}
      </main>

      {/* ── Mobile Bottom Tab Bar (shown only on small screens) ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-gray-950/95 backdrop-blur-md border-t border-gray-800 flex items-stretch">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors ${
                isActive ? "text-primary" : "text-gray-500"
              }`}
            >
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
              )}
              <Icon size={22} />
              <span className="text-[10px] font-medium">{tab.name}</span>
            </button>
          );
        })}
      </nav>

    </div>
  );
}

export default App;
