export type MessageType = 'TEXT' | 'MEDIA' | 'SYSTEM_ACTIVITY';
export type MediaType = 'IMAGE' | 'VIDEO' | 'PDF' | 'DOCUMENT';

export interface MediaRequest {
  mediaType: MediaType;
  url: string;
  sizeInBytes?: number;
  width?: number;
  height?: number;
  durationInSeconds?: number;
}

export interface MediaDTO {
  id: string; // UUID
  mediaType: MediaType;
  url: string;
  sizeInBytes: number;
  width: number;
  height: number;
  durationInSeconds: number;
}

export interface MessageDTO {
  id: string; // UUID
  eventCode?: string;
  communityCode?: string;
  groupCode?: string;
  userCode: string;
  senderName: string;
  senderProfilePhotoUrl: string;
  type: MessageType;
  content: string;
  createdAt: string;
  updatedAt: string;
  mediaList: MediaDTO[];
}

export interface CreateMessageRequest {
  eventCode?: string;
  communityCode?: string;
  groupCode?: string;
  type: MessageType;
  content?: string;
  mediaList?: MediaRequest[];
}

export interface PageMessageDTO {
  totalPages: number;
  totalElements: number;
  first: boolean;
  last: boolean;
  size: number;
  content: MessageDTO[];
  number: number;
  numberOfElements: number;
  empty: boolean;
}
