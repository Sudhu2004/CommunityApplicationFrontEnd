export type MemberRole = 'OWNER' | 'ADMIN' | 'MEMBER';
export type MembershipStatus = 'PENDING_APPROVAL' | 'PENDING_INVITATION' | 'ACCEPTED' | 'REJECTED';

/** Matches the UserDTO returned by the backend */
export interface UserDTO {
  email: string;
  name?: string;
  phone?: string;
  profilePhotoUrl?: string;
  createdAt: string;
  updatedAt: string;
  userCode: string;
  active: boolean;
}

/** Matches the CommunityDTO returned by /api/communities */
export interface CommunityDTO {
  name: string;
  description: string;
  onlyAdminsCanChat: boolean;
  createdBy: UserDTO;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
  groupCount: number;
  communityCode: string;
}

/** Matches the CommunityMembershipDTO returned by /api/communities/{id}/members */
export interface CommunityMembershipDTO {
  id: string; // UUID
  user: UserDTO;
  role: MemberRole;
  status: MembershipStatus;
  joinedAt: string;
  communityCode: string;
}

// ─── Request payloads ────────────────────────────────────────────────────────

export interface CreateCommunityRequest {
  name: string;
  description?: string;
}

export interface UpdateCommunityRequest {
  name?: string;
  description?: string;
}

export interface AddMemberRequest {
  userCode: string;
  role: MemberRole;
}
