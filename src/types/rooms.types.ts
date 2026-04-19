export type Role = 'HOST' | 'MODERATOR' | 'PARTICIPANT' | 'VIEWER';

export interface RoomUser {
  userId:   string;
  username: string;
  role:     Role;
}

export interface VideoState {
  videoId:     string | null;
  isPlaying:   boolean;
  currentTime: number;
  updatedAt:   number;
}

export interface RoomState {
  roomId:     string;
  users:      RoomUser[];
  videoState: VideoState;
  myRole:     Role;
}