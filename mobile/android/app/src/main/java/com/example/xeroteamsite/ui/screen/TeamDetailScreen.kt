
                    // Navigation Cards
                    item {
                        NavigationCard(
                            title = "Team Members",
                            subtitle = "${uiState.members.size} members",
                            icon = Icons.Default.Person,
                            onClick = onNavigateToMembers
                        )
                    }

                    item {
                        NavigationCard(
                            title = "Useful Links",
                            subtitle = "${uiState.links.size} links",
                            icon = Icons.Default.Link,
                            onClick = onNavigateToLinks
                        )
                    }

                    item {
                        NavigationCard(
                            title = "Team Media",
                            subtitle = "${uiState.media.size} files",
                            icon = Icons.Default.Image,
                            onClick = onNavigateToMedia
                        )
                    }

                    item {
                        NavigationCard(
                            title = "Calendar",
                            subtitle = "${uiState.events.size} events",
                            icon = Icons.Default.CalendarToday,
                            onClick = onNavigateToEvents
                        )
                    }

                    item {
                        NavigationCard(
                            title = "Subteams",
                            subtitle = "${uiState.subteams.size} subteams",
                            icon = Icons.Default.Group,
                            onClick = onNavigateToSubteams
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun TeamInfoCard(
    name: String,
    teamNumber: Int?,
    description: String?
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.primaryContainer
        )
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Text(
                text = name,
                style = MaterialTheme.typography.headlineMedium
            )
            if (teamNumber != null) {
                Text(
                    text = "Team #$teamNumber",
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.onPrimaryContainer
                )
            }
            if (!description.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = description,
                    style = MaterialTheme.typography.bodyMedium
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NavigationCard(
    title: String,
    subtitle: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    onClick: () -> Unit
) {
    Card(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .padding(16.dp)
                .fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                modifier = Modifier.size(40.dp),
                tint = MaterialTheme.colorScheme.primary
            )
            Spacer(modifier = Modifier.width(16.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleMedium
                )
                Text(
                    text = subtitle,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Icon(
                imageVector = Icons.Default.ChevronRight,
                contentDescription = "Navigate",
                tint = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}
package com.example.xeroteamsite.ui.screen

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.example.xeroteamsite.ui.viewmodel.TeamDetailViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TeamDetailScreen(
    teamId: String,
    viewModel: TeamDetailViewModel,
    onNavigateToMembers: () -> Unit,
    onNavigateToLinks: () -> Unit,
    onNavigateToMedia: () -> Unit,
    onNavigateToEvents: () -> Unit,
    onNavigateToSubteams: () -> Unit,
    onBack: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(teamId) {
        viewModel.loadTeamDetails(teamId)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(uiState.team?.name ?: "Team Details") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
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
            if (uiState.isLoading && uiState.team == null) {
                CircularProgressIndicator(
                    modifier = Modifier.align(Alignment.Center)
                )
            } else if (uiState.error != null && uiState.team == null) {
                Column(
                    modifier = Modifier
                        .align(Alignment.Center)
                        .padding(16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = uiState.error ?: "Unknown error",
                        color = MaterialTheme.colorScheme.error
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Button(onClick = { viewModel.refresh(teamId) }) {
                        Text("Retry")
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    // Team Info
                    item {
                        TeamInfoCard(
                            name = uiState.team?.name ?: "",
                            teamNumber = uiState.team?.teamNumber,
                            description = uiState.team?.description
                        )
                    }

