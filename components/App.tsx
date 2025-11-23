import React, { useState } from 'react';
import { MessageSquareText, Image as ImageIcon, Mic, Command } from 'lucide-react';
import ChatView from './components/ChatView';
import ImageGenView from './components/ImageGenView';
import LiveView from './components/LiveView';
import { AppView } from './types';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.CHAT);

  return (
    <div className="flex h-screen w-screen bg-black overflow-hidden selection:bg-indigo-500/30">
      {/* Sidebar Navigation */}
      <nav className="w-20 lg:w-64 border-r border-zinc-800 flex flex-col bg-zinc-950">
        <div className="h-16 flex items-center justify-center lg:justify-start lg:px-6 border-b border-zinc-800">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
            <Command className="text-white w-5 h-5" />
          </div>
          <span className="hidden lg:block ml-3 font-bold text-lg text-white tracking-tight">
            Gemini Omni
          </span>
        </div>

        <div className="flex-1 py-6 space-y-2 px-3">
          <NavButton 
            active={currentView === AppView.CHAT}
            onClick={() => setCurrentView(AppView.CHAT)}
            icon={<MessageSquareText size={20} />}
            label="Chat & Vision"
          />
          <NavButton 
            active={currentView === AppView.IMAGE_GEN}
            onClick={() => setCurrentView(AppView.IMAGE_GEN)}
            icon={<ImageIcon size={20} />}
            label="Image Studio"
          />
          <NavButton 
            active={currentView === AppView.LIVE}
            onClick={() => setCurrentView(AppView.LIVE)}
            icon={<Mic size={20} />}
            label="Live Voice"
            badge="New"
          />
        </div>

        <div className="p-4 border-t border-zinc-800">
          <div className="bg-zinc-900 rounded-xl p-3 flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-400"></div>
             <div className="hidden lg:block">
               <p className="text-xs font-medium text-zinc-300">Powered by</p>
               <p className="text-xs text-zinc-500">Google Gemini API</p>
             </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#09090b]">
        <header className="h-16 border-b border-zinc-800 flex items-center px-6 justify-between bg-zinc-950/50 backdrop-blur-sm">
           <h1 className="text-lg font-semibold text-white">
             {currentView === AppView.CHAT && "Chat & Vision Workspace"}
             {currentView === AppView.IMAGE_GEN && "Generative Image Studio"}
             {currentView === AppView.LIVE && "Real-time Voice Interface"}
           </h1>
           <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <span className="text-xs text-zinc-500">System Operational</span>
           </div>
        </header>
        
        <div className="flex-1 p-6 overflow-hidden relative">
          {/* Background Ambient Glow */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
             <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-indigo-900/10 blur-[100px]"></div>
             <div className="absolute bottom-[0%] right-[0%] w-[40%] h-[40%] rounded-full bg-purple-900/10 blur-[100px]"></div>
          </div>

          {currentView === AppView.CHAT && <ChatView />}
          {currentView === AppView.IMAGE_GEN && <ImageGenView />}
          {currentView === AppView.LIVE && <LiveView />}
        </div>
      </main>
    </div>
  );
};

interface NavButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: string;
}

const NavButton: React.FC<NavButtonProps> = ({ active, onClick, icon, label, badge }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center p-3 rounded-xl transition-all duration-200 group ${
      active 
        ? 'bg-zinc-800 text-white shadow-lg' 
        : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
    }`}
  >
    <div className={`${active ? 'text-indigo-400' : 'group-hover:text-indigo-400'} transition-colors`}>
      {icon}
    </div>
    <span className="hidden lg:block ml-3 text-sm font-medium flex-1 text-left">{label}</span>
    {badge && (
      <span className="hidden lg:block px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold uppercase tracking-wider">
        {badge}
      </span>
    )}
  </button>
);

export default App;
