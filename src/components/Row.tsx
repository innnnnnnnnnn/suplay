import { useEffect, useState, useRef } from "react";
import { TMDBItem, getImageUrl } from "../api/tmdb";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";

interface RowProps {
  title: string;
  fetchUrl: () => Promise<TMDBItem[]>;
  onPlay: (item: TMDBItem) => void;
  isLargeRow?: boolean;
}

export default function Row({ title, fetchUrl, onPlay, isLargeRow = false }: RowProps) {
  const [movies, setMovies] = useState<TMDBItem[]>([]);
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchUrl().then(setMovies);
  }, [fetchUrl]);

  const scroll = (direction: "left" | "right") => {
    if (rowRef.current) {
      const { scrollLeft, clientWidth } = rowRef.current;
      const scrollTo = direction === "left" ? scrollLeft - clientWidth : scrollLeft + clientWidth;
      rowRef.current.scrollTo({ left: scrollTo, behavior: "smooth" });
    }
  };

  if (movies.length === 0) return null;

  return (
    <div className="pl-10 md:pl-20 mb-10 group relative">
      <h2 className="text-xl md:text-2xl font-bold text-gray-200 mb-4 tracking-wide">{title}</h2>
      
      <button 
        className="absolute left-0 top-1/2 -translate-y-1/2 z-40 bg-black/50 p-2 rounded-r opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80 h-[80%] flex items-center justify-center text-white"
        onClick={() => scroll("left")}
      >
        <ChevronLeft size={40} />
      </button>

      <div 
        ref={rowRef}
        className="flex overflow-x-scroll gap-4 pb-6 pt-2 pr-10 scrollbar-hide snap-x"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {movies.map((movie) => (
          <div 
            key={movie.id} 
            className={`relative flex-none transition-transform duration-300 hover:scale-105 hover:z-50 cursor-pointer snap-start rounded-md overflow-hidden
              ${isLargeRow ? "w-[150px] md:w-[200px]" : "w-[200px] md:w-[280px]"}`}
            onClick={() => onPlay(movie)}
          >
            <img
              src={getImageUrl(isLargeRow ? movie.poster_path : (movie.backdrop_path || movie.poster_path), "w500")}
              alt={movie.title || movie.name}
              className="w-full h-full object-cover"
            />
            
            <div className="absolute inset-0 bg-black/70 opacity-0 hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
               <div className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-white text-white mb-2 hover:bg-white hover:text-black transition-colors self-start">
                 <Play fill="currentColor" size={16} className="ml-1" />
               </div>
               <p className="font-bold text-sm text-white truncate">{movie.title || movie.name}</p>
               <div className="flex gap-2 text-xs text-green-500 font-semibold mt-1">
                 <span>{Math.round(movie.vote_average * 10)}% 適合您</span>
               </div>
            </div>
          </div>
        ))}
      </div>

      <button 
        className="absolute right-0 top-1/2 -translate-y-1/2 z-40 bg-black/50 p-2 rounded-l opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80 h-[80%] flex items-center justify-center text-white"
        onClick={() => scroll("right")}
      >
        <ChevronRight size={40} />
      </button>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
