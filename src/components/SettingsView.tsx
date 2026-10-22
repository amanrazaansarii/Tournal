import React, { useState } from 'react';
import {
  Sun,
  Moon,
  Smartphone,
  Bell,
  Volume2,
  Vibrate,
  Download,
  Upload,
  RotateCcw,
  Check,
} from 'lucide-react';
import { AppSettings } from '../types';
import {
  requestOSNotificationPermission,
  playReminderChime,
  triggerHapticFeedback,
} from '../services/notificationEngine';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (next: AppSettings) => void;
  onExportBackup: () => void;
  onImportBackup: (file: File) => void;
  onResetAllData: () => void;
}

interface PixelSwitchProps {
  checked: boolean;
  onChange: () => void;
  ariaLabel?: string;
}

const PixelSwitch: React.FC<PixelSwitchProps> = ({ checked, onChange, ariaLabel }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={ariaLabel}
    onClick={onChange}
    className={`w-[52px] h-[32px] rounded-full border-2 relative flex items-center cursor-pointer shrink-0 select-none outline-none focus:outline-none focus-visible:outline-none transition-colors duration-200 ${
      checked
        ? 'bg-[#1E6F56] dark:bg-[#34B38A] border-[#1E6F56] dark:border-[#34B38A]'
        : 'bg-[#E6E0E9] dark:bg-[#36343B] border-[#79747E] dark:border-[#938F99]'
    }`}
  >
    <span
      className={`rounded-full flex items-center justify-center transition-all duration-200 ease-out ${
        checked
          ? 'w-6 h-6 translate-x-[22px] bg-white dark:bg-[#0D2B22] shadow-xs'
          : 'w-4 h-4 translate-x-[6px] bg-[#79747E] dark:bg-[#938F99]'
      }`}
    >
      {checked && (
        <Check className="w-3.5 h-3.5 stroke-[3] text-[#1E6F56] dark:text-[#34B38A]" />
      )}
    </span>
  </button>
);

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onExportBackup,
  onImportBackup,
  onResetAllData,
}) => {
  const [permissionState, setPermissionState] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'default'
  );
  const [testAlertSent, setTestAlertSent] = useState(false);

  const toggleSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    const updated = { ...settings, [key]: value };
    onUpdateSettings(updated);
  };

  const toggleCategory = (cat: keyof AppSettings['categories']) => {
    const updated: AppSettings = {
      ...settings,
      categories: {
        ...settings.categories,
        [cat]: !settings.categories[cat],
      },
    };
    onUpdateSettings(updated);
  };

  const handleTestNotification = async () => {
    const perm = await requestOSNotificationPermission();
    setPermissionState(perm);
    playReminderChime(settings);
    triggerHapticFeedback(settings);
    setTestAlertSent(true);
    setTimeout(() => setTestAlertSent(false), 2500);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-8">
      {/* 1. Appearance / Theme Group */}
      <section className="space-y-2">
        <h2 className="px-4 text-xs font-semibold text-[#48484A] dark:text-[#AEAEB2]">Appearance</h2>
        <div className="apple-bento p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7] shrink-0">
              App Theme
            </span>
            <div className="grid grid-cols-3 gap-1 p-1.5 apple-subtile rounded-2xl w-full sm:w-[276px] shrink-0 overflow-hidden">
              {(
                [
                  { id: 'system', label: 'Device', icon: Smartphone },
                  { id: 'light', label: 'Light', icon: Sun },
                  { id: 'dark', label: 'Dark', icon: Moon },
                ] as const
              ).map(({ id, label, icon: Icon }) => {
                const isSelected = settings.theme === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggleSetting('theme', id)}
                    className={`min-h-[36px] w-full px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer border-0 outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 !transition-none ${
                      isSelected
                        ? 'bg-[#1E6F56] dark:bg-[#2A8C6D] text-white'
                        : 'bg-transparent text-[#48484A] dark:text-[#AEAEB2] hover:text-[#1D1D1F] dark:hover:text-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 2. Notification Behavior (Sound, Vibration, Persistent Bar) */}
      <section className="space-y-2">
        <h2 className="px-4 text-xs font-semibold text-[#48484A] dark:text-[#AEAEB2]">
          Notifications & Feedback
        </h2>
        <div className="apple-bento divide-y divide-black/[0.06] dark:divide-white/[0.08]">
          {/* Persistent Bar Toggle */}
          <div className="p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#1E6F56]/12 text-[#1E6F56] dark:text-[#34B38A] flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
                  Persistent Task Bar
                </div>
                <div className="text-xs text-[#48484A] dark:text-[#AEAEB2]">
                  Keep active task pinned at top for quick check/uncheck
                </div>
              </div>
            </div>
            <PixelSwitch
              checked={settings.showPersistentBar}
              onChange={() => toggleSetting('showPersistentBar', !settings.showPersistentBar)}
              ariaLabel="Toggle Persistent Task Bar"
            />
          </div>

          {/* Notification Sound Toggle */}
          <div className="p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#FF9500]/12 text-[#FF9500] flex items-center justify-center shrink-0">
                <Volume2 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
                  Notification Sound
                </div>
                <div className="text-xs text-[#48484A] dark:text-[#AEAEB2]">
                  Play audio chime when task reminders trigger
                </div>
              </div>
            </div>
            <PixelSwitch
              checked={settings.notificationSound}
              onChange={() => toggleSetting('notificationSound', !settings.notificationSound)}
              ariaLabel="Toggle Notification Sound"
            />
          </div>

          {/* Vibration Toggle */}
          <div className="p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#30D158]/12 text-[#30D158] flex items-center justify-center shrink-0">
                <Vibrate className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
                  Vibration & Haptics
                </div>
                <div className="text-xs text-[#48484A] dark:text-[#AEAEB2]">
                  Vibrate on Android devices when tasks trigger or complete
                </div>
              </div>
            </div>
            <PixelSwitch
              checked={settings.notificationVibration}
              onChange={() =>
                toggleSetting('notificationVibration', !settings.notificationVibration)
              }
              ariaLabel="Toggle Vibration and Haptics"
            />
          </div>

          {/* Default Reminder Lead Time */}
          <div className="p-4 flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
                Default Reminder Timing
              </div>
              <div className="text-xs text-[#48484A] dark:text-[#AEAEB2]">
                When to alert before a scheduled task starts
              </div>
            </div>
            <select
              value={settings.defaultReminderMinutes}
              onChange={(e) =>
                toggleSetting('defaultReminderMinutes', Number(e.target.value))
              }
              className="apple-subtile px-3 py-2 text-xs font-medium text-[#1D1D1F] dark:text-[#F5F5F7]"
            >
              <option value={0}>At start time</option>
              <option value={5}>5 mins before</option>
              <option value={15}>15 mins before</option>
              <option value={30}>30 mins before</option>
            </select>
          </div>

          {/* Test Notification & Permission Row */}
          <div className="p-4 flex items-center justify-between gap-4">
            <div className="text-xs text-[#48484A] dark:text-[#AEAEB2]">
              Browser/OS Permission:{' '}
              <span className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                {permissionState}
              </span>
            </div>
            <button
              type="button"
              onClick={handleTestNotification}
              className="min-h-[38px] px-4 py-1.5 rounded-full apple-btn-primary text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              {testAlertSent ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Test Alert Triggered</span>
                </>
              ) : (
                <span>Test Sound & Vibration</span>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* 3. Notification Categories */}
      <section className="space-y-2">
        <h2 className="px-4 text-xs font-semibold text-[#48484A] dark:text-[#AEAEB2]">
          Notification Categories
        </h2>
        <div className="apple-bento divide-y divide-black/[0.06] dark:divide-white/[0.08]">
          {(
            [
              {
                key: 'highPriorityTasks',
                title: 'High-Priority Tasks (P1)',
                desc: 'Critical daily tasks marked as top priority',
              },
              {
                key: 'scheduledTasks',
                title: 'Standard Scheduled Tasks (P2 & P3)',
                desc: 'Medium and low priority time-blocked tasks',
              },
              {
                key: 'workoutReminders',
                title: 'Workouts & Weigh-In',
                desc: 'Reminders to log working sets and daily body weight',
              },
              {
                key: 'eveningJournal',
                title: 'Evening Journal & Tomorrow Setup',
                desc: 'Nightly prompt to reflect and list tomorrow’s tasks',
              },
            ] as const
          ).map((item) => (
            <div key={item.key} className="p-4 flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
                  {item.title}
                </div>
                <div className="text-xs text-[#48484A] dark:text-[#AEAEB2]">{item.desc}</div>
              </div>
              <PixelSwitch
                checked={settings.categories[item.key]}
                onChange={() => toggleCategory(item.key)}
                ariaLabel={`Toggle ${item.title}`}
              />
            </div>
          ))}
        </div>
      </section>

      {/* 4. Units & Regional Preferences */}
      <section className="space-y-2">
        <h2 className="px-4 text-xs font-semibold text-[#48484A] dark:text-[#AEAEB2]">Units & Formatting</h2>
        <div className="apple-bento divide-y divide-black/[0.06] dark:divide-white/[0.08]">
          <div className="p-4 flex items-center justify-between gap-4">
            <span className="text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
              Default Weight Unit
            </span>
            <div className="grid grid-cols-2 gap-1 p-1 apple-subtile rounded-xl w-28 shrink-0 overflow-hidden">
              {(['lbs', 'kg'] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => toggleSetting('defaultWeightUnit', u)}
                  className={`py-1.5 rounded-lg text-xs font-semibold font-mono cursor-pointer border-0 outline-none focus:outline-none focus-visible:outline-none !transition-none ${
                    settings.defaultWeightUnit === u
                      ? 'bg-[#1E6F56] dark:bg-[#2A8C6D] text-white'
                      : 'bg-transparent text-[#48484A] dark:text-[#AEAEB2]'
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 flex items-center justify-between gap-4">
            <span className="text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
              24-Hour Time Display
            </span>
            <PixelSwitch
              checked={settings.use24HourTime}
              onChange={() => toggleSetting('use24HourTime', !settings.use24HourTime)}
              ariaLabel="Toggle 24-Hour Time Display"
            />
          </div>
        </div>
      </section>

      {/* 5. Local Device Data Management */}
      <section className="space-y-2">
        <h2 className="px-4 text-xs font-semibold text-[#48484A] dark:text-[#AEAEB2]">Local Device Storage</h2>
        <div className="apple-bento p-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onExportBackup}
            className="min-h-[42px] px-4 py-2 rounded-full apple-subtile text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#1E6F56] dark:text-[#34B38A]" />
            <span>Export Backup (.json)</span>
          </button>

          <label className="min-h-[42px] px-4 py-2 rounded-full apple-subtile text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] flex items-center gap-2 cursor-pointer">
            <Upload className="w-4 h-4 text-[#1E6F56] dark:text-[#34B38A]" />
            <span>Restore Backup</span>
            <input
              type="file"
              accept=".json"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onImportBackup(file);
              }}
              className="hidden"
            />
          </label>

          <button
            type="button"
            onClick={onResetAllData}
            className="min-h-[42px] px-4 py-2 rounded-full bg-[#FF3B30]/12 text-xs font-semibold text-[#FF3B30] hover:bg-[#FF3B30]/20 flex items-center gap-2 ml-auto cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset Local Data</span>
          </button>
        </div>
      </section>
    </div>
  );
};
