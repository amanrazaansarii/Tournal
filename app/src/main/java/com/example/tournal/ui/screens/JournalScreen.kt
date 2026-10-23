package com.example.tournal.ui.screens

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.tournal.ui.components.DateNavigator
import com.example.tournal.ui.viewmodel.TournalViewModel

@Composable
fun JournalScreen(
    viewModel: TournalViewModel,
    modifier: Modifier = Modifier
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current

    val currentJournal = uiState.journals.find { it.date == uiState.selectedDate }

    var title by remember(uiState.selectedDate, currentJournal) {
        mutableStateOf(currentJournal?.title ?: "")
    }
    var content by remember(uiState.selectedDate, currentJournal) {
        mutableStateOf(currentJournal?.content ?: "")
    }
    var sessionType by remember(uiState.selectedDate, currentJournal) {
        mutableStateOf(currentJournal?.sessionType ?: "evening_reflection")
    }
    var takeaways by remember(uiState.selectedDate, currentJournal) {
        mutableStateOf(currentJournal?.keyTakeaways ?: listOf("Protect peak focus windows", "Hydrate and rest well"))
    }
    var newTakeawayText by remember { mutableStateOf("") }

    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Date Navigator
        DateNavigator(
            selectedDate = uiState.selectedDate,
            onPreviousDay = { viewModel.offsetDate(-1) },
            onNextDay = { viewModel.offsetDate(1) },
            onToday = { viewModel.setToday() }
        )

        // Session Type Selector
        Text(
            text = "Journal Session Type",
            style = MaterialTheme.typography.labelLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            val sessions = listOf(
                "morning_setup" to "Morning Setup",
                "evening_reflection" to "Evening Reflection",
                "midday_note" to "Midday Note"
            )
            sessions.forEach { (typeKey, typeLabel) ->
                FilterChip(
                    selected = sessionType == typeKey,
                    onClick = { sessionType = typeKey },
                    label = { Text(typeLabel) },
                    modifier = Modifier.testTag("session_chip_$typeKey")
                )
            }
        }

        // Journal Title Input
        OutlinedTextField(
            value = title,
            onValueChange = { title = it },
            label = { Text("Reflection Title") },
            placeholder = { Text("e.g. Daily Focus & Breakthroughs") },
            shape = RoundedCornerShape(14.dp),
            modifier = Modifier
                .fillMaxWidth()
                .testTag("journal_title_input")
        )

        // Journal Content Input
        OutlinedTextField(
            value = content,
            onValueChange = { content = it },
            label = { Text("Daily Thoughts & Journal Body") },
            placeholder = { Text("Write freely about progress, blockers, or mental clarity...") },
            minLines = 6,
            shape = RoundedCornerShape(14.dp),
            modifier = Modifier
                .fillMaxWidth()
                .testTag("journal_content_input")
        )

        // Key Takeaways Section
        Card(
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
            ),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Lightbulb,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(20.dp)
                    )
                    Text(
                        text = "Key Takeaways & Principles",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold
                    )
                }

                takeaways.forEachIndexed { index, takeaway ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(
                                imageVector = Icons.Default.FiberManualRecord,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(8.dp)
                            )
                            Text(
                                text = takeaway,
                                style = MaterialTheme.typography.bodyMedium
                            )
                        }
                        IconButton(
                            onClick = {
                                takeaways = takeaways.toMutableList().also { it.removeAt(index) }
                            },
                            modifier = Modifier.size(28.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Close,
                                contentDescription = "Remove takeaway",
                                modifier = Modifier.size(16.dp),
                                tint = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }

                // Add takeaway row
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedTextField(
                        value = newTakeawayText,
                        onValueChange = { newTakeawayText = it },
                        placeholder = { Text("Add bullet takeaway...") },
                        modifier = Modifier
                            .weight(1f)
                            .testTag("new_takeaway_input"),
                        shape = RoundedCornerShape(10.dp)
                    )
                    Button(
                        onClick = {
                            if (newTakeawayText.isNotBlank()) {
                                takeaways = takeaways + newTakeawayText.trim()
                                newTakeawayText = ""
                            }
                        },
                        enabled = newTakeawayText.isNotBlank(),
                        modifier = Modifier.testTag("add_takeaway_button")
                    ) {
                        Text("Add")
                    }
                }
            }
        }

        // Save Journal Button
        Button(
            onClick = {
                viewModel.saveJournal(
                    title = if (title.isBlank()) "Journal for ${uiState.selectedDate}" else title,
                    content = content,
                    takeaways = takeaways,
                    sessionType = sessionType
                )
                Toast.makeText(context, "Journal entry saved for ${uiState.selectedDate}", Toast.LENGTH_SHORT).show()
            },
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp)
                .testTag("save_journal_button")
        ) {
            Icon(Icons.Default.Save, contentDescription = null, modifier = Modifier.size(18.dp))
            Spacer(modifier = Modifier.width(8.dp))
            Text("Save Journal Entry", style = MaterialTheme.typography.titleMedium)
        }
    }
}
