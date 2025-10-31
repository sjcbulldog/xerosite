package com.example.xeroteamsite.data.preferences

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "xerosite_prefs")

class PreferencesManager(private val context: Context) {

    companion object {
        private val AUTH_TOKEN_KEY = stringPreferencesKey("auth_token")
        private val SELECTED_TEAM_ID_KEY = stringPreferencesKey("selected_team_id")
    }

    val authToken: Flow<String?> = context.dataStore.data.map { preferences ->
        preferences[AUTH_TOKEN_KEY]
    }

    val selectedTeamId: Flow<String?> = context.dataStore.data.map { preferences ->
        preferences[SELECTED_TEAM_ID_KEY]
    }

    suspend fun saveAuthToken(token: String) {
        context.dataStore.edit { preferences ->
            preferences[AUTH_TOKEN_KEY] = token
        }
    }

    suspend fun clearAuthToken() {
        context.dataStore.edit { preferences ->
            preferences.remove(AUTH_TOKEN_KEY)
        }
    }

    suspend fun saveSelectedTeamId(teamId: String) {
        context.dataStore.edit { preferences ->
            preferences[SELECTED_TEAM_ID_KEY] = teamId
        }
    }

    suspend fun clearSelectedTeamId() {
        context.dataStore.edit { preferences ->
            preferences.remove(SELECTED_TEAM_ID_KEY)
        }
    }
}

