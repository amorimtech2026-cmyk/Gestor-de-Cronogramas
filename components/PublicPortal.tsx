'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ExternalLink, 
  LogIn, 
  RotateCcw, 
  BookOpen, 
  ChevronRight, 
  Calendar, 
  ArrowRight,
  Download
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Image from 'next/image';
import { Card } from './ui/Card';
import { PublicScheduleViewer } from './PublicScheduleViewer';
import { CourseDetailsDrawer } from './CourseDetailsDrawer';

interface PublicPortalProps {
  teachers: any[];
  courses: any[];
  holidays: any[];
  schedules: any[];
  onLogin: () => void;
  isLoggingIn: boolean;
  user: any;
  logout: () => void;
  initialScheduleId?: string | null;
}

export function PublicPortal({ teachers, courses, holidays, schedules, onLogin, isLoggingIn, user, logout, initialScheduleId }: PublicPortalProps) {
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [viewingCourseId, setViewingCourseId] = useState<string | null>(null);

  // Auto-open schedule if ID is in URL
  React.useEffect(() => {
    if (initialScheduleId && schedules.length > 0) {
      const schedule = schedules.find(s => s.id === initialScheduleId);
      if (schedule && schedule.status === 'active') {
        setSelectedScheduleId(schedule.id);
      }
    }
  }, [initialScheduleId, schedules]);

  const activeSchedules = schedules.filter((s: any) => s.status === 'active');
  const selectedSchedule = schedules.find(s => s.id === selectedScheduleId);
  const viewingCourse = courses.find(c => c.id === viewingCourseId);

  const ID_NAME_MAPPING: Record<string, string> = {
    'KuQdvQvzYMo9EAofehxQ': 'Engenharia Legal e Perícias: Avaliações e Desempenho',
    '8ehU2wioAdBWxFOn0Fo8': 'Engenharia e Gestão da Manutenção Predial na Construção 4.0'
  };

  const getCourseName = (cid: string, idx: number, scheduleNames?: string[]) => {
    const course = courses.find((x: any) => x.id === cid);
    if (course) return course.name;
    if (ID_NAME_MAPPING[cid]) return ID_NAME_MAPPING[cid];
    return scheduleNames?.[idx] || 'Curso';
  };

  // If the selected schedule becomes inactive, close it
  React.useEffect(() => {
    if (selectedScheduleId && schedules.length > 0) {
      const schedule = schedules.find(s => s.id === selectedScheduleId);
      if (!schedule || schedule.status !== 'active') {
        setSelectedScheduleId(null);
      }
    }
  }, [selectedScheduleId, schedules]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-[#0f172a] text-white py-10 px-4 sm:px-6 shadow-2xl border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-center md:text-left space-y-3">
            <h1 className="text-3xl sm:text-5xl font-black tracking-tighter uppercase leading-none">
              Portal <span className="text-amber-500">Acadêmico</span> ESUDA
            </h1>
            <p className="text-slate-400 text-lg font-bold uppercase tracking-widest">Pós-Graduações em Engenharia e Arquitetura</p>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-4">
              <span className="bg-slate-800 px-4 py-2 rounded-lg text-xs font-black border border-slate-700 uppercase tracking-tight">
                Coordenação: Prof. Emanoel Amorim
              </span>
              <a 
                href="https://emanoelamorim.base44.app/Home" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs font-black text-amber-500 hover:text-amber-400 transition-colors uppercase tracking-tight border-b-2 border-amber-500/30 pb-1"
              >
                Site do Coordenador <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => window.open(window.location.href, '_blank')}
              className="flex items-center gap-2 px-6 py-3 bg-slate-800 text-amber-500 hover:bg-slate-700 rounded-lg text-sm font-black shadow-xl transition-all border border-slate-700 uppercase tracking-widest"
              title="Abrir em nova aba para melhor experiência de impressão"
            >
              <ExternalLink className="w-4 h-4" />
              Ver em Tela Cheia
            </button>
            {user ? (
              <div className="flex items-center gap-4 bg-slate-800 p-2 pr-4 rounded-lg border border-slate-700">
                <div className="w-10 h-10 rounded-lg bg-amber-500 text-slate-900 flex items-center justify-center font-black">
                  {user.email?.[0].toUpperCase()}
                </div>
                <button onClick={logout} className="text-xs font-black hover:text-amber-500 uppercase tracking-widest transition-colors">Sair</button>
              </div>
            ) : (
              <button 
                onClick={onLogin}
                disabled={isLoggingIn}
                className="bg-slate-800 text-white px-6 py-3 rounded-lg font-black hover:bg-slate-700 transition-all shadow-xl flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-700 uppercase tracking-widest text-xs"
              >
                {isLoggingIn ? (
                  <RotateCcw className="w-4 h-4 animate-spin" />
                ) : (
                  <LogIn className="w-4 h-4" />
                )}
                {isLoggingIn ? 'Entrando...' : 'Área Restrita'}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-8 space-y-16">
        {/* Marketing Section */}
        <section id="courses-section" className="space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-l-8 border-slate-900 pl-6">
            <div>
              <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">Nossas Especializações</h2>
              <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-2">O Novo Modelo Educacional Esuda</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {courses.map((course: any) => (
              <motion.div 
                key={course.id}
                whileHover={{ y: -8 }}
                className="bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden flex flex-col cursor-pointer group hover:border-amber-500/50 transition-all"
                onClick={() => setViewingCourseId(course.id)}
              >
                <div className="h-48 bg-slate-100 relative overflow-hidden">
                  {course.imageUrl && !course.imageUrl.includes('esuda.edu.br') ? (
                    <Image 
                      src={course.imageUrl} 
                      alt={course.name} 
                      fill 
                      className="object-cover grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-700 opacity-80 group-hover:opacity-100"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = `https://picsum.photos/seed/${course.id}/800/600`;
                      }}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-300">
                      {course.imageUrl?.includes('esuda.edu.br') ? (
                        <Image 
                          src={`https://picsum.photos/seed/${course.id}/800/600`}
                          alt={course.name}
                          fill
                          className="object-cover grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-700 opacity-80 group-hover:opacity-100"
                        />
                      ) : (
                        <BookOpen className="w-16 h-16 opacity-20" />
                      )}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent flex items-end p-6">
                    <h3 className="text-white text-xl font-black leading-tight uppercase tracking-tighter group-hover:text-amber-500 transition-colors">{course.name}</h3>
                  </div>
                </div>
                <div className="p-6 flex-1 flex flex-col">
                  <p className="text-slate-600 text-sm line-clamp-3 mb-6 font-medium italic border-l-4 border-slate-100 pl-4 group-hover:border-amber-500 transition-colors">
                    &quot;{course.marketingSummary || 'Conheça mais sobre este curso de excelência da ESUDA.'}&quot;
                  </p>
                  <div className="mt-auto pt-6 border-t border-slate-50 flex justify-between items-center">
                    <div className="flex flex-wrap gap-2">
                      {(course.specificDisciplines || []).slice(0, 2).map((d: any) => {
                        const discName = typeof d === 'string' ? d : d.name;
                        return (
                          <span key={discName} className="text-[10px] bg-slate-100 text-slate-600 px-3 py-1 rounded font-black uppercase tracking-tight">
                            {discName}
                          </span>
                        );
                      })}
                    </div>
                    <span className="text-slate-900 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 group-hover:text-amber-600 transition-colors">
                      Detalhes <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Active Schedules Section */}
        <section className="space-y-8">
          <div className="flex items-center gap-4 border-l-8 border-amber-500 pl-6">
            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">Cronogramas Ativos</h2>
          </div>
          {activeSchedules.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {activeSchedules.map((schedule: any) => (
                <Card 
                  key={schedule.id}
                  className="p-8 cursor-pointer hover:border-amber-500 transition-all group bg-white shadow-xl border-slate-200 rounded-xl"
                  onClick={() => setSelectedScheduleId(schedule.id)}
                >
                  <div className="space-y-6">
                    <div className="flex justify-between items-start">
                      <div className="bg-slate-900 text-amber-500 p-4 rounded-lg group-hover:bg-amber-500 group-hover:text-slate-900 transition-all shadow-lg">
                        <Calendar className="w-6 h-6" />
                      </div>
                      <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-3 py-1.5 rounded uppercase tracking-widest border border-amber-100">Status: Ativo</span>
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-slate-900 group-hover:text-amber-600 transition-colors uppercase tracking-tighter leading-tight">{schedule.className}</h3>
                      <p className="text-sm text-slate-500 mt-2 font-bold uppercase tracking-widest">Início: {format(new Date(schedule.startDate), 'dd/MM/yyyy', { locale: ptBR })}</p>
                    </div>
                    <div className="space-y-3">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Cursos Integrados</p>
                      <div className="flex flex-wrap gap-2">
                        {schedule.courseIds.map((cid: string, idx: number) => {
                          const courseName = getCourseName(cid, idx, schedule.courseNames);
                          return (
                            <span key={cid} className="text-[10px] bg-slate-50 text-slate-700 px-3 py-1.5 rounded font-black border border-slate-100 uppercase tracking-tight">
                              {courseName}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    <div className="pt-6 border-t border-slate-50 flex items-center justify-between text-slate-900 font-black text-xs uppercase tracking-widest group-hover:text-amber-600 transition-colors">
                      <span>Acessar Calendário</span>
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl p-20 text-center border-4 border-dashed border-slate-200">
              <Calendar className="w-16 h-16 text-slate-200 mx-auto mb-6" />
              <p className="text-slate-400 font-black uppercase tracking-widest">Nenhum cronograma ativo no momento.</p>
            </div>
          )}
        </section>
      </main>

      {/* Public Schedule Viewer Modal */}
      {selectedSchedule && (
        <PublicScheduleViewer 
          key={`${selectedSchedule.id}-${selectedSchedule.lastUpdated?.toMillis() || 0}`}
          schedule={selectedSchedule}
          courses={courses}
          teachers={teachers}
          holidays={holidays}
          onClose={() => setSelectedScheduleId(null)}
        />
      )}

      {/* Course Details Drawer */}
      <AnimatePresence>
        {viewingCourse && (
          <CourseDetailsDrawer 
            course={viewingCourse} 
            teachers={teachers}
            schedules={schedules}
            onClose={() => setViewingCourseId(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
