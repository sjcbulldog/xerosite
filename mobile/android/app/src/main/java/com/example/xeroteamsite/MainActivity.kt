package com.example.xeroteamsite

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.navigation.compose.rememberNavController
import com.example.xeroteamsite.data.preferences.PreferencesManager
import com.example.xeroteamsite.ui.navigation.NavGraph
import com.example.xeroteamsite.ui.navigation.Screen
import com.example.xeroteamsite.ui.theme.XeroTeamSiteTheme
import kotlinx.coroutines.flow.first

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        val preferencesManager = PreferencesManager(this)

        setContent {
            XeroTeamSiteTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    val navController = rememberNavController()
                    var startDestination by remember { mutableStateOf<String?>(null) }

                    // Determine start destination based on auth token
                    LaunchedEffect(Unit) {
                        val token = preferencesManager.authToken.first()
                        startDestination = if (token != null) {
                            Screen.TeamList.route
                        } else {
                            Screen.Login.route
                        }
                    }

                    // Only show NavGraph when start destination is determined
                    if (startDestination != null) {
                        NavGraph(
                            navController = navController,
                            preferencesManager = preferencesManager,
                            startDestination = startDestination!!
                        )
                    }
                }
            }
        }
    }
}