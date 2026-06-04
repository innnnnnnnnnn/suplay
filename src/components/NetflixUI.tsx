import { useState } from "react";
import { Search } from "lucide-react";
import Banner from "./Banner";
import Row from "./Row";
import SearchUI from "./SearchUI";
import { 
  getTrending, 
  getTopRatedMovies, 
  getPopularMovies, 
  getTopRatedShows, 
  getPopularShows,
  TMDBItem
} from "../api/tmdb";
import Player from "./Player";
import TmdbEmbed from "./TmdbEmbed";

interface NetflixUIProps {
  type: "movie" | "show" | "home";
}

export default function NetflixUI({ type }: NetflixUIProps) {
  const [playingItem, setPlayingItem] = useState<TMDBItem | null>(null);
  const [embeddedTmdbUrl, setEmbeddedTmdbUrl] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchActive, setIsSearchActive] = useState(false);

  if (playingItem) {
    return <Player item={playingItem} onBack={() => setPlayingItem(null)} />;
  }

  if (embeddedTmdbUrl) {
    return (
      <TmdbEmbed 
        url={embeddedTmdbUrl} 
        onPlay={(item) => {
          setPlayingItem(item);
          setEmbeddedTmdbUrl(null);
        }}
        onClose={() => setEmbeddedTmdbUrl(null)}
      />
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[#0a0a0a] scrollbar-hide pb-20 relative">
      {/* Top Navbar with Search */}
      <div className="absolute top-0 left-0 right-0 p-6 z-50 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
        <div className="text-white text-2xl font-black tracking-widest text-primary drop-shadow-md">
          {type === 'movie' ? '電影' : '影集'}
        </div>
        <div className="flex items-center gap-4">
          <div className={`flex items-center bg-black/40 border border-white/20 rounded-full px-4 py-2 transition-all duration-300 ${isSearchActive || searchQuery ? 'w-64 bg-black/80' : 'w-12 bg-transparent border-transparent cursor-pointer'}`}>
            <Search 
              size={20} 
              className="text-white shrink-0" 
              onClick={() => setIsSearchActive(true)}
            />
            {(isSearchActive || searchQuery) && (
              <input 
                autoFocus
                type="text" 
                placeholder="搜尋電影、影集..." 
                className="bg-transparent border-none outline-none text-white ml-2 w-full text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onBlur={() => !searchQuery && setIsSearchActive(false)}
              />
            )}
          </div>
        </div>
      </div>

      {searchQuery ? (
        <SearchUI query={searchQuery} onPlay={setPlayingItem} />
      ) : type === "movie" ? (
        <>
          <Banner fetchUrl={getPopularMovies} onPlay={setPlayingItem} onMoreInfo={setEmbeddedTmdbUrl} />
          <div className="-mt-32 relative z-20">
            <Row title="TMDB 電影排行榜 (Top Rated)" fetchUrl={getTopRatedMovies} onPlay={setPlayingItem} isLargeRow />
            <Row title="熱門電影 (Popular)" fetchUrl={getPopularMovies} onPlay={setPlayingItem} />
            <Row title="今日趨勢 (Trending)" fetchUrl={getTrending} onPlay={setPlayingItem} />
          </div>
        </>
      ) : null}

      {!searchQuery && type === "show" && (
        <>
          <Banner fetchUrl={getPopularShows} onPlay={setPlayingItem} onMoreInfo={setEmbeddedTmdbUrl} />
          <div className="-mt-32 relative z-20">
            <Row title="TMDB 戲劇排行榜 (Top Rated)" fetchUrl={getTopRatedShows} onPlay={setPlayingItem} isLargeRow />
            <Row title="熱播影集 (Popular)" fetchUrl={getPopularShows} onPlay={setPlayingItem} />
          </div>
        </>
      )}


      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
