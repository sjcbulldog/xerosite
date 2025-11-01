export interface UserLoginRecord {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  loginTime: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface LoginHistoryResponse {
  logins: UserLoginRecord[];
  total: number;
}
