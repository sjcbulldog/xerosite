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
              <p class="version-info"><em>Last Updated: October 31, 2025 | Version 2.0</em></p>
            </div>

            <div class="toc">
              <h2>Table of Contents</h2>
              <ul>
                <li><a href="#getting-started">1. Getting Started</a></li>
                <li><a href="#authentication">2. Authentication & Account Management</a></li>
                <li><a href="#dashboard">3. Dashboard Overview</a></li>
                <li><a href="#teams">4. Team Management</a></li>
                <li><a href="#calendar">5. Calendar & Events</a></li>
                <li><a href="#media">6. Team Media & Files</a></li>
                <li><a href="#messaging">7. Team Messaging</a></li>
                <li><a href="#profile">8. Profile Management</a></li>
                <li><a href="#preferences">9. User Preferences</a></li>
                <li><a href="#admin">10. Administrator Features</a></li>
                <li><a href="#mobile">11. Mobile App Access</a></li>
                <li><a href="#troubleshooting">12. Troubleshooting</a></li>
              </ul>
            </div>

            <section id="getting-started" class="section">
              <h2>1. Getting Started</h2>
              <p>Welcome to XeroSite, a comprehensive team management platform designed to help organizations manage teams, events, and member communications efficiently.</p>
              
              <h3>What is XeroSite?</h3>
              <p>XeroSite is a web-based platform that provides:</p>
              <ul>
                <li>Team creation and management with hierarchical subteams</li>
                <li>Member role and permission management with role constraints</li>
                <li>Event scheduling and calendar management with attendance tracking</li>
                <li>Team messaging with intelligent file attachment handling</li>
                <li>Media library with organized file storage</li>
                <li>User profile and preference management</li>
                <li>Communication and notification systems (email and SMS)</li>
                <li>Administrative tools for user and team management</li>
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

              <h4>Viewing Subteam Information</h4>
              <p>When viewing a team's subteams, you can see detailed membership statistics:</p>
              <ul>
                <li><strong>Total Member Count:</strong> Displayed in a green badge showing the total number of members in the subteam</li>
                <li><strong>Role Breakdown:</strong> Blue badges showing the count for each role (e.g., "Student: 5", "Mentor: 2", "Parent: 3")</li>
                <li><strong>Valid Roles:</strong> Which roles are eligible to be members of each subteam</li>
              </ul>
              <div class="note">
                <strong>Note:</strong> The role counts help team administrators quickly understand the composition of each subteam at a glance.
              </div>

              <h4>Join Request Notifications</h4>
              <p>When users request to join public teams:</p>
              <ul>
                <li>All team administrators receive an email notification</li>
                <li>Email includes the requestor's name and email address</li>
                <li>Administrators can approve or reject requests from the team management page</li>
                <li>Users receive email notifications when their requests are approved or rejected</li>
              </ul>

              <h4>User Groups</h4>
              <p>Create custom groups of team members for targeted communications and access control:</p>
              <ul>
                <li><strong>Create Groups:</strong> Define groups based on roles, subteams, or custom criteria</li>
                <li><strong>Dynamic Membership:</strong> Groups can automatically include members based on rules (e.g., all students, all mentors)</li>
                <li><strong>Manual Selection:</strong> Manually select specific members for a group</li>
                <li><strong>Use Cases:</strong>
                  <ul>
                    <li>Send messages to specific groups</li>
                    <li>Control event visibility</li>
                    <li>Restrict media file access</li>
                    <li>Target notifications</li>
                  </ul>
                </li>
              </ul>
              <div class="note">
                <strong>Note:</strong> User groups make it easy to communicate with subsets of your team without manually selecting individuals each time.
              </div>
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

              <h3>Calendar Subscription</h3>
              <p>Subscribe to team calendars in your personal calendar application:</p>
              <ol class="step-list">
                <li>Open your preferred calendar app (Google Calendar, Apple Calendar, Outlook, etc.)</li>
                <li>Look for "Add Calendar" or "Subscribe to Calendar" option</li>
                <li>Use the team's calendar feed URL: <code>webcal://yourdomain.com/calendar/[team-id]</code></li>
                <li>The calendar will automatically sync and update with team events</li>
              </ol>
              <div class="note">
                <strong>Note:</strong> Calendar subscriptions support recurring events, event updates, and timezone conversions automatically.
              </div>

              <h3>Recurring Events</h3>
              <p>Create events that repeat on a regular schedule:</p>
              <ul>
                <li><strong>Daily:</strong> Events that occur every day or every N days</li>
                <li><strong>Weekly:</strong> Events on specific days of the week</li>
                <li><strong>Monthly:</strong> Events on specific days of the month</li>
                <li><strong>Yearly:</strong> Annual events</li>
              </ul>
              <p>When creating a recurring event, you can specify:</p>
              <ul>
                <li>The recurrence pattern (daily, weekly, monthly, yearly)</li>
                <li>The interval (e.g., every 2 weeks)</li>
                <li>End date or number of occurrences</li>
                <li>Exceptions for specific dates</li>
              </ul>

              <h3>Event Visibility & Access</h3>
              <p>Control who can see and attend events:</p>
              <ul>
                <li><strong>All Team Members:</strong> Visible to everyone on the team</li>
                <li><strong>User Groups:</strong> Visible only to members of specific groups</li>
                <li><strong>Subteams:</strong> Visible to specific subteam members</li>
              </ul>
            </section>

            <section id="media" class="section">
              <h2>6. Team Media & Files</h2>
              <p>Share images, videos, documents, and other files with your team members.</p>

              <h3>Accessing Team Media</h3>
              <p>From any team detail page, find the "Media" section with a collapsible header. Click to expand and view all team media files.</p>

              <h3>Uploading Files</h3>
              <ol class="step-list">
                <li>Click the "+" button in the Media section header</li>
                <li>In the upload dialog, enter a descriptive title for your file</li>
                <li>Choose a file by either:
                  <ul>
                    <li>Clicking "Browse Files" to select from your computer</li>
                    <li>Dragging and dropping a file into the upload area</li>
                  </ul>
                </li>
                <li>Watch the real-time progress bar as your file uploads</li>
                <li>Click "Upload" to complete</li>
              </ol>

              <div class="note">
                <strong>Note:</strong> The title will automatically populate from the filename, but you can change it to something more descriptive. Large file uploads show detailed progress including upload speed and estimated time remaining.
              </div>

              <h3>Upload Progress Tracking</h3>
              <p>When uploading files, you'll see detailed progress information:</p>
              <ul>
                <li><strong>Progress Bar:</strong> Visual indicator of upload completion</li>
                <li><strong>Percentage:</strong> Exact upload progress (e.g., 45%)</li>
                <li><strong>Upload Speed:</strong> Current transfer rate (e.g., 2.5 MB/s)</li>
                <li><strong>Time Remaining:</strong> Estimated completion time for large files</li>
                <li><strong>File Size:</strong> Total size being uploaded</li>
              </ul>

              <h3>Supported File Types</h3>
              <ul>
                <li><strong>Images:</strong> JPG, PNG, GIF (with preview support)</li>
                <li><strong>Videos:</strong> MP4, MOV, AVI (with thumbnail generation)</li>
                <li><strong>Documents:</strong> PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX</li>
                <li><strong>Archives:</strong> ZIP</li>
                <li><strong>Text:</strong> TXT, CSV</li>
              </ul>

              <h3>Viewing Media</h3>
              <p>In the media list, you can:</p>
              <ul>
                <li><strong>Preview:</strong> Click on images or videos to view them in a full-screen preview dialog</li>
                <li><strong>Filter:</strong> Use the search box to filter by title, filename, or uploader name</li>
                <li><strong>View Details:</strong> See file size, upload date, and uploader information</li>
              </ul>

              <h3>Media Actions</h3>
              <p>For each file, you can:</p>
              <ul>
                <li><strong>Download:</strong> Save the file to your computer (⬇️ button)</li>
                <li><strong>Edit Title:</strong> Rename the file's display title (✏️ button - if you're the uploader or team admin)</li>
                <li><strong>Delete:</strong> Remove the file from team media (🗑️ button - if you're the uploader or team admin)</li>
              </ul>

              <h3>Media Visibility & Access Control</h3>
              <p>Control who can view team media files:</p>
              <ul>
                <li><strong>All Team Members:</strong> Visible to everyone on the team (default)</li>
                <li><strong>User Groups:</strong> Restrict visibility to specific user groups</li>
                <li><strong>Private:</strong> Visible only to team administrators</li>
              </ul>
              <div class="note">
                <strong>Note:</strong> Media visibility settings work with the user group system, allowing you to share files with specific subsets of your team (e.g., only mentors, only students, etc.).
              </div>

              <h3>Image & Video Previews</h3>
              <ul>
                <li><strong>Images:</strong> Display automatically with thumbnail in the list, click to view full-size</li>
                <li><strong>Videos:</strong> Show generated thumbnails, click to play in full-screen viewer</li>
                <li><strong>Close Preview:</strong> Click the × button or outside the preview area</li>
              </ul>
            </section>

            <section id="messaging" class="section">
              <h2>7. Team Messaging</h2>
              <p>Send messages and announcements to team members with optional file attachments.</p>

              <h3>Sending Messages</h3>
              <ol class="step-list">
                <li>From the team detail page, click "Send Message" in the admin menu (⋮)</li>
                <li>Fill in the message form:
                  <ul>
                    <li><strong>Recipients:</strong> Choose who receives the message</li>
                    <li><strong>Subject:</strong> Brief description of the message</li>
                    <li><strong>Content:</strong> Full message text</li>
                  </ul>
                </li>
                <li>Optionally add file attachments (see below)</li>
                <li>Click "Send Message"</li>
              </ol>

              <h3>Recipient Options</h3>
              <ul>
                <li><strong>All Team Members:</strong> Everyone on the team receives the message</li>
                <li><strong>User Group:</strong> Target specific groups you've defined (e.g., by role, subteam, or custom criteria)</li>
              </ul>

              <h3>Message Attachments</h3>
              <p>Add files to your messages using drag-and-drop or file browsing:</p>
              
              <h4>Adding Attachments</h4>
              <ol class="step-list">
                <li>In the Send Message dialog, locate the attachment area</li>
                <li>Either:
                  <ul>
                    <li>Drag files from your computer onto the drop zone</li>
                    <li>Click "Browse Files" to select files</li>
                  </ul>
                </li>
                <li>Multiple files can be added (up to 10 files)</li>
                <li>Remove unwanted files by clicking the × next to each filename</li>
              </ol>

              <h4>Attachment Size Limits</h4>
              <ul>
                <li><strong>Maximum per file:</strong> 50 MB</li>
                <li><strong>Maximum total:</strong> 50 MB across all attachments</li>
                <li>You'll receive an error if limits are exceeded</li>
              </ul>

              <h4>Large File Handling</h4>
              <div class="feature-card">
                <h4>Smart Attachment Delivery</h4>
                <p>The system automatically optimizes how attachments are delivered:</p>
                <ul>
                  <li><strong>Small files (≤1 MB):</strong> Attached directly to email messages</li>
                  <li><strong>Large files (>1 MB):</strong> Stored on the server with download links in the email</li>
                </ul>
                <div class="note">
                  <strong>Note:</strong> When you attach large files, recipients will see a notification in the email with download links instead of direct attachments. This ensures reliable email delivery.
                </div>
              </div>

              <h3>Reviewing Sent Messages</h3>
              <ol class="step-list">
                <li>Click "Review Messages" in the admin menu</li>
                <li>View all messages sent to the team</li>
                <li>Filter by date range or search content</li>
                <li>See delivery statistics and recipient information</li>
              </ol>

              <h3>Downloading Message Attachments</h3>
              <p>If you receive an email with large file attachments:</p>
              <ol class="step-list">
                <li>Open the email notification</li>
                <li>Look for the "Large Attachments" section</li>
                <li>Click the download link for each file</li>
                <li>File will download immediately - no login required</li>
                <li>Download links expire after 72 hours or after one use (whichever comes first)</li>
              </ol>
              <div class="note">
                <strong>Security Note:</strong> Download links are single-use and time-limited for your protection. If a link has expired or been used, contact the message sender to request a new copy. This secure download token system ensures that attachments can only be accessed by intended recipients.
              </div>

              <h3>Email Verification & Delivery</h3>
              <p>The system includes advanced email handling features:</p>
              <ul>
                <li><strong>Email Queue:</strong> Messages are queued and sent reliably, even during high-volume periods</li>
                <li><strong>Rate Limiting:</strong> Prevents overwhelming email servers</li>
                <li><strong>Delivery Tracking:</strong> Monitor message delivery status</li>
                <li><strong>Bounce Handling:</strong> Automatically handles undeliverable emails</li>
                <li><strong>Retry Logic:</strong> Failed messages are automatically retried</li>
              </ul>
            </section>

            <section id="profile" class="section">
              <h2>8. Profile Management</h2>
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
              <h2>9. User Preferences</h2>
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
                <li><strong>SMS:</strong> Receive text message notifications (requires phone number in profile)</li>
              </ul>
              <div class="note">
                <strong>Note:</strong> SMS notifications require that you have a phone number configured in your profile. You can add multiple phone numbers and designate which one receives SMS notifications. SMS notifications are powered by Twilio and support international numbers.
              </div>

              <h3>Dashboard & Display Preferences</h3>
              <p>Customize how you view information:</p>
              <ul>
                <li><strong>Theme:</strong> Choose between light and dark themes</li>
                <li><strong>Language:</strong> Select your preferred language (if multiple languages are available)</li>
                <li><strong>Dashboard Layout:</strong> Choose grid or list view for team display</li>
                <li><strong>Timezone:</strong> Set your local timezone for correct event times</li>
              </ul>
            </section>

            <section id="admin" class="section">
              <h2>10. Administrator Features</h2>
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
                <li><strong>Change User State:</strong> Set user status (Pending, Active, Admin, Inactive)</li>
                <li><strong>Toggle Active Status:</strong> Temporarily enable or disable a user account</li>
                <li><strong>Delete User:</strong> Permanently remove a user from the system</li>
              </ul>

              <h4>User States Explained</h4>
              <ul>
                <li><strong>Pending:</strong> New account awaiting email verification</li>
                <li><strong>Active:</strong> Normal user with full access to teams they belong to</li>
                <li><strong>Admin:</strong> Site administrator with full system access</li>
                <li><strong>Inactive:</strong> Account disabled (user cannot log in)</li>
              </ul>
              <div class="note">
                <strong>Note:</strong> The "isActive" flag provides an additional way to temporarily disable accounts without changing their state. This is useful for temporary suspensions.
              </div>

              <div class="warning">
                <strong>Warning:</strong> Deleting a user permanently removes them from the system and clears all their team memberships. This action cannot be undone.
              </div>

              <h3>Team Roles & Permissions</h3>
              <p>Administrators can define custom roles and permissions for teams:</p>

              <h4>Role Management</h4>
              <ul>
                <li><strong>Custom Roles:</strong> Create team-specific roles (e.g., Student, Mentor, Parent, Lead)</li>
                <li><strong>Role Assignments:</strong> Assign multiple roles to each team member</li>
                <li><strong>Role Constraints:</strong> Define rules about which roles can be combined or are mutually exclusive</li>
                <li><strong>Permission Mapping:</strong> Grant specific permissions to each role</li>
              </ul>

              <h4>Available Permissions</h4>
              <ul>
                <li><strong>View Calendar:</strong> See team events</li>
                <li><strong>Create Events:</strong> Schedule new events</li>
                <li><strong>Edit Events:</strong> Modify existing events</li>
                <li><strong>Delete Events:</strong> Remove events</li>
                <li><strong>Send Messages:</strong> Send messages to team members</li>
                <li><strong>Upload Media:</strong> Add files to team media library</li>
                <li><strong>Manage Members:</strong> Add, remove, or modify team members</li>
                <li><strong>Manage Subteams:</strong> Create and configure subteams</li>
                <li><strong>View Reports:</strong> Access team analytics and reports</li>
              </ul>

              <h4>Role Constraints</h4>
              <p>Control which roles can be assigned together:</p>
              <ul>
                <li><strong>Required Combinations:</strong> Some roles require other roles to be present</li>
                <li><strong>Exclusive Roles:</strong> Certain roles cannot be combined (e.g., Student and Mentor)</li>
                <li><strong>Validation:</strong> System prevents invalid role combinations when editing members</li>
              </ul>
            </section>

            <section id="mobile" class="section">
              <h2>11. Mobile App Access</h2>
              <p>XeroSite provides a mobile application for iOS and Android devices, allowing you to access team information on the go.</p>

              <h3>Mobile App Features</h3>
              <ul>
                <li><strong>Team Dashboard:</strong> View all your teams and team details</li>
                <li><strong>Calendar Access:</strong> See upcoming events and meetings</li>
                <li><strong>Team Members:</strong> Browse member lists and contact information</li>
                <li><strong>Media Library:</strong> Access team files and media</li>
                <li><strong>Useful Links:</strong> Quick access to team resources</li>
                <li><strong>Notifications:</strong> Receive push notifications for important updates</li>
              </ul>

              <h3>Getting Started with Mobile</h3>
              <ol class="step-list">
                <li>Download the XeroSite app from the App Store (iOS) or Google Play Store (Android)</li>
                <li>Log in using your existing XeroSite credentials</li>
                <li>Select a team to view its details</li>
                <li>Navigate between different sections using the bottom navigation bar</li>
              </ol>

              <h3>Mobile API</h3>
              <p>For developers interested in building integrations:</p>
              <ul>
                <li>RESTful API with JWT authentication</li>
                <li>Full access to teams, events, messages, and media</li>
                <li>Comprehensive API documentation available</li>
                <li>Support for file uploads and downloads</li>
                <li>Real-time event attendance tracking</li>
              </ul>
              <div class="note">
                <strong>Note:</strong> The mobile app uses the same account as the web application. Any changes made in the mobile app are immediately reflected on the website and vice versa.
              </div>
            </section>

            <section id="troubleshooting" class="section">
              <h2>12. Troubleshooting</h2>

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

              <div class="feature-card">
                <h4>File Upload Issues</h4>
                <ul>
                  <li>Verify file size doesn't exceed 50 MB</li>
                  <li>Check your internet connection for large files</li>
                  <li>Try uploading one file at a time if issues persist</li>
                  <li>Ensure you have permission to upload to the team</li>
                </ul>
              </div>

              <div class="feature-card">
                <h4>Cannot Download Attachments</h4>
                <ul>
                  <li>Verify you're logged in to the system</li>
                  <li>Check that you're a member of the team</li>
                  <li>Ensure the download link hasn't expired (if applicable)</li>
                  <li>Try copying the link to a new browser tab</li>
                </ul>
              </div>

              <div class="feature-card">
                <h4>Video Previews Not Working</h4>
                <ul>
                  <li>Check that your browser supports video playback</li>
                  <li>Ensure the video format is supported (MP4, MOV, AVI)</li>
                  <li>Try refreshing the page to reload thumbnails</li>
                  <li>Download the video file to view locally if preview fails</li>
                </ul>
              </div>

              <div class="feature-card">
                <h4>Subteam Role Counts Not Displaying</h4>
                <ul>
                  <li>Ensure team members have roles assigned</li>
                  <li>Refresh the page to reload team data</li>
                  <li>Verify the subteam has members assigned</li>
                  <li>Check that you have permission to view the subteam details</li>
                </ul>
              </div>

              <div class="feature-card">
                <h4>Calendar Not Syncing</h4>
                <ul>
                  <li>Verify the calendar subscription URL is correct</li>
                  <li>Check that your calendar app supports webcal:// URLs</li>
                  <li>Try removing and re-adding the calendar subscription</li>
                  <li>Allow up to 24 hours for initial sync in some calendar applications</li>
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
              <p><strong>XeroSite User Guide - Version 2.0</strong></p>
              <p>This guide covers the main features of XeroSite. For additional help or questions, contact your system administrator.</p>
              <p><em>Last Updated: October 31, 2025</em></p>
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