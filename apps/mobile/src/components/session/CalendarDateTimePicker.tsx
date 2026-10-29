import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { ChevronLeft, ChevronRight, Clock, Calendar as CalendarIcon } from 'lucide-react-native';

interface CalendarDateTimePickerProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

export const CalendarDateTimePicker: React.FC<CalendarDateTimePickerProps> = ({
  selectedDate,
  onDateChange,
}) => {
  const [viewDate, setViewDate] = useState<Date>(new Date(selectedDate));
  const [selectedHour, setSelectedHour] = useState<number>(() => {
    const h = selectedDate.getHours();
    return h % 12 || 12;
  });
  const [selectedMinute, setSelectedMinute] = useState<number>(() => {
    return selectedDate.getMinutes() < 30 ? 0 : 30;
  });
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>(() => {
    return selectedDate.getHours() >= 12 ? 'PM' : 'AM';
  });

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const handlePrevMonth = () => {
    const prev = new Date(year, month - 1, 1);
    const now = new Date();
    // Don't go before current month
    if (prev.getFullYear() < now.getFullYear() || (prev.getFullYear() === now.getFullYear() && prev.getMonth() < now.getMonth())) {
      return;
    }
    setViewDate(prev);
  };

  const handleNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const applyDateTime = (newDay: number, h = selectedHour, m = selectedMinute, p = selectedPeriod) => {
    const updated = new Date(year, month, newDay);
    let hour24 = h % 12;
    if (p === 'PM') hour24 += 12;
    updated.setHours(hour24, m, 0, 0);
    onDateChange(updated);
  };

  const handleDaySelect = (dayNum: number) => {
    applyDateTime(dayNum);
  };

  const handleHourSelect = (h: number) => {
    setSelectedHour(h);
    applyDateTime(selectedDate.getDate(), h, selectedMinute, selectedPeriod);
  };

  const handleMinuteSelect = (m: number) => {
    setSelectedMinute(m);
    applyDateTime(selectedDate.getDate(), selectedHour, m, selectedPeriod);
  };

  const handlePeriodToggle = (p: 'AM' | 'PM') => {
    setSelectedPeriod(p);
    applyDateTime(selectedDate.getDate(), selectedHour, selectedMinute, p);
  };

  // Generate calendar grid cells
  const calendarCells = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarCells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarCells.push(d);
  }

  const isSameDay = (d: number) => {
    return (
      selectedDate.getFullYear() === year &&
      selectedDate.getMonth() === month &&
      selectedDate.getDate() === d
    );
  };

  const isPast = (d: number) => {
    const checkDate = new Date(year, month, d);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate.getTime() < today.getTime();
  };

  return (
    <View style={styles.container}>
      {/* Calendar Header */}
      <View style={styles.calendarNavHeader}>
        <View style={styles.headerTitleRow}>
          <CalendarIcon size={18} color="#38BDF8" style={{ marginRight: 6 }} />
          <Text style={styles.monthYearText}>
            {monthNames[month]} {year}
          </Text>
        </View>

        <View style={styles.navArrows}>
          <TouchableOpacity
            style={styles.arrowBtn}
            onPress={handlePrevMonth}
            activeOpacity={0.7}
          >
            <ChevronLeft size={18} color="#94A3B8" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.arrowBtn}
            onPress={handleNextMonth}
            activeOpacity={0.7}
          >
            <ChevronRight size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Weekday headers */}
      <View style={styles.weekDaysRow}>
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((w, idx) => (
          <Text key={idx} style={styles.weekDayText}>
            {w}
          </Text>
        ))}
      </View>

      {/* Days Grid */}
      <View style={styles.daysGrid}>
        {calendarCells.map((dayNum, idx) => {
          if (dayNum === null) {
            return <View key={`empty-${idx}`} style={styles.dayCell} />;
          }

          const selected = isSameDay(dayNum);
          const past = isPast(dayNum);
          const isToday =
            today.getFullYear() === year &&
            today.getMonth() === month &&
            today.getDate() === dayNum;

          return (
            <TouchableOpacity
              key={`day-${dayNum}`}
              style={[
                styles.dayCell,
                selected && styles.dayCellSelected,
                isToday && !selected && styles.dayCellToday,
                past && styles.dayCellPast,
              ]}
              onPress={() => !past && handleDaySelect(dayNum)}
              disabled={past}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.dayText,
                  selected && styles.dayTextSelected,
                  past && styles.dayTextPast,
                  isToday && !selected && styles.dayTextToday,
                ]}
              >
                {dayNum}
              </Text>
              {isToday && !selected && <View style={styles.todayDot} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Time Picker Section */}
      <View style={styles.timeSection}>
        <View style={styles.timeSectionHeader}>
          <Clock size={16} color="#A855F7" style={{ marginRight: 6 }} />
          <Text style={styles.timeSectionTitle}>Select Session Time</Text>
        </View>

        {/* Quick Slots */}
        <Text style={styles.subLabel}>Popular Campus Slots:</Text>
        <View style={styles.slotRow}>
          {[
            { label: '09:00 AM', h: 9, m: 0, p: 'AM' },
            { label: '11:00 AM', h: 11, m: 0, p: 'AM' },
            { label: '02:00 PM', h: 2, m: 0, p: 'PM' },
            { label: '04:30 PM', h: 4, m: 30, p: 'PM' },
            { label: '06:00 PM', h: 6, m: 0, p: 'PM' },
            { label: '08:00 PM', h: 8, m: 0, p: 'PM' },
          ].map((slot, idx) => {
            const active =
              selectedHour === slot.h &&
              selectedMinute === slot.m &&
              selectedPeriod === slot.p;
            return (
              <TouchableOpacity
                key={idx}
                style={[styles.slotChip, active && styles.slotChipActive]}
                onPress={() => {
                  setSelectedHour(slot.h);
                  setSelectedMinute(slot.m);
                  setSelectedPeriod(slot.p as any);
                  applyDateTime(selectedDate.getDate(), slot.h, slot.m, slot.p as any);
                }}
              >
                <Text style={[styles.slotChipText, active && styles.slotChipTextActive]}>
                  {slot.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Custom Hour, Minute & AM/PM Picker */}
        <View style={styles.customTimeRow}>
          {/* Hour */}
          <View style={styles.timeSelectorBox}>
            <Text style={styles.unitLabel}>Hour</Text>
            <View style={styles.timeButtonsRow}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((h) => (
                <TouchableOpacity
                  key={h}
                  style={[styles.miniBtn, selectedHour === h && styles.miniBtnActive]}
                  onPress={() => handleHourSelect(h)}
                >
                  <Text style={[styles.miniBtnText, selectedHour === h && styles.miniBtnTextActive]}>
                    {h}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Minute & AM/PM */}
          <View style={styles.minutePeriodRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.unitLabel}>Minute</Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {[0, 15, 30, 45].map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.minuteBtn, selectedMinute === m && styles.miniBtnActive]}
                    onPress={() => handleMinuteSelect(m)}
                  >
                    <Text style={[styles.miniBtnText, selectedMinute === m && styles.miniBtnTextActive]}>
                      :{m.toString().padStart(2, '0')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={{ marginLeft: 12 }}>
              <Text style={styles.unitLabel}>Period</Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {['AM', 'PM'].map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.periodBtn, selectedPeriod === p && styles.periodBtnActive]}
                    onPress={() => handlePeriodToggle(p as any)}
                  >
                    <Text style={[styles.periodBtnText, selectedPeriod === p && styles.periodBtnTextActive]}>
                      {p}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Live Selected Time Banner */}
      <View style={styles.selectedBanner}>
        <Text style={styles.selectedBannerLabel}>📅 Scheduled Session Event:</Text>
        <Text style={styles.selectedBannerVal}>
          {selectedDate.toLocaleDateString([], {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}{' '}
          at{' '}
          {selectedHour}:{selectedMinute.toString().padStart(2, '0')} {selectedPeriod}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#1E293B',
    padding: 16,
    marginBottom: 18,
  },
  calendarNavHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  monthYearText: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800',
  },
  navArrows: {
    flexDirection: 'row',
    gap: 8,
  },
  arrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    paddingBottom: 6,
  },
  weekDayText: {
    width: '14.28%',
    textAlign: 'center',
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
    borderRadius: 10,
    position: 'relative',
  },
  dayCellSelected: {
    backgroundColor: '#38BDF8',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  dayCellToday: {
    borderWidth: 1.5,
    borderColor: '#38BDF8',
  },
  dayCellPast: {
    opacity: 0.25,
  },
  dayText: {
    color: '#F1F5F9',
    fontSize: 13,
    fontWeight: '600',
  },
  dayTextSelected: {
    color: '#0F172A',
    fontWeight: '800',
  },
  dayTextPast: {
    color: '#475569',
  },
  dayTextToday: {
    color: '#38BDF8',
    fontWeight: '700',
  },
  todayDot: {
    position: 'absolute',
    bottom: 3,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#38BDF8',
  },
  timeSection: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingTop: 14,
  },
  timeSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  timeSectionTitle: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '700',
  },
  subLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  slotRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  slotChip: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  slotChipActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#A855F7',
  },
  slotChipText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  slotChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  customTimeRow: {
    backgroundColor: '#090D16',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  timeSelectorBox: {
    marginBottom: 10,
  },
  unitLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  timeButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  miniBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniBtnActive: {
    backgroundColor: '#38BDF8',
  },
  miniBtnText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
  },
  miniBtnTextActive: {
    color: '#0F172A',
    fontWeight: '800',
  },
  minutePeriodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  minuteBtn: {
    flex: 1,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  periodBtn: {
    paddingHorizontal: 12,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  periodBtnActive: {
    backgroundColor: '#A855F7',
  },
  periodBtnText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
  },
  periodBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  selectedBanner: {
    marginTop: 14,
    backgroundColor: '#111F36',
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#38BDF8',
    padding: 10,
  },
  selectedBannerLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  selectedBannerVal: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '800',
  },
});
