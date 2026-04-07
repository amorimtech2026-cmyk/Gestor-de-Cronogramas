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
  ArrowRight 
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Image from 'next/image';
import { Card } from './ui/Card';
import { PublicScheduleViewer } from './PublicScheduleViewer';
import { CourseDetailsDrawer } from './CourseDetailsDrawer';
import { CourseLandingPage } from './CourseLandingPage';
import { MarketingCatalog } from './MarketingCatalog';

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
  const [landingCourseId, setLandingCourseId] = useState<string | null>(null);
  const [showCatalog, setShowCatalog] = useState(false);

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
  const landingCourse = courses.find(c => c.id === landingCourseId);

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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-indigo-700 text-white py-8 px-4 sm:px-6 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left space-y-2">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Calendário Acadêmico ESUDA</h1>
            <p className="text-indigo-100 text-lg">Pós-Graduações em Engenharia e Arquitetura</p>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-2">
              <span className="bg-indigo-600/50 px-3 py-1 rounded-full text-sm font-medium border border-indigo-400/30">
                Coordenador: Prof. Emanoel Amorim
              </span>
              <a 
                href="https://emanoelamorim.base44.app/Home" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm font-bold hover:text-indigo-200 transition-colors underline underline-offset-4"
              >
                Site do Coordenador <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowCatalog(true)}
              className="hidden sm:flex items-center gap-2 px-5 py-2.5 bg-white text-indigo-700 hover:bg-indigo-50 rounded-xl text-sm font-black shadow-lg transition-all hover:scale-105"
            >
              <BookOpen className="w-4 h-4" />
              Conheça nossos Cursos
            </button>
            {user ? (
              <div className="flex items-center gap-3 bg-white/10 p-2 rounded-xl backdrop-blur-sm">
                <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center font-bold">
                  {user.email?.[0].toUpperCase()}
                </div>
                <button onClick={logout} className="text-xs font-bold hover:text-indigo-200 uppercase tracking-wider">Sair</button>
              </div>
            ) : (
              <button 
                onClick={onLogin}
                disabled={isLoggingIn}
                className="bg-white text-indigo-700 px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-50 transition-all shadow-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 space-y-12">
        {/* Marketing Section */}
        <section id="courses-section" className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-l-4 border-indigo-600 pl-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Nossas Pós-Graduações</h2>
              <p className="text-gray-500 text-sm">Conheça o Novo Modelo Educacional Esuda</p>
            </div>
            <button 
              onClick={() => setShowCatalog(true)}
              className="bg-indigo-50 text-indigo-700 px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-100 transition-all flex items-center gap-2 border border-indigo-100"
            >
              <RotateCcw className="w-4 h-4" />
              Ver Catálogo de Propaganda (PDF)
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course: any) => (
              <motion.div 
                key={course.id}
                whileHover={{ y: -5 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col cursor-pointer group"
                onClick={() => setViewingCourseId(course.id)}
              >
                <div className="h-40 bg-indigo-100 relative overflow-hidden">
                  {course.imageUrl ? (
                    <Image 
                      src={course.imageUrl} 
                      alt={course.name} 
                      fill 
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-indigo-300">
                      <BookOpen className="w-16 h-16 opacity-20" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-4">
                    <h3 className="text-white font-bold leading-tight drop-shadow-md">{course.name}</h3>
                  </div>
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <p className="text-gray-600 text-sm line-clamp-3 mb-4 italic">
                    &quot;{course.marketingSummary || 'Conheça mais sobre este curso de excelência da ESUDA.'}&quot;
                  </p>
                  <div className="mt-auto pt-4 border-t border-gray-50 flex justify-between items-center">
                    <div className="flex flex-wrap gap-1">
                      {course.specificDisciplines?.slice(0, 2).map((d: string) => (
                        <span key={d} className="text-[9px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full truncate max-w-[120px]">
                          {d}
                        </span>
                      ))}
                    </div>
                    <span className="text-indigo-600 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1">
                      Ver mais <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Active Schedules Section */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 border-l-4 border-indigo-600 pl-4">
            <h2 className="text-2xl font-bold text-gray-900">Cronogramas Ativos</h2>
          </div>
          {activeSchedules.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeSchedules.map((schedule: any) => (
                <Card 
                  key={schedule.id}
                  className="p-6 cursor-pointer hover:border-indigo-400 transition-all group"
                  onClick={() => setSelectedScheduleId(schedule.id)}
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="bg-indigo-100 text-indigo-700 p-3 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <Calendar className="w-6 h-6" />
                      </div>
                      <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">ATIVO</span>
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
                      <span>Ver Calendário Completo</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-12 text-center border-2 border-dashed border-gray-200">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Nenhum cronograma ativo no momento.</p>
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
            onOpenLanding={() => {
              setViewingCourseId(null);
              setLandingCourseId(viewingCourse.id);
            }}
          />
        )}
      </AnimatePresence>

      {/* Course Landing Page (Marketing View) */}
      <AnimatePresence>
        {landingCourse && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[200]"
          >
            <CourseLandingPage 
              course={landingCourse} 
              onClose={() => setLandingCourseId(null)} 
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Marketing Catalog (Full Portfolio) */}
      <AnimatePresence>
        {showCatalog && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed inset-0 z-[200]"
          >
            <MarketingCatalog 
              courses={courses} 
              onClose={() => setShowCatalog(false)} 
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
