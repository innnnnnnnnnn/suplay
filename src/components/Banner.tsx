import { useEffect, useState } from "react";
import { TMDBItem, getImageUrl } from "../api/tmdb";
import { Play, Info } from "lucide-react";

interface BannerProps {
  fetchUrl: () => Promise<TMDBItem[]>;
  onPlay: (item: TMDBItem) => void;
  onMoreInfo: (url: string) => void;
}

export default function Banner({ fetchUrl, onPlay, onMoreInfo }: BannerProps) {
  const [movie, setMovie] = useState<TMDBItem | null>(null);

  useEffect(() => {
    fetchUrl().then((data) => {
      setMovie(data[Math.floor(Math.random() * data.length)]);
    });
  }, [fetchUrl]);

  if (!movie) return <div className="h-[70vh] bg-gray-900 animate-pulse" />;

  const title = movie.title || movie.name;
  const description = movie.overview 
    ? (movie.overview.length > 150 ? movie.overview.substring(0, 150) + "..." : movie.overview)
    : "暫無簡介";

  const handleMoreInfo = () => {
    const isMovie = !!(movie.title || movie.release_date);
    const base = isMovie ? "https://www.themoviedb.org/movie" : "https://www.themoviedb.org/tv";
    const url = `${base}?language=zh-TW`;
    onMoreInfo(url);
  };


  return (
    <div 
      className="relative h-[70vh] w-full text-white object-contain"
      style={{
        backgroundImage: `url(${getImageUrl(movie.backdrop_path, "original")})`,
        backgroundSize: "cover",
        backgroundPosition: "center center",
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/50 to-transparent" />
      <div className="absolute top-[30%] left-10 md:left-20 max-w-2xl">
        <h1 className="text-5xl md:text-7xl font-bold mb-4 drop-shadow-2xl">{title}</h1>
        <div className="flex items-center gap-4 mb-4 text-sm font-semibold">
          <span className="text-green-500">{Math.round(movie.vote_average * 10)}% 推薦度</span>
          <span>{movie.release_date ? movie.release_date.substring(0, 4) : (movie.first_air_date ? movie.first_air_date.substring(0, 4) : "")}</span>
        </div>
        <p className="text-lg mb-8 drop-shadow-md text-gray-200">{description}</p>
        <div className="flex gap-4">
          <button 
            onClick={() => onPlay(movie)}
            className="flex items-center gap-2 bg-white text-black px-8 py-3 rounded hover:bg-white/80 transition-colors font-bold text-lg"
          >
            <Play fill="currentColor" size={24} />
            播放
          </button>
          <button 
            onClick={handleMoreInfo}
            className="flex items-center gap-2 bg-gray-500/70 text-white px-8 py-3 rounded hover:bg-gray-500/50 transition-colors font-bold text-lg backdrop-blur-sm"
          >
            <Info size={24} />
            更多資訊
          </button>
        </div>
      </div>
    </div>
  );
}

