import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

interface FieldOption {
  key: string;
  label: string;
  selected: boolean;
}

@Component({
  selector: 'app-export-users-dialog',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="dialog-overlay" (click)="close()">
      <div class="dialog-content" (click)="$event.stopPropagation()">
        <div class="dialog-header">
          <h2>Export Team Members to CSV</h2>
          <button class="close-button" (click)="close()" type="button">×</button>
        </div>

        <div class="dialog-body">
          <p class="description">Select the fields you want to include in the export:</p>

          <div class="field-selection">
            <div class="field-group">
              <button type="button" class="select-all-button" (click)="selectAll()">
                Select All
              </button>
              <button type="button" class="select-all-button" (click)="deselectAll()">
                Deselect All
              </button>
            </div>

            @for (field of fields(); track field.key) {
              <label class="field-option">
                <input
                  type="checkbox"
                  [(ngModel)]="field.selected"
                />
                <span>{{ field.label }}</span>
              </label>
            }

            <div class="divider"></div>

            <label class="field-option subteams-option">
              <input
                type="checkbox"
                [(ngModel)]="includeSubteams"
              />
              <span>Include Subteams (comma-separated list)</span>
            </label>
          </div>

          @if (errorMessage()) {
            <div class="error-alert">{{ errorMessage() }}</div>
          }

          @if (exporting()) {
            <div class="info-alert">Generating CSV file...</div>
          }
        </div>

        <div class="dialog-actions">
          <button type="button" class="btn btn-cancel" (click)="close()" [disabled]="exporting()">
            Cancel
          </button>
          <button 
            type="button" 
            class="btn btn-primary" 
            (click)="exportCSV()" 
            [disabled]="!hasSelectedFields() || exporting()"
          >
            {{ exporting() ? 'Exporting...' : 'Export CSV' }}
          </button>
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
      display: flex;
      flex-direction: column;
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      border-bottom: 1px solid #e5e7eb;
      flex-shrink: 0;
    }

    .dialog-header h2 {
      margin: 0;
      font-size: 1.25rem;
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

    .dialog-body {
      padding: 1.5rem;
      overflow-y: auto;
      flex: 1;
    }

    .description {
      margin: 0 0 1rem 0;
      color: #6b7280;
      font-size: 0.875rem;
    }

    .field-selection {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .field-group {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
    }

    .select-all-button {
      padding: 0.5rem 1rem;
      background: #f3f4f6;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.2s;
      color: #374151;
      font-weight: 500;
    }

    .select-all-button:hover {
      background: #e5e7eb;
    }

    .field-option {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
      user-select: none;
    }

    .field-option:hover {
      background: #f9fafb;
      border-color: #d1d5db;
    }

    .field-option input[type="checkbox"] {
      width: 1.125rem;
      height: 1.125rem;
      cursor: pointer;
      flex-shrink: 0;
    }

    .field-option span {
      color: #374151;
      font-size: 0.875rem;
    }

    .subteams-option {
      background: #f0f9ff;
      border-color: #bae6fd;
    }

    .subteams-option:hover {
      background: #e0f2fe;
    }

    .divider {
      height: 1px;
      background: #e5e7eb;
      margin: 0.5rem 0;
    }

    .error-alert {
      padding: 0.75rem 1rem;
      background: #fee2e2;
      border: 1px solid #fca5a5;
      border-radius: 6px;
      color: #991b1b;
      margin-top: 1rem;
      font-size: 0.875rem;
    }

    .info-alert {
      padding: 0.75rem 1rem;
      background: #dbeafe;
      border: 1px solid #93c5fd;
      border-radius: 6px;
      color: #1e40af;
      margin-top: 1rem;
      font-size: 0.875rem;
    }

    .dialog-actions {
      display: flex;
      gap: 0.75rem;
      justify-content: flex-end;
      padding: 1.5rem;
      border-top: 1px solid #e5e7eb;
      flex-shrink: 0;
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
export class ExportUsersDialogComponent {
  private readonly http = inject(HttpClient);

  teamId = signal<string>('');
  exporting = signal(false);
  errorMessage = signal<string | null>(null);
  includeSubteams = signal(false);

  fields = signal<FieldOption[]>([
    { key: 'firstName', label: 'First Name', selected: true },
    { key: 'lastName', label: 'Last Name', selected: true },
    { key: 'fullName', label: 'Full Name', selected: false },
    { key: 'middleName', label: 'Middle Name', selected: false },
    { key: 'primaryEmail', label: 'Primary Email', selected: true },
    { key: 'primaryPhone', label: 'Primary Phone', selected: false },
    { key: 'roles', label: 'Team Roles', selected: true },
    { key: 'state', label: 'Account State', selected: false },
    { key: 'createdAt', label: 'Member Since', selected: false },
  ]);

  constructor() {
    // Listen for team ID being set
    window.addEventListener('setExportTeamId', ((event: CustomEvent) => {
      if (event.detail?.teamId) {
        this.setTeamId(event.detail.teamId);
      }
    }) as EventListener);
  }

  hasSelectedFields = computed(() => {
    return this.fields().some(f => f.selected);
  });

  setTeamId(teamId: string): void {
    this.teamId.set(teamId);
  }

  selectAll(): void {
    this.fields.update(fields => 
      fields.map(f => ({ ...f, selected: true }))
    );
  }

  deselectAll(): void {
    this.fields.update(fields => 
      fields.map(f => ({ ...f, selected: false }))
    );
  }

  async exportCSV(): Promise<void> {
    if (!this.hasSelectedFields() || this.exporting()) return;

    this.exporting.set(true);
    this.errorMessage.set(null);

    try {
      const selectedFields = this.fields()
        .filter(f => f.selected)
        .map(f => f.key);

      const response = await firstValueFrom(
        this.http.post(`/api/teams/${this.teamId()}/export/users`, {
          fields: selectedFields,
          includeSubteams: this.includeSubteams()
        }, {
          responseType: 'blob',
          observe: 'response'
        })
      );

      // Extract filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'team_export.csv';
      if (contentDisposition) {
        const matches = /filename="([^"]+)"/.exec(contentDisposition);
        if (matches && matches[1]) {
          filename = matches[1];
        }
      }

      // Create download link
      const blob = response.body;
      if (blob) {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        // Close dialog after successful export
        setTimeout(() => this.close(), 500);
      }
    } catch (error: any) {
      console.error('Failed to export users:', error);
      this.errorMessage.set(
        error.error?.message || 'Failed to export users. Please try again.'
      );
    } finally {
      this.exporting.set(false);
    }
  }

  close(): void {
    window.dispatchEvent(new CustomEvent('closeExportUsersDialog'));
  }
}
