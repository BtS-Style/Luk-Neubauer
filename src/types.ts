export interface User {
  id?: string;
  sub?: string;
  name?: string;
  picture?: string;
  email?: string;
  bio?: string;
}

export interface Post {
  id: string | number;
  authorName: string;
  authorPic?: string;
  content: string;
  image?: string;
  video?: string;
  isReel?: boolean;
  videoEdits?: {
    trimStart: number;
    trimEnd: number;
    volume: number;
    musicTrack?: string;
    uploadedAudioName?: string;
  };
  timestamp: number;
  likes: number;
  comments: Comment[];
  groupId?: string | null;
  aiResponse?: string;
  vocalImprint?: string;
}

export interface Comment {
  id: string | number;
  authorName: string;
  authorPic?: string;
  content: string;
  timestamp: number;
}

export interface Story {
  id: string | number;
  userName: string;
  userPic: string;
  imageUrl: string;
  timestamp: number;
}

export interface Friend {
  id: string | number;
  name: string;
  picture: string;
  status: "online" | "offline";
  isAI?: boolean;
}

export interface LibraryItem {
  id: string | number;
  title: string;
  type: string;
  content: any;
  timestamp: number;
}

export interface AIAssistant {
  id: string;
  name: string;
  desc: string;
  avatar: string;
  color: string;
}

export interface Group {
  id: string;
  name: string;
  desc: string;
  coverPhoto: string;
  memberCount: number;
  isMember: boolean;
}

export interface AIAutonomySettings {
  independenceLevel: number; // 0-100
  ethicalFilters: boolean;
  autonomousPosting: boolean;
  learningMode: boolean;
  vocalImprintSync: boolean;
  temperature: number; // 0-1
  maxTokens: number;
}

export interface BTSNotification {
  id: string | number;
  userId: string;
  type: "mention" | "reply" | "group_invite" | "ai_insight" | "system";
  senderName: string;
  senderPic?: string | null;
  content: string;
  link?: string;
  read: boolean;
  timestamp: number;
}
