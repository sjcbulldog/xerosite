import { Component, Input, Output, EventEmitter, inject, signal, computed, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MessagesService, MessageRecipientType, SendMessageRequest } from './messages.service';
import { UserGroupsService, UserGroup } from './user-groups.service';

@Component({
  selector: 'app-send-message-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './send-message-dialog.component.html',
  styleUrls: ['./send-message-dialog.component.scss']
})
export class SendMessageDialogComponent implements OnInit {
  @Input() teamId!: string;
  @Output() close = new EventEmitter<void>();
  @Output() messageSent = new EventEmitter<void>();

  private readonly messagesService = inject(MessagesService);
  private readonly userGroupsService = inject(UserGroupsService);
  private readonly fb = inject(FormBuilder);

  public readonly MessageRecipientType = MessageRecipientType;

  protected readonly isSending = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly success = signal<string | null>(null);
  protected readonly info = signal<string | null>(null);
  protected readonly userGroups = signal<UserGroup[]>([]);
  protected readonly isLoadingUserGroups = signal(false);
  protected readonly attachedFiles = signal<File[]>([]);
  protected readonly isDraggingOver = signal(false);

  protected sendMessageForm: FormGroup;

  protected readonly showUserGroupSelect = computed(() => {
    return this.sendMessageForm?.get('recipientType')?.value === MessageRecipientType.USER_GROUP;
  });

  constructor() {
    this.sendMessageForm = this.fb.group({
      recipientType: [MessageRecipientType.ALL_TEAM_MEMBERS, [Validators.required]],
      userGroupId: [''],
      subject: ['', [Validators.required, Validators.maxLength(255)]],
      content: ['', [Validators.required, Validators.maxLength(5000)]]
    });

    // Add conditional validator for userGroupId
    this.sendMessageForm.get('recipientType')?.valueChanges.subscribe(value => {
      const userGroupControl = this.sendMessageForm.get('userGroupId');
      if (value === MessageRecipientType.USER_GROUP) {
        userGroupControl?.setValidators([Validators.required]);
      } else {
        userGroupControl?.clearValidators();
        userGroupControl?.setValue('');
      }
      userGroupControl?.updateValueAndValidity();
    });
  }

  async ngOnInit() {
    await this.loadUserGroups();
  }

  private async loadUserGroups(): Promise<void> {
    this.isLoadingUserGroups.set(true);
    try {
      const groups = await this.userGroupsService.getUserGroups(this.teamId);
      this.userGroups.set(groups);
    } catch (error) {
      console.error('Error loading user groups:', error);
      // Don't show error for user groups loading failure - just continue without them
    } finally {
      this.isLoadingUserGroups.set(false);
    }
  }

  protected async onSendMessage(): Promise<void> {
    if (this.sendMessageForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.isSending.set(true);
    this.error.set(null);
    this.success.set(null);

    try {
      const formValue = this.sendMessageForm.value;
      const request: SendMessageRequest = {
        teamId: this.teamId,
        subject: formValue.subject,
        content: formValue.content,
        recipientType: formValue.recipientType,
        userGroupId: formValue.userGroupId || undefined
      };

      await this.messagesService.sendMessage(this.teamId, request, this.attachedFiles());
      
      this.success.set('Message sent successfully!');
      this.messageSent.emit();
      
      // Close dialog after a brief delay to show success message
      setTimeout(() => {
        this.closeDialog();
      }, 1500);
      
    } catch (error: any) {
      console.error('Error sending message:', error);
      this.error.set(error.message || 'Failed to send message. Please try again.');
    } finally {
      this.isSending.set(false);
    }
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.addFiles(Array.from(input.files));
      input.value = ''; // Reset input so same file can be selected again
    }
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingOver.set(true);
  }

  protected onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingOver.set(false);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingOver.set(false);

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.addFiles(Array.from(event.dataTransfer.files));
    }
  }

  protected removeFile(index: number): void {
    const files = this.attachedFiles();
    files.splice(index, 1);
    this.attachedFiles.set([...files]);
    
    // Re-check if any remaining files are large
    const largeFileThreshold = 1 * 1024 * 1024; // 1MB
    const largeFiles = files.filter(f => f.size > largeFileThreshold);
    if (largeFiles.length > 0) {
      const fileList = largeFiles.map(f => `"${f.name}" (${this.formatFileSize(f.size)})`).join(', ');
      this.info.set(`Note: ${fileList} exceed${largeFiles.length === 1 ? 's' : ''} 1MB and will be stored on the server. Recipients will receive download links in the email.`);
    } else {
      this.info.set(null);
    }
  }

  protected formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  private addFiles(files: File[]): void {
    const currentFiles = this.attachedFiles();
    const maxFiles = 10;
    const maxTotalSize = 50 * 1024 * 1024; // 50MB total
    const largeFileThreshold = 1 * 1024 * 1024; // 1MB

    // Check total file count
    if (currentFiles.length + files.length > maxFiles) {
      this.error.set(`You can only attach up to ${maxFiles} files.`);
      return;
    }

    // Check total size
    const currentTotalSize = currentFiles.reduce((sum, file) => sum + file.size, 0);
    const newFilesSize = files.reduce((sum, file) => sum + file.size, 0);
    const totalSize = currentTotalSize + newFilesSize;

    if (totalSize > maxTotalSize) {
      this.error.set(`Total attachment size exceeds 50MB limit. Current: ${this.formatFileSize(currentTotalSize)}, Adding: ${this.formatFileSize(newFilesSize)}`);
      return;
    }

    // Check if any files are larger than 1MB and show info message
    const largeFiles = files.filter(f => f.size > largeFileThreshold);
    if (largeFiles.length > 0) {
      const fileList = largeFiles.map(f => `"${f.name}" (${this.formatFileSize(f.size)})`).join(', ');
      this.info.set(`Note: ${fileList} exceed${largeFiles.length === 1 ? 's' : ''} 1MB and will be stored on the server. Recipients will receive download links in the email.`);
    } else {
      this.info.set(null);
    }

    this.attachedFiles.set([...currentFiles, ...files]);
    this.error.set(null);
  }

  protected closeDialog(): void {
    this.close.emit();
  }

  protected getFieldError(fieldName: string): string | null {
    const field = this.sendMessageForm.get(fieldName);
    if (field && field.invalid && (field.dirty || field.touched)) {
      if (field.errors?.['required']) {
        return `${this.getFieldDisplayName(fieldName)} is required`;
      }
      if (field.errors?.['maxlength']) {
        const maxLength = field.errors['maxlength'].requiredLength;
        return `${this.getFieldDisplayName(fieldName)} must be no more than ${maxLength} characters`;
      }
    }
    return null;
  }

  private getFieldDisplayName(fieldName: string): string {
    const displayNames: { [key: string]: string } = {
      recipientType: 'Recipient type',
      userGroupId: 'User group',
      subject: 'Subject',
      content: 'Message content'
    };
    return displayNames[fieldName] || fieldName;
  }

  private markFormGroupTouched(): void {
    Object.keys(this.sendMessageForm.controls).forEach(key => {
      const control = this.sendMessageForm.get(key);
      control?.markAsTouched();
    });
  }

  protected getRecipientTypeDisplayName(type: MessageRecipientType): string {
    switch (type) {
      case MessageRecipientType.ALL_TEAM_MEMBERS:
        return 'All Team Members';
      case MessageRecipientType.USER_GROUP:
        return 'User Group';
      default:
        return type;
    }
  }
}