import { useState, useEffect } from "react";
import { searchMulti, TMDBItem, getImageUrl } from "../api/tmdb";
import { Play } from "lucide-react";

interface SearchUIProps {
  query: string;
  onPlay: (item: TMDBItem) => void;
}

export default function SearchUI({ query, onPlay }: SearchUIProps) {
  const [results, setResults] = useState<TMDBItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) return;
    setLoading(true);
    searchMulti(query).then((data) => {
      // Filter out people or items without posters
      setResults(data.filter((item: any) => item.media_type !== "person" && (item.poster_path || item.backdrop_path)));
      setLoading(false);
    });
  }, [query]);

  if (loading) {
    return <div className="p-20 text-center text-gray-500">搜尋中...</div>;
  }

  return (
    <div className="p-8 pt-24">
      <h2 className="text-2xl font-bold text-white mb-6">「{query}」的搜尋結果</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {results.map((item) => (
          <div 
            key={item.id} 
            className="relative group rounded overflow-hidden cursor-pointer transition-transform duration-300 hover:scale-105"
            onClick={() => onPlay(item)}
          >
            <img 
              src={getImageUrl(item.poster_path || item.backdrop_path, "w500")} 
              alt={item.title || item.name} 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Play className="text-white" size={48} fill="currentColor" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
              <p className="text-white text-sm font-bold truncate">{item.title || item.name}</p>
            </div>
          </div>
        ))}
        {results.length === 0 && !loading && (
          <p className="text-gray-500 col-span-full">沒有找到相關影片。</p>
        )}
      </div>
    </div>
  );
}
