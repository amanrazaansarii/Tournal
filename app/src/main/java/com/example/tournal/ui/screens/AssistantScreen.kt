package com.example.tournal.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.tournal.ui.theme.EmeraldAccent
import com.example.tournal.ui.viewmodel.TournalViewModel

@Composable
fun AssistantScreen(
    viewModel: TournalViewModel,
    modifier: Modifier = Modifier
) {
    val uiState by viewModel.uiState.collectAsState()
    var selectedPrompt by remember { mutableStateOf<String?>(null) }
    var assistantResponse by remember { mutableStateOf<String?>(null) }

    val todayTasks = uiState.tasks.filter { it.date == uiState.selectedDate }
    val todayWorkouts = uiState.workouts.filter { it.date == uiState.selectedDate }
    val todayDiet = uiState.dietEntries.filter { it.date == uiState.selectedDate }
    val caloriesConsumed = todayDiet.sumOf { it.calories }

    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Hero Briefing Card
        Card(
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.5f)
            ),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(36.dp)
                            .background(MaterialTheme.colorScheme.primary, CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.AutoAwesome,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.onPrimary,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                    Text(
                        text = "Executive Daily Briefing",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                }

                Text(
                    text = "You have ${todayTasks.count { !it.completed }} pending tasks, ${todayWorkouts.size} workout exercises logged, and $caloriesConsumed kcal tracked today. Maintain your momentum into the afternoon block.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurface
                )
            }
        }

        // Quick Intelligence Prompts
        Text(
            text = "AI Insights & Suggestions",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold
        )

        val prompts = listOf(
            "Analyze my daily schedule & energy levels",
            "Generate training recovery advice",
            "Review today's macro compliance",
            "Draft evening journal reflection"
        )

        prompts.forEach { prompt ->
            OutlinedCard(
                onClick = {
                    selectedPrompt = prompt
                    assistantResponse = when (prompt) {
                        "Analyze my daily schedule & energy levels" ->
                            "High cognitive load detected for your morning deep work block. Schedule your 15-minute recovery walk before transitioning to afternoon logistics."
                        "Generate training recovery advice" ->
                            "You logged ${todayWorkouts.size} exercises with high intensity. Prioritize 40g protein post-workout and maintain minimum 7.5 hours sleep."
                        "Review today's macro compliance" ->
                            "You are currently at $caloriesConsumed / ${uiState.nutritionGoals.targetCalories} kcal. Ensure you hit your ${uiState.nutritionGoals.targetProteinGrams}g protein target."
                        else ->
                            "Summary: Focus on celebrating today's completed high-priority milestones and write down tomorrow's primary needle-mover."
                    }
                },
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("prompt_card_${prompt.take(10)}")
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(14.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = prompt,
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Medium,
                        modifier = Modifier.weight(1f)
                    )
                    Icon(
                        imageVector = Icons.Default.ChevronRight,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary
                    )
                }
            }
        }

        // Result Card
        if (assistantResponse != null) {
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant
                ),
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("assistant_response_card")
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Psychology,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(18.dp)
                        )
                        Text(
                            text = selectedPrompt ?: "Insight",
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }

                    Text(
                        text = assistantResponse ?: "",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                }
            }
        }
    }
}
