import { useState, useRef, useEffect } from "react";
import { FolderOpen, Play, HardDrive, ArrowLeft, Maximize2, Minimize2 } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { readDir, DirEntry, readTextFile } from "@tauri-apps/plugin-fs";
import { convertFileSrc } from "@tauri-apps/api/core";

interface VideoFile {
  name: string;
  path: string;
  src: string;
  cover?: string;
  title?: string;
}

export default function NasBrowser() {
  const [currentPath, setCurrentPath] = useState<string>("");
  const [videos, setVideos] = useState<VideoFile[]>([]);
  const [playingVideo, setPlayingVideo] = useState<VideoFile | null>(null);
  const [loading, setLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  const VIDEO_EXTENSIONS = [".mp4", ".mkv", ".webm", ".avi", ".mov"];

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      videoContainerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const openDirectory = async () => {
    try {
      const selected = await open({
        multiple: false,
        directory: true,
      });

      if (selected && typeof selected === "string") {
        setCurrentPath(selected);
        loadVideosFromDir(selected);
      }
    } catch (error) {
      console.error("Failed to open directory", error);
    }
  };

  const scanDirectory = async (dirPath: string): Promise<VideoFile[]> => {
    try {
      const entries: DirEntry[] = await readDir(dirPath);
      let foundVideos: VideoFile[] = [];
      const imageNames = new Set<string>();
      const nfoNames = new Set<string>();

      for (const entry of entries) {
        if (entry.isFile) {
          const lowerName = entry.name?.toLowerCase() || "";
          if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg") || lowerName.endsWith(".png")) {
            imageNames.add(lowerName);
          } else if (lowerName.endsWith(".nfo")) {
            nfoNames.add(lowerName);
          }
        }
      }

      const separator = dirPath.includes("\\") ? "\\" : "/";

      for (const entry of entries) {
        const fullPath = `${dirPath}${dirPath.endsWith(separator) ? "" : separator}${entry.name}`;
        
        if (entry.isFile) {
          const lowerName = entry.name?.toLowerCase() || "";
          if (VIDEO_EXTENSIONS.some(ext => lowerName.endsWith(ext))) {
            const baseName = lowerName.replace(/\.[^/.]+$/, "");
            let coverSrc = undefined;

            if (imageNames.has(`${baseName}.jpg`)) {
              coverSrc = convertFileSrc(`${dirPath}${separator}${entry.name!.replace(/\.[^/.]+$/, ".jpg")}`);
            } else if (imageNames.has(`${baseName}.png`)) {
              coverSrc = convertFileSrc(`${dirPath}${separator}${entry.name!.replace(/\.[^/.]+$/, ".png")}`);
            } else if (imageNames.has("folder.jpg")) {
              coverSrc = convertFileSrc(`${dirPath}${separator}folder.jpg`);
            } else if (imageNames.has("cover.jpg")) {
              coverSrc = convertFileSrc(`${dirPath}${separator}cover.jpg`);
            } else if (imageNames.has("poster.jpg")) {
              coverSrc = convertFileSrc(`${dirPath}${separator}poster.jpg`);
            }

            let nfoTitle = undefined;
            if (nfoNames.has(`${baseName}.nfo`)) {
              try {
                const nfoPath = `${dirPath}${separator}${entry.name!.replace(/\.[^/.]+$/, ".nfo")}`;
                const nfoText = await readTextFile(nfoPath);
                const titleMatch = nfoText.match(/<title>(.*?)<\/title>/i);
                if (titleMatch && titleMatch[1]) {
                  nfoTitle = titleMatch[1].trim();
                }
              } catch (e) {}
            } else if (nfoNames.has("tvshow.nfo")) {
              try {
                const nfoPath = `${dirPath}${separator}tvshow.nfo`;
                const nfoText = await readTextFile(nfoPath);
                const titleMatch = nfoText.match(/<title>(.*?)<\/title>/i);
                if (titleMatch && titleMatch[1]) {
                  nfoTitle = titleMatch[1].trim();
                }
              } catch (e) {}
            }

            foundVideos.push({
              name: entry.name || "Unknown",
              path: fullPath,
              src: convertFileSrc(fullPath),
              cover: coverSrc,
              title: nfoTitle
            });
          }
        } else if (entry.isDirectory) {
          if (!entry.name?.startsWith(".") && !entry.name?.startsWith("@")) {
            const subVideos = await scanDirectory(fullPath);
            foundVideos = foundVideos.concat(subVideos);
          }
        }
      }
      return foundVideos;
    } catch (error) {
      console.warn("Failed to read directory", dirPath, error);
      return [];
    }
  };

  const loadVideosFromDir = async (dirPath: string) => {
    setLoading(true);
    setVideos([]);
    try {
      const allVideos = await scanDirectory(dirPath);
      setVideos(allVideos);
    } catch (error) {
      console.error("Failed to scan directory", error);
      alert("無法讀取目錄，請確認權限。");
    } finally {
      setLoading(false);
    }
  };

  if (playingVideo) {
    return (
      <div className="absolute inset-0 z-[100] bg-black flex flex-col">
        <div
          ref={videoContainerRef}
          className="relative flex-1 group"
        >
          <video
            src={playingVideo.src}
            controls
            autoPlay
            className="w-full h-full object-contain bg-black"
          />
          {/* Overlay controls */}
          <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
            <button
              className="pointer-events-auto text-white hover:text-primary transition-colors flex items-center gap-2 font-bold"
              onClick={() => setPlayingVideo(null)}
            >
              <ArrowLeft size={22} /> 返回目錄
            </button>
            <h2 className="text-white font-bold text-base truncate max-w-md">{playingVideo.title || playingVideo.name}</h2>
            <button
              className="pointer-events-auto bg-black/50 hover:bg-black/80 text-white p-2 rounded-full transition-colors"
              onClick={toggleFullscreen}
              title={isFullscreen ? "退出全螢幕" : "全螢幕"}
            >
              {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[#0a0a0a] p-8">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-800">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <HardDrive size={28} className="text-primary" />
          本地 NAS 檔案
        </h1>
        <button
          onClick={openDirectory}
          className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 font-medium transition-colors"
        >
          <FolderOpen size={18} />
          選擇目錄
        </button>
      </div>

      {currentPath ? (
        <>
          <p className="text-gray-400 mb-6 font-mono text-sm bg-gray-900 p-2 rounded">
            當前目錄: {currentPath}
          </p>
          
          {loading ? (
            <div className="text-center text-gray-500 py-20">讀取中...</div>
          ) : videos.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {videos.map((video, idx) => (
                <div 
                  key={idx}
                  className="bg-gray-900 rounded-lg overflow-hidden cursor-pointer group hover:ring-2 hover:ring-primary transition-all duration-300"
                  onClick={() => setPlayingVideo(video)}
                >
                  <div className="aspect-video bg-gray-800 flex items-center justify-center relative">
                    <Play size={40} className="text-white opacity-0 group-hover:opacity-100 transition-opacity absolute z-10" fill="currentColor" />
                    {video.cover ? (
                      <img src={video.cover} alt={video.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-50 transition-opacity" />
                    ) : (
                      <HardDrive size={32} className="text-gray-600" />
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-sm text-gray-300 truncate font-medium group-hover:text-white" title={video.title || video.name}>
                      {video.title || video.name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-20 bg-gray-900/30 rounded-lg border border-gray-800 border-dashed">
              此目錄下沒有找到支援的影片檔。
            </div>
          )}
        </>
      ) : (
        <div className="h-64 flex flex-col items-center justify-center text-gray-600 bg-gray-900/30 rounded-lg border border-gray-800 border-dashed">
          <FolderOpen size={48} className="mb-4 opacity-50" />
          <p className="text-lg">請選擇一個本地資料夾來瀏覽影片</p>
        </div>
      )}
    </div>
  );
}
