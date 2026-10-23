package com.example.tournal

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import com.example.tournal.data.model.TaskItem
import com.example.tournal.data.model.TaskPriority
import com.example.tournal.data.repository.TournalRepository
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class ExampleRobolectricTest {

    @Test
    fun repository_initializes_and_saves_tasks() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        val repo = TournalRepository(context)

        val initialTasks = repo.loadTasks()
        assertTrue(initialTasks.isNotEmpty())

        val newTask = TaskItem(
            id = "test-123",
            date = repo.getTodayISO(),
            title = "Test Task Execution",
            priority = TaskPriority.HIGH
        )
        repo.addTask(newTask)

        val updated = repo.loadTasks()
        assertTrue(updated.any { it.id == "test-123" })

        repo.toggleTask("test-123")
        val toggled = repo.loadTasks().find { it.id == "test-123" }
        assertEquals(true, toggled?.completed)
    }
}
