package com.example.tournal.data.repository

import android.content.Context
import android.content.SharedPreferences
import com.example.tournal.data.model.*
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import java.text.SimpleDateFormat
import java.util.*

class TournalRepository(private val context: Context) {

    private val prefs: SharedPreferences =
        context.getSharedPreferences("tournal_prefs_v1", Context.MODE_PRIVATE)
    private val gson = Gson()

    private val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US)

    fun getTodayISO(): String {
        return dateFormat.format(Date())
    }

    fun getOffsetDateISO(daysOffset: Int): String {
        val cal = Calendar.getInstance()
        cal.add(Calendar.DAY_OF_YEAR, daysOffset)
        return dateFormat.format(cal.time)
    }

    init {
        ensureInitialSeedData()
    }

    private fun ensureInitialSeedData() {
        if (!prefs.getBoolean("seeded_v1", false)) {
            val today = getTodayISO()
            val yesterday = getOffsetDateISO(-1)

            // Seed Tasks
            val seedTasks = listOf(
                TaskItem(
                    id = UUID.randomUUID().toString(),
                    date = today,
                    title = "Deep Work: Finalize quarterly executive roadmap",
                    notes = "Block 90 minutes with zero distractions. Review OKRs.",
                    priority = TaskPriority.HIGH,
                    completed = false,
                    startTime = "09:00",
                    durationMinutes = 90,
                    reminderMinutesBefore = 10,
                    source = TaskSource.VOICE
                ),
                TaskItem(
                    id = UUID.randomUUID().toString(),
                    date = today,
                    title = "Upper Body Hypertrophy (Chest & Back)",
                    notes = "Warm-up with shoulder dislocations. Target 4 working sets of weighted pull-ups.",
                    priority = TaskPriority.HIGH,
                    completed = false,
                    startTime = "17:30",
                    durationMinutes = 60,
                    reminderMinutesBefore = 15,
                    source = TaskSource.LOCAL
                ),
                TaskItem(
                    id = UUID.randomUUID().toString(),
                    date = today,
                    title = "Review nutrition macros & hit 180g protein",
                    notes = "Include whey isolate post-workout.",
                    priority = TaskPriority.MEDIUM,
                    completed = true,
                    startTime = "13:00",
                    durationMinutes = 15,
                    reminderMinutesBefore = 5,
                    source = TaskSource.LOCAL
                ),
                TaskItem(
                    id = UUID.randomUUID().toString(),
                    date = yesterday,
                    title = "Weekly financial ledger reconciliation",
                    notes = "Categorize cloud hosting and fitness subscriptions.",
                    priority = TaskPriority.MEDIUM,
                    completed = true,
                    startTime = "18:00",
                    durationMinutes = 30,
                    reminderMinutesBefore = 5,
                    source = TaskSource.LOCAL
                )
            )
            saveTasks(seedTasks)

            // Seed Journals
            val seedJournals = listOf(
                JournalEntry(
                    id = UUID.randomUUID().toString(),
                    date = today,
                    title = "Morning Clarity & High-Output Focus",
                    content = "Woke up early at 06:15. Mental clarity is high following a 8-hour sleep block. Priority today is finishing the core roadmap before afternoon meetings.",
                    rawTranscript = "Morning clarity session. Feeling energized and ready to tackle the roadmap deliverables.",
                    keyTakeaways = listOf(
                        "Protect morning peak cognitive window",
                        "Maintain hydration and low caffeine after 2pm"
                    ),
                    intentEdits = listOf(
                        "Prioritized deep work block",
                        "Scheduled hypertrophy training"
                    ),
                    sessionType = "morning_setup",
                    updatedAt = today
                )
            )
            saveJournals(seedJournals)

            // Seed Workouts
            val seedWorkouts = listOf(
                WorkoutExercise(
                    id = UUID.randomUUID().toString(),
                    date = today,
                    exerciseName = "Barbell Incline Bench Press",
                    weight = 185f,
                    weightUnit = "lbs",
                    sets = 4,
                    reps = 8,
                    effortState = EffortState.IN_CONTROL,
                    notes = "Controlled 3-second eccentric tempo"
                ),
                WorkoutExercise(
                    id = UUID.randomUUID().toString(),
                    date = today,
                    exerciseName = "Weighted Pull-Ups",
                    weight = 45f,
                    weightUnit = "lbs",
                    sets = 4,
                    reps = 6,
                    effortState = EffortState.TO_FAILURE,
                    notes = "Last set to absolute technical failure"
                ),
                WorkoutExercise(
                    id = UUID.randomUUID().toString(),
                    date = today,
                    exerciseName = "Dumbbell Lateral Raises",
                    weight = 30f,
                    weightUnit = "lbs",
                    sets = 3,
                    reps = 15,
                    effortState = EffortState.TO_FAILURE,
                    notes = "Strict form, no torso swing"
                )
            )
            saveWorkouts(seedWorkouts)

            // Seed Body Metrics
            val seedMetrics = listOf(
                DailyBodyMetric(date = today, bodyWeight = 178.4f, bodyWeightUnit = "lbs", measuredAt = "07:15"),
                DailyBodyMetric(date = yesterday, bodyWeight = 178.0f, bodyWeightUnit = "lbs", measuredAt = "07:10")
            )
            saveBodyMetrics(seedMetrics)

            // Seed Diet
            val seedDiet = listOf(
                DietEntry(
                    id = UUID.randomUUID().toString(),
                    date = today,
                    foodName = "Steel-cut Oats with Whey & Berries",
                    quantity = "1 large bowl",
                    calories = 520,
                    proteinGrams = 42,
                    carbsGrams = 68,
                    fatGrams = 8,
                    fiberGrams = 11,
                    micronutrientSummary = "Rich in Iron, Magnesium, Antioxidants"
                ),
                DietEntry(
                    id = UUID.randomUUID().toString(),
                    date = today,
                    foodName = "Grilled Chicken Breast, Quinoa & Avocado",
                    quantity = "250g chicken + 1 cup quinoa",
                    calories = 680,
                    proteinGrams = 64,
                    carbsGrams = 48,
                    fatGrams = 22,
                    fiberGrams = 9,
                    micronutrientSummary = "High B-vitamins, Potassium, Zinc"
                ),
                DietEntry(
                    id = UUID.randomUUID().toString(),
                    date = today,
                    foodName = "Greek Yogurt Bowl with Honey & Walnuts",
                    quantity = "250g 0% Greek yogurt",
                    calories = 340,
                    proteinGrams = 32,
                    carbsGrams = 24,
                    fatGrams = 12,
                    fiberGrams = 3,
                    micronutrientSummary = "High Calcium and Probiotics"
                )
            )
            saveDiet(seedDiet)

            // Seed Expenses
            val seedExpenses = listOf(
                ExpenseEntry(
                    id = UUID.randomUUID().toString(),
                    date = today,
                    deadlineDate = today,
                    name = "Premium Fitness Membership",
                    amount = 120.00f,
                    currency = "$",
                    category = "Fitness",
                    description = "Monthly gym and recovery access",
                    isCovered = true
                ),
                ExpenseEntry(
                    id = UUID.randomUUID().toString(),
                    date = today,
                    deadlineDate = getOffsetDateISO(5),
                    name = "Cloud Server Infrastructure",
                    amount = 45.50f,
                    currency = "$",
                    category = "Tech",
                    description = "Monthly database & backend hosting",
                    isCovered = false
                ),
                ExpenseEntry(
                    id = UUID.randomUUID().toString(),
                    date = today,
                    deadlineDate = getOffsetDateISO(10),
                    name = "Organic Grocery Restock",
                    amount = 185.20f,
                    currency = "$",
                    category = "Food",
                    description = "Weekly lean proteins, produce & nuts",
                    isCovered = true
                )
            )
            saveExpenses(seedExpenses)

            prefs.edit().putBoolean("seeded_v1", true).apply()
        }
    }

    // Tasks CRUD
    fun loadTasks(): List<TaskItem> {
        val json = prefs.getString("tasks", null) ?: return emptyList()
        val type = object : TypeToken<List<TaskItem>>() {}.type
        return gson.fromJson(json, type) ?: emptyList()
    }

    fun saveTasks(tasks: List<TaskItem>) {
        prefs.edit().putString("tasks", gson.toJson(tasks)).apply()
    }

    fun addTask(task: TaskItem) {
        val list = loadTasks().toMutableList()
        list.add(0, task)
        saveTasks(list)
    }

    fun toggleTask(taskId: String) {
        val list = loadTasks().map {
            if (it.id == taskId) it.copy(completed = !it.completed) else it
        }
        saveTasks(list)
    }

    fun deleteTask(taskId: String) {
        val list = loadTasks().filterNot { it.id == taskId }
        saveTasks(list)
    }

    // Journal CRUD
    fun loadJournals(): List<JournalEntry> {
        val json = prefs.getString("journals", null) ?: return emptyList()
        val type = object : TypeToken<List<JournalEntry>>() {}.type
        return gson.fromJson(json, type) ?: emptyList()
    }

    fun saveJournals(journals: List<JournalEntry>) {
        prefs.edit().putString("journals", gson.toJson(journals)).apply()
    }

    fun saveJournal(entry: JournalEntry) {
        val list = loadJournals().toMutableList()
        val index = list.indexOfFirst { it.date == entry.date }
        if (index >= 0) {
            list[index] = entry
        } else {
            list.add(0, entry)
        }
        saveJournals(list)
    }

    // Workouts CRUD
    fun loadWorkouts(): List<WorkoutExercise> {
        val json = prefs.getString("workouts", null) ?: return emptyList()
        val type = object : TypeToken<List<WorkoutExercise>>() {}.type
        return gson.fromJson(json, type) ?: emptyList()
    }

    fun saveWorkouts(workouts: List<WorkoutExercise>) {
        prefs.edit().putString("workouts", gson.toJson(workouts)).apply()
    }

    fun addWorkout(workout: WorkoutExercise) {
        val list = loadWorkouts().toMutableList()
        list.add(0, workout)
        saveWorkouts(list)
    }

    fun deleteWorkout(workoutId: String) {
        val list = loadWorkouts().filterNot { it.id == workoutId }
        saveWorkouts(list)
    }

    // Body Metrics
    fun loadBodyMetrics(): List<DailyBodyMetric> {
        val json = prefs.getString("body_metrics", null) ?: return emptyList()
        val type = object : TypeToken<List<DailyBodyMetric>>() {}.type
        return gson.fromJson(json, type) ?: emptyList()
    }

    fun saveBodyMetrics(metrics: List<DailyBodyMetric>) {
        prefs.edit().putString("body_metrics", gson.toJson(metrics)).apply()
    }

    fun addBodyMetric(metric: DailyBodyMetric) {
        val list = loadBodyMetrics().filterNot { it.date == metric.date }.toMutableList()
        list.add(0, metric)
        saveBodyMetrics(list)
    }

    // Diet CRUD
    fun loadDiet(): List<DietEntry> {
        val json = prefs.getString("diet", null) ?: return emptyList()
        val type = object : TypeToken<List<DietEntry>>() {}.type
        return gson.fromJson(json, type) ?: emptyList()
    }

    fun saveDiet(entries: List<DietEntry>) {
        prefs.edit().putString("diet", gson.toJson(entries)).apply()
    }

    fun addDietEntry(entry: DietEntry) {
        val list = loadDiet().toMutableList()
        list.add(0, entry)
        saveDiet(list)
    }

    fun deleteDietEntry(entryId: String) {
        val list = loadDiet().filterNot { it.id == entryId }
        saveDiet(list)
    }

    // Nutrition Goals
    fun loadNutritionGoals(): NutritionGoals {
        val json = prefs.getString("nutrition_goals", null) ?: return NutritionGoals()
        return gson.fromJson(json, NutritionGoals::class.java) ?: NutritionGoals()
    }

    fun saveNutritionGoals(goals: NutritionGoals) {
        prefs.edit().putString("nutrition_goals", gson.toJson(goals)).apply()
    }

    // Expenses CRUD
    fun loadExpenses(): List<ExpenseEntry> {
        val json = prefs.getString("expenses", null) ?: return emptyList()
        val type = object : TypeToken<List<ExpenseEntry>>() {}.type
        return gson.fromJson(json, type) ?: emptyList()
    }

    fun saveExpenses(expenses: List<ExpenseEntry>) {
        prefs.edit().putString("expenses", gson.toJson(expenses)).apply()
    }

    fun addExpense(expense: ExpenseEntry) {
        val list = loadExpenses().toMutableList()
        list.add(0, expense)
        saveExpenses(list)
    }

    fun toggleExpenseCovered(expenseId: String) {
        val list = loadExpenses().map {
            if (it.id == expenseId) it.copy(isCovered = !it.isCovered) else it
        }
        saveExpenses(list)
    }

    fun deleteExpense(expenseId: String) {
        val list = loadExpenses().filterNot { it.id == expenseId }
        saveExpenses(list)
    }

    // Settings
    fun loadSettings(): AppSettings {
        val json = prefs.getString("settings", null) ?: return AppSettings()
        return gson.fromJson(json, AppSettings::class.java) ?: AppSettings()
    }

    fun saveSettings(settings: AppSettings) {
        prefs.edit().putString("settings", gson.toJson(settings)).apply()
    }

    // Profile
    fun loadProfile(): UserProfile {
        val json = prefs.getString("profile", null) ?: return UserProfile()
        return gson.fromJson(json, UserProfile::class.java) ?: UserProfile()
    }

    fun saveProfile(profile: UserProfile) {
        prefs.edit().putString("profile", gson.toJson(profile)).apply()
    }
}
