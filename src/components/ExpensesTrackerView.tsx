import React, { useState, useRef } from 'react';
import {
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Calendar,
  Mic,
  Square,
  Loader2,
  Receipt,
} from 'lucide-react';
import { ExpenseEntry } from '../types';
import { IOSSwipeToDeleteRow } from './IOSSwipeToDeleteRow';

interface ExpensesTrackerViewProps {
  selectedDate: string;
  expenses: ExpenseEntry[];
  onAddExpenses: (items: Omit<ExpenseEntry, 'id' | 'createdAt'>[]) => void;
  onToggleExpenseCovered: (id: string) => void;
  onDeleteExpense: (id: string) => void;
}

export const ExpensesTrackerView: React.FC<ExpensesTrackerViewProps> = ({
  selectedDate,
  expenses,
  onAddExpenses,
  onToggleExpenseCovered,
  onDeleteExpense,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'pending' | 'covered'>('all');
  const [showAddForm, setShowAddForm] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [deadlineDate, setDeadlineDate] = useState(selectedDate);
  const [category, setCategory] = useState('Utilities');
  const [description, setDescription] = useState('');

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  React.useEffect(() => {
    setDeadlineDate(selectedDate);
  }, [selectedDate]);

  const totalPending = expenses
    .filter((e) => !e.isCovered)
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const totalCovered = expenses
    .filter((e) => e.isCovered)
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const filteredExpenses = expenses
    .filter((e) => {
      if (filterMode === 'pending') return !e.isCovered;
      if (filterMode === 'covered') return e.isCovered;
      return true;
    })
    .sort((a, b) => {
      if (a.isCovered !== b.isCovered) return a.isCovered ? 1 : -1;
      return (a.deadlineDate || '9999-99-99').localeCompare(b.deadlineDate || '9999-99-99');
    });

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (!name.trim() || isNaN(num)) return;
    onAddExpenses([
      {
        date: selectedDate,
        deadlineDate: deadlineDate || selectedDate,
        name: name.trim(),
        amount: num,
        currency,
        category,
        description: description.trim(),
        isCovered: false,
      },
    ]);
    setName('');
    setAmount('');
    setDescription('');
    setShowAddForm(false);
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

  const toggleVoiceExpenseRecord = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

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
        setIsProcessingVoice(true);
        try {
          const base64Audio = await blobToBase64(blob);
          const res = await fetch('/api/voice/expense', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              base64Audio,
              mimeType: recorder.mimeType || 'audio/webm',
              defaultDate: selectedDate,
            }),
          });
          const data = await res.json();
          if (Array.isArray(data.expenses) && data.expenses.length > 0) {
            onAddExpenses(
              data.expenses.map((ex: any) => ({
                date: selectedDate,
                deadlineDate: ex.deadlineDate || selectedDate,
                name: ex.name || 'Expense',
                amount: Number(ex.amount) || 0,
                currency: ex.currency || 'USD',
                category: ex.category || 'Other',
                description: ex.description || '',
                isCovered: false,
              }))
            );
          }
        } finally {
          setIsProcessingVoice(false);
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      setShowAddForm(true);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-8">
      {/* 1. Expenses Overview Bento Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
        <div className="apple-bento p-5 space-y-1">
          <span className="text-xs font-medium text-[#48484A] dark:text-[#AEAEB2]">Pending to Cover</span>
          <div className="text-2xl font-bold font-mono tabular-nums text-[#FF3B30]">
            ${totalPending.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="apple-bento p-5 space-y-1">
          <span className="text-xs font-medium text-[#48484A] dark:text-[#AEAEB2]">Covered / Paid</span>
          <div className="text-2xl font-bold font-mono tabular-nums text-[#30D158]">
            ${totalCovered.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 apple-bento p-5 space-y-1">
          <span className="text-xs font-medium text-[#48484A] dark:text-[#AEAEB2]">Total Tracked</span>
          <div className="text-2xl font-bold font-mono tabular-nums text-[#1D1D1F] dark:text-[#F5F5F7]">
            ${(totalPending + totalCovered).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* 2. Filter Bar + Voice / Manual Add Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-1 p-1 apple-subtile rounded-full">
          {(
            [
              ['all', 'All'],
              ['pending', 'To Cover'],
              ['covered', 'Covered'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilterMode(id)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                filterMode === id
                  ? 'apple-btn-primary'
                  : 'text-[#48484A] dark:text-[#AEAEB2] hover:text-[#1D1D1F] dark:hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleVoiceExpenseRecord}
            disabled={isProcessingVoice}
            className={`min-h-[40px] px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
              isRecording ? 'bg-[#FF3B30] text-white' : 'apple-btn-primary'
            }`}
          >
            {isProcessingVoice ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isRecording ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                <span>Voice Add Expense</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowAddForm((prev) => !prev)}
            className="min-h-[40px] px-4 py-2 rounded-full apple-subtile text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#1E6F56] dark:text-[#34B38A]" />
            <span>New Expense</span>
          </button>
        </div>
      </div>

      {/* 3. New Expense Entry Sheet */}
      {showAddForm && (
        <form
          onSubmit={handleManualSubmit}
          className="apple-bento p-6 space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-5">
              <label className="block text-[11px] text-[#48484A] dark:text-[#AEAEB2] mb-1">Expense Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Car Insurance Renewal"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full apple-subtile px-3.5 py-2 text-sm text-[#1D1D1F] dark:text-[#F5F5F7]"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-[11px] text-[#48484A] dark:text-[#AEAEB2] mb-1">Value / Amount</label>
              <div className="flex gap-1.5">
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full apple-subtile px-3 py-2 text-sm font-mono tabular-nums text-[#1D1D1F] dark:text-[#F5F5F7]"
                />
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="apple-subtile px-2.5 text-xs font-mono text-[#1D1D1F] dark:text-[#F5F5F7]"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="INR">INR</option>
                </select>
              </div>
            </div>

            <div className="sm:col-span-4">
              <label className="block text-[11px] text-[#48484A] dark:text-[#AEAEB2] mb-1">
                Expected Deadline / Date
              </label>
              <input
                type="date"
                value={deadlineDate}
                onChange={(e) => setDeadlineDate(e.target.value)}
                className="w-full apple-subtile px-3.5 py-2 text-xs font-mono text-[#1D1D1F] dark:text-[#F5F5F7]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-4">
              <label className="block text-[11px] text-[#48484A] dark:text-[#AEAEB2] mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full apple-subtile px-3.5 py-2 text-xs text-[#1D1D1F] dark:text-[#F5F5F7]"
              >
                <option value="Housing">Housing & Rent</option>
                <option value="Utilities">Utilities & Internet</option>
                <option value="Food">Food & Groceries</option>
                <option value="Health & Gym">Health & Gym</option>
                <option value="Subscriptions">Subscriptions</option>
                <option value="Taxes & Bills">Taxes & Bills</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="sm:col-span-8">
              <label className="block text-[11px] text-[#48484A] dark:text-[#AEAEB2] mb-1">
                Description & Notes
              </label>
              <input
                type="text"
                placeholder="Details about this expense..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full apple-subtile px-3.5 py-2 text-xs text-[#1D1D1F] dark:text-[#F5F5F7]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
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
              Save Expense
            </button>
          </div>
        </form>
      )}

      {/* 4. Expenses Ledger List */}
      {filteredExpenses.length === 0 ? (
        <div className="apple-bento py-12 text-center space-y-2">
          <Receipt className="w-6 h-6 text-[#48484A] dark:text-[#AEAEB2] mx-auto" />
          <div className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
            No expenses found
          </div>
        </div>
      ) : (
        <div className="apple-bento divide-y divide-black/[0.06] dark:divide-white/[0.08] overflow-hidden">
          {filteredExpenses.map((exp) => (
            <IOSSwipeToDeleteRow
              key={exp.id}
              onDelete={() => onDeleteExpense(exp.id)}
              itemLabel={exp.name}
            >
              <div className="p-5 flex items-start justify-between gap-3.5 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => onToggleExpenseCovered(exp.id)}
                    aria-label={exp.isCovered ? 'Mark expense pending' : 'Mark expense covered'}
                    className="mt-0.5 text-[#1E6F56] dark:text-[#34B38A] shrink-0 cursor-pointer"
                  >
                    {exp.isCovered ? (
                      <CheckCircle2 className="w-5 h-5 text-[#1E6F56] dark:text-[#34B38A]" />
                    ) : (
                      <Circle className="w-5 h-5 text-[#48484A] dark:text-[#AEAEB2]" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div
                      className={`text-[15px] font-semibold ${
                        exp.isCovered
                          ? 'line-through text-[#48484A] dark:text-[#AEAEB2]'
                          : 'text-[#1D1D1F] dark:text-[#F5F5F7]'
                      }`}
                    >
                      {exp.name}
                    </div>

                    {exp.description && (
                      <p className="text-xs text-[#48484A] dark:text-[#AEAEB2] leading-relaxed">{exp.description}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#48484A] dark:text-[#AEAEB2] pt-0.5">
                      <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                        <Calendar className="w-3 h-3 text-[#1E6F56] dark:text-[#34B38A]" />
                        <span>Deadline: {exp.deadlineDate}</span>
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{exp.category}</span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={`font-medium ${
                          exp.isCovered ? 'text-[#30D158]' : 'text-[#FF9500]'
                        }`}
                      >
                        {exp.isCovered ? 'Covered' : 'To Cover'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right font-mono tabular-nums">
                    <div
                      className={`text-base font-bold ${
                        exp.isCovered
                          ? 'text-[#48484A] dark:text-[#AEAEB2] line-through'
                          : 'text-[#1D1D1F] dark:text-[#F5F5F7]'
                      }`}
                    >
                      {exp.currency === 'USD' ? '$' : `${exp.currency} `}
                      {exp.amount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onDeleteExpense(exp.id)}
                    aria-label={`Delete ${exp.name}`}
                    className="p-1.5 text-[#48484A] dark:text-[#AEAEB2] hover:text-[#FF3B30] cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </IOSSwipeToDeleteRow>
          ))}
        </div>
      )}
    </div>
  );
};
