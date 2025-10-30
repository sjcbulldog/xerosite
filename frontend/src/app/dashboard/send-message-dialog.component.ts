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
  protected readonly userGroups = signal<UserGroup[]>([]);
  protected readonly isLoadingUserGroups = signal(false);

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

      await this.messagesService.sendMessage(this.teamId, request);
      
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