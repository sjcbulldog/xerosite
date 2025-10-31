package com.example.xeroteamsite.data.api

import com.example.xeroteamsite.data.model.*
import retrofit2.Response
import retrofit2.http.*

interface XerositeApiService {

    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): LoginResponse

    @GET("auth/me")
    suspend fun getCurrentUser(): User

    @GET("teams")
    suspend fun getTeams(): List<Team>

    @GET("teams/{teamId}")
    suspend fun getTeam(@Path("teamId") teamId: String): Team

    @GET("teams/{teamId}/members")
    suspend fun getTeamMembers(@Path("teamId") teamId: String): List<TeamMember>

    @GET("teams/{teamId}/links")
    suspend fun getTeamLinks(@Path("teamId") teamId: String): List<TeamLink>

    @GET("teams/{teamId}/media")
    suspend fun getTeamMedia(@Path("teamId") teamId: String): List<TeamMedia>

    @GET("teams/{teamId}/events")
    suspend fun getTeamEvents(
        @Path("teamId") teamId: String,
        @Query("startDate") startDate: String? = null,
        @Query("endDate") endDate: String? = null
    ): List<Event>

    @GET("teams/{teamId}/subteams")
    suspend fun getTeamSubteams(@Path("teamId") teamId: String): List<Subteam>

    @GET("teams/{teamId}/subteams/{subteamId}")
    suspend fun getSubteam(
        @Path("teamId") teamId: String,
        @Path("subteamId") subteamId: String
    ): Subteam
}

