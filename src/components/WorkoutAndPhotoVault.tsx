import React, { useState, useRef } from 'react';
import {
  Dumbbell,
  Plus,
  Trash2,
  Camera,
  Scale,
  Flame,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import {
  WorkoutExercise,
  DailyBodyMetric,
  ProgressPhoto,
  EffortState,
  AppSettings,
} from '../types';
import { VoiceRecorderPanel } from './VoiceRecorderPanel';
import { IOSSwipeToDeleteRow } from './IOSSwipeToDeleteRow';

interface WorkoutAndPhotoVaultProps {
  selectedDate: string;
  onChangeDate: (date: string) => void;
  workouts: WorkoutExercise[];
  onAddWorkout: (exercise: Omit<WorkoutExercise, 'id' | 'createdAt'>) => void;
  onDeleteWorkout: (id: string) => void;
  bodyMetrics: DailyBodyMetric[];
  onSaveBodyMetric: (metric: DailyBodyMetric) => void;
  photos: ProgressPhoto[];
  onAddPhoto: (photo: Omit<ProgressPhoto, 'id' | 'createdAt'>) => Promise<void>;
  onDeletePhoto: (id: string) => Promise<void>;
  settings: AppSettings;
}

export const WorkoutAndPhotoVault: React.FC<WorkoutAndPhotoVaultProps> = ({
  selectedDate,
  workouts,
  onAddWorkout,
  onDeleteWorkout,
  bodyMetrics,
  onSaveBodyMetric,
  photos,
  onAddPhoto,
  onDeletePhoto,
  settings,
}) => {
  const [subView, setSubView] = useState<'sets' | 'photos'>('sets');
  const [showAddForm, setShowAddForm] = useState(false);

  const [exerciseName, setExerciseName] = useState('');
  const [weight, setWeight] = useState<string>('135');
  const [weightUnit, setWeightUnit] = useState<'lbs' | 'kg'>(settings.defaultWeightUnit);
  const [sets, setSets] = useState<string>('3');
  const [reps, setReps] = useState<string>('8');
  const [effortState, setEffortState] = useState<EffortState>('in_control');
  const [notes, setNotes] = useState('');

  const currentMetric = bodyMetrics.find((m) => m.date === selectedDate);
  const [bodyWeightInput, setBodyWeightInput] = useState<string>(
    currentMetric ? String(currentMetric.bodyWeight) : ''
  );
  const [bodyWeightUnit, setBodyWeightUnit] = useState<'lbs' | 'kg'>(
    currentMetric?.bodyWeightUnit || settings.defaultWeightUnit
  );
  const [weightSavedToast, setWeightSavedToast] = useState(false);

  const [photoCaption, setPhotoCaption] = useState('');
  const [poseCategory, setPoseCategory] = useState<
    'Front' | 'Side' | 'Back' | 'Training Session'
  >('Front');
  const [isWebcamOpen, setIsWebcamOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  React.useEffect(() => {
    const found = bodyMetrics.find((m) => m.date === selectedDate);
    setBodyWeightInput(found ? String(found.bodyWeight) : '');
    if (found) setBodyWeightUnit(found.bodyWeightUnit);
  }, [selectedDate, bodyMetrics]);

  const workoutsForDate = workouts.filter((w) => w.date === selectedDate);
  const photosForDate = photos.filter((p) => p.date === selectedDate);

  const handleSaveWeightMeasurement = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(bodyWeightInput);
    if (isNaN(num) || num <= 0) return;
    onSaveBodyMetric({
      date: selectedDate,
      bodyWeight: num,
      bodyWeightUnit,
      measuredAt: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: !settings.use24HourTime,
      }),
    });
    setWeightSavedToast(true);
    setTimeout(() => setWeightSavedToast(false), 1800);
  };

  const handleAddExerciseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!exerciseName.trim()) return;
    onAddWorkout({
      date: selectedDate,
      exerciseName: exerciseName.trim(),
      weight: parseFloat(weight) || 0,
      weightUnit,
      sets: parseInt(sets, 10) || 1,
      reps: parseInt(reps, 10) || 1,
      effortState,
      notes: notes.trim(),
    });
    setExerciseName('');
    setNotes('');
    setShowAddForm(false);
  };

  const handlePhotoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const maxDim = 1200;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.84);
          await onAddPhoto({
            date: selectedDate,
            dataUrl,
            caption: photoCaption.trim() || `${poseCategory} · ${selectedDate}`,
            bodyWeight: currentMetric?.bodyWeight,
            bodyWeightUnit: currentMetric?.bodyWeightUnit,
            poseCategory,
          });
          setPhotoCaption('');
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      setIsWebcamOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);
    } catch {
      // Fallback
    }
  };

  const captureWebcamPhoto = async () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      await onAddPhoto({
        date: selectedDate,
        dataUrl,
        caption: photoCaption.trim() || `Camera · ${selectedDate}`,
        bodyWeight: currentMetric?.bodyWeight,
        bodyWeightUnit: currentMetric?.bodyWeightUnit,
        poseCategory,
      });
      setPhotoCaption('');
    }
    stopWebcam();
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsWebcamOpen(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-8">
      {/* Sub-navigation segmented control: Workouts vs. Progress Photos */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 apple-subtile rounded-full">
          <button
            type="button"
            onClick={() => setSubView('sets')}
            className={`min-h-[36px] px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              subView === 'sets'
                ? 'apple-btn-primary'
                : 'text-[#48484A] dark:text-[#AEAEB2] hover:text-[#1D1D1F] dark:hover:text-white'
            }`}
          >
            Workout Sets ({workoutsForDate.length})
          </button>
          <button
            type="button"
            onClick={() => setSubView('photos')}
            className={`min-h-[36px] px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              subView === 'photos'
                ? 'apple-btn-primary'
                : 'text-[#48484A] dark:text-[#AEAEB2] hover:text-[#1D1D1F] dark:hover:text-white'
            }`}
          >
            Progress Photos ({photos.length})
          </button>
        </div>

        {/* Daily Body Weight Quick Input */}
        <form onSubmit={handleSaveWeightMeasurement} className="flex items-center gap-1.5">
          <Scale className="w-4 h-4 text-[#1E6F56] dark:text-[#34B38A] hidden sm:inline" />
          <input
            type="number"
            step="0.1"
            placeholder="Body weight"
            value={bodyWeightInput}
            onChange={(e) => setBodyWeightInput(e.target.value)}
            className="w-24 h-9 apple-subtile px-3 text-xs font-mono tabular-nums text-[#1D1D1F] dark:text-[#F5F5F7]"
          />
          <select
            value={bodyWeightUnit}
            onChange={(e) => setBodyWeightUnit(e.target.value as 'lbs' | 'kg')}
            className="h-9 apple-subtile px-2.5 text-xs font-mono text-[#1D1D1F] dark:text-[#F5F5F7]"
          >
            <option value="lbs">lbs</option>
            <option value="kg">kg</option>
          </select>
          <button
            type="submit"
            className="h-9 px-3.5 rounded-full apple-btn-primary text-xs font-semibold cursor-pointer"
          >
            {weightSavedToast ? '✓' : 'Save'}
          </button>
        </form>
      </div>

      {subView === 'sets' ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <VoiceRecorderPanel
              mode="workout"
              defaultDate={selectedDate}
              placeholderLabel="Voice Log Sets"
              onWorkoutParsed={({ bodyWeight, bodyWeightUnit: bwUnit, exercises }) => {
                if (bodyWeight && bodyWeight > 0) {
                  onSaveBodyMetric({
                    date: selectedDate,
                    bodyWeight,
                    bodyWeightUnit: bwUnit,
                    measuredAt: new Date().toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: !settings.use24HourTime,
                    }),
                  });
                  setBodyWeightInput(String(bodyWeight));
                }
                exercises.forEach((ex) => {
                  onAddWorkout({
                    date: selectedDate,
                    ...ex,
                  });
                });
              }}
            />

            <button
              type="button"
              onClick={() => setShowAddForm((prev) => !prev)}
              className="min-h-[42px] px-4 py-2 rounded-full apple-subtile text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#1E6F56] dark:text-[#34B38A]" />
              <span>Log Exercise</span>
            </button>
          </div>

          {showAddForm && (
            <form
              onSubmit={handleAddExerciseSubmit}
              className="apple-bento p-5 space-y-3.5"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-[#48484A] dark:text-[#AEAEB2] mb-1">Exercise Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Incline Dumbbell Press"
                    value={exerciseName}
                    onChange={(e) => setExerciseName(e.target.value)}
                    className="w-full apple-subtile px-3.5 py-2 text-sm text-[#1D1D1F] dark:text-[#F5F5F7]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#48484A] dark:text-[#AEAEB2] mb-1">Effort State</label>
                  <select
                    value={effortState}
                    onChange={(e) => setEffortState(e.target.value as EffortState)}
                    className="w-full apple-subtile px-3.5 py-2 text-sm text-[#1D1D1F] dark:text-[#F5F5F7]"
                  >
                    <option value="in_control">In Control</option>
                    <option value="to_failure">Taken to Failure</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] text-[#48484A] dark:text-[#AEAEB2] mb-1">Weight</label>
                  <div className="flex gap-1.5">
                    <input
                      type="number"
                      step="0.5"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      className="w-full apple-subtile px-3 py-2 text-sm font-mono tabular-nums text-[#1D1D1F] dark:text-[#F5F5F7]"
                    />
                    <select
                      value={weightUnit}
                      onChange={(e) => setWeightUnit(e.target.value as 'lbs' | 'kg')}
                      className="apple-subtile px-2 text-xs font-mono text-[#1D1D1F] dark:text-[#F5F5F7]"
                    >
                      <option value="lbs">lbs</option>
                      <option value="kg">kg</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-[#48484A] dark:text-[#AEAEB2] mb-1">Sets</label>
                  <input
                    type="number"
                    min={1}
                    value={sets}
                    onChange={(e) => setSets(e.target.value)}
                    className="w-full apple-subtile px-3 py-2 text-sm font-mono tabular-nums text-[#1D1D1F] dark:text-[#F5F5F7]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-[#48484A] dark:text-[#AEAEB2] mb-1">Reps</label>
                  <input
                    type="number"
                    min={1}
                    value={reps}
                    onChange={(e) => setReps(e.target.value)}
                    className="w-full apple-subtile px-3 py-2 text-sm font-mono tabular-nums text-[#1D1D1F] dark:text-[#F5F5F7]"
                  />
                </div>
              </div>

              <input
                type="text"
                placeholder="Notes (optional)..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full apple-subtile px-3.5 py-2 text-xs text-[#1D1D1F] dark:text-[#F5F5F7]"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 text-xs font-medium text-[#48484A] dark:text-[#AEAEB2] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-full apple-btn-primary text-xs font-semibold cursor-pointer"
                >
                  Save Exercise
                </button>
              </div>
            </form>
          )}

          {workoutsForDate.length === 0 ? (
            <div className="apple-bento py-12 text-center space-y-2">
              <Dumbbell className="w-6 h-6 text-[#48484A] dark:text-[#AEAEB2] mx-auto" />
              <div className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                No exercises logged for {selectedDate}
              </div>
            </div>
          ) : (
            <div className="apple-bento divide-y divide-black/[0.06] dark:divide-white/[0.08] overflow-hidden">
              {workoutsForDate.map((w) => (
                <IOSSwipeToDeleteRow
                  key={w.id}
                  onDelete={() => onDeleteWorkout(w.id)}
                  itemLabel={w.exerciseName}
                >
                  <div className="p-5 flex items-center justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="text-[15px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                        {w.exerciseName}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#48484A] dark:text-[#AEAEB2]">
                        <span className="font-mono tabular-nums font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                          {w.weight} {w.weightUnit}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">
                          {w.sets} sets × {w.reps} reps
                        </span>
                        <span aria-hidden="true">·</span>
                        {w.effortState === 'to_failure' ? (
                          <span className="inline-flex items-center gap-1 text-[#FF9500] font-medium">
                            <Flame className="w-3.5 h-3.5" />
                            <span>To Failure</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[#30D158] font-medium">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>In Control</span>
                          </span>
                        )}
                      </div>
                      {w.notes && <p className="text-xs text-[#48484A] dark:text-[#AEAEB2]">{w.notes}</p>}
                    </div>

                    <button
                      type="button"
                      onClick={() => onDeleteWorkout(w.id)}
                      aria-label={`Delete ${w.exerciseName}`}
                      className="p-2 text-[#48484A] dark:text-[#AEAEB2] hover:text-[#FF3B30] cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </IOSSwipeToDeleteRow>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="apple-bento p-5 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <select
                value={poseCategory}
                onChange={(e) => setPoseCategory(e.target.value as any)}
                className="apple-subtile px-3.5 py-2 text-xs font-medium text-[#1D1D1F] dark:text-[#F5F5F7]"
              >
                <option value="Front">Front</option>
                <option value="Side">Side</option>
                <option value="Back">Back</option>
                <option value="Training Session">Session</option>
              </select>

              <input
                type="text"
                placeholder="Note..."
                value={photoCaption}
                onChange={(e) => setPhotoCaption(e.target.value)}
                className="flex-1 min-w-[140px] apple-subtile px-3.5 py-2 text-xs text-[#1D1D1F] dark:text-[#F5F5F7]"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="min-h-[40px] px-4 py-2 rounded-full apple-btn-primary text-xs font-semibold flex items-center gap-1.5 cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>Add Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoFileSelect}
                  className="hidden"
                />
              </label>

              {!isWebcamOpen ? (
                <button
                  type="button"
                  onClick={startWebcam}
                  className="min-h-[40px] px-4 py-2 rounded-full apple-subtile text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] flex items-center gap-1.5 cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5 text-[#1E6F56] dark:text-[#34B38A]" />
                  <span>Camera</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopWebcam}
                  className="min-h-[40px] px-3.5 py-2 rounded-full bg-[#FF3B30]/10 text-[#FF3B30] text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
              )}
            </div>
          </div>

          {isWebcamOpen && (
            <div className="apple-bento p-5 flex flex-col items-center gap-3">
              <video ref={videoRef} className="w-full max-w-sm rounded-2xl" playsInline muted />
              <button
                type="button"
                onClick={captureWebcamPhoto}
                className="px-4 py-2 rounded-full apple-btn-primary text-xs font-semibold cursor-pointer"
              >
                Capture Photo
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {(photosForDate.length > 0 ? photosForDate : photos).map((photo) => (
              <div
                key={photo.id}
                className="apple-bento overflow-hidden flex flex-col justify-between"
              >
                <div className="relative aspect-[3/4] bg-[#1C1C1E]">
                  <img
                    src={photo.dataUrl}
                    alt={photo.caption}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent p-3 text-white">
                    <div className="text-[11px] font-mono tabular-nums text-[#E5E5EA]">
                      {photo.date} · {photo.poseCategory}
                      {photo.bodyWeight
                        ? ` · ${photo.bodyWeight} ${photo.bodyWeightUnit || 'lbs'}`
                        : ''}
                    </div>
                    <div className="text-xs font-medium truncate">{photo.caption}</div>
                  </div>
                </div>
                <div className="px-3.5 py-2.5 flex items-center justify-between text-xs">
                  <span className="text-[#48484A] dark:text-[#AEAEB2]">On Device</span>
                  <button
                    type="button"
                    onClick={() => onDeletePhoto(photo.id)}
                    className="text-[#FF3B30] font-medium cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
