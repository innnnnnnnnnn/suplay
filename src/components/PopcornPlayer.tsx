import { useState, useRef, useEffect } from "react";
import { Download, Play, AlertCircle, Search } from "lucide-react";

interface PopcornPlayerProps {
  title?: string;
  year?: number;
}

export default function PopcornPlayer({ title, year }: PopcornPlayerProps) {
  const [torrentInfo, setTorrentInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [error, setError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const clientRef = useRef<any>(null);

  useEffect(() => {
    clientRef.current = new (window as any).WebTorrent();
    
    if (title) {
      autoFindSource(title, year);
    }

    return () => {
      clientRef.current?.destroy();
    };
  }, [title]);

  const autoFindSource = async (searchTitle: string, searchYear?: number) => {
    setLoading(true);
    setError("");
    
    // Step 1: Movieffm (Primary)
    setStatusText("優先向 Movieffm 發出無廣告串流解析請求...");

    try {
      // Simulate Movieffm Backend Scraper delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Mocking Movieffm failure for demonstration, triggering BT fallback
      // In production, this would be: const source = await invoke("extract_movieffm", { title: searchTitle });
      const movieffmSuccess = false; 

      if (movieffmSuccess) {
        setStatusText("成功從 Movieffm 擷取無廣告高畫質直連，準備播放...");
        // loadVideoUrl(source); return;
      } else {
        setStatusText("Movieffm 無可用片源，自動切換至 P2P (BT/Magnet) 備用引擎...");
        await new Promise((resolve) => setTimeout(resolve, 1000));
        
        // Step 2: YTS BT Fallback
        const response = await fetch(`https://yts.mx/api/v2/list_movies.json?query_term=${encodeURIComponent(searchTitle)}`);
        const data = await response.json();

        let movie = null;
        if (data?.data?.movies?.length > 0) {
          movie = searchYear 
            ? data.data.movies.find((m: any) => m.year === searchYear) || data.data.movies[0]
            : data.data.movies[0];
        }

        if (movie && movie.torrents && movie.torrents.length > 0) {
          const bestTorrent = movie.torrents.find((t: any) => t.quality === "1080p") || movie.torrents[0];
          setStatusText(`已連接 P2P 節點: ${movie.title} (${bestTorrent.quality}) - 準備載入串流...`);
          
          const trackers = [
            "udp://open.demonii.com:1337/announce",
            "udp://tracker.openbittorrent.com:80",
            "udp://tracker.coppersurfer.tk:6969",
            "udp://glotorrents.pw:6969/announce"
          ];
          const magnetUri = `magnet:?xt=urn:btih:${bestTorrent.hash}&dn=${encodeURIComponent(movie.title)}&tr=${trackers.join("&tr=")}`;
          
          loadTorrent(magnetUri);
        } else {
          setError("抱歉，Movieffm 與 P2P 引擎目前皆無可用的片源。請稍後再試。");
          setLoading(false);
        }
      }
    } catch (err) {
      console.error(err);
      setError("搜尋片源時發生網路錯誤。");
      setLoading(false);
    }
  };

  const loadTorrent = (magnetUri: string) => {
    if (!clientRef.current) return;
    setStatusText("正在連線至節點 (Peers)... 這可能需要幾分鐘。");

    clientRef.current.torrents.forEach((t: any) => t.destroy());

    clientRef.current.add(magnetUri, (torrent: any) => {
      setLoading(false);
      
      const file = torrent.files.reduce((a: any, b: any) => (a.length > b.length ? a : b));
      
      setTorrentInfo({
        name: torrent.name,
        length: file.length,
        downloaded: 0,
        downloadSpeed: 0,
        progress: 0,
      });

      torrent.on("download", () => {
        setTorrentInfo((prev: any) => ({
          ...prev,
          downloaded: torrent.downloaded,
          downloadSpeed: torrent.downloadSpeed,
          progress: torrent.progress,
        }));
      });

      if (videoRef.current) {
        file.renderTo(videoRef.current);
      }
    }).on("error", (err: any) => {
      setLoading(false);
      setError("無法解析 Magnet 連結或連線失敗。請確認連結格式。");
      console.error(err);
    });
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="flex flex-col h-full bg-black text-foreground">
      <div className="flex-1 relative flex flex-col">
        {!torrentInfo && !loading && !error && (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-600">
            <Play size={64} className="mb-4 opacity-50" />
            <p>準備播放</p>
          </div>
        )}
        
        {loading && (
          <div className="flex-1 flex flex-col items-center justify-center text-primary">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-6 shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
            <p className="text-lg font-medium animate-pulse">{statusText}</p>
          </div>
        )}

        {error && (
          <div className="flex-1 flex flex-col items-center justify-center text-red-500">
            <AlertCircle size={48} className="mb-4 opacity-80" />
            <p className="text-lg">{error}</p>
          </div>
        )}

        <video
          ref={videoRef}
          className={`w-full flex-1 object-contain ${!torrentInfo ? "hidden" : ""}`}
          controls
          autoPlay
        />

        {torrentInfo && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-gray-900/80 backdrop-blur rounded-full px-6 py-2 flex items-center gap-6 text-sm border border-gray-800 shadow-2xl z-40 transition-opacity hover:opacity-100 opacity-20">
            <div className="flex flex-col text-center">
              <span className="text-gray-400 text-xs uppercase tracking-wider mb-1">下載進度</span>
              <div className="flex items-center gap-3 font-mono">
                <span className="text-white">{(torrentInfo.progress * 100).toFixed(1)}%</span>
                <span className="text-primary">{formatBytes(torrentInfo.downloadSpeed)}/s</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
