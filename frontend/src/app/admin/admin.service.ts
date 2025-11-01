import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LoginHistoryResponse } from './login-history.types';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000';

  getLoginHistory(limit: number = 100): Observable<LoginHistoryResponse> {
    return this.http.get<LoginHistoryResponse>(`${this.apiUrl}/admin/login-history?limit=${limit}`);
  }
}
