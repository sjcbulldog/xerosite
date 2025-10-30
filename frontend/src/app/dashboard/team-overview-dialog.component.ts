import {
  Component,
  inject,
  signal,
  computed,
  input,
  output,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TeamsService, TeamMember } from './teams.service';
import { Subteam } from './subteam.types';

interface SubteamWithDetails {
  id: string;
  name: string;
  description?: string;
  members: TeamMember[];
  leadPositions: Array<{
    title: string;
    userId: string | null;
    userName: string | null;
  }>;
}

@Component({
  selector: 'app-team-overview-dialog',
  imports: [CommonModule],
  template: `
    <div class="dialog-overlay" (click)="close.emit()">
      <div class="dialog-content" (click)="$event.stopPropagation()">
        <div class="dialog-header">
          <h2>Team Overview</h2>
          <button class="close-button" (click)="close.emit()">×</button>
        </div>

        <div class="dialog-body">
          @if (isLoading()) {
            <div class="loading-state">
              <p>Loading team overview...</p>
            </div>
          } @else {
            <!-- Team Info Section -->
            <div class="team-info-section">
              <h3>{{ team().name }}</h3>
              <div class="team-details">
                <div class="detail-item">
                  <span class="label">Team Number:</span>
                  <span class="value">{{ team().teamNumber }}</span>
                </div>
                @if (team().description) {
                  <div class="detail-item">
                    <span class="label">Description:</span>
                    <span class="value">{{ team().description }}</span>
                  </div>
                }
                <div class="detail-item">
                  <span class="label">Visibility:</span>
                  <span class="value visibility-badge" [class]="team().visibility">
                    {{ team().visibility | titlecase }}
                  </span>
                </div>
                <div class="detail-item">
                  <span class="label">Total Members:</span>
                  <span class="value">{{ members().length }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Available Roles:</span>
                  <span class="value">{{ team().roles.join(', ') }}</span>
                </div>
              </div>
            </div>

            <!-- Subteams Section -->
            <div class="subteams-section">
              <h3>Subteams</h3>
              @if (subteamsWithMembers().length === 0) {
                <p class="empty-message">No subteams created yet.</p>
              } @else {
                <div class="subteams-list">
                  @for (subteam of subteamsWithMembers(); track subteam.id) {
                    <div class="subteam-card">
                      <div class="subteam-header">
                        <h4>{{ subteam.name }}</h4>
                        <span class="member-count">
                          {{ subteam.members.length }} member{{ subteam.members.length !== 1 ? 's' : '' }}
                        </span>
                      </div>

                      @if (subteam.description) {
                        <p class="subteam-description">{{ subteam.description }}</p>
                      }

                      <!-- Lead Positions -->
                      @if (subteam.leadPositions.length > 0) {
                        <div class="lead-positions">
                          <h5>Lead Positions</h5>
                          <div class="positions-list">
                            @for (position of subteam.leadPositions; track position.title) {
                              <div class="position-item">
                                <span class="position-title">{{ position.title }}:</span>
                                <span class="position-holder">
                                  @if (position.userName) {
                                    {{ position.userName }}
                                  } @else {
                                    <em class="vacant">Vacant</em>
                                  }
                                </span>
                              </div>
                            }
                          </div>
                        </div>
                      }

                      <!-- Members -->
                      @if (subteam.members.length > 0) {
                        <div class="subteam-members">
                          <h5>Members</h5>
                          <div class="members-grid">
                            @for (member of subteam.members; track member.userId) {
                              <div class="member-chip">
                                <span class="member-name">
                                  {{ member.user?.fullName || member.user?.firstName + ' ' + member.user?.lastName }}
                                </span>
                                @if (member.roles.length > 0) {
                                  <span class="member-role">
                                    ({{ member.roles.join(', ') }})
                                  </span>
                                }
                              </div>
                            }
                          </div>
                        </div>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          }
        </div>

        <div class="dialog-footer">
          <button class="secondary-button" (click)="close.emit()">Close</button>
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
    }

    .dialog-content {
      background: white;
      border-radius: 8px;
      width: 90%;
      max-width: 900px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      border-bottom: 1px solid #eee;
    }

    .dialog-header h2 {
      margin: 0;
      font-size: 1.5rem;
      color: #333;
    }

    .close-button {
      background: none;
      border: none;
      font-size: 2rem;
      color: #999;
      cursor: pointer;
      padding: 0;
      line-height: 1;
      transition: color 0.2s;
    }

    .close-button:hover {
      color: #333;
    }

    .dialog-body {
      flex: 1;
      overflow-y: auto;
      padding: 1.5rem;
    }

    .loading-state {
      text-align: center;
      padding: 2rem;
      color: #666;
    }

    .team-info-section {
      margin-bottom: 2rem;
      padding-bottom: 1.5rem;
      border-bottom: 2px solid #eee;
    }

    .team-info-section h3 {
      margin: 0 0 1rem 0;
      font-size: 1.5rem;
      color: #0066cc;
    }

    .team-details {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .detail-item {
      display: flex;
      gap: 0.75rem;
    }

    .detail-item .label {
      font-weight: 600;
      color: #555;
      min-width: 150px;
    }

    .detail-item .value {
      color: #333;
    }

    .visibility-badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 4px;
      font-size: 0.875rem;
      font-weight: 500;
    }

    .visibility-badge.public {
      background: #e3f2fd;
      color: #1976d2;
    }

    .visibility-badge.private {
      background: #fff3e0;
      color: #f57c00;
    }

    .subteams-section h3 {
      margin: 0 0 1rem 0;
      font-size: 1.25rem;
      color: #333;
    }

    .empty-message {
      text-align: center;
      color: #666;
      font-style: italic;
      padding: 2rem;
    }

    .subteams-list {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .subteam-card {
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 1.25rem;
      background: #fafafa;
    }

    .subteam-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
    }

    .subteam-header h4 {
      margin: 0;
      font-size: 1.125rem;
      color: #333;
    }

    .member-count {
      background: #e3f2fd;
      color: #1976d2;
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.875rem;
      font-weight: 500;
    }

    .subteam-description {
      margin: 0 0 1rem 0;
      color: #666;
      font-size: 0.875rem;
    }

    .lead-positions,
    .subteam-members {
      margin-top: 1rem;
    }

    .lead-positions h5,
    .subteam-members h5 {
      margin: 0 0 0.75rem 0;
      font-size: 0.875rem;
      font-weight: 600;
      color: #555;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .positions-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .position-item {
      display: flex;
      gap: 0.5rem;
      padding: 0.5rem;
      background: white;
      border-radius: 4px;
    }

    .position-title {
      font-weight: 600;
      color: #555;
      min-width: 150px;
    }

    .position-holder {
      color: #333;
    }

    .vacant {
      color: #999;
    }

    .members-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .member-chip {
      background: white;
      border: 1px solid #ddd;
      border-radius: 16px;
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .member-name {
      font-weight: 500;
      color: #333;
    }

    .member-role {
      color: #666;
      font-size: 0.75rem;
    }

    .dialog-footer {
      padding: 1rem 1.5rem;
      border-top: 1px solid #eee;
      display: flex;
      justify-content: flex-end;
    }

    .secondary-button {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 1rem;
      font-weight: 500;
      background: #6c757d;
      color: white;
      transition: background 0.2s;
    }

    .secondary-button:hover {
      background: #5a6268;
    }
  `],
})
export class TeamOverviewDialogComponent implements OnInit {
  readonly team = input.required<any>();
  readonly members = input.required<TeamMember[]>();
  readonly subteams = input.required<Subteam[]>();
  readonly close = output<void>();

  private readonly teamsService = inject(TeamsService);

  readonly isLoading = signal(false);
  readonly subteamsWithMembers = signal<SubteamWithDetails[]>([]);

  async ngOnInit(): Promise<void> {
    await this.loadSubteamDetails();
  }

  private async loadSubteamDetails(): Promise<void> {
    this.isLoading.set(true);

    try {
      const subteamsData: SubteamWithDetails[] = [];

      for (const subteam of this.subteams()) {
        // Get members for this subteam
        const subteamMembers = this.members().filter((m) =>
          m.subteams?.includes(subteam.name)
        );

        // Get lead positions for this subteam
        const leadPositions = subteam.leadPositions?.map((pos) => {
          const leader = this.members().find((m) =>
            m.leadPositions?.some(
              (lp) =>
                lp.subteamName === subteam.name && lp.positionTitle === pos.title
            )
          );

          return {
            title: pos.title,
            userId: leader?.userId || null,
            userName: leader?.user?.fullName || null,
          };
        }) || [];

        subteamsData.push({
          id: subteam.id,
          name: subteam.name,
          description: subteam.description || undefined,
          members: subteamMembers,
          leadPositions,
        });
      }

      this.subteamsWithMembers.set(subteamsData);
    } catch (error) {
      console.error('Failed to load subteam details:', error);
    } finally {
      this.isLoading.set(false);
    }
  }
}
