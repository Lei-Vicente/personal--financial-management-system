import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { Bill } from '../types.ts';

interface BillsCalendarProps {
  bills: Bill[];
  selectedDate: Date | null;
  onSelectDate: (date: Date | null) => void;
}

export const BillsCalendar: React.FC<BillsCalendarProps> = ({ bills, selectedDate, onSelectDate }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  
  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(year, month, i));
  }

  // Helper to normalize dates for comparison
  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  };

  const isToday = (d: Date) => isSameDay(d, new Date());

  return (
    <div className="bg-[#FFFFFF] border border-[#D9D9D4] rounded-2xl p-5 shadow-xs w-full select-none">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-extrabold text-[#111111] uppercase tracking-wider">
          {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </h3>
        <div className="flex space-x-1">
          <button onClick={prevMonth} className="p-1.5 hover:bg-[#EBEBE7] rounded-lg transition-colors cursor-pointer text-[#111111]">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={nextMonth} className="p-1.5 hover:bg-[#EBEBE7] rounded-lg transition-colors cursor-pointer text-[#111111]">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
          <div key={day} className="text-center text-[10px] font-bold text-[#6B6B67] uppercase">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((date, i) => {
          if (!date) return <div key={`empty-${i}`} className="h-10" />;

          // Find bills due on this day
          const dayBills = bills.filter(b => {
            const billDate = new Date(b.due_date);
            return isSameDay(billDate, date);
          });

          const isSelected = selectedDate && isSameDay(selectedDate, date);
          const hasUnpaid = dayBills.some(b => !b.is_paid);
          const hasPaid = dayBills.some(b => b.is_paid) && !hasUnpaid;
          const isOverdue = dayBills.some(b => b.is_overdue && !b.is_paid);

          let dayClasses = "h-10 flex flex-col items-center justify-start pt-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all relative border ";
          
          if (isSelected) {
            dayClasses += "bg-[#111111] text-white border-[#111111] shadow-xs scale-[1.02]";
          } else if (isToday(date)) {
            dayClasses += "bg-[#F5F5F3] text-[#111111] border-[#D9D9D4] hover:border-[#111111]";
          } else {
            dayClasses += "bg-transparent text-[#111111] border-transparent hover:bg-[#EBEBE7]";
          }

          return (
            <div 
              key={date.toISOString()} 
              className={dayClasses}
              onClick={() => onSelectDate(isSelected ? null : date)}
            >
              <span className={isSelected ? 'text-white' : ''}>{date.getDate()}</span>
              
              {dayBills.length > 0 && (
                <div className="flex space-x-0.5 mt-0.5">
                  {dayBills.slice(0, 3).map((b, idx) => (
                    <div 
                      key={idx} 
                      className={`w-1.5 h-1.5 rounded-full ${
                        isSelected ? 'bg-white' : (
                          b.is_paid ? 'bg-[#15803D]' : 
                          b.is_overdue ? 'bg-[#B91C1C]' : 'bg-[#D97706]'
                        )
                      }`}
                    />
                  ))}
                  {dayBills.length > 3 && <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="mt-4 flex items-center justify-center space-x-4 text-[10px] font-semibold text-[#6B6B67] uppercase">
        <div className="flex items-center"><div className="w-2 h-2 rounded-full bg-[#15803D] mr-1.5"></div>Paid</div>
        <div className="flex items-center"><div className="w-2 h-2 rounded-full bg-[#D97706] mr-1.5"></div>Upcoming</div>
        <div className="flex items-center"><div className="w-2 h-2 rounded-full bg-[#B91C1C] mr-1.5"></div>Overdue</div>
      </div>
      
      {selectedDate && (
        <div className="mt-3 text-center">
          <button 
            onClick={() => onSelectDate(null)}
            className="text-[10px] font-bold text-[#6B6B67] hover:text-[#111111] uppercase tracking-wider"
          >
            Clear Filter
          </button>
        </div>
      )}
    </div>
  );
};
