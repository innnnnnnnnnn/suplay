import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, ExternalLink } from "lucide-react";
import { getDetails, TMDBItem } from "../api/tmdb";

const isTauri = "__TAURI_INTERNALS__" in window;

interface TmdbEmbedProps {
  url: string;
  onPlay: (item: TMDBItem) => void;
  onClose: () => void;
}

export default function TmdbEmbed({ url, onPlay, onClose }: TmdbEmbedProps) {
  const [html, setHtml] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!isTauri) {
      // Web mode: cannot fetch TMDB HTML due to X-Frame-Options
      // Just show a message and open in new tab
      setLoading(false);
      return;
    }

    const fetchHtml = async () => {
      setLoading(true);
      setError("");
      try {
        const { invoke: inv } = await import("@tauri-apps/api/core");
        const rawHtml = await inv<string>("fetch_tmdb_html", { url });
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(rawHtml, "text/html");

        let baseTag = doc.querySelector("base");
        if (!baseTag) {
          baseTag = doc.createElement("base");
          doc.head.insertBefore(baseTag, doc.head.firstChild);
        }
        baseTag.setAttribute("href", "https://www.themoviedb.org/");

        const script = doc.createElement("script");
        script.textContent = `
          document.addEventListener('click', function(e) {
            const anchor = e.target.closest('a');
            if (anchor) {
              const href = anchor.getAttribute('href');
              if (href) {
                const tempAnchor = document.createElement('a');
                tempAnchor.href = href;
                const absHref = tempAnchor.href;
                const movieMatch = absHref.match(/\\/movie\\/(\\d+)/);
                const tvMatch = absHref.match(/\\/tv\\/(\\d+)/);
                if (movieMatch || tvMatch) {
                  e.preventDefault();
                  e.stopPropagation();
                  const mediaType = movieMatch ? 'movie' : 'tv';
                  const id = movieMatch ? movieMatch[1] : tvMatch[1];
                  window.parent.postMessage({
                    type: 'TMDB_NAVIGATE',
                    mediaType: mediaType,
                    id: parseInt(id, 10)
                  }, '*');
                  return false;
                }
              }
            }
          }, true);
        `;
        doc.body.appendChild(script);
        setHtml(doc.documentElement.outerHTML);
      } catch (err) {
        console.error("Failed to load TMDB page", err);
        setError("無法載入 TMDB 頁面，請檢查您的網路連線。");
      } finally {
        setLoading(false);
      }
    };
    fetchHtml();
  }, [url]);

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data && event.data.type === "TMDB_NAVIGATE") {
        const { mediaType, id } = event.data;
        console.log("Intercepted navigation to:", mediaType, id);
        setLoading(true);
        try {
          const details = await getDetails(id, mediaType);
          // Set media_type property just in case Player/etc expects it
          details.media_type = mediaType === "tv" ? "tv" : "movie";
          onPlay(details);
        } catch (err) {
          console.error("Failed to get TMDB item details", err);
          alert("無法從 TMDB 獲取影片詳情。");
          setLoading(false);
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onPlay]);

  return (
    <div className="absolute inset-0 z-40 bg-[#0a0a0a] flex flex-col pt-16">
      {/* Header bar */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-[#0a0a0a]/90 backdrop-blur-md flex items-center px-6 border-b border-white/10 z-50 justify-between">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-white hover:text-primary transition-colors font-bold"
        >
          <ArrowLeft size={20} />
          返回主畫面
        </button>
        <span className="text-gray-400 text-sm tracking-wide hidden sm:block">
          {isTauri ? "TMDB 探索模式 - 點擊影片將直接開啟播放器" : "TMDB 探索"}
        </span>
        <div className="w-20"></div>
      </div>

      <div className="flex-1 w-full h-full relative mt-1">
        {loading && (
          <div className="absolute inset-0 bg-[#0a0a0a]/80 backdrop-blur-sm flex flex-col items-center justify-center z-50 text-primary gap-4">
            <Loader2 className="animate-spin" size={48} />
            <p className="font-bold animate-pulse text-lg">載入中，請稍候...</p>
          </div>
        )}

        {/* Web mode: cannot embed TMDB due to X-Frame-Options */}
        {!isTauri && !loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 text-center px-8">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <ExternalLink size={36} className="text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-white">在瀏覽器中開啟 TMDB</h2>
            <p className="text-gray-400 max-w-sm leading-relaxed">
              網頁版無法嵌入 TMDB 頁面（受 TMDB 安全政策限制），請點擊下方按鈕在新視窗中開啟瀏覽。
            </p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-primary hover:bg-blue-600 text-white px-8 py-3 rounded-full font-bold transition-colors shadow-lg shadow-primary/30"
            >
              <ExternalLink size={18} />
              開啟 TMDB 網站
            </a>
            <p className="text-gray-600 text-sm">桌面版 App 支援直接嵌入瀏覽並攔截播放</p>
          </div>
        )}

        {/* Tauri mode: embed HTML */}
        {isTauri && error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-red-500 gap-4">
            <p className="text-lg font-semibold">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-primary text-white px-6 py-2 rounded-full hover:bg-blue-600 transition-colors"
            >
              重新整理
            </button>
          </div>
        )}

        {isTauri && !error && html && (
          <iframe
            srcDoc={html}
            className="w-full h-full border-none bg-white"
            sandbox="allow-scripts allow-same-origin"
          ></iframe>
        )}
      </div>
    </div>
  );
}
