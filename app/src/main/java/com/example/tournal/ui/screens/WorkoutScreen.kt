package com.example.tournal.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.tournal.data.model.EffortState
import com.example.tournal.data.model.WorkoutExercise
import com.example.tournal.ui.components.DateNavigator
import com.example.tournal.ui.theme.EmeraldAccent
import com.example.tournal.ui.theme.PriorityHigh
import com.example.tournal.ui.viewmodel.TournalViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WorkoutScreen(
    viewModel: TournalViewModel,
    modifier: Modifier = Modifier
) {
    val uiState by viewModel.uiState.collectAsState()
    var showAddDialog by remember { mutableStateOf(false) }
    var showWeightDialog by remember { mutableStateOf(false) }

    // Dialog state
    var exerciseName by remember { mutableStateOf("") }
    var weightInput by remember { mutableStateOf("135") }
    var setsInput by remember { mutableStateOf("4") }
    var repsInput by remember { mutableStateOf("8") }
    var effortState by remember { mutableStateOf(EffortState.IN_CONTROL) }
    var notesInput by remember { mutableStateOf("") }
    var bodyWeightInput by remember { mutableStateOf("") }

    val todayWorkouts = uiState.workouts.filter { it.date == uiState.selectedDate }
    val todayMetric = uiState.bodyMetrics.find { it.date == uiState.selectedDate }

    Scaffold(
        floatingActionButton = {
            FloatingActionButton(
                onClick = { showAddDialog = true },
                containerColor = MaterialTheme.colorScheme.primary,
                contentColor = Color.White,
                shape = CircleShape,
                modifier = Modifier.testTag("add_workout_fab")
            ) {
                Icon(Icons.Default.Add, contentDescription = "Log Exercise")
            }
        },
        modifier = modifier.fillMaxSize()
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            // Date Navigator
            DateNavigator(
                selectedDate = uiState.selectedDate,
                onPreviousDay = { viewModel.offsetDate(-1) },
                onNextDay = { viewModel.offsetDate(1) },
                onToday = { viewModel.setToday() }
            )

            // Bodyweight & Overview Header Card
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
                ),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(
                            text = "Daily Body Metric",
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Text(
                            text = if (todayMetric != null) "${todayMetric.bodyWeight} ${todayMetric.bodyWeightUnit}" else "Not logged today",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                    }

                    OutlinedButton(
                        onClick = { showWeightDialog = true },
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.testTag("log_weight_button")
                    ) {
                        Icon(Icons.Default.Scale, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Log Weight")
                    }
                }
            }

            // Exercise Count Title
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Training Ledger (${todayWorkouts.size} exercises)",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )
            }

            // Exercise List
            if (todayWorkouts.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.FitnessCenter,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(56.dp)
                        )
                        Text(
                            text = "No training logged for this day",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold
                        )
                        Text(
                            text = "Tap + to log your exercises, sets, and effort state",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f)
                        .testTag("workouts_list"),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(todayWorkouts, key = { it.id }) { workout ->
                        WorkoutExerciseCard(
                            workout = workout,
                            onDelete = { viewModel.deleteWorkout(workout.id) }
                        )
                    }
                }
            }
        }
    }

    // Add Workout Dialog
    if (showAddDialog) {
        AlertDialog(
            onDismissRequest = { showAddDialog = false },
            title = {
                Text(
                    text = "Log Workout Exercise",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold
                )
            },
            text = {
                Column(
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    OutlinedTextField(
                        value = exerciseName,
                        onValueChange = { exerciseName = it },
                        label = { Text("Exercise Name") },
                        placeholder = { Text("e.g. Barbell Squat") },
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("workout_name_input")
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        OutlinedTextField(
                            value = weightInput,
                            onValueChange = { weightInput = it },
                            label = { Text("Weight (lbs)") },
                            modifier = Modifier.weight(1f)
                        )
                        OutlinedTextField(
                            value = setsInput,
                            onValueChange = { setsInput = it },
                            label = { Text("Sets") },
                            modifier = Modifier.weight(1f)
                        )
                        OutlinedTextField(
                            value = repsInput,
                            onValueChange = { repsInput = it },
                            label = { Text("Reps") },
                            modifier = Modifier.weight(1f)
                        )
                    }

                    // Effort State Switcher
                    Text("Effort State", style = MaterialTheme.typography.labelMedium)
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        FilterChip(
                            selected = effortState == EffortState.IN_CONTROL,
                            onClick = { effortState = EffortState.IN_CONTROL },
                            label = { Text("In Control") },
                            modifier = Modifier.weight(1f)
                        )
                        FilterChip(
                            selected = effortState == EffortState.TO_FAILURE,
                            onClick = { effortState = EffortState.TO_FAILURE },
                            label = { Text("To Failure") },
                            modifier = Modifier.weight(1f)
                        )
                    }

                    OutlinedTextField(
                        value = notesInput,
                        onValueChange = { notesInput = it },
                        label = { Text("Cues / Notes") },
                        placeholder = { Text("e.g. RPE 9, 3-second negative") },
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (exerciseName.isNotBlank()) {
                            viewModel.addWorkout(
                                name = exerciseName,
                                weight = weightInput.toFloatOrNull() ?: 100f,
                                weightUnit = "lbs",
                                sets = setsInput.toIntOrNull() ?: 3,
                                reps = repsInput.toIntOrNull() ?: 10,
                                effort = effortState,
                                notes = notesInput
                            )
                            exerciseName = ""
                            notesInput = ""
                            showAddDialog = false
                        }
                    },
                    enabled = exerciseName.isNotBlank(),
                    modifier = Modifier.testTag("confirm_workout_button")
                ) {
                    Text("Save Exercise")
                }
            },
            dismissButton = {
                TextButton(onClick = { showAddDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }

    // Log Body Weight Dialog
    if (showWeightDialog) {
        AlertDialog(
            onDismissRequest = { showWeightDialog = false },
            title = { Text("Log Body Weight") },
            text = {
                OutlinedTextField(
                    value = bodyWeightInput,
                    onValueChange = { bodyWeightInput = it },
                    label = { Text("Weight (lbs)") },
                    placeholder = { Text("e.g. 178.5") },
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("bodyweight_input")
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        val parsed = bodyWeightInput.toFloatOrNull()
                        if (parsed != null && parsed > 0) {
                            viewModel.logBodyMetric(parsed, "lbs")
                            bodyWeightInput = ""
                            showWeightDialog = false
                        }
                    },
                    modifier = Modifier.testTag("confirm_weight_button")
                ) {
                    Text("Save")
                }
            },
            dismissButton = {
                TextButton(onClick = { showWeightDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }
}

@Composable
fun WorkoutExerciseCard(
    workout: WorkoutExercise,
    onDelete: () -> Unit
) {
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
        ),
        modifier = Modifier
            .fillMaxWidth()
            .testTag("workout_card_${workout.id}")
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Text(
                    text = workout.exerciseName,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )

                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "${workout.sets} sets × ${workout.reps} reps @ ${workout.weight.toInt()} ${workout.weightUnit}",
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Medium,
                        color = MaterialTheme.colorScheme.primary
                    )

                    // Effort state badge
                    val isFailure = workout.effortState == EffortState.TO_FAILURE
                    Surface(
                        color = (if (isFailure) PriorityHigh else EmeraldAccent).copy(alpha = 0.15f),
                        shape = RoundedCornerShape(6.dp)
                    ) {
                        Text(
                            text = if (isFailure) "To Failure" else "In Control",
                            style = MaterialTheme.typography.labelSmall,
                            color = if (isFailure) PriorityHigh else MaterialTheme.colorScheme.primary,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                }

                if (workout.notes.isNotBlank()) {
                    Text(
                        text = workout.notes,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            IconButton(
                onClick = onDelete,
                modifier = Modifier.size(36.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.DeleteOutline,
                    contentDescription = "Delete Exercise",
                    tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f),
                    modifier = Modifier.size(20.dp)
                )
            }
        }
    }
}
