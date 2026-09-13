import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Play, Star, Calendar, ExternalLink } from "lucide-react";
import { getDetails, TMDBItem, getImageUrl, searchMulti } from "../api/tmdb";

const isTauri = "__TAURI_INTERNALS__" in window;

interface TmdbEmbedProps {
  url: string;
  onPlay: (item: TMDBItem) => void;
  onClose: () => void;
}

// Fetch a page of popular items from TMDB API to browse (web fallback)
const fetchTmdbPage = async (url: string): Promise<TMDBItem[]> => {
  // Parse whether this is a movie or tv URL
  const isMovie = url.includes("/movie");
  const isTv = url.includes("/tv");

  const TMDB_API_KEY = "581a8fbd7a7cfeb48d4454fb9c6c697a";
  const BASE_URL = "https://api.themoviedb.org/3";
  let endpoint = "/trending/all/day";
  if (isMovie) endpoint = "/movie/popular";
  if (isTv) endpoint = "/tv/popular";

  const params = new URLSearchParams({ api_key: TMDB_API_KEY, language: "zh-TW", page: "1" });
  const res = await fetch(`${BASE_URL}${endpoint}?${params}`);
  if (!res.ok) throw new Error("TMDB fetch failed");
  const data = await res.json();
  return data.results as TMDBItem[];
};

export default function TmdbEmbed({ url, onPlay, onClose }: TmdbEmbedProps) {
  const [html, setHtml] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  // Web-mode browse state
  const [browseItems, setBrowseItems] = useState<TMDBItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TMDBItem[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!isTauri) {
      // Web mode: load TMDB browse list via API
      fetchTmdbPage(url)
        .then(items => { setBrowseItems(items); setLoading(false); })
        .catch(() => { setError("無法載入 TMDB 資料"); setLoading(false); });
      return;
    }

    // Tauri mode: fetch rendered TMDB HTML via Rust backend
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

  // Tauri: intercept iframe navigation
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data && event.data.type === "TMDB_NAVIGATE") {
        const { mediaType, id } = event.data;
        setLoading(true);
        try {
          const details = await getDetails(id, mediaType);
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

  // Web mode: search
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    setSearching(true);
    searchMulti(searchQuery).then(results => {
      setSearchResults(results.filter((item: any) =>
        item.media_type !== "person" && (item.poster_path || item.backdrop_path)
      ));
      setSearching(false);
    });
  }, [searchQuery]);

  const handleWebItemClick = async (item: TMDBItem) => {
    const mediaType = (item as any).media_type || (url.includes("/tv") ? "tv" : "movie");
    setLoading(true);
    try {
      const details = await getDetails(item.id, mediaType as "movie" | "tv");
      details.media_type = mediaType;
      onPlay(details);
    } catch {
      alert("無法取得詳細資訊。");
      setLoading(false);
    }
  };

  const displayItems = searchQuery ? searchResults : browseItems;

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
          {isTauri ? "TMDB 探索模式 - 點擊影片將直接開啟播放器" : "TMDB 探索 - 點擊影片直接播放"}
        </span>
        <div className="w-20" />
      </div>

      <div className="flex-1 w-full h-full relative mt-1 overflow-hidden">
        {loading && (
          <div className="absolute inset-0 bg-[#0a0a0a]/80 backdrop-blur-sm flex flex-col items-center justify-center z-50 text-primary gap-4">
            <Loader2 className="animate-spin" size={48} />
            <p className="font-bold animate-pulse text-lg">載入中，請稍候...</p>
          </div>
        )}

        {/* ── Tauri mode: embed raw TMDB HTML ── */}
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
          />
        )}

        {/* ── Web mode: TMDB browse grid (same experience, via API) ── */}
        {!isTauri && !loading && (
          <div className="h-full overflow-y-auto">
            {/* Search bar */}
            <div className="sticky top-0 z-20 px-6 py-4 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-white/5">
              <input
                type="text"
                placeholder="搜尋影片或影集..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full max-w-lg bg-gray-900 border border-gray-700 rounded-full px-5 py-2.5 text-sm text-white focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            {error && (
              <div className="p-8 text-center text-red-400">{error}</div>
            )}

            {searching && (
              <div className="p-8 text-center text-gray-500">搜尋中...</div>
            )}

            {!searching && (
              <div className="p-6">
                <h2 className="text-lg font-bold text-white mb-4">
                  {searchQuery
                    ? `「${searchQuery}」的搜尋結果`
                    : url.includes("/tv") ? "熱播影集" : "熱門電影"
                  }
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {displayItems.map(item => (
                    <div
                      key={item.id}
                      onClick={() => handleWebItemClick(item)}
                      className="group relative rounded-xl overflow-hidden cursor-pointer transition-transform duration-300 hover:scale-105 hover:z-10 shadow-xl"
                    >
                      <div className="aspect-[2/3] w-full bg-gray-800 relative">
                        <img
                          src={getImageUrl(item.poster_path, "w342")}
                          alt={item.title || item.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                          <button className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white mb-2 hover:scale-110 transition-transform self-center shadow-lg shadow-primary/30">
                            <Play fill="currentColor" size={18} className="ml-0.5" />
                          </button>
                          <p className="font-bold text-white text-xs leading-tight truncate mb-1">
                            {item.title || item.name}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-gray-300">
                            <span className="flex items-center gap-0.5">
                              <Star size={10} className="text-yellow-500" fill="currentColor" />
                              {item.vote_average.toFixed(1)}
                            </span>
                            <span className="flex items-center gap-0.5">
                              <Calendar size={10} />
                              {(item.release_date || item.first_air_date || "").substring(0, 4)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {displayItems.length === 0 && !searching && searchQuery && (
                    <p className="text-gray-500 col-span-full py-8 text-center">沒有找到相關結果。</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
