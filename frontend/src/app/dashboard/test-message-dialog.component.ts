import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-test-message-dialog',
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="dialog-overlay" (click)="close()">
      <div class="dialog-content" (click)="$event.stopPropagation()">
        <div class="dialog-header">
          <h2>Test Message</h2>
          <button class="close-button" (click)="close()" type="button">×</button>
        </div>

        <form [formGroup]="form" (ngSubmit)="sendMessage()">
          <div class="form-group">
            <label>Delivery Method</label>
            <div class="toggle-group">
              <button
                type="button"
                class="toggle-button"
                [class.active]="deliveryMethod() === 'email'"
                (click)="setDeliveryMethod('email')"
              >
                Email
              </button>
              <button
                type="button"
                class="toggle-button"
                [class.active]="deliveryMethod() === 'text'"
                (click)="setDeliveryMethod('text')"
              >
                Text
              </button>
            </div>
          </div>

          <div class="form-group">
            <label [for]="recipientInputId()">
              {{ deliveryMethod() === 'email' ? 'Email Address' : 'Phone Number' }}
            </label>
            <input
              [id]="recipientInputId()"
              type="text"
              class="form-input"
              formControlName="recipient"
              [placeholder]="deliveryMethod() === 'email' ? 'user@example.com' : '+1234567890'"
            />
            @if (form.get('recipient')?.invalid && form.get('recipient')?.touched) {
              <span class="error-message">
                {{ deliveryMethod() === 'email' ? 'Please enter a valid email address' : 'Please enter a valid phone number' }}
              </span>
            }
          </div>

          <div class="form-group">
            <label for="message">Message</label>
            <textarea
              id="message"
              class="form-textarea"
              formControlName="message"
              rows="5"
              placeholder="Enter your test message..."
            ></textarea>
            @if (deliveryMethod() === 'text') {
              <div class="character-counter" [class.limit-exceeded]="characterCount() > 160">
                {{ characterCount() }} / 160 characters
              </div>
              @if (form.get('message')?.hasError('maxlength')) {
                <span class="error-message">Message cannot exceed 160 characters</span>
              }
            }
          </div>

          @if (errorMessage()) {
            <div class="error-alert">{{ errorMessage() }}</div>
          }

          @if (successMessage()) {
            <div class="success-alert">{{ successMessage() }}</div>
          }

          <div class="dialog-actions">
            <button type="button" class="btn btn-cancel" (click)="close()" [disabled]="sending()">
              Cancel
            </button>
            <button type="submit" class="btn btn-primary" [disabled]="form.invalid || sending()">
              {{ sending() ? 'Sending...' : 'Send' }}
            </button>
          </div>
        </form>
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
      z-index: 1000;
      padding: 1rem;
    }

    .dialog-content {
      background: white;
      border-radius: 8px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      max-width: 500px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      border-bottom: 1px solid #e5e7eb;
    }

    .dialog-header h2 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 600;
      color: #1f2937;
    }

    .close-button {
      background: none;
      border: none;
      font-size: 2rem;
      line-height: 1;
      color: #6b7280;
      cursor: pointer;
      padding: 0;
      width: 2rem;
      height: 2rem;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: all 0.2s;
    }

    .close-button:hover {
      background: #f3f4f6;
      color: #1f2937;
    }

    form {
      padding: 1.5rem;
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
      color: #374151;
      font-size: 0.875rem;
    }

    .toggle-group {
      display: flex;
      gap: 0.5rem;
    }

    .toggle-button {
      flex: 1;
      padding: 0.625rem 1rem;
      border: 2px solid #e5e7eb;
      background: white;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s;
      color: #6b7280;
    }

    .toggle-button:hover {
      border-color: #d1d5db;
    }

    .toggle-button.active {
      border-color: #667eea;
      background: #667eea;
      color: white;
    }

    .form-input,
    .form-textarea {
      width: 100%;
      padding: 0.625rem 0.875rem;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 0.875rem;
      transition: border-color 0.2s;
    }

    .form-input:focus,
    .form-textarea:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .form-textarea {
      resize: vertical;
      font-family: inherit;
    }

    .character-counter {
      margin-top: 0.5rem;
      font-size: 0.75rem;
      color: #6b7280;
      text-align: right;
    }

    .character-counter.limit-exceeded {
      color: #dc2626;
      font-weight: 600;
    }

    .error-message {
      display: block;
      margin-top: 0.5rem;
      font-size: 0.75rem;
      color: #dc2626;
    }

    .error-alert {
      padding: 0.75rem 1rem;
      background: #fee2e2;
      border: 1px solid #fca5a5;
      border-radius: 6px;
      color: #991b1b;
      margin-bottom: 1rem;
      font-size: 0.875rem;
    }

    .success-alert {
      padding: 0.75rem 1rem;
      background: #d1fae5;
      border: 1px solid #86efac;
      border-radius: 6px;
      color: #065f46;
      margin-bottom: 1rem;
      font-size: 0.875rem;
    }

    .dialog-actions {
      display: flex;
      gap: 0.75rem;
      justify-content: flex-end;
      margin-top: 1.5rem;
      padding-top: 1.5rem;
      border-top: 1px solid #e5e7eb;
    }

    .btn {
      padding: 0.625rem 1.25rem;
      border-radius: 6px;
      font-weight: 500;
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-cancel {
      background: white;
      color: #374151;
      border: 1px solid #d1d5db;
    }

    .btn-cancel:hover:not(:disabled) {
      background: #f9fafb;
    }

    .btn-primary {
      background: #667eea;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #5568d3;
    }
  `]
})
export class TestMessageDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);

  deliveryMethod = signal<'email' | 'text'>('email');
  sending = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  messageValue = signal('');

  form = this.fb.group({
    recipient: ['', [Validators.required, Validators.email]],
    message: ['', [Validators.required]]
  });

  characterCount = computed(() => {
    return this.messageValue().length;
  });

  recipientInputId = computed(() => {
    return this.deliveryMethod() === 'email' ? 'email-input' : 'phone-input';
  });

  constructor() {
    // Subscribe to message value changes to update signal
    this.form.get('message')?.valueChanges.subscribe(value => {
      this.messageValue.set(value || '');
    });
  }

  setDeliveryMethod(method: 'email' | 'text'): void {
    this.deliveryMethod.set(method);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    // Update validators based on delivery method
    const recipientControl = this.form.get('recipient');
    const messageControl = this.form.get('message');
    
    if (method === 'email') {
      recipientControl?.setValidators([Validators.required, Validators.email]);
      messageControl?.setValidators([Validators.required]);
    } else {
      recipientControl?.setValidators([
        Validators.required,
        Validators.pattern(/^\+?[1-9]\d{1,14}$/)
      ]);
      messageControl?.setValidators([Validators.required, Validators.maxLength(160)]);
    }
    recipientControl?.updateValueAndValidity();
    messageControl?.updateValueAndValidity();
  }

  async sendMessage(): Promise<void> {
    if (this.form.invalid || this.sending()) return;

    this.sending.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    try {
      const response = await firstValueFrom(
        this.http.post<{ success: boolean; message: string }>('/api/admin/test-message', {
          deliveryMethod: this.deliveryMethod(),
          recipient: this.form.get('recipient')?.value,
          message: this.form.get('message')?.value
        })
      );

      this.successMessage.set(response.message);
      this.form.reset();
      
      // Close dialog after 2 seconds
      setTimeout(() => this.close(), 2000);
    } catch (error: any) {
      console.error('Failed to send test message:', error);
      this.errorMessage.set(
        error.error?.message || 'Failed to send test message. Please try again.'
      );
    } finally {
      this.sending.set(false);
    }
  }

  close(): void {
    // Dispatch custom event to notify parent
    window.dispatchEvent(new CustomEvent('closeTestMessageDialog'));
  }
}
