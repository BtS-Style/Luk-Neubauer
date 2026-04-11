export interface LibraryItem {
  id: string;
  type: "image" | "video" | "audio" | "file";
  category: "ai-generated" | "photos" | "music" | "other";
  url: string;
  name: string;
  timestamp: number;
}

export interface AIAssistant {
  id: string;
  name: string;
  role: string;
  avatar: string;
  status: "active" | "idle" | "learning";
  model: "gemini" | "grok" | "gpt" | "claude";
}

export interface AIAutonomySettings {
  independenceLevel: number; // 0-100
  ethicalFilters: boolean;
  autonomousPosting: boolean;
  learningMode: boolean;
  vocalImprintSync: boolean;
}

export interface User {
  id?: string;
  name: string;
  email: string;
  picture: string | null;
  coverPhoto?: string | null;
  bio?: string;
  location?: string;
  sub: string;
  provider: string;
  stats?: {
    posts: number;
    friends: number;
    followers: number;
    following: number;
    aiInteractions: number;
  };
  library?: LibraryItem[];
  aiAssistants?: AIAssistant[];
  aiAutonomy?: AIAutonomySettings;
}

export interface Post {
  id: string | number;
  authorId: string;
  authorName: string;
  authorPic: string | null;
  content: string;
  image: string | null;
  video?: string | null;
  type: "post" | "reel" | "story";
  likes: number;
  comments: Comment[];
  shares: number;
  saved: boolean;
  liked: boolean;
  time: string;
  timestamp: number;
  duration?: number; // in seconds
  privacy: "public" | "friends" | "private";
  vocalImprint?: string | null;
  aiInsight?: string | null;
  groupId?: string | null;
  customStyle?: string | null;
  files?: { name: string; type: string; url: string | null }[];
}

export interface Group {
  id: string;
  name: string;
  description: string;
  coverPhoto: string | null;
  adminId: string;
  memberCount: number;
  isMember?: boolean;
  createdAt: string;
}

export interface GroupMember {
  userId: string;
  groupId: string;
  role: "admin" | "member";
  joinedAt: string;
}

export interface Comment {
  id: string | number;
  author: string;
  text: string;
  time: string;
}

export interface Story {
  id: number;
  name: string;
  color: string;
  emoji: string;
}

export interface Friend {
  id: string;
  name: string;
  status: string;
  color: string;
}
