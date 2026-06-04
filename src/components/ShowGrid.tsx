import { useState } from "react";
import { Search, Play, Star, LayoutGrid } from "lucide-react";
import PopcornPlayer from "./PopcornPlayer";

// Mock data to simulate API response from TMDB or PopcornTime API for Shows
const MOCK_SHOWS = [
  { id: 101, title: "Shōgun", year: 2024, rating: 8.9, seasons: 1, poster: "https://image.tmdb.org/t/p/w500/7O4iVfOMQmdCSxhOg1WNzG1SyRp.jpg" },
  { id: 102, title: "Fallout", year: 2024, rating: 8.6, seasons: 1, poster: "https://image.tmdb.org/t/p/w500/t92YpSrsQ0n94YhG73a5a4sP9pC.jpg" },
  { id: 103, title: "The Last of Us", year: 2023, rating: 8.8, seasons: 1, poster: "https://image.tmdb.org/t/p/w500/uKvVjHNqB5pWQSuq1FUx6I8Z3e.jpg" },
  { id: 104, title: "Succession", year: 2018, rating: 8.9, seasons: 4, poster: "https://image.tmdb.org/t/p/w500/7rrKCWZGE98VjUoX9xKz5Y4UoW5.jpg" },
  { id: 105, title: "Severance", year: 2022, rating: 8.7, seasons: 1, poster: "https://image.tmdb.org/t/p/w500/8tJj2f5Yk7RjX8iM8gJ1mXhM9R.jpg" },
  { id: 106, title: "Stranger Things", year: 2016, rating: 8.6, seasons: 4, poster: "https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8POA0KX6.jpg" },
];

export default function ShowGrid() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedShow, setSelectedShow] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlay = (show: any) => {
    setSelectedShow(show);
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
        <PopcornPlayer />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-8 overflow-y-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight">電視影集</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input 
            type="text" 
            placeholder="搜尋影集..." 
            className="bg-gray-900 border border-gray-800 rounded-full py-2 pl-10 pr-4 text-sm w-64 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
        {MOCK_SHOWS.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase())).map((show) => (
          <div key={show.id} className="group relative rounded-xl overflow-hidden cursor-pointer transition-transform duration-300 hover:scale-105 hover:z-10 shadow-xl">
            <div className="aspect-[2/3] w-full bg-gray-800 relative">
              <img src={show.poster} alt={show.title} className="w-full h-full object-cover" />
              
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                <button 
                  onClick={() => handlePlay(show)}
                  className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white mb-3 hover:scale-110 transition-transform self-center shadow-lg shadow-primary/30"
                >
                  <Play fill="currentColor" size={20} className="ml-1" />
                </button>
                <h3 className="font-bold text-white text-lg leading-tight truncate mb-1">{show.title}</h3>
                <div className="flex items-center gap-3 text-xs text-gray-300">
                  <span>{show.year}</span>
                  <span className="flex items-center gap-1"><Star size={12} className="text-yellow-500" fill="currentColor" /> {show.rating}</span>
                  <span className="flex items-center gap-1"><LayoutGrid size={12} /> {show.seasons} 季</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
