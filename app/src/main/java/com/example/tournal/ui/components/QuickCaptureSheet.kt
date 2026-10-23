package com.example.tournal.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.tournal.data.model.EffortState
import com.example.tournal.data.model.TaskPriority
import com.example.tournal.ui.viewmodel.TournalViewModel

enum class QuickCaptureType {
    TASK, JOURNAL, WORKOUT, DIET, EXPENSE
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun QuickCaptureSheet(
    viewModel: TournalViewModel,
    onDismiss: () -> Unit
) {
    var selectedType by remember { mutableStateOf(QuickCaptureType.TASK) }
    var titleInput by remember { mutableStateOf("") }
    var secondaryInput by remember { mutableStateOf("") }
    var numericInput1 by remember { mutableStateOf("") }
    var numericInput2 by remember { mutableStateOf("") }
    var isSimulatingVoice by remember { mutableStateOf(false) }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = MaterialTheme.colorScheme.surface,
        dragHandle = { BottomSheetDefaults.DragHandle() },
        modifier = Modifier.testTag("quick_capture_sheet")
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp)
                .padding(bottom = 32.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Header with Voice Sim Indicator
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Quick Voice & Text Capture",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                IconButton(
                    onClick = {
                        isSimulatingVoice = !isSimulatingVoice
                        if (isSimulatingVoice && titleInput.isBlank()) {
                            when (selectedType) {
                                QuickCaptureType.TASK -> titleInput = "Call architect regarding site plans tomorrow morning"
                                QuickCaptureType.JOURNAL -> titleInput = "Focus block went exceptionally well with zero distractions"
                                QuickCaptureType.WORKOUT -> {
                                    titleInput = "Flat Dumbbell Press"
                                    numericInput1 = "85"
                                    numericInput2 = "10"
                                }
                                QuickCaptureType.DIET -> {
                                    titleInput = "Salmon fillet with asparagus"
                                    numericInput1 = "480"
                                    numericInput2 = "45"
                                }
                                QuickCaptureType.EXPENSE -> {
                                    titleInput = "Co-working day pass"
                                    numericInput1 = "35"
                                }
                            }
                        }
                    },
                    modifier = Modifier
                        .size(44.dp)
                        .background(
                            if (isSimulatingVoice) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant,
                            CircleShape
                        )
                        .testTag("voice_simulate_button")
                ) {
                    Icon(
                        imageVector = Icons.Default.Mic,
                        contentDescription = "Voice Capture",
                        tint = if (isSimulatingVoice) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            if (isSimulatingVoice) {
                Surface(
                    color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.4f),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.GraphicEq,
                            contentDescription = "Voice Wave",
                            tint = MaterialTheme.colorScheme.primary
                        )
                        Text(
                            text = "Wispr voice transcription active...",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                    }
                }
            }

            // Category Chips
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                QuickCaptureType.values().forEach { type ->
                    FilterChip(
                        selected = selectedType == type,
                        onClick = {
                            selectedType = type
                            titleInput = ""
                            secondaryInput = ""
                            numericInput1 = ""
                            numericInput2 = ""
                        },
                        label = { Text(type.name.lowercase().replaceFirstChar { it.uppercase() }) },
                        modifier = Modifier.testTag("capture_tab_${type.name.lowercase()}")
                    )
                }
            }

            // Input Fields based on Type
            when (selectedType) {
                QuickCaptureType.TASK -> {
                    OutlinedTextField(
                        value = titleInput,
                        onValueChange = { titleInput = it },
                        label = { Text("Task Title") },
                        placeholder = { Text("e.g., Review client agreement") },
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("capture_task_title_input")
                    )
                    OutlinedTextField(
                        value = secondaryInput,
                        onValueChange = { secondaryInput = it },
                        label = { Text("Notes & Time (Optional)") },
                        placeholder = { Text("e.g., High priority at 10:00 AM") },
                        modifier = Modifier.fillMaxWidth()
                    )
                }
                QuickCaptureType.JOURNAL -> {
                    OutlinedTextField(
                        value = titleInput,
                        onValueChange = { titleInput = it },
                        label = { Text("Journal Reflection / Thought") },
                        placeholder = { Text("Capture quick insight or reflection...") },
                        minLines = 3,
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("capture_journal_content_input")
                    )
                }
                QuickCaptureType.WORKOUT -> {
                    OutlinedTextField(
                        value = titleInput,
                        onValueChange = { titleInput = it },
                        label = { Text("Exercise Name") },
                        placeholder = { Text("e.g. Barbell Squat") },
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("capture_exercise_name_input")
                    )
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        OutlinedTextField(
                            value = numericInput1,
                            onValueChange = { numericInput1 = it },
                            label = { Text("Weight (lbs)") },
                            modifier = Modifier.weight(1f)
                        )
                        OutlinedTextField(
                            value = numericInput2,
                            onValueChange = { numericInput2 = it },
                            label = { Text("Reps") },
                            modifier = Modifier.weight(1f)
                        )
                    }
                }
                QuickCaptureType.DIET -> {
                    OutlinedTextField(
                        value = titleInput,
                        onValueChange = { titleInput = it },
                        label = { Text("Food / Meal Item") },
                        placeholder = { Text("e.g. Grilled Chicken & Rice") },
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("capture_food_name_input")
                    )
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        OutlinedTextField(
                            value = numericInput1,
                            onValueChange = { numericInput1 = it },
                            label = { Text("Calories") },
                            placeholder = { Text("500") },
                            modifier = Modifier.weight(1f)
                        )
                        OutlinedTextField(
                            value = numericInput2,
                            onValueChange = { numericInput2 = it },
                            label = { Text("Protein (g)") },
                            placeholder = { Text("40") },
                            modifier = Modifier.weight(1f)
                        )
                    }
                }
                QuickCaptureType.EXPENSE -> {
                    OutlinedTextField(
                        value = titleInput,
                        onValueChange = { titleInput = it },
                        label = { Text("Expense Item") },
                        placeholder = { Text("e.g. Flight ticket") },
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("capture_expense_name_input")
                    )
                    OutlinedTextField(
                        value = numericInput1,
                        onValueChange = { numericInput1 = it },
                        label = { Text("Amount ($)") },
                        placeholder = { Text("125.00") },
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }

            // Submit Button
            Button(
                onClick = {
                    if (titleInput.isNotBlank()) {
                        when (selectedType) {
                            QuickCaptureType.TASK -> {
                                viewModel.addTask(
                                    title = titleInput,
                                    notes = secondaryInput,
                                    priority = TaskPriority.HIGH
                                )
                            }
                            QuickCaptureType.JOURNAL -> {
                                viewModel.saveJournal(
                                    title = "Quick Note: " + titleInput.take(30),
                                    content = titleInput,
                                    sessionType = "midday_note"
                                )
                            }
                            QuickCaptureType.WORKOUT -> {
                                val weight = numericInput1.toFloatOrNull() ?: 50f
                                val reps = numericInput2.toIntOrNull() ?: 10
                                viewModel.addWorkout(
                                    name = titleInput,
                                    weight = weight,
                                    weightUnit = "lbs",
                                    sets = 3,
                                    reps = reps,
                                    effort = EffortState.IN_CONTROL
                                )
                            }
                            QuickCaptureType.DIET -> {
                                val cals = numericInput1.toIntOrNull() ?: 350
                                val protein = numericInput2.toIntOrNull() ?: 25
                                viewModel.addDietEntry(
                                    name = titleInput,
                                    quantity = "1 serving",
                                    calories = cals,
                                    protein = protein,
                                    carbs = 30,
                                    fat = 10,
                                    fiber = 4
                                )
                            }
                            QuickCaptureType.EXPENSE -> {
                                val amount = numericInput1.toFloatOrNull() ?: 20f
                                viewModel.addExpense(
                                    name = titleInput,
                                    amount = amount,
                                    category = "General"
                                )
                            }
                        }
                        onDismiss()
                    }
                },
                enabled = titleInput.isNotBlank(),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp)
                    .testTag("confirm_quick_capture_button")
            ) {
                Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text("Save Entry", style = MaterialTheme.typography.titleMedium)
            }
        }
    }
}
