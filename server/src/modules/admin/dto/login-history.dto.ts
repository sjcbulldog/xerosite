export interface UserLoginDto {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  loginTime: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface LoginHistoryResponseDto {
  logins: UserLoginDto[];
  total: number;
}
