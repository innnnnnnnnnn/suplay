import { useState } from "react";
import { Tv, Film, Clapperboard, HardDrive, ChevronLeft } from "lucide-react";
import IptvPlayer from "./components/IptvPlayer";
import NetflixUI from "./components/NetflixUI";
import NasBrowser from "./components/NasBrowser";

function App() {
  const [activeTab, setActiveTab] = useState("movie");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const tabs = [
    { id: "tv", name: "電視頻道", icon: Tv },
    { id: "movie", name: "熱門電影", icon: Film },
    { id: "show", name: "電視影集", icon: Clapperboard },
    { id: "nas", name: "本地 NAS", icon: HardDrive },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground font-sans">
      
      {/* Hover trigger zone — invisible strip on the far left when sidebar is collapsed */}
      {sidebarCollapsed && (
        <div
          className="absolute left-0 top-0 bottom-0 w-3 z-50 group"
          onMouseEnter={() => setSidebarCollapsed(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <nav
        className={`
          relative flex flex-col items-center py-8 border-r border-gray-800 bg-gray-950 gap-10
          transition-all duration-300 ease-in-out overflow-hidden shrink-0
          ${sidebarCollapsed ? "w-0 border-r-0 py-0 gap-0" : "w-20"}
        `}
        onMouseLeave={() => {/* keep open until user clicks collapse */}}
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

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative bg-[#0a0a0a]">
        {activeTab === "tv" && <IptvPlayer />}
        {activeTab === "movie" && <NetflixUI type="movie" />}
        {activeTab === "show" && <NetflixUI type="show" />}
        {activeTab === "nas" && <NasBrowser />}
      </main>
    </div>
  );
}

export default App;

