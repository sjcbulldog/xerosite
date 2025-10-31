package com.example.xeroteamsite.ui.navigation

sealed class Screen(val route: String) {
    object Login : Screen("login")
    object TeamList : Screen("team_list")
    object TeamDetail : Screen("team_detail/{teamId}") {
        fun createRoute(teamId: String) = "team_detail/$teamId"
    }
    object TeamMembers : Screen("team_members")
    object TeamLinks : Screen("team_links")
    object TeamMedia : Screen("team_media")
    object TeamEvents : Screen("team_events")
    object TeamSubteams : Screen("team_subteams")
}
package com.example.xeroteamsite.ui.screen

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Event
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.example.xeroteamsite.data.model.Event
import com.example.xeroteamsite.ui.viewmodel.TeamDetailViewModel
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TeamEventsScreen(
    viewModel: TeamDetailViewModel,
    onBack: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Calendar") },
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
            if (uiState.isLoading) {
                CircularProgressIndicator(
                    modifier = Modifier.align(Alignment.Center)
                )
            } else if (uiState.events.isEmpty()) {
                Text(
                    text = "No upcoming events",
                    modifier = Modifier
                        .align(Alignment.Center)
                        .padding(16.dp)
                )
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(uiState.events) { event ->
                        EventCard(event)
                    }
                }
            }
        }
    }
}

@Composable
fun EventCard(event: Event) {
    Card(
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .padding(16.dp)
                .fillMaxWidth()
        ) {
            Icon(
                imageVector = Icons.Default.Event,
                contentDescription = null,
                modifier = Modifier.size(40.dp),
                tint = MaterialTheme.colorScheme.primary
            )
            Spacer(modifier = Modifier.width(16.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = event.name,
                    style = MaterialTheme.typography.titleMedium
                )
                if (!event.description.isNullOrBlank()) {
                    Text(
                        text = event.description,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = formatEventDateTime(event.startDateTime),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                if (!event.location.isNullOrBlank()) {
                    Text(
                        text = "📍 ${event.location}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                if (event.recurrenceType != null && event.recurrenceType != "none") {
                    Text(
                        text = "🔁 ${event.recurrenceType.capitalize()}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
            }
        }
    }
}

private fun formatEventDateTime(dateTimeString: String): String {
    return try {
        val dateTime = ZonedDateTime.parse(dateTimeString)
        dateTime.format(DateTimeFormatter.ofPattern("MMM dd, yyyy 'at' h:mm a"))
    } catch (e: Exception) {
        dateTimeString
    }
}

private fun String.capitalize(): String {
    return replaceFirstChar { if (it.isLowerCase()) it.titlecase() else it.toString() }
}

