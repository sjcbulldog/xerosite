package com.example.xeroteamsite.data.repository

import com.example.xeroteamsite.data.api.RetrofitClient
import com.example.xeroteamsite.data.model.*
import com.example.xeroteamsite.data.preferences.PreferencesManager
import kotlinx.coroutines.flow.first

class XerositeRepository(private val preferencesManager: PreferencesManager) {

    private val apiService = RetrofitClient.apiService

    suspend fun login(username: String, password: String): Result<LoginResponse> {
        return try {
            val response = apiService.login(LoginRequest(username, password))
            preferencesManager.saveAuthToken(response.accessToken)
            RetrofitClient.setAuthToken(response.accessToken)
            Result.success(response)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun logout() {
        preferencesManager.clearAuthToken()
        preferencesManager.clearSelectedTeamId()
        RetrofitClient.setAuthToken(null)
    }

    suspend fun initializeAuthToken() {
        val token = preferencesManager.authToken.first()
        RetrofitClient.setAuthToken(token)
    }

    suspend fun getCurrentUser(): Result<User> {
        return try {
            val user = apiService.getCurrentUser()
            Result.success(user)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getTeams(): Result<List<Team>> {
        return try {
            val teams = apiService.getTeams()
            Result.success(teams)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getTeam(teamId: String): Result<Team> {
        return try {
            val team = apiService.getTeam(teamId)
            Result.success(team)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getTeamMembers(teamId: String): Result<List<TeamMember>> {
        return try {
            val members = apiService.getTeamMembers(teamId)
            Result.success(members)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getTeamLinks(teamId: String): Result<List<TeamLink>> {
        return try {
            val links = apiService.getTeamLinks(teamId)
            Result.success(links)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getTeamMedia(teamId: String): Result<List<TeamMedia>> {
        return try {
            val media = apiService.getTeamMedia(teamId)
            Result.success(media)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getTeamEvents(teamId: String, startDate: String? = null, endDate: String? = null): Result<List<Event>> {
        return try {
            val events = apiService.getTeamEvents(teamId, startDate, endDate)
            Result.success(events)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getTeamSubteams(teamId: String): Result<List<Subteam>> {
        return try {
            val subteams = apiService.getTeamSubteams(teamId)
            Result.success(subteams)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getSubteam(teamId: String, subteamId: String): Result<Subteam> {
        return try {
            val subteam = apiService.getSubteam(teamId, subteamId)
            Result.success(subteam)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun saveSelectedTeamId(teamId: String) {
        preferencesManager.saveSelectedTeamId(teamId)
    }

    suspend fun getSelectedTeamId(): String? {
        return preferencesManager.selectedTeamId.first()
    }
}

