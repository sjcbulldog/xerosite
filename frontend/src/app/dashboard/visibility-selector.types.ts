// Visibility Criteria Types

export enum CriteriaType {
  ALL_USERS = 'all_users',
  SELECT_USERS = 'select_users',
  SUBTEAM_LEADS = 'subteam_leads',
  SUBTEAM_MEMBERS = 'subteam_members',
  ROLES = 'roles',
}

export interface VisibilityCriterion {
  type: CriteriaType;
  userIds?: string[];        // For SELECT_USERS
  subteamIds?: string[];     // For SUBTEAM_LEADS or SUBTEAM_MEMBERS
  roles?: string[];          // For ROLES
}

// A row can have multiple criteria (AND logic within row)
export interface VisibilityRow {
  id: string;
  criteria: VisibilityCriterion[];
}

// Multiple rows are OR'ed together
export interface VisibilityRuleSet {
  rows: VisibilityRow[];
}
