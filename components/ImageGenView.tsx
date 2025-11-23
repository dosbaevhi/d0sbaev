import React, { useState } from 'react';
import { Sparkles, Download, Loader2 } from 'lucide-react';
import { generateImage } from '../services/geminiService';
import { GeneratedImage } from '../types';

const ImageGenView: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<GeneratedImage[]>([]);
  const [currentImage, setCurrentImage] = useState<GeneratedImage | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const base64Image = await generateImage(prompt);
      const newImage: GeneratedImage = {
        url: base64Image,
        prompt: prompt,
        timestamp: Date.now()
      };
      
      setCurrentImage(newImage);
      setHistory(prev => [newImage, ...prev]);
    } catch (err) {
      setError("Failed to generate image. Please try a different prompt or try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6">
       {/* Input Section */}
       <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800 backdrop-blur-sm">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
            <Sparkles className="text-pink-500" />
            Image Generator
          </h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the image you want to create... (e.g., A futuristic city on Mars)"
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-pink-500 transition-colors"
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            />
            <button
              onClick={handleGenerate}
              disabled={isLoading || !prompt.trim()}
              className={`px-6 rounded-xl font-medium transition-all ${
                isLoading || !prompt.trim()
                 ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                 : 'bg-pink-600 text-white hover:bg-pink-500 shadow-lg shadow-pink-500/20'
              }`}
            >
              {isLoading ? (
                <Loader2 className="animate-spin w-5 h-5" />
              ) : (
                "Generate"
              )}
            </button>
          </div>
          {error && <p className="mt-3 text-red-400 text-sm">{error}</p>}
       </div>

       {/* Main Display Area */}
       <div className="flex-1 flex gap-6 min-h-0">
          {/* Main Image Stage */}
          <div className="flex-1 bg-zinc-900/50 rounded-2xl border border-zinc-800 backdrop-blur-sm flex items-center justify-center p-4 relative overflow-hidden group">
             {currentImage ? (
               <div className="relative w-full h-full flex items-center justify-center">
                 <img 
                   src={currentImage.url} 
                   alt={currentImage.prompt}
                   className="max-h-full max-w-full object-contain rounded-lg shadow-2xl"
                 />
                 <a 
                   href={currentImage.url} 
                   download={`gemini-gen-${Date.now()}.png`}
                   className="absolute bottom-4 right-4 bg-black/70 text-white p-3 rounded-full hover:bg-black transition opacity-0 group-hover:opacity-100 backdrop-blur-md"
                   title="Download"
                 >
                   <Download size={20} />
                 </a>
                 <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs text-white/80 max-w-[80%] truncate">
                   {currentImage.prompt}
                 </div>
               </div>
             ) : (
               <div className="text-zinc-600 flex flex-col items-center">
                 <div className="w-20 h-20 rounded-full bg-zinc-800/50 flex items-center justify-center mb-4">
                   <ImageIcon className="w-10 h-10 text-zinc-700" />
                 </div>
                 <p>Generated images will appear here</p>
               </div>
             )}
          </div>

          {/* History Sidebar */}
          <div className="w-64 bg-zinc-900/50 rounded-2xl border border-zinc-800 backdrop-blur-sm flex flex-col overflow-hidden">
             <div className="p-4 border-b border-zinc-800">
               <h3 className="font-semibold text-zinc-300">History</h3>
             </div>
             <div className="flex-1 overflow-y-auto p-3 space-y-3">
               {history.map((img, idx) => (
                 <button
                   key={idx}
                   onClick={() => setCurrentImage(img)}
                   className={`w-full text-left p-2 rounded-xl transition-colors border ${
                     currentImage === img 
                      ? 'bg-zinc-800 border-pink-500/50' 
                      : 'hover:bg-zinc-800/50 border-transparent'
                   }`}
                 >
                   <img 
                     src={img.url} 
                     alt="" 
                     className="w-full h-32 object-cover rounded-lg mb-2 bg-zinc-950" 
                   />
                   <p className="text-xs text-zinc-400 line-clamp-2">{img.prompt}</p>
                 </button>
               ))}
               {history.length === 0 && (
                 <p className="text-center text-zinc-600 text-sm py-10">No history yet</p>
               )}
             </div>
          </div>
       </div>
    </div>
  );
};

function ImageIcon(props: any) {
    return (
        <svg
          {...props}
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
          <circle cx="9" cy="9" r="2" />
          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
        </svg>
      )
}

export default ImageGenView;
