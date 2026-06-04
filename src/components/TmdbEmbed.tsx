import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ArrowLeft, Loader2 } from "lucide-react";
import { getDetails, TMDBItem } from "../api/tmdb";

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
    const fetchHtml = async () => {
      setLoading(true);
      setError("");
      try {
        const rawHtml = await invoke<string>("fetch_tmdb_html", { url });
        
        // Inject base tag and navigation interceptor script
        const parser = new DOMParser();
        const doc = parser.parseFromString(rawHtml, "text/html");

        // 1. Add base tag to resolve relative assets/links
        let baseTag = doc.querySelector("base");
        if (!baseTag) {
          baseTag = doc.createElement("base");
          doc.head.insertBefore(baseTag, doc.head.firstChild);
        }
        baseTag.setAttribute("href", "https://www.themoviedb.org/");

        // 2. Add custom script to intercept clicks
        const script = doc.createElement("script");
        script.textContent = `
          document.addEventListener('click', function(e) {
            const anchor = e.target.closest('a');
            if (anchor) {
              const href = anchor.getAttribute('href');
              if (href) {
                // Parse relative url to absolute using temporary anchor
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
        <span className="text-gray-400 text-sm tracking-wide">
          TMDB 探索模式 - 點擊影片將直接開啟播放器
        </span>
        <div className="w-20"></div> {/* Spacer to keep title centered */}
      </div>

      <div className="flex-1 w-full h-full relative mt-1">
        {loading && (
          <div className="absolute inset-0 bg-[#0a0a0a]/80 backdrop-blur-sm flex flex-col items-center justify-center z-50 text-primary gap-4">
            <Loader2 className="animate-spin" size={48} />
            <p className="font-bold animate-pulse text-lg">載入中，請稍候...</p>
          </div>
        )}

        {error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-red-500 gap-4">
            <p className="text-lg font-semibold">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-primary text-white px-6 py-2 rounded-full hover:bg-blue-600 transition-colors"
            >
              重新整理
            </button>
          </div>
        ) : (
          html && (
            <iframe
              srcDoc={html}
              className="w-full h-full border-none bg-white"
              sandbox="allow-scripts allow-same-origin"
            ></iframe>
          )
        )}
      </div>
    </div>
  );
}
