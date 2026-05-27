import { UserDTO, MemberRole, MembershipStatus } from '../../community/models/community';

export interface GroupDTO {
  communityCode: string;
  communityName: string;
  name: string;
  description: string;
  onlyAdminsCanChat: boolean;
  createdBy: UserDTO;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
  eventCount: number;
  groupCode: string;
}

export interface GroupMembershipDTO {
  id: string; // UUID
  user: UserDTO;
  groupCode: string;
  groupName: string;
  role: MemberRole;
  status: MembershipStatus;
  joinedAt: string;
}

export interface CreateGroupRequest {
  communityCode: string;
  name: string;
  description?: string;
}

export interface UpdateGroupRequest {
  name?: string;
  description?: string;
}

export interface AddGroupMemberRequest {
  userCode: string;
  role: MemberRole;
}
