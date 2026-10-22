import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

async function transcribeAudioBase64(base64Audio: string, mimeType: string): Promise<string> {
  const cleanMimeType = (mimeType || 'audio/webm').split(';')[0].trim();
  const response = await ai.models.generateContent({
    model: 'gemini-3.5-transcribe',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: cleanMimeType,
            data: base64Audio,
          },
        },
        {
          text: 'Transcribe this audio accurately, including spoken punctuation cues, pauses, numbers, and self-corrections.',
        },
      ],
    },
  });
  return (response.text || '').trim();
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '25mb' }));

  // 1. Direct Audio Transcription endpoint using gemini-3.5-transcribe
  app.post('/api/voice/transcribe', async (req, res) => {
    try {
      const { base64Audio, mimeType } = req.body;
      if (!base64Audio) {
        return res.status(400).json({ error: 'Missing base64Audio payload' });
      }
      const transcript = await transcribeAudioBase64(base64Audio, mimeType || 'audio/webm');
      res.json({ transcript });
    } catch (error: any) {
      console.error('Transcription error:', error);
      res.status(500).json({ error: error?.message || 'Audio transcription failed' });
    }
  });

  // 2. Smart Voice-to-Tasks endpoint
  app.post('/api/voice/tasks', async (req, res) => {
    try {
      const { base64Audio, mimeType, rawText, defaultDate } = req.body;
      let transcript = rawText || '';

      if (base64Audio) {
        transcript = await transcribeAudioBase64(base64Audio, mimeType || 'audio/webm');
      }

      if (!transcript.trim()) {
        return res.status(400).json({ error: 'No speech detected in audio.' });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Current Default Date: ${defaultDate || new Date().toISOString().split('T')[0]}
User Spoken Input:
"""
${transcript}
"""`,
        config: {
          systemInstruction: `Parse the user's spoken tasks into a structured list.
1. Split into separate tasks whenever the user makes bullet points, says "next task", "new point", "second", "also", or pauses to move to a new item.
2. Resolve self-corrections: if the user reconsiders a time, priority, or phrase (e.g., "at 2pm, wait no 3:30pm high priority"), apply only the corrected version.
3. Extract startTime in 24h HH:MM format and durationMinutes (integer).
4. Extract priority ("high", "medium", or "low").
5. Extract targetDate (YYYY-MM-DD) if mentioned, otherwise use Current Default Date.`,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              cleanedSummary: { type: Type.STRING },
              targetDate: { type: Type.STRING },
              tasks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    notes: { type: Type.STRING },
                    priority: { type: Type.STRING },
                    startTime: { type: Type.STRING },
                    durationMinutes: { type: Type.INTEGER },
                    reminderMinutesBefore: { type: Type.INTEGER },
                  },
                  required: [
                    'title',
                    'notes',
                    'priority',
                    'startTime',
                    'durationMinutes',
                    'reminderMinutesBefore',
                  ],
                },
              },
            },
            required: ['cleanedSummary', 'targetDate', 'tasks'],
          },
        },
      });

      const parsed = JSON.parse((response.text || '{}').trim());
      res.json({
        transcript,
        ...parsed,
      });
    } catch (error: any) {
      console.error('Voice tasks error:', error);
      res.status(500).json({ error: error?.message || 'Failed to parse spoken tasks' });
    }
  });

  // 3. Intelligent Journal + Voice Table & Chart Dictation endpoint
  app.post('/api/voice/journal', async (req, res) => {
    try {
      const { base64Audio, mimeType, rawText, existingContent } = req.body;
      let transcript = rawText || '';

      if (base64Audio) {
        transcript = await transcribeAudioBase64(base64Audio, mimeType || 'audio/webm');
      }

      if (!transcript.trim()) {
        return res.status(400).json({ error: 'No speech detected in audio.' });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Existing Journal Context:
"""
${existingContent || ''}
"""

Raw Spoken Audio Transcript:
"""
${transcript}
"""`,
        config: {
          systemInstruction: `Transform the user's spoken dictation into clean, natural writing and structured visual blocks:
1. Resolve self-corrections, pauses, and rethought words seamlessly so only the intended meaning remains.
2. Format spoken lists or points as clean bullet points (•) or paragraphs.
3. Strip filler words ("um", "uh", "like") while keeping the speaker's natural tone.
4. TABLES ON VOICE COMMAND: If the user asks to create a table or speaks tabular/comparative data, populate the "generatedTable" object with a title, headers array, and rows (2D array of strings). Otherwise set generatedTable.hasTable to false.
5. CHARTS ON VOICE COMMAND: If the user asks to create a chart/graph or speaks metric series data, populate "generatedChart" with hasChart=true, chartType ("bar" or "line"), title, unit, and dataPoints (label and value). Otherwise set generatedChart.hasChart to false.`,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              suggestedTitle: { type: Type.STRING },
              structuredContent: { type: Type.STRING },
              keyTakeaways: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              intentEdits: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              generatedTable: {
                type: Type.OBJECT,
                properties: {
                  hasTable: { type: Type.BOOLEAN },
                  title: { type: Type.STRING },
                  headers: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  rows: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                  },
                },
                required: ['hasTable', 'title', 'headers', 'rows'],
              },
              generatedChart: {
                type: Type.OBJECT,
                properties: {
                  hasChart: { type: Type.BOOLEAN },
                  chartType: {
                    type: Type.STRING,
                    description: 'bar or line',
                  },
                  title: { type: Type.STRING },
                  unit: { type: Type.STRING },
                  dataPoints: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        label: { type: Type.STRING },
                        value: { type: Type.NUMBER },
                      },
                      required: ['label', 'value'],
                    },
                  },
                },
                required: ['hasChart', 'chartType', 'title', 'unit', 'dataPoints'],
              },
            },
            required: [
              'suggestedTitle',
              'structuredContent',
              'keyTakeaways',
              'intentEdits',
              'generatedTable',
              'generatedChart',
            ],
          },
        },
      });

      const parsed = JSON.parse((response.text || '{}').trim());
      res.json({
        transcript,
        ...parsed,
      });
    } catch (error: any) {
      console.error('Voice journal error:', error);
      res.status(500).json({ error: error?.message || 'Failed to process voice journal' });
    }
  });

  // 4. Dedicated Voice-to-Table & Chart endpoint
  app.post('/api/voice/table-chart', async (req, res) => {
    try {
      const { base64Audio, mimeType, rawText } = req.body;
      let transcript = rawText || '';

      if (base64Audio) {
        transcript = await transcribeAudioBase64(base64Audio, mimeType || 'audio/webm');
      }

      if (!transcript.trim()) {
        return res.status(400).json({ error: 'No speech detected in audio.' });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Spoken Command for Table or Chart:
"""
${transcript}
"""`,
        config: {
          systemInstruction: `You convert spoken voice commands into structured Tables and Charts.
Resolve any spoken self-corrections ("Monday was 6 hours, wait no 7.5 hours").
If the user requests a table, populate table (hasTable: true, title, headers, rows).
If the user requests a chart or provides numeric series data, populate chart (hasChart: true, chartType: "bar" | "line", title, unit, dataPoints).
If they ask for both or if the numeric data can be shown as both, populate both!`,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              table: {
                type: Type.OBJECT,
                properties: {
                  hasTable: { type: Type.BOOLEAN },
                  title: { type: Type.STRING },
                  headers: { type: Type.ARRAY, items: { type: Type.STRING } },
                  rows: {
                    type: Type.ARRAY,
                    items: { type: Type.ARRAY, items: { type: Type.STRING } },
                  },
                },
                required: ['hasTable', 'title', 'headers', 'rows'],
              },
              chart: {
                type: Type.OBJECT,
                properties: {
                  hasChart: { type: Type.BOOLEAN },
                  chartType: { type: Type.STRING, description: 'bar or line' },
                  title: { type: Type.STRING },
                  unit: { type: Type.STRING },
                  dataPoints: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        label: { type: Type.STRING },
                        value: { type: Type.NUMBER },
                      },
                      required: ['label', 'value'],
                    },
                  },
                },
                required: ['hasChart', 'chartType', 'title', 'unit', 'dataPoints'],
              },
            },
            required: ['table', 'chart'],
          },
        },
      });

      const parsed = JSON.parse((response.text || '{}').trim());
      res.json({
        transcript,
        ...parsed,
      });
    } catch (error: any) {
      console.error('Voice table/chart error:', error);
      res.status(500).json({ error: error?.message || 'Failed to generate table or chart' });
    }
  });

  // 5. Smart Voice-to-Workout Logger endpoint
  app.post('/api/voice/workout', async (req, res) => {
    try {
      const { base64Audio, mimeType, rawText } = req.body;
      let transcript = rawText || '';

      if (base64Audio) {
        transcript = await transcribeAudioBase64(base64Audio, mimeType || 'audio/webm');
      }

      if (!transcript.trim()) {
        return res.status(400).json({ error: 'No speech detected in audio.' });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Spoken Workout Log:
"""
${transcript}
"""`,
        config: {
          systemInstruction: `Parse the user's spoken workout log into structured exercise entries.
Resolve any spoken self-corrections (e.g. "185 pounds, wait no 195 pounds for 3 sets of 6").
Determine whether each exercise was taken "to_failure" or kept "in_control".
Also extract the user's current bodyWeight if they mentioned weighing themselves today (0 if not mentioned).`,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              bodyWeight: { type: Type.NUMBER },
              bodyWeightUnit: { type: Type.STRING },
              exercises: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    exerciseName: { type: Type.STRING },
                    weight: { type: Type.NUMBER },
                    weightUnit: { type: Type.STRING },
                    sets: { type: Type.INTEGER },
                    reps: { type: Type.INTEGER },
                    effortState: { type: Type.STRING },
                    notes: { type: Type.STRING },
                  },
                  required: [
                    'exerciseName',
                    'weight',
                    'weightUnit',
                    'sets',
                    'reps',
                    'effortState',
                    'notes',
                  ],
                },
              },
            },
            required: ['bodyWeight', 'bodyWeightUnit', 'exercises'],
          },
        },
      });

      const parsed = JSON.parse((response.text || '{}').trim());
      res.json({
        transcript,
        ...parsed,
      });
    } catch (error: any) {
      console.error('Voice workout error:', error);
      res.status(500).json({ error: error?.message || 'Failed to parse spoken workout' });
    }
  });

  // 6. AI Diet & Nutrition Calculator Endpoint (Supports manual food + quantity OR voice dictation)
  app.post('/api/diet/analyze', async (req, res) => {
    try {
      const { base64Audio, mimeType, foodName, quantity, rawText } = req.body;
      let queryText = '';

      if (base64Audio) {
        queryText = await transcribeAudioBase64(base64Audio, mimeType || 'audio/webm');
      } else if (rawText) {
        queryText = rawText;
      } else {
        queryText = `Food/Meal: ${foodName || ''} | Quantity: ${quantity || '1 serving'}`;
      }

      if (!queryText.trim()) {
        return res.status(400).json({ error: 'Please provide food name and quantity.' });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Analyze and calculate accurate nutritional values for the following meal/food input:
"""
${queryText}
"""`,
        config: {
          systemInstruction: `You are a precision sports nutritionist and dietitian calculator.
Given either a single food + quantity OR a spoken list of meals/foods:
1. Resolve any self-corrections if spoken (e.g., "200 grams of chicken breast, wait no 250 grams").
2. Accurately calculate the total Calories (kcal), Protein (g), Dietary Fiber (g), Total Carbohydrates (g), Total Fat (g), Sugar (g), Sodium (mg), and a concise 1-line micronutrient summary (e.g. "High in Vitamin B12, Selenium, Iron") for each distinct food/meal item.
3. Return an array of items so single or multiple spoken items work seamlessly.`,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    foodName: {
                      type: Type.STRING,
                      description: 'Clean name of the food or meal',
                    },
                    quantity: {
                      type: Type.STRING,
                      description: 'Normalized quantity (e.g., "250g", "3 large eggs", "1 bowl")',
                    },
                    calories: {
                      type: Type.INTEGER,
                      description: 'Total kcal',
                    },
                    proteinGrams: {
                      type: Type.NUMBER,
                      description: 'Grams of protein (rounded to 1 decimal)',
                    },
                    fiberGrams: {
                      type: Type.NUMBER,
                      description: 'Grams of dietary fiber',
                    },
                    carbsGrams: {
                      type: Type.NUMBER,
                      description: 'Grams of total carbohydrates',
                    },
                    fatGrams: {
                      type: Type.NUMBER,
                      description: 'Grams of total fat',
                    },
                    sugarGrams: {
                      type: Type.NUMBER,
                      description: 'Grams of sugar',
                    },
                    sodiumMg: {
                      type: Type.INTEGER,
                      description: 'Milligrams of sodium',
                    },
                    micronutrientSummary: {
                      type: Type.STRING,
                      description: 'Key vitamins and minerals provided by this food',
                    },
                  },
                  required: [
                    'foodName',
                    'quantity',
                    'calories',
                    'proteinGrams',
                    'fiberGrams',
                    'carbsGrams',
                    'fatGrams',
                    'sugarGrams',
                    'sodiumMg',
                    'micronutrientSummary',
                  ],
                },
              },
            },
            required: ['items'],
          },
        },
      });

      const parsed = JSON.parse((response.text || '{}').trim());
      res.json({
        transcript: queryText,
        items: parsed.items || [],
      });
    } catch (error: any) {
      console.error('Diet nutrition calculation error:', error);
      res.status(500).json({ error: error?.message || 'Failed to calculate nutritional values' });
    }
  });

  // 7. Voice Expense Parser endpoint
  app.post('/api/voice/expense', async (req, res) => {
    try {
      const { base64Audio, mimeType, rawText, defaultDate } = req.body;
      let transcript = rawText || '';

      if (base64Audio) {
        transcript = await transcribeAudioBase64(base64Audio, mimeType || 'audio/webm');
      }

      if (!transcript.trim()) {
        return res.status(400).json({ error: 'No speech detected.' });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Current Date: ${defaultDate || new Date().toISOString().split('T')[0]}
Spoken Expense Input:
"""
${transcript}
"""`,
        config: {
          systemInstruction: `Parse the user's spoken expenses into structured expense entries.
Resolve any spoken self-corrections (e.g., "120 dollars, wait 145 dollars").
Extract the expense name, numeric amount, currency (e.g. "USD"), category ("Housing", "Utilities", "Food", "Health & Gym", "Subscriptions", "Other"), expected deadlineDate (YYYY-MM-DD, default to Current Date if not specified), and description/notes.`,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              expenses: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    amount: { type: Type.NUMBER },
                    currency: { type: Type.STRING },
                    category: { type: Type.STRING },
                    deadlineDate: { type: Type.STRING },
                    description: { type: Type.STRING },
                  },
                  required: [
                    'name',
                    'amount',
                    'currency',
                    'category',
                    'deadlineDate',
                    'description',
                  ],
                },
              },
            },
            required: ['expenses'],
          },
        },
      });

      const parsed = JSON.parse((response.text || '{}').trim());
      res.json({
        transcript,
        expenses: parsed.expenses || [],
      });
    } catch (error: any) {
      console.error('Voice expense error:', error);
      res.status(500).json({ error: error?.message || 'Failed to parse spoken expense' });
    }
  });

  // 8. Multi-Turn Context-Aware Personal AI Assistant Chatbot endpoint
  app.post('/api/chat', async (req, res) => {
    try {
      const { message, history = [], appDataContext = {}, speedMode = 'standard' } = req.body;
      if (!message || !String(message).trim()) {
        return res.status(400).json({ error: 'Message is required' });
      }

      const selectedModel =
        speedMode === 'fast' ? 'gemini-3.1-flash-lite' : 'gemini-3.8-flash';

      const systemInstruction = `You are Tournal AI, a personal, intelligent assistant embedded inside the user's daily tasks, voice journal, workout, diet/nutrition, and expense tracking app.
You have full access to the user's local app data below (Tasks, Journal Entries, Workouts, Body Weight Metrics, Diet & Nutrition Entries, Daily Calorie/Protein Goals, and Expenses).
When answering questions:
1. Ground every answer directly in the user's actual data (cite exact dates, task titles, journal reflections, exercise weights, food items, calorie/protein totals, and expenses with deadlines).
2. Be concise, clear, and helpful. Use bullet points when listing items from specific dates.

USER'S CURRENT APP DATA CONTEXT:
${JSON.stringify(appDataContext, null, 2)}`;

      const formattedHistory = Array.isArray(history)
        ? history
            .filter((m: any) => m && m.text && (m.role === 'user' || m.role === 'model'))
            .map((m: any) => ({
              role: m.role as 'user' | 'model',
              parts: [{ text: String(m.text) }],
            }))
        : [];

      const chat = ai.chats.create({
        model: selectedModel,
        history: formattedHistory,
        config: {
          systemInstruction,
        },
      });

      const response = await chat.sendMessage({
        message: String(message),
      });

      res.json({
        reply: response.text || 'I could not generate a response.',
        modelUsed: selectedModel,
      });
    } catch (error: any) {
      console.error('Chat error:', error);
      res.status(500).json({ error: error?.message || 'Chat request failed' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Tournal server running on http://localhost:${PORT}`);
  });
}

startServer();
