import { Component, OnInit, signal, inject, output } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { AdminService } from './admin.service';
import { UserLoginRecord } from './login-history.types';

@Component({
  selector: 'app-login-history-dialog',
  imports: [CommonModule, DatePipe],
  templateUrl: './login-history-dialog.component.html',
  styleUrls: ['./login-history-dialog.component.scss']
})
export class LoginHistoryDialogComponent implements OnInit {
  private adminService = inject(AdminService);

  close = output<void>();

  logins = signal<UserLoginRecord[]>([]);
  loading = signal(false);
  errorMessage = signal<string | null>(null);

  ngOnInit() {
    this.loadLoginHistory();
  }

  loadLoginHistory() {
    this.loading.set(true);
    this.errorMessage.set(null);
    
    this.adminService.getLoginHistory(100).subscribe({
      next: (response) => {
        // Convert loginTime strings to Date objects
        const logins = response.logins.map(login => ({
          ...login,
          loginTime: new Date(login.loginTime)
        }));
        this.logins.set(logins);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading login history:', error);
        const message = error.error?.message || error.message || 'Failed to load login history';
        this.errorMessage.set(message);
        this.loading.set(false);
      }
    });
  }

  closeDialog() {
    this.close.emit();
  }

  getBrowserInfo(userAgent?: string): string {
    if (!userAgent) return 'Unknown';
    
    // Simple browser detection
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Edge')) return 'Edge';
    if (userAgent.includes('MSIE') || userAgent.includes('Trident')) return 'Internet Explorer';
    
    return 'Other';
  }
}
