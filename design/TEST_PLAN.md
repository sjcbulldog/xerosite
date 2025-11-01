# Xerosite Test Plan

**Version:** 1.0  
**Last Updated:** October 31, 2025  
**Application:** Xerosite Team Management Platform

## Table of Contents

1. [Introduction](#introduction)
2. [Test Objectives](#test-objectives)
3. [Test Scope](#test-scope)
4. [Test Environment](#test-environment)
5. [Test Types](#test-types)
6. [Test Scenarios](#test-scenarios)
7. [Test Schedule](#test-schedule)
8. [Resources](#resources)
9. [Risks and Mitigation](#risks-and-mitigation)
10. [Approval](#approval)

---

## 1. Introduction

### 1.1 Purpose
This document outlines the comprehensive test plan for the Xerosite application, a team management platform built with Angular (frontend) and NestJS (backend) with MySQL database.

### 1.2 Application Overview
Xerosite is a web-based team management system that provides:
- User authentication and authorization
- Team creation and management
- Calendar events with recurrence support
- Messaging system with attachments
- Media library with user group visibility
- Role-based access control
- Email notifications
- Import/export functionality

### 1.3 Technology Stack
- **Frontend:** Angular 20.3.7, TypeScript, Signals, Standalone Components
- **Backend:** NestJS (Node.js), TypeORM
- **Database:** MySQL 8+
- **Authentication:** JWT tokens
- **File Storage:** Local filesystem

---

## 2. Test Objectives

### 2.1 Primary Objectives
- Verify all functional requirements are met
- Ensure data integrity across all operations
- Validate security and authentication mechanisms
- Confirm role-based access control works correctly
- Test user interface responsiveness and usability
- Verify API endpoints return correct data
- Ensure email notifications are sent properly

### 2.2 Success Criteria
- 100% of critical features pass testing
- 95%+ of high-priority features pass testing
- No critical or high-severity bugs in production
- Performance benchmarks met (response time < 2s for 95% of requests)
- Security vulnerabilities addressed

---

## 3. Test Scope

### 3.1 In Scope

#### Frontend Testing
- User authentication flows
- Dashboard and team management UI
- Calendar component and event management
- Messaging interface
- Media library interface
- User profile management
- Admin functions
- Responsive design (desktop, tablet, mobile)

#### Backend Testing
- API endpoints
- Authentication and authorization
- Database operations (CRUD)
- File upload/download
- Email sending
- Data validation
- Error handling

#### Integration Testing
- Frontend-Backend API integration
- Database transactions
- Email service integration
- File storage operations

### 3.2 Out of Scope
- Third-party services (email providers, SMS services)
- Browser compatibility beyond Chrome, Firefox, Safari, Edge
- Performance testing beyond basic load scenarios
- Penetration testing (to be conducted separately)

---

## 4. Test Environment

### 4.1 Development Environment
- **Frontend:** `http://localhost:4200`
- **Backend:** `http://localhost:3000`
- **Database:** MySQL 8.0 (local)
- **Node.js:** v18+
- **Angular CLI:** Latest

### 4.2 Test Data
- Test users with various roles (Site Admin, Team Admin, Mentor, Student, Parent)
- Sample teams with different visibility settings
- Test events with various recurrence patterns
- Sample messages and attachments
- Test media files (images, videos, documents)

### 4.3 Test Tools
- **Unit Testing:** Jest (Backend), Karma/Jasmine (Frontend)
- **E2E Testing:** Playwright or Cypress
- **API Testing:** Postman, curl
- **Database:** MySQL Workbench
- **Browser DevTools:** Chrome DevTools, Firefox Developer Tools

---

## 5. Test Types

### 5.1 Unit Tests
Test individual components, services, and functions in isolation.

**Coverage Target:** 80%+ code coverage

### 5.2 Integration Tests
Test interactions between modules and external services.

### 5.3 Functional Tests
Test complete user workflows and business logic.

### 5.4 UI/UX Tests
Test user interface elements and user experience flows.

### 5.5 API Tests
Test all REST API endpoints for correct behavior.

### 5.6 Security Tests
Test authentication, authorization, input validation, and data protection.

### 5.7 Performance Tests
Test response times, concurrent users, and system load.

---

## 6. Test Scenarios

### 6.1 Authentication & User Management

#### 6.1.1 User Registration
**Test Cases:**
- [ ] TC-001: Register new user with valid data
- [ ] TC-002: Register with duplicate email (should fail)
- [ ] TC-003: Register with weak password (should fail)
- [ ] TC-004: Register without required fields (should fail)
- [ ] TC-005: Email verification link sent successfully
- [ ] TC-006: Email verification link expires after timeout
- [ ] TC-007: Resend verification email functionality

**Priority:** Critical  
**Test Data:** Various user credentials, valid/invalid emails

#### 6.1.2 User Login
**Test Cases:**
- [ ] TC-101: Login with valid credentials
- [ ] TC-102: Login with unverified email (should fail with message)
- [ ] TC-103: Login with incorrect password (should fail)
- [ ] TC-104: Login with non-existent user (should fail)
- [ ] TC-105: JWT token generated and valid for 24 hours
- [ ] TC-106: Token refresh on expiry
- [ ] TC-107: Logout clears session

**Priority:** Critical  
**Test Data:** Valid/invalid credentials, verified/unverified users

#### 6.1.3 Password Management
**Test Cases:**
- [ ] TC-201: Request password reset
- [ ] TC-202: Password reset email sent
- [ ] TC-203: Reset password with valid token
- [ ] TC-204: Reset with expired token (should fail)
- [ ] TC-205: Reset with invalid token (should fail)
- [ ] TC-206: Change password while logged in
- [ ] TC-207: Old password no longer works after change

**Priority:** High  
**Test Data:** Valid tokens, expired tokens, new passwords

#### 6.1.4 User Profile
**Test Cases:**
- [ ] TC-301: View own profile
- [ ] TC-302: Edit profile information
- [ ] TC-303: Add/edit email addresses
- [ ] TC-304: Add/edit phone numbers
- [ ] TC-305: Add/edit addresses
- [ ] TC-306: Upload profile picture
- [ ] TC-307: Set primary email
- [ ] TC-308: View other user's profile (limited info)

**Priority:** High  
**Test Data:** Valid profile data, images

### 6.2 Team Management

#### 6.2.1 Team Creation
**Test Cases:**
- [ ] TC-401: Create new team with valid data
- [ ] TC-402: Create team without required fields (should fail)
- [ ] TC-403: Set team visibility (public/private)
- [ ] TC-404: Set team timezone
- [ ] TC-405: Define custom roles for team
- [ ] TC-406: Creator automatically becomes team administrator

**Priority:** Critical  
**Test Data:** Team names, descriptions, roles

#### 6.2.2 Team Settings
**Test Cases:**
- [ ] TC-501: Edit team information
- [ ] TC-502: Change team visibility
- [ ] TC-503: Update team roles
- [ ] TC-504: Set role constraints
- [ ] TC-505: Delete team (admin only)
- [ ] TC-506: View team statistics

**Priority:** High  
**Test Data:** Updated team data

#### 6.2.3 Team Members
**Test Cases:**
- [ ] TC-601: View team members list
- [ ] TC-602: Add member to team (admin)
- [ ] TC-603: Assign roles to member
- [ ] TC-604: Edit member roles and permissions
- [ ] TC-605: Remove member from team
- [ ] TC-606: Toggle member active status
- [ ] TC-607: Non-admin cannot modify members
- [ ] TC-608: Export team members to CSV

**Priority:** Critical  
**Test Data:** User IDs, role assignments

#### 6.2.4 Team Invitations
**Test Cases:**
- [ ] TC-701: Send team invitation
- [ ] TC-702: Accept invitation
- [ ] TC-703: Decline invitation
- [ ] TC-704: Request to join public team
- [ ] TC-705: Approve join request
- [ ] TC-706: Reject join request
- [ ] TC-707: Invitation expires after timeout

**Priority:** High  
**Test Data:** Email addresses, team IDs

#### 6.2.5 Subteams
**Test Cases:**
- [ ] TC-801: Create subteam
- [ ] TC-802: Assign valid roles to subteam
- [ ] TC-803: Add members to subteam
- [ ] TC-804: Assign subteam lead positions
- [ ] TC-805: Edit subteam details
- [ ] TC-806: Delete subteam
- [ ] TC-807: View subteam member list

**Priority:** Medium  
**Test Data:** Subteam names, lead positions

### 6.3 Calendar & Events

#### 6.3.1 Event Creation
**Test Cases:**
- [ ] TC-901: Create one-time event
- [ ] TC-902: Create recurring event (daily)
- [ ] TC-903: Create recurring event (weekly)
- [ ] TC-904: Create recurring event (monthly)
- [ ] TC-905: Set event location
- [ ] TC-906: Set event visibility (user groups)
- [ ] TC-907: Add event description
- [ ] TC-908: Event without required fields (should fail)

**Priority:** Critical  
**Test Data:** Event titles, dates, recurrence patterns

#### 6.3.2 Event Management
**Test Cases:**
- [ ] TC-1001: View calendar month/week/day views
- [ ] TC-1002: Edit existing event
- [ ] TC-1003: Edit recurring event (single/all instances)
- [ ] TC-1004: Delete event
- [ ] TC-1005: Delete recurring event instance
- [ ] TC-1006: View event details
- [ ] TC-1007: Events visible according to user group membership
- [ ] TC-1008: Export calendar feed (iCal)

**Priority:** Critical  
**Test Data:** Various event types, dates

#### 6.3.3 Event Attendance
**Test Cases:**
- [ ] TC-1101: Mark attendance for event
- [ ] TC-1102: View attendance report
- [ ] TC-1103: Edit attendance record
- [ ] TC-1104: Filter attendance by date range
- [ ] TC-1105: Export attendance to CSV
- [ ] TC-1106: Non-admin can only mark own attendance

**Priority:** High  
**Test Data:** User IDs, event IDs, attendance status

### 6.4 Messaging System

#### 6.4.1 Send Messages
**Test Cases:**
- [ ] TC-1201: Send message to all team members
- [ ] TC-1202: Send message to user group
- [ ] TC-1203: Send message with subject and content
- [ ] TC-1204: Attach files to message
- [ ] TC-1205: Message without subject (should fail)
- [ ] TC-1206: Multiple file attachments
- [ ] TC-1207: File size limits enforced

**Priority:** Critical  
**Test Data:** Message content, file attachments

#### 6.4.2 Receive Messages
**Test Cases:**
- [ ] TC-1301: View received messages
- [ ] TC-1302: View message details
- [ ] TC-1303: Download message attachments
- [ ] TC-1304: Only see messages sent to user's groups
- [ ] TC-1305: Email notification sent for new message
- [ ] TC-1306: Mark message as read (future)

**Priority:** Critical  
**Test Data:** Various message types

#### 6.4.3 Message Management (Admin)
**Test Cases:**
- [ ] TC-1401: Review all sent messages
- [ ] TC-1402: View message recipients
- [ ] TC-1403: View message statistics
- [ ] TC-1404: Delete message (admin)

**Priority:** High  
**Test Data:** Message IDs

### 6.5 Team Media

#### 6.5.1 Media Upload
**Test Cases:**
- [ ] TC-1501: Upload image file
- [ ] TC-1502: Upload video file
- [ ] TC-1503: Upload document file
- [ ] TC-1504: Set media title and year
- [ ] TC-1505: Set media visibility (user group)
- [ ] TC-1506: File without title (should fail)
- [ ] TC-1507: File size limits enforced
- [ ] TC-1508: Progress indicator during upload
- [ ] TC-1509: Drag and drop file upload

**Priority:** High  
**Test Data:** Various file types and sizes

#### 6.5.2 Media Management
**Test Cases:**
- [ ] TC-1601: View media library organized by year
- [ ] TC-1602: View media by type (pictures/videos/other)
- [ ] TC-1603: Filter media by title/filename/uploader
- [ ] TC-1604: Edit media title and year
- [ ] TC-1605: Edit media user group visibility
- [ ] TC-1606: Preview images inline
- [ ] TC-1607: Preview videos inline
- [ ] TC-1608: Download media file
- [ ] TC-1609: Delete media (owner or admin only)
- [ ] TC-1610: Media visible according to user group membership
- [ ] TC-1611: Video thumbnail generation
- [ ] TC-1612: Expand/collapse year sections
- [ ] TC-1613: User group dropdown shows correct selected value on edit

**Priority:** High  
**Test Data:** Media files, titles, years, user groups

### 6.6 User Groups

#### 6.6.1 User Group Management
**Test Cases:**
- [ ] TC-1701: Create private user group
- [ ] TC-1702: Create public user group (with permission)
- [ ] TC-1703: Set visibility rules for user group
- [ ] TC-1704: Edit user group name
- [ ] TC-1705: Edit user group visibility rules
- [ ] TC-1706: Delete user group
- [ ] TC-1707: Only creator can edit/delete private group
- [ ] TC-1708: Public group requires MANAGE_USER_GROUPS permission

**Priority:** High  
**Test Data:** Group names, visibility rules

#### 6.6.2 Visibility Rules
**Test Cases:**
- [ ] TC-1801: Create rule based on team role
- [ ] TC-1802: Create rule based on subteam membership
- [ ] TC-1803: Create rule with AND/OR conditions
- [ ] TC-1804: Multiple rule rows combined correctly
- [ ] TC-1805: User group membership calculated correctly
- [ ] TC-1806: Content visibility filtered by user groups

**Priority:** High  
**Test Data:** Various rule combinations

### 6.7 Team Links

**Test Cases:**
- [ ] TC-1901: Add team link
- [ ] TC-1902: Edit link title and URL
- [ ] TC-1903: Delete link
- [ ] TC-1904: Reorder links (drag and drop)
- [ ] TC-1905: Open link in new tab
- [ ] TC-1906: Only admin can modify links

**Priority:** Medium  
**Test Data:** URLs, titles

### 6.8 User Preferences

**Test Cases:**
- [ ] TC-2001: Set user preferences for team
- [ ] TC-2002: Opt in/out of various notification types
- [ ] TC-2003: Preferences saved per team
- [ ] TC-2004: Default preferences applied to new teams
- [ ] TC-2005: Email notifications respect preferences

**Priority:** Medium  
**Test Data:** Preference settings

### 6.9 Administrative Functions

#### 6.9.1 Site Administration
**Test Cases:**
- [ ] TC-2101: View all users (site admin)
- [ ] TC-2102: View all teams (site admin)
- [ ] TC-2103: Access any team as site admin
- [ ] TC-2104: Change user state (pending/active/inactive)
- [ ] TC-2105: Grant/revoke site admin status
- [ ] TC-2106: Reset user password (admin)
- [ ] TC-2107: Delete user account
- [ ] TC-2108: View site statistics

**Priority:** Critical  
**Test Data:** User IDs, admin credentials

#### 6.9.2 Team Administration
**Test Cases:**
- [ ] TC-2201: Grant team permissions to users
- [ ] TC-2202: Permission constraints enforced
- [ ] TC-2203: Administrator role has all permissions
- [ ] TC-2204: Custom permission assignments work
- [ ] TC-2205: Export team data

**Priority:** High  
**Test Data:** Permission settings

### 6.10 Import/Export

**Test Cases:**
- [ ] TC-2301: Export users to CSV
- [ ] TC-2302: Export attendance to CSV
- [ ] TC-2303: CSV format is correct
- [ ] TC-2304: CSV contains all expected data
- [ ] TC-2305: Large exports complete successfully

**Priority:** Medium  
**Test Data:** Team data

### 6.11 Security & Authorization

**Test Cases:**
- [ ] TC-2401: Unauthorized users redirected to login
- [ ] TC-2402: Expired tokens rejected
- [ ] TC-2403: Invalid tokens rejected
- [ ] TC-2404: SQL injection attempts blocked
- [ ] TC-2405: XSS attempts sanitized
- [ ] TC-2406: CSRF protection in place
- [ ] TC-2407: Password complexity enforced
- [ ] TC-2408: Sensitive data not exposed in responses
- [ ] TC-2409: File upload types restricted
- [ ] TC-2410: Rate limiting on authentication endpoints

**Priority:** Critical  
**Test Data:** Malicious input patterns

### 6.12 Error Handling

**Test Cases:**
- [ ] TC-2501: Appropriate error messages displayed
- [ ] TC-2502: Network errors handled gracefully
- [ ] TC-2503: 404 errors for invalid routes
- [ ] TC-2504: 500 errors logged properly
- [ ] TC-2505: Validation errors clear and specific
- [ ] TC-2506: Database connection errors handled
- [ ] TC-2507: File upload errors handled

**Priority:** High  
**Test Data:** Various error conditions

### 6.13 Performance

**Test Cases:**
- [ ] TC-2601: Dashboard loads in < 2 seconds
- [ ] TC-2602: API responses in < 500ms (simple queries)
- [ ] TC-2603: Image thumbnails load efficiently
- [ ] TC-2604: Large file uploads work without timeout
- [ ] TC-2605: Calendar renders quickly with many events
- [ ] TC-2606: Message list pagination works smoothly
- [ ] TC-2607: Concurrent user operations don't conflict

**Priority:** Medium  
**Test Data:** Large datasets, multiple users

### 6.14 Responsive Design

**Test Cases:**
- [ ] TC-2701: Dashboard displays correctly on mobile
- [ ] TC-2702: Calendar usable on tablet
- [ ] TC-2703: Forms work on mobile devices
- [ ] TC-2704: Navigation menu accessible on small screens
- [ ] TC-2705: Media previews work on mobile
- [ ] TC-2706: Touch interactions work properly

**Priority:** Medium  
**Test Data:** Various screen sizes

---

## 7. Test Schedule

### Phase 1: Unit Testing (Weeks 1-2)
- Backend unit tests (services, controllers)
- Frontend unit tests (components, services)
- Target: 80% code coverage

### Phase 2: Integration Testing (Week 3)
- API integration tests
- Database transaction tests
- Email service integration

### Phase 3: Functional Testing (Weeks 4-5)
- Complete user workflows
- All test scenarios from Section 6
- Critical and high priority first

### Phase 4: Security & Performance Testing (Week 6)
- Security vulnerability scanning
- Performance benchmarking
- Load testing

### Phase 5: Regression Testing (Week 7)
- Re-test after bug fixes
- Verify no new issues introduced
- Final verification

### Phase 6: User Acceptance Testing (Week 8)
- End-user testing
- Feedback collection
- Final adjustments

---

## 8. Resources

### 8.1 Test Team
- QA Lead: 1
- QA Engineers: 2-3
- Developers (for bug fixes): 2-3
- Product Owner (for clarifications)

### 8.2 Test Tools
- **Frontend:** Karma, Jasmine, Playwright/Cypress
- **Backend:** Jest, Supertest
- **API:** Postman, curl
- **Database:** MySQL Workbench
- **Performance:** Apache JMeter (optional)
- **Bug Tracking:** GitHub Issues or Jira

### 8.3 Test Data Requirements
- Minimum 10 test users per role type
- 5 test teams with varying configurations
- 20+ calendar events with various patterns
- Sample messages and attachments
- Sample media files (images, videos, docs)

---

## 9. Risks and Mitigation

### 9.1 Identified Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Insufficient test data | High | Medium | Create automated test data generation scripts |
| Environment instability | High | Low | Maintain dedicated test environment |
| Third-party service failures | Medium | Medium | Mock external services in tests |
| Time constraints | High | Medium | Prioritize critical and high-priority tests |
| Changing requirements | Medium | Medium | Maintain flexible test cases, regular communication |
| Inadequate test coverage | High | Low | Code coverage tools, peer review |
| Security vulnerabilities | Critical | Low | Regular security audits, follow OWASP guidelines |

### 9.2 Dependencies
- Database availability and stability
- Email server for notification testing
- File storage system
- Development environment stability

---

## 10. Approval

### 10.1 Test Plan Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| QA Lead | | | |
| Development Lead | | | |
| Product Owner | | | |
| Project Manager | | | |

### 10.2 Test Completion Criteria
- All critical test cases pass
- 95%+ of high-priority test cases pass
- No open critical or high-severity bugs
- Code coverage meets 80% threshold
- Security scan shows no critical vulnerabilities
- Performance benchmarks met
- User acceptance testing completed

### 10.3 Test Exit Criteria
- All planned test cases executed
- Defect closure rate > 95%
- Test summary report approved
- Sign-off from stakeholders

---

## Appendix A: Test Case Template

```
Test Case ID: TC-XXXX
Test Case Name: [Descriptive name]
Module: [Module name]
Priority: [Critical/High/Medium/Low]
Preconditions: [What must be true before test]
Test Steps:
  1. [Step 1]
  2. [Step 2]
  3. [Step 3]
Expected Result: [What should happen]
Actual Result: [What actually happened]
Status: [Pass/Fail/Blocked]
Notes: [Any additional information]
```

## Appendix B: Bug Report Template

```
Bug ID: BUG-XXXX
Title: [Brief description]
Severity: [Critical/High/Medium/Low]
Priority: [Critical/High/Medium/Low]
Module: [Module name]
Environment: [Dev/Test/Prod]
Steps to Reproduce:
  1. [Step 1]
  2. [Step 2]
  3. [Step 3]
Expected Behavior: [What should happen]
Actual Behavior: [What actually happened]
Screenshots/Logs: [Attach if available]
Assigned To: [Developer name]
Status: [Open/In Progress/Fixed/Closed]
```

## Appendix C: Test Environment Setup

### Backend Setup
```bash
cd server
npm install
cp .env.example .env
# Edit .env with test database credentials
npm run migration:run
npm run start:dev
```

### Frontend Setup
```bash
cd frontend
npm install
ng serve
```

### Database Setup
```sql
CREATE DATABASE xerosite_test;
USE xerosite_test;
-- Run migrations
```

### Test Data Generation
```bash
# Run seed scripts to populate test data
npm run seed:test
```

---

**Document Version History:**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-31 | QA Team | Initial test plan creation |

---

**End of Test Plan**
