'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Users, 
  Printer, 
  ChevronRight, 
  CheckCircle2,
  FileText,
  Search,
  BookOpen,
  Calendar as CalendarIcon
} from 'lucide-react';
import { motion } from 'motion/react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { format, parseISO } from 'date-fns';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { COMMON_DISCIPLINES } from '@/lib/calendar';

interface TeacherListGeneratorProps {
  courses: any[];
  teachers: any[];
  commonDisciplines: any[];
}

export function TeacherListGenerator({ courses, teachers, commonDisciplines }: TeacherListGeneratorProps) {
  const [reportMode, setReportMode] = useState<'course' | 'teacher'>('course');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [teacherClasses, setTeacherClasses] = useState<any[]>([]);
  const [loadingTeacherClasses, setLoadingTeacherClasses] = useState(false);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [isGenerated, setIsGenerated] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isGenerated) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [isGenerated]);

  const fetchTeacherClasses = async (teacherId: string) => {
    if (!teacherId) {
      setTeacherClasses([]);
      return;
    }
    setLoadingTeacherClasses(true);
    try {
      const q = query(
        collection(db, 'classes'), 
        where('teacherId', '==', teacherId)
      );
      const snap = await getDocs(q);
      const classesData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Fetch schedule names for each class
      const scheduleIds = Array.from(new Set(classesData.map((c: any) => c.scheduleId)));
      const scheduleNames: Record<string, string> = {};
      
      for (const sId of scheduleIds) {
        if (sId) {
          const sSnap = await getDocs(query(collection(db, 'schedules'), where('__name__', '==', sId)));
          if (!sSnap.empty) {
            scheduleNames[sId] = sSnap.docs[0].data().className || 'Sem Nome';
          }
        }
      }

      const enrichedClasses = classesData.map((c: any) => ({
        ...c,
        scheduleName: scheduleNames[c.scheduleId] || 'Turma não encontrada'
      })).sort((a: any, b: any) => (a.date || '').localeCompare(b.date || ''));

      setTeacherClasses(enrichedClasses);
    } catch (e) {
      console.error("Error fetching teacher classes:", e);
    } finally {
      setLoadingTeacherClasses(false);
    }
  };

  const selectedCourse = courses.find(c => c.id === selectedCourseId);
  const selectedTeacher = teachers.find(t => t.id === selectedTeacherId);

  const handleCourseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const courseId = e.target.value;
    setSelectedCourseId(courseId);
    setSelectedTeacherId('');
    setIsGenerated(false);
    
    if (courseId) {
      const course = courses.find(c => c.id === courseId);
      const initialAssignments: Record<string, string> = {};
      
      // Combine common and specific disciplines
      const allDisciplines = [
        ...(commonDisciplines.length > 0 ? commonDisciplines : COMMON_DISCIPLINES).map(d => d.name),
        ...(course?.specificDisciplines || [])
      ];

      allDisciplines.forEach(discName => {
        // Try to find a specialist teacher
        const specialist = teachers.find(t => 
          t.specialties?.some((s: any) => s.disciplineName === discName)
        );
        initialAssignments[discName] = specialist?.id || '';
      });
      
      setAssignments(initialAssignments);
    }
  };

  const handleTeacherChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const teacherId = e.target.value;
    setSelectedTeacherId(teacherId);
    setSelectedCourseId('');
    setIsGenerated(false);
    if (teacherId) {
      fetchTeacherClasses(teacherId);
    }
  };

  const handleAssignmentChange = (discName: string, teacherId: string) => {
    setAssignments(prev => ({ ...prev, [discName]: teacherId }));
  };

  const generateList = () => {
    if (!selectedCourseId && !selectedTeacherId) return;
    setIsGenerated(true);
  };

  const handlePrint = () => {
    try {
      window.focus();
      setTimeout(() => {
        window.print();
      }, 500);
    } catch (error) {
      console.error("Erro ao imprimir:", error);
    }
  };

  const allDisciplines = selectedCourse ? [
    ...(commonDisciplines.length > 0 ? commonDisciplines : COMMON_DISCIPLINES).map(d => ({ name: d.name, syllabus: d.description || '', type: 'Comum' })),
    ...(selectedCourse.specificDisciplines || []).map((d: any) => {
      const name = typeof d === 'string' ? d : d.name;
      const syllabus = typeof d === 'object' ? (d.syllabus || '') : '';
      return { name, syllabus, type: 'Específica' };
    })
  ] : [];

  const availableTeachers = teachers || [];

  return (
    <div className="space-y-8">
      {/* Configuration Section */}
      <Card className="p-6 border-indigo-100 bg-white shadow-sm no-print">
        <div className="flex flex-col space-y-6">
          <div className="flex items-center gap-4 bg-gray-50 p-1 rounded-lg w-fit">
            <button 
              onClick={() => { setReportMode('course'); setIsGenerated(false); }}
              className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${reportMode === 'course' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Relatório por Curso
            </button>
            <button 
              onClick={() => { setReportMode('teacher'); setIsGenerated(false); }}
              className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${reportMode === 'teacher' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Relatório por Docente
            </button>
          </div>

          <div className="flex flex-col md:flex-row md:items-end gap-6">
            <div className="flex-1">
              {reportMode === 'course' ? (
                <Select
                  label="Selecione o Curso"
                  value={selectedCourseId}
                  onChange={handleCourseChange}
                  options={[
                    { value: '', label: 'Selecione um curso...' },
                    ...courses.map(c => ({ value: c.id, label: c.name }))
                  ]}
                />
              ) : (
                <Select
                  label="Selecione o Docente"
                  value={selectedTeacherId}
                  onChange={handleTeacherChange}
                  options={[
                    { value: '', label: 'Selecione um docente...' },
                    ...teachers.sort((a, b) => a.name.localeCompare(b.name)).map(t => ({ value: t.id, label: t.name }))
                  ]}
                />
              )}
            </div>
            <Button 
              disabled={reportMode === 'course' ? !selectedCourseId : !selectedTeacherId} 
              onClick={() => setIsGenerated(!isGenerated)}
              className="flex items-center gap-2 h-[42px]"
            >
              {isGenerated ? (
                <>Voltar para Edição</>
              ) : (
                <><Users className="w-4 h-4" /> Gerar Lista</>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Course Mode: Assignment View */}
      {reportMode === 'course' && selectedCourseId && !isGenerated && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6 no-print"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">Atribuição de Docentes: {selectedCourse?.name}</h3>
            <p className="text-sm text-gray-500">{allDisciplines.length} disciplinas encontradas</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {allDisciplines.map((disc, idx) => (
              <Card key={idx} className="p-4 border-gray-100 hover:border-indigo-200 transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      disc.type === 'Comum' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {disc.type}
                    </span>
                    <h4 className="font-bold text-gray-900 mt-1 line-clamp-2">{disc.name}</h4>
                  </div>
                </div>
                <Select
                  label="Docente Titular"
                  value={assignments[disc.name] || ''}
                  onChange={(e: any) => handleAssignmentChange(disc.name, e.target.value)}
                  options={[
                    { value: '', label: 'Não atribuído' },
                    ...availableTeachers
                      .sort((a, b) => {
                        const aIsSpec = a.specialties?.some((s: any) => s.disciplineName === disc.name);
                        const bIsSpec = b.specialties?.some((s: any) => s.disciplineName === disc.name);
                        if (aIsSpec && !bIsSpec) return -1;
                        if (!aIsSpec && bIsSpec) return 1;
                        return a.name.localeCompare(b.name);
                      })
                      .map(t => {
                        const isSpec = t.specialties?.some((s: any) => s.disciplineName === disc.name);
                        return { value: t.id, label: `${t.name}${isSpec ? ' ★' : ''}` };
                      })
                  ]}
                />
              </Card>
            ))}
          </div>

          <div className="flex justify-center pt-4">
            <Button size="lg" onClick={generateList} className="px-12">
              Confirmar e Visualizar PDF
            </Button>
          </div>
        </motion.div>
      )}

      {/* Teacher Mode: Preview View */}
      {reportMode === 'teacher' && selectedTeacherId && !isGenerated && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6 no-print"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">Aulas Atribuídas: {selectedTeacher?.name}</h3>
            <p className="text-sm text-gray-500">{teacherClasses.length} aulas encontradas</p>
          </div>

          {loadingTeacherClasses ? (
            <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
          ) : teacherClasses.length === 0 ? (
            <Card className="p-12 text-center text-gray-500">Nenhuma aula encontrada para este docente.</Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {teacherClasses.map((c, idx) => (
                <Card key={idx} className="p-4 border-gray-100">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center shrink-0">
                      <CalendarIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black uppercase text-indigo-400 tracking-widest">{c.scheduleName}</p>
                      <h4 className="font-bold text-gray-900 truncate">{c.disciplineName}</h4>
                      <p className="text-xs text-gray-500 mt-1">{c.courseName}</p>
                      <div className="flex items-center gap-2 mt-2 text-[10px] font-bold text-gray-400">
                        <span className="bg-gray-100 px-2 py-0.5 rounded">{c.date ? format(parseISO(c.date), 'dd/MM/yyyy') : 'A definir'}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          <div className="flex justify-center pt-4">
            <Button size="lg" onClick={generateList} className="px-12" disabled={teacherClasses.length === 0}>
              Visualizar PDF de Atribuições
            </Button>
          </div>
        </motion.div>
      )}

      {/* Generated PDF Preview */}
      {isGenerated && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-6"
        >
          <div className="flex justify-end gap-3 no-print">
            <Button variant="secondary" onClick={() => setIsGenerated(false)}>
              Voltar para Edição
            </Button>
            <Button onClick={handlePrint} className="flex items-center gap-2">
              <Printer className="w-4 h-4" /> Imprimir / Salvar PDF
            </Button>
          </div>

          <div 
            ref={printRef}
            className="bg-white p-12 shadow-xl border border-gray-200 min-h-[297mm] w-full max-w-[210mm] mx-auto print:shadow-none print:border-none print:p-0"
          >
            {/* PDF Header */}
            <div className="text-center border-b-2 border-indigo-600 pb-8 mb-8">
              <h1 className="text-3xl font-black text-indigo-900 uppercase tracking-tighter">ESUDA ACADÊMICO</h1>
              <p className="text-gray-500 font-medium mt-1">RELAÇÃO DE DISCIPLINAS E CORPO DOCENTE</p>
              <div className="mt-6 inline-block bg-indigo-50 px-6 py-2 rounded-full border border-indigo-100">
                <span className="text-indigo-900 font-bold uppercase text-sm">
                  {reportMode === 'course' ? `CURSO: ${selectedCourse?.name}` : `DOCENTE: ${selectedTeacher?.name}`}
                </span>
              </div>
            </div>

            {/* Content Table */}
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-3 text-left text-xs font-bold uppercase text-gray-600 w-12">#</th>
                  {reportMode === 'course' ? (
                    <>
                      <th className="border border-gray-300 p-3 text-left text-xs font-bold uppercase text-gray-600">Disciplina</th>
                      <th className="border border-gray-300 p-3 text-left text-xs font-bold uppercase text-gray-600">Tipo</th>
                      <th className="border border-gray-300 p-3 text-left text-xs font-bold uppercase text-gray-600">Docente Titular</th>
                    </>
                  ) : (
                    <>
                      <th className="border border-gray-300 p-3 text-left text-xs font-bold uppercase text-gray-600">Turma</th>
                      <th className="border border-gray-300 p-3 text-left text-xs font-bold uppercase text-gray-600">Curso</th>
                      <th className="border border-gray-300 p-3 text-left text-xs font-bold uppercase text-gray-600">Disciplina</th>
                      <th className="border border-gray-300 p-3 text-left text-xs font-bold uppercase text-gray-600">Data</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {reportMode === 'course' ? (
                  allDisciplines.map((disc, idx) => {
                    const teacher = availableTeachers.find(t => t.id === assignments[disc.name]);
                    return (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="border border-gray-300 p-3 text-sm font-medium text-gray-500">{idx + 1}</td>
                        <td className="border border-gray-300 p-3 text-sm font-bold text-gray-900">
                          <div>{disc.name}</div>
                          {disc.syllabus && (
                            <div className="text-[10px] font-normal text-gray-500 mt-1 italic leading-tight">
                              {disc.syllabus}
                            </div>
                          )}
                        </td>
                        <td className="border border-gray-300 p-3 text-xs font-medium">
                          <span className={`px-2 py-0.5 rounded ${
                            disc.type === 'Comum' ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {disc.type}
                          </span>
                        </td>
                        <td className="border border-gray-300 p-3 text-sm font-medium text-gray-700 italic">
                          {teacher ? teacher.name : 'A definir'}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  teacherClasses.map((c, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="border border-gray-300 p-3 text-sm font-medium text-gray-500">{idx + 1}</td>
                      <td className="border border-gray-300 p-3 text-sm font-bold text-gray-900 uppercase">{c.scheduleName}</td>
                      <td className="border border-gray-300 p-3 text-sm text-gray-700">{c.courseName}</td>
                      <td className="border border-gray-300 p-3 text-sm font-bold text-gray-900">{c.disciplineName}</td>
                      <td className="border border-gray-300 p-3 text-sm font-medium text-gray-600">
                        {c.date ? format(parseISO(c.date), 'dd/MM/yyyy') : 'A definir'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Footer */}
            <div className="mt-12 pt-8 border-t border-gray-200 flex justify-between items-end">
              <div className="text-[10px] text-gray-400">
                <p>Gerado em: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</p>
                <p>Esuda Acadêmico - Sistema de Gestão de Cronogramas</p>
              </div>
              <div className="text-right">
                <div className="w-48 border-b border-gray-400 mb-2"></div>
                <p className="text-[10px] font-bold text-gray-500 uppercase">Coordenação Acadêmica</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Empty State */}
      {!selectedCourseId && !selectedTeacherId && (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
            <FileText className="w-10 h-10" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Gerador de Relação Docente</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              Selecione um curso ou um docente acima para gerar a relação de disciplinas e atribuições para o PDF.
            </p>
          </div>
        </div>
      )}

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:border-none {
            border: none !important;
          }
          .print\\:p-0 {
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
