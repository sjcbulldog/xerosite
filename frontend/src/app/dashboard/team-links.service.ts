import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TeamLink, CreateTeamLinkDto, UpdateTeamLinkDto } from './team-links.types';

@Injectable({
  providedIn: 'root',
})
export class TeamLinksService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/teams';

  readonly links = signal<TeamLink[]>([]);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);

  async loadLinksForTeam(teamId: string): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const links = await this.http
        .get<TeamLink[]>(`${this.apiUrl}/${teamId}/links`)
        .toPromise();

      this.links.set(links || []);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load links';
      this.error.set(errorMessage);
      this.links.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }

  async createLink(teamId: string, dto: CreateTeamLinkDto): Promise<TeamLink> {
    const link = await this.http
      .post<TeamLink>(`${this.apiUrl}/${teamId}/links`, dto)
      .toPromise();

    if (link) {
      const currentLinks = this.links();
      this.links.set([...currentLinks, link]);
      return link;
    }

    throw new Error('Failed to create link');
  }

  async updateLink(
    teamId: string,
    linkId: string,
    dto: UpdateTeamLinkDto
  ): Promise<TeamLink> {
    const updatedLink = await this.http
      .patch<TeamLink>(`${this.apiUrl}/${teamId}/links/${linkId}`, dto)
      .toPromise();

    if (updatedLink) {
      const currentLinks = this.links();
      const index = currentLinks.findIndex((l) => l.id === linkId);
      if (index !== -1) {
        const newLinks = [...currentLinks];
        newLinks[index] = updatedLink;
        this.links.set(newLinks);
      }
      return updatedLink;
    }

    throw new Error('Failed to update link');
  }

  async deleteLink(teamId: string, linkId: string): Promise<void> {
    await this.http
      .delete(`${this.apiUrl}/${teamId}/links/${linkId}`)
      .toPromise();

    const currentLinks = this.links();
    this.links.set(currentLinks.filter((l) => l.id !== linkId));
  }

  clearLinks(): void {
    this.links.set([]);
    this.error.set(null);
    this.isLoading.set(false);
  }
}
