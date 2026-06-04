import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Film, Play, Search, ShieldCheck } from "lucide-react";

export default function MovieffmPlayer() {
  const [url, setUrl] = useState("");
  const [videoSrc, setVideoSrc] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const extractVideo = async () => {
    if (!url) return;
    setLoading(true);
    setError("");
    setVideoSrc("");

    try {
      // Call Rust backend to scrape the page and find the actual video iframe/m3u8
      // This bypasses browser CORS and ad-scripts.
      const sourceUrl = await invoke<string>("extract_movieffm", { url });
      setVideoSrc(sourceUrl);
    } catch (err: any) {
      console.error(err);
      setError("無法解析此網址，可能是網頁結構已改變或遭遇防護機制。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      <div className="p-4 border-b border-gray-800 bg-gray-900 flex flex-col gap-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Film size={24} className="text-primary" />
          Movieffm 無廣告播放器
        </h2>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="輸入 movieffm.net 影片網址..."
            className="flex-1 bg-gray-800 border border-gray-700 rounded px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button
            onClick={extractVideo}
            disabled={loading || !url}
            className="bg-primary hover:bg-blue-600 text-white px-6 py-3 rounded font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? <Search className="animate-spin" size={20} /> : <ShieldCheck size={20} />}
            解析並封鎖廣告
          </button>
        </div>
        {error && (
          <div className="text-red-500 text-sm">{error}</div>
        )}
      </div>

      <div className="flex-1 bg-black flex flex-col items-center justify-center relative">
        {!videoSrc && !loading && (
          <div className="text-gray-600 text-center">
            <Film size={64} className="mb-4 mx-auto opacity-50" />
            <p>透過後端爬蟲直接抽取真實影片來源，徹底封鎖彈出式廣告</p>
          </div>
        )}

        {loading && (
          <div className="text-primary text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>正在破解網頁與提取影片連結...</p>
          </div>
        )}

        {videoSrc && (
          <iframe
            src={videoSrc}
            className="w-full h-full border-none"
            allowFullScreen
            sandbox="allow-scripts allow-same-origin allow-presentation"
          ></iframe>
        )}
      </div>
    </div>
  );
}
