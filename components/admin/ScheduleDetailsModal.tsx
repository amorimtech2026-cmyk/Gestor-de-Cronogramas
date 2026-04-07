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
  }, [schedule.id, schedule.startDate, isEditing]);

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

      // Update schedule lastUpdated
      await updateDoc(doc(db, 'schedules', schedule.id), {
        lastUpdated: serverTimestamp()
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
        });
      });

      // Update order values to match the new sequence
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

  const handleExportPDF = async () => {
    const html2pdf = (await import('html2pdf.js')).default;
    const element = document.getElementById('print-table-content');
    if (!element) return;

    // Temporarily show the element for capture
    element.style.display = 'block';
    element.style.position = 'static';
    element.style.visibility = 'visible';

    const opt = {
      margin: [10, 10],
      filename: `Cronograma_${schedule.className || 'Esuda'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true, 
        logging: false,
        letterRendering: true
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    } as const;

    html2pdf().from(element).set(opt).save().then(() => {
      // Hide it again
      element.style.display = 'none';
    });
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 print:bg-white print:p-0 print:static print:block">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl w-full max-w-5xl h-[92vh] sm:h-[90vh] overflow-hidden flex flex-col shadow-2xl print-modal relative"
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
        <div className="p-3 sm:p-6 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-indigo-600 text-white shrink-0">
          <div className="w-full sm:w-auto">
            <div className="flex justify-between items-center sm:block">
              <h2 className="text-lg sm:text-2xl font-bold">Detalhes</h2>
              <button onClick={onClose} className="sm:hidden text-white/80 hover:text-white">
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <p className="text-indigo-100 text-[10px] sm:text-sm">
                Início: {format(parseISO(schedule.startDate), 'dd/MM/yyyy')}
                {schedule.lastUpdated && (
                  <span className="ml-1 opacity-60 italic text-[9px] sm:text-[10px]">
                    ({format(schedule.lastUpdated.toDate(), 'HH:mm')})
                  </span>
                )}
              </p>
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${holidays.length > 0 ? 'bg-green-500/20 text-green-100' : 'bg-red-500/20 text-red-100'}`}>
                {holidays.length} Feriados
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
            {isAdmin && isEditing && hasUnsavedChanges && (
              <div className="flex items-center gap-1 text-amber-200 text-[9px] font-bold uppercase animate-pulse mr-auto sm:mr-2">
                <AlertTriangle className="w-3 h-3" /> Pendente
              </div>
            )}

            {isAdmin && isEditing && saveSuccess && (
              <div className="flex items-center gap-1 text-green-200 text-[9px] font-bold uppercase mr-auto sm:mr-2">
                <CheckCircle2 className="w-3 h-3" /> Salvo!
              </div>
            )}
            
            {isAdmin && !isEditing && (
              <>
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={handleManualSync} 
                  disabled={syncing}
                  className="h-8 px-2 bg-white/10 hover:bg-white/20 border-white/20 text-white text-[10px] sm:text-sm print:hidden"
                >
                  <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
                  <span className="ml-1 hidden xs:inline">Sincronizar</span>
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={handleTogglePublish} 
                  disabled={publishing}
                  className={`h-8 px-2 bg-white/10 hover:bg-white/20 border-white/20 text-white text-[10px] sm:text-sm print:hidden ${schedule.status === 'active' ? 'text-green-200' : 'text-amber-200'}`}
                >
                  {publishing ? <RotateCcw className="w-3 h-3 animate-spin" /> : schedule.status === 'active' ? <EyeOff className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                  <span className="ml-1 hidden xs:inline">{schedule.status === 'active' ? 'Desativar' : 'Publicar'}</span>
                </Button>
              </>
            )}
            
            {isAdmin && isEditing && (
              <>
                <Button variant="secondary" size="sm" onClick={recalculateDates} className="h-8 px-2 bg-white/10 hover:bg-white/20 border-white/20 text-white text-[10px] sm:text-sm print:hidden">
                  <Calendar className="w-3 h-3 mr-1" /> <span className="hidden xs:inline">Datas</span>
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setEditedClasses(classes)} className="h-8 px-2 bg-white/10 hover:bg-white/20 border-white/20 text-white text-[10px] sm:text-sm print:hidden">
                  <RotateCcw className="w-3 h-3 mr-1" /> <span className="hidden xs:inline">Desfazer</span>
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving} className="h-8 px-3 bg-white text-indigo-600 hover:bg-indigo-50 border-none text-[10px] sm:text-sm font-bold shadow-lg sm:hidden">
                  {saving ? '...' : 'Salvar'}
                </Button>
              </>
            )}
            
            {!isEditing && isAdmin && (
              <>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={handleExportPDF} 
                  className="h-8 px-2 bg-white/10 hover:bg-white/20 border-white/20 text-white text-[10px] sm:text-sm print:hidden"
                >
                  <FileText className="w-3 h-3 mr-1" /> <span className="hidden xs:inline">Exportar PDF</span><span className="xs:hidden">PDF</span>
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)} className="h-8 px-2 bg-white/10 hover:bg-white/20 border-white/20 text-white text-[10px] sm:text-sm print:hidden">
                  <Edit className="w-3 h-3 mr-1" /> <span className="hidden xs:inline">Editar</span>
                </Button>
              </>
            )}

            <button onClick={onClose} className="hidden sm:block text-white/80 hover:text-white ml-2 print:hidden">
              <Plus className="w-6 h-6 rotate-45" />
            </button>
          </div>
        </div>

        <div id="schedule-content" className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-8 space-y-8 bg-gray-50 print:overflow-visible print:h-auto print:bg-white print:p-0 pdf-export-area">
          {/* Hidden Print Table */}
          <div id="print-table-content" style={{ display: 'none' }} className="bg-white text-black font-sans">
            <div className="mb-8 border-b-2 border-indigo-600 pb-4">
              <h1 className="text-2xl font-bold text-indigo-900">Cronograma de Aulas - Pós-Graduação Esuda</h1>
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <p><span className="font-bold">Turma:</span> {schedule.className}</p>
                <p><span className="font-bold">Data de Início:</span> {format(parseISO(schedule.startDate), 'dd/MM/yyyy')}</p>
                <p><span className="font-bold">Emitido em:</span> {format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
              </div>
            </div>

            <table className="w-full border-collapse border border-gray-300 text-[10px]">
              <thead>
                <tr className="bg-indigo-600 text-white">
                  <th className="border border-gray-300 p-2 text-left w-20">Data</th>
                  <th className="border border-gray-300 p-2 text-left">Disciplina</th>
                  <th className="border border-gray-300 p-2 text-left w-40">Professor</th>
                  <th className="border border-gray-300 p-2 text-left w-32">Curso/Fase</th>
                </tr>
              </thead>
              <tbody>
                {editedClasses.sort((a, b) => a.date.localeCompare(b.date)).map((c: any, idx: number) => (
                  <tr key={c.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border border-gray-300 p-2 font-medium">
                      {c.date ? format(parseISO(c.date), 'dd/MM/yyyy') : 'A definir'}
                    </td>
                    <td className="border border-gray-300 p-2">
                      <div className="font-bold">{c.disciplineName}</div>
                    </td>
                    <td className="border border-gray-300 p-2">
                      {teachers.find((t: any) => t.id === c.teacherId)?.name || 'Não atribuído'}
                    </td>
                    <td className="border border-gray-300 p-2 text-[9px]">
                      {c.isCommon ? 'Fase Comum' : c.courseName}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-12 pt-8 border-t border-gray-200 text-center text-[9px] text-gray-400">
              <p>Este documento é um cronograma oficial da pós-graduação Esuda.</p>
              <p className="mt-1">© {new Date().getFullYear()} Esuda Acadêmico - Todos os direitos reservados.</p>
            </div>
          </div>

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
                                          <Input 
                                            value={c.disciplineName} 
                                            onChange={(e: any) => updateClassField(order, 'disciplineName', e.target.value, c.isCommon ? undefined : c.courseId)}
                                            className="bg-white mt-1"
                                          />
                                        ) : (
                                          <h3 className="font-bold text-gray-900 text-lg leading-tight">{c.disciplineName}</h3>
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
                                          {(c.allDates || []).map((date: string) => {
                                            const conflict = getConflict(c.teacherId, date, c);
                                            if (conflict) return (
                                              <div key={date} className="text-[9px] text-red-500 font-bold flex items-center gap-1 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">
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
                                          {(c.allDates || []).map((date: string) => {
                                            const conflict = getConflict(c.teacherId, date, c);
                                            if (conflict) return (
                                              <div key={date} className="text-[9px] text-red-500 font-bold flex items-center gap-1 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">
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
          )}
          <div className="hidden print:block mt-12 pt-8 border-t border-gray-200 text-center text-xs text-gray-400">
            <p>Este documento é um cronograma oficial da pós-graduação Esuda.</p>
            <p className="mt-1">© {new Date().getFullYear()} Esuda Acadêmico - Todos os direitos reservados.</p>
          </div>
        </div>

        <div className="p-4 sm:p-6 border-t border-gray-200 bg-white flex flex-col sm:flex-row justify-between items-center gap-4 print:hidden shrink-0">
          {isAdmin && (
            <Button variant="secondary" size="sm" onClick={() => setShowDeleteConfirm(true)} className="w-full sm:w-auto text-red-600 hover:bg-red-50 border-red-100 print:hidden">
              <Trash2 className="w-4 h-4 mr-2" /> Excluir Cronograma
            </Button>
          )}
          <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
            {!isEditing && (
              <>
                {schedule.status === 'active' && (
                  <Button variant="secondary" size="sm" onClick={handleCopyLink} className="flex-1 sm:flex-none print:hidden">
                    {copying ? <Copy className="w-4 h-4 mr-1" /> : <Link className="w-4 h-4 mr-1" />}
                    {copying ? 'OK' : 'Link'}
                  </Button>
                )}
              </>
            )}
            <Button variant="secondary" size="sm" className="flex-1 sm:flex-none print:hidden" onClick={onClose}>Fechar</Button>
            {isEditing && (
              <Button size="sm" onClick={handleSave} disabled={saving} className="flex-1 sm:flex-none print:hidden shadow-lg">
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
