import { Component, Input, Output, EventEmitter, inject, signal, computed, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule, DatePipe } from '@angular/common';
import { MessagesService, MessageResponse, GetMessagesQuery } from './messages.service';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-review-messages-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DatePipe],
  templateUrl: './review-messages-dialog.component.html',
  styleUrls: ['./review-messages-dialog.component.scss']
})
export class ReviewMessagesDialogComponent implements OnInit {
  @Input() teamId!: string;
  @Output() close = new EventEmitter<void>();

  private readonly messagesService = inject(MessagesService);
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  protected readonly isLoading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly messages = signal<MessageResponse[]>([]);
  protected readonly filteredMessages = signal<MessageResponse[]>([]);
  
  protected searchForm: FormGroup;
  protected readonly sortField = signal<keyof MessageResponse>('createdAt');
  protected readonly sortDirection = signal<'asc' | 'desc'>('desc');

  // Computed signal for sorted and filtered messages
  protected readonly sortedMessages = computed(() => {
    const messages = this.filteredMessages();
    const field = this.sortField();
    const direction = this.sortDirection();

    return [...messages].sort((a, b) => {
      let aValue = a[field];
      let bValue = b[field];

      // Handle date values
      if (aValue instanceof Date) aValue = aValue.getTime();
      if (bValue instanceof Date) bValue = bValue.getTime();
      
      // Handle string values
      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();

      // Handle null/undefined values
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return direction === 'asc' ? -1 : 1;
      if (bValue == null) return direction === 'asc' ? 1 : -1;

      if (aValue < bValue) return direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  });

  // Track which messages have expanded attachments
  protected readonly expandedMessageIds = signal<Set<string>>(new Set());

  constructor() {
    this.searchForm = this.fb.group({
      search: [''],
      startDate: [''],
      endDate: ['']
    });

    // Watch for search form changes and apply filtering
    this.searchForm.valueChanges.subscribe(() => {
      this.applyFilters();
    });
  }

  async ngOnInit() {
    await this.loadMessages();
  }

  private async loadMessages(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const messages = await this.messagesService.getTeamMessages(this.teamId);
      this.messages.set(messages);
      this.applyFilters();
    } catch (error: any) {
      console.error('Error loading messages:', error);
      this.error.set(error.message || 'Failed to load messages. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }

  private applyFilters(): void {
    const formValue = this.searchForm.value;
    let filtered = this.messages();

    // Apply text search filter
    if (formValue.search?.trim()) {
      const searchTerm = formValue.search.toLowerCase().trim();
      filtered = filtered.filter(message => 
        message.subject.toLowerCase().includes(searchTerm) ||
        message.content.toLowerCase().includes(searchTerm) ||
        message.senderName.toLowerCase().includes(searchTerm) ||
        (message.userGroupName && message.userGroupName.toLowerCase().includes(searchTerm))
      );
    }

    // Apply date filters
    if (formValue.startDate) {
      const startDate = new Date(formValue.startDate);
      startDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(message => 
        new Date(message.createdAt) >= startDate
      );
    }

    if (formValue.endDate) {
      const endDate = new Date(formValue.endDate);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(message => 
        new Date(message.createdAt) <= endDate
      );
    }

    this.filteredMessages.set(filtered);
  }

  protected async onSearch(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const formValue = this.searchForm.value;
      const query: GetMessagesQuery = {};
      
      if (formValue.search?.trim()) {
        query.search = formValue.search.trim();
      }
      if (formValue.startDate) {
        query.startDate = formValue.startDate;
      }
      if (formValue.endDate) {
        query.endDate = formValue.endDate;
      }

      const messages = await this.messagesService.getTeamMessages(this.teamId, query);
      this.messages.set(messages);
      this.filteredMessages.set(messages);
    } catch (error: any) {
      console.error('Error searching messages:', error);
      this.error.set(error.message || 'Failed to search messages. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }

  protected clearFilters(): void {
    this.searchForm.reset();
    this.applyFilters();
  }

  protected sortBy(field: keyof MessageResponse): void {
    if (this.sortField() === field) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortDirection.set('asc');
    }
  }

  protected getSortIcon(field: keyof MessageResponse): string {
    if (this.sortField() !== field) return '↕️';
    return this.sortDirection() === 'asc' ? '↑' : '↓';
  }

  protected closeDialog(): void {
    this.close.emit();
  }

  protected getRecipientTypeDisplay(message: MessageResponse): string {
    switch (message.recipientType) {
      case 'ALL_TEAM_MEMBERS':
        return 'All Team Members';
      case 'USER_GROUP':
        return message.userGroupName || 'User Group';
      default:
        return message.recipientType;
    }
  }

  protected getStatusDisplay(message: MessageResponse): string {
    if (message.errorMessage) {
      return 'Failed';
    } else if (message.sentAt) {
      return 'Sent';
    } else {
      return 'Pending';
    }
  }

  protected getStatusClass(message: MessageResponse): string {
    if (message.errorMessage) {
      return 'status-failed';
    } else if (message.sentAt) {
      return 'status-sent';
    } else {
      return 'status-pending';
    }
  }

  protected viewMessageDetails(message: MessageResponse): void {
    // For now, just log the message details
    // In a future enhancement, could open a detailed view dialog
    console.log('Message details:', message);
  }

  protected truncateText(text: string, maxLength: number = 100): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  protected hasAttachments(message: MessageResponse): boolean {
    return message.attachments !== undefined && message.attachments.length > 0;
  }

  protected getAttachmentCount(message: MessageResponse): number {
    return message.attachments?.length || 0;
  }

  protected isMessageExpanded(messageId: string): boolean {
    return this.expandedMessageIds().has(messageId);
  }

  protected async toggleAttachments(message: MessageResponse): Promise<void> {
    const expanded = this.expandedMessageIds();
    const newExpanded = new Set(expanded);
    
    if (newExpanded.has(message.id)) {
      newExpanded.delete(message.id);
    } else {
      newExpanded.add(message.id);
      
      // Mark attachments as viewed when expanding
      if (message.hasUnviewedAttachments) {
        try {
          await this.messagesService.markAttachmentsAsViewed(this.teamId, message.id);
          // Update the message to reflect it's been viewed
          message.hasUnviewedAttachments = false;
        } catch (error) {
          console.error('Error marking attachments as viewed:', error);
        }
      }
    }
    
    this.expandedMessageIds.set(newExpanded);
  }

  protected async downloadAttachment(message: MessageResponse, fileId: string): Promise<void> {
    try {
      await this.messagesService.downloadAttachment(this.teamId, message.id, fileId);
    } catch (error) {
      console.error('Error downloading attachment:', error);
      alert('Failed to download attachment. Please try again.');
    }
  }

  protected formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  protected isSentByCurrentUser(message: MessageResponse): boolean {
    const currentUser = this.authService.currentUser();
    return currentUser?.id === message.senderId;
  }

  protected getMessageDirection(message: MessageResponse): string {
    return this.isSentByCurrentUser(message) ? 'Sent' : 'Received';
  }
}
