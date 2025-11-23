export enum AppView {
  CHAT = 'CHAT',
  IMAGE_GEN = 'IMAGE_GEN',
  LIVE = 'LIVE'
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  image?: string; // Base64 data URI
  timestamp: number;
  isError?: boolean;
}

export interface GeneratedImage {
  url: string;
  prompt: string;
  timestamp: number;
}
