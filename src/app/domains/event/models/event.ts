import { UserDTO } from '../../community/models/community';

export interface LocalTime {
  hour: number;
  minute: number;
  second: number;
  nano: number;
}

export interface EventDTO {
  title: string;
  description: string;
  communityCode: string;
  communityName: string;
  groupCode: string;
  groupName: string;
  createdBy: UserDTO;
  eventDate: string; // ISO date
  eventTime: LocalTime;
  location: string;
  attendanceEnabled: boolean;
  isNotice: boolean;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  attendanceCount: number;
  eventCode: string;
}

export interface CreateEventRequest {
  title: string;
  description?: string;
  communityCode?: string;
  groupCode?: string;
  eventDate: string; // ISO date
  eventTime?: LocalTime;
  location?: string;
  attendanceEnabled?: boolean;
}

export interface UpdateEventRequest {
  title?: string;
  description?: string;
  eventDate?: string;
  eventTime?: LocalTime;
  location?: string;
}

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'PENDING';

export interface MarkAttendanceRequest {
  userCode: string;
  groupCode?: string;
  status: AttendanceStatus;
  type: 'COMMUNITY' | 'USER' | 'GROUP' | 'EVENTS';
}

export interface EventAttendanceDTO {
  id: string; // UUID
  eventCode: string;
  eventTitle: string;
  user: UserDTO;
  groupCode: string;
  groupName: string;
  status: AttendanceStatus;
  markedBy: UserDTO;
  markedAt: string;
  createdAt: string;
}

export interface AttendanceStatsDTO {
  totalAttendance: number;
  presentCount: number;
  absentCount: number;
  pendingCount: number;
  presentPercentage: number;
}
