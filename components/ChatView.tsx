import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Send, Image as ImageIcon, X, Bot, User, Loader2 } from 'lucide-react';
import { ChatMessage } from '../types';
import { generateText } from '../services/geminiService';

const ChatView: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: "Hello! I'm Gemini. I can help you with writing, analysis, or understanding images. How can I assist you today?",
      timestamp: Date.now()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendMessage = async () => {
    if ((!inputValue.trim() && !selectedImage) || isLoading) return;

    const newUserMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: inputValue,
      image: selectedImage || undefined,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, newUserMsg]);
    setInputValue('');
    setSelectedImage(null);
    setIsLoading(true);

    try {
      // Prepare image data if exists. Note: selectedImage is a full Data URI, we need to strip prefix for API if doing manual processing,
      // but the service helper can handle it if we extract the base64 part.
      let base64Data = undefined;
      let mimeType = undefined;
      
      if (newUserMsg.image) {
        // Data URI format: data:[<mime type>][;charset=<charset>][;base64],<encoded data>
        const matches = newUserMsg.image.match(/^data:(.+);base64,(.+)$/);
        if (matches && matches.length === 3) {
            mimeType = matches[1];
            base64Data = matches[2];
        }
      }

      const responseText = await generateText(newUserMsg.text, base64Data, mimeType);

      const newModelMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, newModelMsg]);
    } catch (error) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "I encountered an error processing your request. Please try again.",
        timestamp: Date.now(),
        isError: true
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900/50 rounded-2xl border border-zinc-800 backdrop-blur-sm overflow-hidden">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              msg.role === 'user' ? 'bg-indigo-600' : 'bg-emerald-600'
            }`}>
              {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>
            
            <div className={`flex flex-col max-w-[80%] space-y-2`}>
              <div className={`p-4 rounded-2xl ${
                msg.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-tr-none' 
                  : 'bg-zinc-800 text-zinc-100 rounded-tl-none border border-zinc-700'
              }`}>
                {msg.image && (
                  <img src={msg.image} alt="User upload" className="max-w-full rounded-lg mb-3 border border-white/20" />
                )}
                {msg.isError ? (
                  <span className="text-red-300">{msg.text}</span>
                ) : (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>
                )}
              </div>
              <span className={`text-xs text-zinc-500 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                {new Date(msg.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3">
             <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center shrink-0">
               <Bot size={16} />
             </div>
             <div className="bg-zinc-800 p-4 rounded-2xl rounded-tl-none border border-zinc-700 flex items-center">
               <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
               <span className="ml-2 text-zinc-400 text-sm">Thinking...</span>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-zinc-900 border-t border-zinc-800">
        {selectedImage && (
          <div className="flex items-center gap-2 mb-2 p-2 bg-zinc-800 rounded-lg w-fit">
            <span className="text-xs text-zinc-400">Image attached</span>
            <button 
              onClick={() => setSelectedImage(null)}
              className="text-zinc-500 hover:text-white"
            >
              <X size={14} />
            </button>
          </div>
        )}
        
        <div className="flex items-end gap-2 bg-zinc-950 p-2 rounded-xl border border-zinc-800 focus-within:border-indigo-500 transition-colors">
          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleImageSelect}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-zinc-400 hover:text-indigo-400 hover:bg-zinc-800 rounded-lg transition-colors"
            title="Upload Image"
          >
            <ImageIcon size={20} />
          </button>
          
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Gemini anything..."
            className="flex-1 bg-transparent text-white placeholder-zinc-500 resize-none outline-none py-2 max-h-32"
            rows={1}
            style={{ minHeight: '40px' }}
          />
          
          <button 
            onClick={handleSendMessage}
            disabled={(!inputValue.trim() && !selectedImage) || isLoading}
            className={`p-2 rounded-lg transition-all ${
              (!inputValue.trim() && !selectedImage) || isLoading
                ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20'
            }`}
          >
            {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatView;
