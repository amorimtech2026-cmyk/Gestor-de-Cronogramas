'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, 
  RotateCcw, 
  Edit, 
  Plus, 
  Trash2, 
  FileText, 
  AlertTriangle, 
  AlertCircle,
  LayoutDashboard,
  ChevronLeft,
  Save,
  Link,
  Copy,
  Globe,
  EyeOff,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  getDocs, 
  deleteDoc, 
  doc, 
  updateDoc,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors 
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy 
} from '@dnd-kit/sortable';
import { format, parseISO, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Image from 'next/image';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { HOLIDAYS_2026, getNextAvailableSaturday } from '@/lib/calendar';
import { syncTeacherAssignments } from '@/lib/sync';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Card } from '../ui/Card';
import { SortableItem } from '../ui/SortableItem';
import { ConfirmationModal } from '../ui/ConfirmationModal';

interface ScheduleDetailsModalProps {
  schedule: any;
  courses: any[];
  teachers: any[];
  isAdmin: boolean;
  onClose: () => void;
  holidays: any[];
}

export function ScheduleDetailsModal({ schedule, courses, teachers, isAdmin, onClose, holidays }: ScheduleDetailsModalProps) {
  const [classes, setClasses] = useState<any[]>([]);
  const [allOtherClasses, setAllOtherClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editedClasses, setEditedClasses] = useState<any[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [copying, setCopying] = useState(false);
  const [editedClassName, setEditedClassName] = useState(schedule.className || '');
  const [editedStartDate, setEditedStartDate] = useState(schedule.startDate || '');
  const [printMode, setPrintMode] = useState<'standard' | 'executive'>('standard');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const q = query(collection(db, 'classes'), where('scheduleId', '==', schedule.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort in memory by date to ensure all classes are fetched even if date is missing
      const sortedData = [...data].sort((a: any, b: any) => {
        if (!a.date) return 1;
        if (!b.date) return -1;
        return a.date.localeCompare(b.date);
      });
      setClasses(sortedData);
      
      // Only update editedClasses if NOT currently editing to avoid losing unsaved changes
      if (!isEditing) {
        setEditedClasses(sortedData);
        setEditedClassName(schedule.className || '');
        setEditedStartDate(schedule.startDate || '');
      }
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
  }, [schedule.id, schedule.startDate, schedule.className, isEditing]);

  const handleTogglePublish = async () => {
    setPublishing(true);
    try {
      const newStatus = schedule.status === 'active' ? 'draft' : 'active';
      await updateDoc(doc(db, 'schedules', schedule.id), {
        status: newStatus
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'schedules');
    } finally {
      setPublishing(false);
    }
  };

  const handleCopyLink = () => {
    setCopying(true);
    const url = `${window.location.origin}?schedule=${schedule.id}`;
    navigator.clipboard.writeText(url);
    setTimeout(() => setCopying(false), 2000);
  };

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      await syncTeacherAssignments();
      // The onSnapshot will update the local state automatically
    } catch (e) {
      console.error("Error syncing:", e);
    } finally {
      setSyncing(false);
    }
  };

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
          classNumber: c.classNumber || 1,
          observation: c.observation || ''
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

      // Update schedule lastUpdated and metadata
      const scheduleCourseNames = schedule.courseIds.map((cid: string) => {
        const course = courses.find((co: any) => co.id === cid);
        if (course) return course.name;
        // Try to find in editedClasses
        const classWithCourse = editedClasses.find(c => c.courseId === cid && c.courseName);
        if (classWithCourse) return classWithCourse.courseName;
        return cid;
      });

      await updateDoc(doc(db, 'schedules', schedule.id), {
        lastUpdated: serverTimestamp(),
        className: editedClassName,
        startDate: editedStartDate,
        courseNames: scheduleCourseNames
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
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
    
    // Start from the edited start date
    let currentSat = getNextAvailableSaturday(parseISO(editedStartDate), holidays);
    
    const orderDates = new Map();
    sortedOrders.forEach(order => {
      const classesInThisOrder = editedClasses.filter(c => c.order === order);
      
      // Check the max classNumber in this order to decide if it needs 1 or 2 Saturdays
      const maxClassNumber = Math.max(...classesInThisOrder.map(c => c.classNumber || 1));
      
      const date1 = format(currentSat, 'yyyy-MM-dd');
      if (maxClassNumber === 1) {
        orderDates.set(order, [date1]);
        currentSat = getNextAvailableSaturday(addDays(currentSat, 7), holidays);
      } else {
        currentSat = getNextAvailableSaturday(addDays(currentSat, 7), holidays);
        const date2 = format(currentSat, 'yyyy-MM-dd');
        currentSat = getNextAvailableSaturday(addDays(currentSat, 7), holidays);
        orderDates.set(order, [date1, date2]);
      }
    });

    const updatedClasses = editedClasses.map(c => {
      const dates = orderDates.get(c.order);
      if (!dates) return c;

      // Find the position of this class within its order/course group to determine classNumber if missing
      const courseClasses = editedClasses
        .filter(oc => oc.order === c.order && oc.courseId === c.courseId)
        .sort((a, b) => {
          if (a.classNumber && b.classNumber) return a.classNumber - b.classNumber;
          return a.date.localeCompare(b.date);
        });
      
      const index = courseClasses.findIndex(oc => oc.id === c.id);
      const classNum = c.classNumber || (index + 1);

      const dateIndex = (classNum - 1);
      return { 
        ...c, 
        date: dates[dateIndex] || dates[dates.length - 1],
        classNumber: classNum
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
    if (active && over && active.id !== over.id) {
      const activeId = Number(active.id);
      const overId = Number(over.id);
      
      const orders = Array.from(new Set(editedClasses.map(c => c.order))).sort((a, b) => a - b);
      const oldIndex = orders.indexOf(activeId);
      const newIndex = orders.indexOf(overId);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrderSequence = arrayMove(orders, oldIndex, newIndex);

        // Recalculate dates based on new order and edited start date
        let currentSat = getNextAvailableSaturday(parseISO(editedStartDate), holidays);
        const updatedClasses = [...editedClasses];

        newOrderSequence.forEach((orderValue) => {
          const classesInThisOrder = updatedClasses.filter(c => c.order === orderValue);
          
          // Each order has 2 dates (Sat 1 and Sat 2) unless it's a single session event
          // We need to handle single session events (Aula Inaugural, Encerramento)
          const isSingleSession = classesInThisOrder.length === 1;
          
          const date1 = format(currentSat, 'yyyy-MM-dd');
          
          if (isSingleSession) {
            classesInThisOrder[0].date = date1;
            currentSat = getNextAvailableSaturday(addDays(currentSat, 7), holidays);
          } else {
            currentSat = getNextAvailableSaturday(addDays(currentSat, 7), holidays);
            const date2 = format(currentSat, 'yyyy-MM-dd');
            currentSat = getNextAvailableSaturday(addDays(currentSat, 7), holidays);

            classesInThisOrder.forEach(c => {
              // Find which class number it is (1 or 2)
              const sortedGroup = updatedClasses
                .filter(oc => oc.order === orderValue && oc.courseId === c.courseId)
                .sort((a, b) => {
                  if (a.classNumber && b.classNumber) return a.classNumber - b.classNumber;
                  return a.date.localeCompare(b.date);
                });
              const isFirst = sortedGroup[0].id === c.id;
              c.date = isFirst ? date1 : date2;
            });
          }
        });

        // Update order values to match the new sequence (1-indexed for simplicity, but keeping 0 for inaugural if it's at top)
        const orderMap = new Map();
        newOrderSequence.forEach((oldOrder, idx) => {
          orderMap.set(oldOrder, idx); // Using 0-based index for internal order
        });

        updatedClasses.forEach(c => {
          if (orderMap.has(c.order)) {
            c.order = orderMap.get(c.order);
          }
        });

        setEditedClasses(updatedClasses);
      }
    }
  };

  const getConflict = (teacherId: string, date: string, currentClass: any) => {
    if (!teacherId) return null;
    
    const localConflict = editedClasses.find(c => 
      c.teacherId === teacherId && 
      c.date === date && 
      c.id !== currentClass.id &&
      !(c.order === currentClass.order && (c.isCommon ? currentClass.isCommon : c.courseId === currentClass.courseId))
    );
    if (localConflict) return { type: 'local', info: localConflict.disciplineName };

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

  const deleteClassOrder = (order: number) => {
    setEditedClasses(prev => prev.filter(c => c.order !== order));
  };

  useEffect(() => {
    const handleAfterPrint = () => {
      // No need to reset printMode immediately, but good for cleanup if needed
    };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  const handleExportPDF = () => {
    setPrintMode('standard');
    setTimeout(() => window.print(), 300);
  };

  const handleExportExecutivePDF = () => {
    setPrintMode('executive');
    setTimeout(() => window.print(), 300);
  };

  // Group by order for the sequence view
  const groupedByOrder = editedClasses.reduce((acc: any, c: any) => {
    const orderKey = c.order || 0;
    if (!acc[orderKey]) acc[orderKey] = [];
    acc[orderKey].push(c);
    return acc;
  }, {});

  const sortedOrders = Object.keys(groupedByOrder)
    .map(Number)
    .sort((a, b) => a - b);

  const hasUnsavedChanges = JSON.stringify(editedClasses) !== JSON.stringify(classes);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 print:bg-white print:p-0 print:static print:block print:overflow-visible">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl w-full max-w-5xl h-[92vh] sm:h-[90vh] overflow-hidden flex flex-col shadow-2xl print-modal relative print:h-auto print:overflow-visible print:shadow-none print:rounded-none print:static print:block"
      >
        {/* Floating Save Notification for Mobile */}
        <AnimatePresence>
          {hasUnsavedChanges && isEditing && (
            <motion.div 
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="fixed bottom-20 left-4 right-4 z-[110] sm:hidden"
            >
              <div className="bg-amber-500 text-white p-4 rounded-2xl shadow-lg flex justify-between items-center border border-amber-400">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-bold text-sm">Alterações não salvas!</span>
                </div>
                <Button size="sm" onClick={handleSave} disabled={saving} className="bg-white text-amber-600 hover:bg-amber-50 border-none">
                  {saving ? <RotateCcw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span className="ml-2">Salvar Agora</span>
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="p-4 sm:p-8 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#0f172a] text-white shrink-0 no-print">
          <div className="w-full sm:w-auto">
            <div className="flex justify-between items-center sm:block">
              {isEditing ? (
                <input 
                  value={editedClassName} 
                  onChange={(e) => setEditedClassName(e.target.value)}
                  className="bg-slate-800 text-white border-b border-slate-600 outline-none px-2 py-1 text-xl sm:text-3xl font-black w-full rounded"
                  placeholder="Nome da Turma"
                />
              ) : (
                <h2 className="text-xl sm:text-3xl font-black tracking-tighter uppercase leading-none">{schedule.className}</h2>
              )}
              <button onClick={onClose} className="sm:hidden text-white/80 hover:text-white">
                <Plus className="w-8 h-8 rotate-45" />
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <div className="text-slate-400 text-[10px] sm:text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                <span>Início:</span>
                {isEditing ? (
                  <input 
                    type="date"
                    value={editedStartDate}
                    onChange={(e) => setEditedStartDate(e.target.value)}
                    className="bg-slate-800 text-white border-b border-slate-600 outline-none px-2 py-0.5 rounded"
                  />
                ) : (
                  <span>{format(parseISO(schedule.startDate), 'dd/MM/yyyy')}</span>
                )}
                {schedule.lastUpdated && !isEditing && (
                  <span className="ml-2 opacity-60 italic text-[9px] sm:text-[10px]">
                    (Sinc: {format(schedule.lastUpdated.toDate(), 'HH:mm')})
                  </span>
                )}
              </div>
              <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest border ${holidays.length > 0 ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                {holidays.length} Feriados
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {isAdmin && isEditing && hasUnsavedChanges && (
              <div className="flex items-center gap-1 text-amber-500 text-[10px] font-black uppercase tracking-widest animate-pulse mr-auto sm:mr-4">
                <AlertTriangle className="w-4 h-4" /> Pendente
              </div>
            )}

            {isAdmin && isEditing && saveSuccess && (
              <div className="flex items-center gap-1 text-green-400 text-[10px] font-black uppercase tracking-widest mr-auto sm:mr-4">
                <CheckCircle2 className="w-4 h-4" /> Salvo!
              </div>
            )}
            
            {isAdmin && !isEditing && (
              <>
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={handleManualSync} 
                  disabled={syncing}
                  className="h-10 px-4 bg-slate-800 hover:bg-slate-700 border-slate-700 text-white text-[10px] sm:text-xs font-black uppercase tracking-widest"
                >
                  <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                  <span className="ml-2 hidden xs:inline">Sincronizar</span>
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={handleTogglePublish} 
                  disabled={publishing}
                  className={`h-10 px-4 bg-slate-800 hover:bg-slate-700 border-slate-700 text-white text-[10px] sm:text-xs font-black uppercase tracking-widest ${schedule.status === 'active' ? 'text-green-400' : 'text-amber-500'}`}
                >
                  {publishing ? <RotateCcw className="w-4 h-4 animate-spin" /> : schedule.status === 'active' ? <EyeOff className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                  <span className="ml-2 hidden xs:inline">{schedule.status === 'active' ? 'Desativar' : 'Publicar'}</span>
                </Button>
              </>
            )}
            
            {isAdmin && isEditing && (
              <>
                <Button variant="secondary" size="sm" onClick={recalculateDates} className="h-10 px-4 bg-slate-800 hover:bg-slate-700 border-slate-700 text-white text-[10px] sm:text-xs font-black uppercase tracking-widest">
                  <Calendar className="w-4 h-4 mr-2" /> <span className="hidden xs:inline">Ajustar Datas</span>
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setEditedClasses(classes)} className="h-10 px-4 bg-slate-800 hover:bg-slate-700 border-slate-700 text-white text-[10px] sm:text-xs font-black uppercase tracking-widest">
                  <RotateCcw className="w-4 h-4 mr-2" /> <span className="hidden xs:inline">Desfazer</span>
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving} className="h-10 px-6 bg-amber-500 text-slate-900 hover:bg-amber-600 border-none text-[10px] sm:text-xs font-black uppercase tracking-widest shadow-2xl sm:hidden">
                  {saving ? '...' : 'Salvar'}
                </Button>
              </>
            )}
            
            {!isEditing && isAdmin && (
              <>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={handleExportExecutivePDF} 
                  className="h-10 px-4 bg-indigo-600 text-white hover:bg-indigo-700 border-none text-[10px] sm:text-xs font-black uppercase tracking-widest shadow-2xl"
                >
                  <FileText className="w-4 h-4 mr-2" /> <span className="hidden xs:inline">Cronograma Executivo</span><span className="xs:hidden">Executivo</span>
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={handleExportPDF} 
                  className="h-10 px-4 bg-amber-500 text-slate-900 hover:bg-amber-600 border-none text-[10px] sm:text-xs font-black uppercase tracking-widest shadow-2xl"
                >
                  <FileText className="w-4 h-4 mr-2" /> <span className="hidden xs:inline">Gerar PDF</span><span className="xs:hidden">PDF</span>
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)} className="h-10 px-4 bg-slate-800 hover:bg-slate-700 border-slate-700 text-white text-[10px] sm:text-xs font-black uppercase tracking-widest">
                  <Edit className="w-4 h-4 mr-2" /> <span className="hidden xs:inline">Editar</span>
                </Button>
              </>
            )}

            <button onClick={onClose} className="hidden sm:block text-white/80 hover:text-white ml-4">
              <Plus className="w-8 h-8 rotate-45" />
            </button>
          </div>
        </div>

        <div id="schedule-content" className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-8 space-y-10 bg-slate-50 print:overflow-visible print:h-auto print:bg-white print:p-0 print:min-h-auto">
          {/* Standard Print Table */}
          <div id="print-table-content" className={`${printMode === 'standard' ? 'print-show' : 'print:hidden'} hidden bg-white text-black font-sans`}>
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
                <p><span className="font-black uppercase text-slate-400 tracking-tighter mr-2">Turma:</span> <span className="font-bold text-slate-900">{schedule.className}</span></p>
                <p><span className="font-black uppercase text-slate-400 tracking-tighter mr-2">Início:</span> <span className="font-bold text-slate-900">{schedule.startDate ? format(new Date(schedule.startDate + 'T12:00:00'), 'dd/MM/yyyy') : 'A definir'}</span></p>
                <p><span className="font-black uppercase text-slate-400 tracking-tighter mr-2">Local:</span> <span className="font-bold text-slate-900">Recife/PE</span></p>
                <p><span className="font-black uppercase text-slate-400 tracking-tighter mr-2">Status:</span> <span className="font-bold text-slate-900">Turma Confirmada</span></p>
              </div>
            </div>

            <table className="w-full border-collapse border border-slate-300 text-[10px]">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="border border-slate-300 p-3 text-left w-24 uppercase tracking-widest font-black">Data</th>
                  <th className="border border-slate-300 p-3 text-left uppercase tracking-widest font-black">Disciplina</th>
                  <th className="border border-slate-300 p-3 text-left w-48 uppercase tracking-widest font-black">Professor</th>
                  <th className="border border-slate-300 p-3 text-left w-32 uppercase tracking-widest font-black">Curso/Fase</th>
                </tr>
              </thead>
              <tbody>
                {editedClasses.sort((a, b) => a.date.localeCompare(b.date)).map((c: any, idx: number) => (
                  <tr key={c.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="border border-slate-300 p-3 font-bold text-slate-900">
                      {c.date ? format(parseISO(c.date), 'dd/MM/yyyy') : 'A definir'}
                    </td>
                    <td className="border border-slate-300 p-3">
                      <div className="font-black text-slate-900 uppercase tracking-tight">{c.disciplineName}</div>
                    </td>
                    <td className="border border-slate-300 p-3">
                      <div className="font-bold text-slate-700">{teachers.find((t: any) => t.id === c.teacherId)?.name || 'A definir'}</div>
                    </td>
                    <td className="border border-slate-300 p-3 text-[9px] font-black uppercase tracking-tighter text-slate-400">
                      {c.isCommon ? 'Fase Comum' : c.courseName}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-16 pt-10 border-t border-slate-200 text-center text-[9px] text-slate-400 font-black uppercase tracking-[0.3em]">
              <p>Documento Oficial - Pós-Graduação Faculdade Esuda</p>
              <p className="mt-2">© {new Date().getFullYear()} Esuda Acadêmico - Excelência em Educação</p>
            </div>
          </div>

          <div id="executive-print-content" className={`${printMode === 'executive' ? 'print-show' : 'print:hidden'} hidden bg-slate-50 text-slate-900 font-sans p-12 min-h-screen print:h-auto print:min-h-0 print:bg-white print:p-8`}>
            <div className="mb-12 border-b-8 border-slate-900 pb-10">
              <div className="flex justify-between items-end">
                <div className="space-y-4">
                  <h1 className="text-5xl font-black tracking-tighter text-slate-900 uppercase leading-none">
                    Cronograma <span className="text-amber-500">Executivo</span>
                  </h1>
                  <p className="text-xs font-black uppercase tracking-[0.4em] text-slate-400">Pós-Graduação Faculdade Esuda</p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Documento de Planejamento</p>
                  <p className="text-sm font-bold uppercase">{format(new Date(), 'MMMM yyyy', { locale: ptBR })}</p>
                </div>
              </div>
              
              <div className="mt-12 grid grid-cols-3 gap-12 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Turma</p>
                  <p className="text-xl font-black text-slate-900 uppercase tracking-tighter">{schedule.className}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Data de Início</p>
                  <p className="text-xl font-black text-slate-900 uppercase tracking-tighter">{schedule.startDate ? format(new Date(schedule.startDate + 'T12:00:00'), 'dd/MM/yyyy') : 'A definir'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</p>
                  <p className="text-xl font-black text-amber-600 uppercase tracking-tighter">Turma Confirmada</p>
                </div>
              </div>

              <div className="mt-10 pt-8 border-t border-slate-200">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Cursos Integrados</p>
                <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                  {(schedule.courseNames || []).map((name: string, i: number) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-slate-900 rounded-full shrink-0"></div>
                      <span className="text-[9px] font-black uppercase tracking-tight text-slate-700 leading-tight">
                        {name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Grid of Cards (Balloons) - Matching Public Interface */}
            <div className="grid grid-cols-3 gap-4">
              {(() => {
                const sortedClasses = [...editedClasses].sort((a, b) => a.date.localeCompare(b.date));
                if (sortedClasses.length === 0) return null;
                
                const firstDate = sortedClasses[0].date;
                const lastDate = sortedClasses[sortedClasses.length - 1].date;
                
                const relevantHolidays = holidays.filter(h => h.date >= firstDate && h.date <= lastDate);
                
                const classGroups = sortedClasses.reduce((acc: any, c: any) => {
                  const key = c.isCommon ? `common-${c.order}-${c.disciplineName}` : `${c.courseId}-${c.order}-${c.disciplineName}`;
                  if (!acc[key]) {
                    acc[key] = { ...c, dates: [c.date], type: 'class' };
                  } else {
                    acc[key].dates.push(c.date);
                  }
                  return acc;
                }, {});

                const mergedItems = [
                  ...Object.values(classGroups),
                  ...relevantHolidays.map(h => ({ ...h, type: 'holiday', dates: [h.date] }))
                ].sort((a: any, b: any) => a.dates[0].localeCompare(b.dates[0]));

                return mergedItems.map((item: any, idx) => {
                  if (item.type === 'holiday') {
                    return (
                      <div key={`holiday-${idx}`} className="p-4 rounded-xl border bg-red-50 border-red-100 shadow-sm break-inside-avoid page-break-inside-avoid">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xl font-black text-slate-900">
                            {format(parseISO(item.date), 'dd/MM')}
                          </span>
                          <span className="text-[8px] font-black text-red-400 uppercase tracking-widest">
                            {format(parseISO(item.date), 'EEEE', { locale: ptBR })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-red-600">
                          <AlertCircle className="w-3 h-3" />
                          <span className="text-[9px] font-black uppercase tracking-tight">FERIADO: {item.name || item.description}</span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={`class-${idx}`} className="p-4 rounded-xl border bg-white border-slate-200 shadow-sm flex flex-col break-inside-avoid page-break-inside-avoid">
                      <div className="flex flex-wrap gap-x-2 gap-y-1 items-start mb-3">
                        {item.dates.sort().map((d: string, dIdx: number) => (
                          <div key={`${d}-${dIdx}`} className="flex items-center gap-1">
                            <span className="text-xl font-black text-slate-900">
                              {format(parseISO(d), 'dd/MM')}
                            </span>
                            {dIdx < item.dates.length - 1 && <span className="text-slate-300 font-black">&</span>}
                          </div>
                        ))}
                      </div>

                      <div className="space-y-2 flex-1">
                        <div>
                          <p className="text-[8px] font-black text-amber-600 uppercase tracking-[0.2em] mb-1">
                            {item.isCommon ? 'Tronco Comum' : (item.courseName || 'Eixo Específico')}
                          </p>
                          <p className="text-xs font-black text-slate-800 leading-tight uppercase tracking-tight">{item.disciplineName}</p>
                          {item.observation && (
                            <p className="text-[9px] text-slate-500 mt-2 font-medium italic border-l-2 border-slate-100 pl-2">
                              {item.observation}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            <div className="mt-20 flex justify-between items-center pt-10 border-t-4 border-slate-900">
              <div className="space-y-1">
                <p className="text-xs font-black uppercase tracking-widest text-slate-900">Faculdade Esuda</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Excelência em Pós-Graduação</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest italic">Planejamento Acadêmico Sujeito a Ajustes</p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center p-12 no-print"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
          ) : (
            <div className="no-print">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={sortedOrders.map(String)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-4">
                    {sortedOrders.map((order) => {
                      const classGroup = groupedByOrder[order];
                      const firstClass = classGroup[0];
                      const isCommon = firstClass.isCommon;
                      
                      const courseGroups = classGroup.reduce((acc: any, c: any) => {
                        const key = c.isCommon ? `common-${c.disciplineName}` : `${c.courseId}-${c.disciplineName}`;
                        if (!acc[key]) acc[key] = { ...c, allDates: [] };
                        if (!acc[key].allDates.includes(c.date)) {
                          acc[key].allDates.push(c.date);
                        }
                        return acc;
                      }, {});

                      const sortedCourseGroups = Object.values(courseGroups).sort((a: any, b: any) => {
                        if (a.isCommon && !b.isCommon) return -1;
                        if (!a.isCommon && b.isCommon) return 1;
                        return (a.courseName || '').localeCompare(b.courseName || '');
                      });
                      
                      return (
                        <SortableItem key={order} id={String(order)}>
                          <Card className={`overflow-hidden border-none shadow-md break-inside-avoid ${isEditing ? 'ring-2 ring-indigo-100' : ''}`}>
                            <div className={`p-4 flex flex-col md:flex-row md:items-start justify-between gap-6 ${isCommon ? 'bg-indigo-50/50' : 'bg-white'}`}>
                              <div className="flex-1 space-y-4">
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${isCommon ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {isCommon ? 'Fase Comum' : 'Fase Específica'}
                                  </span>
                                  <span className="text-xs font-bold text-gray-400">Posição {order}</span>
                                  {isEditing && (
                                    <button 
                                      onClick={() => deleteClassOrder(order)}
                                      className="p-1 text-red-400 hover:text-red-600 transition-colors ml-2"
                                      title="Excluir esta disciplina/evento"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                                
                                <div className="space-y-4 pr-2">
                                  {sortedCourseGroups.map((c: any) => (
                                    <div key={c.isCommon ? `common-${c.disciplineName}` : `${c.courseId}-${c.disciplineName}`} className={`p-4 rounded-xl border ${c.isCommon ? 'bg-indigo-50/30 border-indigo-100' : 'bg-amber-50/30 border-amber-100'}`}>
                                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="space-y-1 flex-1">
                                          <span className={`text-[10px] font-bold uppercase ${c.isCommon ? 'text-indigo-600' : 'text-amber-600'}`}>
                                            {c.isCommon ? 'Fase Comum' : c.courseName}
                                          </span>
                                          {isEditing ? (
                                            <div className="space-y-2">
                                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                <Input 
                                                  label="Disciplina/Evento"
                                                  value={c.disciplineName} 
                                                  onChange={(e: any) => updateClassField(order, 'disciplineName', e.target.value, c.isCommon ? undefined : c.courseId)}
                                                  className="bg-white"
                                                />
                                                <Input 
                                                  label="Data"
                                                  type="date"
                                                  value={c.date} 
                                                  onChange={(e: any) => updateClassField(order, 'date', e.target.value, c.isCommon ? undefined : c.courseId)}
                                                  className="bg-white"
                                                />
                                              </div>
                                              <Input 
                                                label="Observação (Opcional)"
                                                value={c.observation || ''} 
                                                onChange={(e: any) => updateClassField(order, 'observation', e.target.value, c.isCommon ? undefined : c.courseId)}
                                                className="bg-white"
                                                placeholder="Ex: Aula via Zoom, Entrega de Trabalho..."
                                              />
                                            </div>
                                          ) : (
                                            <div className="space-y-1">
                                              <h3 className="font-bold text-gray-900 text-lg leading-tight">{c.disciplineName}</h3>
                                              {c.observation && <p className="text-xs text-gray-500 italic">{c.observation}</p>}
                                            </div>
                                          )}
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                          {(c.allDates || []).sort().map((d: string, idx: number) => (
                                            <div key={idx} className="text-[11px] font-semibold text-indigo-600 bg-white px-2 py-1 rounded-md border border-indigo-100 flex items-center gap-1.5 shadow-sm">
                                              <Calendar className="w-3.5 h-3.5" /> {d ? format(parseISO(d), 'dd/MM/yyyy') : 'A definir'}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                      
                                      {isEditing && classGroup.length > 1 && (
                                        <div className="mt-3 flex justify-end">
                                          <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="h-7 text-[10px] text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50"
                                            onClick={() => {
                                              const maxOrder = Math.max(...editedClasses.map((cl: any) => cl.order || 0));
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
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div className="w-full md:w-80 shrink-0">
                                <p className="text-[10px] font-bold text-gray-400 uppercase mb-3 tracking-wider">Professor Responsável</p>
                                <div className="space-y-4 pr-2">
                                  {sortedCourseGroups.map((c: any) => (
                                    <div key={c.isCommon ? `common-${c.disciplineName}` : `${c.courseId}-${c.disciplineName}`} className="space-y-2">
                                      {isEditing ? (
                                        <div className="space-y-2 p-3 bg-gray-50/50 rounded-xl border border-gray-200">
                                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tight">{c.isCommon ? 'Fase Comum' : c.courseName?.split(' ')[0]}</p>
                                          <Select 
                                            value={c.teacherId} 
                                            onChange={(e: any) => updateClassField(order, 'teacherId', e.target.value, c.isCommon ? undefined : c.courseId)}
                                            className="h-9 text-xs bg-white"
                                          >
                                            <option value="">Selecione um Professor</option>
                                            {(teachers || [])
                                              .sort((a: any, b: any) => {
                                                const aIsSpec = a.specialties?.some((s: any) => s.disciplineName === c.disciplineName);
                                                const bIsSpec = b.specialties?.some((s: any) => s.disciplineName === c.disciplineName);
                                                if (aIsSpec && !bIsSpec) return -1;
                                                if (!aIsSpec && bIsSpec) return 1;
                                                return a.name.localeCompare(b.name);
                                              })
                                              .map((t: any) => {
                                                const isSpec = t.specialties?.some((s: any) => s.disciplineName === c.disciplineName);
                                                return (
                                                  <option key={t.id} value={t.id}>
                                                    {t.name} {isSpec ? '★' : ''}
                                                  </option>
                                                );
                                              })}
                                          </Select>
                                          <div className="flex flex-wrap gap-1">
                                            {(c.allDates || []).map((date: string, dIdx: number) => {
                                              const conflict = getConflict(c.teacherId, date, c);
                                              if (conflict) return (
                                                <div key={`${date}-${dIdx}`} className="text-[9px] text-red-500 font-bold flex items-center gap-1 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">
                                                  <AlertTriangle className="w-2.5 h-2.5" /> Conflito {date ? format(parseISO(date), 'dd/MM') : ''}
                                                </div>
                                              );
                                              return null;
                                            })}
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="space-y-2">
                                          <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${c.isCommon ? 'bg-indigo-100 text-indigo-600' : 'bg-amber-100 text-amber-600'}`}>
                                              {teachers.find((t: any) => t.id === c.teacherId)?.name?.[0] || '?'}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                              <p className="text-[9px] text-gray-400 font-bold uppercase leading-none mb-1">{c.isCommon ? 'Fase Comum' : c.courseName}</p>
                                              <p className="text-xs font-semibold text-gray-800 truncate">
                                                {teachers.find((t: any) => t.id === c.teacherId)?.name || 'Não atribuído'}
                                              </p>
                                            </div>
                                          </div>
                                          <div className="flex flex-wrap gap-1 pl-1">
                                            {(c.allDates || []).map((date: string, dIdx: number) => {
                                              const conflict = getConflict(c.teacherId, date, c);
                                              if (conflict) return (
                                                <div key={`${date}-${dIdx}`} className="text-[9px] text-red-500 font-bold flex items-center gap-1 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">
                                                  <AlertTriangle className="w-2.5 h-2.5" /> Conflito {date ? format(parseISO(date), 'dd/MM') : ''}
                                                </div>
                                              );
                                              return null;
                                            })}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </Card>
                        </SortableItem>
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          )}
        </div>

        <div className="p-4 sm:p-6 border-t border-slate-200 bg-white flex flex-col sm:flex-row justify-between items-center gap-4 print:hidden shrink-0 no-print">
          {isAdmin && (
            <Button variant="secondary" size="sm" onClick={() => setShowDeleteConfirm(true)} className="w-full sm:w-auto text-red-600 hover:bg-red-50 border-red-100 font-black uppercase tracking-widest">
              <Trash2 className="w-4 h-4 mr-2" /> Excluir Cronograma
            </Button>
          )}
          <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
            {!isEditing && (
              <>
                {schedule.status === 'active' && (
                  <Button variant="secondary" size="sm" onClick={handleCopyLink} className="flex-1 sm:flex-none bg-slate-100 hover:bg-slate-200 text-slate-900 border-slate-200 font-black uppercase tracking-widest">
                    {copying ? <Copy className="w-4 h-4 mr-2" /> : <Link className="w-4 h-4 mr-2" />}
                    {copying ? 'Copiado' : 'Link'}
                  </Button>
                )}
              </>
            )}
            <Button variant="secondary" size="sm" className="flex-1 sm:flex-none bg-slate-100 hover:bg-slate-200 text-slate-900 border-slate-200 font-black uppercase tracking-widest" onClick={onClose}>Fechar</Button>
            {isEditing && (
              <Button size="sm" onClick={handleSave} disabled={saving} className="flex-1 sm:flex-none bg-amber-500 text-slate-900 hover:bg-amber-600 border-none font-black uppercase tracking-widest shadow-lg">
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      <ConfirmationModal 
        isOpen={showDeleteConfirm}
        title="Excluir Cronograma"
        message="Tem certeza que deseja excluir este cronograma e todas as suas aulas? Esta ação não pode ser desfeita."
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        loading={isDeleting}
      />
    </div>
  );
}
