package com.example.tournal

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.animation.Crossfade
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.tournal.ui.components.QuickCaptureSheet
import com.example.tournal.ui.screens.*
import com.example.tournal.ui.theme.TournalTheme
import com.example.tournal.ui.viewmodel.AppScreen
import com.example.tournal.ui.viewmodel.TournalViewModel

class MainActivity : ComponentActivity() {

    private val viewModel: TournalViewModel by viewModels()

    @OptIn(ExperimentalMaterial3Api::class)
    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)

        setContent {
            val uiState by viewModel.uiState.collectAsState()

            val isDarkTheme = when (uiState.settings.theme) {
                "dark" -> true
                "light" -> false
                else -> isSystemInDarkTheme()
            }

            TournalTheme(darkTheme = isDarkTheme) {
                // Back handler when on secondary screens
                if (uiState.currentScreen !in listOf(
                        AppScreen.TASKS,
                        AppScreen.JOURNAL,
                        AppScreen.WORKOUTS,
                        AppScreen.DIET,
                        AppScreen.EXPENSES
                    )
                ) {
                    BackHandler {
                        viewModel.navigateTo(AppScreen.TASKS)
                    }
                }

                Scaffold(
                    contentWindowInsets = WindowInsets.safeDrawing,
                    topBar = {
                        TopAppBar(
                            title = {
                                Text(
                                    text = "Tournal",
                                    style = MaterialTheme.typography.titleLarge,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                            },
                            actions = {
                                IconButton(
                                    onClick = { viewModel.navigateTo(AppScreen.ASSISTANT) },
                                    modifier = Modifier.testTag("top_bar_assistant_button")
                                ) {
                                    Icon(
                                        imageVector = if (uiState.currentScreen == AppScreen.ASSISTANT) Icons.Default.AutoAwesome else Icons.Outlined.AutoAwesome,
                                        contentDescription = "Assistant",
                                        tint = if (uiState.currentScreen == AppScreen.ASSISTANT) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                                IconButton(
                                    onClick = { viewModel.navigateTo(AppScreen.WIDGETS) },
                                    modifier = Modifier.testTag("top_bar_widgets_button")
                                ) {
                                    Icon(
                                        imageVector = if (uiState.currentScreen == AppScreen.WIDGETS) Icons.Default.Widgets else Icons.Outlined.Widgets,
                                        contentDescription = "Widgets",
                                        tint = if (uiState.currentScreen == AppScreen.WIDGETS) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                                IconButton(
                                    onClick = { viewModel.navigateTo(AppScreen.PROFILE) },
                                    modifier = Modifier.testTag("top_bar_profile_button")
                                ) {
                                    Icon(
                                        imageVector = if (uiState.currentScreen == AppScreen.PROFILE) Icons.Default.AccountCircle else Icons.Outlined.AccountCircle,
                                        contentDescription = "Profile",
                                        tint = if (uiState.currentScreen == AppScreen.PROFILE) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                                IconButton(
                                    onClick = { viewModel.navigateTo(AppScreen.SETTINGS) },
                                    modifier = Modifier.testTag("top_bar_settings_button")
                                ) {
                                    Icon(
                                        imageVector = if (uiState.currentScreen == AppScreen.SETTINGS) Icons.Default.Settings else Icons.Outlined.Settings,
                                        contentDescription = "Settings",
                                        tint = if (uiState.currentScreen == AppScreen.SETTINGS) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            },
                            colors = TopAppBarDefaults.topAppBarColors(
                                containerColor = MaterialTheme.colorScheme.surface
                            )
                        )
                    },
                    bottomBar = {
                        NavigationBar(
                            containerColor = MaterialTheme.colorScheme.surface,
                            tonalElevation = 6.dp,
                            modifier = Modifier.testTag("bottom_nav_bar")
                        ) {
                            NavigationBarItem(
                                selected = uiState.currentScreen == AppScreen.JOURNAL,
                                onClick = { viewModel.navigateTo(AppScreen.JOURNAL) },
                                icon = {
                                    Icon(
                                        imageVector = if (uiState.currentScreen == AppScreen.JOURNAL) Icons.Default.Book else Icons.Outlined.Book,
                                        contentDescription = "Journal"
                                    )
                                },
                                label = { Text("Journal") },
                                modifier = Modifier.testTag("nav_tab_journal")
                            )

                            NavigationBarItem(
                                selected = uiState.currentScreen == AppScreen.WORKOUTS,
                                onClick = { viewModel.navigateTo(AppScreen.WORKOUTS) },
                                icon = {
                                    Icon(
                                        imageVector = if (uiState.currentScreen == AppScreen.WORKOUTS) Icons.Default.FitnessCenter else Icons.Outlined.FitnessCenter,
                                        contentDescription = "Workouts"
                                    )
                                },
                                label = { Text("Workouts") },
                                modifier = Modifier.testTag("nav_tab_workouts")
                            )

                            NavigationBarItem(
                                selected = uiState.currentScreen == AppScreen.TASKS,
                                onClick = { viewModel.navigateTo(AppScreen.TASKS) },
                                icon = {
                                    Icon(
                                        imageVector = if (uiState.currentScreen == AppScreen.TASKS) Icons.Default.CheckCircle else Icons.Outlined.CheckCircle,
                                        contentDescription = "Tasks"
                                    )
                                },
                                label = { Text("Tasks") },
                                modifier = Modifier.testTag("nav_tab_tasks")
                            )

                            NavigationBarItem(
                                selected = uiState.currentScreen == AppScreen.DIET,
                                onClick = { viewModel.navigateTo(AppScreen.DIET) },
                                icon = {
                                    Icon(
                                        imageVector = if (uiState.currentScreen == AppScreen.DIET) Icons.Default.Restaurant else Icons.Outlined.Restaurant,
                                        contentDescription = "Diet"
                                    )
                                },
                                label = { Text("Diet") },
                                modifier = Modifier.testTag("nav_tab_diet")
                            )

                            NavigationBarItem(
                                selected = uiState.currentScreen == AppScreen.EXPENSES,
                                onClick = { viewModel.navigateTo(AppScreen.EXPENSES) },
                                icon = {
                                    Icon(
                                        imageVector = if (uiState.currentScreen == AppScreen.EXPENSES) Icons.Default.ReceiptLong else Icons.Outlined.ReceiptLong,
                                        contentDescription = "Expenses"
                                    )
                                },
                                label = { Text("Expenses") },
                                modifier = Modifier.testTag("nav_tab_expenses")
                            )
                        }
                    },
                    floatingActionButton = {
                        FloatingActionButton(
                            onClick = { viewModel.openQuickCapture() },
                            containerColor = MaterialTheme.colorScheme.primary,
                            contentColor = Color.White,
                            shape = CircleShape,
                            modifier = Modifier
                                .offset(y = (-8).dp)
                                .testTag("quick_capture_fab")
                        ) {
                            Icon(Icons.Default.Mic, contentDescription = "Quick Voice & Text Capture")
                        }
                    },
                    modifier = Modifier.fillMaxSize()
                ) { innerPadding ->
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(innerPadding)
                    ) {
                        Crossfade(targetState = uiState.currentScreen, label = "ScreenTransition") { screen ->
                            when (screen) {
                                AppScreen.TASKS -> TasksScreen(viewModel = viewModel)
                                AppScreen.JOURNAL -> JournalScreen(viewModel = viewModel)
                                AppScreen.WORKOUTS -> WorkoutScreen(viewModel = viewModel)
                                AppScreen.DIET -> DietScreen(viewModel = viewModel)
                                AppScreen.EXPENSES -> ExpensesScreen(viewModel = viewModel)
                                AppScreen.ASSISTANT -> AssistantScreen(viewModel = viewModel)
                                AppScreen.PROFILE -> ProfileScreen(viewModel = viewModel)
                                AppScreen.SETTINGS -> SettingsScreen(viewModel = viewModel)
                                AppScreen.WIDGETS -> WidgetsGalleryScreen(viewModel = viewModel)
                            }
                        }
                    }

                    if (uiState.isQuickCaptureOpen) {
                        QuickCaptureSheet(
                            viewModel = viewModel,
                            onDismiss = { viewModel.closeQuickCapture() }
                        )
                    }
                }
            }
        }
    }
}
