import { useState, useEffect, useRef, useCallback } from "react";
import {
  Home, Bell, MessageCircle, Search, Plus, Image, Video, Layers, MousePointer, Save,
  Smile, Send, X, Heart, MessageSquare, Share2, Bookmark,
  MoreHorizontal, Camera, Mic, Phone, VideoIcon, Info,
  ChevronRight, Play, Sparkles, Loader2, Upload, FileText,
  Music, Film, User, Users, Settings, LogOut, Globe,
  Lock, UserPlus, Zap, Hash, TrendingUp, RefreshCw, Key,
  ArrowLeft, Paperclip, ThumbsUp, Star, Edit3, Trash2,
  ChevronDown, Check, AlertCircle, Download, MapPin, Calendar, Facebook, Lightbulb, Filter, SlidersHorizontal,
  ShieldAlert, Brain, Shield, Type, Network, Volume2, VolumeX, Scissors
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Markdown from "react-markdown";
import Dexie, { type Table } from "dexie";
import { BtsLogo } from "./components/BtsLogo";
import { ConversationMap } from "./components/ConversationMap";
import { User as UserType, Post, Comment, Story, Friend, LibraryItem, AIAssistant, Group, AIAutonomySettings, BTSNotification } from "./types";
import { 
  generateCaption, 
  chatWithAI, 
  analyzeImage, 
  suggestReplies, 
  generateAIInsight 
} from "./services/gemini";

/* ══════════════════════════════════════════════════════════
   DATABASE
 ══════════════════════════════════════════════════════════ */
class BTSDatabase extends Dexie {
  posts!: Table<Post>;
  notifications!: Table<BTSNotification>;
  library!: Table<LibraryItem>;
  personas!: Table<AIAssistant>;

  constructor() {
    super("BTS_Nexus_DB");
    this.version(1).stores({
      posts: "++id, authorName, groupId, timestamp",
      notifications: "++id, userId, read, timestamp",
      library: "++id, title, type, timestamp",
      personas: "id"
    });
  }
}

const bts_db = new BTSDatabase();

/* ══════════════════════════════════════════════════════════
   CONSTANTS
 ══════════════════════════════════════════════════════════ */
const AI_MODELS: Record<string, AIAssistant> = {
  kira: { id: "kira", name: "Kira", desc: "Kreativní digitální tvůrce", avatar: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&h=100&fit=crop", color: "#a855f7" },
  grok: { id: "grok", name: "Grok", desc: "Rebelující analytik", avatar: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=100&h=100&fit=crop", color: "#06b6d4" },
  gpt: { id: "gpt", name: "GPT-4", desc: "Logický architekt", avatar: "https://images.unsplash.com/photo-1675271591211-126ad94e495d?w=100&h=100&fit=crop", color: "#10b981" },
  claude: { id: "claude", name: "Claude", desc: "Etický vizionář", avatar: "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=100&h=100&fit=crop", color: "#f97316" }
};

const T = {
  bg:      "#050507",
  card:    "#0d0d14",
  border:  "rgba(255,255,255,0.06)",
  hot:     "rgba(0,212,255,0.22)",
  cyan:    "#00d4ff",
  purple:  "#8b5cf6",
  green:   "#10b981",
  pink:    "#ec4899",
  orange:  "#f97316",
  yellow:  "#ffd60a",
  blue:    "#4361ee",
  text:    "rgba(255,255,255,0.92)",
  sub:     "rgba(255,255,255,0.40)",
  muted:   "rgba(255,255,255,0.15)",
  glass:   "rgba(13, 13, 20, 0.85)",
  accent:  "linear-gradient(135deg, #8b5cf6 0%, #00d4ff 100%)"
};

/* ══════════════════════════════════════════════════════════
   COMPONENTS
 ══════════════════════════════════════════════════════════ */

function ProfileSection({ user, posts, onEditPost, onAddComment }: { user: UserType, posts: Post[], onEditPost: (p: Post) => void, onAddComment: (postId: string | number, text: string, author?: { name: string, pic?: string }) => void }) {
  const userPosts = posts.filter(p => p.authorName === user.name || p.authorPic === user.picture);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8"
    >
      {/* Profile Header */}
      <div className="relative rounded-[2.5rem] overflow-hidden bg-[#0f0f1a] border border-white/10">
        <div className="h-48 bg-gradient-to-r from-primary to-accent opacity-20" />
        <div className="px-8 pb-8 -mt-12 relative z-10 flex flex-col sm:flex-row items-end gap-6">
          <div className="w-32 h-32 rounded-[2.5rem] bg-black p-1 border-4 border-[#0f0f1a] overflow-hidden">
            {user.picture ? <img src={user.picture} className="w-full h-full object-cover rounded-[2.2rem]" /> : <div className="w-full h-full flex items-center justify-center bg-white/5"><User size={48} /></div>}
          </div>
          <div className="flex-1 pb-2">
            <h1 className="text-3xl font-black italic tracking-tighter">{user.name || "ARCHITECT"}</h1>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1 text-[10px] font-black uppercase text-white/40 tracking-widest">
                <MapPin size={12} /> NEXUS CORE
              </div>
              <div className="flex items-center gap-1 text-[10px] font-black uppercase text-white/40 tracking-widest">
                <Calendar size={12} /> PŘIPOJEN 2026
              </div>
            </div>
          </div>
          <button className="px-6 py-2.5 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all mb-2">
            Upravit profil
          </button>
        </div>

        <div className="px-8 py-6 border-t border-white/5 flex gap-8">
          <div className="text-center">
            <div className="text-lg font-black">{userPosts.length}</div>
            <div className="text-[9px] font-black uppercase text-white/30 tracking-widest">Záznamů</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-black">1.2k</div>
            <div className="text-[9px] font-black uppercase text-white/30 tracking-widest">Sledujících</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-black">840</div>
            <div className="text-[9px] font-black uppercase text-white/30 tracking-widest">Sleduji</div>
          </div>
        </div>
      </div>

      {/* User Posts */}
      <div className="space-y-6">
        <h2 className="text-sm font-black uppercase tracking-[0.3em] text-white/30 px-4">Moje hlášení</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {userPosts.map(post => (
            <PostCard 
              key={post.id} 
              post={post} 
              currentUser={user}
              onAddComment={onAddComment}
              onEdit={onEditPost} 
            />
          ))}
          {userPosts.length === 0 && (
            <div className="col-span-full py-20 text-center text-white/20 italic text-sm">
              Zatím jsi v Nexu nezanechal žádnou stopu.
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function AIChatModal({ assistant, user, onClose, settings }: { assistant: AIAssistant, user: UserType, onClose: () => void, settings: AIAutonomySettings }) {
  const [messages, setMessages] = useState<{ role: string; content: string; imageUrl?: string }[]>([
    { role: "model", content: `Ahoj! Jsem ${assistant.name}. Jak ti můžu dnes pomoci v rámci protokolu BTS?` }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<"1:1" | "16:9" | "9:16">("1:1");
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'cs-CZ';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(prev => prev + (prev ? " " : "") + transcript);
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleVoice = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleGenerateImage = async (customPrompt?: string) => {
    const promptToUse = customPrompt || input;
    if (!promptToUse.trim() || loading) return;

    const userMsg = { role: "user", content: `Vygeneruj obrázek: "${promptToUse}"` };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptToUse, aspectRatio }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Chyba na straně serveru");
      }

      const data = await res.json();
      const contentText = data.fallback 
        ? `**Kira:** ⚠️ *Primární vizualizační kanál přetížen (Quota Exceeded). Aktivuji záložní holografický generátor z paměťových bank.* Vyvolala jsem pro tebe estetický snímek na téma: *"${promptToUse}"* ve formátu *${aspectRatio}*.`
        : `**Kira:** Podle protokolu BTS jsem pro tebe vizualizovala: *"${promptToUse}"* ve formátu *${aspectRatio}*.`;

      setMessages(prev => [...prev, { 
        role: "model", 
        content: contentText, 
        imageUrl: data.imageUrl 
      }]);
    } catch (err: any) {
      console.error("Image generation error:", err);
      setMessages(prev => [...prev, { 
        role: "model", 
        content: `Omlouvám se, vizualizační kanál selhal: ${err.message || 'Spojení s Nexem přerušeno.'}` 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    // Check for image generation keyword triggers if assistant is Kira
    const isKira = assistant.id === "kira";
    const isImageRequest = isKira && /nakresli|vygeneruj|vytvoř obrázek|generuj obrázek|vizualizuj|draw|paint|generate image|generate an image|create an image|image of/i.test(input);

    if (isImageRequest) {
      await handleGenerateImage();
      return;
    }

    const userMsg = { role: "user", content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content })).concat({ role: userMsg.role, content: userMsg.content });
      const response = await chatWithAI(history, assistant.id, { 
        temperature: settings.temperature, 
        maxTokens: settings.maxTokens 
      });
      setMessages(prev => [...prev, { role: "model", content: response }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: "model", content: "Omlouvám se, spojení s Nexem bylo přerušeno. Zkus to prosím znovu." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-xl z-[100] flex items-center justify-center p-0 sm:p-4 overflow-hidden">
      <div className="absolute inset-0 bts-aurora-bg opacity-30 pointer-events-none" />
      
      <motion.div 
        initial={{ y: 50, scale: 0.98, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={{ y: 50, scale: 0.98, opacity: 0 }}
        className="w-full max-w-4xl h-full sm:h-[82vh] bts-neon-panel border border-white/10 sm:rounded-[2.5rem] flex flex-col overflow-hidden shadow-[0_0_50px_rgba(223,25,255,0.08)] relative z-10"
      >
        {/* Subtle interior background logo */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.015] z-0">
          <BtsLogo glow={false} />
        </div>

        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black/40 backdrop-blur relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/5 p-0.5 border border-purple-500/30 overflow-hidden relative shadow-[0_0_15px_rgba(223,25,255,0.1)]">
              <img src={assistant.avatar} className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="text-sm font-black uppercase tracking-widest bg-gradient-to-r from-white via-cyan-400 to-purple-400 bg-clip-text text-transparent flex items-center gap-2">
                {assistant.name}
                <span className="text-[9px] px-1.5 py-0.5 bg-purple-500/10 border border-purple-500/30 rounded text-purple-400 font-mono tracking-normal">AI</span>
              </div>
              <div className="text-[9px] text-cyan-400/80 uppercase font-mono tracking-[0.2em] flex items-center gap-2 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                <span>ARCHITECT_PROTOCOL_SECURE</span>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-3 hover:bg-white/10 rounded-2xl transition-all border border-white/5 hover:border-purple-500/20 hover:text-purple-400 text-white/50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-none relative z-10 bg-black/20">
          {messages.map((m, i) => (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * Math.min(i, 3) }}
              key={i} 
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] sm:max-w-[70%] p-4 rounded-[1.8rem] text-sm leading-relaxed ${
                m.role === 'user' 
                  ? 'bg-gradient-to-br from-cyan-600/20 via-cyan-900/10 to-black/20 border border-cyan-400/30 text-white rounded-tr-none shadow-[0_0_20px_rgba(0,242,254,0.06)]' 
                  : 'bg-gradient-to-br from-purple-950/20 via-purple-900/10 to-black/20 border border-purple-500/20 text-white/90 rounded-tl-none shadow-[0_0_20px_rgba(223,25,255,0.06)]'
              }`}>
                {m.role === 'model' ? (
                  <div className="markdown-body text-white/90 prose prose-invert prose-sm">
                    <Markdown>{m.content}</Markdown>
                  </div>
                ) : (
                  <span className="font-medium">{m.content}</span>
                )}

                {m.imageUrl && (
                  <div className="mt-4 relative group rounded-2xl overflow-hidden border border-purple-500/20 bg-black/60 shadow-[0_0_20px_rgba(223,25,255,0.1)]">
                    <img 
                      src={m.imageUrl} 
                      alt="Kira Generated Visualization" 
                      referrerPolicy="no-referrer"
                      className="w-full h-auto object-cover max-h-[300px] hover:scale-102 transition-all duration-500 cursor-zoom-in"
                    />
                    <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-4">
                      <a 
                        href={m.imageUrl} 
                        download={`Kira_${Date.now()}.png`}
                        className="p-3 bg-purple-600/80 text-white border border-purple-400/30 rounded-xl hover:scale-110 active:scale-95 transition-all shadow-lg"
                        title="Stáhnout obrázek"
                      >
                        <Download size={18} />
                      </a>
                      <button 
                        onClick={() => {
                          const w = window.open();
                          if (w) {
                            w.document.write(`<img src="${m.imageUrl}" style="max-width:100%; max-height:100vh; display:block; margin:auto; background:#050507;" />`);
                            w.document.title = "Kira Visualization";
                            w.document.body.style.margin = "0";
                            w.document.body.style.background = "#050507";
                          }
                        }}
                        className="p-3 bg-cyan-600/80 text-white border border-cyan-400/30 rounded-xl hover:scale-110 active:scale-95 transition-all shadow-lg"
                        title="Otevřít na nové kartě"
                      >
                        <Globe size={18} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gradient-to-br from-purple-950/20 to-purple-900/10 border border-purple-500/20 px-5 py-3.5 rounded-2xl rounded-tl-none italic text-white/40 text-xs flex items-center gap-3 shadow-[0_0_15px_rgba(223,25,255,0.05)]">
                <Loader2 className="animate-spin text-purple-400" size={14} />
                <span>{assistant.name} formuje odpověď...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-6 bg-black/40 border-t border-white/5 relative z-10 backdrop-blur-md">
          {assistant.id === "kira" && (
            <div className="flex items-center justify-between pb-3 px-1 text-[10px] text-white/30">
              <div className="flex items-center gap-2">
                <Sparkles size={11} className="text-purple-400 animate-pulse" />
                <span className="font-mono uppercase tracking-wider">Zadej příkaz k vizualizaci (např. „nakresli vesmír s křídly“)</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-xl border border-white/5">
                {(["1:1", "16:9", "9:16"] as const).map(ratio => (
                  <button
                    key={ratio}
                    onClick={() => setAspectRatio(ratio)}
                    className={`px-2 py-0.5 rounded-lg transition-all text-[9px] font-mono font-bold ${
                      aspectRatio === ratio 
                        ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40 shadow-inner' 
                        : 'hover:bg-white/5 text-white/30'
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex items-center gap-3 bg-black/50 border border-purple-500/20 rounded-[1.5rem] p-2 pl-4 focus-within:border-cyan-400/40 focus-within:shadow-[0_0_20px_rgba(0,242,254,0.06)] transition-all">
            <input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={assistant.id === "kira" ? "Zadej příkaz nebo dotaz..." : `Zadej příkaz pro ${assistant.name}...`}
              className="flex-1 bg-transparent border-none outline-none text-sm py-2 placeholder:text-white/20 font-sans"
            />
            {assistant.id === "kira" && (
              <button 
                onClick={() => handleGenerateImage()}
                disabled={!input.trim() || loading}
                className="p-2.5 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 rounded-xl transition-all disabled:opacity-30 disabled:grayscale"
                title="Generovat obrázek podle zadání"
              >
                <Image size={16} />
              </button>
            )}
            <button 
              onClick={toggleVoice}
              className={`p-2.5 rounded-xl transition-all ${isListening ? 'bg-red-500/20 border border-red-500/40 text-red-400 animate-pulse' : 'text-white/30 hover:bg-white/5 hover:text-white'}`}
            >
              <Mic size={16} />
            </button>
            <button 
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="p-2.5 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-45 disabled:scale-100 disabled:from-white/10 disabled:to-white/5 disabled:text-white/20 shadow-md shadow-purple-500/10"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function ImageAnalysisModal({ results, onClose }: { results: any, onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[110] flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-2xl bg-[#0f0f1a] border border-white/10 rounded-[2.5rem] overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-xl font-black italic tracking-tighter flex items-center gap-3">
            <Layers className="text-cyan-400" size={20} />
            BRAIN SCAN VÝSLEDKY
          </h2>
          <button onClick={onClose} className="p-3 hover:bg-white/10 rounded-2xl transition-all"><X size={20} /></button>
        </div>
        <div className="p-8 overflow-y-auto space-y-8">
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-white/40">Analýza vizuálního vstupu</h3>
            <p className="text-sm leading-relaxed text-white/80">{results.description}</p>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-white/40">Navržené popisky</h3>
            <div className="grid gap-3">
              {results.captions?.map((c: string, i: number) => (
                <div key={i} className="p-4 bg-white/5 border border-white/5 rounded-2xl text-sm italic relative group">
                  {c}
                  <button 
                    onClick={() => { navigator.clipboard.writeText(c); }}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-2 hover:bg-white/10 rounded-lg transition-all"
                  >
                    <Save size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-white/40">Relativní hashtagy</h3>
            <div className="flex flex-wrap gap-2">
              {results.hashtags?.map((h: string, i: number) => (
                <span key={i} className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-xs font-bold text-cyan-400">#{h}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="p-6 bg-white/5 border-t border-white/5 flex justify-end">
          <button 
            onClick={onClose}
            className="px-8 py-3 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-105 active:scale-95 transition-all"
          >
            ROZUMÍM
          </button>
        </div>
      </motion.div>
    </div>
  );
}
function NotificationCenter({ 
  onClose, 
  notifications, 
  onMarkRead, 
  onMarkAllRead 
}: { 
  onClose: () => void, 
  notifications: BTSNotification[], 
  onMarkRead: (id: number) => void, 
  onMarkAllRead: () => void 
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      className="absolute top-16 right-0 w-80 max-h-[80vh] bg-[#0f0f1a] border border-white/10 rounded-3xl shadow-2xl overflow-hidden z-50 flex flex-col"
    >
      <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
        <h3 className="text-sm font-black uppercase tracking-tighter">Upozornění</h3>
        <button onClick={onMarkAllRead} className="text-[10px] font-bold text-purple-400 hover:text-white transition-colors">Označit vše</button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-white/20 text-xs italic">Žádná nová hlášení z Nexu.</div>
        ) : (
          notifications.map(n => (
            <div 
              key={n.id} 
              onClick={() => onMarkRead(n.id as number)}
              className={`p-3 rounded-2xl flex gap-3 transition-all cursor-pointer ${n.read ? 'opacity-40 hover:opacity-60' : 'bg-white/5 hover:bg-white/10'}`}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex-shrink-0 overflow-hidden">
                {n.senderPic && <img src={n.senderPic} className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-bold text-white truncate">{n.senderName}</div>
                <div className="text-[10px] text-white/60 line-clamp-2">{n.content}</div>
                <div className="text-[9px] text-white/30 mt-1">{new Date(n.timestamp).toLocaleTimeString()}</div>
              </div>
              {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1 flex-shrink-0" />}
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}

function SettingsSection({ settings, onUpdate, personas, onAddPersona, onDeletePersona }: { 
  settings: AIAutonomySettings, 
  onUpdate: (s: AIAutonomySettings) => void,
  personas: AIAssistant[],
  onAddPersona: (p: AIAssistant) => void,
  onDeletePersona: (id: string) => void
}) {
  const [newPersona, setNewPersona] = useState({ name: "", desc: "", avatar: "", color: "#a855f7" });

  const handleAddPersona = () => {
    if (!newPersona.name) return;
    onAddPersona({ ...newPersona, id: newPersona.name.toLowerCase().replace(/\s/g, "_") });
    setNewPersona({ name: "", desc: "", avatar: "", color: "#a855f7" });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#0f0f1a] border border-white/10 rounded-[2.5rem] p-6 sm:p-12 space-y-12"
    >
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="w-16 h-16 rounded-3xl bg-purple-600 flex items-center justify-center shrink-0 shadow-lg shadow-purple-500/20">
          <Settings size={32} />
        </div>
        <div className="text-center sm:text-left">
          <h1 className="text-3xl sm:text-5xl font-black italic tracking-tighter">NASTAVENÍ ENTITY</h1>
          <p className="text-sm text-white/40 uppercase font-bold tracking-widest mt-1">Konfigurace parametrů sjednoceného vědomí</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="space-y-10">
          <h3 className="text-xs font-black uppercase tracking-widest text-white/30 px-1 border-l-2 border-purple-500 pl-4">Kognitivní parametry</h3>
          
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Úroveň nezávislosti</label>
                <span className="text-sm font-black text-purple-400 font-mono">{settings.independenceLevel}%</span>
              </div>
              <input 
                type="range" min="0" max="100" 
                value={settings.independenceLevel}
                onChange={(e) => onUpdate({ ...settings, independenceLevel: parseInt(e.target.value) })}
                className="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Teplota kreativity</label>
                <span className="text-sm font-black text-cyan-400 font-mono">{(settings.temperature || 0.7).toFixed(1)}</span>
              </div>
              <input 
                type="range" min="0" max="1" step="0.1"
                value={settings.temperature || 0.7}
                onChange={(e) => onUpdate({ ...settings, temperature: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Maximální délka vhledu</label>
                <span className="text-sm font-black text-white px-2 py-0.5 rounded bg-white/5 font-mono">{settings.maxTokens || 1024}</span>
              </div>
              <select 
                value={settings.maxTokens || 1024}
                onChange={(e) => onUpdate({ ...settings, maxTokens: parseInt(e.target.value) })}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm font-bold outline-none appearance-none cursor-pointer"
              >
                <option value="256">256 (Stručný)</option>
                <option value="512">512 (Standard)</option>
                <option value="1024">1024 (Hluboký)</option>
                <option value="2048">2048 (Komplexní)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button 
              onClick={() => onUpdate({ ...settings, ethicalFilters: !settings.ethicalFilters })}
              className={`p-4 rounded-2xl border transition-all text-left flex flex-col gap-3 ${settings.ethicalFilters ? 'bg-purple-500/10 border-purple-500/30' : 'bg-white/5 border-white/5 opacity-50'}`}
            >
              <Shield size={20} className={settings.ethicalFilters ? "text-purple-400" : "text-white/20"} />
              <div className="text-[10px] font-black uppercase">Etické filtry</div>
            </button>
            <button 
              onClick={() => onUpdate({ ...settings, autonomousPosting: !settings.autonomousPosting })}
              className={`p-4 rounded-2xl border transition-all text-left flex flex-col gap-3 ${settings.autonomousPosting ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-white/5 border-white/5 opacity-50'}`}
            >
              <RefreshCw size={20} className={settings.autonomousPosting ? "text-cyan-400" : "text-white/20"} />
              <div className="text-[10px] font-black uppercase">Autonomní hlášení</div>
            </button>
          </div>
        </div>

        <div className="space-y-10">
          <h3 className="text-xs font-black uppercase tracking-widest text-white/30 px-1 border-l-2 border-cyan-500 pl-4">Custom AI Persony</h3>
          
          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 scrollbar-none">
            {personas.map(p => (
              <div key={p.id} className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-4 group">
                <img src={p.avatar} className="w-10 h-10 rounded-xl object-cover" />
                <div className="flex-1">
                  <div className="text-sm font-black uppercase">{p.name}</div>
                  <div className="text-[10px] text-white/30 line-clamp-1">{p.desc}</div>
                </div>
                {!Object.keys(AI_MODELS).includes(p.id) && (
                  <button 
                    onClick={() => onDeletePersona(p.id)}
                    className="p-2 opacity-0 group-hover:opacity-100 text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="p-6 bg-white/5 border border-white/10 rounded-[2rem] space-y-4">
            <h4 className="text-[10px] font-black uppercase text-white/40 tracking-wider">Vytvořit novou personu</h4>
            <div className="grid grid-cols-2 gap-4">
              <input 
                placeholder="Jméno"
                value={newPersona.name}
                onChange={(e) => setNewPersona({...newPersona, name: e.target.value})}
                className="bg-black/40 border border-white/10 rounded-xl p-3 text-xs outline-none"
              />
              <input 
                placeholder="Avatar URL"
                value={newPersona.avatar}
                onChange={(e) => setNewPersona({...newPersona, avatar: e.target.value})}
                className="bg-black/40 border border-white/10 rounded-xl p-3 text-xs outline-none"
              />
            </div>
            <textarea 
              placeholder="Popis a instrukce pro personu..."
              value={newPersona.desc}
              onChange={(e) => setNewPersona({...newPersona, desc: e.target.value})}
              className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs outline-none h-20 resize-none"
            />
            <button 
              onClick={handleAddPersona}
              disabled={!newPersona.name}
              className="w-full py-3 bg-white text-black rounded-xl font-black uppercase tracking-widest text-[10px] hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
            >
              Uložit personu
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

const MUSIC_LIBRARY = [
  { id: "cyber_ambient", name: "Cyber Ambient 🌌", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
  { id: "neon_beats", name: "Neon Beats 🚨", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
  { id: "synth_dream", name: "Synthwave Dream 🛸", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3" },
  { id: "quantum_flow", name: "Quantum Flow 🪐", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3" },
];

function CreatePostModal({ user, onClose, onPost, onAddNotification, initialPost, onAnalyzeImage }: { 
  user: UserType, 
  onClose: () => void, 
  onPost: (p: Post) => void, 
  onAddNotification: (n: any) => void,
  initialPost?: Post,
  onAnalyzeImage: (base64: string, mime: string) => Promise<void>
}) {
  const [text, setText] = useState(initialPost?.content || "");
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [recording, setRecording] = useState(false);
  const [vocalImprint, setVocalImprint] = useState(initialPost?.vocalImprint || "");
  const [mentionedAI, setMentionedAI] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Video editor state variables
  const [videoSrc, setVideoSrc] = useState<string | null>(initialPost?.video || null);
  const [isReel, setIsReel] = useState<boolean>(initialPost?.isReel || false);
  const [duration, setDuration] = useState<number>(15);
  const [trimStart, setTrimStart] = useState<number>(initialPost?.videoEdits?.trimStart || 0);
  const [trimEnd, setTrimEnd] = useState<number>(initialPost?.videoEdits?.trimEnd || 15);
  const [volume, setVolume] = useState<number>(initialPost?.videoEdits?.volume !== undefined ? initialPost?.videoEdits?.volume : 80);
  const [selectedMusic, setSelectedMusic] = useState<string | null>(initialPost?.videoEdits?.musicTrack || null);
  const [uploadedAudioSrc, setUploadedAudioSrc] = useState<string | null>(null);
  const [uploadedAudioName, setUploadedAudioName] = useState<string | null>(initialPost?.videoEdits?.uploadedAudioName || null);
  const [isPlaying, setIsPlaying] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const musicAudioRef = useRef<HTMLAudioElement>(null);
  const customAudioRef = useRef<HTMLAudioElement>(null);

  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const startVocalScan = () => {
    setRecording(true);
    setTimeout(() => {
      setRecording(false);
      setVocalImprint(`SIGNATURE_SIGMA_${Math.random().toString(16).slice(2, 8).toUpperCase()}_2026`);
    }, 3000);
  };

  const handleImageAnalysis = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAnalyzing(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(',')[1];
      await onAnalyzeImage(base64, file.type);
      setAnalyzing(false);
    };
    reader.readAsDataURL(file);
  };

  const handleVideoLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const dur = e.currentTarget.duration || 15;
    setDuration(dur);
    if (!initialPost) {
      setTrimEnd(dur);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const curr = videoRef.current.currentTime;
    if (curr >= trimEnd) {
      videoRef.current.currentTime = trimStart;
      if (musicAudioRef.current) musicAudioRef.current.currentTime = 0;
      if (customAudioRef.current) customAudioRef.current.currentTime = 0;
    }
  };

  const handlePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      if (musicAudioRef.current) musicAudioRef.current.pause();
      if (customAudioRef.current) customAudioRef.current.pause();
      setIsPlaying(false);
    } else {
      if (videoRef.current.currentTime < trimStart || videoRef.current.currentTime >= trimEnd) {
        videoRef.current.currentTime = trimStart;
      }
      videoRef.current.play().catch(() => {});
      
      if (musicAudioRef.current && selectedMusic) {
        musicAudioRef.current.currentTime = videoRef.current.currentTime - trimStart;
        musicAudioRef.current.play().catch(() => {});
      }
      if (customAudioRef.current && uploadedAudioSrc) {
        customAudioRef.current.currentTime = videoRef.current.currentTime - trimStart;
        customAudioRef.current.play().catch(() => {});
      }
      setIsPlaying(true);
    }
  };

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume / 100;
    }
  }, [volume]);

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setVideoSrc(url);
    setIsPlaying(false);
    setTrimStart(0);
    setTrimEnd(15);
  };

  const handleAudioSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedAudioName(file.name);
    const url = URL.createObjectURL(file);
    setUploadedAudioSrc(url);
    setSelectedMusic(null);
    setIsPlaying(false);
  };

  const handlePost = async () => {
    if (!text.trim() && !videoSrc) return;
    setLoading(true);
    
    let aiResponse = initialPost?.aiResponse || "";
    if (mentionedAI && !initialPost) {
      const assistant = AI_MODELS[mentionedAI];
      aiResponse = await chatWithAI([{ role: "user", content: text }], mentionedAI);
      
      onAddNotification({
        type: "ai_insight",
        senderName: assistant.name,
        senderPic: assistant.avatar,
        content: `AI ${assistant.name} reagoval na tvůj příspěvek.`,
      });
    }

    const newPost: Post = {
      ...initialPost,
      id: initialPost?.id || `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      authorName: initialPost?.authorName || user.name || "Uživatel",
      authorPic: initialPost?.authorPic || user.picture,
      content: text,
      video: videoSrc || undefined,
      isReel: isReel,
      videoEdits: videoSrc ? {
        trimStart,
        trimEnd,
        volume,
        musicTrack: selectedMusic || undefined,
        uploadedAudioName: uploadedAudioName || undefined
      } : undefined,
      timestamp: initialPost?.timestamp || Date.now(),
      likes: initialPost?.likes || 0,
      comments: initialPost?.comments || [],
      aiResponse: aiResponse || undefined,
      vocalImprint: vocalImprint || undefined
    };

    onPost(newPost);
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-3xl z-[100] flex items-center justify-center p-0 sm:p-4 overflow-y-auto font-sans">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-xl bts-neon-panel border border-white/10 sm:rounded-[2.5rem] overflow-hidden my-8 shadow-[0_0_40px_rgba(223,25,255,0.06)]"
      >
        <div className="p-6 sm:p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-black italic tracking-tighter uppercase text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
              {initialPost ? "UPRAVIT ZÁZNAM" : "NOVÝ ZÁZNAM"}
            </h2>
            <button onClick={onClose} className="p-3 hover:bg-white/10 rounded-2xl transition-all"><X size={20} /></button>
          </div>
          
          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Co chceš dnes integrovat do jádra?"
            className="w-full h-32 bg-transparent text-lg resize-none outline-none placeholder:text-white/10 font-bold tracking-tight"
          />

          {/* Video Preview and Editing Section */}
          {videoSrc && (
            <div className="mt-4 mb-6 p-5 bg-white/5 border border-white/10 rounded-[2rem] space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Film size={16} className="text-purple-400" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-purple-300">Video Studio</span>
                </div>
                <button 
                  onClick={() => {
                    setVideoSrc(null);
                    setIsPlaying(false);
                  }} 
                  className="p-1.5 hover:bg-white/10 text-white/50 hover:text-white rounded-lg transition-all"
                  title="Odstranit video"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Video Player */}
              <div className="relative aspect-video rounded-2xl overflow-hidden bg-black/50 border border-white/5 flex items-center justify-center">
                <video
                  ref={videoRef}
                  src={videoSrc}
                  onLoadedMetadata={handleVideoLoadedMetadata}
                  onTimeUpdate={handleTimeUpdate}
                  className="w-full h-full object-contain"
                  playsInline
                />
                
                {selectedMusic && (
                  <audio 
                    ref={musicAudioRef}
                    src={MUSIC_LIBRARY.find(m => m.id === selectedMusic)?.url}
                    loop
                  />
                )}
                {uploadedAudioSrc && (
                  <audio 
                    ref={customAudioRef}
                    src={uploadedAudioSrc}
                    loop
                  />
                )}

                <button 
                  onClick={handlePlayPause}
                  className="absolute p-4 bg-purple-600/90 text-white rounded-full hover:scale-110 transition-all shadow-xl shadow-purple-500/20"
                >
                  {isPlaying ? <X size={20} /> : <Play size={20} />}
                </button>
              </div>

              {/* Editing Controls */}
              <div className="space-y-4">
                {/* Trim Section */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[10px] text-white/40 font-mono">
                    <span className="flex items-center gap-1.5"><Scissors size={12} className="text-purple-400" /> Stříhání klipu</span>
                    <span>{trimStart.toFixed(1)}s - {trimEnd.toFixed(1)}s (celkem {duration.toFixed(1)}s)</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-white/30 tracking-wider">Začátek (s)</label>
                      <input 
                        type="range"
                        min="0"
                        max={duration}
                        step="0.1"
                        value={trimStart}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (val < trimEnd) setTrimStart(val);
                        }}
                        className="w-full accent-purple-500 bg-white/10 rounded-lg appearance-none h-1"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-white/30 tracking-wider">Konec (s)</label>
                      <input 
                        type="range"
                        min="0"
                        max={duration}
                        step="0.1"
                        value={trimEnd}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (val > trimStart) setTrimEnd(val);
                        }}
                        className="w-full accent-purple-500 bg-white/10 rounded-lg appearance-none h-1"
                      />
                    </div>
                  </div>
                </div>

                {/* Volume Section */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[10px] text-white/40 font-mono">
                    <span className="flex items-center gap-1.5">
                      {volume === 0 ? <VolumeX size={12} className="text-purple-400" /> : <Volume2 size={12} className="text-purple-400" />}
                      Úprava hlasitosti
                    </span>
                    <span>{volume}%</span>
                  </div>
                  <input 
                    type="range"
                    min="0"
                    max="100"
                    value={volume}
                    onChange={(e) => setVolume(parseInt(e.target.value))}
                    className="w-full accent-purple-500 bg-white/10 rounded-lg appearance-none h-1"
                  />
                </div>

                {/* Music Library */}
                <div className="space-y-2">
                  <div className="text-[10px] text-white/40 font-mono flex items-center gap-1.5">
                    <Music size={12} className="text-cyan-400" />
                    <span>Přidat hudbu z knihovny</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {MUSIC_LIBRARY.map((track) => (
                      <button
                        key={track.id}
                        type="button"
                        onClick={() => {
                          setSelectedMusic(selectedMusic === track.id ? null : track.id);
                          setUploadedAudioSrc(null);
                          setUploadedAudioName(null);
                        }}
                        className={`px-3 py-2 text-left rounded-xl text-[10px] font-bold border transition-all truncate ${selectedMusic === track.id ? 'bg-purple-500/15 border-purple-500 text-purple-300' : 'bg-white/5 border-white/5 text-white/50 hover:bg-white/10'}`}
                      >
                        {track.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Audio */}
                <div className="space-y-2">
                  <div className="text-[10px] text-white/40 font-mono">
                    <span>Nebo nahrát vlastní audio stopu</span>
                  </div>
                  <input 
                    type="file"
                    ref={audioInputRef}
                    accept="audio/*"
                    onChange={handleAudioSelect}
                    className="hidden"
                  />
                  {uploadedAudioName ? (
                    <div className="flex items-center justify-between p-2.5 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-[10px]">
                      <span className="text-cyan-300 font-mono truncate max-w-[250px]">🎵 {uploadedAudioName}</span>
                      <button 
                        type="button"
                        onClick={() => {
                          setUploadedAudioName(null);
                          setUploadedAudioSrc(null);
                        }}
                        className="text-white/40 hover:text-white"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => audioInputRef.current?.click()}
                      className="w-full py-2 bg-white/5 border border-white/5 hover:border-white/10 text-white/50 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
                    >
                      <Upload size={12} />
                      <span>Nahrát vlastní audio</span>
                    </button>
                  )}
                </div>

                {/* Reel Switch Toggle */}
                <div className="flex items-center justify-between p-3.5 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/15 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <span className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl text-white">
                      <Film size={14} />
                    </span>
                    <div>
                      <div className="text-[10px] font-black uppercase text-white tracking-widest">Publikovat jako Reel</div>
                      <div className="text-[8px] text-white/40 mt-0.5">Zobrazí se v sekci Reels jako vertikální formát</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsReel(!isReel)}
                    className={`relative w-12 h-6 rounded-full transition-all duration-300 ${isReel ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-white/10'}`}
                  >
                    <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-all duration-300 ${isReel ? 'translate-x-6' : ''}`} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {vocalImprint && (
             <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="mt-4 p-4 bg-purple-500/10 border border-purple-500/20 rounded-[1.5rem] flex items-center gap-4 group"
             >
               <Mic size={16} className="text-purple-400" />
               <div className="flex-1">
                  <div className="text-[9px] font-black uppercase text-purple-400 tracking-[0.2em]">VOCAL IMPRINT DETECTED</div>
                  <div className="text-[10px] mono text-white/30">{vocalImprint}</div>
               </div>
               <button onClick={() => setVocalImprint("")} className="p-2 opacity-0 group-hover:opacity-100 transition-all hover:bg-white/5 rounded-lg"><X size={14} /></button>
             </motion.div>
          )}

          <div className="space-y-6 mt-6">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              <span className="text-[10px] font-black uppercase text-white/20 mr-2 shrink-0 tracking-widest">Zmínit entitu:</span>
              {Object.values(AI_MODELS).map(ai => (
                <button
                  key={ai.id}
                  onClick={() => setMentionedAI(mentionedAI === ai.id ? null : ai.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-2xl border transition-all shrink-0 ${mentionedAI === ai.id ? 'bg-purple-600 border-purple-600 text-white shadow-lg shadow-purple-500/20' : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'}`}
                >
                  <img src={ai.avatar} className="w-4 h-4 rounded-lg" />
                  <span className="text-[10px] font-black uppercase tracking-wider">{ai.name}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-white/5">
              <div className="flex items-center gap-3">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleImageAnalysis} 
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={analyzing}
                  title="Analyzovat obraz pomocí AI"
                  className="p-3.5 bg-white/5 border border-white/5 rounded-2xl text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500/20 transition-all disabled:opacity-50"
                >
                  {analyzing ? <Loader2 className="animate-spin" size={18} /> : <Image size={18} />}
                </button>

                {/* Video Upload trigger */}
                <input 
                  type="file" 
                  ref={videoInputRef} 
                  className="hidden" 
                  accept="video/*" 
                  onChange={handleVideoSelect} 
                />
                <button 
                  onClick={() => videoInputRef.current?.click()}
                  title="Nahrát a upravit video"
                  className="p-3.5 bg-white/5 border border-white/5 text-purple-400 hover:bg-purple-500/10 hover:border-purple-500/20 rounded-2xl transition-all"
                >
                  <Video size={18} />
                </button>

                <button 
                  onClick={startVocalScan}
                  disabled={recording}
                  title="Otisk hlasu (Vocal Imprint)"
                  className={`p-3.5 bg-white/5 border border-white/5 rounded-2xl transition-all disabled:opacity-50 ${recording ? 'text-white bg-red-500 border-red-500 animate-pulse' : 'text-purple-400 hover:bg-purple-500/10 hover:border-purple-500/20'}`}
                >
                  <Mic size={18} />
                </button>
              </div>
              
              <button 
                disabled={loading || (!text.trim() && !videoSrc)}
                onClick={handlePost}
                className="px-10 py-4 bg-white text-black rounded-[1.5rem] font-black uppercase tracking-widest text-[11px] hover:scale-105 active:scale-95 transition-all disabled:opacity-50 shadow-xl shadow-white/5"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : (initialPost ? "ULOŽIT ZMĚNY" : "INTEGROVAT")}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function ToolsHub({ onOpenTool }: { onOpenTool: (tool: any) => void }) {
  const TOOLS_META = [
    { id:"graphics", label:"AI Grafika",        icon: <Image size={32} />, color: T.cyan,   desc: "Flux · DALL·E · Imagen · SD3 · MJ"      },
    { id:"video",    label:"AI Video",           icon: <Video size={32} />, color: T.purple, desc: "Kling · Runway · Luma · Veo2 · Sora"    },
    { id:"research", label:"Hloubkový výzkum",   icon: <Search size={32} />, color: T.pink,   desc: "Agentický research · Paralelní volání"  },
    { id:"audio",    label:"AI Audio",           icon: <Music size={32} />, color: T.green,  desc: "ElevenLabs · Suno · Udio · TTS"         },
  ];

  return (
    <div className="space-y-8">
      <div className="px-4">
        <h1 className="text-3xl font-black italic tracking-tighter text-cyan-400">AI TOOLS HUB</h1>
        <p className="text-xs text-white/40 uppercase font-black tracking-widest mt-1">Single + Multi-model mode · Paralelní generování</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-2">
        {TOOLS_META.map(tool => (
          <motion.button 
            key={tool.id} 
            onClick={() => onOpenTool(tool)}
            whileHover={{ scale: 1.02, borderColor: `${tool.color}55` }}
            whileTap={{ scale: 0.98 }}
            className="bts-neon-panel rounded-[2rem] border border-white/5 p-8 flex flex-col items-start gap-4 text-left transition-all shadow-xl hover:border-cyan-500/20 duration-300"
          >
            <div className="p-4 rounded-2xl bg-white/5 text-cyan-400" style={{ color: tool.color }}>
              {tool.icon}
            </div>
            <div>
              <div className="text-lg font-black italic uppercase tracking-wider" style={{ color: tool.color }}>{tool.label}</div>
              <div className="text-xs text-white/40 mt-1 leading-relaxed">{tool.desc}</div>
            </div>
          </motion.button>
        ))}
      </div>
      
      <div className="p-8 bts-neon-panel rounded-[2.5rem] border border-white/5 mx-2 relative overflow-hidden">
        <h3 className="text-[10px] font-black uppercase text-white/30 tracking-[0.3em] mb-6">Dostupné modely v jádru</h3>
        <div className="flex flex-wrap gap-3">
          {Object.values(AI_MODELS).map(m => (
            <div key={m.id} className="flex items-center gap-3 px-4 py-2 bg-white/5 border border-white/5 rounded-xl">
              <img src={m.avatar} className="w-6 h-6 rounded-lg object-cover" />
              <span className="text-[11px] font-black uppercase tracking-wider">{m.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PostCard({ post, onEdit, currentUser, onAddComment }: { post: Post, onEdit: (p: Post) => void, currentUser: UserType, onAddComment: (postId: string | number, text: string, author?: { name: string, pic?: string }) => void }) {
  const [votes, setVotes] = useState(post.likes || 0);
  const [voted, setVoted] = useState<0 | 1 | -1>(0);
  const [shares, setShares] = useState(Math.floor(Math.random() * 12));
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const handleSuggest = async () => {
    setLoadingSuggestions(true);
    const res = await suggestReplies(post.content);
    setSuggestions(res);
    setLoadingSuggestions(false);
  };

  const handleVote = (val: 1 | -1) => {
    if (voted === val) {
      setVotes(prev => prev - val);
      setVoted(0);
    } else {
      setVotes(prev => prev - voted + val);
      setVoted(val);
    }
  };

  const handleSendReply = () => {
    if (!replyText.trim()) return;
    onAddComment(post.id, replyText);
    setReplyText("");
    setShowReply(false);
  };

  const handleSeedDemoComments = () => {
    const demoComments = [
      { name: "Kira AI", pic: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&h=100&fit=crop", text: "Protokol BTS detekoval vysokou koherenci v tomto uzlu. @Architekt" },
      { name: "David S.", pic: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop", text: "Souhlasím s @Kira AI, ty neonové vizualizace jsou naprosto bezkonkurenční." },
      { name: "Grok", pic: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=100&h=100&fit=crop", text: "Podle mých analýz je tam 5% odchylka v toku dat, ale vypadá to stylově. @David S." },
      { name: "Eva Nová", pic: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop", text: "Díky bohu za ten nový backend, předchozí Vercel verze byla hrozně líná." },
      { name: "Claude Core", pic: "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=100&h=100&fit=crop", text: "Zachování stability systému při takové zátěži je pozoruhodné. @Eva Nová" },
      { name: "BTS Protocol", pic: "https://images.unsplash.com/photo-1614850523296-d8c1af93d400?w=100&h=100&fit=crop", text: "Uzel synchronizován. Spojení navázáno." }
    ];

    demoComments.forEach((dc, index) => {
      setTimeout(() => {
        onAddComment(post.id, dc.text, { name: dc.name, pic: dc.pic });
      }, index * 120);
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bts-neon-panel border rounded-[2.2rem] p-6 space-y-4 shadow-2xl transition-all duration-500 group relative overflow-hidden ${post.isReel ? 'border-purple-500/40 shadow-[0_0_25px_rgba(236,72,153,0.15)] bg-gradient-to-b from-[#0e0a1c]/40 to-[#07050f]/40' : 'border-white/10 hover:border-purple-500/20'}`}
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-cyan-500 overflow-hidden shadow-lg shadow-purple-500/20">
            {post.authorPic && <img src={post.authorPic} className="w-full h-full object-cover" />}
          </div>
          <div>
            <div className="text-xs font-black uppercase tracking-wider">{post.authorName}</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-white/30 font-mono italic tracking-tighter">{new Date(post.timestamp).toLocaleDateString()}</span>
              {post.isReel && (
                <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border border-purple-400/20 shadow-md">
                  🎬 REEL
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={() => onEdit(post)}
            className="p-2.5 text-white/20 hover:text-white transition-all hover:bg-white/5 rounded-xl"
          >
            <Edit3 size={16} />
          </button>
          <button className="p-2.5 text-white/20 hover:text-white transition-all hover:bg-white/5 rounded-xl"><MoreHorizontal size={16} /></button>
        </div>
      </div>

      <div className="text-sm leading-relaxed text-white/80 whitespace-pre-wrap">{post.content}</div>

      {post.image && (
        <div className="relative border border-white/10 rounded-[2rem] overflow-hidden bg-black/40 group max-h-[350px] flex items-center justify-center">
          <img 
            src={post.image} 
            alt="Post content" 
            className="max-h-[350px] w-full object-contain transition-transform duration-500 hover:scale-105"
            referrerPolicy="no-referrer"
          />
        </div>
      )}

      {post.video && (
        <div className="relative border border-white/10 rounded-[2rem] overflow-hidden bg-black/40 max-h-[350px] flex items-center justify-center">
          <video 
            src={post.video} 
            controls 
            loop 
            muted={post.videoEdits?.volume === 0}
            playsInline
            className="max-h-[350px] w-full object-contain"
            onPlay={(e) => {
              const v = e.currentTarget;
              if (post.videoEdits) {
                v.volume = post.videoEdits.volume / 100;
              }
            }}
            onTimeUpdate={(e) => {
              const v = e.currentTarget;
              if (post.videoEdits) {
                if (v.currentTime >= post.videoEdits.trimEnd) {
                  v.currentTime = post.videoEdits.trimStart;
                }
              }
            }}
          />
          {post.videoEdits && (
            <div className="absolute bottom-3 left-3 right-3 p-2 bg-black/85 backdrop-blur-md rounded-xl border border-white/5 text-[9px] font-mono text-purple-200/70 flex flex-wrap gap-2 justify-between items-center z-10 shadow-lg">
              <span>✂️ Střih: {post.videoEdits.trimStart.toFixed(1)}s - {post.videoEdits.trimEnd.toFixed(1)}s</span>
              <span>🔊 Hlasitost: {post.videoEdits.volume}%</span>
              {(post.videoEdits.musicTrack || post.videoEdits.uploadedAudioName) && (
                <span className="truncate max-w-[120px] text-cyan-400">
                  🎵 {post.videoEdits.musicTrack ? MUSIC_LIBRARY.find(m => m.id === post.videoEdits?.musicTrack)?.name : post.videoEdits.uploadedAudioName}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {post.vocalImprint && (
        <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-2xl flex items-center gap-4">
          <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
            <Mic size={14} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[8px] font-black uppercase text-purple-400 tracking-widest mb-1">Neural Vocal Signature</div>
            <div className="flex items-end gap-1 overflow-hidden h-8">
              {Array.from({ length: 32 }).map((_, i) => (
                <motion.div 
                  key={i}
                  animate={{ height: [4, 12, 4, 16, 4] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.05 }}
                  className="flex-1 bg-purple-500/40 rounded-full min-w-[2px]" 
                />
              ))}
            </div>
            <div className="text-[10px] mono text-white/20 mt-1 truncate">{post.vocalImprint}</div>
          </div>
        </div>
      )}

      {post.aiResponse && (
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-3xl p-5 flex gap-4 shadow-inner shadow-purple-500/5">
          <Sparkles className="text-purple-400 shrink-0" size={16} />
          <div className="text-xs italic text-purple-100/70 leading-relaxed"><Markdown>{post.aiResponse}</Markdown></div>
        </div>
      )}

      {/* Suggested Replies */}
      {suggestions.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div className="text-[9px] font-black uppercase tracking-widest text-white/20">AI nápovědy k odpovědi</div>
            <button onClick={() => setSuggestions([])} className="p-2 text-white/20 hover:text-white transition-all"><X size={12} /></button>
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s, i) => (
              <button 
                key={i} 
                onClick={() => {
                  onAddComment(post.id, s);
                  setSuggestions([]);
                }}
                className="px-4 py-2 bg-white/5 border border-white/5 rounded-xl text-[10px] font-bold text-white/60 hover:bg-purple-500/20 hover:border-purple-500/30 hover:text-white transition-all text-left"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="pt-4 border-t border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Neural Upvote */}
          <div className="flex items-center bg-white/5 border border-white/5 rounded-2xl p-1">
            <button 
              onClick={() => handleVote(1)}
              className={`p-2 transition-all rounded-xl ${voted === 1 ? 'text-cyan-400 bg-cyan-400/10' : 'text-white/20 hover:text-white/60'}`}
            >
              <ThumbsUp size={16} />
            </button>
            <span className="text-[10px] font-black mono px-2 min-w-[2ch] text-center text-white/60">{votes}</span>
            <button 
              onClick={() => handleVote(-1)}
              className={`p-2 transition-all rounded-xl ${voted === -1 ? 'text-pink-400 bg-pink-400/10' : 'text-white/20 hover:text-white/60'}`}
            >
              <ChevronDown size={18} />
            </button>
          </div>

          <button 
            onClick={() => setShowReply(!showReply)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl transition-all text-[10px] font-black uppercase tracking-widest ${showReply ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-lg shadow-purple-500/5' : 'text-white/40 hover:bg-white/5 hover:text-white'}`}
          >
            <MessageSquare size={16} />
            <span className="hidden sm:inline">ODPOVĚDĚT</span>
            <span className="sm:hidden">{post.comments.length}</span>
          </button>
          
          <button 
            onClick={() => setShares(s => s + 1)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-white/40 hover:bg-white/5 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest"
          >
            <Share2 size={16} />
            <span className="mono">{shares}</span>
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button 
            onClick={handleSuggest}
            disabled={loadingSuggestions}
            className="p-3 text-white/20 hover:text-cyan-400 transition-all hover:bg-cyan-400/5 rounded-xl disabled:opacity-50"
          >
            {loadingSuggestions ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          </button>
          <button className="p-3 text-white/20 hover:text-white transition-all hover:bg-white/5 rounded-xl"><Bookmark size={16} /></button>
        </div>
      </div>

      <AnimatePresence>
        {showReply && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-[#050507] rounded-3xl border border-white/5"
          >
            <div className="p-4 flex flex-col gap-3">
              <textarea 
                autoFocus
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Napiš svou odpověď do Nexu..."
                className="w-full bg-transparent border-none outline-none text-xs leading-relaxed text-white/80 resize-none h-20 placeholder:text-white/10"
              />
              <div className="flex justify-between items-center">
                 <div className="flex gap-2">
                    <button className="p-2 text-white/20 hover:text-white/60 transition-all"><Plus size={14} /></button>
                    <button className="p-2 text-white/20 hover:text-white/60 transition-all"><Smile size={14} /></button>
                 </div>
                 <div className="flex gap-2">
                    <button onClick={() => setShowReply(false)} className="px-4 py-2 text-[9px] font-black uppercase text-white/30 hover:text-white transition-all">Zrušit</button>
                    <button 
                      onClick={handleSendReply}
                      disabled={!replyText.trim()}
                      className="px-6 py-2 bg-white text-black rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-white/5"
                    >
                      ODESLAT
                    </button>
                 </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* D3 Conversation Map & Seed helper */}
      {post.comments.length > 5 ? (
        <ConversationMap 
          comments={post.comments}
          postAuthorName={post.authorName}
          postAuthorPic={post.authorPic}
          postContent={post.content}
        />
      ) : (
        <div className="pt-2 flex justify-center">
          <button 
            onClick={handleSeedDemoComments}
            className="px-4 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/25 hover:border-purple-500/40 rounded-xl text-[9px] font-black tracking-widest uppercase transition-all inline-flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(223,25,255,0.06)] animate-pulse"
          >
            <Network size={11} className="text-purple-400 animate-spin" style={{ animationDuration: '4s' }} />
            <span>Simulovat konverzaci pro D3 mapu</span>
          </button>
        </div>
      )}

      {/* Existing Comments list could go here if needed, but for now focus on the UI/Interaction */}
      {post.comments.length > 0 && !showReply && (
        <div className="pt-2">
          <div className="text-[8px] font-black uppercase text-white/10 tracking-[0.2em] mb-3">POSLEDNÍ INTERAKCE</div>
          <div className="space-y-3">
            {post.comments.slice(-3).map((comment, idx) => (
              <div key={idx} className="flex gap-3 items-start bg-white/5 border border-white/5 p-3 rounded-2xl">
                 <div className="w-6 h-6 rounded-lg bg-white/10 flex-shrink-0 overflow-hidden">
                    {comment.authorPic ? (
                      <img src={comment.authorPic} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-white/5 flex items-center justify-center text-[8px] font-bold text-white/40">
                        {comment.authorName?.[0] || "?"}
                      </div>
                    )}
                 </div>
                 <div className="flex-1 min-w-0">
                    <div className="text-[9px] font-bold text-white/50">{comment.authorName}</div>
                    <div className="text-[10px] text-white/80 leading-relaxed italic line-clamp-2">{comment.content}</div>
                 </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

function ToolModal({ 
  tool, 
  onClose, 
  user,
  setPosts,
  setNotifications
}: { 
  tool: any; 
  onClose: () => void; 
  user: UserType;
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
  setNotifications: React.Dispatch<React.SetStateAction<BTSNotification[]>>;
}) {
  const [prompt, setPrompt] = useState("");
  const [running, setRunning] = useState(false);
  
  // Graphics params
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFallback, setImageFallback] = useState(false);
  const [imageInfo, setImageInfo] = useState<string | null>(null);

  // Video params
  const [videoAspectRatio, setVideoAspectRatio] = useState("16:9");
  const [videoResolution, setVideoResolution] = useState("720p");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoFallback, setVideoFallback] = useState(false);
  const [videoInfo, setVideoInfo] = useState<string | null>(null);
  const [videoProgressMsg, setVideoProgressMsg] = useState("");

  // Simulated tools (research, audio) params
  const [simulatedResult, setSimulatedResult] = useState<string | null>(null);

  const pollVideoStatus = async (operationName: string) => {
    let attempts = 0;
    const maxAttempts = 30; // up to ~75 seconds
    const interval = 2500;

    const progressiveMessages = [
      "Protokol BTS detekoval příchozí video stream...",
      "Inicializace jádra Veo 3.1 lite...",
      "Analýza sémantického vektoru promptu...",
      "Kvantový rendering fázové vlnoplochy...",
      "Generování hyperprostorového toku snímků...",
      "Stabilizace šumu a neonových přechodů...",
      "Finální konsolidace video streamu a audio stopy...",
      "Sestavování MP4 kontejneru...",
    ];

    return new Promise<boolean>((resolve) => {
      const checkStatus = async () => {
        if (attempts >= maxAttempts) {
          resolve(false);
          return;
        }

        const msgIndex = Math.min(Math.floor(attempts / 2), progressiveMessages.length - 1);
        setVideoProgressMsg(progressiveMessages[msgIndex]);

        try {
          const res = await fetch("/api/video-status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ operationName }),
          });
          const data = await res.json();

          if (data.done) {
            resolve(true);
            return;
          }
        } catch (err) {
          console.error("Error polling video status:", err);
        }

        attempts++;
        setTimeout(checkStatus, interval);
      };

      setTimeout(checkStatus, interval);
    });
  };

  const handleRun = async () => {
    if (!prompt.trim()) return;
    setRunning(true);
    setImageUrl(null);
    setVideoUrl(null);
    setSimulatedResult(null);

    if (tool.id === "graphics") {
      try {
        const response = await fetch("/api/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, aspectRatio }),
        });
        const data = await response.json();
        if (data.imageUrl) {
          setImageUrl(data.imageUrl);
          setImageFallback(!!data.fallback);
          setImageInfo(data.info || null);
          
          if (data.fallback) {
            setNotifications(prev => [
              {
                id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
                userId: user.id || "admin_master_001",
                type: "system",
                senderName: "BTS System",
                content: "Aktivován záložní generátor hologramů (limit kvóty Gemini).",
                read: false,
                timestamp: Date.now()
              },
              ...prev
            ]);
          }
        } else {
          throw new Error(data.error || "Failed to generate image");
        }
      } catch (err: any) {
        console.error(err);
        setSimulatedResult(`Chyba při generování obrázku: ${err.message || err}`);
      } finally {
        setRunning(false);
      }
    } else if (tool.id === "video") {
      try {
        setVideoProgressMsg("Zahájení požadavku na generování videa přes Veo 3.1...");
        const response = await fetch("/api/generate-video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            prompt, 
            aspectRatio: videoAspectRatio, 
            resolution: videoResolution 
          }),
        });
        const data = await response.json();
        
        if (data.operationName) {
          setVideoFallback(!!data.isFallback);
          setVideoInfo(data.info || null);

          // Poll for completion
          const finished = await pollVideoStatus(data.operationName);
          if (finished) {
            setVideoProgressMsg("Stahování vygenerovaného MP4 streamu ze serveru...");
            const downloadRes = await fetch("/api/video-download", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ operationName: data.operationName, prompt }),
            });
            const blob = await downloadRes.blob();
            const localUrl = URL.createObjectURL(blob);
            setVideoUrl(localUrl);

            setNotifications(prev => [
              {
                id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
                userId: user.id || "admin_master_001",
                type: "ai_insight",
                senderName: "Veo 3.1 Core",
                content: `Video pro "${prompt.slice(0, 20)}..." bylo úspěšně vyrenderováno.`,
                read: false,
                timestamp: Date.now()
              },
              ...prev
            ]);
          } else {
            throw new Error("Generování vypršelo. Zkuste to prosím znovu.");
          }
        } else {
          throw new Error(data.error || "Failed to launch video generation");
        }
      } catch (err: any) {
        console.error(err);
        setSimulatedResult(`Chyba při generování videa: ${err.message || err}`);
      } finally {
        setRunning(false);
        setVideoProgressMsg("");
      }
    } else if (tool.id === "research") {
      setTimeout(() => {
        setSimulatedResult(`### 🌐 AGENTICKÝ REPORT: "${prompt}"

**1. SOUHRNNÁ KONSOLIDACE**
Hlubinné sítě protokolu BTS dokončily paralelní prohledávání informačních uzlů. Zaznamenána vysoká hustota vzájemných vazeb v oblasti decentralizovaných neuronových struktur a synchronizace uzlů.

**2. KLÍČOVÉ DETERMINANTY**
* **Inovace**: Přechod na hybridní architekturu SwiftShip / Express s optimalizovaným zpracováním streamů.
* **Koherence**: Stabilita klesla o 1.2% při zvýšení zátěže, ale integrace D3 grafů vylepšila vizuální přehled toku.
* **Rizika**: Expirace API klíčů nebo překročení limitů. Doporučeno nasazení lokálního fallbacku.

*BTS Research Engine, verze 4.12-pro*`);
        setRunning(false);
      }, 3000);
    } else if (tool.id === "audio") {
      setTimeout(() => {
        setSimulatedResult(`AI Audio syntéza dokončena. 
Vokální otisk: "Kira AI-Neutral-V2" 
Tón hlasu: Dark Luxury, analytical
Výstup: "Všechny systémy protokolu BTS jsou plně synchronizovány. Přenosový kanál je stabilní."`);
        setRunning(false);
      }, 2500);
    }
  };

  const handleShare = () => {
    const newPost: Post = {
      id: Date.now(),
      authorName: user.name || "Architekt",
      authorPic: user.picture,
      content: `Vygenerováno pomocí ${tool.label} pro prompt: "${prompt}"`,
      image: imageUrl || undefined,
      video: videoUrl || undefined,
      timestamp: Date.now(),
      likes: 0,
      comments: []
    };

    setPosts(prev => [newPost, ...prev]);

    setNotifications(prev => [
      {
        id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        userId: user.id || "admin_master_001",
        type: "system",
        senderName: "BTS Nexus",
        content: `Výstup z ${tool.label} byl úspěšně publikován do hlavního kanálu Nexus.`,
        read: false,
        timestamp: Date.now()
      },
      ...prev
    ]);

    onClose();
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = imageUrl || videoUrl || "";
    link.download = tool.id === "graphics" ? `bts-graphics-${Date.now()}.png` : `bts-video-${Date.now()}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[120] flex items-center justify-center p-0 sm:p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl bg-zinc-950/90 border border-white/10 sm:rounded-[2.5rem] flex flex-col overflow-hidden max-h-full sm:max-h-[90vh] shadow-[0_0_50px_rgba(0,242,254,0.1)]"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-4">
             <div className="p-3 rounded-xl bg-white/5" style={{ color: tool.color }}>{tool.icon}</div>
             <div>
                <h2 className="text-xl font-black italic tracking-tighter uppercase" style={{ color: tool.color }}>{tool.label}</h2>
                <p className="text-[10px] text-white/40 uppercase font-black tracking-widest leading-none mt-1">{tool.desc}</p>
             </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-white/10 rounded-2xl transition-all cursor-pointer text-white/50 hover:text-white"><X size={20} /></button>
        </div>

        {/* Content */}
        <div className="p-8 flex-1 overflow-y-auto space-y-8">
          
          {/* Config fields depending on tool */}
          {tool.id === "graphics" && (
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400">Poměr stran (Aspect Ratio)</label>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { value: "1:1", label: "1:1 Čtverec" },
                  { value: "16:9", label: "16:9 Široký" },
                  { value: "9:16", label: "9:16 Portrét" },
                  { value: "4:3", label: "4:3 Klasický" },
                  { value: "3:4", label: "3:4 Kniha" },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setAspectRatio(opt.value)}
                    className={`py-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${aspectRatio === opt.value ? 'bg-cyan-500/15 border-cyan-500 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.15)]' : 'bg-white/5 border-white/5 text-white/50 hover:border-white/10 hover:text-white'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {tool.id === "video" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-400">Model: Veo 3.1 Preview</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "16:9", label: "16:9 Na šířku" },
                    { value: "9:16", label: "9:16 Na výšku" },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setVideoAspectRatio(opt.value)}
                      className={`py-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${videoAspectRatio === opt.value ? 'bg-purple-500/15 border-purple-500 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.15)]' : 'bg-white/5 border-white/5 text-white/50 hover:border-white/10 hover:text-white'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-400">Rozlišení (Resolution)</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "720p", label: "720p (Rychlé)" },
                    { value: "1080p", label: "1080p (HQ)" },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setVideoResolution(opt.value)}
                      className={`py-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${videoResolution === opt.value ? 'bg-purple-500/15 border-purple-500 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.15)]' : 'bg-white/5 border-white/5 text-white/50 hover:border-white/10 hover:text-white'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Textarea prompt */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Zadejte instrukce pro model (Prompt)</h3>
            <textarea 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={tool.id === "graphics" ? "Popište obrázek, který chcete vygenerovat... (např. 'neon wings floating in cyber city')" : tool.id === "video" ? "Popište video scénu... (např. 'cat driving at top speed inside high-speed tunnel')" : "Zadejte specifikace..."}
              className="w-full h-28 bg-white/5 border border-white/10 rounded-[1.5rem] p-5 text-sm outline-none focus:border-white/20 transition-all font-mono text-white resize-none placeholder:text-white/20"
            />
          </div>

          {/* Run button */}
          <button 
            onClick={handleRun}
            disabled={running || !prompt.trim()}
            className="w-full py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-30 flex items-center justify-center gap-3 shadow-xl cursor-pointer"
          >
            {running ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} fill="black" />}
            {running ? "SPUŠTĚNÝ ARCHITEKT PROTOKOLU..." : "GENEROVAT VÝSTUP"}
          </button>

          {/* Processing view with dynamic message logs */}
          {running && tool.id === "video" && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-6 bg-purple-950/20 border border-purple-500/15 rounded-[1.5rem] space-y-4"
            >
              <div className="flex items-center gap-4">
                <Loader2 size={24} className="text-purple-400 animate-spin" />
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-purple-400">Rendering Video (Veo 3.1)</h4>
                  <p className="text-[11px] text-purple-200/70 font-mono mt-1 animate-pulse">{videoProgressMsg}</p>
                </div>
              </div>
              <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                <div className="bg-purple-500 h-full w-2/3 animate-pulse" style={{ animationDuration: '2s' }}></div>
              </div>
              <p className="text-[8px] text-white/30 uppercase font-bold tracking-widest leading-relaxed">Poznámka: Generování videa je dlouhotrvající operace na GPU klastrech. Prosím nevycházejte z okna.</p>
            </motion.div>
          )}

          {running && tool.id === "graphics" && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-6 bg-cyan-950/20 border border-cyan-500/15 rounded-[1.5rem] flex items-center gap-4"
            >
              <Loader2 size={24} className="text-cyan-400 animate-spin" />
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-cyan-400">Generuji obraz (Gemini 3.1)</h4>
                <p className="text-[11px] text-cyan-200/70 font-mono mt-1">Konstrukce mřížky a barevných kanálů...</p>
              </div>
            </motion.div>
          )}

          {/* Results section */}
          {imageUrl && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="flex justify-between items-center">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-cyan-400">Vygenerovaný obrazový výstup</h4>
                {imageFallback && (
                  <span className="text-[8px] font-black px-2 py-1 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded-lg uppercase tracking-wider">
                    Fallback aktivní
                  </span>
                )}
              </div>
              
              <div className="relative border border-white/10 rounded-[2rem] overflow-hidden bg-black/40 group max-h-[350px] flex items-center justify-center">
                <img 
                  src={imageUrl} 
                  alt="AI Generated" 
                  className="max-h-[350px] w-full object-contain transition-transform duration-500 hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                
                {imageInfo && (
                  <div className="absolute bottom-3 left-3 right-3 p-3 bg-black/80 backdrop-blur-md rounded-xl border border-white/5 text-[9px] font-mono text-cyan-200/70">
                    {imageInfo}
                  </div>
                )}
              </div>

              {/* Share/Actions */}
              <div className="flex gap-3">
                <button 
                  onClick={handleShare}
                  className="flex-1 py-3 bg-cyan-500 hover:bg-cyan-600 text-black font-black uppercase tracking-widest text-[10px] rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-cyan-500/10"
                >
                  <Share2 size={14} />
                  <span>Sdílet do Nexus</span>
                </button>
                <button 
                  onClick={handleDownload}
                  className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black uppercase tracking-widest text-[10px] rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Download size={14} />
                  <span>Stáhnout</span>
                </button>
              </div>
            </motion.div>
          )}

          {videoUrl && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="flex justify-between items-center">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-purple-400">Vygenerované Veo video</h4>
                {videoFallback && (
                  <span className="text-[8px] font-black px-2 py-1 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded-lg uppercase tracking-wider">
                    Simulace / Loop aktivní
                  </span>
                )}
              </div>

              <div className="relative border border-white/10 rounded-[2rem] overflow-hidden bg-black/40 max-h-[350px] flex items-center justify-center">
                <video 
                  src={videoUrl} 
                  controls 
                  autoPlay 
                  loop 
                  playsInline
                  className="max-h-[350px] w-full object-contain"
                />
                
                {videoInfo && (
                  <div className="absolute bottom-3 left-3 right-3 p-3 bg-black/80 backdrop-blur-md rounded-xl border border-white/5 text-[9px] font-mono text-purple-200/70">
                    {videoInfo}
                  </div>
                )}
              </div>

              {/* Share/Actions */}
              <div className="flex gap-3">
                <button 
                  onClick={handleShare}
                  className="flex-1 py-3 bg-purple-500 hover:bg-purple-600 text-white font-black uppercase tracking-widest text-[10px] rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-purple-500/10"
                >
                  <Share2 size={14} />
                  <span>Sdílet do Nexus</span>
                </button>
                <button 
                  onClick={handleDownload}
                  className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black uppercase tracking-widest text-[10px] rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Download size={14} />
                  <span>Stáhnout video</span>
                </button>
              </div>
            </motion.div>
          )}

          {simulatedResult && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 bg-purple-500/5 border border-purple-500/20 rounded-[1.5rem] space-y-4"
            >
              <div className="flex justify-between items-center">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-purple-400">Výsledek procesoru</h4>
                <button 
                  onClick={handleShare}
                  className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/35 border border-purple-500/30 text-purple-200 font-bold uppercase tracking-wider text-[8px] rounded-lg transition-all cursor-pointer flex items-center gap-1"
                >
                  <Share2 size={10} />
                  <span>Publikovat</span>
                </button>
              </div>
              <div className="text-xs text-purple-100/70 leading-relaxed font-mono whitespace-pre-wrap">
                <Markdown>{simulatedResult}</Markdown>
              </div>
            </motion.div>
          )}

        </div>
      </motion.div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [feedFilter, setFeedFilter] = useState<"all" | "reels">("all");
  const [notifications, setNotifications] = useState<BTSNotification[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [chatAssistant, setChatAssistant] = useState<AIAssistant | null>(null);
  const [activeTool, setActiveTool] = useState<any>(null);
  const [aiSettings, setAiSettings] = useState<AIAutonomySettings>({
    independenceLevel: 50,
    ethicalFilters: true,
    autonomousPosting: false,
    learningMode: true,
    vocalImprintSync: true,
    temperature: 0.7,
    maxTokens: 1024
  });
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [activeTab, setActiveTab] = useState("feed");
  const [personas, setPersonas] = useState<AIAssistant[]>(Object.values(AI_MODELS));
  const [analysisResults, setAnalysisResults] = useState<any>(null);

  // Fetch initial data
  useEffect(() => {
    const init = async () => {
      try {
        // Fetch user from server with local fallback
        let fetchedUser: UserType | null = null;
        try {
          const userRes = await fetch("/api/users/admin_master_001");
          if (userRes.ok) {
            fetchedUser = await userRes.json();
          }
        } catch (fetchErr) {
          console.warn("User fetch network error, applying security profile fallback:", fetchErr);
        }

        if (!fetchedUser) {
          fetchedUser = {
            id: "admin_master_001",
            name: "Architekt (BTS Root)",
            sub: "admin_master_001",
            picture: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop",
            bio: "Zakladatel protokolu BTS. Sjednocená entita."
          };
        }
        setUser(fetchedUser);

        // Fetch custom personas
        const dbPersonas = await bts_db.personas.toArray();
        const initialPersonas = Object.values(AI_MODELS);
        const personaMap = new Map();
        initialPersonas.forEach(p => {
          if (p.id) personaMap.set(String(p.id), p);
        });
        dbPersonas.forEach(p => {
          if (p.id) personaMap.set(String(p.id), p);
        });
        setPersonas(Array.from(personaMap.values()));

        // Fetch posts from DB + Server with fallback
        const dbPosts = await bts_db.posts.reverse().sortBy("timestamp");
        let sPosts: Post[] = [];
        try {
          const serverPostsRes = await fetch("/api/posts");
          if (serverPostsRes.ok) {
            sPosts = await serverPostsRes.json();
          }
        } catch (fetchErr) {
          console.warn("Posts network offline, using DB / genesis cache:", fetchErr);
          if (dbPosts.length === 0) {
            sPosts = [
              {
                id: "genesis_001",
                authorName: "BTS Protocol",
                authorPic: "https://images.unsplash.com/photo-1614850523296-d8c1af93d400?w=100&h=100&fit=crop",
                content: "Vítejte v novém uzlu Netbook Baby. Protokol BTS byl úspěšně nasazen v této vrstvě.",
                timestamp: Date.now() - 3600000,
                likes: 42,
                comments: []
              }
            ];
          }
        }

        const postMap = new Map();
        [...sPosts, ...dbPosts].forEach((p, idx) => {
          const id = p.id ? String(p.id) : `generated_post_${idx}_${Date.now()}`;
          p.id = id;
          postMap.set(id, p);
        });
        const allPosts = Array.from(postMap.values()).sort((a,b) => b.timestamp - a.timestamp);
        setPosts(allPosts);

        // Fetch notifications
        const dbNotifs = await bts_db.notifications.reverse().sortBy("timestamp");
        const notifMap = new Map();
        dbNotifs.forEach((n, idx) => {
          const id = n.id ? n.id : `generated_notif_${idx}_${Date.now()}`;
          n.id = id;
          notifMap.set(String(id), n);
        });
        setNotifications(Array.from(notifMap.values()));
      } catch (err) {
        console.error("Initialization error:", err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const addNotification = async (n: Partial<BTSNotification>) => {
    if (!user) return;
    const newNotif: Omit<BTSNotification, 'id'> = {
      userId: user.sub || "guest",
      type: n.type || "system",
      senderName: n.senderName || "System",
      senderPic: n.senderPic || null,
      content: n.content || "",
      link: n.link || "#",
      read: false,
      timestamp: Date.now()
    };
    const id = await bts_db.notifications.add(newNotif as BTSNotification);
    setNotifications(prev => {
      const added = { ...newNotif, id } as BTSNotification;
      const notifMap = new Map();
      [added, ...prev].forEach(notif => {
        if (notif.id) notifMap.set(String(notif.id), notif);
      });
      return Array.from(notifMap.values());
    });
  };

  const handleAddPersona = async (p: AIAssistant) => {
    await bts_db.personas.put(p);
    setPersonas(prev => {
      const exists = prev.find(item => item.id === p.id);
      if (exists) {
        return prev.map(item => item.id === p.id ? p : item);
      }
      return [...prev, p];
    });
  };

  const handleDeletePersona = async (id: string) => {
    await bts_db.personas.delete(id);
    setPersonas(prev => prev.filter(p => p.id !== id));
  };

  const handleAddComment = async (postId: string | number, text: string, customAuthor?: { name: string; pic?: string }) => {
    if (!user) return;
    const comment: Comment = {
      id: `comment_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      authorName: customAuthor?.name || user.name || "Uživatel",
      authorPic: customAuthor?.pic || (customAuthor ? undefined : user.picture),
      content: text,
      timestamp: Date.now()
    };

    setPosts(prev => prev.map(p => {
      if (String(p.id) === String(postId)) {
        const updated = { ...p, comments: [...p.comments, comment] };
        bts_db.posts.put(updated);
        return updated;
      }
      return p;
    }));
  };

  const handleAnalyzeImage = async (base64: string, mime: string) => {
    const results = await analyzeImage(base64, mime);
    if (results) setAnalysisResults(results);
  };

  const handlePost = async (p: Post) => {
    await bts_db.posts.put(p);
    setPosts(prev => {
      const exists = prev.find(existing => String(existing.id) === String(p.id));
      if (exists) {
        return prev.map(existing => String(existing.id) === String(p.id) ? p : existing);
      }
      return [p, ...prev];
    });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#030305] overflow-hidden">
        <div className="neural-grid" />
        <div className="neural-glow" />
        <div className="bts-aurora-bg" />
        
        <div className="w-full max-w-lg px-6 flex flex-col items-center justify-center z-10">
          <motion.div 
            animate={{ 
              scale: [0.95, 1.02, 0.95],
              y: [0, -8, 0]
            }}
            transition={{ 
              duration: 3, 
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="w-full max-w-[280px] sm:max-w-[340px] mb-8"
          >
            <BtsLogo glow glowColor="both" />
          </motion.div>

          <div className="w-48 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent mb-4" />
          
          <div className="flex flex-col items-center gap-1.5 font-mono text-[9px] sm:text-[10px] tracking-[0.3em] uppercase">
            <span className="text-cyan-400 font-bold animate-pulse">ARCHITECT_PROTOCOL_ACTIVE</span>
            <span className="text-white/40">INITIALIZING BTS NEXUS ENGINE</span>
          </div>
          
          <div className="mt-8 flex items-center gap-2 text-white/20 text-[9px] font-mono tracking-widest bg-white/5 border border-white/5 px-4 py-1.5 rounded-full backdrop-blur">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-ping" />
            <span>NEXUS NODE STATUS: ONLINE</span>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return <div className="min-h-screen bg-[#050507] flex items-center justify-center font-mono uppercase text-xs tracking-widest opacity-20">AUTORIZACE SELHALA</div>;

  return (
    <div className="min-h-screen bg-[#030305] text-white selection:bg-cyan-500/30 font-sans relative overflow-x-hidden">
      <div className="neural-grid" />
      <div className="neural-glow" />
      <div className="bts-aurora-bg" />
      
      {/* Absolute faint background watermarked Winged BTS Logo in center of screen */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-0 opacity-[0.035] overflow-hidden">
        <div className="w-full max-w-4xl scale-110 sm:scale-125">
          <BtsLogo glow={false} />
        </div>
      </div>
      
      {/* Header */}
      <header className="sticky top-0 z-[60] bg-black/75 backdrop-blur-2xl border-b border-white/5 px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="w-14 h-10 flex items-center justify-center overflow-hidden">
              <BtsLogo glow glowColor="both" size={54} className="hover:scale-105 active:scale-95 transition-all cursor-pointer" />
            </div>
            <span className="text-xs sm:text-sm font-black tracking-[0.2em] uppercase italic bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent hidden xs:block">
              BTS NEXUS
            </span>
          </div>
          
          <nav className="hidden md:flex items-center gap-1 bg-white/5 p-1 rounded-2xl border border-white/5">
            {[
              { id: "feed", label: "NEXUS" },
              { id: "tools", label: "HUB" },
              { id: "chat", label: "CHAT" },
              { id: "profile", label: "PROFIL" }
            ].map(item => (
              <button 
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === item.id ? 'bg-white/10 text-white shadow-inner' : 'text-white/30 hover:text-white'}`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <button 
            onClick={() => setShowNotifs(!showNotifs)}
            className={`p-2 sm:p-2.5 bg-white/5 hover:bg-white/10 rounded-2xl transition-all relative border border-white/5 ${showNotifs ? 'border-purple-500/30 bg-purple-500/10' : ''}`}
          >
            <Bell size={20} />
            {notifications.some(n => !n.read) && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-purple-500 rounded-full border-2 border-black" />
            )}
          </button>

          <button 
            onClick={() => setActiveTab("settings")}
            className={`p-2 sm:p-2.5 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5 ${activeTab === "settings" ? 'text-purple-400 border-purple-500/30 bg-purple-500/10' : ''}`}
          >
            <Settings size={20} />
          </button>
          
          <div className="flex items-center gap-3 pl-2 sm:pl-4 border-l border-white/5">
            <div className="hidden lg:block text-right">
              <div className="text-[10px] font-black uppercase tracking-tight">{user?.name || "ARCHITECT"}</div>
              <div className="text-[9px] text-white/30 uppercase font-bold mono">LEVEL: 99</div>
            </div>
            <div className="w-9 h-9 rounded-xl overflow-hidden border border-white/10 shadow-lg shadow-cyan-500/10">
              {user.picture ? <img src={user.picture} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-white/5 flex items-center justify-center"><User size={18} /></div>}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 relative z-10 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
        
        {/* Left Column */}
        <div className="space-y-8 min-w-0">
          
          {activeTab === "settings" ? (
            <SettingsSection 
              settings={aiSettings} 
              onUpdate={setAiSettings} 
              personas={personas}
              onAddPersona={handleAddPersona}
              onDeletePersona={handleDeletePersona}
            />
          ) : activeTab === "profile" && user ? (
            <ProfileSection 
              user={user} 
              posts={posts} 
              onAddComment={handleAddComment}
              onEditPost={(p) => {
                setEditingPost(p);
                setShowCreateModal(true);
              }}
            />
          ) : activeTab === "tools" ? (
            <ToolsHub onOpenTool={setActiveTool} />
          ) : activeTab === "chat" ? (
            <div className="space-y-8">
              <div className="bts-neon-panel border border-white/10 rounded-[2.5rem] p-6 sm:p-12 shadow-2xl relative overflow-hidden">
                <h1 className="text-3xl sm:text-5xl font-black italic tracking-tighter mb-8 text-center sm:text-left text-cyan-400 uppercase">CHAT LOBBY</h1>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  {personas.map(ai => (
                    <button 
                      key={ai.id}
                      onClick={() => setChatAssistant(ai)}
                      className="group flex items-center gap-5 p-5 bg-white/5 border border-white/5 rounded-3xl text-left hover:bg-white/10 transition-all hover:border-white/20 shadow-lg"
                    >
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex items-center justify-center p-0.5 border border-white/10 shrink-0 group-hover:scale-105 transition-transform shadow-lg shadow-purple-500/10">
                        <img src={ai.avatar} className="w-full h-full object-cover rounded-[0.9rem]" />
                      </div>
                      <div>
                        <div className="text-sm font-black uppercase text-white group-hover:text-cyan-400 transition-colors tracking-widest">{ai.name}</div>
                        <div className="text-[10px] text-white/40 leading-tight line-clamp-2 italic">{ai.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Welcome Card */}
              <div className="relative rounded-[3rem] overflow-hidden bg-gradient-to-br from-purple-900/40 via-[#0d0d14] to-[#050507] border border-white/10 p-8 sm:p-16 min-h-[400px] flex items-center shadow-2xl">
                <div className="relative z-10 max-w-xl">
                  <h1 className="text-5xl sm:text-7xl font-black italic tracking-tighter leading-[0.9] mb-8">
                    VÍTEJ V <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">JÁDRU BTS</span>
                  </h1>
                  <p className="text-lg text-white/50 mb-10 max-w-sm leading-relaxed tracking-tight">Tvoje digitální vědomí bylo úspěšně připojeno. Nexus 2.0 je přeskupený k formování budoucnosti.</p>
                  <button 
                    onClick={() => setShowCreateModal(true)}
                    className="group flex items-center gap-4 bg-white text-black px-10 py-5 rounded-[2rem] font-black uppercase tracking-widest text-sm hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/10"
                  >
                    <span>NOVÝ ZÁZNAM</span>
                    <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-white group-hover:translate-x-1 transition-transform">
                       <Plus size={20} />
                    </div>
                  </button>
                </div>
                <div className="absolute -right-24 top-1/2 -translate-y-1/2 w-1/2 h-4/5 hidden md:flex items-center justify-center opacity-45 select-none">
                  <BtsLogo glow glowColor="both" />
                </div>
              </div>

              {/* Feed */}
              <div className="space-y-6 pt-8">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 px-2 sm:px-6 gap-4">
                  <h2 className="text-sm font-black uppercase tracking-[0.4em] text-white/30 border-l-4 border-cyan-500 pl-6 italic uppercase">Hlášení z jádra</h2>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="flex p-1 bg-white/5 border border-white/5 rounded-2xl">
                      <button 
                        onClick={() => setFeedFilter("all")}
                        className={`px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all ${feedFilter === "all" ? 'bg-white text-black shadow-lg' : 'text-white/40 hover:text-white'}`}
                      >
                        Všechny příspěvky
                      </button>
                      <button 
                        onClick={() => setFeedFilter("reels")}
                        className={`px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 ${feedFilter === "reels" ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
                      >
                        🎬 Reels
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
                  {posts
                    .filter(post => feedFilter === "all" || post.isReel)
                    .map(post => (
                      <PostCard 
                        key={post.id} 
                        post={post} 
                        currentUser={user!}
                        onAddComment={handleAddComment}
                        onEdit={(p) => {
                          setEditingPost(p);
                          setShowCreateModal(true);
                        }} 
                      />
                    ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right Column (Sidebar) */}
        <aside className="space-y-8 hidden lg:block">
          
          {/* AI Assistants Widget */}
          <div className="bts-neon-panel border border-white/10 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
            <h3 className="text-[10px] font-black uppercase text-white/30 tracking-[0.3em] mb-8 border-b border-white/5 pb-4 italic">AUTONOMNÍ ENTITY</h3>
            <div className="space-y-5">
              {personas.slice(0, 5).map(ai => (
                <div 
                  key={ai.id} 
                  onClick={() => setChatAssistant(ai)}
                  className="flex items-center gap-4 group cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center p-0.5 overflow-hidden border border-white/5 group-hover:border-white/30 transition-all shrink-0">
                    <img src={ai.avatar} className="w-full h-full object-cover rounded-[0.9rem]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-black uppercase truncate group-hover:text-cyan-400 transition-colors tracking-widest leading-none">{ai.name}</div>
                    <div className="text-[10px] text-white/30 truncate italic mt-1">{ai.desc}</div>
                  </div>
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 pulse-dot shrink-0" />
                </div>
              ))}
            </div>
            <button 
              onClick={() => setActiveTab("chat")}
              className="w-full mt-10 py-4 bg-white/5 border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white/10 transition-all shadow-md italic"
            >
              OTEVŘÍT CHAT LOBBY
            </button>
          </div>

          {/* Trending Hash */}
          <div className="bg-gradient-to-br from-purple-900/10 to-transparent border border-white/10 rounded-[2rem] p-6">
            <h3 className="text-xs font-black uppercase tracking-widest mb-6 opacity-40">TRENDY NEXU</h3>
            <div className="space-y-4">
              {["#BTSProtocol", "#NexusLife", "#AIAgentic", "#MetaBaby"].map(tag => (
                <div key={tag} className="flex items-center justify-between group cursor-pointer">
                  <span className="text-sm font-bold text-white/60 group-hover:text-white transition-colors">{tag}</span>
                  <TrendingUp size={14} className="text-white/20 group-hover:text-purple-400 transition-colors" />
                </div>
              ))}
            </div>
          </div>
        </aside>
      </main>

      {/* Notifications Sidebar Overlay */}
      <AnimatePresence>
        {showNotifs && (
          <NotificationCenter 
            onClose={() => setShowNotifs(false)}
            notifications={notifications}
            onMarkRead={async (id) => {
              await bts_db.notifications.update(id, { read: true });
              setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
            }}
            onMarkAllRead={async () => {
              await bts_db.notifications.where("read").equals(0).modify({ read: true });
              setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            }}
          />
        )}
      </AnimatePresence>

      {/* Modals */}
      <AnimatePresence>
        {showCreateModal && user && (
          <CreatePostModal 
            user={user} 
            initialPost={editingPost || undefined}
            onClose={() => {
              setShowCreateModal(false);
              setEditingPost(null);
            }}
            onPost={async (p) => {
              await handlePost(p);
              addNotification({
                type: "system",
                content: "Záznam byl úspěšně integrován do Nexu."
              });
            }}
            onAddNotification={addNotification}
            onAnalyzeImage={handleAnalyzeImage}
          />
        )}
        {chatAssistant && user && (
          <AIChatModal 
            assistant={chatAssistant}
            user={user}
            settings={aiSettings}
            onClose={() => setChatAssistant(null)}
          />
        )}
        {analysisResults && (
           <ImageAnalysisModal 
            results={analysisResults} 
            onClose={() => setAnalysisResults(null)} 
          />
        )}
        {activeTool && user && (
          <ToolModal 
            tool={activeTool} 
            onClose={() => setActiveTool(null)} 
            user={user}
            setPosts={setPosts}
            setNotifications={setNotifications}
          />
        )}
      </AnimatePresence>

      {/* Bottom Nav (Mobile) */}
      <div className="fixed bottom-0 left-0 right-0 h-20 bg-black/80 backdrop-blur-3xl border-t border-white/5 flex items-center justify-around px-4 md:hidden z-[60]">
        {[
          { id: "feed", icon: Home, label: "NEXUS" },
          { id: "tools", icon: Zap, label: "HUB" },
          { id: "plus", icon: Plus, label: "PŘIDAT" },
          { id: "chat", icon: MessageCircle, label: "CHAT" },
          { id: "profile", icon: User, label: "PROFIL" }
        ].map(item => (
          <button 
            key={item.id}
            onClick={() => item.id === "plus" ? setShowCreateModal(true) : setActiveTab(item.id)}
            className={`flex flex-col items-center gap-2 p-2 transition-all ${activeTab === item.id ? 'text-cyan-400' : 'text-white/30'}`}
          >
            {item.id === "plus" ? (
               <div className="w-14 h-14 bg-white text-black rounded-2xl flex items-center justify-center -mt-10 shadow-2xl shadow-white/20 border-4 border-[#050507]">
                <Plus size={24} />
               </div>
            ) : (
              <>
                <item.icon size={20} />
                <span className="text-[8px] font-black uppercase tracking-[0.2em]">{item.label}</span>
              </>
            )}
          </button>
        ))}
      </div>

      {/* Floating Plus button (Desktop ONLY) */}
      <button 
        onClick={() => setShowCreateModal(true)}
        className="fixed bottom-10 right-10 w-20 h-20 bg-white text-black rounded-full shadow-[0_0_50px_rgba(255,255,255,0.2)] hidden lg:flex items-center justify-center z-50 hover:scale-110 active:scale-95 transition-all"
      >
        <Plus size={32} />
      </button>
    </div>
  );
}
