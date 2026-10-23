# Tournal — Android Application

Tournal is a minimalist, voice-first daily task planner, intelligent reflection journal, workout ledger, and personal progress vault built natively for Android using Kotlin and Jetpack Compose.

## Key Features

- **Daily Tasks Planner**: Priority categorization (High, Medium, Low), start time & duration scheduling, real-time search, quick completion toggles, and seamless day-by-day navigation.
- **Intelligent Journal**: Morning setup, midday notes, and evening reflection sessions with structured key takeaways.
- **Workout & Fitness Ledger**: Exercise logging with sets, reps, resistance weight (lbs/kg), effort states (*To Failure* vs. *In Control*), and daily bodyweight metrics.
- **Macro & Nutrition Tracker**: Daily calorie and macro tracking (Protein, Carbs, Fat, Fiber) with visual target progress indicators and meal logging.
- **Financial Obligation Ledger**: Expense and runway tracker with category tagging, payment status (*Covered* vs. *Pending*), and budget summaries.
- **Executive Daily Briefing**: AI-guided daily summaries, recovery tips, and schedule insights.
- **Quick Capture Action**: Universal voice and text capture modal for rapid logging across tasks, notes, training, meals, and expenses.
- **Android Home Widgets Gallery**: Interactive previews for 4×2 Tasks, 2×2 Macros, 4×2 Workout, and 2×2 Expense glanceable widgets.
- **Local Vault Storage**: Private on-device encrypted persistent storage with zero mandatory cloud telemetry.

## Architecture

- **Language**: Kotlin 2.1
- **UI Framework**: Jetpack Compose & Material Design 3
- **Architecture**: MVVM with Kotlin Coroutines & `StateFlow`
- **Testing**: Robolectric local JVM testing
