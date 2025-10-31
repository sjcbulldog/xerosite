package com.example.xeroteamsite.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.xeroteamsite.data.model.Team
import com.example.xeroteamsite.data.repository.XerositeRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed class TeamListState {
    object Idle : TeamListState()
    object Loading : TeamListState()
    data class Success(val teams: List<Team>) : TeamListState()
    data class Error(val message: String) : TeamListState()
}

class TeamListViewModel(private val repository: XerositeRepository) : ViewModel() {

    private val _teamListState = MutableStateFlow<TeamListState>(TeamListState.Idle)
    val teamListState: StateFlow<TeamListState> = _teamListState.asStateFlow()

    init {
        loadTeams()
    }

    fun loadTeams() {
        viewModelScope.launch {
            _teamListState.value = TeamListState.Loading
            repository.getTeams().fold(
                onSuccess = { teams ->
                    _teamListState.value = TeamListState.Success(teams)
                },
                onFailure = { exception ->
                    _teamListState.value = TeamListState.Error(exception.message ?: "Failed to load teams")
                }
            )
        }
    }

    fun selectTeam(teamId: String) {
        viewModelScope.launch {
            repository.saveSelectedTeamId(teamId)
        }
    }
}

