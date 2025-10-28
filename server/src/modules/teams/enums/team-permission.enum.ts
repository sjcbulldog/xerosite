export enum TeamPermission {
  SEND_MESSAGES = 'SEND_MESSAGES',
  SCHEDULE_EVENTS = 'SCHEDULE_EVENTS',
}

export const TEAM_PERMISSION_LABELS: Record<TeamPermission, string> = {
  [TeamPermission.SEND_MESSAGES]: 'Send Messages',
  [TeamPermission.SCHEDULE_EVENTS]: 'Schedule Events',
};
