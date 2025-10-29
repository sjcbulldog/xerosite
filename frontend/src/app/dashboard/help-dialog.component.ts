import { Component, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-help-dialog',
  imports: [CommonModule],
  template: `
    <div class="dialog-overlay" (click)="close.emit()">
      <div class="dialog-content help-dialog" (click)="$event.stopPropagation()">
        <div class="dialog-header">
          <h2>User Guide</h2>
          <button class="close-button" (click)="close.emit()">×</button>
        </div>
        <div class="dialog-body">
          <div class="help-content">
            <div class="header">
              <h1>XeroSite User Guide</h1>
              <p>Complete guide to using the XeroSite team management platform</p>
            </div>

            <div class="toc">
              <h2>Table of Contents</h2>
              <ul>
                <li><a href="#getting-started">1. Getting Started</a></li>
                <li><a href="#authentication">2. Authentication & Account Management</a></li>
                <li><a href="#dashboard">3. Dashboard Overview</a></li>
                <li><a href="#teams">4. Team Management</a></li>
                <li><a href="#calendar">5. Calendar & Events</a></li>
                <li><a href="#profile">6. Profile Management</a></li>
                <li><a href="#preferences">7. User Preferences</a></li>
                <li><a href="#admin">8. Administrator Features</a></li>
                <li><a href="#troubleshooting">9. Troubleshooting</a></li>
              </ul>
            </div>

            <section id="getting-started" class="section">
              <h2>1. Getting Started</h2>
              <p>Welcome to XeroSite, a comprehensive team management platform designed to help organizations manage teams, events, and member communications efficiently.</p>
              
              <h3>What is XeroSite?</h3>
              <p>XeroSite is a web-based platform that provides:</p>
              <ul>
                <li>Team creation and management</li>
                <li>Member role and permission management</li>
                <li>Event scheduling and calendar management</li>
                <li>User profile and preference management</li>
                <li>Communication and notification systems</li>
                <li>Administrative tools for user management</li>
              </ul>

              <h3>User Roles</h3>
              <div class="feature-card">
                <h4><span class="badge admin">Site Administrator</span></h4>
                <p>Full access to all features including user management, system settings, and global team oversight.</p>
              </div>
              <div class="feature-card">
                <h4><span class="badge">Team Administrator</span></h4>
                <p>Manages specific teams, including member management, event scheduling, and team settings.</p>
              </div>
              <div class="feature-card">
                <h4><span class="badge user">Team Member</span></h4>
                <p>Participates in teams, views events, manages personal profile and preferences.</p>
              </div>
            </section>

            <section id="authentication" class="section">
              <h2>2. Authentication & Account Management</h2>
              
              <h3>Creating an Account</h3>
              <ol class="step-list">
                <li>Navigate to the registration page</li>
                <li>Fill in your personal information:
                  <ul>
                    <li>First Name and Last Name</li>
                    <li>Email address (will be your username)</li>
                    <li>Strong password meeting security requirements</li>
                  </ul>
                </li>
                <li>Submit the registration form</li>
                <li>Check your email for verification if required</li>
                <li>Complete email verification to activate your account</li>
              </ol>

              <div class="note">
                <strong>Note:</strong> Password must contain at least 8 characters, including uppercase, lowercase, numbers, and special characters.
              </div>

              <h3>Logging In</h3>
              <ol class="step-list">
                <li>Enter your email address</li>
                <li>Enter your password</li>
                <li>Click "Sign In" to access your dashboard</li>
              </ol>

              <h3>Password Management</h3>
              <h4>Changing Your Password</h4>
              <ol class="step-list">
                <li>From the dashboard, click the menu button (☰) in the top right</li>
                <li>Select "Change Password"</li>
                <li>Enter your current password</li>
                <li>Enter and confirm your new password</li>
                <li>Click "Change Password" to save</li>
              </ol>

              <h4>Forgot Password</h4>
              <ol class="step-list">
                <li>Click "Forgot password?" on the login page</li>
                <li>Enter your email address</li>
                <li>Check your email for a reset link</li>
                <li>Click the link and enter your new password</li>
                <li>Confirm the password change</li>
              </ol>
            </section>

            <section id="dashboard" class="section">
              <h2>3. Dashboard Overview</h2>
              <p>The dashboard is your central hub for accessing all XeroSite features.</p>

              <h3>Dashboard Sections</h3>
              
              <div class="feature-card">
                <h4>User Information</h4>
                <p>Displays your name, email, and current role status. Shows whether you're an Administrator, Active User, or have other status designations.</p>
              </div>

              <div class="feature-card">
                <h4>Statistics Overview</h4>
                <p>View system-wide statistics including total public teams, private teams, and user counts.</p>
              </div>

              <div class="feature-card">
                <h4>My Teams</h4>
                <p>Lists all teams you belong to, showing:</p>
                <ul>
                  <li>Team name and description</li>
                  <li>Your role in the team (Admin badge if applicable)</li>
                  <li>Team visibility (Public/Private)</li>
                  <li>Member count</li>
                </ul>
              </div>

              <div class="feature-card">
                <h4>Available Public Teams</h4>
                <p>Browse and request to join public teams. Use the search function to find teams by name, number, or description.</p>
              </div>

              <div class="feature-card">
                <h4>Pending Team Requests <span class="badge user">User</span></h4>
                <p>View teams you've requested to join that are awaiting approval from team administrators.</p>
              </div>

              <div class="feature-card">
                <h4>All Users <span class="badge admin">Admin Only</span></h4>
                <p>Administrative section for managing all system users, including viewing profiles, changing passwords, and user management.</p>
              </div>

              <h3>User Menu</h3>
              <p>Click the menu button (☰) in the top right to access:</p>
              <ul>
                <li><strong>Edit Profile:</strong> Manage your personal information</li>
                <li><strong>Preferences:</strong> Configure notification and communication settings</li>
                <li><strong>Change Password:</strong> Update your account password</li>
                <li><strong>Test Message:</strong> <span class="badge admin">Admin only</span> - Send test notifications</li>
                <li><strong>Sign Out:</strong> Log out of your account</li>
              </ul>
            </section>

            <section id="teams" class="section">
              <h2>4. Team Management</h2>

              <h3>Creating a Team</h3>
              <ol class="step-list">
                <li>Click the "+ Create Team" button on the dashboard</li>
                <li>Enter team details:
                  <ul>
                    <li><strong>Team Name:</strong> A descriptive name for your team</li>
                    <li><strong>Team Number:</strong> Unique identifier (1-30000)</li>
                    <li><strong>Description:</strong> Optional description of team purpose</li>
                    <li><strong>Visibility:</strong> Public (anyone can request to join) or Private (invitation only)</li>
                  </ul>
                </li>
                <li>Click "Create Team" to establish the team</li>
              </ol>

              <h3>Joining Teams</h3>
              <h4>Public Teams</h4>
              <ol class="step-list">
                <li>Browse available public teams on the dashboard</li>
                <li>Use the search bar to find specific teams</li>
                <li>Click "Request to Join" on the desired team</li>
                <li>Wait for approval from a team administrator</li>
              </ol>

              <h4>Private Teams</h4>
              <p>For private teams, you must receive an invitation from a team administrator.</p>

              <h3>Team Management (Administrators)</h3>
              <p>As a team administrator, you can access additional features by clicking on your team:</p>

              <h4>Member Management</h4>
              <ul>
                <li><strong>View Members:</strong> See all team members with their roles and subteam assignments</li>
                <li><strong>Manage Roles:</strong> Assign roles like Administrator, Lead, Member, etc.</li>
                <li><strong>Set Permissions:</strong> Configure specific permissions for members</li>
                <li><strong>Remove Members:</strong> Remove members from the team</li>
                <li><strong>Process Requests:</strong> Approve or deny join requests</li>
              </ul>

              <h4>Team Invitations</h4>
              <ol class="step-list">
                <li>Go to the team detail page</li>
                <li>Click "Invite Members"</li>
                <li>Enter email addresses of people to invite</li>
                <li>Send invitations</li>
              </ol>

              <h4>Subteam Management</h4>
              <p>Create and manage subteams within your main team:</p>
              <ul>
                <li>Create specialized subteams for different functions</li>
                <li>Assign subteam leaders and members</li>
                <li>Define lead positions within subteams</li>
                <li>Manage subteam-specific roles and responsibilities</li>
              </ul>
            </section>

            <section id="calendar" class="section">
              <h2>5. Calendar & Events</h2>
              <p>The calendar system allows teams to schedule and manage events with various viewing options and attendance tracking.</p>

              <h3>Viewing the Calendar</h3>
              <p>Access the calendar through any team's detail page. The calendar offers multiple views:</p>
              <ul>
                <li><strong>Day View:</strong> Detailed view of a single day's events</li>
                <li><strong>Week View:</strong> Seven-day overview with time slots</li>
                <li><strong>Month View:</strong> Traditional monthly calendar grid</li>
                <li><strong>Year View:</strong> Annual overview of all events</li>
              </ul>

              <h3>Creating Events</h3>
              <p>Team administrators and members with scheduling permissions can create events:</p>
              <ol class="step-list">
                <li>Click "Create Event" on the calendar</li>
                <li>Fill in event details:
                  <ul>
                    <li><strong>Event Name:</strong> Descriptive title</li>
                    <li><strong>Description:</strong> Event details and instructions</li>
                    <li><strong>Location:</strong> Where the event takes place</li>
                    <li><strong>Date & Time:</strong> Start and end times</li>
                    <li><strong>Recurrence:</strong> Optional repeating pattern</li>
                    <li><strong>Visibility:</strong> Who can see and attend the event</li>
                  </ul>
                </li>
                <li>Configure event visibility and attendance options</li>
                <li>Save the event</li>
              </ol>

              <h3>Attendance Tracking</h3>
              <p>Members can indicate their attendance for events:</p>
              <ul>
                <li><strong>Yes:</strong> Will attend (green indicator)</li>
                <li><strong>No:</strong> Cannot attend (red indicator)</li>
                <li><strong>Not Sure:</strong> Uncertain (gray indicator)</li>
              </ul>
              <p>Click the attendance icon next to any event to cycle through these options.</p>
            </section>

            <section id="profile" class="section">
              <h2>6. Profile Management</h2>
              <p>Manage your personal information and contact details through the profile system.</p>

              <h3>Accessing Your Profile</h3>
              <ol class="step-list">
                <li>Click the menu button (☰) in the dashboard header</li>
                <li>Select "Edit Profile"</li>
                <li>Or click the "← Back to Dashboard" button from any profile page</li>
              </ol>

              <h3>Basic Information</h3>
              <p>Update your core profile details:</p>
              <ul>
                <li><strong>First Name:</strong> Your given name</li>
                <li><strong>Middle Name:</strong> Optional middle name</li>
                <li><strong>Last Name:</strong> Your family name</li>
              </ul>

              <h3>Contact Information</h3>
              <h4>Email Addresses</h4>
              <ul>
                <li>Add multiple email addresses</li>
                <li>Designate one as primary for system communications</li>
                <li>Remove unused email addresses</li>
              </ul>

              <h4>Phone Numbers</h4>
              <ul>
                <li>Add home, work, and mobile phone numbers</li>
                <li>Specify the type for each number</li>
                <li>Include international numbers with proper formatting</li>
              </ul>
            </section>

            <section id="preferences" class="section">
              <h2>7. User Preferences</h2>
              <p>Customize your notification and communication preferences to control how and when you receive updates.</p>

              <h3>Accessing Preferences</h3>
              <ol class="step-list">
                <li>Click the menu button (☰) in the dashboard header</li>
                <li>Select "Preferences"</li>
                <li>The preferences dialog will open</li>
              </ol>

              <h3>Event Notifications</h3>
              <p>Configure when and how you want to be notified about upcoming events:</p>

              <h4>Notification Timing</h4>
              <p>Set up multiple notification reminders for events:</p>
              <ul>
                <li><strong>1 week before</strong></li>
                <li><strong>3 days before</strong></li>
                <li><strong>1 day before</strong></li>
                <li><strong>6 hours before</strong></li>
                <li><strong>1 hour before</strong></li>
                <li><strong>30 minutes before</strong></li>
              </ul>

              <h4>Notification Methods</h4>
              <p>For each notification timing, choose your preferred delivery method:</p>
              <ul>
                <li><strong>Email:</strong> Receive notifications via email</li>
                <li><strong>SMS:</strong> Receive text message notifications</li>
              </ul>
            </section>

            <section id="admin" class="section">
              <h2>8. Administrator Features</h2>
              <p>Site administrators have access to additional features for managing users and system operations.</p>

              <h3>User Management</h3>
              <p>The "All Users" section on the dashboard provides comprehensive user management tools:</p>

              <h4>Viewing All Users</h4>
              <ul>
                <li>Search users by name or email</li>
                <li>Sort users by first name, last name, or email</li>
                <li>View user status (Active, Admin, Pending, Disabled)</li>
              </ul>

              <h4>User Actions</h4>
              <p>Click the action menu (⋮) next to any user to:</p>
              <ul>
                <li><strong>View Profile:</strong> See detailed user information</li>
                <li><strong>Change Password:</strong> Reset a user's password</li>
                <li><strong>Delete User:</strong> Permanently remove a user from the system</li>
              </ul>

              <div class="warning">
                <strong>Warning:</strong> Deleting a user permanently removes them from the system and clears all their team memberships. This action cannot be undone.
              </div>
            </section>

            <section id="troubleshooting" class="section">
              <h2>9. Troubleshooting</h2>

              <h3>Common Issues</h3>

              <div class="feature-card">
                <h4>Cannot Log In</h4>
                <ul>
                  <li>Verify your email address and password</li>
                  <li>Check if your account requires email verification</li>
                  <li>Use the "Forgot Password" feature if needed</li>
                  <li>Contact an administrator if your account is disabled</li>
                </ul>
              </div>

              <div class="feature-card">
                <h4>Not Receiving Notifications</h4>
                <ul>
                  <li>Check your notification preferences</li>
                  <li>Verify your email and phone number in your profile</li>
                  <li>Check spam/junk folders for email notifications</li>
                  <li>Ensure SMS notifications are enabled for your carrier</li>
                </ul>
              </div>

              <div class="feature-card">
                <h4>Cannot Join a Team</h4>
                <ul>
                  <li>Verify the team is public or you have an invitation</li>
                  <li>Check if your join request is pending approval</li>
                  <li>Contact the team administrator for private teams</li>
                  <li>Ensure your account is in active status</li>
                </ul>
              </div>

              <h3>Getting Help</h3>
              <p>If you continue to experience issues:</p>
              <ul>
                <li>Contact your team administrator for team-specific issues</li>
                <li>Reach out to site administrators for account problems</li>
                <li>Document any error messages you encounter</li>
                <li>Note the steps you took when the issue occurred</li>
              </ul>
            </section>

            <div class="footer">
              <p>This guide covers the main features of XeroSite. For additional help or questions, contact your system administrator.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./help-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HelpDialogComponent {
  readonly close = output<void>();
}