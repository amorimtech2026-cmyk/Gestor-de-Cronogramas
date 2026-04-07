'use client';

import React from 'react';
import { 
  Calendar, 
  ArrowRight, 
  ChevronRight 
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card } from '../ui/Card';

interface SchedulesListProps {
  schedules: any[];
  courses: any[];
  onSelect: (schedule: any) => void;
  isAdmin: boolean;
}

export function SchedulesList({ schedules, courses, onSelect, isAdmin }: SchedulesListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {schedules.map((schedule: any) => (
        <Card 
          key={schedule.id}
          className="p-6 cursor-pointer hover:border-indigo-400 transition-all group"
          onClick={() => onSelect(schedule)}
        >
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div className="bg-indigo-100 text-indigo-700 p-3 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <Calendar className="w-6 h-6" />
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded-lg ${schedule.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                {schedule.status === 'active' ? 'ATIVO' : 'RASCUNHO'}
              </span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{schedule.className}</h3>
              <p className="text-sm text-gray-500 mt-1">Início: {format(new Date(schedule.startDate), 'dd/MM/yyyy', { locale: ptBR })}</p>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cursos Integrados</p>
              <div className="flex flex-wrap gap-2">
                {schedule.courseIds.map((cid: string) => {
                  const c = courses.find((x: any) => x.id === cid);
                  return (
                    <span key={cid} className="text-xs bg-gray-50 text-gray-600 px-2 py-1 rounded-lg border border-gray-100">
                      {c?.name || 'Curso'}
                    </span>
                  );
                })}
              </div>
            </div>
            <div className="pt-4 flex items-center justify-between text-indigo-600 font-bold text-sm">
              <span>{isAdmin ? 'Gerenciar Cronograma' : 'Ver Calendário Completo'}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
