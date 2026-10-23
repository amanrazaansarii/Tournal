package com.example.tournal.data.model

enum class TaskPriority {
    HIGH, MEDIUM, LOW;

    companion object {
        fun fromString(value: String): TaskPriority {
            return when (value.lowercase()) {
                "high" -> HIGH
                "medium" -> MEDIUM
                "low" -> LOW
                else -> MEDIUM
            }
        }
    }
}

enum class TaskSource {
    LOCAL, VOICE, KEEP, GOOGLE_TASKS, GMAIL
}

data class TaskItem(
    val id: String,
    val date: String, // YYYY-MM-DD
    val title: String,
    val notes: String = "",
    val priority: TaskPriority = TaskPriority.HIGH,
    val completed: Boolean = false,
    val startTime: String = "", // HH:MM
    val durationMinutes: Int = 45,
    val reminderMinutesBefore: Int = 5,
    val source: TaskSource = TaskSource.LOCAL,
    val createdAt: String = ""
)

data class VoiceTableBlock(
    val id: String,
    val title: String,
    val headers: List<String>,
    val rows: List<List<String>>
)

data class VoiceChartBlock(
    val id: String,
    val chartType: String = "bar", // bar or line
    val title: String,
    val unit: String,
    val dataPoints: List<ChartDataPoint>
)

data class ChartDataPoint(
    val label: String,
    val value: Float
)

data class JournalEntry(
    val id: String,
    val date: String, // YYYY-MM-DD
    val title: String,
    val content: String,
    val rawTranscript: String = "",
    val keyTakeaways: List<String> = emptyList(),
    val intentEdits: List<String> = emptyList(),
    val sessionType: String = "evening_reflection", // morning_setup, evening_reflection, midday_note
    val updatedAt: String = ""
)

enum class EffortState {
    TO_FAILURE, IN_CONTROL
}

data class WorkoutExercise(
    val id: String,
    val date: String, // YYYY-MM-DD
    val exerciseName: String,
    val weight: Float,
    val weightUnit: String = "lbs", // lbs or kg
    val sets: Int,
    val reps: Int,
    val effortState: EffortState = EffortState.IN_CONTROL,
    val notes: String = "",
    val createdAt: String = ""
)

data class DailyBodyMetric(
    val date: String, // YYYY-MM-DD
    val bodyWeight: Float,
    val bodyWeightUnit: String = "lbs",
    val measuredAt: String = "07:00"
)

data class ProgressPhoto(
    val id: String,
    val date: String,
    val caption: String,
    val bodyWeight: Float? = null,
    val poseCategory: String = "Front", // Front, Side, Back, Training Session
    val createdAt: String = ""
)

data class DietEntry(
    val id: String,
    val date: String, // YYYY-MM-DD
    val foodName: String,
    val quantity: String,
    val calories: Int,
    val proteinGrams: Int,
    val carbsGrams: Int = 0,
    val fatGrams: Int = 0,
    val fiberGrams: Int = 0,
    val micronutrientSummary: String = "",
    val createdAt: String = ""
)

data class NutritionGoals(
    val targetCalories: Int = 2450,
    val targetProteinGrams: Int = 180,
    val targetCarbsGrams: Int = 245,
    val targetFatGrams: Int = 75,
    val targetFiberGrams: Int = 35,
    val weightLbs: Float = 178f,
    val activityMultiplier: String = "active", // sedentary, moderate, active, athlete
    val goalType: String = "maintain", // cut, maintain, bulk
    val updatedAt: String = ""
)

data class ExpenseEntry(
    val id: String,
    val date: String,
    val deadlineDate: String = "",
    val name: String,
    val amount: Float,
    val currency: String = "$",
    val category: String = "General",
    val description: String = "",
    val isCovered: Boolean = false,
    val createdAt: String = ""
)

data class AppSettings(
    val theme: String = "dark", // dark, light, system
    val showPersistentBar: Boolean = true,
    val notificationSound: Boolean = true,
    val notificationVibration: Boolean = true,
    val defaultReminderMinutes: Int = 5,
    val defaultWeightUnit: String = "lbs",
    val use24HourTime: Boolean = false
)

data class UserProfile(
    val name: String = "Executive Planner",
    val bio: String = "Voice-first daily execution, training & nutrition ledger",
    val avatarInitial: String = "T",
    val updatedAt: String = ""
)
