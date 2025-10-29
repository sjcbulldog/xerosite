import { Component, signal, output, input, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CriteriaType, VisibilityCriterion, VisibilityRow, VisibilityRuleSet } from './visibility-selector.types';
import { TeamMember } from './teams.service';

interface Subteam {
  id: string;
  name: string;
}

@Component({
  selector: 'app-visibility-selector',
  imports: [CommonModule, FormsModule],
  templateUrl: './visibility-selector.component.html',
  styleUrl: './visibility-selector.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VisibilitySelectorComponent implements OnInit {
  // Inputs
  readonly teamMembers = input.required<TeamMember[]>();
  readonly teamRoles = input.required<string[]>();
  readonly subteams = input.required<Subteam[]>();
  readonly initialRuleSet = input<VisibilityRuleSet | null>(null);
  
  // Outputs
  readonly ruleSetChanged = output<VisibilityRuleSet>();
  readonly cancel = output<void>();
  
  // State
  protected readonly rows = signal<VisibilityRow[]>([]);
  protected readonly CriteriaType = CriteriaType;
  
  // Dialog states for selecting items
  protected readonly showUserSelector = signal(false);
  protected readonly showRoleSelector = signal(false);
  protected readonly showSubteamSelector = signal(false);
  protected readonly currentRowId = signal<string>('');
  protected readonly currentCriterionIndex = signal<number>(0);
  
  // Temporary selections
  protected readonly tempSelectedUsers = signal<string[]>([]);
  protected readonly tempSelectedRoles = signal<string[]>([]);
  protected readonly tempSelectedSubteams = signal<string[]>([]);
  
  ngOnInit() {
    const initial = this.initialRuleSet();
    if (initial && initial.rows.length > 0) {
      this.rows.set([...initial.rows]);
    } else {
      // Start with one empty row
      this.addRow();
    }
  }
  
  protected addRow() {
    const newRow: VisibilityRow = {
      id: crypto.randomUUID(),
      criteria: []
    };
    this.rows.update(rows => [...rows, newRow]);
  }
  
  protected removeRow(rowId: string) {
    this.rows.update(rows => rows.filter(r => r.id !== rowId));
  }
  
  protected addCriterion(rowId: string, type: CriteriaType) {
    this.rows.update(rows => rows.map(row => {
      if (row.id === rowId) {
        const newCriterion: VisibilityCriterion = { type };
        return { ...row, criteria: [...row.criteria, newCriterion] };
      }
      return row;
    }));
  }
  
  protected removeCriterion(rowId: string, criterionIndex: number) {
    this.rows.update(rows => rows.map(row => {
      if (row.id === rowId) {
        const newCriteria = row.criteria.filter((_, i) => i !== criterionIndex);
        return { ...row, criteria: newCriteria };
      }
      return row;
    }));
  }
  
  protected openUserSelector(rowId: string, criterionIndex: number) {
    this.currentRowId.set(rowId);
    this.currentCriterionIndex.set(criterionIndex);
    
    const row = this.rows().find(r => r.id === rowId);
    const criterion = row?.criteria[criterionIndex];
    this.tempSelectedUsers.set(criterion?.userIds || []);
    
    this.showUserSelector.set(true);
  }
  
  protected openRoleSelector(rowId: string, criterionIndex: number) {
    this.currentRowId.set(rowId);
    this.currentCriterionIndex.set(criterionIndex);
    
    const row = this.rows().find(r => r.id === rowId);
    const criterion = row?.criteria[criterionIndex];
    this.tempSelectedRoles.set(criterion?.roles || []);
    
    this.showRoleSelector.set(true);
  }
  
  protected openSubteamSelector(rowId: string, criterionIndex: number) {
    this.currentRowId.set(rowId);
    this.currentCriterionIndex.set(criterionIndex);
    
    const row = this.rows().find(r => r.id === rowId);
    const criterion = row?.criteria[criterionIndex];
    this.tempSelectedSubteams.set(criterion?.subteamIds || []);
    
    this.showSubteamSelector.set(true);
  }
  
  protected toggleUser(userId: string) {
    this.tempSelectedUsers.update(users => {
      if (users.includes(userId)) {
        return users.filter(id => id !== userId);
      } else {
        return [...users, userId];
      }
    });
  }
  
  protected toggleRole(role: string) {
    this.tempSelectedRoles.update(roles => {
      if (roles.includes(role)) {
        return roles.filter(r => r !== role);
      } else {
        return [...roles, role];
      }
    });
  }
  
  protected toggleSubteam(subteamId: string) {
    this.tempSelectedSubteams.update(subteams => {
      if (subteams.includes(subteamId)) {
        return subteams.filter(id => id !== subteamId);
      } else {
        return [...subteams, subteamId];
      }
    });
  }
  
  protected saveUserSelection() {
    const rowId = this.currentRowId();
    const criterionIndex = this.currentCriterionIndex();
    
    this.rows.update(rows => rows.map(row => {
      if (row.id === rowId) {
        const newCriteria = [...row.criteria];
        newCriteria[criterionIndex] = {
          ...newCriteria[criterionIndex],
          userIds: [...this.tempSelectedUsers()]
        };
        return { ...row, criteria: newCriteria };
      }
      return row;
    }));
    
    this.showUserSelector.set(false);
  }
  
  protected saveRoleSelection() {
    const rowId = this.currentRowId();
    const criterionIndex = this.currentCriterionIndex();
    
    this.rows.update(rows => rows.map(row => {
      if (row.id === rowId) {
        const newCriteria = [...row.criteria];
        newCriteria[criterionIndex] = {
          ...newCriteria[criterionIndex],
          roles: [...this.tempSelectedRoles()]
        };
        return { ...row, criteria: newCriteria };
      }
      return row;
    }));
    
    this.showRoleSelector.set(false);
  }
  
  protected saveSubteamSelection() {
    const rowId = this.currentRowId();
    const criterionIndex = this.currentCriterionIndex();
    
    this.rows.update(rows => rows.map(row => {
      if (row.id === rowId) {
        const newCriteria = [...row.criteria];
        newCriteria[criterionIndex] = {
          ...newCriteria[criterionIndex],
          subteamIds: [...this.tempSelectedSubteams()]
        };
        return { ...row, criteria: newCriteria };
      }
      return row;
    }));
    
    this.showSubteamSelector.set(false);
  }
  
  protected cancelSelection() {
    this.showUserSelector.set(false);
    this.showRoleSelector.set(false);
    this.showSubteamSelector.set(false);
  }
  
  protected getCriterionLabel(criterion: VisibilityCriterion): string {
    switch (criterion.type) {
      case CriteriaType.ALL_USERS:
        return 'All Users';
      case CriteriaType.SELECT_USERS:
        const userCount = criterion.userIds?.length || 0;
        return `Selected Users (${userCount})`;
      case CriteriaType.SUBTEAM_LEADS:
        const leadCount = criterion.subteamIds?.length || 0;
        return leadCount > 0 ? `Subteam Leads (${leadCount} subteams)` : 'Subteam Leads';
      case CriteriaType.SUBTEAM_MEMBERS:
        const memberCount = criterion.subteamIds?.length || 0;
        return memberCount > 0 ? `Subteam Members (${memberCount} subteams)` : 'Subteam Members';
      case CriteriaType.ROLES:
        const roleCount = criterion.roles?.length || 0;
        return `Roles (${roleCount})`;
      default:
        return 'Unknown';
    }
  }
  
  protected getUserName(userId: string): string {
    const member = this.teamMembers().find(m => m.userId === userId);
    return member?.user ? `${member.user.firstName} ${member.user.lastName}` : 'Unknown User';
  }
  
  protected getSubteamName(subteamId: string): string {
    const subteam = this.subteams().find(s => s.id === subteamId);
    return subteam?.name || 'Unknown Subteam';
  }
  
  protected onSave() {
    const ruleSet: VisibilityRuleSet = {
      rows: this.rows()
    };
    this.ruleSetChanged.emit(ruleSet);
  }
  
  protected onCancel() {
    this.cancel.emit();
  }
}
