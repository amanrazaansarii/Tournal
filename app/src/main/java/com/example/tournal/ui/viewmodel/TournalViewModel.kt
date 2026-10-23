package com.example.tournal.ui.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import com.example.tournal.data.model.*
import com.example.tournal.data.repository.TournalRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.text.SimpleDateFormat
import java.util.*

enum class AppScreen {
    TASKS,
    JOURNAL,
    WORKOUTS,
    DIET,
    EXPENSES,
    ASSISTANT,
    PROFILE,
    SETTINGS,
    WIDGETS
}

data class TournalUiState(
    val selectedDate: String = "",
    val currentScreen: AppScreen = AppScreen.TASKS,
    val tasks: List<TaskItem> = emptyList(),
    val journals: List<JournalEntry> = emptyList(),
    val workouts: List<WorkoutExercise> = emptyList(),
    val bodyMetrics: List<DailyBodyMetric> = emptyList(),
    val dietEntries: List<DietEntry> = emptyList(),
    val nutritionGoals: NutritionGoals = NutritionGoals(),
    val expenses: List<ExpenseEntry> = emptyList(),
    val settings: AppSettings = AppSettings(),
    val profile: UserProfile = UserProfile(),
    val isQuickCaptureOpen: Boolean = false,
    val taskSearchQuery: String = "",
    val taskPriorityFilter: TaskPriority? = null
)

class TournalViewModel(application: Application) : AndroidViewModel(application) {

    private val repository = TournalRepository(application.applicationContext)
    private val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US)

    private val _uiState = MutableStateFlow(
        TournalUiState(
            selectedDate = repository.getTodayISO(),
            tasks = repository.loadTasks(),
            journals = repository.loadJournals(),
            workouts = repository.loadWorkouts(),
            bodyMetrics = repository.loadBodyMetrics(),
            dietEntries = repository.loadDiet(),
            nutritionGoals = repository.loadNutritionGoals(),
            expenses = repository.loadExpenses(),
            settings = repository.loadSettings(),
            profile = repository.loadProfile()
        )
    )
    val uiState: StateFlow<TournalUiState> = _uiState.asStateFlow()

    fun navigateTo(screen: AppScreen) {
        _uiState.value = _uiState.value.copy(currentScreen = screen)
    }

    // Date Navigation
    fun setDate(date: String) {
        _uiState.value = _uiState.value.copy(selectedDate = date)
    }

    fun setToday() {
        _uiState.value = _uiState.value.copy(selectedDate = repository.getTodayISO())
    }

    fun offsetDate(days: Int) {
        try {
            val current = dateFormat.parse(_uiState.value.selectedDate) ?: Date()
            val cal = Calendar.getInstance()
            cal.time = current
            cal.add(Calendar.DAY_OF_YEAR, days)
            _uiState.value = _uiState.value.copy(selectedDate = dateFormat.format(cal.time))
        } catch (_: Exception) {
            setToday()
        }
    }

    // Task Search & Filters
    fun setTaskSearchQuery(query: String) {
        _uiState.value = _uiState.value.copy(taskSearchQuery = query)
    }

    fun setTaskPriorityFilter(priority: TaskPriority?) {
        _uiState.value = _uiState.value.copy(taskPriorityFilter = priority)
    }

    // Tasks Actions
    fun addTask(
        title: String,
        notes: String = "",
        priority: TaskPriority = TaskPriority.HIGH,
        startTime: String = "09:00",
        durationMinutes: Int = 45,
        reminderMinutes: Int = 5
    ) {
        val task = TaskItem(
            id = UUID.randomUUID().toString(),
            date = _uiState.value.selectedDate,
            title = title,
            notes = notes,
            priority = priority,
            completed = false,
            startTime = startTime,
            durationMinutes = durationMinutes,
            reminderMinutesBefore = reminderMinutes,
            source = TaskSource.LOCAL,
            createdAt = repository.getTodayISO()
        )
        repository.addTask(task)
        _uiState.value = _uiState.value.copy(tasks = repository.loadTasks())
    }

    fun toggleTask(taskId: String) {
        repository.toggleTask(taskId)
        _uiState.value = _uiState.value.copy(tasks = repository.loadTasks())
    }

    fun deleteTask(taskId: String) {
        repository.deleteTask(taskId)
        _uiState.value = _uiState.value.copy(tasks = repository.loadTasks())
    }

    // Journal Actions
    fun saveJournal(
        title: String,
        content: String,
        rawTranscript: String = "",
        takeaways: List<String> = emptyList(),
        sessionType: String = "evening_reflection"
    ) {
        val entry = JournalEntry(
            id = UUID.randomUUID().toString(),
            date = _uiState.value.selectedDate,
            title = title,
            content = content,
            rawTranscript = rawTranscript,
            keyTakeaways = takeaways,
            sessionType = sessionType,
            updatedAt = repository.getTodayISO()
        )
        repository.saveJournal(entry)
        _uiState.value = _uiState.value.copy(journals = repository.loadJournals())
    }

    // Workout Actions
    fun addWorkout(
        name: String,
        weight: Float,
        weightUnit: String,
        sets: Int,
        reps: Int,
        effort: EffortState,
        notes: String = ""
    ) {
        val workout = WorkoutExercise(
            id = UUID.randomUUID().toString(),
            date = _uiState.value.selectedDate,
            exerciseName = name,
            weight = weight,
            weightUnit = weightUnit,
            sets = sets,
            reps = reps,
            effortState = effort,
            notes = notes,
            createdAt = repository.getTodayISO()
        )
        repository.addWorkout(workout)
        _uiState.value = _uiState.value.copy(workouts = repository.loadWorkouts())
    }

    fun deleteWorkout(workoutId: String) {
        repository.deleteWorkout(workoutId)
        _uiState.value = _uiState.value.copy(workouts = repository.loadWorkouts())
    }

    fun logBodyMetric(weight: Float, unit: String) {
        val metric = DailyBodyMetric(
            date = _uiState.value.selectedDate,
            bodyWeight = weight,
            bodyWeightUnit = unit,
            measuredAt = SimpleDateFormat("HH:mm", Locale.US).format(Date())
        )
        repository.addBodyMetric(metric)
        _uiState.value = _uiState.value.copy(bodyMetrics = repository.loadBodyMetrics())
    }

    // Diet Actions
    fun addDietEntry(
        name: String,
        quantity: String,
        calories: Int,
        protein: Int,
        carbs: Int,
        fat: Int,
        fiber: Int,
        micronutrients: String = ""
    ) {
        val entry = DietEntry(
            id = UUID.randomUUID().toString(),
            date = _uiState.value.selectedDate,
            foodName = name,
            quantity = quantity,
            calories = calories,
            proteinGrams = protein,
            carbsGrams = carbs,
            fatGrams = fat,
            fiberGrams = fiber,
            micronutrientSummary = micronutrients,
            createdAt = repository.getTodayISO()
        )
        repository.addDietEntry(entry)
        _uiState.value = _uiState.value.copy(dietEntries = repository.loadDiet())
    }

    fun deleteDietEntry(id: String) {
        repository.deleteDietEntry(id)
        _uiState.value = _uiState.value.copy(dietEntries = repository.loadDiet())
    }

    fun updateNutritionGoals(goals: NutritionGoals) {
        repository.saveNutritionGoals(goals)
        _uiState.value = _uiState.value.copy(nutritionGoals = repository.loadNutritionGoals())
    }

    // Expenses Actions
    fun addExpense(
        name: String,
        amount: Float,
        category: String,
        deadlineDate: String = "",
        description: String = "",
        isCovered: Boolean = false
    ) {
        val expense = ExpenseEntry(
            id = UUID.randomUUID().toString(),
            date = _uiState.value.selectedDate,
            deadlineDate = if (deadlineDate.isBlank()) _uiState.value.selectedDate else deadlineDate,
            name = name,
            amount = amount,
            category = category,
            description = description,
            isCovered = isCovered,
            createdAt = repository.getTodayISO()
        )
        repository.addExpense(expense)
        _uiState.value = _uiState.value.copy(expenses = repository.loadExpenses())
    }

    fun toggleExpenseCovered(id: String) {
        repository.toggleExpenseCovered(id)
        _uiState.value = _uiState.value.copy(expenses = repository.loadExpenses())
    }

    fun deleteExpense(id: String) {
        repository.deleteExpense(id)
        _uiState.value = _uiState.value.copy(expenses = repository.loadExpenses())
    }

    // Settings & Profile
    fun updateSettings(settings: AppSettings) {
        repository.saveSettings(settings)
        _uiState.value = _uiState.value.copy(settings = repository.loadSettings())
    }

    fun updateProfile(profile: UserProfile) {
        repository.saveProfile(profile)
        _uiState.value = _uiState.value.copy(profile = repository.loadProfile())
    }

    // Quick Capture FAB
    fun openQuickCapture() {
        _uiState.value = _uiState.value.copy(isQuickCaptureOpen = true)
    }

    fun closeQuickCapture() {
        _uiState.value = _uiState.value.copy(isQuickCaptureOpen = false)
    }
}
