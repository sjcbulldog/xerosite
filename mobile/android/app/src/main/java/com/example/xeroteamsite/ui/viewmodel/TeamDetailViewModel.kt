package com.example.xeroteamsite.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.xeroteamsite.data.model.*
import com.example.xeroteamsite.data.repository.XerositeRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class TeamDetailUiState(
    val team: Team? = null,
    val members: List<TeamMember> = emptyList(),
    val links: List<TeamLink> = emptyList(),
    val media: List<TeamMedia> = emptyList(),
    val events: List<Event> = emptyList(),
    val subteams: List<Subteam> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null
)

class TeamDetailViewModel(private val repository: XerositeRepository) : ViewModel() {

    private val _uiState = MutableStateFlow(TeamDetailUiState(isLoading = true))
    val uiState: StateFlow<TeamDetailUiState> = _uiState.asStateFlow()

    fun loadTeamDetails(teamId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            // Load team info
            repository.getTeam(teamId).fold(
                onSuccess = { team ->
                    _uiState.value = _uiState.value.copy(team = team)
                },
                onFailure = { exception ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = exception.message ?: "Failed to load team"
                    )
                    return@launch
                }
            )

            // Load members
            repository.getTeamMembers(teamId).fold(
                onSuccess = { members ->
                    _uiState.value = _uiState.value.copy(members = members)
                },
                onFailure = { }
            )

            // Load links
            repository.getTeamLinks(teamId).fold(
                onSuccess = { links ->
                    _uiState.value = _uiState.value.copy(links = links)
                },
                onFailure = { }
            )

            // Load media
            repository.getTeamMedia(teamId).fold(
                onSuccess = { media ->
                    _uiState.value = _uiState.value.copy(media = media)
                },
                onFailure = { }
            )

            // Load events
            repository.getTeamEvents(teamId).fold(
                onSuccess = { events ->
                    _uiState.value = _uiState.value.copy(events = events)
                },
                onFailure = { }
            )

            // Load subteams
            repository.getTeamSubteams(teamId).fold(
                onSuccess = { subteams ->
                    _uiState.value = _uiState.value.copy(subteams = subteams)
                },
                onFailure = { }
            )

            _uiState.value = _uiState.value.copy(isLoading = false)
        }
    }

    fun refresh(teamId: String) {
        loadTeamDetails(teamId)
    }
}

