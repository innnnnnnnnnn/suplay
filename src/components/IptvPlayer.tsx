import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import parser from "iptv-playlist-parser";
import { ListVideo, MonitorPlay, FolderOpen, Maximize2, Minimize2, ChevronLeft, Heart, Search, ChevronDown } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";

const isTauri = "__TAURI_INTERNALS__" in window;

// Dynamically import Tauri APIs only in Tauri environment
const openDialog = isTauri
  ? () => import("@tauri-apps/plugin-dialog").then(m => m.open)
  : null;
const readFile = isTauri
  ? () => import("@tauri-apps/plugin-fs").then(m => m.readTextFile)
  : null;

// CORS proxy for web mode
const CORS_PROXY = "https://corsproxy.io/?url=";

const IPTV_FREE_BASE = "https://live.iptv-free.com/iptv/categories";

interface IptvCategory {
  id: string;
  name: string;
  emoji: string;
}

// Hardcoded categories from iptv-free.com
const IPTV_CATEGORIES: IptvCategory[] = [
  { id: "General", name: "General", emoji: "🌐" },
  { id: "News", name: "News", emoji: "📰" },
  { id: "Movies", name: "Movies", emoji: "🎬" },
  { id: "Religious", name: "Religious", emoji: "🕍" },
  { id: "Music", name: "Music", emoji: "🎶" },
  { id: "Entertainment", name: "Entertainment", emoji: "📺" },
  { id: "Sports", name: "Sports", emoji: "🏀" },
  { id: "Kids", name: "Kids", emoji: "👶" },
  { id: "Series", name: "Series", emoji: "📺" },
  { id: "Legislative", name: "Legislative", emoji: "🏛️" },
  { id: "Culture", name: "Culture", emoji: "🎨" },
  { id: "Education", name: "Education", emoji: "🎓" },
  { id: "Documentary", name: "Documentary", emoji: "📽️" },
  { id: "Lifestyle", name: "Lifestyle", emoji: "👗" },
  { id: "Shop", name: "Shop", emoji: "🛍️" },
  { id: "Comedy", name: "Comedy", emoji: "😂" },
  { id: "Business", name: "Business", emoji: "📊" },
  { id: "Animation", name: "Animation", emoji: "🎬" },
  { id: "Family", name: "Family", emoji: "👨‍👩‍👧‍👦" },
  { id: "Classic", name: "Classic", emoji: "📻" },
  { id: "Travel", name: "Travel", emoji: "✈️" },
  { id: "Outdoor", name: "Outdoor", emoji: "🌲" },
  { id: "Cooking", name: "Cooking", emoji: "🍳" },
  { id: "Science", name: "Science", emoji: "🔬" },
  { id: "Auto", name: "Auto", emoji: "🚗" },
  { id: "Weather", name: "Weather", emoji: "🌤️" },
  { id: "Relax", name: "Relax", emoji: "🧘" },
];

interface IptvLanguage {
  code: string;
  name: string;
  emoji: string;
}

const IPTV_LANGUAGES: IptvLanguage[] = [
  { code: "zho", name: "中文", emoji: "🇨🇳" },
  { code: "jpn", name: "日本語", emoji: "🇯🇵" },
  { code: "kor", name: "한국어", emoji: "🇰🇷" },
  { code: "eng", name: "English", emoji: "🇬🇧" },
];

export default function IptvPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [playlist, setPlaylist] = useState<any>(null);
  const [currentChannel, setCurrentChannel] = useState<any>(null);
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // New states
  const [searchQuery, setSearchQuery] = useState("");
  const [favorites, setFavorites] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "fav">("all");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);

  useEffect(() => {
    const savedPlaylist = localStorage.getItem("iptv_playlist");
    const savedUrl = localStorage.getItem("iptv_playlist_url");
    const savedFavs = localStorage.getItem("iptv_favorites");
    if (savedPlaylist) {
      try {
        setPlaylist(JSON.parse(savedPlaylist));
        if (savedUrl) setPlaylistUrl(savedUrl);
      } catch (e) {
        console.error("Failed to parse saved playlist", e);
      }
    }
    if (savedFavs) {
      try {
        setFavorites(JSON.parse(savedFavs));
      } catch (e) {
        console.error("Failed to parse favorites", e);
      }
    }
  }, []);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const saveToStorage = (url: string, result: any) => {
    try {
      localStorage.setItem("iptv_playlist_url", url);
      localStorage.setItem("iptv_playlist", JSON.stringify(result));
    } catch (e) {
      console.warn("Playlist is too large to save in localStorage", e);
    }
  };

  const saveFavorites = (newFavs: any[]) => {
    setFavorites(newFavs);
    localStorage.setItem("iptv_favorites", JSON.stringify(newFavs));
  };

  const toggleFavorite = (e: React.MouseEvent, channel: any) => {
    e.stopPropagation();
    const isFav = favorites.some((f) => f.url === channel.url);
    if (isFav) {
      saveFavorites(favorites.filter((f) => f.url !== channel.url));
    } else {
      saveFavorites([...favorites, channel]);
    }
  };

  const loadLocalM3u = async () => {
    if (isTauri && openDialog && readFile) {
      try {
        const openFn = await openDialog();
        const selected = await openFn({
          multiple: false,
          filters: [{ name: 'M3U Playlist', extensions: ['m3u', 'm3u8'] }]
        });
        if (selected && typeof selected === 'string') {
          setLoading(true);
          const readFn = await readFile();
          const text = await readFn(selected);
          const result = parser.parse(text);
          setPlaylist(result);
          setPlaylistUrl(selected);
          saveToStorage(selected, result);
        }
      } catch (error) {
        console.error("Failed to load local playlist", error);
        alert("載入本地 M3U 檔案失敗！");
      } finally {
        setLoading(false);
      }
    } else {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.m3u,.m3u8';
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        setLoading(true);
        try {
          const text = await file.text();
          const result = parser.parse(text);
          setPlaylist(result);
          setPlaylistUrl(file.name);
          saveToStorage(file.name, result);
        } catch (err) {
          console.error("Failed to parse M3U file", err);
          alert("M3U 檔案解析失敗！");
        } finally {
          setLoading(false);
        }
      };
      input.click();
    }
  };

  const loadPlaylistUrl = async (url: string) => {
    if (!url) return;
    setPlaylistUrl(url);
    setLoading(true);
    try {
      let text: string;
      if (isTauri) {
        // Use Rust backend with 8.8.8.8 DNS to bypass CORS and DNS pollution
        text = await invoke<string>("fetch_m3u", { url });
      } else {
        const fetchUrl = `${CORS_PROXY}${encodeURIComponent(url)}`;
        const response = await fetch(fetchUrl);
        text = await response.text();
      }
      const result = parser.parse(text);
      setPlaylist(result);
      saveToStorage(url, result);
    } catch (error) {
      console.error("Failed to load playlist", error);
      alert("載入播放清單失敗，請確認網址或 CORS 設定。");
    } finally {
      setLoading(false);
    }
  };

  const loadCategory = (cat: IptvCategory) => {
    setCategoryOpen(false);
    loadPlaylistUrl(`${IPTV_FREE_BASE}/${cat.id.toLowerCase()}.m3u`);
  };

  const loadLanguage = (lang: IptvLanguage) => {
    setLanguageOpen(false);
    loadPlaylistUrl(`https://live.iptv-free.com/iptv/languages/${lang.code}.m3u`);
  };

  const playChannel = (channel: any) => {
    setCurrentChannel(channel);
    if (videoRef.current) {
      if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(channel.url);
        hls.attachMedia(videoRef.current);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          videoRef.current?.play();
          setIsPlaying(true);
        });
      } else if (videoRef.current.canPlayType("application/vnd.apple.mpegurl")) {
        videoRef.current.src = channel.url;
        videoRef.current.addEventListener("loadedmetadata", () => {
          videoRef.current?.play();
          setIsPlaying(true);
        });
      }
    }
  };

  const getFilteredItems = () => {
    let items = activeTab === "fav" ? favorites : playlist?.items || [];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter((item: any) => 
        (item.name && item.name.toLowerCase().includes(q)) || 
        (item.group.title && item.group.title.toLowerCase().includes(q))
      );
    }
    return items;
  };

  const displayItems = getFilteredItems();

  return (
    <div className="flex h-full text-foreground bg-background relative overflow-hidden">
      {sidebarCollapsed && (
        <div
          className="absolute left-0 top-0 bottom-0 w-3 z-50 group"
          onMouseEnter={() => setSidebarCollapsed(false)}
        />
      )}

      <div 
        className={`
          flex flex-col bg-gray-900/50 border-r border-gray-800 transition-all duration-300 ease-in-out shrink-0
          ${sidebarCollapsed ? "w-0 border-r-0 overflow-hidden" : "w-80"}
        `}
      >
        <div className="p-4 border-b border-gray-800 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <ListVideo size={20} className="text-primary" />
              IPTV 頻道列表
            </h2>
            <button
              onClick={() => setSidebarCollapsed(true)}
              className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
              title="隱藏頻道列表"
            >
              <ChevronLeft size={18} />
            </button>
          </div>


          {/* Category Quick-Select Panel */}
          <div className="relative">
            <button
              onClick={() => setCategoryOpen(o => !o)}
              className="w-full flex items-center justify-between bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded px-3 py-2 text-sm text-gray-300 transition-colors"
            >
              <span>📡 依分類快速載入</span>
              <ChevronDown size={16} className={`transition-transform ${categoryOpen ? "rotate-180" : ""}`} />
            </button>
            {categoryOpen && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-2 grid grid-cols-3 gap-1 max-h-60 overflow-y-auto">
                {IPTV_CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => loadCategory(cat)}
                    className="flex flex-col items-center justify-center p-2 rounded hover:bg-gray-700 transition-colors text-xs text-gray-300 hover:text-white gap-1"
                    title={cat.name}
                  >
                    <span className="text-lg">{cat.emoji}</span>
                    <span className="truncate w-full text-center">{cat.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Language Quick-Select Panel */}
          <div className="relative">
            <button
              onClick={() => setLanguageOpen(o => !o)}
              className="w-full flex items-center justify-between bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded px-3 py-2 text-sm text-gray-300 transition-colors"
            >
              <span>🌍 依語言快速載入</span>
              <ChevronDown size={16} className={`transition-transform ${languageOpen ? "rotate-180" : ""}`} />
            </button>
            {languageOpen && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-2 grid grid-cols-2 gap-1">
                {IPTV_LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => loadLanguage(lang)}
                    className="flex items-center justify-center gap-2 p-2.5 rounded hover:bg-gray-700 transition-colors text-sm text-gray-300 hover:text-white"
                  >
                    <span className="text-xl">{lang.emoji}</span>
                    <span>{lang.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="輸入 M3U 網址..."
              className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors"
              value={playlistUrl}
              onChange={(e) => setPlaylistUrl(e.target.value)}
            />
            <button
              onClick={loadLocalM3u}
              disabled={loading}
              className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white px-3 py-2 rounded flex items-center justify-center transition-colors disabled:opacity-50"
              title="開啟本地 M3U 檔案"
            >
              <FolderOpen size={18} />
            </button>
            <button
              onClick={() => loadPlaylistUrl(playlistUrl)}
              disabled={loading}
              className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded text-sm transition-colors disabled:opacity-50"
            >
              載入
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 text-gray-500" size={16} />
            <input
              type="text"
              placeholder="搜尋頻道名稱或分類..."
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 pl-9 text-sm focus:outline-none focus:border-primary transition-colors"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Tabs */}
          <div className="flex gap-2 bg-gray-800 p-1 rounded-md">
            <button
              className={`flex-1 py-1 text-sm rounded ${activeTab === "all" ? "bg-gray-700 text-white" : "text-gray-400 hover:text-gray-200"}`}
              onClick={() => setActiveTab("all")}
            >
              所有頻道
            </button>
            <button
              className={`flex-1 py-1 text-sm rounded ${activeTab === "fav" ? "bg-gray-700 text-white" : "text-gray-400 hover:text-gray-200"}`}
              onClick={() => setActiveTab("fav")}
            >
              最愛頻道
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {displayItems.map((item: any, idx: number) => {
            const isFav = favorites.some((f) => f.url === item.url);
            return (
              <div
                key={idx}
                onClick={() => playChannel(item)}
                className={`p-3 border-b border-gray-800/50 cursor-pointer hover:bg-gray-800 transition-colors flex items-center gap-3 ${
                  currentChannel?.url === item.url ? "bg-gray-800/80 border-l-2 border-l-primary" : ""
                }`}
              >
                {item.tvg.logo ? (
                  <img src={item.tvg.logo} alt={item.name} className="w-10 h-10 object-contain rounded bg-gray-900 p-1 shrink-0" />
                ) : (
                  <div className="w-10 h-10 bg-gray-800 rounded flex items-center justify-center shrink-0">
                    <MonitorPlay size={20} className="text-gray-500" />
                  </div>
                )}
                <div className="flex-1 overflow-hidden">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  <p className="truncate text-xs text-gray-500">{item.group.title || "未分類"}</p>
                </div>
                <button 
                  onClick={(e) => toggleFavorite(e, item)}
                  className={`p-1.5 rounded-full hover:bg-gray-700 transition-colors shrink-0 ${isFav ? "text-red-500" : "text-gray-600 hover:text-gray-400"}`}
                >
                  <Heart size={16} fill={isFav ? "currentColor" : "none"} />
                </button>
              </div>
            );
          })}
          {displayItems.length === 0 && !loading && (
            <div className="p-8 text-center text-gray-500 text-sm">
              {activeTab === "fav" 
                ? "尚無最愛頻道" 
                : searchQuery 
                  ? "找不到符合的頻道" 
                  : "請輸入 M3U 網址或選擇分類來載入頻道"}
            </div>
          )}
          {loading && (
            <div className="p-8 text-center text-gray-500 text-sm">
              載入中...
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-black">
        {currentChannel ? (
          <div ref={containerRef} className="relative flex-1 flex items-center justify-center group bg-black">
            <video
              ref={videoRef}
              className="w-full h-full object-contain"
              controls
              autoPlay
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
              <h3 className="text-lg font-bold text-white drop-shadow-md">{currentChannel.name}</h3>
              <button
                className="pointer-events-auto bg-black/50 hover:bg-black/80 text-white p-2 rounded-full transition-colors"
                onClick={toggleFullscreen}
                title={isFullscreen ? "退出全螢幕" : "全螢幕"}
              >
                {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-600">
            <MonitorPlay size={64} className="mb-4 opacity-50" />
            <p>從左側選擇頻道開始播放</p>
          </div>
        )}
      </div>
    </div>
  );
}
