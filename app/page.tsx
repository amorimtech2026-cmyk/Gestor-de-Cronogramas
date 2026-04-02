'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import Image from 'next/image';
import { 
  Calendar, 
  Users, 
  BookOpen, 
  Plus, 
  LogOut, 
  LogIn, 
  LayoutDashboard, 
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Trash2,
  Save,
  RotateCcw,
  ArrowRight,
  GripVertical,
  Edit2,
  Edit,
  Eye,
  Search,
  Filter,
  MoreVertical,
  Clock,
  Download,
  FileText,
  X,
  Menu,
  ExternalLink,
  Instagram,
  Linkedin,
  Link as LinkIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  deleteDoc, 
  doc, 
  updateDoc,
  serverTimestamp,
  getDocs,
  where
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { format, parseISO, addDays, isSameDay, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { generateFullSchedule, COMMON_DISCIPLINES, Holiday, getNextAvailableSaturday, HOLIDAYS_2026 } from '@/lib/calendar';

import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// --- Components ---

const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false, type = 'button' }: any) => {
  const variants: any = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700',
    secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    ghost: 'text-gray-500 hover:bg-gray-100'
  };
  return (
    <button 
      type={type}
      disabled={disabled}
      onClick={onClick} 
      className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

const Card = ({ children, className = '' }: any) => (
  <div className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden ${className}`}>
    {children}
  </div>
);

const Input = ({ label, ...props }: any) => (
  <div className="space-y-1">
    {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
    <input 
      {...props} 
      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
    />
  </div>
);

const TextArea = ({ label, ...props }: any) => (
  <div className="space-y-1">
    {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
    <textarea 
      {...props} 
      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all min-h-[100px]"
    />
  </div>
);

const Select = ({ label, options = [], children, ...props }: any) => (
  <div className="space-y-1">
    {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
    <select 
      {...props} 
      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white"
    >
      {children ? children : (
        <>
          <option value="">Selecione...</option>
          {options.map((opt: any) => (
            <option key={opt.id || opt.value} value={opt.id || opt.value}>{opt.name || opt.label}</option>
          ))}
        </>
      )}
    </select>
  </div>
);

function SortableItem({ id, children }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} className="relative group">
      <div {...listeners} className="absolute left-2 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical className="w-4 h-4" />
      </div>
      {children}
    </div>
  );
}

const ConfirmationModal = ({ isOpen, title, message, onConfirm, onCancel, loading }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="p-6 space-y-4">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
            <Trash2 className="w-6 h-6" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-xl font-bold text-gray-900">{title}</h3>
            <p className="text-gray-500">{message}</p>
          </div>
        </div>
        <div className="p-4 bg-gray-50 flex gap-3">
          <Button variant="secondary" onClick={onCancel} className="flex-1 justify-center" disabled={loading}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={onConfirm} className="flex-1 justify-center" disabled={loading}>
            {loading ? 'Excluindo...' : 'Confirmar Exclusão'}
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

// --- Public Portal ---

function PublicPortal({ teachers, courses, holidays, schedules, onLogin, isLoggingIn, user, logout }: any) {
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);

  const activeSchedules = schedules.filter((s: any) => s.status === 'active');

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
        <section className="space-y-6">
          <div className="flex items-center gap-3 border-l-4 border-indigo-600 pl-4">
            <h2 className="text-2xl font-bold text-gray-900">Nossas Pós-Graduações</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course: any) => (
              <motion.div 
                key={course.id}
                whileHover={{ y: -5 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col"
              >
                <div className="h-40 bg-indigo-100 relative overflow-hidden">
                  {course.imageUrl ? (
                    <Image 
                      src={course.imageUrl} 
                      alt={course.name} 
                      fill 
                      className="object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-indigo-300">
                      <BookOpen className="w-16 h-16 opacity-20" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                    <h3 className="text-white font-bold leading-tight">{course.name}</h3>
                  </div>
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <p className="text-gray-600 text-sm line-clamp-4 mb-4 italic">
                    &quot;{course.marketingSummary || 'Conheça mais sobre este curso de excelência da ESUDA.'}&quot;
                  </p>
                  <div className="mt-auto pt-4 border-t border-gray-50">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Disciplinas em Destaque</p>
                    <div className="flex flex-wrap gap-1">
                      {course.specificDisciplines?.slice(0, 3).map((d: string) => (
                        <span key={d} className="text-[9px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full truncate max-w-[150px]">
                          {d}
                        </span>
                      ))}
                    </div>
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
                  onClick={() => setSelectedSchedule(schedule)}
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

      <footer className="bg-gray-900 text-white py-12 px-4 mt-12">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="space-y-4">
            <h4 className="text-xl font-bold">ESUDA Pós-Graduação</h4>
            <p className="text-gray-400 text-sm leading-relaxed">
              Excelência acadêmica em engenharia e arquitetura. Formando especialistas preparados para os desafios do mercado contemporâneo.
            </p>
          </div>
          <div className="space-y-4">
            <h4 className="text-xl font-bold">Links Úteis</h4>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li><a href="#" className="hover:text-white transition-colors">Site Institucional</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Portal do Aluno</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Biblioteca Digital</a></li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="text-xl font-bold">Contato</h4>
            <p className="text-gray-400 text-sm">Recife - PE</p>
            <p className="text-gray-400 text-sm">Email: posgraduacao@esuda.edu.br</p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-gray-800 text-center text-gray-500 text-xs">
          © 2026 ESUDA - Todos os direitos reservados. Desenvolvido para coordenação de Engenharia e Arquitetura.
        </div>
      </footer>

      {/* Public Schedule Viewer Modal */}
      {selectedSchedule && (
        <PublicScheduleViewer 
          schedule={selectedSchedule}
          courses={courses}
          teachers={teachers}
          holidays={holidays}
          onClose={() => setSelectedSchedule(null)}
        />
      )}
    </div>
  );
}

function PublicScheduleViewer({ schedule, courses, teachers, holidays, onClose }: any) {
  const [selectedCourseId, setSelectedCourseId] = useState(schedule.courseIds[0]);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  const selectedCourse = courses.find((c: any) => c.id === selectedCourseId);
  const scheduleData = schedule.data || {};

  // PDF Export
  const exportPDF = () => {
    const element = document.getElementById('public-schedule-pdf');
    if (!element) return;
    
    const opt = {
      margin: 10,
      filename: `Cronograma_${selectedCourse?.name}_${schedule.className}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    // @ts-ignore
    import('html2pdf.js').then((html2pdf) => {
      html2pdf.default().set(opt).from(element).save();
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl"
      >
        <div className="p-4 sm:p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-indigo-600 text-white">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold">{schedule.className}</h2>
            <p className="text-indigo-100 text-sm">Calendário de Aulas</p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button variant="secondary" onClick={exportPDF} className="flex-1 sm:flex-none bg-white/10 border-white/20 text-white hover:bg-white/20">
              <Download className="w-4 h-4" /> PDF
            </Button>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <X className="w-6 h-6" />
            </button>
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
          <div id="public-schedule-pdf" className="bg-white p-4 rounded-2xl border border-gray-100">
            <div className="mb-6 text-center space-y-1">
              <h3 className="text-xl font-bold text-gray-900">{selectedCourse?.name}</h3>
              <p className="text-sm text-gray-500">Turma: {schedule.className} | Início: {format(new Date(schedule.startDate), 'dd/MM/yyyy', { locale: ptBR })}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Object.entries(scheduleData)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([date, data]: [string, any]) => {
                  const isHoliday = holidays.some((h: any) => h.date === date);
                  const holiday = holidays.find((h: any) => h.date === date);
                  
                  // Check if this date has a discipline for the selected course
                  const commonDisc = data.common;
                  const specificDisc = data.specific?.[selectedCourseId];
                  const discipline = commonDisc || specificDisc;
                  const teacher = teachers.find((t: any) => t.id === data.teacherId);

                  if (!discipline && !isHoliday) return null;

                  return (
                    <div 
                      key={date}
                      className={`relative p-4 rounded-2xl border transition-all ${
                        isHoliday 
                          ? 'bg-red-50 border-red-100' 
                          : 'bg-white border-gray-100 hover:border-indigo-300 hover:shadow-md'
                      }`}
                      onMouseEnter={() => setHoveredDate(date)}
                      onMouseLeave={() => setHoveredDate(null)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-lg font-bold text-gray-900">
                          {format(new Date(date + 'T12:00:00'), 'dd/MM', { locale: ptBR })}
                        </span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase">
                          {format(new Date(date + 'T12:00:00'), 'EEEE', { locale: ptBR })}
                        </span>
                      </div>

                      {isHoliday ? (
                        <div className="flex items-center gap-2 text-red-600">
                          <AlertCircle className="w-4 h-4" />
                          <span className="text-xs font-bold uppercase">{holiday?.description}</span>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs font-bold text-indigo-600 uppercase tracking-tighter mb-1">
                              {commonDisc ? 'Tronco Comum' : 'Específica'}
                            </p>
                            <p className="text-sm font-bold text-gray-800 leading-tight line-clamp-2">{discipline}</p>
                          </div>
                          {teacher && (
                            <div className="flex items-center gap-2 pt-2 border-t border-gray-50">
                              <div className="w-6 h-6 rounded-full bg-gray-100 overflow-hidden shrink-0">
                                {teacher.photoUrl ? (
                                  <Image src={teacher.photoUrl} alt={teacher.name} width={24} height={24} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-gray-400">{teacher.name[0]}</div>
                                )}
                              </div>
                              <span className="text-xs text-gray-600 truncate font-medium">{teacher.name}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Tooltip / Details on Hover */}
                      <AnimatePresence>
                        {hoveredDate === date && !isHoliday && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute left-0 right-0 bottom-full mb-2 bg-gray-900 text-white p-4 rounded-2xl shadow-xl z-10 pointer-events-none"
                          >
                            <div className="space-y-3">
                              <p className="text-sm font-bold leading-tight">{discipline}</p>
                              {teacher && (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-white/10 overflow-hidden">
                                      {teacher.photoUrl && <Image src={teacher.photoUrl} alt={teacher.name} width={32} height={32} className="w-full h-full object-cover" referrerPolicy="no-referrer" />}
                                    </div>
                                    <div>
                                      <p className="text-xs font-bold">{teacher.name}</p>
                                      <p className="text-[10px] text-gray-400">Professor Titular</p>
                                    </div>
                                  </div>
                                  <div className="flex gap-2 pt-1">
                                    {teacher.linkedin && <Linkedin className="w-3 h-3 text-indigo-400" />}
                                    {teacher.instagram && <Instagram className="w-3 h-3 text-pink-400" />}
                                    {teacher.lattes && <LinkIcon className="w-3 h-3 text-blue-400" />}
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="absolute left-1/2 -bottom-1 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function Dashboard() {
  const { user, loading, login, logout, isAdmin, isLoggingIn } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [teachers, setTeachers] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [isNewScheduleModalOpen, setIsNewScheduleModalOpen] = useState(false);
  const [isNewCourseModalOpen, setIsNewCourseModalOpen] = useState(false);
  const [isNewTeacherModalOpen, setIsNewTeacherModalOpen] = useState(false);
  const [viewingSchedule, setViewingSchedule] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Fetch Data
  useEffect(() => {
    // Public data fetching (no user required)
    const unsubTeachers = onSnapshot(collection(db, 'teachers'), (snap) => {
      setTeachers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubCourses = onSnapshot(collection(db, 'courses'), (snap) => {
      setCourses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubHolidays = onSnapshot(collection(db, 'holidays'), (snap) => {
      setHolidays(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any);
    });
    const unsubSchedules = onSnapshot(query(collection(db, 'schedules'), orderBy('createdAt', 'desc')), (snap) => {
      setSchedules(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubTeachers();
      unsubCourses();
      unsubHolidays();
      unsubSchedules();
    };
  }, []);

  const seedData = async () => {
    // Note: confirm() and alert() might be blocked in some iframe environments.
    // We will proceed with the seeding and log to console for debugging.
    console.log('Iniciando carga de dados...');
    
    try {
      // 1. Holidays
      const holidaysToSeed = [
        { date: '2026-02-16', description: 'Carnaval' },
        { date: '2026-03-06', description: 'Data Magna de PE' },
        { date: '2026-04-03', description: 'Sexta-feira Santa' },
        { date: '2026-05-01', description: 'Dia do Trabalho' },
        { date: '2026-09-07', description: 'Independência' },
        { date: '2026-10-12', description: 'N. Sra. Aparecida' },
        { date: '2026-10-19', description: 'Dia do Comerciário Recife' },
        { date: '2026-11-02', description: 'Finados' },
        { date: '2026-11-20', description: 'Consciência Negra' },
        { date: '2026-12-25', description: 'Natal' }
      ];

      for (const h of holidaysToSeed) {
        await addDoc(collection(db, 'holidays'), h);
      }

      // 2. Courses
      const coursesToSeed = [
        {
          name: "Engenharia Legal e Perícias: Avaliações e Desempenho",
          marketingSummary: "Seja a autoridade técnica que o mercado jurídico e imobiliário confia. Domine a arte da perícia e avaliação imobiliária com foco em patologias construtivas, auditoria predial e conformidade com a NBR 15.575. Este curso prepara você para atuar com precisão técnica e segurança jurídica, tornando-se um especialista indispensável em laudos e perícias complexas.",
          specificDisciplines: [
            "Patologia das Construções, Investigação e Responsabilidade Civil",
            "Auditoria Predial e NBR 16.747: Classificação de Risco e Laudos",
            "Avaliação de Imóveis I: Método Comparativo (Foco Urbano e Inferência Estatística)",
            "Avaliação de Imóveis II: Renda, Rurais e Laudos Complexos",
            "Perícias Judiciais e Vistorias Cautelares de Vizinhança",
            "Perícia em Desempenho: Verificação Judicial da NBR 15.575",
            "Simulação Computacional (BIM 6D) e Análise de Ciclo de Vida (ACV) Legal",
            "Certificações e Auditoria de Compliance Técnico Legal",
            "Engenharia Legal Aplicada: Responsabilidade Civil, Ética e Fiscalização"
          ]
        },
        {
          name: "Gestão de Manutenção Predial na Construção 4.0",
          marketingSummary: "Lidere a eficiência operacional na era da tecnologia preditiva. O futuro da manutenção é inteligente. Com foco em IoT, Sensores, Engenharia Diagnóstica e Gestão de Ativos com BIM 7D, este curso capacita você para garantir a longevidade e a valorização patrimonial de edificações, utilizando o que há de mais moderno na Construção 4.0.",
          specificDisciplines: [
            "Engenharia Diagnóstica: Terapia Predial e Plano de Intervenção",
            "Patologias Construtivas em Estruturas e Sistemas de Envoltória",
            "Manutenção Avançada em Instalações Prediais (Elétrica, Hidráulica, HVAC)",
            "CMMS e GMAO: Implementação de Sistemas de Gestão da Manutenção",
            "Manutenção Preditiva: IoT, Sensores Inteligentes e Automação Predial",
            "Termografia Infravermelha e Drones na Inspeção de Ativos",
            "Gestão de Ativos com BIM 7D (FM) e Orçamentação Preditiva",
            "Engenharia Condominial e Gestão de Sistemas de Segurança e Transporte",
            "Gestão da Manutenção: Planejamento, KPIs e Conformidade Operacional"
          ]
        },
        {
          name: "Tecnologia BIM na Construção Civil",
          marketingSummary: "Vença o desafio da digitalização e transforme sua carreira com o BIM. Vá além da modelagem. Aprenda a integrar processos, otimizar custos e utilizar Inteligência Artificial para elevar o patamar dos seus projetos e obras. Uma formação completa que abrange desde a conceituação até a gestão estratégica em CDE e análise de dados.",
          specificDisciplines: [
            "BIM - Conceituação Básica do Planejamento ao pós obra.",
            "Modelagem Arquitetônica",
            "Modelagem Paramétrica",
            "Modelagem Estrutural",
            "Modelagem das Instalações",
            "BIM no Planejamento e Orçamentação",
            "Gestão e Compatibilização de Projetos",
            "Colaboração e integração com CDE",
            "BIM, Análise de dados e IA"
          ]
        },
        {
          name: "Gestão de Projetos e Obras",
          marketingSummary: "Eficiência, lucro e sustentabilidade: domine o canteiro de obras. Aprenda as melhores práticas de Lean Construction, orçamentação estratégica e gestão de pleitos (claims). Este curso é focado em resultados reais, capacitando você para liderar equipes, reduzir desperdícios e entregar obras com excelência técnica e financeira.",
          specificDisciplines: [
            "Técnicas de Orçamentos, Cobranças e Custos de Projetos",
            "Técnicas de Orçamentos, Cobranças e Custos de Obras",
            "Técnicas de Coordenação e Compatibilização de Projetos",
            "Técnicas de Planejamento e Coordenação de Obras",
            "Eficiência Energética e Sustentabilidade na Construção Civil",
            "Lean Construction, Last Planner System e Logística de Canteiro",
            "Engenharia de Segurança e Normas de Desempenho",
            "Administração Contratual, Medições e Gestão de Pleitos (Claims)",
            "Sistemas Informatizados de Gestão Integrada e BI (ERP, CDE e Power BI)"
          ]
        },
        {
          name: "Acústica Arquitetônica e Iluminação",
          marketingSummary: "Onde a técnica encontra o conforto: projete experiências sensoriais. Especializa-se em criar ambientes saudáveis e produtivos através do som e da luz. Do design residencial à acústica de grandes teatros e iluminação urbana, domine as ferramentas para unir estética e performance técnica em projetos de alto impacto.",
          specificDisciplines: [
            "Acústica Gráfica e Normas",
            "Estudo das Tipologias Internas I: Ambientes Residenciais e Comerciais",
            "Estudo das Tipologias Internas II: Estúdios, Teatros e Cinemas",
            "Estudo das Tipologias Internas III: Grandes Ambientes",
            "Acústica e Iluminação Urbana",
            "Iluminação, Conceituação e Normas",
            "Iluminação Residencial",
            "Iluminação Comercial",
            "Iluminação Externa: Jardins, Praças e Edificações Históricas"
          ]
        },
        {
          name: "Design de Interiores Contemporâneo",
          marketingSummary: "Inove no design com propósito e conquiste o mercado de luxo. Explore as tendências globais com foco em automação (IoT), ergonomia e design de mobiliário. Este curso oferece uma visão contemporânea e estratégica, preparando você para criar espaços inteligentes que refletem as novas necessidades de morar e trabalhar.",
          specificDisciplines: [
            "Design de Superfícies",
            "Iluminação de Interiores: Comerciais e Residenciais",
            "Automação, Internet das Coisas e Eficiência dos Ambientes de Interiores",
            "Inclusão e Ergonomia",
            "Antropologia do Espaço",
            "Design do Mobiliário",
            "Design Aplicado para Ambientes Residenciais",
            "Design Aplicado para Ambientes Comerciais e Corporativos",
            "Design de Interiores para o Mercado de Luxo"
          ]
        },
        {
          name: "Neuroarquitetura",
          marketingSummary: "Projete para o cérebro humano: ciência a serviço do bem-estar. Entenda como o ambiente impacta as emoções e a saúde. Pioneirismo e neurociência aplicada para criar espaços que promovem felicidade e produtividade. Torne-se um especialista na vanguarda da arquitetura, focada no design biofílico e cognitivo.",
          specificDisciplines: [
            "Neurociência Aplicada à Arquitetura",
            "Ritmo Biológico e Fatores Humanos",
            "Neuroarquitetura e Design Cognitivo",
            "Espaços Residenciais e Comerciais: Aplicações e Princípios da Neuroarquitetura",
            "Espaços Corporativos: Aplicações e Princípios da Neuroarquitetura",
            "Estímulos e Percepções: Neuroarquitetura em Espaços Verdes",
            "Neuroiluminação",
            "Design Biofílico",
            "Neurourbanismo"
          ]
        }
      ];

      for (const c of coursesToSeed) {
        await addDoc(collection(db, 'courses'), {
          ...c,
          createdAt: serverTimestamp()
        });
      }

      console.log('Dados cadastrados com sucesso!');
      setActiveTab('courses'); // Redireciona para ver os cursos
    } catch (e) {
      console.error('Erro ao popular banco:', e);
      handleFirestoreError(e, OperationType.WRITE, 'seed');
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-gray-50">Carregando...</div>;

  if (!isAdmin) {
    return (
      <PublicPortal 
        teachers={teachers} 
        courses={courses} 
        holidays={holidays} 
        schedules={schedules} 
        onLogin={login}
        isLoggingIn={isLoggingIn}
        user={user}
        logout={logout}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden bg-white border-b border-gray-200 p-4 flex justify-between items-center sticky top-0 z-40">
        <h2 className="text-xl font-bold text-indigo-600">Esuda Acadêmico</h2>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
        >
          {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-gray-200 hidden md:block">
          <h2 className="text-xl font-bold text-indigo-600">Esuda Acadêmico</h2>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <SidebarItem 
            icon={<LayoutDashboard />} 
            label="Dashboard" 
            active={activeTab === 'dashboard'} 
            onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }} 
          />
          <SidebarItem 
            icon={<Calendar />} 
            label="Cronogramas" 
            active={activeTab === 'schedules'} 
            onClick={() => { setActiveTab('schedules'); setIsSidebarOpen(false); }} 
          />
          <SidebarItem 
            icon={<BookOpen />} 
            label="Cursos" 
            active={activeTab === 'courses'} 
            onClick={() => { setActiveTab('courses'); setIsSidebarOpen(false); }} 
          />
          <SidebarItem 
            icon={<Users />} 
            label="Docentes" 
            active={activeTab === 'teachers'} 
            onClick={() => { setActiveTab('teachers'); setIsSidebarOpen(false); }} 
          />
          <SidebarItem 
            icon={<AlertCircle />} 
            label="Feriados" 
            active={activeTab === 'holidays'} 
            onClick={() => { setActiveTab('holidays'); setIsSidebarOpen(false); }} 
          />
          {isAdmin && (
            <button 
              onClick={() => { seedData(); setIsSidebarOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-amber-600 hover:bg-amber-50 mt-4 border border-dashed border-amber-200"
            >
              <Save className="w-5 h-5" /> Popular Banco (2026)
            </button>
          )}
        </nav>
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            {user.photoURL && (
              <Image 
                src={user.photoURL} 
                width={40} 
                height={40} 
                className="rounded-full" 
                alt={user.displayName || ''} 
                referrerPolicy="no-referrer"
              />
            )}
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">{user.displayName}</p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
          </div>
          <Button onClick={logout} variant="secondary" className="w-full justify-center">
            <LogOut className="w-4 h-4" /> Sair
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 capitalize">
            {activeTab === 'schedules' ? 'Cronogramas' : 
             activeTab === 'courses' ? 'Cursos' :
             activeTab === 'teachers' ? 'Docentes' :
             activeTab === 'holidays' ? 'Feriados' : 'Dashboard'}
          </h1>
          {isAdmin && activeTab !== 'dashboard' && (
            <Button className="w-full sm:w-auto" onClick={() => {
              if (activeTab === 'schedules') setIsNewScheduleModalOpen(true);
              if (activeTab === 'courses') setIsNewCourseModalOpen(true);
              if (activeTab === 'teachers') setIsNewTeacherModalOpen(true);
              if (activeTab === 'holidays') {
                const input = document.querySelector('input[type="date"]') as HTMLInputElement;
                input?.focus();
              }
            }}>
              <Plus className="w-5 h-5" /> Novo {
                activeTab === 'schedules' ? 'Cronograma' : 
                activeTab === 'courses' ? 'Curso' :
                activeTab === 'teachers' ? 'Docente' : 'Feriado'
              }
            </Button>
          )}
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'dashboard' && <DashboardOverview schedules={schedules} courses={courses} teachers={teachers} setActiveTab={setActiveTab} />}
            {activeTab === 'schedules' && <SchedulesList schedules={schedules} courses={courses} onSelect={setViewingSchedule} isAdmin={isAdmin} />}
            {activeTab === 'courses' && <CoursesManager courses={courses} isAdmin={isAdmin} />}
            {activeTab === 'teachers' && <TeachersManager teachers={teachers} courses={courses} isAdmin={isAdmin} />}
            {activeTab === 'holidays' && <HolidaysManager holidays={holidays} isAdmin={isAdmin} />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Modals */}
      {isNewScheduleModalOpen && (
        <NewScheduleModal 
          courses={courses} 
          holidays={holidays}
          teachers={teachers}
          onClose={() => setIsNewScheduleModalOpen(false)} 
        />
      )}
      {isNewCourseModalOpen && (
        <NewCourseModal 
          isAdmin={isAdmin}
          onClose={() => setIsNewCourseModalOpen(false)} 
        />
      )}
      {isNewTeacherModalOpen && (
        <NewTeacherModal 
          courses={courses}
          isAdmin={isAdmin}
          onClose={() => setIsNewTeacherModalOpen(false)} 
        />
      )}

      {viewingSchedule && (
        <ScheduleDetailsModal
          schedule={viewingSchedule}
          courses={courses}
          teachers={teachers}
          isAdmin={isAdmin}
          onClose={() => setViewingSchedule(null)}
          holidays={holidays}
        />
      )}
    </div>
  );
}

// --- Sub-components ---

function SidebarItem({ icon, label, active, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${active ? 'bg-indigo-50 text-indigo-600 font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}
    >
      {React.cloneElement(icon, { className: 'w-5 h-5' })}
      {label}
    </button>
  );
}

function DashboardOverview({ schedules, courses, teachers, setActiveTab }: any) {
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
          <div className="space-y-3">
            {schedules.slice(0, 5).map((s: any) => (
              <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-gray-800">Início: {format(parseISO(s.startDate), 'dd/MM/yyyy')}</span>
                  <span className="text-[10px] text-gray-500 uppercase">{s.courseIds.length} Cursos</span>
                </div>
                <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${s.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                  {s.status === 'active' ? 'Ativo' : 'Arquivado'}
                </span>
              </div>
            ))}
            {schedules.length === 0 && <p className="text-center py-4 text-gray-400 text-sm">Nenhum cronograma recente.</p>}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" /> Docentes Recentes
          </h3>
          <div className="space-y-3">
            {teachers.slice(0, 5).map((t: any) => (
              <div key={t.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="w-8 h-8 bg-indigo-100 text-indigo-600 flex items-center justify-center rounded-full text-xs font-bold">
                  {t.name[0]}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-gray-800">{t.name}</span>
                  <span className="text-[10px] text-gray-500">{t.email || t.phone || 'Sem contato'}</span>
                </div>
              </div>
            ))}
            {teachers.length === 0 && <p className="text-center py-4 text-gray-400 text-sm">Nenhum docente cadastrado.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}

function SchedulesList({ schedules, courses, onSelect, isAdmin }: any) {
  const [deletingScheduleId, setDeletingScheduleId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deletingScheduleId) return;
    setIsDeleting(true);
    try {
      // Delete all classes associated with this schedule
      const q = query(collection(db, 'classes'), where('scheduleId', '==', deletingScheduleId));
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(d => deleteDoc(doc(db, 'classes', d.id)));
      await Promise.all(deletePromises);
      
      // Delete the schedule itself
      await deleteDoc(doc(db, 'schedules', deletingScheduleId));
      setDeletingScheduleId(null);
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, 'schedules');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4">
      {schedules.map((schedule: any) => (
        <Card key={schedule.id} className="p-4 sm:p-6 hover:border-indigo-300 transition-all group relative">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="flex-1 cursor-pointer w-full" onClick={() => onSelect(schedule)}>
              <div className="flex flex-wrap gap-2 mb-2">
                {schedule.courseIds.map((cid: string) => (
                  <span key={cid} className="px-2 py-1 bg-indigo-50 text-indigo-600 text-xs font-bold rounded uppercase">
                    {courses.find((c: any) => c.id === cid)?.name || 'Curso'}
                  </span>
                ))}
              </div>
              <h3 className="text-lg font-bold text-gray-900">
                {schedule.className || `Turma Iniciada em ${format(parseISO(schedule.startDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`}
              </h3>
              <p className="text-sm text-gray-500">Status: {schedule.status === 'active' ? 'Ativo' : 'Arquivado'}</p>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
              {isAdmin && (
                <div className="flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(schedule);
                    }}
                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletingScheduleId(schedule.id);
                    }}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
              <Button variant="ghost" onClick={() => onSelect(schedule)}>
                Ver Detalhes <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
      ))}
      {schedules.length === 0 && (
        <div className="text-center py-12 text-gray-500">Nenhum cronograma gerado ainda.</div>
      )}

      <ConfirmationModal 
        isOpen={!!deletingScheduleId}
        title="Excluir Cronograma"
        message="Deseja excluir este cronograma e todas as suas aulas? Esta ação não pode ser desfeita."
        onConfirm={handleDelete}
        onCancel={() => setDeletingScheduleId(null)}
        loading={isDeleting}
      />
    </div>
  );
}

function CoursesManager({ courses, isAdmin }: any) {
  const [newName, setNewName] = useState('');
  const [editingCourse, setEditingCourse] = useState<any>(null);
  const [deletingCourseId, setDeletingCourseId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const addCourse = async () => {
    if (!newName) return;
    try {
      await addDoc(collection(db, 'courses'), {
        name: newName,
        specificDisciplines: Array(9).fill('').map((_, i) => `Disciplina Específica ${i + 1}`),
        createdAt: serverTimestamp()
      });
      setNewName('');
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'courses');
    }
  };

  const handleDelete = async () => {
    if (!deletingCourseId) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'courses', deletingCourseId));
      setDeletingCourseId(null);
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, 'courses');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {courses.map((course: any) => (
          <Card 
            key={course.id} 
            className="p-4 flex justify-between items-center cursor-pointer hover:border-indigo-300 transition-all"
            onClick={() => setEditingCourse(course)}
          >
            <div>
              <h4 className="font-bold text-gray-900">{course.name}</h4>
              <p className="text-xs text-gray-500">{course.specificDisciplines?.length || 0} Disciplinas Específicas</p>
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <button onClick={(e) => { e.stopPropagation(); setEditingCourse(course); }} className="text-indigo-500 hover:bg-indigo-50 p-2 rounded">
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
              {isAdmin && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeletingCourseId(course.id);
                  }} 
                  className="text-red-500 hover:bg-red-50 p-2 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </Card>
        ))}
      </div>

      <ConfirmationModal 
        isOpen={!!deletingCourseId}
        title="Excluir Curso"
        message="Tem certeza que deseja excluir este curso? Esta ação não pode ser desfeita."
        onConfirm={handleDelete}
        onCancel={() => setDeletingCourseId(null)}
        loading={isDeleting}
      />

      {editingCourse && (
        <CourseEditModal 
          course={editingCourse} 
          isAdmin={isAdmin} 
          onClose={() => setEditingCourse(null)} 
        />
      )}
    </div>
  );
}

function CourseEditModal({ course, isAdmin, onClose }: any) {
  const [name, setName] = useState(course.name);
  const [marketingSummary, setMarketingSummary] = useState(course.marketingSummary || '');
  const [imageUrl, setImageUrl] = useState(course.imageUrl || '');
  const [disciplines, setDisciplines] = useState([...(course.specificDisciplines || [])]);
  const [newDisc, setNewDisc] = useState('');
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setDisciplines((items) => {
        const oldIndex = items.indexOf(active.id);
        const newIndex = items.indexOf(over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update course document
      await updateDoc(doc(db, 'courses', course.id), {
        name,
        marketingSummary,
        imageUrl,
        specificDisciplines: disciplines
      });

      // Create a map of renamed disciplines
      const oldDisciplines = course.specificDisciplines || [];
      const renamedMap = new Map();
      disciplines.forEach((newName, i) => {
        if (oldDisciplines[i] && oldDisciplines[i] !== newName) {
          renamedMap.set(oldDisciplines[i], newName);
        }
      });

      // 1. Propagate changes to all classes of this course
      const classesQuery = query(collection(db, 'classes'), where('courseId', '==', course.id));
      const classesSnap = await getDocs(classesQuery);
      
      const classUpdatePromises = classesSnap.docs.map(classDoc => {
        const classData = classDoc.data();
        const updateData: any = { courseName: name };
        
        // If the discipline name was changed, update it
        if (renamedMap.has(classData.disciplineName)) {
          updateData.disciplineName = renamedMap.get(classData.disciplineName);
        }
        
        return updateDoc(classDoc.ref, updateData);
      });

      // 2. Propagate changes to teacher specialties
      const teachersSnap = await getDocs(collection(db, 'teachers'));
      const teacherUpdatePromises = teachersSnap.docs.map(teacherDoc => {
        const teacherData = teacherDoc.data();
        if (!teacherData.specialties) return Promise.resolve();
        
        let changed = false;
        const newSpecialties = teacherData.specialties.map((s: any) => {
          if (s.courseId === course.id && renamedMap.has(s.disciplineName)) {
            changed = true;
            return { ...s, disciplineName: renamedMap.get(s.disciplineName) };
          }
          return s;
        });

        if (changed) {
          return updateDoc(teacherDoc.ref, { specialties: newSpecialties });
        }
        return Promise.resolve();
      });

      await Promise.all([...classUpdatePromises, ...teacherUpdatePromises]);
      onClose();
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'courses');
    } finally {
      setSaving(false);
    }
  };

  const addDisc = () => {
    if (!newDisc) return;
    setDisciplines([...disciplines, newDisc]);
    setNewDisc('');
  };

  const removeDisc = (index: number) => {
    setDisciplines(disciplines.filter((_, i) => i !== index));
  };

  const updateDiscName = (index: number, newName: string) => {
    const next = [...disciplines];
    next[index] = newName;
    setDisciplines(next);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
      >
        <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-indigo-600 text-white">
          <h2 className="text-xl font-bold">Editar Curso</h2>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <Plus className="w-6 h-6 rotate-45" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <Input label="Nome do Curso" value={name} onChange={(e: any) => setName(e.target.value)} disabled={!isAdmin} />
          
          <Input 
            label="URL da Imagem de Capa (Opcional)" 
            placeholder="https://..." 
            value={imageUrl} 
            onChange={(e: any) => setImageUrl(e.target.value)} 
            disabled={!isAdmin}
          />

          <TextArea 
            label="Resumo de Marketing (Opcional)" 
            placeholder="Texto para propaganda do curso..." 
            value={marketingSummary} 
            onChange={(e: any) => setMarketingSummary(e.target.value)} 
            disabled={!isAdmin}
          />
          
          <div className="space-y-4">
            <p className="text-sm font-bold text-gray-700 uppercase tracking-wider">Disciplinas Específicas</p>
            {isAdmin && (
              <div className="flex gap-2">
                <Input placeholder="Nova disciplina" value={newDisc} onChange={(e: any) => setNewDisc(e.target.value)} />
                <Button onClick={addDisc} className="shrink-0">Adicionar</Button>
              </div>
            )}
            <div className="space-y-2">
              <DndContext 
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext 
                  items={disciplines}
                  strategy={verticalListSortingStrategy}
                >
                  {disciplines.map((disc, i) => (
                    <SortableItem key={disc} id={disc}>
                      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200 pl-8">
                        <Input 
                          className="flex-1 border-none bg-transparent focus:ring-0 h-8 text-sm" 
                          value={disc} 
                          onChange={(e: any) => updateDiscName(i, e.target.value)}
                          disabled={!isAdmin}
                        />
                        {isAdmin && (
                          <button onClick={() => removeDisc(i)} className="text-red-400 hover:text-red-600 p-1">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </SortableItem>
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          </div>
        </div>
        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          {isAdmin && (
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function TeachersManager({ teachers, courses, isAdmin }: any) {
  const [editingTeacher, setEditingTeacher] = useState<any>(null);
  const [deletingTeacherId, setDeletingTeacherId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deletingTeacherId) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'teachers', deletingTeacherId));
      setDeletingTeacherId(null);
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, 'teachers');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {teachers?.map((teacher: any) => (
          <Card 
            key={teacher.id} 
            className="p-4 flex items-center gap-3 sm:gap-4 cursor-pointer hover:border-indigo-300 transition-all"
            onClick={() => setEditingTeacher(teacher)}
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-100 text-indigo-600 flex items-center justify-center rounded-full font-bold text-lg sm:text-xl shadow-inner shrink-0 overflow-hidden">
              {teacher.photoUrl ? (
                <Image 
                  src={teacher.photoUrl} 
                  alt={teacher.name} 
                  width={48} 
                  height={48} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                teacher.name[0]
              )}
            </div>
            <div className="flex-1 overflow-hidden">
              <h4 className="font-bold text-gray-900 truncate text-sm sm:text-base">{teacher.name}</h4>
              <p className="text-[10px] sm:text-xs text-gray-500 truncate">{teacher.email || teacher.phone || 'Sem contato'}</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {teacher.specialties?.slice(0, 2).map((s: any, i: number) => (
                  <span key={i} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[8px] font-bold uppercase">
                    {s.disciplineName}
                  </span>
                ))}
                {(teacher.specialties?.length || 0) > 2 && (
                  <span className="text-[8px] text-gray-400 font-bold">+{teacher.specialties?.length - 2}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-0.5 sm:gap-1">
              {isAdmin && (
                <button onClick={(e) => { e.stopPropagation(); setEditingTeacher(teacher); }} className="text-indigo-400 hover:text-indigo-600 p-1.5 sm:p-2 hover:bg-indigo-50 rounded transition-colors">
                  <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              )}
              {isAdmin && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeletingTeacherId(teacher.id);
                  }} 
                  className="text-red-400 hover:text-red-600 p-1.5 sm:p-2 hover:bg-red-50 rounded transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              )}
            </div>
          </Card>
        ))}
      </div>

      <ConfirmationModal 
        isOpen={!!deletingTeacherId}
        title="Excluir Docente"
        message="Tem certeza que deseja excluir este docente? Esta ação não pode ser desfeita."
        onConfirm={handleDelete}
        onCancel={() => setDeletingTeacherId(null)}
        loading={isDeleting}
      />

      {editingTeacher && (
        <TeacherEditModal 
          teacher={editingTeacher} 
          courses={courses} 
          isAdmin={isAdmin} 
          onClose={() => setEditingTeacher(null)} 
        />
      )}
    </div>
  );
}

function TeacherEditModal({ teacher, courses, isAdmin, onClose }: any) {
  const [form, setForm] = useState({ 
    name: teacher.name || '', 
    email: teacher.email || '', 
    cpf: teacher.cpf || '', 
    phone: teacher.phone || '', 
    photoUrl: teacher.photoUrl || '',
    linkedin: teacher.linkedin || '',
    lattes: teacher.lattes || '',
    instagram: teacher.instagram || '',
    specialties: teacher.specialties || [] 
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'teachers', teacher.id), form);
      onClose();
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'teachers');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-2 sm:p-4 z-50">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl w-full max-w-3xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl"
      >
        <div className="p-4 sm:p-6 border-b border-gray-200 flex justify-between items-center bg-indigo-600 text-white shrink-0">
          <h2 className="text-lg sm:text-xl font-bold">Editar Docente</h2>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1">
            <Plus className="w-6 h-6 rotate-45" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Nome Completo" value={form.name} onChange={(e: any) => setForm({...form, name: e.target.value})} disabled={!isAdmin} />
            <Input label="E-mail (Opcional)" value={form.email} onChange={(e: any) => setForm({...form, email: e.target.value})} disabled={!isAdmin} />
            <Input label="CPF (Opcional)" value={form.cpf} onChange={(e: any) => setForm({...form, cpf: e.target.value})} disabled={!isAdmin} />
            <Input label="Telefone (Opcional)" value={form.phone} onChange={(e: any) => setForm({...form, phone: e.target.value})} disabled={!isAdmin} />
            <Input label="URL da Foto (Opcional)" value={form.photoUrl} onChange={(e: any) => setForm({...form, photoUrl: e.target.value})} disabled={!isAdmin} />
            <Input label="LinkedIn (Opcional)" value={form.linkedin} onChange={(e: any) => setForm({...form, linkedin: e.target.value})} disabled={!isAdmin} />
            <Input label="Lattes (Opcional)" value={form.lattes} onChange={(e: any) => setForm({...form, lattes: e.target.value})} disabled={!isAdmin} />
            <Input label="Instagram (Opcional)" value={form.instagram} onChange={(e: any) => setForm({...form, instagram: e.target.value})} disabled={!isAdmin} />
          </div>
          
          <div className="p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs sm:text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">Disciplinas Atribuídas</p>
            
            <div className="mb-6">
              <p className="text-[10px] sm:text-xs font-bold text-indigo-600 mb-2 uppercase">Disciplinas Comuns</p>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {COMMON_DISCIPLINES.map((disc: any) => {
                  const isSelected = form.specialties?.some((s: any) => s.courseId === 'common' && s.disciplineName === disc.name);
                  return (
                    <button
                      key={disc.name}
                      disabled={!isAdmin}
                      onClick={() => {
                        const current = form.specialties || [];
                        if (isSelected) {
                          setForm({ ...form, specialties: current.filter((s: any) => !(s.courseId === 'common' && s.disciplineName === disc.name)) });
                        } else {
                          setForm({ ...form, specialties: [...current, { courseId: 'common', disciplineName: disc.name }] });
                        }
                      }}
                      className={`px-2 py-1 rounded text-[9px] sm:text-[10px] border transition-all ${isSelected ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300'}`}
                    >
                      {disc.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {(courses || []).map((course: any) => (
                <div key={course.id} className="space-y-2">
                  <p className="text-[10px] sm:text-xs font-bold text-indigo-600 uppercase">{course.name}</p>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {(course.specificDisciplines || []).map((disc: string) => {
                      const isSelected = form.specialties?.some((s: any) => s.courseId === course.id && s.disciplineName === disc);
                      return (
                        <button
                          key={disc}
                          disabled={!isAdmin}
                          onClick={() => {
                            const current = form.specialties || [];
                            if (isSelected) {
                              setForm({ ...form, specialties: current.filter((s: any) => !(s.courseId === course.id && s.disciplineName === disc)) });
                            } else {
                              setForm({ ...form, specialties: [...current, { courseId: course.id, disciplineName: disc }] });
                            }
                          }}
                          className={`px-2 py-1 rounded text-[9px] sm:text-[10px] border transition-all ${isSelected ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300'}`}
                        >
                          {disc}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="p-4 sm:p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-2 sm:gap-3 shrink-0">
          <Button variant="secondary" onClick={onClose}>Fechar</Button>
          {isAdmin && (
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function NewCourseModal({ isAdmin, onClose }: any) {
  const [name, setName] = useState('');
  const [marketingSummary, setMarketingSummary] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [disciplines, setDisciplines] = useState<string[]>([]);
  const [newDisc, setNewDisc] = useState('');
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setDisciplines((items) => {
        const oldIndex = items.indexOf(active.id);
        const newIndex = items.indexOf(over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleSave = async () => {
    if (!name || disciplines.length === 0) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'courses'), {
        name,
        marketingSummary,
        imageUrl,
        specificDisciplines: disciplines,
        createdAt: serverTimestamp()
      });
      onClose();
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'courses');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-2 sm:p-4 z-50">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl w-full max-w-xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl"
      >
        <div className="p-4 sm:p-6 border-b border-gray-200 flex justify-between items-center bg-indigo-600 text-white shrink-0">
          <h2 className="text-lg sm:text-xl font-bold">Novo Curso</h2>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1">
            <Plus className="w-6 h-6 rotate-45" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          <Input 
            label="Nome do Curso" 
            placeholder="Ex: MBA em Gestão de Projetos" 
            value={name} 
            onChange={(e: any) => setName(e.target.value)} 
          />

          <Input 
            label="URL da Imagem de Capa (Opcional)" 
            placeholder="https://..." 
            value={imageUrl} 
            onChange={(e: any) => setImageUrl(e.target.value)} 
          />

          <TextArea 
            label="Resumo de Marketing (Opcional)" 
            placeholder="Texto para propaganda do curso..." 
            value={marketingSummary} 
            onChange={(e: any) => setMarketingSummary(e.target.value)} 
          />
          
          <div className="space-y-4">
            <p className="text-xs sm:text-sm font-bold text-gray-700 uppercase tracking-wider">Disciplinas Específicas</p>
            <div className="flex gap-2">
              <Input 
                placeholder="Nome da disciplina" 
                value={newDisc} 
                onChange={(e: any) => setNewDisc(e.target.value)} 
                className="flex-1"
              />
              <div className="flex items-end">
                <Button onClick={() => {
                  if (newDisc) {
                    setDisciplines([...disciplines, newDisc]);
                    setNewDisc('');
                  }
                }} variant="secondary" className="shrink-0">Add</Button>
              </div>
            </div>
            <div className="space-y-2">
              <DndContext 
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext 
                  items={disciplines}
                  strategy={verticalListSortingStrategy}
                >
                  {disciplines.map((disc, i) => (
                    <SortableItem key={disc} id={disc}>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 pl-8 sm:pl-10 relative">
                        <Menu className="w-4 h-4 text-gray-300 absolute left-3 top-1/2 -translate-y-1/2" />
                        <span className="text-sm font-medium text-gray-700 truncate">{disc}</span>
                        <button onClick={() => setDisciplines(disciplines.filter((_, idx) => idx !== i))} className="text-red-500 hover:bg-red-50 p-1.5 rounded shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </SortableItem>
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          </div>
        </div>
        <div className="p-4 sm:p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-2 sm:gap-3 shrink-0">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !name || disciplines.length === 0}>
            {saving ? 'Salvando...' : 'Criar Curso'}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

function NewTeacherModal({ courses, isAdmin, onClose }: any) {
  const [form, setForm] = useState({ 
    name: '', 
    email: '', 
    cpf: '', 
    phone: '', 
    photoUrl: '',
    linkedin: '',
    lattes: '',
    instagram: '',
    specialties: [] as any[] 
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'teachers'), {
        ...form,
        createdAt: serverTimestamp()
      });
      onClose();
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'teachers');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-2 sm:p-4 z-50">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl w-full max-w-3xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl"
      >
        <div className="p-4 sm:p-6 border-b border-gray-200 flex justify-between items-center bg-indigo-600 text-white shrink-0">
          <h2 className="text-lg sm:text-xl font-bold">Novo Docente</h2>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1">
            <Plus className="w-6 h-6 rotate-45" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Nome Completo" placeholder="Ex: João Silva" value={form.name} onChange={(e: any) => setForm({...form, name: e.target.value})} />
            <Input label="E-mail (Opcional)" placeholder="joao@esuda.edu.br" value={form.email} onChange={(e: any) => setForm({...form, email: e.target.value})} />
            <Input label="CPF (Opcional)" placeholder="000.000.000-00" value={form.cpf} onChange={(e: any) => setForm({...form, cpf: e.target.value})} />
            <Input label="Telefone (Opcional)" placeholder="(00) 00000-0000" value={form.phone} onChange={(e: any) => setForm({...form, phone: e.target.value})} />
            <Input label="URL da Foto (Opcional)" placeholder="https://..." value={form.photoUrl} onChange={(e: any) => setForm({...form, photoUrl: e.target.value})} />
            <Input label="LinkedIn (Opcional)" placeholder="https://linkedin.com/in/..." value={form.linkedin} onChange={(e: any) => setForm({...form, linkedin: e.target.value})} />
            <Input label="Lattes (Opcional)" placeholder="http://lattes.cnpq.br/..." value={form.lattes} onChange={(e: any) => setForm({...form, lattes: e.target.value})} />
            <Input label="Instagram (Opcional)" placeholder="https://instagram.com/..." value={form.instagram} onChange={(e: any) => setForm({...form, instagram: e.target.value})} />
          </div>
          
          <div className="p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs sm:text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">Especialidades (Disciplinas)</p>
            
            <div className="mb-6">
              <p className="text-[10px] sm:text-xs font-bold text-indigo-600 mb-2 uppercase">Disciplinas Comuns</p>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {COMMON_DISCIPLINES.map((disc: any) => {
                  const isSelected = form.specialties?.some((s: any) => s.courseId === 'common' && s.disciplineName === disc.name);
                  return (
                    <button
                      key={disc.name}
                      onClick={() => {
                        const current = form.specialties || [];
                        if (isSelected) {
                          setForm({ ...form, specialties: current.filter((s: any) => !(s.courseId === 'common' && s.disciplineName === disc.name)) });
                        } else {
                          setForm({ ...form, specialties: [...current, { courseId: 'common', disciplineName: disc.name }] });
                        }
                      }}
                      className={`px-2 py-1 rounded text-[9px] sm:text-[10px] border transition-all ${isSelected ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300'}`}
                    >
                      {disc.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {(courses || []).map((course: any) => (
                <div key={course.id} className="space-y-2">
                  <p className="text-[10px] sm:text-xs font-bold text-indigo-600 uppercase">{course.name}</p>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {(course.specificDisciplines || []).map((disc: string) => {
                      const isSelected = form.specialties?.some((s: any) => s.courseId === course.id && s.disciplineName === disc);
                      return (
                        <button
                          key={disc}
                          onClick={() => {
                            const current = form.specialties || [];
                            if (isSelected) {
                              setForm({ ...form, specialties: current.filter((s: any) => !(s.courseId === course.id && s.disciplineName === disc)) });
                            } else {
                              setForm({ ...form, specialties: [...current, { courseId: course.id, disciplineName: disc }] });
                            }
                          }}
                          className={`px-2 py-1 rounded text-[9px] sm:text-[10px] border transition-all ${isSelected ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300'}`}
                        >
                          {disc}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="p-4 sm:p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-2 sm:gap-3 shrink-0">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !form.name}>
            {saving ? 'Salvando...' : 'Criar Docente'}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

function HolidaysManager({ holidays, isAdmin }: any) {
  const [form, setForm] = useState({ date: '', description: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSubmit = async () => {
    if (!form.date || !form.description) return;
    try {
      if (editingId) {
        await updateDoc(doc(db, 'holidays', editingId), { ...form });
        setEditingId(null);
      } else {
        await addDoc(collection(db, 'holidays'), { ...form });
      }
      setForm({ date: '', description: '' });
    } catch (e) {
      handleFirestoreError(e, editingId ? OperationType.UPDATE : OperationType.WRITE, 'holidays');
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'holidays', deletingId));
      setDeletingId(null);
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, 'holidays');
    } finally {
      setIsDeleting(false);
    }
  };

  const startEdit = (h: any) => {
    setEditingId(h.id);
    setForm({ date: h.date, description: h.description });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({ date: '', description: '' });
  };

  return (
    <div className="space-y-6">
      {isAdmin && (
        <Card className="p-4 sm:p-6 border-indigo-100 bg-indigo-50/30 flex flex-col items-center text-center space-y-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
            <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-indigo-900">
              {holidays.length === 0 ? 'Nenhum feriado cadastrado' : `${holidays.length} feriados cadastrados`}
            </h3>
            <p className="text-xs sm:text-sm text-indigo-600/70">
              {holidays.length === 0 
                ? 'Deseja carregar os feriados padrão de 2026 para Recife?' 
                : 'Deseja recarregar/atualizar os feriados padrão de 2026?'}
            </p>
          </div>
          <Button onClick={async () => {
            const existingDates = new Set(holidays.map((h: any) => h.date));
            let added = 0;
            for (const h of HOLIDAYS_2026) {
              if (!existingDates.has(h.date)) {
                await addDoc(collection(db, 'holidays'), h);
                added++;
              }
            }
            if (added > 0) {
              alert(`${added} novos feriados adicionados!`);
            } else {
              alert("Todos os feriados de 2026 já estão cadastrados.");
            }
          }}>
            {holidays.length === 0 ? 'Carregar Feriados 2026' : 'Verificar Feriados 2026'}
          </Button>
        </Card>
      )}
      {isAdmin && (
        <Card className="p-4 sm:p-6 border-indigo-100 bg-indigo-50/30">
          <h3 className="text-base sm:text-lg font-bold text-indigo-900 mb-4">
            {editingId ? 'Editar Feriado' : 'Adicionar Novo Feriado'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input type="date" label="Data" value={form.date} onChange={(e: any) => setForm({...form, date: e.target.value})} />
            <Input label="Descrição" placeholder="Ex: Sexta-feira Santa" value={form.description} onChange={(e: any) => setForm({...form, description: e.target.value})} />
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={handleSubmit} className="flex-1 sm:flex-none">
              {editingId ? 'Salvar Alterações' : 'Adicionar Feriado'}
            </Button>
            {editingId && (
              <Button variant="secondary" onClick={cancelEdit} className="flex-1 sm:flex-none">Cancelar</Button>
            )}
          </div>
        </Card>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...(holidays || [])].sort((a: any, b: any) => a.date.localeCompare(b.date)).map((h: any) => (
          <Card key={h.id} className="p-4 bg-white border-l-4 border-red-500 group relative hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start gap-2">
              <div className="overflow-hidden">
                <h4 className="font-bold text-gray-900 truncate text-sm sm:text-base">{h.description}</h4>
                <p className="text-xs text-gray-500">{format(parseISO(h.date), 'dd/MM/yyyy')}</p>
              </div>
              {isAdmin && (
                <div className="flex gap-0.5 sm:gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button 
                    onClick={() => startEdit(h)}
                    className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                    title="Editar"
                  >
                    <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                  <button 
                    onClick={() => setDeletingId(h.id)}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Excluir"
                  >
                    <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      <ConfirmationModal 
        isOpen={!!deletingId}
        title="Excluir Feriado"
        message="Deseja excluir este feriado? Isso pode afetar a geração de novos cronogramas."
        onConfirm={handleDelete}
        onCancel={() => setDeletingId(null)}
        loading={isDeleting}
      />
    </div>
  );
}

function NewScheduleModal({ courses, holidays, teachers, onClose }: any) {
  const [step, setStep] = useState(1);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [className, setClassName] = useState('');
  const [preview, setPreview] = useState<any>(null);
  
  // Discipline ordering state
  const [commonOrder, setCommonOrder] = useState<any[]>(COMMON_DISCIPLINES.map((d, i) => ({ ...d, id: `common-${i}` })));
  const [specificOrders, setSpecificOrders] = useState<Record<string, any[]>>({});

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const toggleCourse = (id: string) => {
    let nextSelected;
    if (selectedCourses.includes(id)) {
      nextSelected = selectedCourses.filter(i => i !== id);
    } else if (selectedCourses.length < 3) {
      nextSelected = [...selectedCourses, id];
    } else {
      return;
    }

    setSelectedCourses(nextSelected);

    // Update specific orders when courses are toggled
    const newOrders: Record<string, any[]> = {};
    nextSelected.forEach(courseId => {
      const course = courses.find((c: any) => c.id === courseId);
      if (course) {
        // Keep existing order if already there, otherwise create new
        if (specificOrders[courseId]) {
          newOrders[courseId] = specificOrders[courseId];
        } else {
          newOrders[courseId] = (course.specificDisciplines || []).map((d: string, i: number) => ({
            name: d,
            id: `spec-${course.id}-${i}`
          }));
        }
      }
    });
    setSpecificOrders(newOrders);
  };

  const handleDragEndCommon = (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setCommonOrder((items) => {
        const oldIndex = items.findIndex(i => i.id === active.id);
        const newIndex = items.findIndex(i => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleDragEndSpecific = (courseId: string, event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setSpecificOrders(prev => {
        const items = prev[courseId];
        const oldIndex = items.findIndex(i => i.id === active.id);
        const newIndex = items.findIndex(i => i.id === over.id);
        return {
          ...prev,
          [courseId]: arrayMove(items, oldIndex, newIndex)
        };
      });
    }
  };

  const generatePreview = () => {
    if (selectedCourses.length < 1 || !startDate) return;
    
    // We need to override the default generation with our custom order
    const courseNames = selectedCourses.map(id => courses.find((c: any) => c.id === id)?.name || 'Curso');
    
    // Create a temporary version of generateFullSchedule logic that respects our order
    const result = generateFullScheduleWithOrder(
      startDate, 
      selectedCourses.map(id => ({
        id,
        name: courses.find((c: any) => c.id === id)?.name || 'Curso',
        disciplines: (specificOrders[id] || []).map(d => d.name)
      })),
      commonOrder.map(d => ({ name: d.name, modality: d.modality })),
      holidays
    );

    // Initialize teachers for each discipline in preview
    const initializedCommon = (result.common || []).map((c: any) => {
      // Pre-select teacher if they are registered for this discipline
      const matchingTeacher = teachers.find((t: any) => 
        t.specialties?.some((s: any) => s.disciplineName === c.disciplineName)
      );
      return { ...c, teacherId: matchingTeacher?.id || '' };
    });

    const initializedSpecific: any = {};
    for (const courseId in result.specific) {
      initializedSpecific[courseId] = (result.specific[courseId] || []).map((c: any) => {
        // Pre-select teacher if they are registered for this discipline
        const matchingTeacher = teachers.find((t: any) => 
          t.specialties?.some((s: any) => s.disciplineName === c.disciplineName)
        );
        return { ...c, teacherId: matchingTeacher?.id || '' };
      });
    }

    setPreview({ common: initializedCommon, specific: initializedSpecific });
    setStep(2);
  };

  const saveSchedule = async () => {
    try {
      const scheduleRef = await addDoc(collection(db, 'schedules'), {
        courseIds: selectedCourses,
        startDate,
        className,
        status: 'active',
        createdAt: serverTimestamp()
      });

      const allClassPromises = [];
      
      // Common classes
      for (const c of preview.common) {
        allClassPromises.push(addDoc(collection(db, 'classes'), {
          ...c,
          scheduleId: scheduleRef.id
        }));
      }

      // Specific classes
      for (const courseId in preview.specific) {
        for (const c of preview.specific[courseId]) {
          allClassPromises.push(addDoc(collection(db, 'classes'), {
            ...c,
            scheduleId: scheduleRef.id
          }));
        }
      }

      await Promise.all(allClassPromises);
      onClose();
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'schedules');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-2 sm:p-4 z-50">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl"
      >
        <div className="p-4 sm:p-6 border-b border-gray-200 flex justify-between items-center bg-indigo-600 text-white shrink-0">
          <div>
            <h2 className="text-lg sm:text-2xl font-bold">Novo Cronograma</h2>
            <p className="text-[10px] sm:text-xs text-indigo-100 mt-0.5">Passo {step} de 2</p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1">
            <Plus className="w-6 h-6 rotate-45" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
          {step === 1 && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
                <div className="lg:col-span-1 space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-700">1. Cursos e Início</h3>
                    <Input 
                      label="Nome da Turma" 
                      placeholder="Ex: Turma A - 2024" 
                      value={className} 
                      onChange={(e: any) => setClassName(e.target.value)} 
                    />
                    <div className="grid grid-cols-1 gap-2 sm:gap-3">
                      {courses.map((course: any) => (
                        <button
                          key={course.id}
                          onClick={() => toggleCourse(course.id)}
                          className={`p-3 rounded-xl border text-left transition-all text-sm ${selectedCourses.includes(course.id) ? 'bg-indigo-50 border-indigo-600 ring-1 ring-indigo-600' : 'bg-white border-gray-200 hover:border-indigo-300'}`}
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-medium truncate mr-2">{course.name}</span>
                            {selectedCourses.includes(course.id) && <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <Input type="date" label="Data de Início" value={startDate} onChange={(e: any) => setStartDate(e.target.value)} />
                </div>

                <div className="lg:col-span-2 space-y-6">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-700">2. Organize a Ordem das Disciplinas</h3>
                  
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Fase Comum</h4>
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndCommon}>
                      <SortableContext items={commonOrder.map(i => i.id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-2">
                          {commonOrder.map((d) => (
                            <SortableItem key={d.id} id={d.id}>
                              <div className="p-3 bg-white border border-gray-200 rounded-lg flex items-center gap-3 sm:gap-4 pl-8 sm:pl-10 relative">
                                <Menu className="w-4 h-4 text-gray-300 absolute left-3 top-1/2 -translate-y-1/2" />
                                <span className="text-[10px] sm:text-xs font-bold text-gray-400 w-4">{commonOrder.indexOf(d) + 1}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{d.name}</p>
                                  <p className="text-[10px] text-gray-400">{d.modality}</p>
                                </div>
                              </div>
                            </SortableItem>
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  </div>

                  {selectedCourses.map(courseId => (
                    <div key={courseId} className="space-y-4">
                      <h4 className="text-xs font-bold text-amber-600 uppercase tracking-wider">
                        {courses.find((c: any) => c.id === courseId)?.name}
                      </h4>
                      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEndSpecific(courseId, e)}>
                        <SortableContext items={specificOrders[courseId]?.map(i => i.id) || []} strategy={verticalListSortingStrategy}>
                          <div className="space-y-2">
                            {specificOrders[courseId]?.map((d) => (
                              <SortableItem key={d.id} id={d.id}>
                                <div className="p-3 bg-white border border-gray-200 rounded-lg flex items-center gap-3 sm:gap-4 pl-8 sm:pl-10 relative">
                                  <Menu className="w-4 h-4 text-gray-300 absolute left-3 top-1/2 -translate-y-1/2" />
                                  <span className="text-[10px] sm:text-xs font-bold text-gray-400 w-4">{specificOrders[courseId].indexOf(d) + 10}</span>
                                  <p className="text-sm font-medium truncate">{d.name}</p>
                                </div>
                              </SortableItem>
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && preview && (
            <div className="space-y-6 sm:space-y-8">
              <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                <h3 className="font-bold text-indigo-900 flex items-center gap-2 text-sm sm:text-base">
                  <LayoutDashboard className="w-4 h-4 sm:w-5 sm:h-5" /> Revisão e Atribuição de Docentes
                </h3>
                <p className="text-xs sm:text-sm text-indigo-700">Atribua um professor para cada disciplina antes de salvar.</p>
              </div>

              <div className="space-y-6">
                <h4 className="font-bold text-gray-700 border-b pb-2 text-sm sm:text-base">Disciplinas Comuns</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {preview.common.filter((_: any, i: number) => i % 2 === 0).map((c: any, i: number) => (
                    <Card key={i} className="p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 bg-indigo-100 text-indigo-600 flex items-center justify-center rounded-full text-[10px] font-bold shrink-0">
                            {c.order}
                          </div>
                          <p className="font-bold text-sm text-gray-900 truncate">{c.disciplineName}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-500">
                        <div className="bg-gray-50 p-1 rounded">Aula 1: {format(parseISO(c.date), 'dd/MM/yyyy')}</div>
                        <div className="bg-gray-50 p-1 rounded">Aula 2: {format(parseISO(preview.common[i*2+1].date), 'dd/MM/yyyy')}</div>
                      </div>
                      <Select 
                        label="Docente" 
                        options={(teachers || []).filter((t: any) => t.specialties?.some((s: any) => s.disciplineName === c.disciplineName))} 
                        value={c.teacherId} 
                        onChange={(e: any) => {
                          const newCommon = [...preview.common];
                          newCommon[i*2].teacherId = e.target.value;
                          newCommon[i*2+1].teacherId = e.target.value;
                          setPreview({ ...preview, common: newCommon });
                        }}
                      />
                    </Card>
                  ))}
                </div>

                {Object.keys(preview.specific).map(courseId => (
                  <div key={courseId} className="space-y-4">
                    <h4 className="font-bold text-gray-700 border-b pb-2 text-sm sm:text-base">
                      {courses.find((c: any) => c.id === courseId)?.name}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {preview.specific[courseId].filter((_: any, i: number) => i % 2 === 0).map((c: any, i: number) => (
                        <Card key={i} className="p-4 space-y-3">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                              <div className="w-6 h-6 bg-amber-100 text-amber-600 flex items-center justify-center rounded-full text-[10px] font-bold shrink-0">
                                {c.order}
                              </div>
                              <p className="font-bold text-sm text-gray-900 truncate">{c.disciplineName}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-500">
                            <div className="bg-gray-50 p-1 rounded">Aula 1: {format(parseISO(c.date), 'dd/MM/yyyy')}</div>
                            <div className="bg-gray-50 p-1 rounded">Aula 2: {format(parseISO(preview.specific[courseId][i*2+1].date), 'dd/MM/yyyy')}</div>
                          </div>
                          <Select 
                            label="Docente" 
                            options={(teachers || []).filter((t: any) => t.specialties?.some((s: any) => s.disciplineName === c.disciplineName))} 
                            value={c.teacherId} 
                            onChange={(e: any) => {
                              const newSpecific = { ...preview.specific };
                              newSpecific[courseId][i*2].teacherId = e.target.value;
                              newSpecific[courseId][i*2+1].teacherId = e.target.value;
                              setPreview({ ...preview, specific: newSpecific });
                            }}
                          />
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 sm:p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-2 sm:gap-3 shrink-0">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          {step === 1 ? (
            <Button disabled={selectedCourses.length === 0 || !startDate} onClick={generatePreview} className="flex items-center gap-2">
              Gerar Cronograma <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setStep(1)} className="flex items-center gap-2">
                <ChevronLeft className="w-4 h-4" /> Voltar
              </Button>
              <Button onClick={saveSchedule} className="flex items-center gap-2">
                <Save className="w-4 h-4" /> Salvar e Publicar
              </Button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function ScheduleDetailsModal({ schedule, courses, teachers, isAdmin, onClose, holidays }: any) {
  const [classes, setClasses] = useState<any[]>([]);
  const [allOtherClasses, setAllOtherClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editedClasses, setEditedClasses] = useState<any[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const q = query(collection(db, 'classes'), where('scheduleId', '==', schedule.id), orderBy('date', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setClasses(data);
      setEditedClasses(data);
      setLoading(false);
    }, (e) => handleFirestoreError(e, OperationType.GET, 'classes'));

    // Fetch all other classes for conflict detection
    const fetchAllClasses = async () => {
      try {
        const qAll = query(collection(db, 'classes'), where('date', '>=', schedule.startDate));
        const snap = await getDocs(qAll);
        const fetchedClasses = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
        setAllOtherClasses(fetchedClasses.filter((c: any) => c.scheduleId !== schedule.id));
      } catch (e) {
        console.error("Error fetching other classes:", e);
      }
    };
    fetchAllClasses();

    return () => unsubscribe();
  }, [schedule.id, schedule.startDate]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      // Delete all classes
      const q = query(collection(db, 'classes'), where('scheduleId', '==', schedule.id));
      const snap = await getDocs(q);
      const deletePromises = snap.docs.map(d => deleteDoc(doc(db, 'classes', d.id)));
      await Promise.all(deletePromises);

      // Delete schedule
      await deleteDoc(doc(db, 'schedules', schedule.id));
      onClose();
    } catch (e) {
      console.error("Error deleting schedule:", e);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const promises = editedClasses.map(c => {
        const updateData: any = {
          disciplineName: c.disciplineName || '',
          teacherId: c.teacherId || '',
          courseName: c.courseName || (c.isCommon ? 'Fase Comum' : (courses.find((co: any) => co.id === c.courseId)?.name || '')),
          date: c.date,
          order: c.order,
          classNumber: c.classNumber || 1
        };
        return updateDoc(doc(db, 'classes', c.id), updateData);
      });
      
      // Propagate course name changes globally if changed
      const courseNameChanges = new Map();
      editedClasses.forEach(c => {
        if (!c.isCommon && c.courseId && c.courseName) {
          courseNameChanges.set(c.courseId, c.courseName);
        }
      });

      for (const [courseId, newName] of courseNameChanges.entries()) {
        const course = courses.find((c: any) => c.id === courseId);
        if (course && course.name !== newName) {
          await updateDoc(doc(db, 'courses', courseId), { name: newName });
        }
      }
      
      await Promise.all(promises);
      setIsEditing(false);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'classes');
    } finally {
      setSaving(false);
    }
  };

  const recalculateDates = () => {
    if (holidays.length === 0) {
      alert("Nenhum feriado carregado. Por favor, carregue os feriados na aba 'Feriados' primeiro.");
      return;
    }

    console.log("Recalculating dates with", holidays.length, "holidays");
    
    // Get all unique orders present in this schedule
    const sortedOrders = Array.from(new Set(editedClasses.map(c => c.order))).sort((a, b) => a - b);
    
    // Start from the schedule start date
    let currentSat = getNextAvailableSaturday(parseISO(schedule.startDate), holidays);
    
    const orderDates = new Map();
    sortedOrders.forEach(order => {
      const date1 = format(currentSat, 'yyyy-MM-dd');
      // Move to next available Saturday for the second class of the same discipline
      currentSat = getNextAvailableSaturday(addDays(currentSat, 7), holidays);
      const date2 = format(currentSat, 'yyyy-MM-dd');
      // Move to next available Saturday for the NEXT discipline
      currentSat = getNextAvailableSaturday(addDays(currentSat, 7), holidays);
      orderDates.set(order, [date1, date2]);
    });

    const updatedClasses = editedClasses.map(c => {
      const dates = orderDates.get(c.order);
      if (!dates) return c;

      // Find the position of this class within its order/course group
      const courseClasses = editedClasses
        .filter(oc => oc.order === c.order && oc.courseId === c.courseId)
        .sort((a, b) => {
          // Use classNumber if available, otherwise original date
          if (a.classNumber && b.classNumber) return a.classNumber - b.classNumber;
          return a.date.localeCompare(b.date);
        });
      
      const index = courseClasses.findIndex(oc => oc.id === c.id);
      return {
        ...c,
        date: dates[index] || dates[dates.length - 1],
        classNumber: index + 1
      };
    });

    setEditedClasses(updatedClasses);
    
    // Visual feedback
    const btn = document.activeElement as HTMLButtonElement;
    if (btn && btn.innerText.includes("Ajustar")) {
      const originalContent = btn.innerHTML;
      btn.innerHTML = '<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Datas Ajustadas!';
      btn.classList.add("bg-green-600", "hover:bg-green-700");
      setTimeout(() => {
        btn.innerHTML = originalContent;
        btn.classList.remove("bg-green-600", "hover:bg-green-700");
      }, 3000);
    }
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const orders = Array.from(new Set(editedClasses.map(c => c.order))).sort((a, b) => a - b);
      const oldIndex = orders.indexOf(active.id);
      const newIndex = orders.indexOf(over.id);
      const newOrderSequence = arrayMove(orders, oldIndex, newIndex);

      // Recalculate dates based on new order
      let currentSat = getNextAvailableSaturday(parseISO(schedule.startDate), holidays);
      const updatedClasses = [...editedClasses];

      newOrderSequence.forEach((orderValue) => {
        const classesInThisOrder = updatedClasses.filter(c => c.order === orderValue);
        
        // Each order has 2 dates (Sat 1 and Sat 2)
        const date1 = format(currentSat, 'yyyy-MM-dd');
        currentSat = getNextAvailableSaturday(addDays(currentSat, 7), holidays);
        const date2 = format(currentSat, 'yyyy-MM-dd');
        currentSat = getNextAvailableSaturday(addDays(currentSat, 7), holidays);

        classesInThisOrder.forEach(c => {
          // Find which class number it is (1 or 2)
          const isFirst = updatedClasses.filter(oc => oc.order === orderValue && oc.courseId === c.courseId).sort((a, b) => a.date.localeCompare(b.date))[0].id === c.id;
          c.date = isFirst ? date1 : date2;
          // We don't change the 'order' value itself to keep the sequence IDs stable for dnd, 
          // but we effectively reorder them in time. 
          // Actually, let's update order to reflect the new position
        });
      });

      // Update order values to match the new sequence
      // Use a map to avoid in-place update conflicts where classes 
      // from different original orders end up with the same new order.
      const orderMap = new Map();
      newOrderSequence.forEach((oldOrder, idx) => {
        orderMap.set(oldOrder, idx + 1);
      });

      updatedClasses.forEach(c => {
        if (orderMap.has(c.order)) {
          c.order = orderMap.get(c.order);
        }
      });

      setEditedClasses(updatedClasses);
    }
  };

  const getConflict = (teacherId: string, date: string, currentClass: any) => {
    if (!teacherId) return null;
    
    // Check in current schedule
    // A conflict is real if it's a DIFFERENT discipline (different course or different common status)
    // or a different order, but NOT if it's just the other "Aula" of the same discipline session.
    const localConflict = editedClasses.find(c => 
      c.teacherId === teacherId && 
      c.date === date && 
      c.id !== currentClass.id &&
      // Important: ignore the other class of the same discipline in the same order
      !(c.order === currentClass.order && (c.isCommon ? currentClass.isCommon : c.courseId === currentClass.courseId))
    );
    if (localConflict) return { type: 'local', info: localConflict.disciplineName };

    // Check in other schedules
    const externalConflict = allOtherClasses.find(c => c.teacherId === teacherId && c.date === date);
    if (externalConflict) return { type: 'external', info: `${externalConflict.courseName || 'Outro Curso'} - ${externalConflict.disciplineName}` };

    return null;
  };

  const updateClassField = (order: number, field: string, value: string, courseId?: string) => {
    setEditedClasses(prev => prev.map(c => {
      if (c.order === order) {
        if (!courseId || c.courseId === courseId) {
          return { ...c, [field]: value };
        }
      }
      return c;
    }));
  };

  const handleExportPDF = () => {
    const element = document.getElementById('schedule-content');
    if (!element) return;

    const opt = {
      margin: 10,
      filename: `Cronograma_${schedule.startDate}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    } as const;

    // @ts-ignore
    import('html2pdf.js').then((html2pdf) => {
      html2pdf.default().from(element).set(opt).save();
    });
  };

  // Group by order for the sequence view
  const groupedByOrder = editedClasses.reduce((acc: any, c: any) => {
    if (!acc[c.order]) acc[c.order] = [];
    acc[c.order].push(c);
    return acc;
  }, {});

  const sortedOrders = Object.keys(groupedByOrder).map(Number).sort((a, b) => a - b);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 print:bg-white print:p-0 print:static print:block">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl print-modal"
      >
        <div className="p-4 sm:p-6 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-indigo-600 text-white">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold">Detalhes do Cronograma</h2>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <p className="text-indigo-100 text-xs sm:text-sm">Início: {format(parseISO(schedule.startDate), 'dd/MM/yyyy')}</p>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${holidays.length > 0 ? 'bg-green-500/20 text-green-100' : 'bg-red-500/20 text-red-100'}`}>
                {holidays.length} Feriados Carregados
              </span>
              {isAdmin && holidays.length === 0 && (
                <button 
                  onClick={async (e) => {
                    e.stopPropagation();
                    const btn = e.currentTarget;
                    btn.disabled = true;
                    btn.innerHTML = "Carregando...";
                    for (const h of HOLIDAYS_2026) {
                      await addDoc(collection(db, 'holidays'), h);
                    }
                    btn.innerHTML = "Feriados Carregados!";
                  }}
                  className="text-[10px] bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded text-white font-bold underline print:hidden"
                >
                  Carregar Feriados 2026
                </button>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            {isAdmin && isEditing && (
              <>
                <Button variant="secondary" onClick={recalculateDates} className="flex-1 sm:flex-none bg-white/10 hover:bg-white/20 border-white/20 text-white text-xs sm:text-sm print:hidden">
                  <Calendar className="w-4 h-4 mr-2" /> Ajustar Datas
                </Button>
                <Button variant="secondary" onClick={() => setEditedClasses(classes)} className="flex-1 sm:flex-none bg-white/10 hover:bg-white/20 border-white/20 text-white text-xs sm:text-sm print:hidden">
                  <RotateCcw className="w-4 h-4 mr-2" /> Desfazer
                </Button>
              </>
            )}
            {isAdmin && !isEditing && (
              <>
                <Button variant="secondary" onClick={handleExportPDF} className="flex-1 sm:flex-none bg-white/10 hover:bg-white/20 border-white/20 text-white text-xs sm:text-sm print:hidden">
                  <FileText className="w-4 h-4 mr-2" /> Exportar PDF
                </Button>
                <Button variant="secondary" onClick={() => setIsEditing(true)} className="flex-1 sm:flex-none bg-white/10 hover:bg-white/20 border-white/20 text-white text-xs sm:text-sm print:hidden">
                  <Edit className="w-4 h-4 mr-2" /> Editar
                </Button>
              </>
            )}
            <button onClick={onClose} className="text-white/80 hover:text-white ml-auto sm:ml-0 print:hidden">
              <Plus className="w-6 h-6 rotate-45" />
            </button>
          </div>
        </div>

        <div id="schedule-content" className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-8 bg-gray-50 print:overflow-visible print:h-auto print:bg-white print:p-0">
          <div className="hidden print:block mb-8 border-b-2 border-indigo-600 pb-4">
            <h1 className="text-3xl font-bold text-indigo-900">Cronograma de Aulas</h1>
            <div className="mt-2 grid grid-cols-2 gap-4 text-sm text-gray-600">
              <p><span className="font-bold">Data de Início:</span> {format(parseISO(schedule.startDate), 'dd/MM/yyyy')}</p>
              <p><span className="font-bold">Emitido em:</span> {format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
            </div>
          </div>
          {loading ? (
            <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={sortedOrders} strategy={verticalListSortingStrategy}>
                <div className="space-y-4">
                  {sortedOrders.map((order) => {
                    const classGroup = groupedByOrder[order];
                    const firstClass = classGroup[0];
                    const isCommon = firstClass.isCommon;
                    const dates = Array.from(new Set(classGroup.map((c: any) => c.date))).sort() as string[];
                    
                    return (
                      <SortableItem key={order} id={order}>
                        <Card className={`overflow-hidden border-none shadow-md break-inside-avoid ${isEditing ? 'ring-2 ring-indigo-100' : ''}`}>
                          <div className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 ${isCommon ? 'bg-indigo-50/50' : 'bg-white'}`}>
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${isCommon ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>
                                  {isCommon ? 'Fase Comum' : 'Fase Específica'}
                                </span>
                                <span className="text-xs font-bold text-gray-400">Posição {order}</span>
                              </div>
                              
                              <div className="space-y-4">
                                {Object.entries(classGroup.reduce((acc: any, c: any) => {
                                  const key = c.isCommon ? 'common' : c.courseId;
                                  if (!acc[key]) acc[key] = c;
                                  return acc;
                                }, {})).map(([key, c]: [string, any]) => (
                                  <div key={key} className={`p-3 rounded-lg border ${c.isCommon ? 'bg-indigo-50/30 border-indigo-100' : 'bg-amber-50/30 border-amber-100'}`}>
                                    <div className="flex items-center justify-between mb-2">
                                      <span className={`text-[10px] font-bold uppercase ${c.isCommon ? 'text-indigo-600' : 'text-amber-600'}`}>
                                        {c.isCommon ? 'Fase Comum' : c.courseName}
                                      </span>
                                      {isEditing && classGroup.length > 1 && (
                                        <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          className="h-6 text-[10px] text-gray-400 hover:text-red-500"
                                          onClick={() => {
                                            const maxOrder = Math.max(...editedClasses.map((cl: any) => cl.order));
                                            const newOrder = maxOrder + 1;
                                            setEditedClasses(prev => prev.map(cl => 
                                              (cl.order === order && (c.isCommon ? cl.isCommon : cl.courseId === c.courseId)) 
                                              ? { ...cl, order: newOrder } 
                                              : cl
                                            ));
                                          }}
                                        >
                                          Mover para nova posição
                                        </Button>
                                      )}
                                    </div>
                                    
                                    {isEditing ? (
                                      <Input 
                                        value={c.disciplineName} 
                                        onChange={(e: any) => updateClassField(order, 'disciplineName', e.target.value, c.isCommon ? undefined : c.courseId)}
                                        className="bg-white"
                                      />
                                    ) : (
                                      <h3 className="font-bold text-gray-900 leading-tight">{c.disciplineName}</h3>
                                    )}
                                  </div>
                                ))}
                                
                                <div className="grid grid-cols-1 xs:grid-cols-2 gap-2">
                                  {dates.map((d, idx) => (
                                    <div key={idx} className="text-[10px] font-medium text-gray-500 bg-gray-100 p-1.5 rounded flex items-center gap-2">
                                      <Calendar className="w-3 h-3" /> {format(parseISO(d), 'dd/MM/yyyy')}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>

                            <div className="w-full md:w-72 space-y-2">
                              <p className="text-[10px] font-bold text-gray-400 uppercase">Professor Responsável</p>
                              <div className="space-y-4">
                                {Object.entries(classGroup.reduce((acc: any, c: any) => {
                                  const key = c.isCommon ? 'common' : c.courseId;
                                  if (!acc[key]) acc[key] = c;
                                  return acc;
                                }, {})).map(([key, c]: [string, any]) => (
                                  <div key={key} className="space-y-2">
                                    {isEditing ? (
                                      <div className="space-y-1 p-2 bg-gray-50 rounded border border-gray-200">
                                        <p className="text-[9px] font-bold text-gray-400 uppercase">{c.isCommon ? 'Fase Comum' : c.courseName?.split(' ')[0]}</p>
                                        <Select 
                                          value={c.teacherId} 
                                          onChange={(e: any) => updateClassField(order, 'teacherId', e.target.value, c.isCommon ? undefined : c.courseId)}
                                          className="h-8 text-xs"
                                        >
                                          <option value="">Selecione um Professor</option>
                                          {(teachers || [])
                                            .filter((t: any) => t.specialties?.some((s: any) => s.disciplineName === c.disciplineName))
                                            .map((t: any) => (
                                              <option key={t.id} value={t.id}>{t.name}</option>
                                            ))}
                                        </Select>
                                        {dates.map(date => {
                                          const conflict = getConflict(c.teacherId, date, c);
                                          if (conflict) return (
                                            <div key={date} className="text-[8px] text-red-500 font-bold flex items-center gap-1">
                                              <AlertTriangle className="w-2 h-2" /> Conflito {format(parseISO(date), 'dd/MM')}
                                            </div>
                                          );
                                          return null;
                                        })}
                                      </div>
                                    ) : (
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-2 p-1.5 bg-white rounded border border-gray-100">
                                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${c.isCommon ? 'bg-indigo-100 text-indigo-600' : 'bg-amber-100 text-amber-600'}`}>
                                            {teachers.find((t: any) => t.id === c.teacherId)?.name?.[0] || '?'}
                                          </div>
                                          <div className="flex flex-col min-w-0">
                                            <p className="text-[8px] text-gray-400 font-bold uppercase leading-none">{c.isCommon ? 'Fase Comum' : c.courseName}</p>
                                            <p className="text-[11px] font-medium text-gray-700 leading-tight">
                                              {teachers.find((t: any) => t.id === c.teacherId)?.name || 'Não atribuído'}
                                            </p>
                                          </div>
                                        </div>
                                        {dates.map(date => {
                                          const conflict = getConflict(c.teacherId, date, c);
                                          if (conflict) return (
                                            <div key={date} className="text-[8px] text-red-500 font-bold flex items-center gap-1 pl-1">
                                              <AlertTriangle className="w-2 h-2" /> Conflito {format(parseISO(date), 'dd/MM')}
                                            </div>
                                          );
                                          return null;
                                        })}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                          
                          {!isEditing && (
                            <div className="p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 bg-gray-50/30 border-t border-gray-100">
                              {classGroup.sort((a: any, b: any) => a.date.localeCompare(b.date)).map((c: any) => (
                                <div key={c.id} className="text-[10px] flex flex-col">
                                  <span className="text-gray-400 font-bold uppercase">Aula {c.classNumber}</span>
                                  <span className="font-bold text-gray-700">{format(parseISO(c.date), 'dd/MM')} - {c.courseName?.split(' ')[0] || 'Comum'}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </Card>
                      </SortableItem>
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          )}
          <div className="hidden print:block mt-12 pt-8 border-t border-gray-200 text-center text-xs text-gray-400">
            <p>Este documento é um cronograma oficial da pós-graduação Esuda.</p>
            <p className="mt-1">© {new Date().getFullYear()} Esuda Acadêmico - Todos os direitos reservados.</p>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 bg-white flex justify-between items-center print:hidden">
          {isAdmin && (
            <Button variant="secondary" onClick={() => setShowDeleteConfirm(true)} className="text-red-600 hover:bg-red-50 border-red-100 print:hidden">
              <Trash2 className="w-4 h-4 mr-2" /> Excluir Cronograma
            </Button>
          )}
          <div className="flex gap-3 print:hidden">
            <Button variant="secondary" onClick={onClose} className="print:hidden">Fechar</Button>
            {isEditing && (
              <Button onClick={handleSave} disabled={saving} className="print:hidden">
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            )}
          </div>
        </div>

        <div className="hidden print:block p-8 border-t border-gray-200 text-center text-[10px] text-gray-400">
          <p>Este documento é um cronograma oficial gerado pelo Sistema de Gestão de Cursos.</p>
          <p>© {new Date().getFullYear()} - Todos os direitos reservados.</p>
        </div>

        <ConfirmationModal 
          isOpen={showDeleteConfirm}
          title="Excluir Cronograma"
          message="Deseja excluir este cronograma e todas as suas aulas? Esta ação não pode ser desfeita."
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
          loading={isDeleting}
        />
      </motion.div>
    </div>
  );
}

// Helper function for generating schedule with specific order
function generateFullScheduleWithOrder(
  startDateStr: string,
  coursesData: { id: string, name: string, disciplines: string[] }[],
  commonDisciplines: { name: string, modality: string }[],
  holidays: Holiday[]
) {
  const startDate = parseISO(startDateStr);
  const schedule: any[] = [];
  let currentSaturday = getNextAvailableSaturday(startDate, holidays);

  // 1. Common Disciplines
  for (let i = 0; i < commonDisciplines.length; i++) {
    const discipline = commonDisciplines[i];
    
    // First Saturday
    schedule.push({
      date: format(currentSaturday, 'yyyy-MM-dd'),
      disciplineName: discipline.name,
      order: i + 1,
      isCommon: true,
      courseId: 'all',
      courseName: 'Fase Comum'
    });

    currentSaturday = getNextAvailableSaturday(addDays(currentSaturday, 7), holidays);
    
    // Second Saturday
    schedule.push({
      date: format(currentSaturday, 'yyyy-MM-dd'),
      disciplineName: discipline.name,
      order: i + 1,
      isCommon: true,
      courseId: 'all',
      courseName: 'Fase Comum'
    });

    currentSaturday = getNextAvailableSaturday(addDays(currentSaturday, 7), holidays);
  }

  // 2. Specific Disciplines
  const specificSchedules: Record<string, any[]> = {};
  coursesData.forEach(course => {
    specificSchedules[course.id] = [];
    let courseSaturday = currentSaturday;
    const disciplines = course.disciplines;

    for (let i = 0; i < disciplines.length; i++) {
      const disciplineName = disciplines[i];
      
      // First Saturday
      specificSchedules[course.id].push({
        date: format(courseSaturday, 'yyyy-MM-dd'),
        disciplineName: disciplineName,
        order: i + 10,
        isCommon: false,
        courseId: course.id,
        courseName: course.name
      });

      courseSaturday = getNextAvailableSaturday(addDays(courseSaturday, 7), holidays);

      // Second Saturday
      specificSchedules[course.id].push({
        date: format(courseSaturday, 'yyyy-MM-dd'),
        disciplineName: disciplineName,
        order: i + 10,
        isCommon: false,
        courseId: course.id,
        courseName: course.name
      });

      courseSaturday = getNextAvailableSaturday(addDays(courseSaturday, 7), holidays);
    }
  });

  return {
    common: schedule,
    specific: specificSchedules
  };
}
