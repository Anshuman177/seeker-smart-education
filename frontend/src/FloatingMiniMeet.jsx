import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { MeetingContext } from './MeetingContext';
import { 
  Maximize2, 
  Mic, 
  MicOff, 
  PhoneOff, 
  Radio, 
  Video 
} from 'lucide-react';

export default function FloatingMiniMeet() {
  const { 
    activeSession, 
    isMinimized, 
    setIsMinimized, 
    micActive, 
    setMicActive, 
    clearSession 
  } = useContext(MeetingContext);

  const navigate = useNavigate();

  // Show only when meeting is minimized and active
  if (!isMinimized || !activeSession) return null;

  const handleMaximize = () => {
    setIsMinimized(false);
    navigate(`/meet/${activeSession.roomId}`);
  };

  const handleLeaveMeeting = () => {
    if (clearSession) clearSession();
    setIsMinimized(false);
  };

  return (
    <aside
      aria-label="Active Meeting Floating Bar"
      className="fixed bottom-6 right-6 z-50 bg-slate-900/95 border-2 border-indigo-500 rounded-2xl p-4 shadow-2xl backdrop-blur-md flex items-center gap-4 text-white animate-in slide-in-from-bottom-5"
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500 flex items-center justify-center text-indigo-400 font-bold text-sm">
            <Video className="w-5 h-5" />
          </div>
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900 animate-pulse" />
        </div>

        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-white line-clamp-1 max-w-[150px]">
              {activeSession.topicToCover || 'SEEKER Meet'}
            </span>
            <span className="text-[9px] bg-emerald-950 text-emerald-400 font-black px-1.5 py-0.5 rounded uppercase flex items-center gap-0.5">
              <Radio className="w-2.5 h-2.5" /> Live
            </span>
          </div>
          <p className="text-[10px] text-slate-400">Call active in background</p>
        </div>
      </div>

      <div className="flex items-center gap-2 border-l border-slate-800 pl-3">
        {/* Toggle Mic */}
        <button
          type="button"
          onClick={() => setMicActive(!micActive)}
          className={`p-2 rounded-xl text-xs font-bold transition ${
            micActive 
              ? 'bg-slate-800 text-emerald-400 hover:bg-slate-700' 
              : 'bg-red-600 text-white'
          }`}
          title={micActive ? 'Mute Microphone' : 'Unmute Microphone'}
        >
          {micActive ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
        </button>

        {/* Maximize to full meeting room */}
        <button
          type="button"
          onClick={handleMaximize}
          className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-xl text-xs font-bold transition shadow-lg flex items-center gap-1"
          title="Return to Meeting Room"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        {/* Quick Leave */}
        <button
          type="button"
          onClick={handleLeaveMeeting}
          className="bg-slate-800 hover:bg-red-600 hover:text-white text-slate-400 p-2 rounded-xl text-xs transition"
          title="Dismiss Mini Bar"
        >
          <PhoneOff className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}