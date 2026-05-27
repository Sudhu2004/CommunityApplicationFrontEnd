export interface UserProfile {
  id: string;
  email: string;
  name: string;
  joinedAt: string;
  communityCount: number;
  groupCount: number;
  userCode: string;
  profilePhotoUrl?: string;
}
