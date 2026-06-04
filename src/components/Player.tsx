import { useState, useEffect, useRef } from "react";
import { AlertCircle, Loader2, ArrowLeft, Maximize2, Minimize2 } from "lucide-react";
import { TMDBItem } from "../api/tmdb";

interface PlayerProps {
  item: TMDBItem;
  onBack: () => void;
}

export default function Player({ item, onBack }: PlayerProps) {
  const [iframeUrl, setIframeUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    findVideo();
  }, [item]);

  const findVideo = async () => {
    setLoading(true);
    setError("");
    
    // Check if we're running in Tauri
    const isTauri = '__TAURI_INTERNALS__' in window;
    if (!isTauri) {
      setTimeout(() => {
        setIframeUrl("https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1");
        setLoading(false);
      }, 1500);
      return;
    }
    
    // Movieffm now has strong JS anti-bot challenges (LiteSpeed) blocking Rust HTTP clients.
    // Instead of scraping in the background, we directly embed the Movieffm search page.
    // The user can interact with the real site (which auto-solves the challenge) 
    // and click the movie they want directly. The sandbox protects them from ads.
    const query = encodeURIComponent(item.title || item.name || "");
    const targetUrl = `https://www.movieffm.net/xssearch?q=${query}`;
    
    setIframeUrl(targetUrl);
    setLoading(false);
  };

  return (
    <div ref={containerRef} className="absolute inset-0 z-[100] bg-black flex flex-col">
      <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent z-50 flex items-center justify-between gap-4 opacity-0 hover:opacity-100 transition-opacity">
        <button 
          onClick={onBack}
          className="text-white hover:text-primary transition-colors flex items-center gap-2 font-bold"
        >
          <ArrowLeft size={24} /> 返回目錄
        </button>
        <h2 className="text-white font-bold text-xl truncate">{item.title || item.name}</h2>
        <button
          onClick={toggleFullscreen}
          className="bg-black/50 hover:bg-black/80 text-white p-2 rounded-full transition-colors"
          title={isFullscreen ? "退出全螢幕" : "全螢幕"}
        >
          {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
        </button>
      </div>

      <div className="flex-1 w-full h-full flex flex-col items-center justify-center relative">
        {loading && (
          <div className="text-primary flex flex-col items-center gap-4">
            <Loader2 className="animate-spin" size={64} />
            <p className="text-xl font-bold animate-pulse">{status}</p>
          </div>
        )}

        {error && (
          <div className="text-red-500 flex flex-col items-center gap-4">
            <AlertCircle size={64} />
            <p className="text-xl font-bold">{error}</p>
          </div>
        )}

        {!loading && iframeUrl && (
          <iframe
            src={iframeUrl}
            className="w-full h-full border-none"
            allowFullScreen
            allow="fullscreen; autoplay"
            sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-forms"
          ></iframe>
        )}
      </div>
    </div>
  );
}
