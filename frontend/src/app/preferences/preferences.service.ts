import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserPreferences, UpdatePreferencesRequest } from './preferences.types';

@Injectable({
  providedIn: 'root'
})
export class PreferencesService {
  private http = inject(HttpClient);
  private apiUrl = '/api/preferences';

  getPreferences(): Observable<UserPreferences> {
    return this.http.get<UserPreferences>(this.apiUrl);
  }

  updatePreferences(preferences: UpdatePreferencesRequest): Observable<UserPreferences> {
    return this.http.put<UserPreferences>(this.apiUrl, preferences);
  }
}
