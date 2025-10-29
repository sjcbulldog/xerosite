export enum TeamPermission {
  SEND_MESSAGES = 'SEND_MESSAGES',
  SCHEDULE_EVENTS = 'SCHEDULE_EVENTS',
<<<<<<< HEAD
=======
  CREATE_PUBLIC_USER_GROUPS = 'CREATE_PUBLIC_USER_GROUPS',
>>>>>>> butch
}

export const TEAM_PERMISSION_LABELS: Record<TeamPermission, string> = {
  [TeamPermission.SEND_MESSAGES]: 'Send Messages',
  [TeamPermission.SCHEDULE_EVENTS]: 'Schedule Events',
<<<<<<< HEAD
=======
  [TeamPermission.CREATE_PUBLIC_USER_GROUPS]: 'Create Public User Groups',
>>>>>>> butch
};
