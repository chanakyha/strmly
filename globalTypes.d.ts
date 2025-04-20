interface User {
  walletAddress: string;
  name: string;
  bio: string;
  tags: string[];
  created_at: string;
  subscribed: string[];
  subscribers: string[];
}

interface LiveData {
  walletAddress: string;
  playback_id: string;
  created_at: string;
  stream_key: string;
  stream_url: string;
  stream_id: string;
  tags: string[];
  title: string;
  thumbnail_url: string;
  description: string;
}

interface LiveChatMessage {
  id: number;
  created_at: string;
  message: string;
  walletAddress: string;
  playback_id: string;
  reply_to: number | null;
  message_id: number;
}
