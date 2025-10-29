import { Component, signal, input, output, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserGroupsService, UserGroup } from './user-groups.service';
import { VisibilitySelectorComponent } from './visibility-selector.component';
import { VisibilityRuleSet } from './visibility-selector.types';
import { TeamMember } from './teams.service';

interface Subteam {
  id: string;
  name: string;
}

@Component({
  selector: 'app-user-groups-manager',
  imports: [CommonModule, FormsModule, VisibilitySelectorComponent],
  templateUrl: './user-groups-manager.component.html',
  styleUrl: './user-groups-manager.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserGroupsManagerComponent implements OnInit {
  private readonly userGroupsService = inject(UserGroupsService);

  // Inputs
  readonly teamId = input.required<string>();
  readonly teamRoles = input.required<string[]>();
  readonly teamMembers = input.required<TeamMember[]>();
  readonly subteams = input.required<Subteam[]>();
  readonly canCreatePublic = input.required<boolean>();

  // Outputs
  readonly close = output<void>();

  // State
  protected readonly userGroups = signal<UserGroup[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly error = signal<string | null>(null);

  // Editor state
  protected readonly showEditor = signal(false);
  protected readonly editingGroup = signal<UserGroup | null>(null);
  protected readonly groupName = signal('');
  protected readonly groupIsPublic = signal(false);
  protected readonly groupRuleSet = signal<VisibilityRuleSet | null>(null);
  protected readonly isSaving = signal(false);
  protected readonly editorError = signal<string | null>(null);

  // Visibility selector state
  protected readonly showVisibilitySelector = signal(false);

  async ngOnInit() {
    await this.loadUserGroups();
  }

  protected async loadUserGroups(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const groups = await this.userGroupsService.getUserGroups(this.teamId());
      this.userGroups.set(groups);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load user groups';
      this.error.set(message);
    } finally {
      this.isLoading.set(false);
    }
  }

  protected openCreateDialog(): void {
    this.editingGroup.set(null);
    this.groupName.set('');
    this.groupIsPublic.set(false);
    this.groupRuleSet.set(null);
    this.editorError.set(null);
    this.showEditor.set(true);
  }

  protected openEditDialog(group: UserGroup): void {
    this.editingGroup.set(group);
    this.groupName.set(group.name);
    this.groupIsPublic.set(group.isPublic);

    // Convert stored format to VisibilityRuleSet
    const ruleSet: VisibilityRuleSet = {
      rows: group.visibilityRules?.ruleSet?.rows || []
    };
    this.groupRuleSet.set(ruleSet);
    this.editorError.set(null);
    this.showEditor.set(true);
  }

  protected closeEditor(): void {
    this.showEditor.set(false);
    this.editingGroup.set(null);
    this.groupName.set('');
    this.groupIsPublic.set(false);
    this.groupRuleSet.set(null);
    this.editorError.set(null);
  }

  protected openVisibilitySelector(): void {
    this.showVisibilitySelector.set(true);
  }

  protected handleVisibilityChanged(ruleSet: VisibilityRuleSet): void {
    this.groupRuleSet.set(ruleSet);
    this.showVisibilitySelector.set(false);
  }

  protected closeVisibilitySelector(): void {
    this.showVisibilitySelector.set(false);
  }

  protected async saveGroup(): Promise<void> {
    const name = this.groupName().trim();
    if (!name) {
      this.editorError.set('Group name is required');
      return;
    }

    const ruleSet = this.groupRuleSet();
    if (!ruleSet || ruleSet.rows.length === 0) {
      this.editorError.set('Please configure visibility rules');
      return;
    }

    this.isSaving.set(true);
    this.editorError.set(null);

    try {
      const existingGroup = this.editingGroup();

      if (existingGroup) {
        // Update existing group
        await this.userGroupsService.updateUserGroup(
          this.teamId(),
          existingGroup.id,
          {
            name,
            isPublic: this.groupIsPublic(),
            visibilityRules: { ruleSet }
          }
        );
      } else {
        // Create new group
        await this.userGroupsService.createUserGroup(this.teamId(), {
          name,
          isPublic: this.groupIsPublic(),
          visibilityRules: { ruleSet }
        });
      }

      await this.loadUserGroups();
      this.closeEditor();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save user group';
      this.editorError.set(message);
    } finally {
      this.isSaving.set(false);
    }
  }

  protected async deleteGroup(group: UserGroup): Promise<void> {
    if (!confirm(`Are you sure you want to delete the user group "${group.name}"?`)) {
      return;
    }

    try {
      await this.userGroupsService.deleteUserGroup(this.teamId(), group.id);
      await this.loadUserGroups();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete user group';
      this.error.set(message);
    }
  }

  protected canEditGroup(group: UserGroup): boolean {
    // Can edit if it's a public group and user has permission, or if it's the user's own private group
    if (group.isPublic) {
      return this.canCreatePublic();
    }
    // For private groups, we'd need to check if current user is the creator
    // This would require passing current user ID as an input
    return true;
  }

  protected getVisibilitySummary(group: UserGroup): string {
    const rules = group.visibilityRules?.ruleSet;
    if (!rules || rules.rows.length === 0) {
      return 'No rules configured';
    }

    const totalCriteria = rules.rows.reduce((sum: number, row: any) => sum + row.criteria.length, 0);
    return `${rules.rows.length} rule${rules.rows.length > 1 ? 's' : ''}, ${totalCriteria} criteria`;
  }

  protected onClose(): void {
    this.close.emit();
  }
}
