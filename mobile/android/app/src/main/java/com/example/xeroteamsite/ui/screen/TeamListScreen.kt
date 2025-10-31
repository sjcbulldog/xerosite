package com.example.xeroteamsite.ui.screen

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.example.xeroteamsite.data.model.Team
import com.example.xeroteamsite.ui.viewmodel.TeamListState
import com.example.xeroteamsite.ui.viewmodel.TeamListViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TeamListScreen(
    viewModel: TeamListViewModel,
    onTeamSelected: (String) -> Unit,
    onLogout: () -> Unit
) {
    val teamListState by viewModel.teamListState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Select a Team") },
                actions = {
                    TextButton(onClick = onLogout) {
                        Text("Logout")
                    }
                }
            )
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            when (val state = teamListState) {
                is TeamListState.Loading -> {
                    CircularProgressIndicator(
                        modifier = Modifier.align(Alignment.Center)
                    )
                }
                is TeamListState.Success -> {
                    if (state.teams.isEmpty()) {
                        Text(
                            text = "No teams found. Please join a team first.",
                            modifier = Modifier
                                .align(Alignment.Center)
                                .padding(16.dp),
                            style = MaterialTheme.typography.bodyLarge
                        )
                    } else {
                        LazyColumn(
                            modifier = Modifier.fillMaxSize(),
                            contentPadding = PaddingValues(16.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            items(state.teams) { team ->
                                TeamListItem(
                                    team = team,
                                    onClick = {
                                        viewModel.selectTeam(team.id)
                                        onTeamSelected(team.id)
                                    }
                                )
                            }
                        }
                    }
                }
                is TeamListState.Error -> {
                    Column(
                        modifier = Modifier
                            .align(Alignment.Center)
                            .padding(16.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            text = state.message,
                            color = MaterialTheme.colorScheme.error,
                            style = MaterialTheme.typography.bodyLarge
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Button(onClick = { viewModel.loadTeams() }) {
                            Text("Retry")
                        }
                    }
                }
                is TeamListState.Idle -> {
                    // Should not happen
                }
            }
        }
    }
}

@Composable
fun TeamListItem(
    team: Team,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Text(
                text = team.name,
                style = MaterialTheme.typography.titleLarge
            )
            if (team.teamNumber != null) {
                Text(
                    text = "Team #${team.teamNumber}",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            if (!team.description.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = team.description,
                    style = MaterialTheme.typography.bodyMedium
                )
            }
        }
    }
}

