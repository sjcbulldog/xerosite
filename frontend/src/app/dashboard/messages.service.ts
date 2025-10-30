import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export enum MessageRecipientType {
  ALL_TEAM_MEMBERS = 'ALL_TEAM_MEMBERS',
  USER_GROUP = 'USER_GROUP',
}

export interface SendMessageRequest {
  teamId: string;
  subject: string;
  content: string;
  recipientType: MessageRecipientType;
  userGroupId?: string;
}

export interface MessageResponse {
  id: string;
  teamId: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  subject: string;
  content: string;
  recipientType: MessageRecipientType;
  userGroupId?: string;
  userGroupName?: string;
  recipientCount: number;
  sentAt?: Date;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GetMessagesQuery {
  startDate?: string;
  endDate?: string;
  search?: string;
}

@Injectable({
  providedIn: 'root'
})
export class MessagesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/teams';

  async sendMessage(teamId: string, request: SendMessageRequest, files?: File[]): Promise<MessageResponse> {
    try {
      if (files && files.length > 0) {
        // Send as multipart form data with files
        const formData = new FormData();
        formData.append('subject', request.subject);
        formData.append('content', request.content);
        formData.append('recipientType', request.recipientType);
        if (request.userGroupId) {
          formData.append('userGroupId', request.userGroupId);
        }

        // Append files
        files.forEach(file => {
          formData.append('attachments', file);
        });

        return await firstValueFrom(
          this.http.post<MessageResponse>(`${this.apiUrl}/${teamId}/messages`, formData)
        );
      } else {
        // Send as JSON without files
        return await firstValueFrom(
          this.http.post<MessageResponse>(`${this.apiUrl}/${teamId}/messages`, request)
        );
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      throw new Error(error.error?.message || 'Failed to send message');
    }
  }

  async getTeamMessages(teamId: string, query?: GetMessagesQuery): Promise<MessageResponse[]> {
    try {
      const params: any = {};
      if (query?.startDate) params.startDate = query.startDate;
      if (query?.endDate) params.endDate = query.endDate;
      if (query?.search) params.search = query.search;

      return await firstValueFrom(
        this.http.get<MessageResponse[]>(`${this.apiUrl}/${teamId}/messages`, { params })
      );
    } catch (error: any) {
      console.error('Error getting team messages:', error);
      throw new Error(error.error?.message || 'Failed to get team messages');
    }
  }
}