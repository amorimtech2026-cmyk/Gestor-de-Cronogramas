'use client';

import React from 'react';
import { 
  Calendar, 
  BookOpen, 
  Users, 
  CheckCircle2 
} from 'lucide-react';
import Image from 'next/image';
import { Card } from '../ui/Card';

interface DashboardOverviewProps {
  schedules: any[];
  courses: any[];
  teachers: any[];
  setActiveTab: (tab: string) => void;
}

export function DashboardOverview({ schedules, courses, teachers, setActiveTab }: DashboardOverviewProps) {
  const activeSchedules = schedules.filter((s: any) => s.status === 'active').length;
  
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white border-none shadow-lg transform hover:scale-[1.02] transition-all cursor-pointer" onClick={() => setActiveTab('schedules')}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-100 text-sm font-medium">Cronogramas Ativos</p>
              <h3 className="text-3xl font-bold mt-1">{activeSchedules}</h3>
            </div>
            <div className="p-3 bg-white/20 rounded-xl">
              <Calendar className="w-6 h-6" />
            </div>
          </div>
        </Card>
        
        <Card className="p-6 bg-white border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={() => setActiveTab('courses')}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Total de Cursos</p>
              <h3 className="text-3xl font-bold mt-1 text-gray-900">{courses.length}</h3>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <BookOpen className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={() => setActiveTab('teachers')}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Docentes</p>
              <h3 className="text-3xl font-bold mt-1 text-gray-900">{teachers.length}</h3>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Status</p>
              <h3 className="text-lg font-bold mt-1 text-green-600 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
                Operacional
              </h3>
            </div>
            <div className="p-3 bg-green-50 text-green-600 rounded-xl">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" /> Cronogramas Recentes
          </h3>
          <div className="space-y-4">
            {schedules.slice(0, 5).map((s: any) => (
              <div key={s.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors border border-transparent hover:border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                    {s.className[0]}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{s.className}</p>
                    <p className="text-xs text-gray-500">{s.courseIds.length} curso(s) integrado(s)</p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${s.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                  {s.status === 'active' ? 'ATIVO' : 'RASCUNHO'}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" /> Docentes Ativos
          </h3>
          <div className="space-y-4">
            {teachers.slice(0, 5).map((t: any) => (
              <div key={t.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors border border-transparent hover:border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden border border-gray-200 relative">
                    {t.photoUrl ? (
                      <Image 
                        src={t.photoUrl} 
                        alt={t.name} 
                        fill 
                        className="object-cover" 
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold">{t.name[0]}</div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{t.name}</p>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {Array.from(new Set(t.specialties?.map((s: any) => s.courseId === 'common' ? 'Fase Comum' : courses.find((c: any) => c.id === s.courseId)?.name).filter(Boolean))).slice(0, 2).map((courseName: any, idx) => (
                        <span key={idx} className="text-[9px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-medium">
                          {courseName}
                        </span>
                      ))}
                      {(new Set(t.specialties?.map((s: any) => s.courseId)).size > 2) && (
                        <span className="text-[9px] text-gray-400 font-medium">
                          +{new Set(t.specialties?.map((s: any) => s.courseId)).size - 2}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  {t.linkedin && <div className="w-2 h-2 bg-blue-400 rounded-full"></div>}
                  {t.instagram && <div className="w-2 h-2 bg-pink-400 rounded-full"></div>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
