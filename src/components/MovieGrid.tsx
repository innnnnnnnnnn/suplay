import { useState, useEffect } from "react";
import { Search, Play, Star, Clock } from "lucide-react";
import PopcornPlayer from "./PopcornPlayer"; // Reuse the PopcornPlayer for automated magnet playback

// Mock data to simulate API response from TMDB or PopcornTime API
const MOCK_MOVIES = [
  { id: 1, title: "Dune: Part Two", year: 2024, rating: 8.8, runtime: "2h 46m", poster: "https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2JGqqut1V.jpg", magnet: "" },
  { id: 2, title: "Oppenheimer", year: 2023, rating: 8.1, runtime: "3h 0m", poster: "https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg", magnet: "" },
  { id: 3, title: "Poor Things", year: 2023, rating: 7.9, runtime: "2h 21m", poster: "https://image.tmdb.org/t/p/w500/kCGlIMHnOm8JPXq3rXM6c5wMxcT.jpg", magnet: "" },
  { id: 4, title: "Spider-Man: Across the Spider-Verse", year: 2023, rating: 8.4, runtime: "2h 20m", poster: "https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg", magnet: "" },
  { id: 5, title: "Godzilla Minus One", year: 2023, rating: 8.3, runtime: "2h 5m", poster: "https://image.tmdb.org/t/p/w500/hkxxMIGaiCTmrEArK7v56JTa9Gl.jpg", magnet: "" },
  { id: 6, title: "The Batman", year: 2022, rating: 7.8, runtime: "2h 56m", poster: "https://image.tmdb.org/t/p/w500/74xTEgt7R36Fpooo50r9T25onhq.jpg", magnet: "" },
];

export default function MovieGrid() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMovie, setSelectedMovie] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // In a real app, clicking 'Play' would trigger the background scraper
  // to find the best magnet link or movieffm m3u8.
  const handlePlay = (movie: any) => {
    setSelectedMovie(movie);
    setIsPlaying(true);
  };

  if (isPlaying) {
    return (
      <div className="h-full flex flex-col relative">
        <button 
          onClick={() => setIsPlaying(false)}
          className="absolute top-4 left-4 z-50 bg-black/50 hover:bg-black/80 text-white px-4 py-2 rounded-full backdrop-blur transition-all"
        >
          ← 返回目錄
        </button>
        {/* We would pass the actual scraped magnet or m3u8 here, for now it's just the empty component */}
        <PopcornPlayer />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-8 overflow-y-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight">熱門電影</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input 
            type="text" 
            placeholder="搜尋電影..." 
            className="bg-gray-900 border border-gray-800 rounded-full py-2 pl-10 pr-4 text-sm w-64 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
        {MOCK_MOVIES.filter(m => m.title.toLowerCase().includes(searchQuery.toLowerCase())).map((movie) => (
          <div key={movie.id} className="group relative rounded-xl overflow-hidden cursor-pointer transition-transform duration-300 hover:scale-105 hover:z-10 shadow-xl">
            <div className="aspect-[2/3] w-full bg-gray-800 relative">
              <img src={movie.poster} alt={movie.title} className="w-full h-full object-cover" />
              
              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                <button 
                  onClick={() => handlePlay(movie)}
                  className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white mb-3 hover:scale-110 transition-transform self-center shadow-lg shadow-primary/30"
                >
                  <Play fill="currentColor" size={20} className="ml-1" />
                </button>
                <h3 className="font-bold text-white text-lg leading-tight truncate mb-1">{movie.title}</h3>
                <div className="flex items-center gap-3 text-xs text-gray-300">
                  <span>{movie.year}</span>
                  <span className="flex items-center gap-1"><Star size={12} className="text-yellow-500" fill="currentColor" /> {movie.rating}</span>
                  <span className="flex items-center gap-1"><Clock size={12} /> {movie.runtime}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
