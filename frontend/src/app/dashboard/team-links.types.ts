export interface TeamLink {
  id: string;
  teamId: string;
  title: string;
  url: string;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTeamLinkDto {
  title: string;
  url: string;
  displayOrder?: number;
}

export interface UpdateTeamLinkDto {
  title?: string;
  url?: string;
  displayOrder?: number;
}
