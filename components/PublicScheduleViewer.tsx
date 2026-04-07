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
  const exportPDF = async () => {
    const html2pdf = (await import('html2pdf.js')).default;
    const element = document.getElementById('public-print-table-content');
    if (!element) return;
    
    // Temporarily show the element for capture
    element.style.display = 'block';
    element.style.position = 'static';
    element.style.visibility = 'visible';

    const opt = {
      margin: [10, 10],
      filename: `Cronograma_${selectedCourse?.name}_${schedule.className}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true,
        logging: false,
        letterRendering: true
      },
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
    };

    html2pdf().set(opt).from(element).save().then(() => {
      // Hide it again
      element.style.display = 'none';
    });
  };

  return (
    <div className="fixed inset-0 bg-white z-[150] flex flex-col">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="h-full flex flex-col"
      >
        <div className="p-4 sm:p-8 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-indigo-700 text-white shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <ChevronLeft className="w-8 h-8" />
            </button>
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{schedule.className}</h2>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <p className="text-indigo-100 text-sm font-medium">Cronograma Acadêmico Detalhado (Tempo Real)</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button variant="secondary" onClick={exportPDF} className="flex-1 sm:flex-none bg-white text-indigo-700 hover:bg-indigo-50 border-none shadow-lg">
              <Download className="w-4 h-4" /> Exportar PDF
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-8">
          {/* Course Selector */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Filtrar por Curso:</span>
            <div className="flex flex-wrap gap-2">
              {schedule.courseIds.map((cid: string) => {
                const c = courses.find((x: any) => x.id === cid);
                const active = selectedCourseId === cid;
                return (
                  <button
                    key={cid}
                    onClick={() => setSelectedCourseId(cid)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                      active 
                        ? 'bg-indigo-600 text-white shadow-md' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {c?.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Calendar Grid */}
          <div id="public-schedule-pdf" className="bg-white p-4 rounded-2xl border border-gray-100 pdf-export-area">
            {/* Hidden Print Table for Public View */}
            <div id="public-print-table-content" style={{ display: 'none' }} className="bg-white text-black font-sans">
              <div className="mb-8 border-b-2 border-indigo-600 pb-4">
                <h1 className="text-2xl font-bold text-indigo-900">Cronograma de Aulas - Pós-Graduação Esuda</h1>
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <p><span className="font-bold">Curso:</span> {selectedCourse?.name}</p>
                  <p><span className="font-bold">Turma:</span> {schedule.className}</p>
                  <p><span className="font-bold">Data de Início:</span> {format(new Date(schedule.startDate + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })}</p>
                  <p><span className="font-bold">Emitido em:</span> {format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
                </div>
              </div>

              <table className="w-full border-collapse border border-gray-300 text-[10px]">
                <thead>
                  <tr className="bg-indigo-600 text-white">
                    <th className="border border-gray-300 p-2 text-left w-20">Data</th>
                    <th className="border border-gray-300 p-2 text-left">Disciplina</th>
                    <th className="border border-gray-300 p-2 text-left w-40">Professor</th>
                    <th className="border border-gray-300 p-2 text-left w-24">Tipo</th>
                  </tr>
                </thead>
                <tbody>
                  {scheduleData.map((item: any, idx: number) => {
                    if (item.type === 'holiday') {
                      return (
                        <tr key={`holiday-${idx}`} className="bg-red-50">
                          <td className="border border-gray-300 p-2 font-bold text-red-600">
                            {format(new Date(item.date + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                          </td>
                          <td colSpan={3} className="border border-gray-300 p-2 font-bold text-red-600 uppercase">
                            FERIADO: {item.description}
                          </td>
                        </tr>
                      );
                    }
                    
                    const teacher = teachers.find((t: any) => t.id === item.teacherId);
                    return (
                      <tr key={`discipline-${idx}`} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="border border-gray-300 p-2 font-medium">
                          {item.dates.sort().map((d: string) => format(new Date(d + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })).join(' e ')}
                        </td>
                        <td className="border border-gray-300 p-2">
                          <div className="font-bold">{item.name}</div>
                        </td>
                        <td className="border border-gray-300 p-2">
                          {teacher?.name || 'Não atribuído'}
                        </td>
                        <td className="border border-gray-300 p-2 text-[9px]">
                          {item.isCommon ? 'Comum' : 'Específica'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="mt-12 pt-8 border-t border-gray-200 text-center text-[9px] text-gray-400">
                <p>Este documento é um cronograma oficial da pós-graduação Esuda.</p>
                <p className="mt-1">© {new Date().getFullYear()} Esuda Acadêmico - Todos os direitos reservados.</p>
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-500 font-medium">Carregando cronograma...</p>
              </div>
            ) : (
              <>
                <div className="mb-6 text-center space-y-1">
                  <h3 className="text-xl font-bold text-gray-900">{selectedCourse?.name}</h3>
                  <p className="text-sm text-gray-500">
                    Turma: {schedule.className} | Início: {format(new Date(schedule.startDate), 'dd/MM/yyyy', { locale: ptBR })}
                    {schedule.lastUpdated && (
                      <span className="ml-2 text-[10px] text-gray-400 italic">
                        (Atualizado em: {format(schedule.lastUpdated.toDate(), 'dd/MM/yyyy HH:mm', { locale: ptBR })})
                      </span>
                    )}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {scheduleData.map((item: any, idx: number) => {
                    if (item.type === 'holiday') {
                      return (
                        <div 
                          key={`holiday-${idx}`}
                          className="relative p-4 rounded-2xl border bg-red-50 border-red-100"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-lg font-bold text-gray-900">
                              {format(new Date(item.date + 'T12:00:00'), 'dd/MM', { locale: ptBR })}
                            </span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase">
                              {format(new Date(item.date + 'T12:00:00'), 'EEEE', { locale: ptBR })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-red-600">
                            <AlertCircle className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase">{item.description}</span>
                          </div>
                        </div>
                      );
                    }

                    const teacher = teachers.find((t: any) => t.id === item.teacherId);
                    const sortedDates = [...item.dates].sort();
                    
                    return (
                      <div 
                        key={`discipline-${idx}`}
                        className="relative p-4 rounded-2xl border bg-white border-gray-100 hover:border-indigo-300 hover:shadow-md transition-all flex flex-col"
                      >
                        <div className="flex flex-wrap gap-x-3 gap-y-1 items-start mb-3">
                          {sortedDates.map((date: string, dIdx: number) => (
                            <div key={date} className="flex items-center gap-1">
                              <span className="text-lg font-bold text-gray-900">
                                {format(new Date(date + 'T12:00:00'), 'dd/MM', { locale: ptBR })}
                              </span>
                              {dIdx < sortedDates.length - 1 && <span className="text-gray-300 font-bold">e</span>}
                            </div>
                          ))}
                        </div>

                        <div className="space-y-3 flex-1">
                          <div>
                            <p className="text-xs font-bold text-indigo-600 uppercase tracking-tighter mb-1">
                              {item.isCommon ? 'Tronco Comum' : 'Específica'}
                            </p>
                            <p className="text-sm font-bold text-gray-800 leading-tight pdf-text-full">{item.name}</p>
                          </div>
                          {teacher && (
                            <button 
                              onClick={() => setSelectedTeacher(teacher)}
                              className="flex items-center gap-2 pt-2 border-t border-gray-50 mt-auto w-full text-left hover:bg-gray-50 transition-colors group relative"
                            >
                              <div className="w-6 h-6 rounded-full bg-gray-100 overflow-hidden shrink-0 border border-gray-200 group-hover:border-indigo-300 transition-colors">
                                {teacher.photoUrl ? (
                                  <Image src={teacher.photoUrl} alt={teacher.name} width={24} height={24} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-gray-400">{teacher.name[0]}</div>
                                )}
                              </div>
                              <span className="text-xs text-gray-600 truncate font-medium group-hover:text-indigo-600 transition-colors flex-1 pdf-text-full">{teacher.name}</span>
                              <Share2 className="w-3 h-3 text-gray-300 group-hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-all" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
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
