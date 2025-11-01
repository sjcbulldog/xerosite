import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-unseen-attachments-dialog',
  imports: [CommonModule],
  template: `
    <div class="dialog-overlay" (click)="cancel()">
      <div class="dialog-content unseen-attachments-dialog" (click)="$event.stopPropagation()">
        <div class="dialog-header">
          <h2>New Attachments</h2>
          <button class="close-button" (click)="cancel()">×</button>
        </div>
        <div class="dialog-body">
          <div class="message-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21.5 12H16l-2 3h-4l-2-3H2.5"></path>
              <path d="M5.5 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.89"></path>
              <path d="M14 2h-4l-1 4h6l-1-4z"></path>
            </svg>
          </div>
          <p class="message-text">
            You have <strong>{{ attachmentCount() }}</strong> new {{ attachmentCount() === 1 ? 'attachment' : 'attachments' }} waiting for you.
          </p>
        </div>
        <div class="dialog-footer">
          <button class="secondary-button" (click)="cancel()">Close</button>
          <button class="primary-button" (click)="viewAttachments()">View</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dialog-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      animation: fadeIn 0.2s ease-out;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    .dialog-content {
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      animation: slideUp 0.3s ease-out;
      max-height: 90vh;
      overflow-y: auto;
    }

    @keyframes slideUp {
      from {
        transform: translateY(20px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    .dialog-header {
      padding: 1.5rem;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      align-items: center;
      justify-content: space-between;

      h2 {
        margin: 0;
        color: #1f2937;
        font-size: 1.5rem;
        font-weight: 600;
      }
    }

    .close-button {
      background: none;
      border: none;
      font-size: 1.5rem;
      color: #6b7280;
      cursor: pointer;
      padding: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: all 0.2s;

      &:hover {
        background: #f3f4f6;
        color: #1f2937;
      }
    }

    .unseen-attachments-dialog {
      max-width: 400px;
      width: 90%;
    }

    .dialog-body {
      text-align: center;
      padding: 2rem;
    }

    .message-icon {
      color: #667eea;
      margin-bottom: 1rem;
      display: flex;
      justify-content: center;
    }

    .message-text {
      font-size: 1.1rem;
      line-height: 1.6;
      margin: 0;
      color: #4b5563;

      strong {
        color: #1f2937;
      }
    }

    .dialog-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      padding: 1rem 1.5rem;
      border-top: 1px solid #e5e7eb;
    }

    .primary-button,
    .secondary-button {
      padding: 0.625rem 1.5rem;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.9375rem;
      font-weight: 500;
      transition: all 0.2s;
    }

    .primary-button {
      background-color: #667eea;
      color: white;

      &:hover {
        background-color: #5a67d8;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
      }

      &:active {
        transform: translateY(0);
      }
    }

    .secondary-button {
      background-color: #f3f4f6;
      color: #4b5563;

      &:hover {
        background-color: #e5e7eb;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UnseenAttachmentsDialogComponent {
  attachmentCount = input.required<number>();
  close = output<void>();
  view = output<void>();

  cancel(): void {
    this.close.emit();
  }

  viewAttachments(): void {
    this.view.emit();
  }
}
