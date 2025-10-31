package com.example.xeroteamsite.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import com.example.xeroteamsite.data.preferences.PreferencesManager
import com.example.xeroteamsite.data.repository.XerositeRepository
import com.example.xeroteamsite.ui.screen.*
import com.example.xeroteamsite.ui.viewmodel.LoginViewModel
import com.example.xeroteamsite.ui.viewmodel.TeamDetailViewModel
import com.example.xeroteamsite.ui.viewmodel.TeamListViewModel
import kotlinx.coroutines.launch

@Composable
fun NavGraph(
    navController: NavHostController,
    preferencesManager: PreferencesManager,
    startDestination: String = Screen.Login.route
) {
    val repository = remember { XerositeRepository(preferencesManager) }

    // Initialize auth token
    LaunchedEffect(Unit) {
        repository.initializeAuthToken()
    }

    NavHost(
        navController = navController,
        startDestination = startDestination
    ) {
        composable(Screen.Login.route) {
            val viewModel = remember { LoginViewModel(repository) }
            LoginScreen(
                viewModel = viewModel,
                onLoginSuccess = {
                    navController.navigate(Screen.TeamList.route) {
                        popUpTo(Screen.Login.route) { inclusive = true }
                    }
                }
            )
        }

        composable(Screen.TeamList.route) {
            val viewModel = remember { TeamListViewModel(repository) }
            val scope = rememberCoroutineScope()
            TeamListScreen(
                viewModel = viewModel,
                onTeamSelected = { teamId ->
                    navController.navigate(Screen.TeamDetail.createRoute(teamId))
                },
                onLogout = {
                    scope.launch {
                        repository.logout()
                    }
                    navController.navigate(Screen.Login.route) {
                        popUpTo(0) { inclusive = true }
                    }
                }
            )
        }

        composable(
            route = Screen.TeamDetail.route,
            arguments = listOf(navArgument("teamId") { type = NavType.StringType })
        ) { backStackEntry ->
            val teamId = backStackEntry.arguments?.getString("teamId") ?: return@composable
            val viewModel = remember { TeamDetailViewModel(repository) }

            TeamDetailScreen(
                teamId = teamId,
                viewModel = viewModel,
                onNavigateToMembers = {
                    navController.navigate(Screen.TeamMembers.route)
                },
                onNavigateToLinks = {
                    navController.navigate(Screen.TeamLinks.route)
                },
                onNavigateToMedia = {
                    navController.navigate(Screen.TeamMedia.route)
                },
                onNavigateToEvents = {
                    navController.navigate(Screen.TeamEvents.route)
                },
                onNavigateToSubteams = {
                    navController.navigate(Screen.TeamSubteams.route)
                },
                onBack = {
                    navController.popBackStack()
                }
            )
        }

        composable(Screen.TeamMembers.route) {
            val parentEntry = remember(navController) {
                navController.getBackStackEntry(Screen.TeamDetail.route)
            }
            val viewModel = remember { TeamDetailViewModel(repository) }

            TeamMembersScreen(
                viewModel = viewModel,
                onBack = { navController.popBackStack() }
            )
        }

        composable(Screen.TeamLinks.route) {
            val parentEntry = remember(navController) {
                navController.getBackStackEntry(Screen.TeamDetail.route)
            }
            val viewModel = remember { TeamDetailViewModel(repository) }

            TeamLinksScreen(
                viewModel = viewModel,
                onBack = { navController.popBackStack() }
            )
        }

        composable(Screen.TeamMedia.route) {
            val parentEntry = remember(navController) {
                navController.getBackStackEntry(Screen.TeamDetail.route)
            }
            val viewModel = remember { TeamDetailViewModel(repository) }

            TeamMediaScreen(
                viewModel = viewModel,
                onBack = { navController.popBackStack() }
            )
        }

        composable(Screen.TeamEvents.route) {
            val parentEntry = remember(navController) {
                navController.getBackStackEntry(Screen.TeamDetail.route)
            }
            val viewModel = remember { TeamDetailViewModel(repository) }

            TeamEventsScreen(
                viewModel = viewModel,
                onBack = { navController.popBackStack() }
            )
        }

        composable(Screen.TeamSubteams.route) {
            val parentEntry = remember(navController) {
                navController.getBackStackEntry(Screen.TeamDetail.route)
            }
            val viewModel = remember { TeamDetailViewModel(repository) }

            TeamSubteamsScreen(
                viewModel = viewModel,
                onBack = { navController.popBackStack() }
            )
        }
    }
}

