export interface Auth {
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  phone: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  userEmail: string;
}

export interface SignUpResponse {
  email: string;
  activationCodeDelivered: boolean;
  message: string;
}
