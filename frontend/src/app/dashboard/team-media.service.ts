import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpEvent, HttpEventType } from '@angular/common/http';
import { Observable, lastValueFrom } from 'rxjs';
import {
  TeamMedia,
  CreateTeamMediaDto,
  UpdateTeamMediaDto,
} from './team-media.types';

@Injectable({
  providedIn: 'root',
})
export class TeamMediaService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/teams';

  readonly mediaFiles = signal<TeamMedia[]>([]);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);

  async loadMediaForTeam(teamId: string): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const media = await this.http
        .get<TeamMedia[]>(`${this.apiUrl}/${teamId}/media`)
        .toPromise();

      this.mediaFiles.set(media || []);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load media files';
      this.error.set(errorMessage);
      this.mediaFiles.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }

  uploadFile(
    teamId: string,
    file: File,
    title: string,
    year: number,
  ): Observable<HttpEvent<TeamMedia>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('year', year.toString());

    return this.http.post<TeamMedia>(
      `${this.apiUrl}/${teamId}/media`,
      formData,
      {
        reportProgress: true,
        observe: 'events',
      },
    );
  }

  async uploadFileAndUpdateList(
    teamId: string,
    file: File,
    title: string,
    year: number,
  ): Promise<TeamMedia> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('year', year.toString());

    const media = await this.http
      .post<TeamMedia>(`${this.apiUrl}/${teamId}/media`, formData)
      .toPromise();

    if (media) {
      const currentMedia = this.mediaFiles();
      this.mediaFiles.set([media, ...currentMedia]);
      return media;
    }

    throw new Error('Failed to upload file');
  }

  async updateTitle(
    teamId: string,
    mediaId: string,
    title: string,
    year?: number
  ): Promise<TeamMedia> {
    const dto: UpdateTeamMediaDto = { title };
    if (year !== undefined) {
      dto.year = year;
    }
    const updatedMedia = await this.http
      .patch<TeamMedia>(`${this.apiUrl}/${teamId}/media/${mediaId}`, dto)
      .toPromise();

    if (updatedMedia) {
      const currentMedia = this.mediaFiles();
      const index = currentMedia.findIndex((m) => m.id === mediaId);
      if (index !== -1) {
        const newMedia = [...currentMedia];
        newMedia[index] = updatedMedia;
        this.mediaFiles.set(newMedia);
      }
      return updatedMedia;
    }

    throw new Error('Failed to update media');
  }

  async deleteFile(teamId: string, mediaId: string): Promise<void> {
    await this.http
      .delete(`${this.apiUrl}/${teamId}/media/${mediaId}`)
      .toPromise();

    const currentMedia = this.mediaFiles();
    this.mediaFiles.set(currentMedia.filter((m) => m.id !== mediaId));
  }

  getDownloadUrl(teamId: string, mediaId: string): string {
    return `${this.apiUrl}/${teamId}/media/${mediaId}/download`;
  }

  getPreviewUrl(teamId: string, mediaId: string): string {
    return `${this.apiUrl}/${teamId}/media/${mediaId}/preview`;
  }

  clearMedia(): void {
    this.mediaFiles.set([]);
    this.error.set(null);
    this.isLoading.set(false);
  }
}
