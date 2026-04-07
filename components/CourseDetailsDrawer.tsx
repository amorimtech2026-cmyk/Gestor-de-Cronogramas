'use client';

import React from 'react';
import { motion } from 'motion/react';
import { 
  BookOpen, 
  X, 
  Menu, 
  Calendar, 
  Clock, 
  RotateCcw, 
  Edit, 
  ArrowRight 
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Image from 'next/image';
import { COMMON_DISCIPLINES } from '@/lib/calendar';

interface CourseDetailsDrawerProps {
  course: any;
  teachers: any[];
  schedules: any[];
  onClose: () => void;
  onOpenLanding: () => void;
}

export function CourseDetailsDrawer({ course, teachers, schedules, onClose, onOpenLanding }: CourseDetailsDrawerProps) {
  const activeSchedules = schedules.filter((s: any) => s.courseIds.includes(course.id) && s.status === 'active');
  
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
        className="relative w-full max-w-2xl bg-white h-full shadow-2xl overflow-y-auto flex flex-col"
      >
        {/* Header Image */}
        <div className="h-64 bg-indigo-900 relative shrink-0">
          {course.imageUrl ? (
            <Image src={course.imageUrl} alt={course.name} fill className="object-cover opacity-60" referrerPolicy="no-referrer" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-white/20">
              <BookOpen className="w-24 h-24" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-md transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="absolute bottom-6 left-8 right-8">
            <span className="bg-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest mb-3 inline-block">
              {course.enrollmentStatus || 'Abertas'}
            </span>
            <h2 className="text-3xl font-extrabold text-gray-900 leading-tight">{course.name}</h2>
          </div>
        </div>

        <div className="p-8 space-y-10">
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
            <div className="text-gray-600 text-sm leading-relaxed space-y-4 whitespace-pre-wrap">
              {course.fullDescription || course.marketingSummary || 'Descrição detalhada em breve.'}
            </div>
          </div>

          {/* Disciplines */}
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-gray-900 border-l-4 border-indigo-600 pl-4">Matriz Curricular</h3>
            
            <div className="space-y-6 bg-gray-50 rounded-2xl p-6 border border-gray-100">
              <div>
                <div className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-600" /> Tronco Comum (9 Disciplinas)
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {COMMON_DISCIPLINES.map((d, i) => (
                    <div key={i} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-100 shadow-sm transition-all hover:border-indigo-200">
                      <div className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-[10px] font-bold shrink-0">
                        {i + 1}
                      </div>
                      <span className="text-sm text-gray-700 font-medium">{d.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-600" /> Específicas do Curso ({course.specificDisciplines?.length || 0} Disciplinas)
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {(course.specificDisciplines || []).map((d: string, i: number) => (
                    <div key={i} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-100 shadow-sm transition-all hover:border-indigo-200">
                      <div className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-[10px] font-bold shrink-0">
                        {i + COMMON_DISCIPLINES.length + 1}
                      </div>
                      <span className="text-sm text-gray-700 font-medium">{d}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Active Classes */}
          {activeSchedules.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-900 border-l-4 border-indigo-600 pl-4">Turmas em Andamento</h3>
              <div className="space-y-2">
                {activeSchedules.map((s: any) => (
                  <div key={s.id} className="p-4 bg-indigo-600 text-white rounded-2xl flex justify-between items-center shadow-lg shadow-indigo-200">
                    <div>
                      <p className="text-xs font-bold text-indigo-200 uppercase tracking-wider">Turma</p>
                      <p className="font-bold">{s.className}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-indigo-200 uppercase tracking-wider">Início</p>
                      <p className="font-bold">{format(new Date(s.startDate), 'dd/MM/yyyy', { locale: ptBR })}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="pt-10 flex flex-col gap-3">
            <a 
              href={course.websiteUrl || "https://esuda.edu.br/posgraduacao/"} 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-center block hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
            >
              Quero me inscrever agora
            </a>
            <button 
              onClick={onOpenLanding}
              className="w-full bg-white text-indigo-600 py-4 rounded-2xl font-bold text-center border-2 border-indigo-100 hover:bg-indigo-50 transition-all"
            >
              Ver Folder de Propaganda (PDF)
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
