'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  BookOpen, 
  X, 
  Menu, 
  Calendar, 
  Clock, 
  RotateCcw, 
  Edit, 
  ArrowRight,
  Printer,
  Users,
  Check
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Image from 'next/image';
import { COMMON_DISCIPLINES } from '@/lib/calendar';

interface CourseDetailsDrawerProps {
  course: any;
  teachers: any[];
  schedules: any[];
  commonDisciplines: any[];
  onClose: () => void;
}

export function CourseDetailsDrawer({ course, teachers, schedules, commonDisciplines, onClose }: CourseDetailsDrawerProps) {
  const [showDisciplines, setShowDisciplines] = useState(true);
  const [showSyllabus, setShowSyllabus] = useState(true);
  const [showTeachers, setShowTeachers] = useState(true);
  const [showSchedules, setShowSchedules] = useState(true);

  const activeSchedules = schedules.filter((s: any) => s.courseIds.includes(course.id) && s.status === 'active');
  
  // Safe date formatting helper to avoid timezone shifts
  const formatSafeDate = (dateVal: string | number | Date) => {
    if (!dateVal) return 'A definir';
    try {
      if (typeof dateVal === 'string' && dateVal.length === 10 && dateVal.includes('-')) {
        const [y, m, d] = dateVal.split('-');
        return `${d}/${m}/${y}`;
      }
      const d = new Date(dateVal);
      d.setHours(12);
      return format(d, 'dd/MM/yyyy', { locale: ptBR });
    } catch (e) {
      return 'Data inválida';
    }
  };

  // Use teachers prop directly as requested, but we can still filter by specialties if we want to be helpful,
  // however the instruction says "removendo filtros complexos". 
  // Let's filter by those who have this course in their specialties to keep it relevant.
  const courseTeachers = teachers.filter(t => 
    t.specialties?.some((s: any) => {
      // Direct course match
      if (s.courseId === course.id) return true;
      
      // Common trunk match
      if (s.courseId === 'common' || s.courseId === 'tronco-comum') return true;
      
      // Name-based match for common disciplines
      const commonNames = (commonDisciplines.length > 0 ? commonDisciplines : COMMON_DISCIPLINES)
        .map((d: any) => (d.name || '').toLowerCase().trim());
      const specName = (s.disciplineName || s.name || '').toLowerCase().trim();
      
      if (specName && commonNames.includes(specName)) return true;

      return false;
    })
  );

  // Helper to get initials
  const getInitials = (name: string) => {
    if (!name) return '?';
    return name
      .split(' ')
      .filter(Boolean)
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };
  
  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="relative w-full max-w-2xl bg-white h-full shadow-2xl overflow-y-auto flex flex-col print:w-full print:max-w-none print:shadow-none print:h-auto print:overflow-visible"
        id="course-presentation-print"
      >
        {/* Header - Screen Version */}
        <div className="h-64 bg-indigo-900 relative shrink-0 print:hidden">
          {course.imageUrl && !course.imageUrl.includes('esuda.edu.br') ? (
            <Image 
              src={course.imageUrl} 
              alt={course.name} 
              fill 
              className="object-cover opacity-60" 
              referrerPolicy="no-referrer"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = `https://picsum.photos/seed/${course.id}/800/600`;
              }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-white/20">
              {course.imageUrl?.includes('esuda.edu.br') ? (
                <Image 
                  src={`https://picsum.photos/seed/${course.id}/800/600`}
                  alt={course.name}
                  fill
                  className="object-cover opacity-60"
                />
              ) : (
                <BookOpen className="w-24 h-24" />
              )}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
          
          {/* Print Controls Overlay */}
          <div className="absolute top-6 left-8 right-8 flex justify-between items-start no-print">
            <div className="bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-white/20 flex items-center gap-4">
              <div className="flex items-center gap-3 border-r border-slate-200 pr-4">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${showDisciplines ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'}`}>
                    {showDisciplines && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <input type="checkbox" className="hidden" checked={showDisciplines} onChange={() => setShowDisciplines(!showDisciplines)} />
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">Disciplinas</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${showSyllabus ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'}`}>
                    {showSyllabus && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <input type="checkbox" className="hidden" checked={showSyllabus} onChange={() => setShowSyllabus(!showSyllabus)} />
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">Ementa</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${showTeachers ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'}`}>
                    {showTeachers && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <input type="checkbox" className="hidden" checked={showTeachers} onChange={() => setShowTeachers(!showTeachers)} />
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">Professores</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${showSchedules ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'}`}>
                    {showSchedules && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <input type="checkbox" className="hidden" checked={showSchedules} onChange={() => setShowSchedules(!showSchedules)} />
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">Turmas</span>
                </label>
              </div>
              <button 
                onClick={() => window.print()}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
              >
                <Printer className="w-4 h-4" /> Imprimir
              </button>
            </div>

            <button 
              onClick={onClose}
              className="p-2 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-md transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="absolute bottom-6 left-8 right-8">
            <span className="bg-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest mb-3 inline-block">
              {course.enrollmentStatus || 'Abertas'}
            </span>
            <h2 className="text-3xl font-extrabold text-gray-900 leading-tight">{course.name}</h2>
          </div>
        </div>

        {/* Header Print Version */}
        <div className="hidden print:block mb-8">
          <div className="relative w-[calc(100%+2cm)] h-64 -ml-[1cm] -mt-[1cm] mb-6 overflow-hidden bg-indigo-50">
            <Image 
              src={course.imageUrl || `https://picsum.photos/seed/${course.id}/800/600`}
              alt={course.name}
              fill
              className="object-cover object-center"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border border-slate-200 px-3 py-1 rounded-full">
              {course.enrollmentStatus || 'Matrículas Abertas'}
            </span>
            <h1 className="text-4xl font-black text-gray-900 leading-tight">{course.name}</h1>
            {course.marketingSummary && (
              <p className="text-lg text-gray-700 font-medium leading-relaxed italic border-l-4 border-indigo-100 pl-4">
                {course.marketingSummary}
              </p>
            )}
          </div>
        </div>

        <div className="p-8 space-y-10 print:p-0 print:mt-10">
          {/* Technical Data Grid */}
          <div className="grid grid-cols-2 gap-6 bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm text-indigo-600"><BookOpen className="w-4 h-4" /></div>
              <div>
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Carga Horária</p>
                <p className="text-sm font-bold text-gray-900">{course.workload || '360h'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm text-indigo-600"><Menu className="w-4 h-4" /></div>
              <div>
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Formato</p>
                <p className="text-sm font-bold text-gray-900">{course.format || 'Presencial, Remoto'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm text-indigo-600"><Calendar className="w-4 h-4" /></div>
              <div>
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Dia(s)</p>
                <p className="text-sm font-bold text-gray-900">{course.classDays || 'Sáb'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm text-indigo-600"><Clock className="w-4 h-4" /></div>
              <div>
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Horário</p>
                <p className="text-sm font-bold text-gray-900">{course.classTime || '08:00 - 17:00'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm text-indigo-600"><RotateCcw className="w-4 h-4" /></div>
              <div>
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Duração</p>
                <p className="text-sm font-bold text-gray-900">{course.duration || '10 meses'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm text-indigo-600"><Edit className="w-4 h-4" /></div>
              <div>
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Inscrições</p>
                <p className="text-sm font-bold text-gray-900">{course.enrollmentPeriod || 'Consulte o site'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 col-span-2">
              <div className="p-2 bg-white rounded-lg shadow-sm text-indigo-600"><ArrowRight className="w-4 h-4" /></div>
              <div>
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Início das Aulas</p>
                <p className="text-sm font-bold text-gray-900">{course.startDateInfo || 'A definir'}</p>
              </div>
            </div>
          </div>

          {/* Marketing Text */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900 border-l-4 border-indigo-600 pl-4">Sobre o Curso</h3>
            <div className="text-gray-600 text-sm leading-relaxed space-y-4 whitespace-pre-wrap text-justify">
              {course.fullDescription || course.marketingSummary || 'Descrição detalhada em breve.'}
            </div>
          </div>

          {/* Disciplines */}
          {showDisciplines && (
            <div className="space-y-6 break-inside-avoid">
              <h3 className="text-lg font-bold text-gray-900 border-l-4 border-indigo-600 pl-4">Matriz Curricular</h3>
              
              <div className="space-y-6 bg-gray-50 rounded-2xl p-6 border border-gray-100 print:bg-white print:p-0 print:border-none">
                <div>
                  <div className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-indigo-600" /> Tronco Comum ({commonDisciplines.length || 9} Disciplinas)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 print:grid-cols-1">
                    {(commonDisciplines.length > 0 ? commonDisciplines : COMMON_DISCIPLINES).map((d, i) => (
                      <div key={i} className="flex flex-col bg-white p-3 rounded-xl border border-gray-100 shadow-sm transition-all hover:border-indigo-200 print:shadow-none print:border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-[10px] font-bold shrink-0">
                            {i + 1}
                          </div>
                          <span className="text-sm text-gray-700 font-medium">{d.name}</span>
                        </div>
                        {showSyllabus && (
                          <p className="text-xs text-gray-500 mt-1 ml-9 leading-tight italic text-justify">
                            {d.description || 'Ementa detalhada em elaboração'}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-indigo-600" /> Específicas do Curso ({course.specificDisciplines?.length || 0} Disciplinas)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 print:grid-cols-1">
                    {(course.specificDisciplines || []).map((d: any, i: number) => {
                      const discName = typeof d === 'string' ? d : d.name;
                      const discEmenta = typeof d === 'string' ? null : (d.syllabus || d.description || d.ementa);
                      const commonCount = commonDisciplines.length > 0 ? commonDisciplines.length : COMMON_DISCIPLINES.length;
                      return (
                        <div key={i} className="flex flex-col bg-white p-3 rounded-xl border border-gray-100 shadow-sm transition-all hover:border-indigo-200 print:shadow-none print:border-slate-100">
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-[10px] font-bold shrink-0">
                              {i + commonCount + 1}
                            </div>
                            <span className="text-sm text-gray-700 font-medium">{discName}</span>
                          </div>
                          {showSyllabus && (
                            <p className="text-xs text-gray-500 mt-1 ml-9 leading-tight italic text-justify">
                              {discEmenta || 'Ementa detalhada em elaboração'}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Teachers Section */}
          {showTeachers && courseTeachers.length > 0 && (
            <div className="space-y-6 break-inside-avoid">
              <h3 className="text-lg font-bold text-gray-900 border-l-4 border-indigo-600 pl-4">Corpo Docente</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {courseTeachers.map((teacher: any) => (
                  <div key={teacher.id} className="flex flex-col items-center text-center p-4 bg-white rounded-2xl border border-slate-100 shadow-sm print:shadow-none print:border-slate-100">
                    <div className="w-16 h-16 rounded-full bg-indigo-50 mb-3 overflow-hidden relative border-2 border-white shadow-md flex items-center justify-center">
                      {teacher.imageUrl || teacher.photoUrl ? (
                        <Image 
                          src={teacher.imageUrl || teacher.photoUrl} 
                          alt={teacher.name} 
                          fill 
                          className="object-cover" 
                          referrerPolicy="no-referrer" 
                        />
                      ) : (
                        <span className="text-lg font-black text-indigo-300">{getInitials(teacher.name)}</span>
                      )}
                    </div>
                    <p className="text-xs font-black text-slate-900 uppercase tracking-tight leading-tight">{teacher.name}</p>
                    <p className="text-[10px] font-bold text-indigo-600 uppercase mt-1 tracking-tighter">
                      {teacher.titulation || teacher.titulacao || teacher.degree || 'Especialista'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Classes */}
          {showSchedules && activeSchedules.length > 0 && (
            <div className="space-y-4 break-inside-avoid">
              <h3 className="text-lg font-bold text-gray-900 border-l-4 border-indigo-600 pl-4">Turmas em Andamento</h3>
              <div className="space-y-2">
                {activeSchedules.map((s: any) => {
                  const statusMap: Record<string, string> = {
                    'active': 'Em Andamento',
                    'planned': 'Planejada',
                    'completed': 'Concluída'
                  };
                  const statusLabel = statusMap[s.status] || s.status || 'Ativa';

                  return (
                    <div key={s.id} className="p-4 bg-indigo-600 text-white rounded-2xl flex justify-between items-center shadow-lg shadow-indigo-200 print:bg-white print:text-slate-900 print:border print:border-slate-200 print:shadow-none">
                      <div className="flex-1">
                        <p className="text-xs font-bold text-indigo-200 uppercase tracking-wider print:text-slate-400">Turma</p>
                        <p className="font-bold text-sm">{s.className}</p>
                      </div>
                      <div className="flex-1 text-center">
                        <p className="text-xs font-bold text-indigo-200 uppercase tracking-wider print:text-slate-400">Status</p>
                        <p className="font-bold text-sm bg-indigo-500/50 print:bg-slate-100 print:text-slate-700 px-2 py-0.5 rounded inline-block">{statusLabel}</p>
                      </div>
                      <div className="flex-1 text-right">
                        <p className="text-xs font-bold text-indigo-200 uppercase tracking-wider print:text-slate-400">Início</p>
                        <p className="font-bold text-sm">{formatSafeDate(s.startDate)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          <div className="pt-10 flex flex-col gap-3 no-print">
            <a 
              href={course.websiteUrl || "https://esuda.edu.br/posgraduacao/"} 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-center block hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
            >
              Quero me inscrever agora
            </a>
          </div>
          {/* Footer Print Version */}
          <div className="hidden print:flex flex-col items-center justify-center mt-12 pt-6 pb-8 border-t border-slate-200 text-slate-500 text-[10px] text-center space-y-1 break-inside-avoid">
            <p className="font-black uppercase tracking-widest text-indigo-900">Apresentação do curso {course.name}</p>
            <p className="font-bold">Faculdade ESUDA | https://esuda.edu.br/ | (81) 3412-4242</p>
            <p className="font-semibold text-slate-700 mt-2">Emanoel Silva de Amorim</p>
            <p>Coordenação das Especializações em Arquitetura e Engenharia</p>
            <p>email: emanoel@esuda.edu.br | Contatos: (081) 9.9129-8803 / (081) 9.9928-4160</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
