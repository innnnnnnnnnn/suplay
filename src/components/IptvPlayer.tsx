import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import parser from "iptv-playlist-parser";
import { ListVideo, MonitorPlay, FolderOpen, Maximize2, Minimize2, ChevronLeft } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { readTextFile } from "@tauri-apps/plugin-fs";

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

  useEffect(() => {
    const savedPlaylist = localStorage.getItem("iptv_playlist");
    const savedUrl = localStorage.getItem("iptv_playlist_url");
    if (savedPlaylist) {
      try {
        setPlaylist(JSON.parse(savedPlaylist));
        if (savedUrl) setPlaylistUrl(savedUrl);
      } catch (e) {
        console.error("Failed to parse saved playlist", e);
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

  const loadLocalM3u = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{
          name: 'M3U Playlist',
          extensions: ['m3u', 'm3u8']
        }]
      });
      
      if (selected && typeof selected === 'string') {
        setLoading(true);
        const text = await readTextFile(selected);
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
  };

  const loadPlaylist = async () => {
    if (!playlistUrl) return;
    setLoading(true);
    try {
      const response = await fetch(playlistUrl);
      const text = await response.text();
      const result = parser.parse(text);
      setPlaylist(result);
      saveToStorage(playlistUrl, result);
    } catch (error) {
      console.error("Failed to load playlist", error);
      alert("載入播放清單失敗，請確認網址或 CORS 設定。");
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="flex h-full text-foreground bg-background relative overflow-hidden">
      {/* Hover trigger zone */}
      {sidebarCollapsed && (
        <div
          className="absolute left-0 top-0 bottom-0 w-3 z-50 group"
          onMouseEnter={() => setSidebarCollapsed(false)}
        />
      )}

      {/* Sidebar for Channels */}
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
              onClick={loadPlaylist}
              disabled={loading}
              className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded text-sm transition-colors disabled:opacity-50"
            >
              載入
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {playlist?.items?.map((item: any, idx: number) => (
            <div
              key={idx}
              onClick={() => playChannel(item)}
              className={`p-3 border-b border-gray-800/50 cursor-pointer hover:bg-gray-800 transition-colors flex items-center gap-3 ${
                currentChannel?.url === item.url ? "bg-gray-800/80 border-l-2 border-l-primary" : ""
              }`}
            >
              {item.tvg.logo ? (
                <img src={item.tvg.logo} alt={item.name} className="w-10 h-10 object-contain rounded bg-gray-900 p-1" />
              ) : (
                <div className="w-10 h-10 bg-gray-800 rounded flex items-center justify-center">
                  <MonitorPlay size={20} className="text-gray-500" />
                </div>
              )}
              <div className="overflow-hidden">
                <p className="truncate text-sm font-medium">{item.name}</p>
                <p className="truncate text-xs text-gray-500">{item.group.title || "未分類"}</p>
              </div>
            </div>
          ))}
          {!playlist && !loading && (
            <div className="p-8 text-center text-gray-500 text-sm">
              請輸入 M3U 網址並點擊載入
              <br />
              (例如：https://iptv-org.github.io/iptv/index.m3u)
            </div>
          )}
          {loading && (
            <div className="p-8 text-center text-gray-500 text-sm">
              載入中...
            </div>
          )}
        </div>
      </div>

      {/* Main Video Area */}
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
            {/* Overlay: title + fullscreen button */}
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


