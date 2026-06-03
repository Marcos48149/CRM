'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarPost {
  id: string;
  createdAt: string;
  scheduledAt?: string;
  caption: string;
  status: 'published' | 'scheduled' | 'failed';
}

interface ContentCalendarProps {
  posts: CalendarPost[];
  onDayClick?: (date: string, posts: CalendarPost[]) => void;
}

const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export function ContentCalendar({ posts, onDayClick }: ContentCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const postsByDate = useMemo(() => {
    const map = new Map<string, CalendarPost[]>();
    for (const post of posts) {
      const day = (post.scheduledAt || post.createdAt).slice(0, 10);
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(post);
    }
    return map;
  }, [posts]);

  const days: { day: number; posts: CalendarPost[] }[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    days.push({ day: d, posts: postsByDate.get(dateStr) || [] });
  }

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  const handleDayClick = (day: number) => {
    if (!onDayClick) return;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayPosts = postsByDate.get(dateStr) || [];
    onDayClick(dateStr, dayPosts);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            {MONTHS[month]} {year}
          </CardTitle>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-px bg-slate-200 rounded-lg overflow-hidden">
          {WEEKDAYS.map((wd) => (
            <div
              key={wd}
              className="bg-slate-50 px-2 py-1.5 text-xs font-medium text-slate-500 text-center"
            >
              {wd}
            </div>
          ))}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="bg-white min-h-[72px]" />
          ))}
          {days.map((d) => {
            const isToday =
              isCurrentMonth &&
              today.getDate() === d.day;
            return (
              <button
                key={d.day}
                onClick={() => handleDayClick(d.day)}
                className={`bg-white min-h-[72px] p-1 text-left hover:bg-slate-50 transition-colors cursor-pointer ${
                  isToday ? 'ring-2 ring-blue-500 ring-inset' : ''
                }`}
              >
                <span
                  className={`text-xs font-medium ${
                    isToday ? 'text-blue-600' : 'text-slate-700'
                  }`}
                >
                  {d.day}
                </span>
                {d.posts.map((p) => (
                  <div
                    key={p.id}
                    className={`mt-0.5 h-1.5 w-1.5 rounded-full mx-auto ${
                      p.status === 'published'
                        ? 'bg-green-500'
                        : p.status === 'failed'
                          ? 'bg-red-500'
                          : 'bg-blue-500'
                    }`}
                  />
                ))}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
