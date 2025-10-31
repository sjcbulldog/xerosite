import { Component, OnInit, OnDestroy, inject, signal, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TeamLinksService } from './team-links.service';
import { CreateTeamLinkDto, UpdateTeamLinkDto, TeamLink } from './team-links.types';

@Component({
  selector: 'app-team-links',
  imports: [CommonModule, FormsModule],
  templateUrl: './team-links.component.html',
  styleUrl: './team-links.component.scss',
})
export class TeamLinksComponent implements OnInit, OnDestroy {
  readonly teamId = input.required<string>();
  readonly isAdmin = input.required<boolean>();

  readonly teamLinksService = inject(TeamLinksService);

  readonly showSection = signal(false);
  readonly showAddDialog = signal(false);
  readonly editingLink = signal<TeamLink | null>(null);

  readonly newLinkTitle = signal('');
  readonly newLinkUrl = signal('');
  readonly editLinkTitle = signal('');
  readonly editLinkUrl = signal('');

  ngOnInit(): void {
    this.loadLinks();
  }

  ngOnDestroy(): void {
    this.teamLinksService.clearLinks();
  }

  async loadLinks(): Promise<void> {
    try {
      await this.teamLinksService.loadLinksForTeam(this.teamId());
    } catch (error) {
      console.error('Failed to load team links:', error);
    }
  }

  toggleSection(): void {
    this.showSection.set(!this.showSection());
  }

  openAddDialog(): void {
    this.newLinkTitle.set('');
    this.newLinkUrl.set('');
    this.showAddDialog.set(true);
  }

  closeAddDialog(): void {
    this.showAddDialog.set(false);
  }

  async addLink(): Promise<void> {
    const title = this.newLinkTitle().trim();
    const url = this.newLinkUrl().trim();

    if (!title || !url) {
      alert('Please provide both title and URL');
      return;
    }

    try {
      const dto: CreateTeamLinkDto = { title, url };
      await this.teamLinksService.createLink(this.teamId(), dto);
      this.closeAddDialog();
    } catch (error) {
      console.error('Failed to create link:', error);
      alert('Failed to create link. Please try again.');
    }
  }

  startEdit(link: TeamLink): void {
    this.editingLink.set(link);
    this.editLinkTitle.set(link.title);
    this.editLinkUrl.set(link.url);
  }

  cancelEdit(): void {
    this.editingLink.set(null);
  }

  async saveEdit(): Promise<void> {
    const link = this.editingLink();
    if (!link) return;

    const title = this.editLinkTitle().trim();
    const url = this.editLinkUrl().trim();

    if (!title || !url) {
      alert('Please provide both title and URL');
      return;
    }

    try {
      const dto: UpdateTeamLinkDto = { title, url };
      await this.teamLinksService.updateLink(this.teamId(), link.id, dto);
      this.cancelEdit();
    } catch (error) {
      console.error('Failed to update link:', error);
      alert('Failed to update link. Please try again.');
    }
  }

  async deleteLink(link: TeamLink): Promise<void> {
    if (!confirm(`Are you sure you want to delete "${link.title}"?`)) {
      return;
    }

    try {
      await this.teamLinksService.deleteLink(this.teamId(), link.id);
    } catch (error) {
      console.error('Failed to delete link:', error);
      alert('Failed to delete link. Please try again.');
    }
  }
}
