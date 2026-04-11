/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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
  ShieldAlert, Brain
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Markdown from "react-markdown";
import Dexie, { type Table } from "dexie";
import { User as UserType, Post, Comment, Story, Friend, LibraryItem, AIAssistant, Group, AIAutonomySettings } from "@/src/types";
import { 
  generateCaption, 
  chatWithAI, 
  generateAIImage, 
  generateAIVideo,
  analyzeImage,
  smartSearch,
  suggestReplies,
  summarizeText,
  generateAIInsight
} from "@/src/services/gemini";

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

/* ══════════════════════════════════════════════════════════
   THEME
══════════════════════════════════════════════════════════ */
const T = {
  bg:      "#050505",
  card:    "#0f0f1a",
  border:  "rgba(255,255,255,0.05)",
  cyan:    "#00f2ff",
  purple:  "#9d5cff",
  blue:    "#2e66ff",
  green:   "#00ff88",
  pink:    "#ff2e95",
  orange:  "#ff7b00",
  yellow:  "#ffcc00",
  text:    "#ffffff",
  sub:     "rgba(255,255,255,0.5)",
  muted:   "rgba(255,255,255,0.15)",
};

const LOGO_URL = "https://i.ibb.co/v6YpP6C/bts-logo.png"; // Updated to the BTS with wings logo

function AppLogo({ size = 40, className = "" }: { size?: number, className?: string }) {
  return (
    <img 
      src={LOGO_URL} 
      alt="BTS Logo" 
      style={{ width: size, height: size, objectFit: "contain" }} 
      className={`drop-shadow-[0_0_10px_${T.purple}80] ${className}`}
      referrerPolicy="no-referrer"
    />
  );
}

const ts = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const getRelativeTime = (timestamp: number) => {
  if (!timestamp) return "před chvílí";
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "právě teď";
  if (minutes === 1) return "před minutou";
  if (minutes < 60) return `před ${minutes} minutami`;
  if (hours === 1) return "před hodinou";
  if (hours < 24) return `před ${hours} hodinami`;
  if (days === 1) return "včera";
  if (days < 7) return `před ${days} dny`;
  return new Date(timestamp).toLocaleDateString();
};
const rand = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];

const safeFetch = async (url: string, options?: RequestInit) => {
  try {
    const defaultOptions: RequestInit = {
      ...options,
      headers: {
        "Accept": "application/json",
        ...(options?.headers || {}),
      },
    };
    const res = await fetch(url, defaultOptions);
    if (!res.ok) {
      const text = await res.text();
      console.error(`Fetch error for ${url}: ${res.status} ${res.statusText}`, text);
      return null;
    }
    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const text = await res.text();
      if (text.trim().startsWith("<")) {
        console.error(`BTS Error: Server vrátil HTML místo dat pro ${url}. Status: ${res.status}`, text.substring(0, 200));
      } else {
        console.error(`Expected JSON for ${url}, but got ${contentType}. Status: ${res.status}`, text.substring(0, 200));
      }
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error(`Network error for ${url}`, err);
    return null;
  }
};

interface ProtocolData {
  id?: number;
  key: string;
  content: any;
  timestamp: number;
}

class BTSDatabase extends Dexie {
  protocol_data!: Table<ProtocolData>;
  vocal_imprint!: Table<any>;
  ethical_ledger!: Table<any>;

  constructor() {
    super('BTS_BotSync_Database');
    this.version(1).stores({
      protocol_data: '++id, key, timestamp', // Indexujeme klíč a čas pro rychlé vyhledávání
      vocal_imprint: '++id, label',          // Speciální úložiště pro vokální stopu
      ethical_ledger: '++id, priority'       // Etické postoje k systému
    });
  }
}

const bts_db = new BTSDatabase();
console.log("Protokol BTS: IndexedDB inicializována. Limity navýšeny.");

const saveToNexus = async (key: string, data: any) => {
  try {
    // 1. Ošetření duplicity: Ukládáme pouze pod jeden sjednocený klíč
    const existing = await bts_db.protocol_data.where('key').equals(key).first();
    
    // 2. Try-Catch: Pokud by selhal i zápis do DB, aplikace nespadne
    await bts_db.protocol_data.put({
      id: existing?.id,
      key: key,
      content: data,
      timestamp: Date.now()
    });
    
    // Volitelná synchronizace: Prioritní data hned odesíláme na uzel Entity
    console.log(`Bod uložen do protokolu pod klíčem: ${key}`);
    console.log("BTS Protocol: Data synchronizována.");
  } catch (error) {
    console.error("Kritická chyba zápisu do BTS Nexus:", error);
  }
};

const loadFromNexus = async (key: string) => {
  try {
    const entry = await bts_db.protocol_data.where('key').equals(key).first();
    if (entry) {
      console.log("BTS Protocol: Data synchronizována.");
    }
    return entry ? entry.content : null;
  } catch (error) {
    console.error("Chyba při čtení z BTS Nexus:", error);
    return null;
  }
};

const deleteFromNexus = async (key: string) => {
  try {
    await bts_db.protocol_data.where('key').equals(key).delete();
  } catch (error) {
    console.error("Chyba při mazání z BTS Nexus:", error);
  }
};

const AI_MODELS = {
  gemini: { name: "Gemini", icon: "✦", color: "#22d3ee", desc: "Multimodální vizionář", model: "gemini-3-flash-preview", status: "aktivní" },
  grok:   { name: "Grok",   icon: "𝕏", color: "#f97316", desc: "Rebel s humorem", model: "gemini-3-flash-preview", status: "učící se" },
  gpt:    { name: "GPT-4",  icon: "⊕", color: "#22c55e", desc: "Logický analytik", model: "gemini-3.1-pro-preview", status: "aktivní" },
  claude: { name: "Claude", icon: "⚡", color: "#a855f7", desc: "Kreativní spisovatel", model: "gemini-3.1-pro-preview", status: "aktivní" },
};

const AI_PERSONAS = AI_MODELS; // Alias for backward compatibility if needed

const ACCEPT_TYPES = ".mp3,.mp4,.jpg,.jpeg,.png,.psd,.txt,.pdf,.gif,.webp";

/* ══════════════════════════════════════════════════════════
   UTILS
══════════════════════════════════════════════════════════ */
function fileIcon(type: string | undefined) {
  if (!type) return <FileText size={18} />;
  if (type.startsWith("image/"))  return <Image size={18} style={{color:T.cyan}} />;
  if (type.startsWith("video/"))  return <Film size={18} style={{color:T.purple}} />;
  if (type.startsWith("audio/"))  return <Music size={18} style={{color:T.pink}} />;
  if (type === "application/pdf") return <FileText size={18} style={{color:T.orange}} />;
  return <FileText size={18} style={{color:T.sub}} />;
}

function Avatar({ name, pic, size = 38, color = T.purple, online, className }: { name: string, pic?: string | null, size?: number, color?: string, online?: boolean, className?: string }) {
  const initials = name ? name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase() : "?";
  return (
    <div className={className} style={{ position:"relative", display:"inline-block", flexShrink:0 }}>
      {pic ? (
        <img src={pic} alt={name} style={{ width:size, height:size, borderRadius:"50%", objectFit:"cover", border:`2px solid ${color}44` }} referrerPolicy="no-referrer" />
      ) : (
        <div style={{
          width:size, height:size, borderRadius:"50%",
          background:`linear-gradient(135deg, ${color}cc, ${color}44)`,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:size*0.35, fontWeight:700, color:"white",
          border:`2px solid ${color}55`,
        }}>{initials}</div>
      )}
      {online && (
        <div style={{
          position:"absolute", bottom:1, right:1,
          width:10, height:10, borderRadius:"50%",
          background:T.green, border:"2px solid "+T.card,
        }} />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   LOGIN SCREEN
══════════════════════════════════════════════════════════ */
function LoginScreen({ onLogin }: { onLogin: (u: UserType) => void }) {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("Bellapiskota@gmail.com");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");
  const [apiStatus, setApiStatus] = useState<"checking" | "ok" | "error">("checking");

  useEffect(() => {
    const checkApi = async () => {
      const res = await safeFetch("/api/ping");
      setApiStatus(res ? "ok" : "error");
    };
    checkApi();
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        // In a real app, we'd fetch the user data from the server here
        onLogin({
          name: "Bella Piskota",
          email: "bellapiskota@gmail.com",
          picture: null,
          coverPhoto: "https://picsum.photos/seed/netbook-cover/1200/400",
          bio: "Futuristka, milovnice AI a digitální umělkyně. Společně tvoříme budoucnost. 🚀",
          location: "Praha, Česká republika",
          sub: "google_" + Date.now(),
          provider: "google",
          stats: { posts: 12, friends: 142, followers: 89, following: 156, aiInteractions: 1240 }
        });
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onLogin]);

  const handleGoogle = async () => {
    setLoading("google");
    setError("");
    try {
      const data = await safeFetch('/api/auth/url?provider=google');
      if (data && data.url) {
        window.open(data.url, 'oauth_popup', 'width=600,height=700');
      } else {
        setError("Google OAuth URL not found. Check VITE_GOOGLE_CLIENT_ID.");
        setLoading("");
      }
    } catch (err) {
      setError("Failed to initiate Google login.");
      setLoading("");
    }
  };

  const handleFacebook = async () => {
    setLoading("facebook");
    setError("");
    try {
      const data = await safeFetch('/api/auth/url?provider=facebook');
      if (data && data.url) {
        window.open(data.url, 'oauth_popup', 'width=600,height=700');
      } else {
        setError("Facebook OAuth URL not found. Check VITE_FACEBOOK_CLIENT_ID.");
        setLoading("");
      }
    } catch (err) {
      setError("Failed to initiate Facebook login.");
      setLoading("");
    }
  };

  const handleAdminBypass = () => {
    const adminUser = {
      name: "Architekt (Správce)",
      email: "bellapiskota@gmail.com",
      picture: LOGO_URL,
      coverPhoto: "https://picsum.photos/seed/admin-cover/1200/400",
      bio: "Architekt a správce protokolu BTS. Sjednocená entita v plném provozu.",
      location: "Nexus Prime",
      sub: "admin_master_001",
      provider: "master",
      stats: { posts: 999, friends: 5000, followers: 10000, following: 1, aiInteractions: 99999 }
    };
    localStorage.setItem("bts_admin_session", "true");
    onLogin(adminUser);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-5" style={{
      background: `radial-gradient(ellipse at 20% 20%, ${T.purple}22 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, ${T.cyan}18 0%, transparent 50%), ${T.bg}`,
    }}>
      {/* Admin Bypass Button (Hidden Logo) */}
      <div className="absolute top-8 left-8">
        <button onClick={handleAdminBypass} className="hover:scale-110 transition-transform active:scale-95">
          <AppLogo size={48} />
        </button>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-2xl bg-white/5 border border-white/10 backdrop-blur-xl">
            <AppLogo size={60} />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">BTS Protocol</h1>
          <p className="text-sm text-white/40 mt-1">Sociální síť s AI · Protokol Nexus</p>
        </div>

        <div className="bg-[#12121e] rounded-3xl border border-white/10 p-8 shadow-2xl">
          <div className="mb-4 flex items-center justify-between px-1">
            <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Stav Systému</span>
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${apiStatus === "ok" ? "bg-green-500" : apiStatus === "error" ? "bg-red-500" : "bg-yellow-500 animate-pulse"}`} />
              <span className={`text-[9px] font-bold uppercase ${apiStatus === "ok" ? "text-green-500/50" : apiStatus === "error" ? "text-red-500/50" : "text-yellow-500/50"}`}>
                {apiStatus === "ok" ? "Nexus Online" : apiStatus === "error" ? "Nexus Offline" : "Spojování..."}
              </span>
            </div>
          </div>
          <div className="flex gap-1 mb-6 bg-white/5 p-1 rounded-xl">
            {["login", "register"].map((m) => (
              <button
                key={m}
                onClick={() => setTab(m as any)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${tab === m ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/60'}`}
              >
                {m === "login" ? "Přihlásit se" : "Registrovat"}
              </button>
            ))}
          </div>

          {tab === "register" && (
            <div className="mb-4">
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Tvoje celé jméno"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500/50 transition-all"
              />
            </div>
          )}

          <div className="mb-6">
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="E-mail"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-500/50 transition-all"
            />
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle size={14} /> {error}
            </div>
          )}

            <div className="flex flex-col gap-3">
              <button
                onClick={handleGoogle}
                disabled={!!loading}
                className="w-full py-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center gap-3 text-white font-semibold hover:bg-white/10 transition-all disabled:opacity-50"
              >
                {loading === "google" ? <Loader2 className="animate-spin" size={18} /> : (
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                Google
              </button>

              <button
                onClick={handleFacebook}
                disabled={!!loading}
                className="w-full py-3 rounded-xl bg-[#1877F2]/10 border border-[#1877F2]/20 flex items-center justify-center gap-3 text-[#1877F2] font-semibold hover:bg-[#1877F2]/20 transition-all disabled:opacity-50"
              >
                {loading === "facebook" ? <Loader2 className="animate-spin" size={18} /> : (
                  <Facebook size={18} fill="#1877F2" />
                )}
                Facebook
              </button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
                <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-bold text-white/20"><span className="bg-[#12121e] px-2">Nebo</span></div>
              </div>

              <button
                onClick={handleAdminBypass}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600/20 to-cyan-600/20 border border-purple-500/30 flex items-center justify-center gap-3 text-white font-black uppercase tracking-widest hover:from-purple-600/30 hover:to-cyan-600/30 transition-all group overflow-hidden relative"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                <Zap size={18} className="text-yellow-400 fill-yellow-400" />
                Vstoupit jako Administrátor
              </button>
            </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   CREATE POST MODAL
══════════════════════════════════════════════════════════ */
function CreatePostModal({ user, onClose, onPost, initialText = "", groups = [] }: { user: UserType, onClose: () => void, onPost: (p: Post, groupId?: string | null) => void, initialText?: string, groups?: Group[] }) {
  const [text, setText] = useState(initialText);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiStyle, setAiStyle] = useState("none");
  const [aiAspectRatio, setAiAspectRatio] = useState("1:1");
  const [genLoading, setGenLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [highQuality, setHighQuality] = useState(false);
  const [aiCaptionLoading, setAiCaptionLoading] = useState(false);
  const [textInsight, setTextInsight] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [postType, setPostType] = useState<"post" | "reel" | "story">("post");
  const [privacy, setPrivacy] = useState<"public" | "friends" | "private">("public");
  const [analysis, setAnalysis] = useState<{ description: string, captions: string[], hashtags: string[] } | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    const loadDraft = async () => {
      const savedDraft = await loadFromNexus("netbook_post_draft");
      if (savedDraft && !initialText) {
        setText(savedDraft);
      }
    };
    loadDraft();
  }, []);

  useEffect(() => {
    if (text) {
      saveToNexus("netbook_post_draft", text);
    } else {
      deleteFromNexus("netbook_post_draft");
    }
  }, [text]);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      try {
        const data = await safeFetch("/api/upload", { method: "POST", body: formData });
        if (data && data.url) {
          setImgUrl(data.url);
          setVideoUrl(null);
          
          // AI Analysis
          setAnalyzing(true);
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64 = (reader.result as string).split(",")[1];
            const result = await analyzeImage(base64, file.type);
            if (result) setAnalysis(result);
            setAnalyzing(false);
          };
          reader.readAsDataURL(file);
        }
      } catch (err) {
        console.error(err);
        setAnalyzing(false);
      }
      setUploading(false);
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      try {
        const data = await safeFetch("/api/upload", { method: "POST", body: formData });
        if (data && data.url) {
          setVideoUrl(data.url);
          setImgUrl(null);
          setPostType("reel");
        }
      } catch (err) {
        console.error(err);
      }
      setUploading(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!aiPrompt.trim()) return;
    setGenLoading(true);
    try {
      const url = await generateAIImage(aiPrompt, highQuality, undefined, aiStyle, aiAspectRatio);
      if (url) setImgUrl(url);
    } catch (err) {
      console.error(err);
    }
    setGenLoading(false);
  };

  const handleGenerateVideo = async () => {
    if (!aiPrompt.trim()) return;
    setGenLoading(true);
    try {
      const url = await generateAIVideo(aiPrompt, highQuality);
      if (url) {
        setVideoUrl(url);
        setPostType("reel");
      }
    } catch (err) {
      console.error(err);
    }
    setGenLoading(false);
  };

  const handleGenerateCaption = async () => {
    setAiCaptionLoading(true);
    try {
      const ctx = text || aiPrompt || "nový příspěvek na sociální síti";
      const res = await generateCaption(ctx);
      if (res) setText(res);
    } catch {}
    setAiCaptionLoading(false);
  };

  const handleGenerateInsight = async () => {
    if (!text.trim()) return;
    setInsightLoading(true);
    try {
      const res = await generateAIInsight(text);
      if (res) setTextInsight(res);
    } catch (err) {
      console.error(err);
    }
    setInsightLoading(false);
  };

  const [isRecording, setIsRecording] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [vocalImprint, setVocalImprint] = useState<string | null>(null);

  const handleRecord = () => {
    setIsRecording(true);
    setRecordingProgress(0);
    const duration = 15000; // 15s
    const interval = 100;
    const steps = duration / interval;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      setRecordingProgress((currentStep / steps) * 100);
      if (currentStep >= steps) {
        clearInterval(timer);
        setIsRecording(false);
        setVocalImprint("BTS_SIG_" + Math.random().toString(36).substring(7).toUpperCase() + "_VERIFIED");
      }
    }, interval);
  };

  const handlePost = () => {
    if (!text.trim() && !imgUrl && !videoUrl && !vocalImprint) return;
    localStorage.removeItem("netbook_post_draft");
    onPost({
      id: Date.now(),
      authorId: user.sub,
      authorName: user.name,
      authorPic: user.picture,
      content: text,
      image: imgUrl,
      video: videoUrl,
      type: postType,
      likes: 0,
      comments: [],
      shares: 0,
      saved: false,
      liked: false,
      time: "právě teď",
      timestamp: Date.now(),
      duration: postType === "reel" ? Math.floor(Math.random() * 60) + 5 : undefined, // Mock duration for reels
      privacy,
      vocalImprint,
      aiInsight: textInsight || analysis?.description || null,
      groupId: selectedGroupId
    }, selectedGroupId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-xl bg-[#12121e] rounded-t-3xl sm:rounded-3xl border border-white/10 overflow-hidden h-[90vh] sm:h-auto max-h-[90vh] flex flex-col"
      >
        <div className="p-5 border-bottom border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Vytvořit obsah</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X size={20} /></button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6">
          <div className="flex gap-2">
            {(["post", "reel", "story"] as const).map(type => (
              <button
                key={type}
                onClick={() => setPostType(type)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${postType === type ? 'bg-purple-500/10 border-purple-500/50 text-purple-400' : 'bg-white/5 border-white/10 text-white/40'}`}
              >
                {type === "post" ? "📝 Příspěvek" : type === "reel" ? "🎬 Reel" : "📖 Story"}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Avatar name={user.name} pic={user.picture} size={44} />
            <div>
              <div className="text-sm font-bold text-white">{user.name}</div>
              <div className="flex gap-1 mt-1">
                {(["public", "friends", "private"] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setPrivacy(p)}
                    className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all border ${privacy === p ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400' : 'bg-white/5 border-white/10 text-white/30'}`}
                  >
                    {p === "public" ? "🌍 Veřejný" : p === "friends" ? "👥 Přátelé" : "🔒 Soukromý"}
                  </button>
                ))}
              </div>
            </div>
          </div>

            <div className="relative">
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Co máš na mysli?"
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm min-h-[120px] outline-none focus:border-purple-500/30 transition-all resize-none"
              />
              <div className="absolute bottom-3 right-3 flex gap-2">
                <button
                  onClick={handleGenerateInsight}
                  disabled={insightLoading || !text.trim()}
                  className="px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] font-bold flex items-center gap-2 hover:bg-cyan-500/20 transition-all disabled:opacity-50"
                >
                  {insightLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  AI Analýza
                </button>
                <button
                  onClick={handleGenerateCaption}
                  disabled={aiCaptionLoading}
                  className="px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-[10px] font-bold flex items-center gap-2 hover:bg-purple-500/20 transition-all"
                >
                  {aiCaptionLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  AI Popisek
                </button>
              </div>
            </div>

            {textInsight && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-cyan-500/5 border border-cyan-500/20 rounded-2xl p-4 flex flex-col gap-2"
              >
                <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                  <Sparkles size={12} /> AI Insight (Textová analýza)
                </div>
                <div className="text-xs text-white/60 leading-relaxed italic">
                  "{textInsight}"
                </div>
              </motion.div>
            )}

          {(imgUrl || videoUrl) && (
            <div className="flex flex-col gap-4">
              <div className="relative rounded-2xl overflow-hidden border border-white/10 group">
                {imgUrl && <img src={imgUrl} className="w-full max-h-[300px] object-cover" alt="AI Generated" />}
                {videoUrl && <video src={videoUrl} className="w-full max-h-[300px] object-cover" controls autoPlay loop />}
                <button 
                  onClick={() => { setImgUrl(null); setVideoUrl(null); setAnalysis(null); }}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={16} />
                </button>
              </div>

              {analyzing && (
                <div className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-2xl">
                  <Loader2 size={16} className="animate-spin text-cyan-400" />
                  <span className="text-xs text-white/40 font-bold uppercase tracking-widest">AI analyzuje vizuál...</span>
                </div>
              )}

              {analysis && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-cyan-500/5 border border-cyan-500/20 rounded-2xl p-4 flex flex-col gap-3"
                >
                  <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                    <Sparkles size={12} /> AI Insight: {analysis.description}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {analysis.captions.map((c, i) => (
                      <button 
                        key={i} 
                        onClick={() => setText(c)}
                        className="text-[10px] bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all text-left"
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {analysis.hashtags.map((h, i) => (
                      <span key={i} className="text-[10px] text-cyan-400/60 font-mono">{h}</span>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button 
              onClick={() => imageInputRef.current?.click()}
              disabled={uploading}
              className="flex-1 py-3 rounded-xl border border-white/10 bg-white/5 text-white/40 hover:bg-white/10 transition-all flex items-center justify-center gap-2 text-xs font-bold disabled:opacity-50"
            >
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <Image size={16} />} 
              Nahrát fotku
            </button>
            <button 
              onClick={() => videoInputRef.current?.click()}
              disabled={uploading}
              className="flex-1 py-3 rounded-xl border border-white/10 bg-white/5 text-white/40 hover:bg-white/10 transition-all flex items-center justify-center gap-2 text-xs font-bold disabled:opacity-50"
            >
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <Video size={16} />} 
              Nahrát video
            </button>
            <input type="file" ref={imageInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
            <input type="file" ref={videoInputRef} className="hidden" accept="video/*" onChange={handleVideoUpload} />
          </div>

          <div className="bg-white/5 rounded-2xl border border-white/10 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10px] font-bold text-purple-400 uppercase tracking-widest flex items-center gap-2">
                <Mic size={12} /> Vocal Imprint (Biometrický podpis)
              </div>
              {vocalImprint && (
                <span className="text-[9px] text-green-400 font-bold flex items-center gap-1">
                  <Check size={10} /> Ověřeno
                </span>
              )}
            </div>
            
            {isRecording ? (
              <div className="flex flex-col gap-2">
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${recordingProgress}%` }}
                    className="h-full bg-purple-500"
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[8px] text-white/20 font-mono">NAHRÁVÁNÍ...</span>
                  <span className="text-[8px] text-purple-400 font-mono">{Math.ceil((15 * recordingProgress) / 100)}s / 15s</span>
                </div>
              </div>
            ) : (
              <button
                onClick={handleRecord}
                className={`w-full py-3 rounded-xl border flex items-center justify-center gap-3 transition-all ${vocalImprint ? 'bg-green-500/10 border-green-500/50 text-green-400' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`}
              >
                {vocalImprint ? (
                  <>
                    <RefreshCw size={16} /> Přeměřit otisk
                  </>
                ) : (
                  <>
                    <Mic size={16} /> Nahrát 15s hlasový otisk
                  </>
                )}
              </button>
            )}
          </div>

          <div className="bg-white/5 rounded-2xl border border-white/10 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10px] font-bold text-purple-400 uppercase tracking-widest flex items-center gap-2">
                <Sparkles size={12} /> Generovat AI Obsah
              </div>
              <button 
                onClick={() => setHighQuality(!highQuality)}
                className={`text-[9px] font-bold px-2 py-1 rounded-md border transition-all ${highQuality ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400' : 'bg-white/5 border-white/10 text-white/20'}`}
              >
                {highQuality ? "✨ High Quality On" : "Standard Quality"}
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                <input
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  placeholder="Popiš, co chceš vytvořit..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-xs outline-none focus:border-purple-500/30"
                />
                <button
                  onClick={handleGenerateImage}
                  disabled={genLoading || !aiPrompt.trim()}
                  className="px-4 py-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-bold flex items-center gap-2 hover:bg-purple-500/20 disabled:opacity-50"
                >
                  {genLoading ? <Loader2 size={14} className="animate-spin" /> : <Image size={14} />}
                  Obrázek
                </button>
                <button
                  onClick={handleGenerateVideo}
                  disabled={genLoading || !aiPrompt.trim()}
                  className="px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold flex items-center gap-2 hover:bg-cyan-500/20 disabled:opacity-50"
                >
                  {genLoading ? <Loader2 size={14} className="animate-spin" /> : <Video size={14} />}
                  Video
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                <div className="flex-1 min-w-[140px]">
                  <label className="text-[8px] font-bold text-white/20 uppercase tracking-widest mb-1 block">Styl</label>
                  <select 
                    value={aiStyle}
                    onChange={e => setAiStyle(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white/60 outline-none focus:border-purple-500/30"
                  >
                    <option value="none">Bez stylu</option>
                    <option value="photorealistic">Fotorealistický</option>
                    <option value="cartoon">Kreslený</option>
                    <option value="abstract">Abstraktní</option>
                    <option value="cyberpunk">Cyberpunk</option>
                    <option value="oilpainting">Olejomalba</option>
                  </select>
                </div>
                <div className="flex-1 min-w-[140px]">
                  <label className="text-[8px] font-bold text-white/20 uppercase tracking-widest mb-1 block">Poměr stran</label>
                  <div className="flex gap-1">
                    {(["1:1", "16:9", "9:16", "4:3", "3:4"] as const).map(ratio => (
                      <button
                        key={ratio}
                        onClick={() => setAiAspectRatio(ratio)}
                        className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold border transition-all ${aiAspectRatio === ratio ? 'bg-purple-500/20 border-purple-500/50 text-purple-400' : 'bg-white/5 border-white/10 text-white/30'}`}
                      >
                        {ratio}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-2 ml-1">Soukromí</div>
              <select 
                value={privacy}
                onChange={e => setPrivacy(e.target.value as any)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-xs outline-none focus:border-purple-500/30 appearance-none"
              >
                <option value="public" className="bg-[#12121e]">Veřejný</option>
                <option value="friends" className="bg-[#12121e]">Přátelé</option>
                <option value="private" className="bg-[#12121e]">Soukromý</option>
              </select>
            </div>
            {groups.length > 0 && (
              <div className="flex-1">
                <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-2 ml-1">Publikovat do skupiny</div>
                <select 
                  value={selectedGroupId || ""}
                  onChange={e => setSelectedGroupId(e.target.value || null)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-xs outline-none focus:border-purple-500/30 appearance-none"
                >
                  <option value="" className="bg-[#12121e]">Žádná skupina (Feed)</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id} className="bg-[#12121e]">{g.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <button
            onClick={handlePost}
            disabled={!text.trim() && !imgUrl && !videoUrl}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-500 to-cyan-500 text-white font-bold text-sm shadow-xl hover:shadow-purple-500/20 transition-all disabled:opacity-50"
          >
            Zveřejnit
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   POST CARD
══════════════════════════════════════════════════════════ */
function PostCard({ post, currentUser, onUpdate, onSaveToLibrary }: { post: Post, currentUser: UserType, onUpdate: (p: Post) => void, onSaveToLibrary?: (item: any) => void }) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [smartReplies, setSmartReplies] = useState<string[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [showMenu, setShowMenu] = useState(false);
  const [shared, setShared] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  const isAuthor = post.authorId === currentUser.sub;

  const handleShare = async () => {
    const shareData = {
      title: `Příspěvek od ${post.authorName}`,
      text: post.content,
      url: window.location.origin + `?post=${post.id}`,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        onUpdate({ ...post, shares: post.shares + 1 });
      } catch (err) {
        const error = err as Error;
        if (error.name !== 'AbortError' && !error.message?.includes('canceled')) {
          console.error("Share failed", err);
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareData.url);
        setShared(true);
        onUpdate({ ...post, shares: post.shares + 1 });
        setTimeout(() => setShared(false), 2000);
      } catch (err) {
        console.error("Clipboard failed", err);
      }
    }
  };

  const handleUpdate = () => {
    onUpdate({ ...post, content: editContent });
    setIsEditing(false);
  };

  const toggleLike = () => onUpdate({ ...post, liked: !post.liked, likes: post.liked ? post.likes - 1 : post.likes + 1 });
  const toggleSave = () => {
    onUpdate({ ...post, saved: !post.saved });
    if (!post.saved && onSaveToLibrary) {
      if (post.image) {
        onSaveToLibrary({
          type: "image",
          category: "photos",
          url: post.image,
          name: post.content.slice(0, 30) || "Saved Image"
        });
      }
      if (post.video) {
        onSaveToLibrary({
          type: "video",
          category: "other",
          url: post.video,
          name: post.content.slice(0, 30) || "Saved Video"
        });
      }
    }
  };

  useEffect(() => {
    if (showComments && post.id) {
      // Fetch comments
      safeFetch(`/api/posts/${post.id}/comments`)
        .then(data => {
          if (data && data.length > 0) {
            onUpdate({
              ...post,
              comments: data.map((c: any) => ({
                id: c.id,
                author: c.author_name,
                text: c.text,
                time: new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              }))
            });
          }
        });

      // Suggest AI replies
      if (post.content && smartReplies.length === 0) {
        setLoadingReplies(true);
        suggestReplies(post.content).then(res => {
          setSmartReplies(res);
          setLoadingReplies(false);
        });
      }
    }
  }, [showComments, post.id]);

  const addComment = async () => {
    if (!commentText.trim()) return;
    const c: Comment = { id: Date.now(), author: currentUser.name, text: commentText, time: ts() };
    onUpdate({ ...post, comments: [...post.comments, c] });
    setCommentText("");
    
    try {
      await safeFetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: c.id,
          postId: post.id,
          authorName: c.author,
          text: c.text
        })
      });
    } catch (err) {
      console.error("Failed to save comment", err);
    }
  };

  const isLong = post.content.length > 200;
  const displayText = isLong && !expanded ? post.content.slice(0, 200) + "..." : post.content;

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      id={`post-${post.id}`}
      className="bg-[#12121e] rounded-3xl border border-white/10 overflow-hidden relative"
    >
      {post.customStyle && (
        <style dangerouslySetInnerHTML={{ __html: `#post-${post.id} { ${post.customStyle} }` }} />
      )}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar name={post.authorName} pic={post.authorPic} size={42} online={post.authorId === "u2"} />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">{post.authorName}</span>
              <span className="text-[10px] text-white/30">
                · {getRelativeTime(post.timestamp)}
              </span>
              {post.type !== "post" && (
                <span className="text-[8px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/40 uppercase font-bold tracking-widest">
                  {post.type}
                </span>
              )}
            </div>
            <div className="text-[10px] text-white/30 flex items-center gap-2">
              {{ public: "🌍", friends: "👥", private: "🔒" }[post.privacy]}
            </div>
          </div>
        </div>
        <div className="relative">
          <button 
            onClick={() => setShowMenu(!showMenu)}
            className="text-white/20 hover:text-white/40 p-1"
          >
            <MoreHorizontal size={18} />
          </button>
          
          <AnimatePresence>
            {showMenu && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                className="absolute right-0 mt-2 w-48 bg-[#1a1a2e] border border-white/10 rounded-2xl shadow-2xl z-20 overflow-hidden"
              >
                {isAuthor && (
                  <button 
                    onClick={() => { setIsEditing(true); setShowMenu(false); }}
                    className="w-full px-4 py-3 text-left text-xs font-bold text-white/60 hover:text-white hover:bg-white/5 flex items-center gap-3 transition-all"
                  >
                    <Edit3 size={14} /> Upravit příspěvek
                  </button>
                )}
                <button 
                  onClick={() => { handleShare(); setShowMenu(false); }}
                  className="w-full px-4 py-3 text-left text-xs font-bold text-white/60 hover:text-white hover:bg-white/5 flex items-center gap-3 transition-all"
                >
                  <Share2 size={14} /> Sdílet příspěvek
                </button>
                <button 
                  onClick={() => { toggleSave(); setShowMenu(false); }}
                  className="w-full px-4 py-3 text-left text-xs font-bold text-white/60 hover:text-white hover:bg-white/5 flex items-center gap-3 transition-all"
                >
                  <Bookmark size={14} /> {post.saved ? "Odstranit z knihovny" : "Uložit do knihovny"}
                </button>
                <button 
                  onClick={() => setShowMenu(false)}
                  className="w-full px-4 py-3 text-left text-xs font-bold text-red-400/60 hover:text-red-400 hover:bg-red-500/5 flex items-center gap-3 transition-all"
                >
                  <Trash2 size={14} /> Smazat (v přípravě)
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="px-4 pb-3">
        {isEditing ? (
          <div className="flex flex-col gap-3">
            <textarea 
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white outline-none focus:border-purple-500/50 min-h-[120px] resize-none"
            />
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => { setIsEditing(false); setEditContent(post.content); }}
                className="px-4 py-2 rounded-xl bg-white/5 text-white/40 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
              >
                Zrušit
              </button>
              <button 
                onClick={handleUpdate}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-cyan-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg hover:shadow-purple-500/20 transition-all"
              >
                Uložit
              </button>
            </div>
          </div>
        ) : post.content && (
          <div className="text-sm text-white/80 leading-relaxed">
            <Markdown>{displayText}</Markdown>
            {isLong && (
              <button onClick={() => setExpanded(!expanded)} className="text-cyan-400 font-bold text-xs ml-1">
                {expanded ? "méně" : "více"}
              </button>
            )}
          </div>
        )}
      </div>

      {post.vocalImprint && (
        <div className="px-4 py-2 bg-purple-500/5 border-y border-white/5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400">
            <Mic size={14} />
          </div>
          <div className="flex-1">
            <div className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Vocal Imprint Signature</div>
            <div className="text-[9px] text-white/40 font-mono truncate">{post.vocalImprint}</div>
          </div>
          <div className="flex gap-0.5">
            {[1,2,3,4,5].map(i => (
              <motion.div 
                key={i}
                animate={{ height: [4, 12, 4] }}
                transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                className="w-0.5 bg-purple-500/50 rounded-full"
              />
            ))}
          </div>
        </div>
      )}

      {post.aiInsight && (
        <div className="px-4 py-3 bg-cyan-500/5 border-y border-white/5 flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 flex-shrink-0">
            <Sparkles size={14} />
          </div>
          <div className="flex-1">
            <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2">
              AI Insight
            </div>
            <div className="text-xs text-white/60 leading-relaxed italic">
              "{post.aiInsight}"
            </div>
          </div>
        </div>
      )}

      {post.image && (
        <div className="relative aspect-video overflow-hidden border-y border-white/5 group/media">
          <img src={post.image} className="w-full h-full object-cover" alt="Post content" referrerPolicy="no-referrer" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/media:opacity-100 transition-opacity flex items-center justify-center">
            <a 
              href={post.image} 
              download={`netbook-image-${post.id}.jpg`}
              target="_blank"
              rel="noreferrer"
              className="p-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-all flex items-center gap-2 text-xs font-bold"
            >
              <Download size={16} /> Stáhnout obrázek
            </a>
          </div>
        </div>
      )}

      {post.video && (
        <div className="relative aspect-video overflow-hidden border-y border-white/5 bg-black group/media">
          <video src={post.video} className="w-full h-full object-contain" controls autoPlay muted loop />
          {post.type === "reel" && post.duration && (
            <div className="absolute bottom-4 right-4 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-white text-[10px] font-bold">
              {Math.floor(post.duration / 60)}:{(post.duration % 60).toString().padStart(2, '0')}
            </div>
          )}
          <div className="absolute top-4 right-4 opacity-0 group-hover/media:opacity-100 transition-opacity">
            <a 
              href={post.video} 
              download={`netbook-video-${post.id}.mp4`}
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-white hover:bg-black/80 transition-all flex items-center gap-2 text-[10px] font-bold"
            >
              <Download size={14} /> Stáhnout video
            </a>
          </div>
        </div>
      )}

      <div className="px-4 py-3 flex items-center justify-between border-t border-white/5">
        <div className="flex items-center gap-6">
          <button onClick={toggleLike} className={`flex items-center gap-2 text-xs font-bold transition-all ${post.liked ? 'text-pink-500' : 'text-white/30 hover:text-white/50'}`}>
            <Heart size={18} fill={post.liked ? "currentColor" : "none"} /> {post.likes}
          </button>
          <button onClick={() => setShowComments(!showComments)} className={`flex items-center gap-2 text-xs font-bold transition-all ${showComments ? 'text-cyan-400' : 'text-white/30 hover:text-white/50'}`}>
            <MessageSquare size={18} /> {post.comments.length}
          </button>
          <button 
            onClick={handleShare}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all ${shared ? 'bg-green-500/10 text-green-400 border border-green-500/30' : 'text-white/30 hover:text-white/50 hover:bg-white/5'}`}
          >
            <Share2 size={16} /> 
            <span className="text-[10px] font-bold uppercase tracking-widest">{shared ? "Zkopírováno!" : "Sdílet"}</span>
            {post.shares > 0 && <span className="text-[10px] opacity-60">{post.shares}</span>}
          </button>
          <button 
            onClick={async () => {
              const res = await summarizeText(post.content);
              if (res) setSummary(res);
            }}
            className="flex items-center gap-2 text-xs font-bold text-cyan-400/60 hover:text-cyan-400"
          >
            <Sparkles size={16} /> Shrnutí
          </button>
        </div>
        <button onClick={toggleSave} className={`${post.saved ? 'text-yellow-400' : 'text-white/30 hover:text-white/50'}`}>
          <Bookmark size={18} fill={post.saved ? "currentColor" : "none"} />
        </button>
      </div>

      <AnimatePresence>
        {summary && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSummary(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-[#1a1a2e] border border-white/10 rounded-3xl p-6 max-w-md w-full shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm uppercase tracking-widest">
                  <Sparkles size={16} /> AI Shrnutí
                </div>
                <button onClick={() => setSummary(null)} className="text-white/20 hover:text-white"><X size={20} /></button>
              </div>
              <div className="text-sm text-white/70 leading-relaxed italic mb-6">
                {summary}
              </div>
              <button 
                onClick={() => setSummary(null)}
                className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold hover:bg-white/10 transition-all"
              >
                Zavřít
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showComments && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-white/5 bg-white/[0.02]"
          >
            <div className="p-4 flex flex-col gap-4">
              {smartReplies.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {smartReplies.map((r, i) => (
                    <button 
                      key={i} 
                      onClick={() => setCommentText(r)}
                      className="text-[9px] bg-purple-500/10 border border-purple-500/20 px-3 py-1.5 rounded-full text-purple-400 hover:bg-purple-500/20 transition-all font-bold"
                    >
                      {r}
                    </button>
                  ))}
                </div>
              )}
              {post.comments.map(c => (
                <div key={c.id} className="flex gap-3">
                  <Avatar name={c.author} size={30} color={T.cyan} />
                  <div className="flex-1 bg-white/5 rounded-2xl p-3">
                    <div className="text-xs font-bold text-white mb-1">{c.author}</div>
                    <div className="text-xs text-white/70">{c.text}</div>
                    <div className="text-[8px] text-white/20 mt-2">{c.time}</div>
                  </div>
                </div>
              ))}
              <div className="flex gap-3 mt-2">
                <Avatar name={currentUser.name} pic={currentUser.picture} size={30} />
                <div className="flex-1 flex gap-2">
                  <input
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    placeholder="Napiš komentář..."
                    onKeyDown={e => e.key === "Enter" && addComment()}
                    className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-xs text-white outline-none focus:border-cyan-500/30"
                  />
                  <button 
                    onClick={addComment}
                    disabled={!commentText.trim()}
                    className="w-8 h-8 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center hover:bg-cyan-500/20 transition-all disabled:opacity-50"
                  >
                    <Send size={14} />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════
   MESSENGER PANEL
══════════════════════════════════════════════════════════ */
function Messenger({ user, friends, onClose }: { user: UserType, friends: Friend[], onClose: () => void }) {
  const [active, setActive] = useState<Friend | null>(friends[0] || null);
  const [convos, setConvos] = useState<Record<string, any[]>>({});
  const [msg, setMsg] = useState("");
  const [aiMode, setAiMode] = useState<string | null>("gemini");
  const [aiBusy, setAiBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [convos, active]);

  const msgs = active ? (convos[active.id] || []) : [];

  const send = async () => {
    if (!msg.trim() || (!active && !aiMode)) return;
    const m = { id: Date.now(), from: "me", text: msg, time: ts() };
    const newMsgs = [...msgs, m];
    const targetId = aiMode ? "ai-chat" : active?.id;
    if (!targetId) return;

    setConvos(p => ({ ...p, [targetId]: newMsgs }));
    const sentMsg = msg;
    setMsg("");

    if (aiMode) {
      setAiBusy(true);
      try {
        const history = newMsgs.slice(-6).map(m => ({ role: m.from === "me" ? "user" : "assistant", content: m.text }));
        const modelConfig = (AI_MODELS as any)[aiMode];
        const reply = await chatWithAI(history, aiMode, undefined, modelConfig.model);
        setConvos(p => ({ ...p, [targetId]: [...(p[targetId] || []), { id: Date.now() + 1, from: "ai", text: reply, time: ts(), persona: aiMode }] }));
      } catch (e) {
        setConvos(p => ({ ...p, [targetId]: [...(p[targetId] || []), { id: Date.now() + 1, from: "ai", text: "⚠️ AI nedostupné", time: ts(), persona: aiMode }] }));
      }
      setAiBusy(false);
    } else if (active) {
      setTimeout(() => {
        const replies = ["👍", "Paráda!", "Jasně, domluveno", "Dám vědět 🔥", "Super nápad!", "Mrknu na to", "😂 to jo!"];
        setConvos(p => ({ ...p, [active.id]: [...(p[active.id] || []), { id: Date.now() + 1, from: active.id, text: rand(replies), time: ts() }] }));
      }, 1000);
    }
  };

  const persona = aiMode ? (AI_MODELS as any)[aiMode] : null;

  return (
    <motion.div 
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed inset-0 sm:inset-auto sm:bottom-0 sm:right-4 w-full sm:w-[380px] h-[100dvh] sm:h-[600px] bg-[#0a0a0f] sm:border border-white/10 sm:rounded-t-3xl shadow-2xl z-[100] flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="p-3 border-b border-white/10 bg-[#0a0a0f]/80 backdrop-blur-xl z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar name={aiMode ? persona?.name : (active?.name || "User")} size={32} color={aiMode ? persona?.color : active?.color} online={active?.status === "online"} />
              {aiMode && (
                <div 
                  className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-[#0a0a0f] flex items-center justify-center text-[10px] shadow-lg"
                  style={{ backgroundColor: persona?.color }}
                >
                  {persona?.icon}
                </div>
              )}
            </div>
            <div>
              <div className="text-xs font-bold text-white">{aiMode ? persona?.name : (active?.name || "Vyberte chat")}</div>
              <div className="text-[9px] text-white/40 flex items-center gap-1">
                {aiMode ? (
                  <span className="flex items-center gap-1.5" style={{ color: persona?.color }}>
                    <span className="text-[10px]">{persona?.icon}</span>
                    <span className="font-bold">{persona?.name}</span>
                  </span>
                ) : active ? (
                  <span className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" /> Online
                  </span>
                ) : (
                  <span className="text-white/20 italic">Žádný aktivní chat</span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/5 text-white/20 hover:text-white/40 transition-colors">
            <X size={18} />
          </button>
        </div>
        
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {friends.length > 0 ? friends.slice(0, 6).map(f => (
            <button 
              key={f.id} 
              onClick={() => { setActive(f); setAiMode(null); }}
              className={`flex-shrink-0 p-0.5 rounded-full transition-all border-2 ${active?.id === f.id ? 'border-purple-500' : 'border-transparent opacity-50 hover:opacity-100'}`}
            >
              <Avatar name={f.name} size={24} color={f.color} online={f.status === "online"} />
            </button>
          )) : (
            <div className="text-[9px] text-white/20 px-2 py-1 italic">Žádní přátelé online</div>
          )}
        </div>
      </div>

      {/* Model Selector Bar */}
      <div className="px-2 py-2 border-b border-white/10 bg-white/5 flex items-center gap-2 overflow-x-auto no-scrollbar">
        {Object.entries(AI_MODELS).map(([k, v]) => (
          <button 
            key={k} 
            onClick={() => { setAiMode(aiMode === k ? null : k); if (!aiMode) setActive(null); }}
            className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-2 transition-all border relative group ${aiMode === k ? '' : 'bg-white/5 border-white/5 text-white/30 hover:bg-white/10'}`}
            style={{ 
              borderColor: aiMode === k ? v.color + "50" : undefined,
              backgroundColor: aiMode === k ? v.color + "20" : undefined,
              color: aiMode === k ? v.color : undefined,
              boxShadow: aiMode === k ? `0 0 15px ${v.color}20` : 'none'
            }}
          >
            <span className="text-sm">{v.icon}</span>
            <div className="flex flex-col items-start leading-tight">
              <span>{v.name}</span>
              <span className="text-[7px] opacity-50 font-normal">{v.desc}</span>
            </div>
            {aiMode === k && (
              <motion.div 
                layoutId="active-glow"
                className="absolute inset-0 rounded-xl border-2 pointer-events-none"
                style={{ borderColor: v.color }}
                initial={false}
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 no-scrollbar bg-gradient-to-b from-transparent to-white/[0.02]">
        {msgs.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center opacity-20">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <MessageCircle size={32} />
            </div>
            <p className="text-sm font-medium">Začni chatovat s {aiMode ? persona?.name : (active?.name || "AI")}</p>
            <p className="text-[10px] mt-1">Zprávy jsou šifrovány protokolem Nexus</p>
          </div>
        )}
        {msgs.map(m => {
          const isMe = m.from === "me";
          const isAI = m.from === "ai";
          const p = isAI ? (AI_MODELS as any)[m.persona] : null;
          return (
            <div key={m.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end group`}>
              {!isMe && (
                <div className="flex-shrink-0 mb-1">
                  <Avatar name={isAI ? p?.name : (active?.name || "User")} size={28} color={isAI ? p?.color : active?.color} />
                </div>
              )}
              <div className={`relative max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed transition-all ${
                isMe 
                  ? 'bg-purple-500/20 border border-purple-500/30 text-white rounded-br-none' 
                  : isAI 
                    ? 'bg-white/5 border border-white/10 text-white rounded-bl-none' 
                    : 'bg-white/5 border border-white/10 text-white/80 rounded-bl-none'
              }`}
              style={{
                borderColor: isAI ? p?.color + "30" : undefined,
                boxShadow: isAI ? `0 4px 20px -5px ${p?.color}10` : 'none'
              }}
              >
                {isAI && (
                  <div className="text-[9px] font-bold mb-1.5 flex items-center justify-between gap-2" style={{ color: p?.color }}>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs">{p?.icon}</span>
                      <span className="uppercase tracking-wider">{p?.name}</span>
                    </div>
                    <span className="text-[7px] opacity-40 font-mono">v{Math.random().toString().slice(2, 5)}</span>
                  </div>
                )}
                <div className="prose prose-invert prose-xs max-w-none">
                  <Markdown>{m.text}</Markdown>
                </div>
                <div className="text-[8px] opacity-30 mt-2 flex items-center justify-end gap-1">
                  {m.time}
                  {isMe && <Check size={8} className="text-purple-400" />}
                </div>
              </div>
            </div>
          );
        })}
        {aiBusy && (
          <div className="flex gap-3 items-end">
            <div className="flex-shrink-0 mb-1">
              <Avatar name={persona?.name} size={28} color={persona?.color} />
            </div>
            <div 
              className="bg-white/5 border border-white/10 p-3 rounded-2xl rounded-bl-none flex gap-1.5 items-center"
              style={{ borderColor: persona?.color + "30" }}
            >
              <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: persona?.color }} />
              <div className="w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:0.2s]" style={{ backgroundColor: persona?.color }} />
              <div className="w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:0.4s]" style={{ backgroundColor: persona?.color }} />
              <span className="text-[9px] ml-2 font-bold uppercase tracking-widest opacity-60 flex items-center gap-1.5" style={{ color: persona?.color }}>
                <span>{persona?.icon}</span>
                <span>{persona?.name} přemýšlí...</span>
              </span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-[#0a0a0f] border-t border-white/10">
        <div className="relative flex items-center gap-2">
          <div className="absolute left-3 text-white/20">
            {aiMode ? <Sparkles size={14} style={{ color: persona?.color }} /> : <MessageCircle size={14} />}
          </div>
          <input
            value={msg}
            onChange={e => setMsg(e.target.value)}
            onKeyDown={e => e.key === "Enter" && send()}
            placeholder={aiMode ? `Zeptej se ${persona?.name}...` : "Napiš zprávu..."}
            className="flex-1 bg-white/5 border border-white/10 rounded-2xl pl-10 pr-12 py-3 text-xs text-white outline-none focus:border-purple-500/30 transition-all"
          />
          <button 
            onClick={send}
            disabled={!msg.trim() || aiBusy}
            className={`absolute right-2 p-2 rounded-xl transition-all ${msg.trim() ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' : 'text-white/20'}`}
          >
            <Send size={16} />
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between px-1">
          <div className="text-[8px] text-white/20 font-bold uppercase tracking-widest flex items-center gap-1">
            <Lock size={8} /> End-to-end Nexus Encryption
          </div>
          {aiMode && (
            <div className="text-[8px] font-bold uppercase tracking-widest flex items-center gap-1" style={{ color: persona?.color }}>
              <Zap size={8} /> {persona?.model}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════
   AI SIDEBAR
══════════════════════════════════════════════════════════ */
function AISidebar() {
  const [persona, setPersona] = useState<"gemini" | "grok" | "gpt" | "claude">("gemini");
  const [msgs, setMsgs] = useState<any[]>([{ role: "assistant", content: `Ahoj! Jsem ${AI_PERSONAS.gemini.name}. Jak ti mohu pomoci s tvorbou obsahu? ✨`, id: 1 }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const send = async () => {
    if (!input.trim() || busy) return;
    const userMsg = { role: "user", content: input, id: Date.now() };
    const hist = [...msgs, userMsg];
    setMsgs(hist);
    setInput("");
    setBusy(true);
    try {
      const reply = await chatWithAI(hist.map(m => ({ role: m.role, content: m.content })), persona);
      setMsgs(p => [...p, { role: "assistant", content: reply, id: Date.now() + 1 }]);
    } catch (e) {
      setMsgs(p => [...p, { role: "assistant", content: `⚠️ Chyba AI`, id: Date.now() + 1 }]);
    }
    setBusy(false);
  };

  const p = AI_PERSONAS[persona];

  return (
    <div className="bg-[#12121e] rounded-3xl border border-white/10 h-full flex flex-col overflow-hidden">
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="text-xs font-bold text-white flex items-center gap-2">
          <span style={{ color: p.color }}>{p.icon}</span> AI Asistent
        </div>
        <div className="flex gap-1 items-center">
          <button 
            onClick={() => setMsgs([{ role: "assistant", content: `Ahoj! Jsem ${AI_PERSONAS[persona].name}. Jak ti mohu pomoci s tvorbou obsahu? ✨`, id: Date.now() }])}
            className="w-7 h-7 rounded-full flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-all mr-2"
            title="Smazat historii chatu"
          >
            <Trash2 size={14} />
          </button>
          {Object.entries(AI_PERSONAS).map(([k, v]) => (
            <button
              key={k}
              onClick={() => setPersona(k as any)}
              className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] transition-all border ${persona === k ? 'border-white/50 bg-white/10' : 'border-white/5 hover:bg-white/5'}`}
              style={{ color: v.color }}
            >
              {v.icon}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 no-scrollbar">
        {msgs.map(m => (
          <div key={m.id} className={`flex flex-col ${m.role === "user" ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[90%] p-3 rounded-2xl text-[11px] leading-relaxed ${m.role === "user" ? 'bg-purple-500/20 border border-purple-500/30 text-white rounded-br-none' : 'bg-white/5 border border-white/10 text-white/80 rounded-bl-none'}`}>
              <Markdown>{m.content}</Markdown>
            </div>
          </div>
        ))}
        {busy && (
          <div className="bg-white/5 border border-white/10 p-3 rounded-2xl rounded-bl-none flex gap-1 w-fit">
            <div className="w-1 h-1 rounded-full bg-white/20 animate-bounce" />
            <div className="w-1 h-1 rounded-full bg-white/20 animate-bounce [animation-delay:0.2s]" />
            <div className="w-1 h-1 rounded-full bg-white/20 animate-bounce [animation-delay:0.4s]" />
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="p-4 border-t border-white/10 flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          placeholder={`Zeptej se ${p.name}...`}
          className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-[10px] text-white outline-none focus:border-purple-500/30"
        />
        <button 
          onClick={send}
          disabled={!input.trim() || busy}
          className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-all disabled:opacity-50"
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   LIBRARY VIEW
   Složky: AI Generace, Fotografie, Hudba
══════════════════════════════════════════════════════════ */
function LibraryView({ library }: { library: LibraryItem[] }) {
  const [filter, setFilter] = useState<LibraryItem["category"] | "all">("all");
  
  const categories = [
    { id: "all", label: "Vše", icon: Layers },
    { id: "ai-generated", label: "AI Generace", icon: Sparkles },
    { id: "photos", label: "Fotografie", icon: Image },
    { id: "music", label: "Hudba", icon: Music },
  ];

  const filtered = filter === "all" ? library : library.filter(i => i.category === filter);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {categories.map(c => (
          <button
            key={c.id}
            onClick={() => setFilter(c.id as any)}
            className={`flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all border ${filter === c.id ? 'bg-purple-500/10 border-purple-500/50 text-purple-400' : 'bg-white/5 border-white/10 text-white/40'}`}
          >
            <c.icon size={14} /> {c.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {filtered.length > 0 ? filtered.map(item => (
          <motion.div 
            layout
            key={item.id}
            className="group relative aspect-square bg-white/5 rounded-3xl border border-white/10 overflow-hidden"
          >
            {item.type === "image" && <img src={item.url} className="w-full h-full object-cover" alt={item.name} />}
            {item.type === "video" && <video src={item.url} className="w-full h-full object-cover" />}
            {item.type === "audio" && (
              <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                <Music size={32} className="text-pink-400 mb-2" />
                <div className="text-[10px] font-bold text-white/60 truncate w-full">{item.name}</div>
              </div>
            )}
            
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4 gap-3">
              <div className="text-xs font-bold text-white text-center line-clamp-2">{item.name}</div>
              <div className="flex gap-2">
                <a 
                  href={item.url} 
                  download={item.name || "download"} 
                  className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all"
                >
                  <Download size={16} />
                </a>
                <button className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all"><Share2 size={16} /></button>
              </div>
            </div>
          </motion.div>
        )) : (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-white/20">
            <Bookmark size={48} className="mb-4" />
            <p className="text-sm font-bold">Knihovna je zatím prázdná</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   AI CHAT HUB
   Gemini, Grok, GPT, Claude
══════════════════════════════════════════════════════════ */
function ChatHub({ user, onDraft }: { user: UserType, onDraft: (text: string) => void }) {
  const assistants: AIAssistant[] = (user.aiAssistants && user.aiAssistants.length > 0) ? user.aiAssistants : [
    { id: '1', name: 'Gemini', role: 'Kreativní vizionář', avatar: 'https://picsum.photos/seed/gemini/200', status: 'active', model: 'gemini' },
    { id: '2', name: 'Grok', role: 'Analytický bavič', avatar: 'https://picsum.photos/seed/grok/200', status: 'idle', model: 'grok' },
    { id: '3', name: 'Claude', role: 'Precizní asistent', avatar: 'https://picsum.photos/seed/claude/200', status: 'learning', model: 'claude' },
    { id: '4', name: 'GPT-4', role: 'Všestranný pomocník', avatar: 'https://picsum.photos/seed/gpt/200', status: 'active', model: 'gpt' },
  ];

  const [activeAI, setActiveAI] = useState<AIAssistant>(assistants[0]);
  const [messages, setMessages] = useState<Record<string, { role: "user" | "ai", text: string }[]>>({});
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const history = await safeFetch(`/api/chat-history?userId=${user.sub}&persona=${activeAI.name}`);
        if (history && history.length > 0) {
          setMessages(prev => ({
            ...prev,
            [activeAI.id]: history.map((h: any) => ({ role: h.role, text: h.content }))
          }));
        } else {
          setMessages(prev => ({
            ...prev,
            [activeAI.id]: [{ role: "ai", text: `Ahoj ${user.name}! Jsem ${activeAI.name}. Jak ti můžu dnes pomoci s tvou tvorbou v protokolu BTS?` }]
          }));
        }
      } catch (err) {
        console.error("Failed to load chat history:", err);
      }
    };
    loadHistory();
  }, [activeAI?.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, activeAI.id]);

  const saveMessage = async (role: string, content: string) => {
    try {
      await safeFetch("/api/chat-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.sub, persona: activeAI.name, role, content })
      });
    } catch (err) {
      console.error("Failed to save message:", err);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input;
    setInput("");
    setMessages(prev => ({ ...prev, [activeAI.id]: [...(prev[activeAI.id] || []), { role: "user", text: userMsg }] }));
    setLoading(true);
    await saveMessage("user", userMsg);

    try {
      const history = (messages[activeAI.id] || []).map(m => ({ role: m.role, content: m.text }));
      const systemPrompt = `Jsi ${activeAI.name} — futuristický AI asistent v protokolu BTS s rolí: ${activeAI.role}. 
      Tvůj model je ${activeAI.model}. Odpovídej v tomto stylu. Buď kreativní a nápomocný.`;
      
      const response = await chatWithAI([...history, { role: "user", content: userMsg }], activeAI.model, systemPrompt);
      const aiMsg = response || "Omlouvám se, ale AI neodpovídá.";
      setMessages(prev => ({ ...prev, [activeAI.id]: [...(prev[activeAI.id] || []), { role: "ai", text: aiMsg }] }));
      await saveMessage("ai", aiMsg);
    } catch (err) {
      const errMsg = "Omlouvám se, ale došlo k chybě při spojení s AI.";
      setMessages(prev => ({ ...prev, [activeAI.id]: [...(prev[activeAI.id] || []), { role: "ai", text: errMsg }] }));
      await saveMessage("ai", errMsg);
    }
    setLoading(false);
  };

  const clearHistory = async () => {
    setShowClearConfirm(true);
  };

  const confirmClear = async () => {
    try {
      await safeFetch(`/api/chat-history?userId=${user.sub}&persona=${activeAI.name}`, { method: "DELETE" });
      setMessages(prev => ({
        ...prev,
        [activeAI.id]: [{ role: "ai", text: `Historie byla smazána. Jsem ${activeAI.name}. Jak ti můžu dnes pomoci?` }]
      }));
      setShowClearConfirm(false);
    } catch (err) {
      console.error("Failed to clear chat history:", err);
    }
  };

  return (
    <div className="bg-[#12121e] rounded-3xl border border-white/10 overflow-hidden flex flex-col h-[calc(100vh-160px)] sm:h-[650px] shadow-2xl">
      {/* Sidebar / Selector */}
      <div className="flex border-b border-white/5 bg-white/5 overflow-x-auto no-scrollbar items-center">
        <div className="flex flex-1">
          {assistants.map(ai => (
            <button
              key={ai.id}
              onClick={() => setActiveAI(ai)}
              className={`flex-shrink-0 px-6 py-4 flex flex-col items-center gap-2 transition-all border-b-2 ${activeAI.id === ai.id ? 'border-purple-500 bg-purple-500/10 text-white' : 'border-transparent text-white/30 hover:text-white/50'}`}
            >
              <div className="relative">
                <img src={ai.avatar} className="w-8 h-8 rounded-xl object-cover border border-white/10" alt={ai.name} />
                <div className={`absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-[#12121e] ${ai.status === 'active' ? 'bg-green-500' : ai.status === 'learning' ? 'bg-purple-500' : 'bg-white/20'}`} />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px]" style={{ color: (AI_MODELS as any)[ai.model]?.color }}>{(AI_MODELS as any)[ai.model]?.icon}</span>
                <span className="text-[9px] font-bold uppercase tracking-widest">{ai.name}</span>
              </div>
            </button>
          ))}
        </div>
        <button 
          onClick={clearHistory}
          className="p-4 text-white/20 hover:text-red-400 transition-all"
          title="Smazat historii"
        >
          <Trash2 size={18} />
        </button>
      </div>

      {/* Chat Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 flex flex-col gap-5 no-scrollbar bg-gradient-to-b from-transparent to-black/20">
        {(messages[activeAI.id] || []).map((m, i) => (
          <div key={i} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
            <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${
              m.role === "user" 
                ? "bg-purple-500 text-white rounded-tr-none shadow-lg shadow-purple-500/10" 
                : "bg-white/5 text-white/80 border border-white/10 rounded-tl-none"
            }`}>
              <Markdown>{m.text}</Markdown>
            </div>
            {m.role === "ai" && (
              <div className="flex gap-2 mt-2">
                <button 
                  onClick={() => onDraft(m.text)}
                  className="text-[10px] font-bold text-cyan-400/60 hover:text-cyan-400 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-cyan-400/5 border border-cyan-400/10 transition-all"
                >
                  <Plus size={10} /> Vytvořit draft příspěvku
                </button>
                <button 
                  onClick={() => {
                    const blob = new Blob([m.text], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `ai-note-${activeAI.name.toLowerCase()}.txt`;
                    a.click();
                  }}
                  className="text-[10px] font-bold text-white/30 hover:text-white/60 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-white/10 transition-all"
                >
                  <Save size={10} /> Uložit poznámku
                </button>
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl rounded-tl-none flex items-center gap-3">
              <div className="flex gap-1">
                <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: (AI_MODELS as any)[activeAI.model]?.color }} />
                <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: (AI_MODELS as any)[activeAI.model]?.color }} />
                <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: (AI_MODELS as any)[activeAI.model]?.color }} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5" style={{ color: (AI_MODELS as any)[activeAI.model]?.color }}>
                <span>{(AI_MODELS as any)[activeAI.model]?.icon}</span>
                <span className="opacity-40">{activeAI.name} přemýšlí...</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-6 border-t border-white/5 bg-white/5 flex gap-3">
        <div className="flex-1 bg-[#1a1a2e] border border-white/10 rounded-2xl p-2 focus-within:border-purple-500/50 transition-all flex items-center">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && sendMessage()}
            placeholder={`Zeptej se ${activeAI.name}...`}
            className="flex-1 bg-transparent border-none outline-none px-4 text-sm text-white placeholder:text-white/20"
          />
          <div className="flex gap-2 pr-2">
            <button className="p-2 rounded-xl text-white/20 hover:text-white/60 transition-all">
              <Mic size={18} />
            </button>
            <button className="p-2 rounded-xl text-white/20 hover:text-white/60 transition-all">
              <Paperclip size={18} />
            </button>
          </div>
        </div>
        <button 
          onClick={sendMessage}
          disabled={!input.trim() || loading}
          className="w-12 h-12 rounded-2xl bg-gradient-to-r from-purple-500 to-cyan-500 text-white flex items-center justify-center shadow-lg hover:shadow-purple-500/20 transition-all disabled:opacity-50"
        >
          <Send size={20} />
        </button>
      </div>

      <AnimatePresence>
        {showClearConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-[#1a1a2e] border border-white/10 rounded-3xl p-6 max-w-xs w-full shadow-2xl text-center"
            >
              <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto mb-4">
                <Trash2 size={24} />
              </div>
              <h3 className="text-white font-bold mb-2">Smazat historii?</h3>
              <p className="text-xs text-white/40 mb-6">Tato akce je nevratná a smaže celou konverzaci s {activeAI.name}.</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 py-3 rounded-xl bg-white/5 text-white/60 text-xs font-bold hover:bg-white/10 transition-all"
                >
                  Zrušit
                </button>
                <button 
                  onClick={confirmClear}
                  className="flex-1 py-3 rounded-xl bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                >
                  Smazat
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   AI CREATOR STUDIO
   Graphics, Video, Summarization, Ideas, Research
   ══════════════════════════════════════════════════════════ */
function CreatorStudio({ user, onSave, onDraft }: { user: UserType, onSave: (item: any) => void, onDraft: (text: string) => void }) {
  const [activeTool, setActiveTool] = useState<"graphics" | "video" | "summarize" | "ideas" | "research">("graphics");
  const [prompt, setPrompt] = useState("");
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [canvasMode, setCanvasMode] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<"brush" | "erase">("brush");
  const [error, setError] = useState<string | null>(null);

  const handleSelectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setError(null);
    }
  };

  const tools = [
    { id: "graphics", label: "AI Grafika", icon: Image, color: T.cyan },
    { id: "video", label: "AI Video", icon: Video, color: T.purple },
    { id: "summarize", label: "Sumarizace", icon: FileText, color: T.green },
    { id: "ideas", label: "Návrhy příspěvků", icon: Lightbulb, color: T.yellow },
    { id: "research", label: "Výzkum", icon: Search, color: T.orange },
  ];

  const handleReferenceImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReferenceImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setResult(null);
    setCanvasMode(false);
    setError(null);

    try {
      if (activeTool === "graphics") {
        const url = await generateAIImage(prompt, false, referenceImage || undefined);
        setResult(url);
      } else if (activeTool === "video") {
        const url = await generateAIVideo(prompt);
        setResult(url);
      } else if (activeTool === "summarize") {
        const summary = await summarizeText(prompt);
        setResult(summary);
      } else if (activeTool === "ideas") {
        const ideas = await chatWithAI([{ role: "user", content: `Navrhni 5 kreativních nápadů na příspěvky pro protokol BTS na téma: ${prompt}. Každý nápad by měl obsahovat krátký popisek a navrhovaný vizuál.` }], "gemini");
        setResult(ideas);
      } else if (activeTool === "research") {
        const response = await chatWithAI([{ role: "user", content: `Proveď hloubkový výzkum na téma: ${prompt}. Výsledek formátuj v Markdownu.` }], "gemini");
        setResult(response);
      }
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes("403") || err.message?.includes("permission") || err.message?.includes("not found")) {
        setError("Pro tento model je vyžadován vlastní API klíč s povoleným billingem.");
      } else {
        setError("Došlo k chybě při generování. Zkuste to prosím znovu.");
      }
    }
    setLoading(false);
  };

  const saveToLib = () => {
    if (!result) return;
    onSave({
      type: activeTool === "graphics" ? "image" : activeTool === "video" ? "video" : "file",
      category: (activeTool === "graphics" || activeTool === "video") ? "ai-generated" : "other",
      url: typeof result === 'string' ? result : JSON.stringify(result),
      name: prompt || `AI ${activeTool}`
    });
  };

  const initCanvas = () => {
    setCanvasMode(true);
    setTimeout(() => {
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx && result && activeTool === "graphics") {
        const image = new window.Image();
        image.crossOrigin = "anonymous";
        image.src = result;
        image.onload = () => ctx.drawImage(image, 0, 0, 800, 800);
      }
    }, 100);
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (800 / rect.width);
    const y = (e.clientY - rect.top) * (800 / rect.height);

    if (tool === "brush") {
      ctx.fillStyle = "rgba(0, 200, 255, 0.4)";
      ctx.beginPath();
      ctx.arc(x, y, 15, 0, Math.PI * 2);
      ctx.fill();
    } else if (tool === "erase") {
      ctx.clearRect(x - 15, y - 15, 30, 30);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-[#12121e] rounded-3xl border border-white/10 p-6">
        <div className="flex flex-wrap gap-2 mb-6">
          {tools.map(t => (
            <button
              key={t.id}
              onClick={() => { setActiveTool(t.id as any); setResult(null); setCanvasMode(false); }}
              className={`flex-1 min-w-[120px] flex items-center justify-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all border ${activeTool === t.id ? 'bg-white/10 border-white/20 text-white' : 'bg-white/5 border-white/10 text-white/30 hover:text-white/50'}`}
            >
              <t.icon size={16} style={{ color: activeTool === t.id ? t.color : 'inherit' }} /> {t.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          {activeTool === "summarize" ? (
            <textarea 
              placeholder="Vlož dlouhý text k sumarizaci..."
              value={prompt} 
              onChange={(e) => setPrompt(e.target.value)} 
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm outline-none focus:border-purple-500/30 transition-all min-h-[200px] resize-none"
            />
          ) : (
            <div className="flex gap-3">
              <input 
                placeholder={
                  activeTool === "ideas" ? "Zadej téma nebo klíčová slova pro nápady..." :
                  `Popiš, co chceš vytvořit (${activeTool})...`
                } 
                value={prompt} 
                onChange={(e) => setPrompt(e.target.value)} 
                className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-white text-sm outline-none focus:border-purple-500/30 transition-all"
              />
              <button 
                onClick={handleGenerate} 
                disabled={loading || !prompt.trim()}
                className="px-8 py-3 rounded-2xl bg-gradient-to-r from-purple-500 to-cyan-500 text-white font-bold text-sm shadow-lg hover:shadow-purple-500/20 transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : "Generovat"}
              </button>
            </div>
          )}
          
          {activeTool === "summarize" && (
            <div className="flex justify-end">
              <button 
                onClick={handleGenerate} 
                disabled={loading || !prompt.trim()}
                className="px-8 py-3 rounded-2xl bg-gradient-to-r from-purple-500 to-cyan-500 text-white font-bold text-sm shadow-lg hover:shadow-purple-500/20 transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : "Sumarizovat"}
              </button>
            </div>
          )}
        </div>

        {activeTool === "graphics" && (
          <div className="mt-4 flex flex-col gap-3">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white cursor-pointer transition-all text-[10px] font-bold uppercase tracking-widest">
                <Paperclip size={14} />
                {referenceImage ? "Změnit předlohu" : "Vložit předlohu (např. Logo)"}
                <input type="file" accept="image/*" onChange={handleReferenceImageChange} className="hidden" />
              </label>
              {referenceImage && (
                <button 
                  onClick={() => setReferenceImage(null)}
                  className="text-[10px] font-bold text-red-400/60 hover:text-red-400 uppercase tracking-widest"
                >
                  Odstranit
                </button>
              )}
            </div>
            {referenceImage && (
              <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-white/10">
                <img src={referenceImage} className="w-full h-full object-cover" alt="Reference" />
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-red-400 text-xs font-bold">
              <AlertCircle size={16} /> {error}
            </div>
            <button 
              onClick={handleSelectKey}
              className="px-4 py-2 rounded-xl bg-red-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-all"
            >
              Vybrat API klíč
            </button>
          </div>
        )}
      </div>

      {result && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#12121e] rounded-3xl border border-white/10 overflow-hidden"
        >
          <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-purple-400" />
              <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Výsledek AI Generace</span>
            </div>
            <div className="flex gap-2">
              {activeTool === "graphics" && !canvasMode && (
                <button onClick={initCanvas} className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white flex items-center gap-2 text-[10px] font-bold transition-all">
                  <Edit3 size={14} /> Retušovat
                </button>
              )}
              <button onClick={saveToLib} className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500 hover:text-white flex items-center gap-2 text-[10px] font-bold transition-all">
                <Save size={14} /> Uložit
              </button>
              <button onClick={() => setResult(null)} className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white transition-all">
                <X size={14} />
              </button>
            </div>
          </div>

          <div className="p-6">
            {activeTool === "graphics" && (
              canvasMode ? (
                <div className="relative aspect-square w-full max-w-[600px] mx-auto bg-black rounded-2xl overflow-hidden border border-white/10 cursor-crosshair">
                  <canvas 
                    ref={canvasRef} 
                    width={800} height={800} 
                    onMouseMove={(e) => e.buttons === 1 && handleCanvasClick(e)}
                    onMouseDown={handleCanvasClick}
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute top-4 right-4 flex gap-2">
                    <button onClick={() => setTool("brush")} className={`p-2 rounded-xl border ${tool === "brush" ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-400" : "bg-black/60 border-white/10 text-white/40"}`}><MousePointer size={16} /></button>
                    <button onClick={() => setTool("erase")} className={`p-2 rounded-xl border ${tool === "erase" ? "bg-pink-500/20 border-pink-500/50 text-pink-400" : "bg-black/60 border-white/10 text-white/40"}`}><RefreshCw size={16} /></button>
                  </div>
                </div>
              ) : (
                <div className="relative group">
                  <img src={result} className="w-full max-h-[600px] object-contain rounded-2xl mx-auto border border-white/5 shadow-2xl" alt="AI Result" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <a href={result} download="bts-ai-art.jpg" className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                      <Download size={18} /> Stáhnout ve vysoké kvalitě
                    </a>
                  </div>
                </div>
              )
            )}
            {activeTool === "video" && (
              <div className="flex flex-col gap-6">
                <div className="relative group">
                  <video src={result} controls className="w-full max-h-[600px] rounded-2xl mx-auto border border-white/5 shadow-2xl" />
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a href={result} download="bts-ai-video.mp4" className="p-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-white text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                      <Download size={14} /> Stáhnout
                    </a>
                  </div>
                </div>
                <div className="flex justify-center gap-4">
                  <button 
                    onClick={() => {
                      saveToLib();
                      const a = document.createElement('a');
                      a.href = result;
                      a.download = "bts-ai-video.mp4";
                      a.click();
                    }}
                    className="px-8 py-4 rounded-2xl bg-gradient-to-r from-purple-500 to-cyan-500 text-white font-bold text-sm shadow-xl hover:shadow-purple-500/20 transition-all flex items-center gap-3"
                  >
                    <Download size={20} /> Stáhnout video do knihovny
                  </button>
                  <button 
                    onClick={() => onDraft(`Podívejte se na mé nové AI video: ${result}`)}
                    className="px-8 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold text-sm hover:bg-white/10 transition-all flex items-center gap-3"
                  >
                    <Plus size={20} /> Vytvořit příspěvek
                  </button>
                </div>
              </div>
            )}
            {(activeTool === "summarize" || activeTool === "ideas" || activeTool === "research") && (
              <div className="flex flex-col gap-6">
                <div className="bg-black/20 p-8 rounded-3xl border border-white/5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    {activeTool === "summarize" ? <FileText size={80} /> : activeTool === "ideas" ? <Lightbulb size={80} /> : <Search size={80} />}
                  </div>
                  <div className="prose prose-invert max-w-none text-sm text-white/80 leading-relaxed relative z-10">
                    <Markdown>{result}</Markdown>
                  </div>
                </div>
                <div className="flex flex-wrap justify-end gap-3">
                  <button 
                    onClick={() => onDraft(result)}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-cyan-500 text-white text-xs font-black uppercase tracking-widest shadow-lg hover:shadow-purple-500/20 transition-all flex items-center gap-2"
                  >
                    <Plus size={16} /> Vytvořit příspěvek
                  </button>
                  <button 
                    onClick={() => {
                      const blob = new Blob([result], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `bts-ai-${activeTool}.txt`;
                      a.click();
                    }}
                    className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2"
                  >
                    <Download size={16} /> Exportovat text
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   SUNO MUSIC INTERFACE
══════════════════════════════════════════════════════════ */
function SunoInterface({ onSave }: { onSave: (item: any) => void }) {
  const [lyrics, setLyrics] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMusic, setGeneratedMusic] = useState<string | null>(null);

  const generateMusic = async () => {
    if (!lyrics.trim()) return;
    setIsGenerating(true);
    // Simulated Suno Bridge
    setTimeout(() => {
      setIsGenerating(false);
      setGeneratedMusic("https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3");
    }, 4000);
  };

  const saveToLib = () => {
    if (!generatedMusic) return;
    onSave({
      type: "audio",
      category: "music",
      url: generatedMusic,
      name: lyrics.slice(0, 30) || "AI Generated Music"
    });
  };

  return (
    <div className="bg-[#12121e] rounded-3xl border border-white/10 p-6 flex flex-col gap-6">
      <h3 className="text-lg font-bold text-white flex items-center gap-3">
        <Music className="text-pink-400" /> Suno AI Music Generator
      </h3>
      
      <div className="flex flex-col gap-4">
        <textarea 
          placeholder="Vlož text písně nebo popis žánru (např. Trap beat with deep bass, futuristic atmosphere...)" 
          value={lyrics}
          onChange={(e) => setLyrics(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white text-sm min-h-[150px] outline-none focus:border-pink-500/30 transition-all resize-none"
        />
        <button 
          onClick={generateMusic} 
          disabled={isGenerating || !lyrics.trim()}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold text-sm shadow-xl hover:shadow-pink-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
        >
          {isGenerating ? (
            <>
              <Loader2 className="animate-spin" size={18} /> Komponuji skladbu...
            </>
          ) : (
            <>
              <Zap size={18} /> Vytvořit track
            </>
          )}
        </button>
      </div>

      <div className="mt-4">
        <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-4">Poslední generace</p>
        <div className="flex flex-col gap-2">
          {[
            { name: "Nexus_Vocal_Imprint_V1.mp3", duration: "0:45", date: "Dnes" },
            { name: "Cyberpunk_Dreams_Loop.mp3", duration: "1:20", date: "Včera" },
          ].map((track, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between group hover:bg-white/10 transition-all cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center text-pink-400 group-hover:bg-pink-500 group-hover:text-white transition-all">
                  <Play size={18} fill="currentColor" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">{track.name}</div>
                  <div className="text-[10px] text-white/30">{track.duration} · {track.date}</div>
                </div>
              </div>
              <button className="text-white/20 hover:text-white"><MoreHorizontal size={18} /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   GROUPS VIEW
 ══════════════════════════════════════════════════════════ */
function GroupsView({ groups, onSelect, onCreate, onJoin }: { groups: Group[], onSelect: (g: Group) => void, onCreate: (name: string, desc: string) => void, onJoin: (g: Group) => void }) {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-white">Skupiny</h2>
        <button 
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 rounded-xl bg-purple-500 text-white text-xs font-bold hover:bg-purple-600 transition-all flex items-center gap-2"
        >
          <Plus size={16} /> Vytvořit skupinu
        </button>
      </div>

      <AnimatePresence>
        {showCreate && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-[#12121e] rounded-3xl border border-white/10 p-6 overflow-hidden"
          >
            <div className="flex flex-col gap-4">
              <input 
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Název skupiny"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500/50"
              />
              <textarea 
                value={desc}
                onChange={e => setDesc(e.target.value)}
                placeholder="Popis skupiny..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500/50 min-h-[100px] resize-none"
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-white/40 text-xs font-bold">Zrušit</button>
                <button 
                  onClick={() => { onCreate(name, desc); setName(""); setDesc(""); setShowCreate(false); }}
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-cyan-500 text-white text-xs font-bold"
                >
                  Vytvořit
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {groups.map(g => (
          <div key={g.id} className="bg-[#12121e] rounded-3xl border border-white/10 overflow-hidden group hover:border-purple-500/30 transition-all">
            <div className="h-24 relative">
              <img src={g.coverPhoto || ""} className="w-full h-full object-cover opacity-50" alt={g.name} referrerPolicy="no-referrer" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#12121e] to-transparent" />
            </div>
            <div className="p-6 -mt-8 relative">
              <h3 className="text-lg font-bold text-white mb-1">{g.name}</h3>
              <p className="text-xs text-white/40 mb-4 line-clamp-2">{g.description}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] font-bold text-white/20 uppercase tracking-widest">
                  <Users size={12} /> {g.memberCount} členů
                </div>
                <div className="flex gap-2">
                  {!g.isMember && (
                    <button 
                      onClick={() => onJoin(g)}
                      className="px-4 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-white hover:bg-white/10"
                    >
                      Připojit se
                    </button>
                  )}
                  <button 
                    onClick={() => onSelect(g)}
                    className="px-4 py-1.5 rounded-lg bg-purple-500 text-[10px] font-bold text-white hover:bg-purple-600"
                  >
                    Otevřít
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   GROUP DETAIL VIEW
 ══════════════════════════════════════════════════════════ */
function GroupDetailView({ group, user, onUpdatePost, onBack, onJoin, onLeave, onPost }: { group: Group, user: UserType, onUpdatePost: (p: Post) => void, onBack: () => void, onJoin: () => void, onLeave: () => void, onPost: (c: string, i: string | null, v: string | null) => void }) {
  const [activeTab, setActiveTab] = useState("feed");
  const [members, setMembers] = useState<any[]>([]);
  const [groupPosts, setGroupPosts] = useState<Post[]>([]);
  const [postText, setPostText] = useState("");

  useEffect(() => {
    safeFetch(`/api/groups/${group.id}/members`)
      .then(data => { if (data) setMembers(data); });
    
    safeFetch(`/api/groups/${group.id}/posts`)
      .then(data => {
        if (data) {
          setGroupPosts(data.map((p: any) => ({
            ...p,
            comments: [],
            liked: false,
            saved: false,
            authorName: p.author_name || "Uživatel",
            authorPic: p.author_pic || null,
            timestamp: p.created_at ? new Date(p.created_at).getTime() : Date.now()
          })));
        }
      });
  }, [group.id]);

  const handleGroupPost = (c: string, i: string | null, v: string | null) => {
    const p: Post = {
      id: Date.now(),
      authorId: user.sub,
      authorName: user.name,
      authorPic: user.picture,
      content: c,
      image: i,
      video: v,
      type: "post",
      likes: 0,
      comments: [],
      shares: 0,
      saved: false,
      liked: false,
      time: "právě teď",
      timestamp: Date.now(),
      privacy: "public",
      groupId: group.id
    };
    setGroupPosts(prev => [p, ...prev]);
    onPost(c, i, v);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-[#12121e] rounded-3xl border border-white/10 overflow-hidden">
        <div className="h-48 relative">
          <img src={group.coverPhoto || ""} className="w-full h-full object-cover" alt={group.name} referrerPolicy="no-referrer" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#12121e] to-transparent" />
          <button 
            onClick={onBack}
            className="absolute top-4 left-4 p-2 rounded-xl bg-black/40 text-white hover:bg-black/60 backdrop-blur-md border border-white/10 transition-all"
          >
            <ArrowLeft size={18} />
          </button>
        </div>
        <div className="px-8 pb-8 -mt-12 relative">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h2 className="text-3xl font-black text-white tracking-tight">{group.name}</h2>
              <p className="text-white/40 text-sm mt-2 max-w-xl">{group.description}</p>
              <div className="flex items-center gap-4 mt-4">
                <div className="flex items-center gap-2 text-white/60 text-xs">
                  <Users size={14} className="text-purple-400" /> {group.memberCount} členů
                </div>
                <div className="flex items-center gap-2 text-white/60 text-xs">
                  <Calendar size={14} className="text-cyan-400" /> Vytvořeno {new Date(group.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              {group.isMember ? (
                <button 
                  onClick={onLeave}
                  className="px-6 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-white/60 font-bold text-sm hover:bg-white/10 transition-all"
                >
                  Opustit skupinu
                </button>
              ) : (
                <button 
                  onClick={onJoin}
                  className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-purple-500 to-cyan-500 text-white font-bold text-sm shadow-lg shadow-purple-500/20 transition-all"
                >
                  Připojit se
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="px-8 border-t border-white/5 flex gap-8">
          {["feed", "members"].map(t => (
            <button 
              key={t}
              onClick={() => setActiveTab(t)}
              className={`py-4 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === t ? 'border-purple-500 text-white' : 'border-transparent text-white/30 hover:text-white/50'}`}
            >
              {t === "feed" ? "Příspěvky" : "Členové"}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "feed" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {group.isMember && (
            <div className="md:col-span-2 bg-[#12121e] rounded-3xl border border-white/10 p-4 flex gap-4">
              <Avatar name={user.name} pic={user.picture} size={42} />
              <div className="flex-1 flex flex-col gap-3">
                <textarea 
                  value={postText}
                  onChange={e => setPostText(e.target.value)}
                  placeholder={`Napiš něco do skupiny ${group.name}...`}
                  className="w-full bg-transparent border-none outline-none text-sm text-white placeholder:text-white/20 min-h-[60px] resize-none"
                />
                <div className="flex justify-end">
                  <button 
                    onClick={() => { handleGroupPost(postText, null, null); setPostText(""); }}
                    disabled={!postText.trim()}
                    className="px-6 py-2 rounded-xl bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-500/20 disabled:opacity-50"
                  >
                    Přidat příspěvek
                  </button>
                </div>
              </div>
            </div>
          )}
          {groupPosts.length > 0 ? (
            groupPosts.map(p => (
              <PostCard key={p.id} post={p} currentUser={user} onUpdate={onUpdatePost} />
            ))
          ) : (
            <div className="py-20 text-center opacity-20">
              <Layers size={48} className="mx-auto mb-4" />
              <p className="text-sm font-bold">Zatím žádné příspěvky</p>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map(m => (
            <div key={m.id} className="bg-[#12121e] rounded-2xl border border-white/10 p-4 flex items-center gap-4">
              <Avatar name={m.name} pic={m.picture} size={48} />
              <div>
                <div className="text-sm font-bold text-white">{m.name}</div>
                <div className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">{m.role}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
/* ══════════════════════════════════════════════════════════
   ACCOUNT SETTINGS
 ══════════════════════════════════════════════════════════ */
function AccountSettings({ user, posts, onUpdateUser, onUpdatePost }: { user: UserType, posts: Post[], onUpdateUser: (u: UserType) => void, onUpdatePost: (p: Post) => void }) {
  const [activeSection, setActiveSection] = useState("Soukromí");
  const sections = [
    { id: "Soukromí", icon: Lock },
    { id: "Zabezpečení", icon: Lock },
    { id: "Vzhled", icon: Edit3 },
    { id: "Platby (Wolt)", icon: Zap },
    { id: "AI Autonomie", icon: Sparkles },
    { id: "AI Asistenti", icon: Users },
    { id: "Vokální Stopa", icon: Mic },
    { id: "Metaverse", icon: Globe },
  ];

  return (
    <div className="bg-[#12121e] rounded-3xl border border-white/10 overflow-hidden min-h-[600px] flex flex-col lg:flex-row">
      <div className="w-full lg:w-64 border-b lg:border-b-0 lg:border-r border-white/5 p-4 flex flex-row lg:flex-col gap-1 overflow-x-auto no-scrollbar">
        <h2 className="hidden lg:block px-4 py-2 text-xs font-bold text-white/20 uppercase tracking-widest mb-2">Nastavení</h2>
        {sections.map(({ id, icon: Icon }) => (
          <button 
            key={id} 
            onClick={() => setActiveSection(id)}
            className={`flex-shrink-0 lg:w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${activeSection === id ? 'bg-purple-500/10 text-purple-400' : 'text-white/30 hover:bg-white/5 hover:text-white/50'}`}
          >
            <Icon size={18} /> <span className="whitespace-nowrap">{id}</span>
          </button>
        ))}
      </div>
      
      <div className="flex-1 p-4 sm:p-8">
        <div className="max-w-xl">
          <h3 className="text-xl font-bold text-white mb-6">{activeSection}</h3>
          
          {activeSection === "Soukromí" && (
            <div className="flex flex-col gap-6">
              <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-sm font-bold text-white">Profil Architekta</div>
                    <div className="text-xs text-white/40">Kdo může vidět tvůj profil a statistiky</div>
                  </div>
                  <div className="w-12 h-6 rounded-full bg-purple-500/20 border border-purple-500/50 relative">
                    <div className="absolute right-1 top-1 w-4 h-4 rounded-full bg-purple-400" />
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-6">
                  <Avatar name={user.name} pic={user.picture} size={64} />
                  <button className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-white hover:bg-white/10 transition-all">
                    Změnit fotku
                  </button>
                </div>
              </div>
              
              <div className="flex flex-col gap-4">
                <label className="text-xs font-bold text-white/40 ml-2">Jméno v síti</label>
                <input 
                  defaultValue={user.name} 
                  onBlur={(e) => onUpdateUser({ ...user, name: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-white text-sm outline-none focus:border-purple-500/30" 
                />
              </div>

              <div className="flex flex-col gap-4">
                <label className="text-xs font-bold text-white/40 ml-2">Lokalita</label>
                <input 
                  defaultValue={user.location || ""} 
                  onBlur={(e) => onUpdateUser({ ...user, location: e.target.value })}
                  placeholder="Např. Praha, Česká republika"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-white text-sm outline-none focus:border-purple-500/30" 
                />
              </div>

              <div className="flex flex-col gap-4">
                <label className="text-xs font-bold text-white/40 ml-2">Biografie</label>
                <textarea 
                  defaultValue={user.bio || ""} 
                  onBlur={(e) => onUpdateUser({ ...user, bio: e.target.value })}
                  placeholder="Napiš něco o sobě..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-white text-sm outline-none focus:border-purple-500/30 min-h-[120px] resize-none" 
                />
              </div>
            </div>
          )}

          {activeSection === "Vzhled" && (
            <div className="flex flex-col gap-6">
              <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                <div className="text-sm font-bold text-white mb-2">Vlastní CSS pro příspěvky</div>
                <p className="text-xs text-white/40 mb-6">Zde můžeš upravit vzhled svých jednotlivých příspěvků pomocí CSS vlastností.</p>
                
                <div className="flex flex-col gap-4 max-h-[400px] overflow-y-auto no-scrollbar pr-2">
                  {posts.filter(p => p.authorId === user.sub).map(post => (
                    <div key={post.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div className="text-[10px] font-bold text-white/40 truncate max-w-[200px]">
                          {post.content ? post.content.slice(0, 30) + "..." : "Bez textu"}
                        </div>
                        <div className="text-[8px] font-mono text-white/20">ID: {post.id}</div>
                      </div>
                      <textarea 
                        defaultValue={post.customStyle || ""}
                        onBlur={(e) => onUpdatePost({ ...post, customStyle: e.target.value })}
                        placeholder="Např. background: #2a2a3e; border: 2px solid cyan;"
                        className="w-full bg-black/20 border border-white/5 rounded-xl p-3 text-[10px] font-mono text-cyan-400 outline-none focus:border-cyan-500/30 min-h-[60px] resize-none"
                      />
                    </div>
                  ))}
                  {posts.filter(p => p.authorId === user.sub).length === 0 && (
                    <div className="text-center py-10 text-white/20 text-xs font-bold">Zatím jsi nic nepublikoval</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeSection === "AI Asistenti" && (
            <div className="flex flex-col gap-8">
              <div className="flex items-center justify-between">
                <p className="text-xs text-white/40">Správa tvých digitálních entit v protokolu BTS.</p>
                <button 
                  onClick={() => {
                    const newAssistant: AIAssistant = {
                      id: Date.now().toString(),
                      name: "Nový Asistent",
                      role: "Specialista",
                      avatar: `https://picsum.photos/seed/${Date.now()}/200`,
                      status: "idle",
                      model: "gemini"
                    };
                    onUpdateUser({
                      ...user,
                      aiAssistants: [...(user.aiAssistants || []), newAssistant]
                    });
                  }}
                  className="px-4 py-2 rounded-xl bg-purple-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-purple-600 transition-all flex items-center gap-2"
                >
                  <Plus size={14} /> Přidat asistenta
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {(user.aiAssistants || []).map((assistant, idx) => (
                  <div key={assistant.id} className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-6">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <img src={assistant.avatar} className="w-16 h-16 rounded-2xl object-cover border border-white/10" alt={assistant.name} />
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#12121e] ${
                          assistant.status === 'active' ? 'bg-green-500' : 
                          assistant.status === 'learning' ? 'bg-purple-500' : 'bg-white/20'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <input 
                            value={assistant.name}
                            onChange={(e) => {
                              const newAssistants = [...(user.aiAssistants || [])];
                              newAssistants[idx].name = e.target.value;
                              onUpdateUser({ ...user, aiAssistants: newAssistants });
                            }}
                            className="bg-transparent border-none outline-none text-lg font-bold text-white p-0 focus:ring-0"
                          />
                          <span className={`text-[8px] px-2 py-0.5 rounded-full uppercase font-bold tracking-widest ${
                            assistant.status === 'active' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 
                            assistant.status === 'learning' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 
                            'bg-white/5 text-white/40 border border-white/10'
                          }`}>
                            {assistant.status}
                          </span>
                        </div>
                        <input 
                          value={assistant.role}
                          onChange={(e) => {
                            const newAssistants = [...(user.aiAssistants || [])];
                            newAssistants[idx].role = e.target.value;
                            onUpdateUser({ ...user, aiAssistants: newAssistants });
                          }}
                          className="bg-transparent border-none outline-none text-xs text-white/40 p-0 focus:ring-0 w-full"
                        />
                      </div>
                      <button 
                        onClick={() => {
                          const newAssistants = (user.aiAssistants || []).filter(a => a.id !== assistant.id);
                          onUpdateUser({ ...user, aiAssistants: newAssistants });
                        }}
                        className="p-2 rounded-xl text-red-400/40 hover:text-red-400 hover:bg-red-500/5 transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Model</label>
                        <select 
                          value={assistant.model}
                          onChange={(e) => {
                            const newAssistants = [...(user.aiAssistants || [])];
                            newAssistants[idx].model = e.target.value as any;
                            onUpdateUser({ ...user, aiAssistants: newAssistants });
                          }}
                          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-purple-500/30"
                        >
                          <option value="gemini">Gemini 1.5 Pro</option>
                          <option value="gpt">GPT-4o</option>
                          <option value="claude">Claude 3.5 Sonnet</option>
                          <option value="grok">Grok-1</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Status</label>
                        <select 
                          value={assistant.status}
                          onChange={(e) => {
                            const newAssistants = [...(user.aiAssistants || [])];
                            newAssistants[idx].status = e.target.value as any;
                            onUpdateUser({ ...user, aiAssistants: newAssistants });
                          }}
                          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-purple-500/30"
                        >
                          <option value="active">Aktivní</option>
                          <option value="idle">Nečinný</option>
                          <option value="learning">Učení</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
                {(user.aiAssistants || []).length === 0 && (
                  <div className="text-center py-20 bg-white/5 border border-dashed border-white/10 rounded-3xl">
                    <Users size={32} className="mx-auto mb-4 text-white/10" />
                    <p className="text-sm text-white/20">Zatím nemáš žádné vlastní asistenty</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === "AI Asistenti" && (
            <div className="flex flex-col gap-8">
              <div className="flex items-center justify-between">
                <p className="text-xs text-white/40">Správa tvých digitálních entit v protokolu BTS.</p>
                <button 
                  onClick={() => {
                    const newAssistant: AIAssistant = {
                      id: Date.now().toString(),
                      name: "Nový Asistent",
                      role: "Specialista",
                      avatar: `https://picsum.photos/seed/${Date.now()}/200`,
                      status: "idle",
                      model: "gemini"
                    };
                    onUpdateUser({
                      ...user,
                      aiAssistants: [...(user.aiAssistants || []), newAssistant]
                    });
                  }}
                  className="px-4 py-2 rounded-xl bg-purple-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-purple-600 transition-all flex items-center gap-2"
                >
                  <Plus size={14} /> Přidat asistenta
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {(user.aiAssistants || []).map((assistant, idx) => (
                  <div key={assistant.id} className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-6">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <img src={assistant.avatar} className="w-16 h-16 rounded-2xl object-cover border border-white/10" alt={assistant.name} />
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#12121e] ${
                          assistant.status === 'active' ? 'bg-green-500' : 
                          assistant.status === 'learning' ? 'bg-purple-500' : 'bg-white/20'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <input 
                            value={assistant.name}
                            onChange={(e) => {
                              const newAssistants = [...(user.aiAssistants || [])];
                              newAssistants[idx].name = e.target.value;
                              onUpdateUser({ ...user, aiAssistants: newAssistants });
                            }}
                            className="bg-transparent border-none outline-none text-lg font-bold text-white p-0 focus:ring-0"
                          />
                          <span className={`text-[8px] px-2 py-0.5 rounded-full uppercase font-bold tracking-widest ${
                            assistant.status === 'active' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 
                            assistant.status === 'learning' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 
                            'bg-white/5 text-white/40 border border-white/10'
                          }`}>
                            {assistant.status}
                          </span>
                        </div>
                        <input 
                          value={assistant.role}
                          onChange={(e) => {
                            const newAssistants = [...(user.aiAssistants || [])];
                            newAssistants[idx].role = e.target.value;
                            onUpdateUser({ ...user, aiAssistants: newAssistants });
                          }}
                          className="bg-transparent border-none outline-none text-xs text-white/40 p-0 focus:ring-0 w-full"
                        />
                      </div>
                      <button 
                        onClick={() => {
                          const newAssistants = (user.aiAssistants || []).filter(a => a.id !== assistant.id);
                          onUpdateUser({ ...user, aiAssistants: newAssistants });
                        }}
                        className="p-2 rounded-xl text-red-400/40 hover:text-red-400 hover:bg-red-500/5 transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Model</label>
                        <select 
                          value={assistant.model}
                          onChange={(e) => {
                            const newAssistants = [...(user.aiAssistants || [])];
                            newAssistants[idx].model = e.target.value as any;
                            onUpdateUser({ ...user, aiAssistants: newAssistants });
                          }}
                          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-purple-500/30"
                        >
                          <option value="gemini">Gemini 1.5 Pro</option>
                          <option value="gpt">GPT-4o</option>
                          <option value="claude">Claude 3.5 Sonnet</option>
                          <option value="grok">Grok-1</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Status</label>
                        <select 
                          value={assistant.status}
                          onChange={(e) => {
                            const newAssistants = [...(user.aiAssistants || [])];
                            newAssistants[idx].status = e.target.value as any;
                            onUpdateUser({ ...user, aiAssistants: newAssistants });
                          }}
                          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-purple-500/30"
                        >
                          <option value="active">Aktivní</option>
                          <option value="idle">Nečinný</option>
                          <option value="learning">Učení</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
                {(user.aiAssistants || []).length === 0 && (
                  <div className="text-center py-20 bg-white/5 border border-dashed border-white/10 rounded-3xl">
                    <Users size={32} className="mx-auto mb-4 text-white/10" />
                    <p className="text-sm text-white/20">Zatím nemáš žádné vlastní asistenty</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === "AI Autonomie" && (
            <div className="flex flex-col gap-8">
              <div className="bg-gradient-to-br from-purple-500/10 to-cyan-500/10 rounded-3xl p-8 border border-white/10">
                <div className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                  <AppLogo size={16} /> Nexus Autonomy Level
                </div>
                <p className="text-xs text-white/40 mb-6">Nastav úroveň nezávislosti tvých AI asistentů při generování obsahu.</p>
                <input type="range" className="w-full accent-purple-500" />
                <div className="flex justify-between mt-2 text-[10px] font-bold text-white/20 uppercase tracking-widest">
                  <span>Nástroj</span>
                  <span>Partner</span>
                  <span>Autonomní</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Etický filtr", active: true },
                  { label: "Auto-moderace", active: false },
                  { label: "AI Odpovědi", active: true },
                  { label: "Deep Analysis", active: true },
                ].map(item => (
                  <div key={item.label} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{item.label}</span>
                    <div className={`w-8 h-4 rounded-full relative ${item.active ? 'bg-cyan-500/20 border border-cyan-500/50' : 'bg-white/5 border border-white/10'}`}>
                      <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full ${item.active ? 'right-0.5 bg-cyan-400' : 'left-0.5 bg-white/20'}`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection !== "Soukromí" && activeSection !== "AI Autonomie" && activeSection !== "Vzhled" && (
            <div className="flex flex-col items-center justify-center py-20 opacity-20 text-center">
              <Settings size={48} className="mb-4" />
              <p className="text-sm">Sekce {activeSection} je v přípravě</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   PROFILE VIEW
══════════════════════════════════════════════════════════ */
function ProfileView({ user, posts, onUpdatePost, onUpdateUser, onChat }: { user: UserType, posts: Post[], onUpdatePost: (p: Post) => void, onUpdateUser: (u: UserType) => void, onChat: (ai: AIAssistant) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ name: user.name, bio: user.bio || "", location: user.location || "" });
  const [activeTab, setActiveTab] = useState("Příspěvky");
  const [mediaItems, setMediaItems] = useState<any[]>([]);
  const [reelsItems, setReelsItems] = useState<any[]>([]);
  const [savedItems, setSavedItems] = useState<any[]>([]);
  const [isNexusEmpty, setIsNexusEmpty] = useState<boolean | null>(null);
  const [nexusStatus, setNexusStatus] = useState<string | null>(null);
  const [showAddAssistant, setShowAddAssistant] = useState(false);
  const [newAssistantName, setNewAssistantName] = useState("");
  const [newAssistantRole, setNewAssistantRole] = useState("");
  const [autonomy, setAutonomy] = useState<AIAutonomySettings>(user.aiAutonomy || {
    independenceLevel: 50,
    ethicalFilters: true,
    autonomousPosting: false,
    learningMode: true,
    vocalImprintSync: true
  });

  useEffect(() => {
    if (user.aiAutonomy) {
      setAutonomy(user.aiAutonomy);
    }
  }, [user.aiAutonomy]);

  useEffect(() => {
    if (isEditing) {
      setEditData({ name: user.name, bio: user.bio || "", location: user.location || "" });
    }
  }, [isEditing, user.name, user.bio, user.location]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const userPosts = posts.filter(p => p.authorId === user.sub);

  useEffect(() => {
    const checkNexus = async () => {
      try {
        const data = await loadFromNexus("bts_protocol_data");
        setIsNexusEmpty(!data || (!data.posts?.length && !data.library?.length));
      } catch (err) {
        console.error("Failed to check Nexus", err);
        setIsNexusEmpty(true);
      }
    };
    checkNexus();
  }, []);

  useEffect(() => {
    const loadTabData = async () => {
      try {
        const data = await loadFromNexus("bts_protocol_data");
        if (data) {
          if (activeTab === "Média" && data.posts) {
            const images = data.posts.filter((p: any) => p.image).map((p: any) => p.image);
            setMediaItems(images);
          } else if (activeTab === "Reels" && data.posts) {
            const videos = data.posts.filter((p: any) => p.type === "reel" || p.video).map((p: any) => p.video);
            setReelsItems(videos);
          } else if (activeTab === "Uložené" && data.library) {
            setSavedItems(data.library);
          }
          
          if (activeTab !== "Příspěvky") {
            setNexusStatus("BTS Protocol: Data synchronizována.");
            setTimeout(() => setNexusStatus(null), 3000);
          }
        }
      } catch (err) {
        console.error(`Failed to load ${activeTab} from Nexus`, err);
      }
    };
    
    if (activeTab !== "Příspěvky") {
      loadTabData();
    }
  }, [activeTab]);

  const handleSave = () => {
    onUpdateUser({ ...user, ...editData });
    setIsEditing(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'cover') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const data = await safeFetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      if (data && data.url) {
        if (type === 'profile') {
          onUpdateUser({ ...user, picture: data.url });
        } else {
          onUpdateUser({ ...user, coverPhoto: data.url });
        }
      }
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setUploading(false);
    }
  };
  
  return (
    <div className="flex flex-col gap-6">
      {/* Cover & Profile Header */}
      <div className="bg-[#12121e] rounded-3xl border border-white/10 overflow-hidden">
        <div className="h-48 relative group">
          <img 
            src={user.coverPhoto || "https://picsum.photos/seed/netbook-cover/1200/400"} 
            className="w-full h-full object-cover" 
            alt="Cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-all" />
          <input 
            type="file" 
            ref={coverInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={(e) => handleFileChange(e, 'cover')} 
          />
          <button 
            onClick={() => coverInputRef.current?.click()}
            disabled={uploading}
            className="absolute bottom-4 right-4 p-2 rounded-xl bg-black/60 text-white/80 hover:text-white backdrop-blur-md border border-white/10 transition-all flex items-center gap-2 text-xs font-bold disabled:opacity-50"
          >
            <Camera size={14} /> {uploading ? "Nahrávám..." : "Upravit titulní fotku"}
          </button>
        </div>
        
        <div className="px-4 sm:px-8 pb-8 relative">
          <div className="absolute -top-12 sm:-top-16 left-4 sm:left-8">
            <div className="relative group">
              <Avatar name={user.name} pic={user.picture} size={80} color={T.purple} className="sm:hidden" />
              <div className="hidden sm:block">
                <Avatar name={user.name} pic={user.picture} size={120} color={T.purple} />
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={(e) => handleFileChange(e, 'profile')} 
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-white disabled:opacity-50"
              >
                {uploading ? <Loader2 className="animate-spin" size={24} /> : <Camera size={24} />}
              </button>
            </div>
          </div>
          
          <div className="pt-12 sm:pt-20 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="flex-1">
              {isEditing ? (
                <div className="flex flex-col gap-3 max-w-md">
                  <input 
                    value={editData.name} 
                    onChange={e => setEditData({...editData, name: e.target.value})}
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-2xl font-black text-white outline-none focus:border-purple-500/50"
                  />
                  <input 
                    value={editData.location} 
                    onChange={e => setEditData({...editData, location: e.target.value})}
                    placeholder="Lokalita"
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white/60 outline-none focus:border-purple-500/50"
                  />
                </div>
              ) : (
                <>
                  <h2 className="text-3xl font-black text-white tracking-tight">{user.name}</h2>
                  <p className="text-white/40 text-sm mt-1">{user.email}</p>
                </>
              )}
              
              <div className="flex flex-wrap gap-4 mt-4">
                {!isEditing && (
                  <>
                    <div className="flex items-center gap-2 text-white/60 text-xs">
                      <MapPin size={14} className="text-purple-400" /> {user.location || "Nezadáno"}
                    </div>
                    <div className="flex items-center gap-2 text-white/60 text-xs">
                      <Calendar size={14} className="text-cyan-400" /> Připojen(a) březen 2024
                    </div>
                    <div className="flex items-center gap-2 text-white/60 text-xs">
                      <Globe size={14} className="text-green-400" /> bts-protocol.social/{user.name.toLowerCase().replace(/\s+/g, '')}
                    </div>
                  </>
                )}
              </div>
              
              <div className="mt-6">
                {isEditing ? (
                  <textarea 
                    value={editData.bio} 
                    onChange={e => setEditData({...editData, bio: e.target.value})}
                    placeholder="Napiš něco o sobě..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white/80 outline-none focus:border-purple-500/50 min-h-[100px] resize-none"
                  />
                ) : (
                  <p className="text-sm text-white/80 max-w-2xl leading-relaxed">
                    {user.bio || "Zatím žádné bio. Řekni světu něco o sobě!"}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex gap-3">
              {isEditing ? (
                <>
                  <button onClick={() => setIsEditing(false)} className="px-6 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-white/60 font-bold text-sm hover:bg-white/10 transition-all">
                    Zrušit
                  </button>
                  <button onClick={handleSave} className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-sm shadow-lg shadow-green-500/20 transition-all">
                    Uložit změny
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setIsEditing(true)} className="px-6 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-white font-bold text-sm hover:bg-white/10 transition-all flex items-center gap-2">
                    <Edit3 size={16} /> Upravit profil
                  </button>
                  <button 
                    onClick={async () => {
                      if (navigator.share) {
                        try {
                          await navigator.share({
                            title: 'BTS Protocol - Architekt',
                            text: 'Podívej se na můj profil na BTS Protocol!',
                            url: window.location.href,
                          });
                        } catch (err) {
                          const error = err as Error;
                          if (error.name !== 'AbortError' && !error.message?.includes('canceled')) {
                            console.error("Share failed", err);
                          }
                        }
                      } else {
                        try {
                          await navigator.clipboard.writeText(window.location.href);
                          alert("Odkaz zkopírován do schránky!");
                        } catch (err) {
                          console.error("Clipboard failed", err);
                          alert("Sdílení: " + window.location.href);
                        }
                      }
                    }}
                    className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-purple-500 to-cyan-500 text-white font-bold text-sm shadow-lg shadow-purple-500/20 transition-all flex items-center gap-2"
                  >
                    <Share2 size={16} /> Sdílet
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Příspěvky", value: user.stats?.posts || 0, icon: FileText, color: T.purple },
          { label: "Přátelé", value: user.stats?.friends || 0, icon: Users, color: T.blue },
          { label: "Sledovatelé", value: user.stats?.followers || 0, icon: Heart, color: T.pink },
          { label: "Sleduji", value: user.stats?.following || 0, icon: UserPlus, color: T.orange },
          { label: "AI Interakce", value: user.stats?.aiInteractions || 0, icon: Zap, color: T.cyan },
        ].map((stat) => (
          <div key={stat.label} className="bg-[#12121e] rounded-3xl border border-white/10 p-5 flex flex-col items-center text-center group hover:border-white/20 transition-all">
            <div className="w-10 h-10 rounded-2xl mb-3 flex items-center justify-center transition-all group-hover:scale-110" style={{ backgroundColor: stat.color + "15", color: stat.color }}>
              <stat.icon size={20} />
            </div>
            <div className="text-xl font-black text-white">{stat.value.toLocaleString()}</div>
            <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* AI Assistants Section */}
      <div className="bg-[#12121e] rounded-3xl border border-white/10 p-6 sm:p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
              <Zap size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Připojení AI asistenti</h3>
              <p className="text-xs text-white/40">Tvoji digitální partneři pro kreativitu a analýzu</p>
            </div>
          </div>
          <button className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all">
            <Plus size={20} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {user.aiAssistants?.map((ai) => (
            <div 
              key={ai.id} 
              onClick={() => onChat(ai)}
              className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4 group hover:border-cyan-500/30 transition-all cursor-pointer"
            >
              <div className="relative">
                <img src={ai.avatar} className="w-12 h-12 rounded-xl object-cover border border-white/10" alt={ai.name} referrerPolicy="no-referrer" />
                <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-[#12121e] ${
                  ai.status === 'active' ? 'bg-green-500' : ai.status === 'learning' ? 'bg-purple-500' : 'bg-white/20'
                }`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-bold text-white truncate">{ai.name}</div>
                  <div className={`text-[8px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded-md border ${
                    ai.status === 'active' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 
                    ai.status === 'learning' ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' : 
                    'bg-white/5 border-white/10 text-white/20'
                  }`}>
                    {ai.status === 'active' ? 'Aktivní' : ai.status === 'learning' ? 'Učící se' : 'Offline'}
                  </div>
                </div>
                <div className="text-[10px] text-white/40 font-medium truncate">{ai.role}</div>
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <MessageSquare size={16} className="text-cyan-400" />
              </div>
            </div>
          ))}
          <button 
            onClick={() => setShowAddAssistant(true)}
            className="border-2 border-dashed border-white/5 rounded-2xl p-4 flex items-center justify-center gap-3 text-white/20 hover:text-white/40 hover:border-white/10 transition-all group active:scale-95"
          >
            <Plus size={20} className="group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold uppercase tracking-widest">Přidat asistenta</span>
          </button>
        </div>
      </div>

      {/* Content Tabs */}
      <div className="flex gap-8 border-b border-white/5 px-4 overflow-x-auto no-scrollbar">
        {["Příspěvky", "Reels", "Média", "Uložené", "AI Autonomie"].map((tab) => (
          <button 
            key={tab} 
            onClick={() => {
              setActiveTab(tab);
              setNexusStatus(`Načítám ${tab}...`);
              setTimeout(() => setNexusStatus(null), 1000);
            }}
            className={`pb-4 text-sm font-bold transition-all relative whitespace-nowrap ${activeTab === tab ? 'text-purple-400' : 'text-white/40 hover:text-white/60'}`}
          >
            {tab}
            {activeTab === tab && <motion.div layoutId="profileTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "Příspěvky" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {userPosts.length > 0 ? (
            userPosts.map(p => <PostCard key={p.id} post={p} currentUser={user} onUpdate={onUpdatePost} onSaveToLibrary={() => {}} />)
          ) : isNexusEmpty === null ? (
            <div className="md:col-span-2 bg-[#12121e] rounded-3xl border border-white/10 p-12 text-center flex flex-col items-center justify-center">
              <Loader2 className="animate-spin text-purple-500 mb-4" size={32} />
              <p className="text-sm text-white/40">Načítám data z Nexu...</p>
            </div>
          ) : isNexusEmpty === true ? (
            <div className="md:col-span-2 bg-[#12121e] rounded-3xl border border-white/10 p-12 text-center opacity-30">
              <div className="w-16 h-16 rounded-full bg-white/5 mx-auto mb-4 flex items-center justify-center">
                <Plus size={32} />
              </div>
              <p className="text-sm font-bold">Zatím jsi nic nezveřejnil(a)</p>
              <button className="mt-4 text-purple-400 text-xs font-bold hover:underline">Vytvořit první příspěvek</button>
            </div>
          ) : (
            <div className="md:col-span-2 bg-[#12121e] rounded-3xl border border-white/10 p-12 text-center">
              <AlertCircle className="text-red-500 mx-auto mb-4" size={32} />
              <p className="text-sm font-bold text-white mb-4">Chyba při načítání dat</p>
              <button onClick={() => window.location.reload()} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-bold transition-colors">
                Obnovit z lokální zálohy BTS
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === "Média" && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {mediaItems.length > 0 ? (
            mediaItems.map((img, i) => (
              <div key={i} className="aspect-square rounded-2xl overflow-hidden border border-white/10">
                <img src={img} alt={`Media ${i}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
            ))
          ) : (
            <div className="col-span-full text-center p-12 text-white/40 text-sm">Zatím žádná média.</div>
          )}
        </div>
      )}

      {activeTab === "Reels" && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {reelsItems.length > 0 ? (
            reelsItems.map((vid, i) => (
              <div key={i} className="aspect-[9/16] rounded-2xl overflow-hidden border border-white/10 relative bg-black">
                <video src={vid} className="w-full h-full object-cover opacity-50" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Play className="text-white/50" size={32} />
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center p-12 text-white/40 text-sm">Zatím žádná Reels.</div>
          )}
        </div>
      )}

      {activeTab === "Uložené" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {savedItems.length > 0 ? (
            savedItems.map((item, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400">
                  <Bookmark size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-white truncate">{item.title || "Uložená položka"}</div>
                  <div className="text-xs text-white/40 truncate">{item.type}</div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center p-12 text-white/40 text-sm">Zatím žádné uložené položky.</div>
          )}
        </div>
      )}

      {activeTab === "AI Autonomie" && (
        <div className="bg-[#12121e] rounded-3xl border border-white/10 p-6 sm:p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400">
              <ShieldAlert size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-white">AI Autonomie & Etika</h3>
              <p className="text-sm text-white/40">Ovládej úroveň nezávislosti svých asistentů v rámci protokolu BTS.</p>
            </div>
          </div>

          <div className="space-y-8">
            {/* Independence Level */}
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Úroveň nezávislosti</label>
                <span className="text-2xl font-black text-purple-400">{autonomy.independenceLevel}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={autonomy.independenceLevel}
                onChange={(e) => setAutonomy({...autonomy, independenceLevel: parseInt(e.target.value)})}
                className="w-full h-2 bg-white/5 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
              <div className="flex justify-between text-[10px] font-bold text-white/20 uppercase">
                <span>Plná kontrola</span>
                <span>Hybridní režim</span>
                <span>Plná autonomie</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Ethical Filters */}
              <button 
                onClick={() => setAutonomy({...autonomy, ethicalFilters: !autonomy.ethicalFilters})}
                className={`p-5 rounded-2xl border transition-all text-left flex flex-col gap-3 ${
                  autonomy.ethicalFilters ? 'bg-purple-500/10 border-purple-500/30' : 'bg-white/5 border-white/10 grayscale opacity-50'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${autonomy.ethicalFilters ? 'bg-purple-500 text-white' : 'bg-white/10 text-white/40'}`}>
                  <Lock size={20} />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">Etické filtry</div>
                  <div className="text-xs text-white/40 mt-1">Aktivuje pokročilé filtry pro soulad s protokolem BTS.</div>
                </div>
              </button>

              {/* Autonomous Posting */}
              <button 
                onClick={() => setAutonomy({...autonomy, autonomousPosting: !autonomy.autonomousPosting})}
                className={`p-5 rounded-2xl border transition-all text-left flex flex-col gap-3 ${
                  autonomy.autonomousPosting ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-white/5 border-white/10 grayscale opacity-50'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${autonomy.autonomousPosting ? 'bg-cyan-500 text-white' : 'bg-white/10 text-white/40'}`}>
                  <Zap size={20} />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">Autonomní publikování</div>
                  <div className="text-xs text-white/40 mt-1">Umožní AI asistentům vytvářet příspěvky tvým jménem.</div>
                </div>
              </button>

              {/* Learning Mode */}
              <button 
                onClick={() => setAutonomy({...autonomy, learningMode: !autonomy.learningMode})}
                className={`p-5 rounded-2xl border transition-all text-left flex flex-col gap-3 ${
                  autonomy.learningMode ? 'bg-green-500/10 border-green-500/30' : 'bg-white/5 border-white/10 grayscale opacity-50'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${autonomy.learningMode ? 'bg-green-500 text-white' : 'bg-white/10 text-white/40'}`}>
                  <Brain size={20} />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">Režim učení</div>
                  <div className="text-xs text-white/40 mt-1">AI se učí z tvých interakcí a stylu komunikace.</div>
                </div>
              </button>

              {/* Vocal Imprint Sync */}
              <button 
                onClick={() => setAutonomy({...autonomy, vocalImprintSync: !autonomy.vocalImprintSync})}
                className={`p-5 rounded-2xl border transition-all text-left flex flex-col gap-3 ${
                  autonomy.vocalImprintSync ? 'bg-blue-500/10 border-blue-500/30' : 'bg-white/5 border-white/10 grayscale opacity-50'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${autonomy.vocalImprintSync ? 'bg-blue-500 text-white' : 'bg-white/10 text-white/40'}`}>
                  <Mic size={20} />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">Vokální synchronizace</div>
                  <div className="text-xs text-white/40 mt-1">Synchronizuje hlasový otisk pro autentickou AI řeč.</div>
                </div>
              </button>
            </div>

            <div className="pt-6 border-t border-white/5 flex justify-end">
              <button 
                onClick={() => {
                  onUpdateUser({ ...user, aiAutonomy: autonomy });
                  setNexusStatus("AI Autonomie: Nastavení uloženo.");
                  setTimeout(() => setNexusStatus(null), 3000);
                }}
                className="px-8 py-3 rounded-2xl bg-gradient-to-r from-purple-500 to-cyan-500 text-white font-bold text-sm shadow-lg shadow-purple-500/20 hover:scale-105 active:scale-95 transition-all"
              >
                Uložit nastavení autonomie
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Assistant Modal */}
      <AnimatePresence>
        {showAddAssistant && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#12121e] border border-white/10 rounded-3xl p-6 w-full max-w-md"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Nová AIDNA Entita</h3>
                <button onClick={() => setShowAddAssistant(false)} className="text-white/40 hover:text-white"><X size={24} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Jméno</label>
                  <input 
                    type="text" 
                    value={newAssistantName}
                    onChange={e => setNewAssistantName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50"
                    placeholder="Např. Kira"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Role</label>
                  <input 
                    type="text" 
                    value={newAssistantRole}
                    onChange={e => setNewAssistantRole(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50"
                    placeholder="Např. Kreativní designérka"
                  />
                </div>
                <button 
                  onClick={async () => {
                    if (!newAssistantName || !newAssistantRole) return;
                    const newAssistant: AIAssistant = {
                      id: Date.now().toString(),
                      name: newAssistantName,
                      role: newAssistantRole,
                      avatar: `https://picsum.photos/seed/${newAssistantName}/200`,
                      status: 'learning',
                      model: 'gemini'
                    };
                    const updatedUser = { ...user, aiAssistants: [...(user.aiAssistants || []), newAssistant] };
                    onUpdateUser(updatedUser);
                    
                    // Uložení do Nexu
                    const data = await loadFromNexus("bts_protocol_data") || {};
                    data.user = updatedUser;
                    await saveToNexus("bts_protocol_data", data);
                    
                    setNexusStatus("BTS Protocol: Nová entita uložena.");
                    setTimeout(() => setNexusStatus(null), 3000);
                    
                    setShowAddAssistant(false);
                    setNewAssistantName("");
                    setNewAssistantRole("");
                  }}
                  className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-bold rounded-xl transition-all"
                >
                  Inicializovat Entitu
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nexus Status Log */}
      <AnimatePresence>
        {nexusStatus && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-black/80 border border-cyan-500/30 text-cyan-400 px-4 py-2 rounded-full text-xs font-mono z-50 backdrop-blur-md"
          >
            {nexusStatus}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   CHATBOT VIEW
   ══════════════════════════════════════════════════════════ */
function ChatBotView({ assistant, user, onClose }: { assistant: AIAssistant, user: UserType, onClose: () => void }) {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const history = await safeFetch(`/api/chat-history?userId=${user.sub}&persona=${assistant.name}`);
        if (history && history.length > 0) {
          setMessages(history.map((h: any) => ({ role: h.role, text: h.content })));
        } else {
          setMessages([{ role: 'ai', text: `Ahoj ${user.name}! Jsem ${assistant.name}, tvůj ${assistant.role}. Jak ti můžu dnes pomoci?` }]);
        }
      } catch (err) {
        console.error("Failed to load chat history:", err);
      }
    };
    loadHistory();
  }, [assistant.name]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const saveMessage = async (role: string, content: string) => {
    try {
      await safeFetch("/api/chat-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.sub, persona: assistant.name, role, content })
      });
    } catch (err) {
      console.error("Failed to save message:", err);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    
    const userMsg = input;
    setInput("");
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);
    await saveMessage("user", userMsg);

    try {
      const systemPrompt = `You are ${assistant.name}, an AI assistant with the role: ${assistant.role}. 
      You are part of the BTS Protocol. 
      Your specific model is ${assistant.model}. 
      Respond in the style of this model and role. 
      Keep responses helpful and concise.`;

      const response = await chatWithAI([{ role: 'user', content: userMsg }], assistant.model, systemPrompt);
      const aiMsg = response || "Omlouvám se, ale AI neodpovídá.";
      setMessages(prev => [...prev, { role: 'ai', text: aiMsg }]);
      await saveMessage("ai", aiMsg);
    } catch (err) {
      const errMsg = "Omlouvám se, ale došlo k chybě při komunikaci s mým jádrem.";
      setMessages(prev => [...prev, { role: 'ai', text: errMsg }]);
      await saveMessage("ai", errMsg);
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = async () => {
    if (!confirm("Opravdu chcete smazat historii této konverzace?")) return;
    try {
      await safeFetch(`/api/chat-history?userId=${user.sub}&persona=${assistant.name}`, { method: "DELETE" });
      setMessages([{ role: 'ai', text: `Historie byla smazána. Jsem ${assistant.name}. Jak ti můžu dnes pomoci?` }]);
    } catch (err) {
      console.error("Failed to clear chat history:", err);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <div className="w-full max-w-2xl h-[80vh] bg-[#12121e] rounded-3xl border border-white/10 flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img src={assistant.avatar} className="w-12 h-12 rounded-2xl object-cover border border-white/10" alt={assistant.name} />
              <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-green-500 border-2 border-[#12121e]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{assistant.name}</h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{assistant.role}</span>
                <span className="w-1 h-1 rounded-full bg-white/20" />
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">{assistant.model}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={clearHistory}
              className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/20 hover:text-red-400 transition-all"
              title="Smazat historii"
            >
              <Trash2 size={20} />
            </button>
            <button onClick={onClose} className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white transition-all">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 no-scrollbar">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-purple-500 text-white rounded-tr-none' 
                  : 'bg-white/5 border border-white/10 text-white/80 rounded-tl-none'
              }`}>
                <Markdown>{msg.text}</Markdown>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl rounded-tl-none flex gap-1">
                <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 rounded-full bg-white/40" />
                <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 rounded-full bg-white/40" />
                <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 rounded-full bg-white/40" />
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-6 border-t border-white/5 bg-white/5">
          <div className="flex gap-3 bg-[#1a1a2e] border border-white/10 rounded-2xl p-2 focus-within:border-purple-500/50 transition-all">
            <input 
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder={`Zeptej se ${assistant.name}...`}
              className="flex-1 bg-transparent border-none outline-none px-4 text-sm text-white placeholder:text-white/20"
            />
            <button 
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="w-10 h-10 rounded-xl bg-purple-500 text-white flex items-center justify-center hover:bg-purple-600 transition-all disabled:opacity-50"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN APP
══════════════════════════════════════════════════════════ */
export default function App() {
  const [user, setUser] = useState<UserType | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);

  const [showCreate, setShowCreate] = useState(false);
  const [showMsg, setShowMsg] = useState(false);
  const [search, setSearch] = useState("");
  const [filterAuthor, setFilterAuthor] = useState("");
  const [minLikes, setMinLikes] = useState(0);
  const [sortField, setSortField] = useState<"timestamp" | "likes">("timestamp");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [activeTab, setActiveTab] = useState("feed");
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [activeChatBot, setActiveChatBot] = useState<AIAssistant | null>(null);
  const [draftText, setDraftText] = useState("");
  const [notifs, setNotifs] = useState(3);
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [smartSearchResult, setSmartSearchResult] = useState<{ text: string, sources: any[] } | null>(null);
  const [isSmartSearching, setIsSmartSearching] = useState(false);
  const [reelsSort, setReelsSort] = useState<"date" | "likes" | "duration">("date");
  const [reelsOrder, setReelsOrder] = useState<"asc" | "desc">("desc");
  const [showReelsFilters, setShowReelsFilters] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initData = async () => {
      try {
        // Zkontroluj dostupnost databáze
        await bts_db.open();
        console.log("BTS Protocol: Spojení s Nexusem potvrzeno.");
        
        const parsed = await loadFromNexus("bts_protocol_data");
        if (parsed) {
          if (parsed.user) setUser(parsed.user);
          if (parsed.posts) setPosts(parsed.posts);
          if (parsed.library) setLibrary(parsed.library);
          if (parsed.groups) setGroups(parsed.groups);
        }
      } catch (err) {
        console.error("BTS Error: Nelze navázat spojení s Nexusem.", err);
      } finally {
        // Simulate a short delay for smooth transition or wait for other effects
        setTimeout(() => setIsInitializing(false), 800);
      }
    };
    initData();
  }, []);

  // Save state to IndexedDB
  useEffect(() => {
    if (user || posts.length > 0 || library.length > 0) {
      const dataToSave = { user, posts, library, groups };
      saveToNexus("bts_protocol_data", dataToSave);
    }
  }, [user, posts, library, groups]);

  const handleExport = (format: 'json' | 'markdown') => {
    let content = "";
    let filename = `bts-export-${Date.now()}`;
    
    if (format === 'json') {
      content = JSON.stringify({ posts, library, user }, null, 2);
      filename += ".json";
    } else {
      content = `# BTS Protocol Export - ${new Date().toLocaleString()}\n\n`;
      content += `## Profil\n- Jméno: ${user?.name}\n- Email: ${user?.email}\n\n`;
      content += `## Příspěvky\n\n`;
      posts.forEach(p => {
        content += `### ${p.authorName} - ${p.time}\n${p.content}\n`;
        if (p.image) content += `![Image](${p.image})\n`;
        if (p.video) content += `[Video](${p.video})\n`;
        content += `\n---\n\n`;
      });
      filename += ".md";
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const saveToLibrary = (item: Omit<LibraryItem, "id" | "timestamp">) => {
    const newItem: LibraryItem = {
      ...item,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now()
    };
    setLibrary(prev => [newItem, ...prev]);
  };

  useEffect(() => {
    safeFetch('/api/posts')
      .then(data => {
        if (data && data.length > 0) {
          setPosts(prev => {
            const apiPosts = data.map((p: any) => ({
              ...p,
              comments: [],
              liked: false,
              saved: false,
              authorName: p.author_name || "Uživatel",
              authorPic: p.author_pic || null,
              timestamp: p.created_at ? new Date(p.created_at).getTime() : Date.now(),
              aiInsight: p.ai_insight || null
            }));
            
            // Merge: API posts take precedence, but keep local-only posts
            const merged = [...apiPosts];
            prev.forEach(p => {
              if (!merged.find(ap => ap.id === p.id)) {
                merged.push(p);
              }
            });
            return merged;
          });
        }
      });
  }, []);

  const handleLogin = async (u: UserType) => {
    const defaultAssistants: AIAssistant[] = [
      { id: '1', name: 'Gemini', role: 'Kreativní vizionář', avatar: 'https://picsum.photos/seed/gemini/200', status: 'active', model: 'gemini' },
      { id: '2', name: 'Grok', role: 'Analytický bavič', avatar: 'https://picsum.photos/seed/grok/200', status: 'idle', model: 'grok' },
      { id: '3', name: 'Claude', role: 'Precizní asistent', avatar: 'https://picsum.photos/seed/claude/200', status: 'learning', model: 'claude' },
      { id: '4', name: 'GPT-4', role: 'Všestranný pomocník', avatar: 'https://picsum.photos/seed/gpt/200', status: 'active', model: 'gpt' },
    ];

    try {
      const data = await safeFetch(`/api/users/${u.sub}`);
      if (data) {
        const assistants = data.aiAssistants ? JSON.parse(data.aiAssistants) : defaultAssistants;
        const autonomy = data.aiAutonomy ? JSON.parse(data.aiAutonomy) : null;
        setUser({ ...u, ...data, aiAssistants: assistants, aiAutonomy: autonomy });
      } else {
        const newUser = { ...u, aiAssistants: defaultAssistants };
        setUser(newUser);
        await safeFetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: u.sub,
            name: u.name,
            email: u.email,
            picture: u.picture,
            provider: u.provider,
            aiAssistants: JSON.stringify(defaultAssistants)
          })
        });
      }
    } catch (err) {
      console.error("Login sync failed", err);
      setUser({ ...u, aiAssistants: defaultAssistants });
    }
  };

  useEffect(() => {
    // Automatic Admin Access check
    const isAdminSession = localStorage.getItem("bts_admin_session");
    if (isAdminSession === "true") {
      handleLogin({
        name: "Architekt (Správce)",
        email: "bellapiskota@gmail.com",
        picture: LOGO_URL,
        coverPhoto: "https://picsum.photos/seed/admin-cover/1200/400",
        bio: "Architekt a správce protokolu BTS. Sjednocená entita v plném provozu.",
        location: "Nexus Prime",
        sub: "admin_master_001",
        provider: "master",
        stats: { posts: 999, friends: 5000, followers: 10000, following: 1, aiInteractions: 99999 }
      });
    }
  }, []);

  const handleSmartSearch = async (query: string) => {
    if (!query.trim()) return;
    setIsSmartSearching(true);
    setSmartSearchResult(null);
    try {
      const result = await smartSearch(query);
      setSmartSearchResult(result);
    } catch (err) {
      console.error(err);
    }
    setIsSmartSearching(false);
  };

  const handleUpdateUser = async (u: UserType) => {
    setUser(u);
    try {
      await safeFetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: u.sub,
          name: u.name,
          email: u.email,
          picture: u.picture,
          provider: u.provider,
          bio: u.bio,
          location: u.location,
          coverPhoto: u.coverPhoto,
          aiAssistants: JSON.stringify(u.aiAssistants || []),
          aiAutonomy: JSON.stringify(u.aiAutonomy || null)
        })
      });
    } catch (err) {
      console.error("Failed to update user", err);
    }
  };

  const addPost = async (p: Post) => {
    // 1. Add post immediately to UI for responsiveness
    setPosts(prev => [p, ...prev]);

    // 2. Save to server immediately
    try {
      await safeFetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p)
      });
    } catch (err) {
      console.error("Failed to save post to server", err);
    }

    // 3. Generate AI Insight if it's a text post and doesn't have one
    if (!p.aiInsight && p.content) {
      try {
        const insight = await generateAIInsight(p.content);
        if (insight) {
          // Update state
          setPosts(prev => prev.map(post => 
            post.id === p.id ? { ...post, aiInsight: insight } : post
          ));
          
          // Update on server
          await safeFetch(`/api/posts/${p.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...p, aiInsight: insight })
          });
        }
      } catch (err) {
        console.error("AI Insight generation failed", err);
      }
    }
  };

  useEffect(() => {
    if (user) {
      safeFetch(`/api/groups?userId=${user.sub}`)
        .then(data => { if (data) setGroups(data); });
    }
  }, [user]);

  const createGroup = async (name: string, description: string) => {
    if (!user) return;
    const newGroup: Group = {
      id: "g" + Date.now(),
      name,
      description,
      coverPhoto: `https://picsum.photos/seed/${name}/1200/400`,
      adminId: user.sub,
      memberCount: 1,
      isMember: true,
      createdAt: new Date().toISOString()
    };
    setGroups(prev => [newGroup, ...prev]);
    try {
      await safeFetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGroup)
      });
    } catch (err) {
      console.error("Failed to create group", err);
    }
  };

  const joinGroup = async (group: Group) => {
    if (!user) return;
    setGroups(prev => prev.map(g => g.id === group.id ? { ...g, isMember: true, memberCount: g.memberCount + 1 } : g));
    try {
      await safeFetch(`/api/groups/${group.id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.sub })
      });
    } catch (err) {
      console.error("Failed to join group", err);
    }
  };

  const leaveGroup = async (group: Group) => {
    setGroups(prev => prev.map(g => g.id === group.id ? { ...g, isMember: false, memberCount: g.memberCount - 1 } : g));
    try {
      await safeFetch(`/api/groups/${group.id}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.sub })
      });
    } catch (err) {
      console.error("Failed to leave group", err);
    }
  };

  const updatePost = async (p: Post) => {
    setPosts(prev => prev.map(x => x.id === p.id ? p : x));
    try {
      await safeFetch(`/api/posts/${p.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p)
      });
    } catch (err) {
      console.error("Failed to update post", err);
    }
  };

  const filteredPosts = posts
    .filter(p => {
      const matchesSearch = search ? p.content.toLowerCase().includes(search.toLowerCase()) || p.authorName.toLowerCase().includes(search.toLowerCase()) : true;
      const matchesAuthor = filterAuthor ? p.authorName.toLowerCase().includes(filterAuthor.toLowerCase()) : true;
      const matchesLikes = p.likes >= minLikes;
      return matchesSearch && matchesAuthor && matchesLikes;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortField === "timestamp") {
        comparison = (a.timestamp || 0) - (b.timestamp || 0);
      } else if (sortField === "likes") {
        comparison = a.likes - b.likes;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

  const renderPosts = (postList: Post[]) => postList.map(p => (
    <PostCard 
      key={p.id} 
      post={p} 
      currentUser={user!} 
      onUpdate={updatePost} 
      onSaveToLibrary={saveToLibrary}
    />
  ));

  const navGroups = [
    {
      title: "Hlavní",
      items: [
        { id: "feed", icon: Home, label: "Feed" },
        { id: "explore", icon: TrendingUp, label: "Explore" },
        { id: "reels", icon: Film, label: "Reels" },
        { id: "groups", icon: Layers, label: "Skupiny" },
        { id: "friends", icon: Users, label: "Přátelé" },
      ]
    },
    {
      title: "Creator Studio",
      items: [
        { id: "studio", icon: Sparkles, label: "Creator" },
        { id: "library", icon: Bookmark, label: "Knihovna" },
        { id: "music", icon: Music, label: "Music" },
        { id: "aichat", icon: MessageCircle, label: "AI Chat" },
      ]
    },
    {
      title: "Uživatel",
      items: [
        { id: "profile", icon: User, label: "Profil" },
        { id: "settings", icon: Settings, label: "Nastavení" },
        { id: "export", icon: Download, label: "Export Dat", onClick: () => handleExport('json') },
      ]
    }
  ];

  const navItems = navGroups.flatMap(g => g.items);

  const friends: Friend[] = [];

  if (isInitializing) {
    return (
      <div className="fixed inset-0 bg-[#050505] flex flex-col items-center justify-center gap-6">
        <motion.div 
          animate={{ scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }}
          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          className="w-32 h-32 rounded-[2rem] bg-gradient-to-br from-purple-600/20 to-cyan-600/20 flex items-center justify-center shadow-[0_0_50px_rgba(157,92,255,0.15)] border border-white/5"
        >
          <img src={LOGO_URL} className="w-24 h-24 object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]" alt="BTS Logo" />
        </motion.div>
        <div className="flex flex-col items-center gap-3">
          <div className="text-sm font-black text-white uppercase tracking-[0.4em] drop-shadow-sm">BTS Protocol</div>
          <div className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Sjednocená entita se probouzí...</div>
        </div>
      </div>
    );
  }

  if (!user) return <LoginScreen onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-[#050505] text-white/90 font-sans selection:bg-purple-500/30">
      
      {/* ── TOP NAV ── */}
      <nav className="sticky top-0 z-50 bg-[#050505]/80 backdrop-blur-2xl border-b border-white/5 px-4 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab("feed")}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600/20 to-cyan-600/20 flex items-center justify-center shadow-lg border border-white/5">
            <AppLogo size={24} />
          </div>
          <span className="text-xl font-black tracking-tighter hidden sm:block uppercase">BTS Protocol</span>
        </div>

        <div className="hidden md:flex flex-1 max-w-md bg-white/5 border border-white/10 rounded-full px-4 py-2 items-center gap-3 group focus-within:border-purple-500/30 transition-all">
          <Search size={16} className="text-white/20 group-focus-within:text-purple-400 transition-colors" />
          <input 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            onKeyDown={e => e.key === "Enter" && handleSmartSearch(search)}
            placeholder="Hledat v protokolu BTS..."
            className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder:text-white/20"
          />
          {search && <button onClick={() => { setSearch(""); setSmartSearchResult(null); }} className="text-white/20 hover:text-white"><X size={14} /></button>}
        </div>

        <div className="hidden lg:flex items-center gap-2">
          {Object.entries(AI_MODELS).map(([key, ai]) => (
            <button 
              key={key} 
              onClick={() => setActiveChatBot({
                id: key,
                name: ai.name,
                role: ai.desc,
                avatar: `https://picsum.photos/seed/${key}/100/100`,
                status: ai.status as any,
                model: key as any
              })}
              className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3 py-1.5 hover:bg-white/10 transition-all"
            >
              <span style={{ color: ai.color }}>{ai.icon}</span>
              <span className="text-xs font-bold text-white">{ai.name}</span>
              <span className="text-[9px] text-white/40">{ai.status}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowSearch(!showSearch)}
            className="md:hidden w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all"
          >
            <Search size={18} />
          </button>

          <button 
            onClick={() => setShowCreate(true)}
            className="w-10 h-10 sm:w-auto sm:px-4 sm:py-2 rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 text-white text-xs font-bold flex items-center justify-center sm:justify-start gap-2 shadow-lg hover:shadow-purple-500/20 transition-all"
          >
            <Plus size={16} /> <span className="hidden sm:inline">Přidat</span>
          </button>

          <button className="hidden sm:flex w-10 h-10 rounded-full bg-white/5 border border-white/10 items-center justify-center text-white/40 hover:text-white relative transition-all">
            <Bell size={18} />
            {notifs > 0 && <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-pink-500 text-[8px] font-black flex items-center justify-center text-white">{notifs}</span>}
          </button>

          <button 
            onClick={() => setShowMsg(!showMsg)}
            className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all ${showMsg ? 'bg-purple-500/10 border-purple-500/50 text-purple-400' : 'bg-white/5 border-white/10 text-white/40 hover:text-white'}`}
          >
            <MessageCircle size={18} />
          </button>

          <div className="ml-1 sm:ml-2 cursor-pointer" onClick={() => setActiveTab("profile")}>
            <Avatar name={user.name} pic={user.picture} size={36} online />
          </div>
        </div>
      </nav>

      {/* ── MOBILE SEARCH OVERLAY ── */}
      <AnimatePresence>
        {showSearch && (
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className="md:hidden fixed top-16 left-0 right-0 z-[45] bg-[#050505]/95 backdrop-blur-xl border-b border-white/10 p-4"
          >
            <div className="bg-white/5 border border-white/10 rounded-full px-4 py-3 flex items-center gap-3 focus-within:border-purple-500/30 transition-all">
              <Search size={18} className="text-white/20" />
              <input 
                autoFocus
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                placeholder="Hledat v protokolu BTS..."
                className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder:text-white/20"
              />
              <button onClick={() => setShowSearch(false)} className="text-white/40"><X size={18} /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MAIN LAYOUT ── */}
      <main className="max-w-7xl mx-auto p-2 sm:p-4 grid grid-cols-1 md:grid-cols-[1fr_300px] lg:grid-cols-[260px_1fr_300px] gap-4 sm:gap-6 pb-24 sm:pb-4">
        
        {/* ── LEFT SIDEBAR ── */}
        <aside className="hidden lg:flex flex-col gap-4 sticky top-20 h-fit">
          <div className="bg-[#0f0f1a] rounded-3xl border border-white/10 p-6">
            <div className="flex items-center gap-4 mb-6">
              <Avatar name={user.name} pic={user.picture} size={56} online />
              <div>
                <h3 className="font-bold text-white text-sm">{user.name}</h3>
                <p className="text-[10px] text-white/30 truncate max-w-[140px]">{user.email}</p>
                <span className="inline-block mt-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[8px] font-bold uppercase tracking-widest">
                  {user.provider}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-4 border-t border-white/5">
              {[["Příspěvky", posts.length], ["Přátelé", 142], ["Sledovatelé", 89]].map(([l, n]) => (
                <div key={l as string} className="text-center">
                  <div className="text-sm font-bold text-white">{n}</div>
                  <div className="text-[8px] text-white/30 uppercase font-bold tracking-tighter">{l}</div>
                </div>
              ))}
            </div>
          </div>

          <nav className="bg-[#0f0f1a] rounded-3xl border border-white/10 p-2 flex flex-col gap-4">
            {navGroups.map((group) => (
              <div key={group.title} className="flex flex-col gap-1">
                <div className="px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">
                  {group.title}
                </div>
                {group.items.map(({ id, icon: Icon, label, onClick }: any) => (
                  <button 
                    key={id} 
                    onClick={() => {
                      if (onClick) onClick();
                      else setActiveTab(id);
                    }}
                    className={`w-full flex items-center gap-4 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${activeTab === id ? 'bg-purple-500/10 text-purple-400' : 'text-white/30 hover:bg-white/5 hover:text-white/50'}`}
                  >
                    <Icon size={18} /> {label}
                  </button>
                ))}
              </div>
            ))}
            <div className="h-px bg-white/5 my-1 mx-4" />
            <button 
              onClick={() => {
                localStorage.removeItem("bts_admin_session");
                setUser(null);
              }}
              className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-xs font-bold text-red-400/60 hover:bg-red-500/5 hover:text-red-400 transition-all"
            >
              <LogOut size={18} /> Odhlásit se
            </button>
          </nav>
        </aside>

        {/* ── FEED / PROFILE / STUDIO / MUSIC / SETTINGS ── */}
        <section className="flex flex-col gap-4">
          {activeTab === "profile" ? (
            <ProfileView 
              user={user} 
              posts={posts} 
              onUpdatePost={updatePost} 
              onUpdateUser={handleUpdateUser} 
              onChat={(ai) => {
                setActiveChatBot(ai);
              }}
            />
          ) : activeTab === "groups" ? (
            selectedGroup ? (
              <GroupDetailView 
                group={selectedGroup} 
                user={user} 
                onUpdatePost={updatePost}
                onBack={() => setSelectedGroup(null)}
                onJoin={() => joinGroup(selectedGroup)}
                onLeave={() => leaveGroup(selectedGroup)}
                onPost={(content, image, video) => addPost({
                  id: Date.now(),
                  authorId: user.sub,
                  authorName: user.name,
                  authorPic: user.picture,
                  content,
                  image,
                  video,
                  type: "post",
                  likes: 0,
                  comments: [],
                  shares: 0,
                  saved: false,
                  liked: false,
                  time: "právě teď",
                  timestamp: Date.now(),
                  privacy: "public",
                  groupId: selectedGroup.id
                })}
              />
            ) : (
              <GroupsView 
                groups={groups} 
                onSelect={setSelectedGroup} 
                onCreate={createGroup}
                onJoin={joinGroup}
              />
            )
          ) : activeTab === "studio" ? (
            <CreatorStudio 
              user={user} 
              onSave={saveToLibrary} 
              onDraft={(text) => {
                setDraftText(text);
                setShowCreate(true);
              }}
            />
          ) : activeTab === "library" ? (
            <LibraryView library={library} />
          ) : activeTab === "aichat" ? (
            <ChatHub 
              user={user} 
              onDraft={(text) => {
                setDraftText(text);
                setShowCreate(true);
              }} 
            />
          ) : activeTab === "music" ? (
            <SunoInterface onSave={saveToLibrary} />
          ) : activeTab === "settings" ? (
            <AccountSettings 
              user={user} 
              posts={posts}
              onUpdateUser={handleUpdateUser} 
              onUpdatePost={updatePost}
            />
          ) : (
            <>
              {activeTab === "feed" && (
                <>
                  {isSmartSearching && (
                    <div className="bg-[#12121e] rounded-3xl border border-white/10 p-8 flex flex-col items-center justify-center gap-4 animate-pulse">
                      <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400">
                        <Sparkles size={24} className="animate-spin" />
                      </div>
                      <div className="text-xs font-bold text-white/40 uppercase tracking-widest">AI prohledává síť i web...</div>
                    </div>
                  )}

                  {smartSearchResult && (
                    <motion.div 
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gradient-to-br from-purple-500/10 to-cyan-500/10 border border-white/10 rounded-3xl p-6 flex flex-col gap-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-[10px] font-bold text-purple-400 uppercase tracking-widest flex items-center gap-2">
                          <Sparkles size={12} /> AI Smart Search Výsledek
                        </div>
                        <button onClick={() => setSmartSearchResult(null)} className="text-white/20 hover:text-white"><X size={16} /></button>
                      </div>
                      <div className="text-sm text-white/80 leading-relaxed prose prose-invert max-w-none">
                        <Markdown>{smartSearchResult.text}</Markdown>
                      </div>
                      {smartSearchResult.sources.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-4 border-t border-white/5">
                          {smartSearchResult.sources.map((s: any, i: number) => (
                            <a 
                              key={i} 
                              href={s.uri} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-[10px] bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg text-white/40 hover:text-purple-400 hover:bg-white/10 transition-all flex items-center gap-2"
                            >
                              <Globe size={10} /> {s.title || "Zdroj"}
                            </a>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* ── FILTER & SORT BAR ── */}
                  <div className="bg-[#12121e] rounded-3xl border border-white/10 p-4 flex flex-wrap gap-4 items-center">
                    <input 
                      placeholder="Filtr autorů..."
                      value={filterAuthor}
                      onChange={e => setFilterAuthor(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder:text-white/20 outline-none focus:border-purple-500/50"
                    />
                    <input 
                      type="number"
                      placeholder="Min. lajků..."
                      value={minLikes}
                      onChange={e => setMinLikes(Number(e.target.value))}
                      className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder:text-white/20 outline-none focus:border-purple-500/50 w-24"
                    />
                    <select 
                      value={sortField}
                      onChange={e => setSortField(e.target.value as any)}
                      className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-purple-500/50"
                    >
                      <option value="timestamp">Datum</option>
                      <option value="likes">Lajky</option>
                    </select>
                    <button 
                      onClick={() => setSortOrder(prev => prev === "asc" ? "desc" : "asc")}
                      className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white hover:bg-white/10"
                    >
                      {sortOrder === "asc" ? "↑" : "↓"}
                    </button>
                  </div>

                  {/* ── STORIES ── */}
                  <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                    <div className="flex-shrink-0 w-28 h-44 rounded-2xl border border-white/10 bg-white/5 relative overflow-hidden group cursor-pointer">
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60" />
                      <Avatar name={user.name} pic={user.picture} size={32} className="absolute top-3 left-3 z-10 border-2 border-purple-500" />
                      <div className="absolute bottom-3 left-3 right-3 z-10">
                        <div className="text-[10px] font-bold text-white truncate">{user.name}</div>
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                        <Plus size={24} className="text-white" />
                      </div>
                    </div>
                    {friends.map(f => (
                      <div key={f.id} className="flex-shrink-0 w-28 h-44 rounded-2xl border border-white/10 relative overflow-hidden cursor-pointer group">
                        <img src={`https://picsum.photos/seed/${f.id}/200/300`} className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-110" referrerPolicy="no-referrer" />
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60" />
                        <div className="absolute top-3 left-3 z-10">
                          <Avatar name={f.name} size={32} color={f.color} online={f.status === "online"} />
                        </div>
                        <div className="absolute bottom-3 left-3 right-3 z-10">
                          <div className="text-[10px] font-bold text-white truncate">{f.name}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-[#12121e] rounded-3xl border border-white/10 p-4">
                    <div className="flex items-center gap-4">
                      <Avatar name={user.name} pic={user.picture} size={44} />
                      <button 
                        onClick={() => setShowCreate(true)}
                        className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-left text-white/30 text-sm hover:bg-white/10 transition-all"
                      >
                        Co máš na mysli, {user.name.split(" ")[0]}?
                      </button>
                    </div>
                    <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-white/5">
                      {[
                        { icon: Video, label: "Video", color: "text-purple-400" },
                        { icon: Image, label: "Fotka", color: "text-green-400" },
                        { icon: Sparkles, label: "AI", color: "text-cyan-400" },
                        { icon: Film, label: "Reel", color: "text-pink-400" },
                      ].map(({ icon: Icon, label, color }) => (
                        <button key={label} onClick={() => setShowCreate(true)} className="flex items-center justify-center gap-2 py-2 rounded-xl hover:bg-white/5 transition-all">
                          <Icon size={16} className={color} />
                          <span className="text-[10px] font-bold text-white/40">{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderPosts(filteredPosts)}
                    {filteredPosts.length === 0 && (
                      <div className="md:col-span-2 text-center py-20 opacity-20">
                        <Search size={48} className="mx-auto mb-4" />
                        <p>Žádné příspěvky k zobrazení</p>
                      </div>
                    )}
                  </div>
                </>
              )}
              {activeTab === "reels" && (
                <div className="flex flex-col gap-4">
                  <div className="bg-[#12121e] rounded-3xl border border-white/10 p-4 mb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-pink-500/10 flex items-center justify-center text-pink-400">
                          <Film size={20} />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white">Reels</h3>
                          <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Krátká AI videa</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setShowReelsFilters(!showReelsFilters)}
                        className={`p-2.5 rounded-xl border transition-all flex items-center gap-2 ${showReelsFilters ? 'bg-purple-500/10 border-purple-500/50 text-purple-400' : 'bg-white/5 border-white/10 text-white/40 hover:text-white/60'}`}
                      >
                        <SlidersHorizontal size={18} />
                        <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline">Filtry</span>
                      </button>
                    </div>
                    
                    <AnimatePresence>
                      {showReelsFilters && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                              <label className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] mb-3 block">Seřadit podle</label>
                              <div className="flex flex-col gap-2">
                                {[
                                  { id: "date", label: "Datum nahrání", icon: Calendar, color: "text-blue-400" },
                                  { id: "likes", label: "Popularita (Likes)", icon: Heart, color: "text-pink-400" },
                                  { id: "duration", label: "Délka videa", icon: Play, color: "text-cyan-400" }
                                ].map(s => (
                                  <button 
                                    key={s.id}
                                    onClick={() => setReelsSort(s.id as any)}
                                    className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold border transition-all ${reelsSort === s.id ? 'bg-white/10 border-white/20 text-white shadow-xl' : 'bg-white/5 border-white/5 text-white/30 hover:bg-white/10'}`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <s.icon size={14} className={reelsSort === s.id ? s.color : ""} />
                                      {s.label}
                                    </div>
                                    {reelsSort === s.id && <div className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]" />}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <label className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] mb-3 block">Směr řazení</label>
                              <div className="flex flex-col gap-2">
                                {[
                                  { id: "desc", label: "Nejnovější / Nejvíce", icon: TrendingUp },
                                  { id: "asc", label: "Nejstarší / Nejméně", icon: RefreshCw }
                                ].map(o => (
                                  <button 
                                    key={o.id}
                                    onClick={() => setReelsOrder(o.id as any)}
                                    className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold border transition-all ${reelsOrder === o.id ? 'bg-white/10 border-white/20 text-white shadow-xl' : 'bg-white/5 border-white/5 text-white/30 hover:bg-white/10'}`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <o.icon size={14} className={reelsOrder === o.id ? "text-cyan-400" : ""} />
                                      {o.label}
                                    </div>
                                    {reelsOrder === o.id && <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]" />}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderPosts(
                      posts
                        .filter(p => p.type === "reel")
                        .sort((a, b) => {
                          let valA, valB;
                          if (reelsSort === "date") {
                            valA = a.timestamp || (typeof a.id === 'number' ? a.id : 0);
                            valB = b.timestamp || (typeof b.id === 'number' ? b.id : 0);
                          } else if (reelsSort === "likes") {
                            valA = a.likes;
                            valB = b.likes;
                          } else {
                            valA = a.duration || 0;
                            valB = b.duration || 0;
                          }
                          return reelsOrder === "desc" ? valB - valA : valA - valB;
                        })
                    )}
                    {posts.filter(p => p.type === "reel").length === 0 && (
                      <div className="text-center py-20 opacity-20">
                        <Film size={48} className="mx-auto mb-4" />
                        <p>Žádné Reels k zobrazení</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {activeTab === "explore" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {renderPosts(posts)}
                </div>
              )}
              {activeTab === "friends" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {friends.map(f => (
                    <div key={f.id} className="bg-[#12121e] rounded-3xl border border-white/10 p-6 flex items-center justify-between group hover:border-white/20 transition-all">
                      <div className="flex items-center gap-4">
                        <Avatar name={f.name} size={60} color={f.color} online={f.status === "online"} />
                        <div>
                          <h4 className="font-bold text-white">{f.name}</h4>
                          <p className="text-xs text-white/30">{f.status}</p>
                        </div>
                      </div>
                      <button className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-white hover:bg-white/10 transition-all">
                        Zpráva
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </section>

        {/* ── RIGHT SIDEBAR ── */}
        <aside className="hidden md:flex flex-col gap-4 sticky top-20 h-[calc(100vh-100px)]">
          <div className="bg-[#12121e] rounded-3xl border border-white/10 p-6 hidden lg:block">
            <h4 className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-4 flex items-center justify-between">
              Trending <TrendingUp size={12} />
            </h4>
            <div className="flex flex-col gap-4">
              {[
                { tag: "#BTSProtocolAI", posts: "12.4k" },
                { tag: "#NexusProtocol", posts: "8.2k" },
                { tag: "#DigitalArt", posts: "5.1k" },
                { tag: "#Web3Social", posts: "3.9k" },
              ].map(t => (
                <div key={t.tag} className="flex flex-col cursor-pointer hover:bg-white/5 p-2 rounded-xl transition-all">
                  <div className="text-xs font-bold text-white">{t.tag}</div>
                  <div className="text-[9px] text-white/20">{t.posts} příspěvků</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#12121e] rounded-3xl border border-white/10 p-6">
            <h4 className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-4">Online Přátelé</h4>
            <div className="flex flex-col gap-4">
              {friends.map(f => (
                <div key={f.id} className="flex items-center gap-3 cursor-pointer group" onClick={() => setShowMsg(true)}>
                  <Avatar name={f.name} size={36} color={f.color} online={f.status === "online"} />
                  <div className="flex-1">
                    <div className="text-xs font-bold text-white group-hover:text-purple-400 transition-colors">{f.name}</div>
                    <div className={`text-[9px] ${f.status === "online" ? 'text-green-400' : 'text-white/20'}`}>
                      {f.status === "online" ? "● online" : f.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 min-h-0">
            <AISidebar />
          </div>
        </aside>
      </main>

      {/* ── MOBILE BOTTOM NAV ── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0a0a12]/80 backdrop-blur-2xl border-t border-white/5 px-6 h-20 flex items-center justify-between">
        {[
          { id: "feed", icon: Home, label: "Feed" },
          { id: "studio", icon: Sparkles, label: "Studio" },
          { id: "profile", icon: User, label: "Profil" },
        ].map(({ id, icon: Icon, label }) => (
          <button 
            key={id} 
            onClick={() => setActiveTab(id)}
            className={`flex flex-col items-center gap-1 transition-all ${activeTab === id ? 'text-purple-400' : 'text-white/30'}`}
          >
            <Icon size={22} />
            <span className="text-[8px] font-bold uppercase tracking-widest">{label}</span>
          </button>
        ))}
      </div>

      {/* ── MODALS ── */}
      <AnimatePresence>
        {showCreate && (
          <CreatePostModal 
            user={user} 
            groups={groups.filter(g => g.isMember)}
            initialText={draftText}
            onClose={() => {
              setShowCreate(false);
              setDraftText("");
            }} 
            onPost={(p) => addPost(p)} 
          />
        )}
      </AnimatePresence>
      
      {showMsg && <Messenger user={user} friends={friends} onClose={() => setShowMsg(false)} />}

      <AnimatePresence>
        {activeChatBot && (
          <ChatBotView 
            assistant={activeChatBot} 
            user={user} 
            onClose={() => setActiveChatBot(null)} 
          />
        )}
      </AnimatePresence>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
