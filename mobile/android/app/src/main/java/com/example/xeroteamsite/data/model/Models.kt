package com.example.xeroteamsite.data.model

import com.google.gson.annotations.SerializedName

data class LoginRequest(
    val username: String,
    val password: String
)

data class LoginResponse(
    val user: User,
    @SerializedName("access_token")
    val accessToken: String
)

data class User(
    val id: String,
    val firstName: String,
    val lastName: String,
    val fullName: String,
    val primaryEmail: String,
    val state: String,
    val isSiteAdmin: Boolean
)

data class Team(
    val id: String,
    val name: String,
    val teamNumber: Int?,
    val description: String?,
    val visibility: String,
    val timezone: String,
    val roles: List<String>?,
    val createdAt: String?,
    val updatedAt: String?
)

data class TeamMember(
    val userId: String,
    val userName: String,
    val userEmail: String,
    val roles: List<String>,
    val membershipStatus: String,
    val isActive: Boolean,
    val joinedAt: String
)

data class TeamLink(
    val id: String,
    val teamId: String,
    val title: String,
    val url: String,
    val displayOrder: Int,
    val createdAt: String
)

data class TeamMedia(
    val id: String,
    val teamId: String,
    val title: String,
    val filename: String,
    val mimeType: String,
    val fileSize: Long,
    val uploadedBy: String,
    val displayOrder: Int,
    val createdAt: String
)

data class Event(
    val id: String,
    val teamId: String,
    val name: String,
    val description: String?,
    val location: String?,
    val startDateTime: String,
    val endDateTime: String,
    val recurrenceType: String?,
    val recurrencePattern: Map<String, Any>?,
    val recurrenceEndDate: String?,
    val timezone: String?,
    val userGroupId: String?,
    val excludedDates: List<String>?,
    val createdBy: String?,
    val createdAt: String?,
    val updatedAt: String?
)

data class EventAttendance(
    val id: String,
    val eventId: String,
    val userId: String,
    val userName: String?,
    val instanceDate: String,
    val attendance: String,
    val createdAt: String,
    val updatedAt: String
)

data class Subteam(
    val id: String,
    val teamId: String,
    val name: String,
    val description: String?,
    val validRoles: List<String>?,
    val leadPositions: List<LeadPosition>?,
    val members: List<SubteamMember>?,
    val createdAt: String?,
    val updatedAt: String?
)

data class LeadPosition(
    val id: String,
    val title: String,
    val requiredRole: String?,
    val leadUserId: String?,
    val leadUserName: String?
)

data class SubteamMember(
    val userId: String,
    val userName: String,
    val userEmail: String
)

