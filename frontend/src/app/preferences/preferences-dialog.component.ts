import { Component, OnInit, signal, inject, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PreferencesService } from './preferences.service';
import { EventNotification, TIME_OPTIONS, formatTimeBefore } from './preferences.types';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-preferences-dialog',
  imports: [CommonModule, FormsModule],
  templateUrl: './preferences-dialog.component.html',
  styleUrls: ['./preferences-dialog.component.scss']
})
export class PreferencesDialogComponent implements OnInit {
  private preferencesService = inject(PreferencesService);
  private authService = inject(AuthService);

  close = output<void>();

  eventNotifications = signal<EventNotification[]>([]);
  idleTimeout = signal<number>(30); // Default 30 minutes
  activeTab = signal<'user' | 'site'>('user');
  loading = signal(false);
  errorMessage = signal<string | null>(null);

  timeOptions = TIME_OPTIONS;

  // Check if user is an administrator
  isAdmin = computed(() => this.authService.currentUser()?.state === 'admin');

  ngOnInit() {
    this.loadPreferences();
  }

  setActiveTab(tab: 'user' | 'site') {
    this.activeTab.set(tab);
  }

  loadPreferences() {
    this.loading.set(true);
    this.errorMessage.set(null);
    
    this.preferencesService.getPreferences().subscribe({
      next: (preferences) => {
        this.eventNotifications.set(preferences.eventNotifications || []);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading preferences:', error);
        const message = error.error?.message || error.message || 'Failed to load preferences';
        this.errorMessage.set(message);
        this.loading.set(false);
      }
    });
  }

  addNotification() {
    const notifications = [...this.eventNotifications()];
    notifications.push({ timeBefore: 1440, method: 'email' }); // Default to 1 day, email
    this.eventNotifications.set(notifications);
  }

  removeNotification(index: number) {
    const notifications = [...this.eventNotifications()];
    notifications.splice(index, 1);
    this.eventNotifications.set(notifications);
  }

  updateNotificationTime(index: number, value: string) {
    const notifications = [...this.eventNotifications()];
    notifications[index].timeBefore = parseInt(value, 10);
    this.eventNotifications.set(notifications);
  }

  updateNotificationMethod(index: number, method: 'email' | 'text') {
    const notifications = [...this.eventNotifications()];
    notifications[index].method = method;
    this.eventNotifications.set(notifications);
  }

  savePreferences() {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.preferencesService.updatePreferences({
      eventNotifications: this.eventNotifications()
    }).subscribe({
      next: () => {
        this.loading.set(false);
        this.closeDialog();
      },
      error: (error) => {
        console.error('Error saving preferences:', error);
        const message = error.error?.message || error.message || 'Failed to save preferences';
        this.errorMessage.set(message);
        this.loading.set(false);
      }
    });
  }

  closeDialog() {
    this.close.emit();
  }

  formatTime(minutes: number): string {
    return formatTimeBefore(minutes);
  }
}
