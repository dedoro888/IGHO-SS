import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDate: (dateStr: string) => void;
  initialDate?: string;
  title?: string;
}

export const CalendarPickerModal: React.FC<CalendarPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectDate,
  initialDate = '2026-09-08',
  title = 'Select Date',
}) => {
  if (!isOpen) return null;

  // We set default to September 2026 matching the video
  const [currentYear] = useState(2026);
  const [currentMonth] = useState(8); // 0-indexed: 8 is September
  const [selectedDay, setSelectedDay] = useState<number>(() => {
    if (initialDate) {
      const parts = initialDate.split('-');
      return parseInt(parts[2] || '8', 10);
    }
    return 8;
  });

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const daysOfWeek = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  // September 2026 starts on Tuesday (index 1 if Monday is 0)
  // In Sept 2026: 1st is Tuesday
  const totalDays = 30;
  const startDayIndex = 1; // Tuesday

  const daysArray: (number | null)[] = [];
  for (let i = 0; i < startDayIndex; i++) {
    daysArray.push(null);
  }
  for (let d = 1; d <= totalDays; d++) {
    daysArray.push(d);
  }

  // Format header date string, e.g. "Tue 8 Sept"
  const getHeaderDateString = () => {
    const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][
      new Date(currentYear, currentMonth, selectedDay).getDay()
    ];
    return `${dayName} ${selectedDay} Sept`;
  };

  const handleSet = () => {
    const dayStr = selectedDay < 10 ? `0${selectedDay}` : `${selectedDay}`;
    const monthStr = currentMonth + 1 < 10 ? `0${currentMonth + 1}` : `${currentMonth + 1}`;
    onSelectDate(`${currentYear}-${monthStr}-${dayStr}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-[320px] bg-[#222326] text-white rounded-2xl p-5 shadow-2xl border border-neutral-700/60 select-none animate-in zoom-in-95 duration-150">
        {/* Header display */}
        <div className="pb-4 border-b border-neutral-700/60">
          <div className="text-xs text-neutral-400 font-mono tracking-wider">{currentYear}</div>
          <div className="text-2xl font-semibold tracking-tight text-neutral-100 mt-0.5">
            {getHeaderDateString()}
          </div>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between py-3">
          <button
            type="button"
            className="p-1 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold text-neutral-200">
            {monthNames[currentMonth]} {currentYear}
          </span>
          <button
            type="button"
            className="p-1 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Days of week */}
        <div className="grid grid-cols-7 text-center text-[11px] font-medium text-neutral-400 pb-2">
          {daysOfWeek.map((d, i) => (
            <div key={i} className="py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar days grid */}
        <div className="grid grid-cols-7 text-center text-xs gap-y-1">
          {daysArray.map((day, idx) => {
            if (!day) {
              return <div key={`empty-${idx}`} className="h-8"></div>;
            }
            const isSelected = day === selectedDay;
            const isToday = day === 8;

            return (
              <div key={day} className="h-8 flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => setSelectedDay(day)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs transition-all ${
                    isSelected
                      ? 'bg-[#3b82f6] text-white font-bold shadow-md ring-2 ring-[#60a5fa]'
                      : isToday
                      ? 'bg-neutral-800 text-emerald-400 font-semibold'
                      : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
                  }`}
                >
                  {day}
                </button>
              </div>
            );
          })}
        </div>

        {/* Action Buttons: Clear / Cancel / Set */}
        <div className="flex items-center justify-between pt-5 mt-2 border-t border-neutral-700/60 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setSelectedDay(8);
            }}
            className="text-emerald-400 hover:text-emerald-300 transition-colors px-2 py-1"
          >
            Clear
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="text-neutral-400 hover:text-white transition-colors px-2 py-1"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSet}
              className="text-emerald-400 hover:text-emerald-300 font-bold transition-colors px-2 py-1"
            >
              Set
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
