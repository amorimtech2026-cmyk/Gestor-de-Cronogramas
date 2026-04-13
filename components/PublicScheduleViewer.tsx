'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  Download, 
  AlertCircle, 
  X, 
  Linkedin, 
  Instagram, 
  Link as LinkIcon, 
  Share2 
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Image from 'next/image';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Holiday } from '@/lib/calendar';
import { Button } from './ui/Button';

interface PublicScheduleViewerProps {
  schedule: any;
  courses: any[];
  teachers: any[];
  holidays: Holiday[];
  onClose: () => void;
}

export function PublicScheduleViewer({ schedule, courses, teachers, holidays, onClose }: PublicScheduleViewerProps) {
  const [selectedCourseId, setSelectedCourseId] = useState(schedule.courseIds[0]);
  const [scheduleData, setScheduleData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [isIframe, setIsIframe] = useState(false);

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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsIframe(window.self !== window.top);
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'classes'), where('scheduleId', '==', schedule.id));
    
    const unsubscribe = onSnapshot(q, (snap) => {
      const classes = snap.docs.map(doc => doc.data());
      
      // Group by discipline for the selected course
      const disciplineGroups: { [key: string]: any } = {};
      const dates: string[] = [];
      
      classes.forEach((c: any) => {
        const isRelevant = c.isCommon || c.courseId === selectedCourseId;
        if (!isRelevant) return;
        
        dates.push(c.date);
        const key = c.disciplineName;
        if (!disciplineGroups[key]) {
          disciplineGroups[key] = {
            type: 'discipline',
            name: c.disciplineName,
            isCommon: c.isCommon,
            teacherId: c.teacherId,
            dates: []
          };
        }
        if (!disciplineGroups[key].dates.includes(c.date)) {
          disciplineGroups[key].dates.push(c.date);
        }
      });
      
      const items: any[] = Object.values(disciplineGroups);
      
      // Add relevant holidays
      if (dates.length > 0) {
        const sortedDates = [...dates].sort();
        const minDate = sortedDates[0];
        const maxDate = sortedDates[sortedDates.length - 1];
        
        holidays.forEach((h: any) => {
          if (h.date >= minDate && h.date <= maxDate) {
            items.push({
              type: 'holiday',
              date: h.date,
              description: h.description
            });
          }
        });
      }
      
      // Sort items by date
      items.sort((a, b) => {
        const dateA = a.type === 'discipline' ? [...a.dates].sort()[0] : a.date;
        const dateB = b.type === 'discipline' ? [...b.dates].sort()[0] : b.date;
        return dateA.localeCompare(dateB);
      });
      
      setScheduleData(items);
      setLoading(false);
    }, (e) => {
      console.error("Error fetching classes:", e);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [schedule, selectedCourseId, holidays]);

  const selectedCourse = courses.find((c: any) => c.id === selectedCourseId);

  // PDF Export
  const exportPDF = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-white z-[150] flex flex-col">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="h-full flex flex-col"
      >
        <div className="p-4 sm:p-8 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#0f172a] text-white shrink-0 no-print">
          <div className="flex items-center gap-4">
            <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
              <ChevronLeft className="w-8 h-8" />
            </button>
            <div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tighter uppercase leading-none">{schedule.className}</h2>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Cronograma Acadêmico (Tempo Real)</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
            <Button variant="secondary" onClick={exportPDF} className="w-full sm:w-auto bg-amber-500 text-slate-900 hover:bg-amber-600 border-none shadow-2xl font-black uppercase tracking-tighter">
              <Download className="w-4 h-4" /> Gerar PDF
            </Button>
            {isIframe && (
              <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest animate-pulse">
                Use nova aba para imprimir
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-10 bg-slate-50">
          {/* Course Selector */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 no-print">
            <span className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Filtrar por Curso:</span>
            <div className="flex flex-wrap gap-3">
              {schedule.courseIds.map((cid: string, idx: number) => {
                const courseName = getCourseName(cid, idx, schedule.courseNames);
                const active = selectedCourseId === cid;
                return (
                  <button
                    key={cid}
                    onClick={() => setSelectedCourseId(cid)}
                    className={`px-6 py-2.5 rounded-lg text-xs font-black transition-all uppercase tracking-tight ${
                      active 
                        ? 'bg-slate-900 text-white shadow-xl border border-slate-800' 
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {courseName}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Calendar Grid */}
          <div id="public-schedule-pdf" className="bg-white p-8 rounded-xl border border-slate-200 shadow-xl">
            {/* Hidden Print Table for Public View */}
            <div id="public-print-table-content" className="hidden print:block bg-white text-black font-sans">
              <div className="mb-10 border-b-4 border-slate-900 pb-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">Cronograma de Aulas</h1>
                    <p className="text-amber-600 font-black uppercase tracking-[0.3em] mt-2">Pós-Graduação Faculdade Esuda</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Emitido em</p>
                    <p className="text-xs font-bold">{format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
                  </div>
                </div>
                <div className="mt-8 grid grid-cols-2 gap-6 text-xs bg-slate-50 p-6 rounded-lg border border-slate-100">
                  <p><span className="font-black uppercase text-slate-400 tracking-tighter mr-2">Curso:</span> <span className="font-bold text-slate-900">{getCourseName(selectedCourseId, schedule.courseIds.indexOf(selectedCourseId), schedule.courseNames)}</span></p>
                  <p><span className="font-black uppercase text-slate-400 tracking-tighter mr-2">Turma:</span> <span className="font-bold text-slate-900">{schedule.className}</span></p>
                  <p><span className="font-black uppercase text-slate-400 tracking-tighter mr-2">Início:</span> <span className="font-bold text-slate-900">{schedule.startDate ? format(new Date(schedule.startDate + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR }) : 'A definir'}</span></p>
                  <p><span className="font-black uppercase text-slate-400 tracking-tighter mr-2">Local:</span> <span className="font-bold text-slate-900">Recife/PE</span></p>
                </div>
              </div>

              <table className="w-full border-collapse border border-slate-300 text-[10px]">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="border border-slate-300 p-3 text-left w-24 uppercase tracking-widest font-black">Data</th>
                    <th className="border border-slate-300 p-3 text-left uppercase tracking-widest font-black">Disciplina</th>
                    <th className="border border-slate-300 p-3 text-left w-48 uppercase tracking-widest font-black">Professor</th>
                    <th className="border border-slate-300 p-3 text-left w-28 uppercase tracking-widest font-black">Eixo</th>
                  </tr>
                </thead>
                <tbody>
                  {scheduleData.map((item: any, idx: number) => {
                    if (item.type === 'holiday') {
                      return (
                        <tr key={`holiday-${idx}`} className="bg-red-50">
                          <td className="border border-slate-300 p-3 font-black text-red-600">
                            {format(new Date(item.date + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                          </td>
                          <td colSpan={3} className="border border-slate-300 p-3 font-black text-red-600 uppercase tracking-tight">
                            FERIADO: {item.description}
                          </td>
                        </tr>
                      );
                    }
                    
                    const teacher = teachers.find((t: any) => t.id === item.teacherId);
                    return (
                      <tr key={`discipline-${idx}`} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <td className="border border-slate-300 p-3 font-bold text-slate-900">
                          {item.dates.sort().map((d: string) => format(new Date(d + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })).join(' e ')}
                        </td>
                        <td className="border border-slate-300 p-3">
                          <div className="font-black text-slate-900 uppercase tracking-tight">{item.name}</div>
                        </td>
                        <td className="border border-slate-300 p-3">
                          <div className="font-bold text-slate-700">{teacher?.name || 'A definir'}</div>
                        </td>
                        <td className="border border-slate-300 p-3 text-[9px] font-black uppercase tracking-tighter text-slate-400">
                          {item.isCommon ? 'Tronco Comum' : 'Específica'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="mt-16 pt-10 border-t border-slate-200 text-center text-[9px] text-slate-400 font-black uppercase tracking-[0.3em]">
                <p>Documento Oficial - Pós-Graduação Faculdade Esuda</p>
                <p className="mt-2">© {new Date().getFullYear()} Esuda Acadêmico - Excelência em Educação</p>
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4 no-print">
                <div className="w-12 h-12 border-4 border-slate-900 border-t-amber-500 rounded-full animate-spin" />
                <p className="text-slate-500 font-black uppercase tracking-widest text-xs">Sincronizando Cronograma...</p>
              </div>
            ) : (
              <div className="no-print">
                <div className="mb-10 text-center space-y-2">
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-tight">
                    {getCourseName(selectedCourseId, schedule.courseIds.indexOf(selectedCourseId), schedule.courseNames)}
                  </h3>
                  <div className="flex items-center justify-center gap-4">
                    <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">
                      Turma: {schedule.className} | Início: {schedule.startDate ? format(new Date(schedule.startDate + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR }) : 'A definir'}
                    </p>
                    {schedule.lastUpdated && (
                      <span className="text-[10px] text-slate-400 font-black uppercase tracking-tight bg-slate-50 px-2 py-1 rounded">
                        Atualizado: {typeof schedule.lastUpdated.toDate === 'function' ? format(schedule.lastUpdated.toDate(), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : 'Recentemente'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {scheduleData.map((item: any, idx: number) => {
                    if (item.type === 'holiday') {
                      return (
                        <div 
                          key={`holiday-${idx}`}
                          className="relative p-6 rounded-xl border bg-red-50 border-red-100 shadow-sm"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <span className="text-xl font-black text-slate-900">
                              {format(new Date(item.date + 'T12:00:00'), 'dd/MM', { locale: ptBR })}
                            </span>
                            <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">
                              {format(new Date(item.date + 'T12:00:00'), 'EEEE', { locale: ptBR })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-red-600">
                            <AlertCircle className="w-4 h-4" />
                            <span className="text-xs font-black uppercase tracking-tight">{item.description}</span>
                          </div>
                        </div>
                      );
                    }

                    const teacher = teachers.find((t: any) => t.id === item.teacherId);
                    const sortedDates = [...item.dates].sort();
                    
                    return (
                      <div 
                        key={`discipline-${idx}`}
                        className="relative p-6 rounded-xl border bg-white border-slate-200 hover:border-amber-500 hover:shadow-2xl transition-all flex flex-col group"
                      >
                        <div className="flex flex-wrap gap-x-3 gap-y-1 items-start mb-4">
                          {sortedDates.map((date: string, dIdx: number) => (
                            <div key={`${date}-${dIdx}`} className="flex items-center gap-1">
                              <span className="text-xl font-black text-slate-900 group-hover:text-amber-600 transition-colors">
                                {format(new Date(date + 'T12:00:00'), 'dd/MM', { locale: ptBR })}
                              </span>
                              {dIdx < sortedDates.length - 1 && <span className="text-slate-300 font-black">&</span>}
                            </div>
                          ))}
                        </div>

                        <div className="space-y-4 flex-1">
                          <div>
                            <p className="text-[10px] font-black text-amber-600 uppercase tracking-[0.2em] mb-1">
                              {item.isCommon ? 'Tronco Comum' : 'Eixo Específico'}
                            </p>
                            <p className="text-sm font-black text-slate-800 leading-tight uppercase tracking-tight">{item.name}</p>
                          </div>
                          {teacher && (
                            <button 
                              onClick={() => setSelectedTeacher(teacher)}
                              className="flex items-center gap-3 pt-4 border-t border-slate-100 mt-auto w-full text-left hover:bg-slate-50 transition-colors group/teacher"
                            >
                              <div className="w-8 h-8 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-200 group-hover/teacher:border-amber-500 transition-colors">
                                {teacher.photoUrl ? (
                                  <Image src={teacher.photoUrl} alt={teacher.name} width={32} height={32} className="w-full h-full object-cover grayscale group-hover/teacher:grayscale-0 transition-all" referrerPolicy="no-referrer" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-xs font-black text-slate-400">{teacher.name[0]}</div>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-600 truncate font-black uppercase tracking-tight group-hover/teacher:text-slate-900 transition-colors flex-1">{teacher.name}</span>
                              <Share2 className="w-3 h-3 text-slate-300 group-hover/teacher:text-amber-500 opacity-0 group-hover/teacher:opacity-100 transition-all" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Teacher Profile Modal */}
      <AnimatePresence>
        {selectedTeacher && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTeacher(null)}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <button 
                onClick={() => setSelectedTeacher(null)}
                className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors z-10"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>

              <div className="p-8 flex flex-col items-center text-center">
                <div className="w-32 h-32 rounded-full bg-indigo-50 border-4 border-white shadow-xl overflow-hidden mb-6">
                  {selectedTeacher.photoUrl ? (
                    <Image src={selectedTeacher.photoUrl} alt={selectedTeacher.name} width={128} height={128} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-indigo-300">{selectedTeacher.name[0]}</div>
                  )}
                </div>

                <h3 className="text-2xl font-bold text-gray-900 mb-1">{selectedTeacher.name}</h3>
                <p className="text-indigo-600 font-bold text-sm uppercase tracking-widest mb-6">Professor Titular</p>

                <div className="w-full space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    {selectedTeacher.linkedin && (
                      <a 
                        href={selectedTeacher.linkedin} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex flex-col items-center gap-2 p-4 bg-blue-50 rounded-2xl hover:bg-blue-100 transition-colors group"
                      >
                        <Linkedin className="w-6 h-6 text-blue-600 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-bold text-blue-700 uppercase">LinkedIn</span>
                      </a>
                    )}
                    {selectedTeacher.instagram && (
                      <a 
                        href={selectedTeacher.instagram} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex flex-col items-center gap-2 p-4 bg-pink-50 rounded-2xl hover:bg-pink-100 transition-colors group"
                      >
                        <Instagram className="w-6 h-6 text-pink-600 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-bold text-pink-700 uppercase">Instagram</span>
                      </a>
                    )}
                    {selectedTeacher.lattes && (
                      <a 
                        href={selectedTeacher.lattes} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex flex-col items-center gap-2 p-4 bg-indigo-50 rounded-2xl hover:bg-indigo-100 transition-colors group"
                      >
                        <LinkIcon className="w-6 h-6 text-indigo-600 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-bold text-indigo-700 uppercase">Lattes</span>
                      </a>
                    )}
                  </div>
                </div>

                <button 
                  onClick={() => setSelectedTeacher(null)}
                  className="mt-8 w-full py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-gray-800 transition-colors"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
