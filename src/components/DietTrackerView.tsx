import React, { useState, useRef } from 'react';
import {
  Flame,
  Beef,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Mic,
  Square,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { DietEntry, NutritionGoals } from '../types';
import { IOSSwipeToDeleteRow } from './IOSSwipeToDeleteRow';

interface DietTrackerViewProps {
  selectedDate: string;
  dietEntries: DietEntry[];
  onAddDietEntries: (entries: Omit<DietEntry, 'id' | 'createdAt'>[]) => void;
  onDeleteDietEntry: (id: string) => void;
  nutritionGoals: NutritionGoals;
  onUpdateNutritionGoals: (goals: NutritionGoals) => void;
}

export const DietTrackerView: React.FC<DietTrackerViewProps> = ({
  selectedDate,
  dietEntries,
  onAddDietEntries,
  onDeleteDietEntry,
  nutritionGoals,
  onUpdateNutritionGoals,
}) => {
  // Food + Quantity input state
  const [foodName, setFoodName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Voice recording state for meals
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Dropdown states (Secondary nutrients hidden until user wants to see them)
  const [showSummarySecondaryMacros, setShowSummarySecondaryMacros] = useState(false);
  const [expandedMealIds, setExpandedMealIds] = useState<Record<string, boolean>>({});
  const [showCalculatorSheet, setShowCalculatorSheet] = useState(false);

  // Requirement Calculator & Manual Goal Override state
  const [calcWeightLbs, setCalcWeightLbs] = useState<string>(
    String(nutritionGoals.weightLbs || 178)
  );
  const [calcActivity, setCalcActivity] = useState<
    'sedentary' | 'moderate' | 'active' | 'athlete'
  >(nutritionGoals.activityMultiplier || 'active');
  const [calcGoal, setCalcGoal] = useState<'cut' | 'maintain' | 'bulk'>(
    nutritionGoals.goalType || 'maintain'
  );
  const [manualCalories, setManualCalories] = useState<string>(
    String(nutritionGoals.targetCalories)
  );
  const [manualProtein, setManualProtein] = useState<string>(
    String(nutritionGoals.targetProteinGrams)
  );
  const [manualFiber, setManualFiber] = useState<string>(
    String(nutritionGoals.targetFiberGrams)
  );
  const [manualCarbs, setManualCarbs] = useState<string>(
    String(nutritionGoals.targetCarbsGrams)
  );
  const [manualFat, setManualFat] = useState<string>(
    String(nutritionGoals.targetFatGrams)
  );

  const entriesForDate = dietEntries.filter((d) => d.date === selectedDate);

  const totals = entriesForDate.reduce(
    (acc, item) => ({
      calories: acc.calories + (Number(item.calories) || 0),
      protein: acc.protein + (Number(item.proteinGrams) || 0),
      fiber: acc.fiber + (Number(item.fiberGrams) || 0),
      carbs: acc.carbs + (Number(item.carbsGrams) || 0),
      fat: acc.fat + (Number(item.fatGrams) || 0),
      sugar: acc.sugar + (Number(item.sugarGrams) || 0),
      sodium: acc.sodium + (Number(item.sodiumMg) || 0),
    }),
    { calories: 0, protein: 0, fiber: 0, carbs: 0, fat: 0, sugar: 0, sodium: 0 }
  );

  const calPercent = Math.min(
    Math.round((totals.calories / Math.max(nutritionGoals.targetCalories, 1)) * 100),
    100
  );
  const proteinPercent = Math.min(
    Math.round((totals.protein / Math.max(nutritionGoals.targetProteinGrams, 1)) * 100),
    100
  );

  const toggleMealDropdown = (id: string) => {
    setExpandedMealIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Auto-calculate requirement based on body weight, activity, and goal
  const handleRunRequirementCalculator = () => {
    const w = parseFloat(calcWeightLbs) || 175;
    const multMap = {
      sedentary: 13,
      moderate: 15,
      active: 16.5,
      athlete: 18,
    };
    let tdee = Math.round(w * multMap[calcActivity]);
    if (calcGoal === 'cut') tdee -= 450;
    if (calcGoal === 'bulk') tdee += 300;

    // High-protein optimization: ~1.0g to 1.1g per lb on cut/maintain
    const protein = Math.round(w * (calcGoal === 'cut' ? 1.1 : 1.0));
    const fat = Math.round((tdee * 0.27) / 9);
    const carbs = Math.max(Math.round((tdee - protein * 4 - fat * 9) / 4), 50);
    const fiber = Math.round((tdee / 1000) * 14);

    setManualCalories(String(tdee));
    setManualProtein(String(protein));
    setManualFiber(String(fiber));
    setManualCarbs(String(carbs));
    setManualFat(String(fat));
  };

  const handleSaveManualRequirements = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateNutritionGoals({
      targetCalories: Math.max(parseInt(manualCalories, 10) || 2000, 500),
      targetProteinGrams: Math.max(parseInt(manualProtein, 10) || 150, 20),
      targetFiberGrams: Math.max(parseInt(manualFiber, 10) || 30, 5),
      targetCarbsGrams: Math.max(parseInt(manualCarbs, 10) || 200, 10),
      targetFatGrams: Math.max(parseInt(manualFat, 10) || 65, 10),
      weightLbs: parseFloat(calcWeightLbs) || 175,
      activityMultiplier: calcActivity,
      goalType: calcGoal,
      updatedAt: new Date().toISOString(),
    });
    setShowCalculatorSheet(false);
  };

  const analyzeAndLogMeal = async (payload: {
    foodName?: string;
    quantity?: string;
    base64Audio?: string;
    mimeType?: string;
  }) => {
    setIsAnalyzing(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/diet/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to calculate nutrition');
      }

      const items = data.items || [];
      if (items.length === 0) {
        throw new Error('Could not recognize food items.');
      }

      onAddDietEntries(
        items.map((it: any) => ({
          date: selectedDate,
          foodName: it.foodName || payload.foodName || 'Meal',
          quantity: it.quantity || payload.quantity || '1 serving',
          calories: Number(it.calories) || 0,
          proteinGrams: Number(it.proteinGrams) || 0,
          fiberGrams: Number(it.fiberGrams) || 0,
          carbsGrams: Number(it.carbsGrams) || 0,
          fatGrams: Number(it.fatGrams) || 0,
          sugarGrams: Number(it.sugarGrams) || 0,
          sodiumMg: Number(it.sodiumMg) || 0,
          micronutrientSummary: it.micronutrientSummary || '',
        }))
      );

      setFoodName('');
      setQuantity('');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error calculating nutritional values.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleManualFoodSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foodName.trim()) return;
    await analyzeAndLogMeal({
      foodName: foodName.trim(),
      quantity: quantity.trim() || '1 standard serving',
    });
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1] || '');
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const toggleVoiceMealRecord = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    setErrorMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (blob.size < 200) return;
        const base64Audio = await blobToBase64(blob);
        await analyzeAndLogMeal({
          base64Audio,
          mimeType: recorder.mimeType || 'audio/webm',
        });
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      setErrorMsg('Microphone unavailable. Enter food and quantity below.');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-8">
      {/* 1. Calorie & Protein Intake Progress Bento Card */}
      <div className="apple-bento p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]">
              Calorie & Protein Completion
            </h2>
            <p className="text-xs text-[#48484A] dark:text-[#AEAEB2]">
              Fills automatically as you log meals on {selectedDate}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowCalculatorSheet((prev) => !prev)}
            className="min-h-[38px] px-4 py-1.5 rounded-full apple-subtile text-xs font-semibold text-[#1E6F56] dark:text-[#34B38A] flex items-center gap-1.5 cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Targets & Calculator</span>
          </button>
        </div>

        {/* Primary Progress Bars: Calories & Protein */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Calories Progress Tile */}
          <div className="apple-subtile p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-[#FF9500]" />
                <span>Calories</span>
              </span>
              <span className="text-xs font-mono tabular-nums text-[#48484A] dark:text-[#AEAEB2]">
                {Math.max(nutritionGoals.targetCalories - totals.calories, 0)} kcal left
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-bold font-mono tabular-nums text-[#1D1D1F] dark:text-[#F5F5F7]">
                {Math.round(totals.calories).toLocaleString()}
                <span className="text-xs font-normal text-[#48484A] dark:text-[#AEAEB2] ml-1">
                  / {nutritionGoals.targetCalories.toLocaleString()} kcal
                </span>
              </div>
              <span className="text-xs font-mono tabular-nums font-semibold text-[#FF9500]">
                {calPercent}%
              </span>
            </div>

            <div className="w-full h-3 rounded-full bg-black/[0.07] dark:bg-white/[0.1] overflow-hidden">
              <div
                style={{ width: `${calPercent}%` }}
                className="h-full rounded-full bg-gradient-to-r from-[#FF9500] to-[#FFB340] transition-all duration-500"
              />
            </div>
          </div>

          {/* Protein Progress Tile */}
          <div className="apple-subtile p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] flex items-center gap-1.5">
                <Beef className="w-4 h-4 text-[#30D158]" />
                <span>Protein</span>
              </span>
              <span className="text-xs font-mono tabular-nums text-[#48484A] dark:text-[#AEAEB2]">
                {Math.max(
                  Math.round((nutritionGoals.targetProteinGrams - totals.protein) * 10) / 10,
                  0
                )}
                g left
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-bold font-mono tabular-nums text-[#1D1D1F] dark:text-[#F5F5F7]">
                {Math.round(totals.protein * 10) / 10}g
                <span className="text-xs font-normal text-[#48484A] dark:text-[#AEAEB2] ml-1">
                  / {nutritionGoals.targetProteinGrams}g
                </span>
              </div>
              <span className="text-xs font-mono tabular-nums font-semibold text-[#30D158]">
                {proteinPercent}%
              </span>
            </div>

            <div className="w-full h-3 rounded-full bg-black/[0.07] dark:bg-white/[0.1] overflow-hidden">
              <div
                style={{ width: `${proteinPercent}%` }}
                className="h-full rounded-full bg-gradient-to-r from-[#30D158] to-[#34C759] transition-all duration-500"
              />
            </div>
          </div>
        </div>

        {/* Hidden Secondary Nutrients Dropdown Toggle */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowSummarySecondaryMacros((prev) => !prev)}
            className="w-full flex items-center justify-between text-xs font-medium text-[#48484A] dark:text-[#AEAEB2] hover:text-[#1D1D1F] dark:hover:text-white py-1.5 cursor-pointer"
          >
            <span>
              {showSummarySecondaryMacros
                ? 'Hide Daily Fiber, Carbs, Fats & Sodium'
                : 'Show Daily Fiber, Carbs, Fats & Sodium'}
            </span>
            {showSummarySecondaryMacros ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {showSummarySecondaryMacros && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-3 border-t border-black/[0.06] dark:border-white/[0.08] mt-2 text-xs">
              <div className="apple-subtile p-3">
                <div className="text-[#48484A] dark:text-[#AEAEB2]">Dietary Fiber</div>
                <div className="font-mono tabular-nums font-semibold text-sm text-[#1D1D1F] dark:text-[#F5F5F7] mt-0.5">
                  {Math.round(totals.fiber * 10) / 10}g / {nutritionGoals.targetFiberGrams}g
                </div>
              </div>
              <div className="apple-subtile p-3">
                <div className="text-[#48484A] dark:text-[#AEAEB2]">Carbohydrates</div>
                <div className="font-mono tabular-nums font-semibold text-sm text-[#1D1D1F] dark:text-[#F5F5F7] mt-0.5">
                  {Math.round(totals.carbs)}g / {nutritionGoals.targetCarbsGrams}g
                </div>
              </div>
              <div className="apple-subtile p-3">
                <div className="text-[#48484A] dark:text-[#AEAEB2]">Total Fat</div>
                <div className="font-mono tabular-nums font-semibold text-sm text-[#1D1D1F] dark:text-[#F5F5F7] mt-0.5">
                  {Math.round(totals.fat * 10) / 10}g / {nutritionGoals.targetFatGrams}g
                </div>
              </div>
              <div className="apple-subtile p-3">
                <div className="text-[#48484A] dark:text-[#AEAEB2]">Total Sugar</div>
                <div className="font-mono tabular-nums font-semibold text-sm text-[#1D1D1F] dark:text-[#F5F5F7] mt-0.5">
                  {Math.round(totals.sugar * 10) / 10}g
                </div>
              </div>
              <div className="apple-subtile p-3">
                <div className="text-[#48484A] dark:text-[#AEAEB2]">Sodium</div>
                <div className="font-mono tabular-nums font-semibold text-sm text-[#1D1D1F] dark:text-[#F5F5F7] mt-0.5">
                  {Math.round(totals.sodium)} mg
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Intake Requirement Calculator & Manual Target Updater Sheet */}
      {showCalculatorSheet && (
        <form
          onSubmit={handleSaveManualRequirements}
          className="apple-bento p-6 space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-[#1D1D1F] dark:text-[#F5F5F7]">
              Calorie & Protein Requirement Calculator + Manual Targets
            </h3>
            <button
              type="button"
              onClick={handleRunRequirementCalculator}
              className="px-3.5 py-1.5 rounded-full bg-[#1E6F56]/12 text-[#1E6F56] dark:text-[#34B38A] text-xs font-semibold cursor-pointer"
            >
              Auto-Calculate from Weight
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pb-3 border-b border-black/[0.06] dark:border-white/[0.08]">
            <div>
              <label className="block text-[11px] text-[#48484A] dark:text-[#AEAEB2] mb-1">Body Weight (lbs)</label>
              <input
                type="number"
                value={calcWeightLbs}
                onChange={(e) => setCalcWeightLbs(e.target.value)}
                className="w-full apple-subtile px-3.5 py-2 text-xs font-mono tabular-nums text-[#1D1D1F] dark:text-[#F5F5F7]"
              />
            </div>
            <div>
              <label className="block text-[11px] text-[#48484A] dark:text-[#AEAEB2] mb-1">Activity Level</label>
              <select
                value={calcActivity}
                onChange={(e) => setCalcActivity(e.target.value as any)}
                className="w-full apple-subtile px-3.5 py-2 text-xs text-[#1D1D1F] dark:text-[#F5F5F7]"
              >
                <option value="sedentary">Sedentary</option>
                <option value="moderate">Moderately Active (3x/wk)</option>
                <option value="active">Active Training (4–5x/wk)</option>
                <option value="athlete">High Volume Athlete</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-[#48484A] dark:text-[#AEAEB2] mb-1">Goal</label>
              <select
                value={calcGoal}
                onChange={(e) => setCalcGoal(e.target.value as any)}
                className="w-full apple-subtile px-3.5 py-2 text-xs text-[#1D1D1F] dark:text-[#F5F5F7]"
              >
                <option value="cut">Fat Loss / Deficit (-450 kcal)</option>
                <option value="maintain">Maintenance / Recomp</option>
                <option value="bulk">Lean Surplus (+300 kcal)</option>
              </select>
            </div>
          </div>

          {/* Manual Requirement Targets (Always editable over time) */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-[#FF9500] mb-1">
                Calories (kcal)
              </label>
              <input
                type="number"
                value={manualCalories}
                onChange={(e) => setManualCalories(e.target.value)}
                className="w-full apple-subtile px-3 py-2 text-xs font-mono tabular-nums text-[#1D1D1F] dark:text-[#F5F5F7]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#30D158] mb-1">
                Protein (g)
              </label>
              <input
                type="number"
                value={manualProtein}
                onChange={(e) => setManualProtein(e.target.value)}
                className="w-full apple-subtile px-3 py-2 text-xs font-mono tabular-nums text-[#1D1D1F] dark:text-[#F5F5F7]"
              />
            </div>
            <div>
              <label className="block text-[11px] text-[#48484A] dark:text-[#AEAEB2] mb-1">Fiber (g)</label>
              <input
                type="number"
                value={manualFiber}
                onChange={(e) => setManualFiber(e.target.value)}
                className="w-full apple-subtile px-3 py-2 text-xs font-mono tabular-nums text-[#1D1D1F] dark:text-[#F5F5F7]"
              />
            </div>
            <div>
              <label className="block text-[11px] text-[#48484A] dark:text-[#AEAEB2] mb-1">Carbs (g)</label>
              <input
                type="number"
                value={manualCarbs}
                onChange={(e) => setManualCarbs(e.target.value)}
                className="w-full apple-subtile px-3 py-2 text-xs font-mono tabular-nums text-[#1D1D1F] dark:text-[#F5F5F7]"
              />
            </div>
            <div>
              <label className="block text-[11px] text-[#48484A] dark:text-[#AEAEB2] mb-1">Fat (g)</label>
              <input
                type="number"
                value={manualFat}
                onChange={(e) => setManualFat(e.target.value)}
                className="w-full apple-subtile px-3 py-2 text-xs font-mono tabular-nums text-[#1D1D1F] dark:text-[#F5F5F7]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowCalculatorSheet(false)}
              className="px-4 py-2 text-xs font-medium text-[#48484A] dark:text-[#AEAEB2] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-full apple-btn-primary text-xs font-semibold cursor-pointer"
            >
              Save Daily Requirements
            </button>
          </div>
        </form>
      )}

      {/* 3. Log Food + Quantity Form (AI automatically calculates nutritional values) */}
      <form
        onSubmit={handleManualFoodSubmit}
        className="apple-bento p-5 space-y-3.5"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-[#48484A] dark:text-[#AEAEB2] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#1E6F56] dark:text-[#34B38A]" />
            <span>Log Meal (AI Calculates Calories, Protein, Fiber & Micros)</span>
          </span>

          <button
            type="button"
            onClick={toggleVoiceMealRecord}
            disabled={isAnalyzing}
            className={`min-h-[36px] px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
              isRecording
                ? 'bg-[#FF3B30] text-white'
                : 'bg-[#1E6F56]/12 text-[#1E6F56] dark:text-[#34B38A]'
            }`}
          >
            {isRecording ? (
              <>
                <Square className="w-3 h-3 fill-current" />
                <span>Stop Voice</span>
              </>
            ) : (
              <>
                <Mic className="w-3.5 h-3.5" />
                <span>Voice Log Meal</span>
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          <input
            type="text"
            required
            placeholder="What are you eating? (e.g. Grilled Salmon & Sweet Potato)"
            value={foodName}
            onChange={(e) => setFoodName(e.target.value)}
            className="sm:col-span-6 apple-subtile px-4 py-2.5 text-sm text-[#1D1D1F] dark:text-[#F5F5F7] placeholder:text-[#48484A] dark:text-[#AEAEB2] focus:outline-none focus:border-[#1E6F56]"
          />
          <input
            type="text"
            required
            placeholder="Quantity (e.g. 200g salmon + 1 medium potato)"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="sm:col-span-4 apple-subtile px-4 py-2.5 text-sm text-[#1D1D1F] dark:text-[#F5F5F7] placeholder:text-[#48484A] dark:text-[#AEAEB2] focus:outline-none focus:border-[#1E6F56]"
          />
          <button
            type="submit"
            disabled={isAnalyzing || !foodName.trim()}
            className="sm:col-span-2 min-h-[42px] rounded-full apple-btn-primary text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            {isAnalyzing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Add</span>
              </>
            )}
          </button>
        </div>

        {errorMsg && <div className="text-xs text-[#FF3B30]">{errorMsg}</div>}
      </form>

      {/* 4. Meals Logged on Selected Date (Calories & Protein upfront, rest under dropdown) */}
      {entriesForDate.length === 0 ? (
        <div className="apple-bento py-12 text-center space-y-1">
          <div className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
            No meals logged for {selectedDate}
          </div>
          <p className="text-xs text-[#48484A] dark:text-[#AEAEB2]">
            Enter what you ate and its quantity above—AI will calculate the nutrition.
          </p>
        </div>
      ) : (
        <div className="apple-bento divide-y divide-black/[0.06] dark:divide-white/[0.08] overflow-hidden">
          {entriesForDate.map((entry) => {
            const isExpanded = Boolean(expandedMealIds[entry.id]);
            return (
              <IOSSwipeToDeleteRow
                key={entry.id}
                onDelete={() => onDeleteDietEntry(entry.id)}
                itemLabel={entry.foodName}
              >
                <div className="p-5 space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-[15px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                        {entry.foodName}
                      </div>
                      <div className="text-xs text-[#48484A] dark:text-[#AEAEB2] mt-0.5">{entry.quantity}</div>
                    </div>

                    {/* Primary Focus: Calories & Protein + Expand Dropdown */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right font-mono tabular-nums">
                        <div className="text-sm font-bold text-[#FF9500]">
                          {entry.calories} kcal
                        </div>
                        <div className="text-xs font-semibold text-[#30D158]">
                          {entry.proteinGrams}g protein
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleMealDropdown(entry.id)}
                        title="Show fiber, carbs, fats & micronutrients"
                        className="p-2 rounded-full apple-subtile text-[#48484A] dark:text-[#AEAEB2] hover:text-[#1D1D1F] dark:hover:text-white cursor-pointer"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => onDeleteDietEntry(entry.id)}
                        aria-label={`Delete ${entry.foodName}`}
                        className="p-1.5 text-[#48484A] dark:text-[#AEAEB2] hover:text-[#FF3B30] cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Expandable Dropdown: Fiber, Carbs, Fats, Sugar, Sodium, Micronutrients */}
                  {isExpanded && (
                    <div className="pt-3 border-t border-black/[0.06] dark:border-white/[0.08] space-y-2 text-xs">
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono tabular-nums">
                        <div className="apple-subtile p-2.5">
                          <span className="text-[#48484A] dark:text-[#AEAEB2] block font-sans">Fiber</span>
                          <span className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                            {entry.fiberGrams}g
                          </span>
                        </div>
                        <div className="apple-subtile p-2.5">
                          <span className="text-[#48484A] dark:text-[#AEAEB2] block font-sans">Carbs</span>
                          <span className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                            {entry.carbsGrams}g
                          </span>
                        </div>
                        <div className="apple-subtile p-2.5">
                          <span className="text-[#48484A] dark:text-[#AEAEB2] block font-sans">Fat</span>
                          <span className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                            {entry.fatGrams}g
                          </span>
                        </div>
                        <div className="apple-subtile p-2.5">
                          <span className="text-[#48484A] dark:text-[#AEAEB2] block font-sans">Sugar</span>
                          <span className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                            {entry.sugarGrams}g
                          </span>
                        </div>
                        <div className="apple-subtile p-2.5">
                          <span className="text-[#48484A] dark:text-[#AEAEB2] block font-sans">Sodium</span>
                          <span className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                            {entry.sodiumMg} mg
                          </span>
                        </div>
                      </div>
                      {entry.micronutrientSummary && (
                        <div className="text-[#48484A] dark:text-[#AEAEB2] px-1">
                          <span className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                            Micronutrients:{' '}
                          </span>
                          {entry.micronutrientSummary}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </IOSSwipeToDeleteRow>
            );
          })}
        </div>
      )}
    </div>
  );
};
