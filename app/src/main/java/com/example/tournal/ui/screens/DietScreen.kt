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
import com.example.tournal.data.model.DietEntry
import com.example.tournal.ui.components.DateNavigator
import com.example.tournal.ui.theme.AccentBlue
import com.example.tournal.ui.theme.AccentPurple
import com.example.tournal.ui.theme.EmeraldAccent
import com.example.tournal.ui.theme.PriorityMedium
import com.example.tournal.ui.viewmodel.TournalViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DietScreen(
    viewModel: TournalViewModel,
    modifier: Modifier = Modifier
) {
    val uiState by viewModel.uiState.collectAsState()
    var showAddDialog by remember { mutableStateOf(false) }

    // Dialog state
    var foodName by remember { mutableStateOf("") }
    var quantity by remember { mutableStateOf("1 serving") }
    var caloriesInput by remember { mutableStateOf("450") }
    var proteinInput by remember { mutableStateOf("35") }
    var carbsInput by remember { mutableStateOf("40") }
    var fatInput by remember { mutableStateOf("15") }
    var fiberInput by remember { mutableStateOf("6") }

    val todayDiet = uiState.dietEntries.filter { it.date == uiState.selectedDate }
    val totalCalories = todayDiet.sumOf { it.calories }
    val totalProtein = todayDiet.sumOf { it.proteinGrams }
    val totalCarbs = todayDiet.sumOf { it.carbsGrams }
    val totalFat = todayDiet.sumOf { it.fatGrams }
    val totalFiber = todayDiet.sumOf { it.fiberGrams }

    val goals = uiState.nutritionGoals

    Scaffold(
        floatingActionButton = {
            FloatingActionButton(
                onClick = { showAddDialog = true },
                containerColor = MaterialTheme.colorScheme.primary,
                contentColor = Color.White,
                shape = CircleShape,
                modifier = Modifier.testTag("add_diet_fab")
            ) {
                Icon(Icons.Default.Add, contentDescription = "Log Food")
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

            // Macro Overview Bento Card
            Card(
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
                ),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Daily Calorie Target",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold
                        )
                        Text(
                            text = "$totalCalories / ${goals.targetCalories} kcal",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }

                    // Calorie progress bar
                    val calRatio = (totalCalories.toFloat() / goals.targetCalories.coerceAtLeast(1)).coerceIn(0f, 1f)
                    LinearProgressIndicator(
                        progress = { calRatio },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(8.dp)
                            .clip(RoundedCornerShape(4.dp)),
                        color = MaterialTheme.colorScheme.primary,
                        trackColor = MaterialTheme.colorScheme.outline.copy(alpha = 0.3f)
                    )

                    // Macro pills row
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        MacroMetricPill("Protein", "${totalProtein}g", "/ ${goals.targetProteinGrams}g", EmeraldAccent)
                        MacroMetricPill("Carbs", "${totalCarbs}g", "/ ${goals.targetCarbsGrams}g", AccentBlue)
                        MacroMetricPill("Fat", "${totalFat}g", "/ ${goals.targetFatGrams}g", PriorityMedium)
                        MacroMetricPill("Fiber", "${totalFiber}g", "/ ${goals.targetFiberGrams}g", AccentPurple)
                    }
                }
            }

            // Food Log List
            Text(
                text = "Logged Meals (${todayDiet.size} items)",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold
            )

            if (todayDiet.isEmpty()) {
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
                            imageVector = Icons.Default.Restaurant,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(56.dp)
                        )
                        Text(
                            text = "No meals logged for this day",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold
                        )
                        Text(
                            text = "Tap + to track your nutrition and hit your macros",
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
                        .testTag("diet_list"),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(todayDiet, key = { it.id }) { meal ->
                        DietEntryCard(
                            meal = meal,
                            onDelete = { viewModel.deleteDietEntry(meal.id) }
                        )
                    }
                }
            }
        }
    }

    // Add Meal Dialog
    if (showAddDialog) {
        AlertDialog(
            onDismissRequest = { showAddDialog = false },
            title = {
                Text(
                    text = "Log Meal or Food",
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
                        value = foodName,
                        onValueChange = { foodName = it },
                        label = { Text("Food / Meal Name") },
                        placeholder = { Text("e.g. Steak, Sweet Potato & Greens") },
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("food_name_input")
                    )

                    OutlinedTextField(
                        value = quantity,
                        onValueChange = { quantity = it },
                        label = { Text("Portion / Quantity") },
                        placeholder = { Text("e.g. 200g or 1 bowl") },
                        modifier = Modifier.fillMaxWidth()
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        OutlinedTextField(
                            value = caloriesInput,
                            onValueChange = { caloriesInput = it },
                            label = { Text("Calories") },
                            modifier = Modifier.weight(1f)
                        )
                        OutlinedTextField(
                            value = proteinInput,
                            onValueChange = { proteinInput = it },
                            label = { Text("Protein (g)") },
                            modifier = Modifier.weight(1f)
                        )
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        OutlinedTextField(
                            value = carbsInput,
                            onValueChange = { carbsInput = it },
                            label = { Text("Carbs (g)") },
                            modifier = Modifier.weight(1f)
                        )
                        OutlinedTextField(
                            value = fatInput,
                            onValueChange = { fatInput = it },
                            label = { Text("Fat (g)") },
                            modifier = Modifier.weight(1f)
                        )
                        OutlinedTextField(
                            value = fiberInput,
                            onValueChange = { fiberInput = it },
                            label = { Text("Fiber (g)") },
                            modifier = Modifier.weight(1f)
                        )
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (foodName.isNotBlank()) {
                            viewModel.addDietEntry(
                                name = foodName,
                                quantity = quantity,
                                calories = caloriesInput.toIntOrNull() ?: 350,
                                protein = proteinInput.toIntOrNull() ?: 25,
                                carbs = carbsInput.toIntOrNull() ?: 30,
                                fat = fatInput.toIntOrNull() ?: 10,
                                fiber = fiberInput.toIntOrNull() ?: 5
                            )
                            foodName = ""
                            showAddDialog = false
                        }
                    },
                    enabled = foodName.isNotBlank(),
                    modifier = Modifier.testTag("confirm_diet_button")
                ) {
                    Text("Save Meal")
                }
            },
            dismissButton = {
                TextButton(onClick = { showAddDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }
}

@Composable
fun MacroMetricPill(
    label: String,
    current: String,
    target: String,
    color: Color
) {
    Surface(
        color = color.copy(alpha = 0.12f),
        shape = RoundedCornerShape(10.dp)
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(label, style = MaterialTheme.typography.labelSmall, color = color, fontWeight = FontWeight.Bold)
            Text(current, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
            Text(target, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
fun DietEntryCard(
    meal: DietEntry,
    onDelete: () -> Unit
) {
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
        ),
        modifier = Modifier
            .fillMaxWidth()
            .testTag("diet_card_${meal.id}")
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
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = meal.foodName,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "${meal.calories} kcal",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                }

                Text(
                    text = "${meal.quantity}  •  ${meal.proteinGrams}g Protein  •  ${meal.carbsGrams}g Carbs  •  ${meal.fatGrams}g Fat  •  ${meal.fiberGrams}g Fiber",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            IconButton(
                onClick = onDelete,
                modifier = Modifier.size(36.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.DeleteOutline,
                    contentDescription = "Delete Meal",
                    tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f),
                    modifier = Modifier.size(20.dp)
                )
            }
        }
    }
}
