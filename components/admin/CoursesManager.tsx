'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Edit2, 
  Trash2, 
  Plus 
} from 'lucide-react';
import { 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc, 
  query, 
  where, 
  getDocs, 
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
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { syncTeacherAssignments } from '@/lib/sync';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { TextArea } from '../ui/TextArea';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import { SortableItem } from '../ui/SortableItem';

interface CoursesManagerProps {
  courses: any[];
  isAdmin: boolean;
}

export function CoursesManager({ courses, isAdmin }: CoursesManagerProps) {
  const [editingCourse, setEditingCourse] = useState<any>(null);
  const [deletingCourseId, setDeletingCourseId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
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
  const [fullDescription, setFullDescription] = useState(course.fullDescription || '');
  const [imageUrl, setImageUrl] = useState(course.imageUrl || '');
  const [workload, setWorkload] = useState(course.workload || '360h');
  const [format, setFormat] = useState(course.format || 'Presencial, Remoto (ao vivo)');
  const [classDays, setClassDays] = useState(course.classDays || 'Sáb');
  const [classTime, setClassTime] = useState(course.classTime || '08:00 - 17:00');
  const [duration, setDuration] = useState(course.duration || '10 meses');
  const [enrollmentPeriod, setEnrollmentPeriod] = useState(course.enrollmentPeriod || '');
  const [startDateInfo, setStartDateInfo] = useState(course.startDateInfo || '');
  const [enrollmentStatus, setEnrollmentStatus] = useState(course.enrollmentStatus || 'Abertas');
  const [websiteUrl, setWebsiteUrl] = useState(course.websiteUrl || '');
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
        fullDescription,
        imageUrl,
        workload,
        format,
        classDays,
        classTime,
        duration,
        enrollmentPeriod,
        startDateInfo,
        enrollmentStatus,
        websiteUrl,
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
      await syncTeacherAssignments();
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
            placeholder="Texto curto para o card..." 
            value={marketingSummary} 
            onChange={(e: any) => setMarketingSummary(e.target.value)} 
            disabled={!isAdmin}
          />

          <TextArea 
            label="Descrição Completa / Texto Publicitário (Opcional)" 
            placeholder="Texto longo para o detalhe do curso..." 
            value={fullDescription} 
            onChange={(e: any) => setFullDescription(e.target.value)} 
            disabled={!isAdmin}
            rows={6}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Carga Horária" value={workload} onChange={(e: any) => setWorkload(e.target.value)} disabled={!isAdmin} />
            <Input label="Formato" value={format} onChange={(e: any) => setFormat(e.target.value)} disabled={!isAdmin} />
            <Input label="Dias de Aula" value={classDays} onChange={(e: any) => setClassDays(e.target.value)} disabled={!isAdmin} />
            <Input label="Horário" value={classTime} onChange={(e: any) => setClassTime(e.target.value)} disabled={!isAdmin} />
            <Input label="Duração" value={duration} onChange={(e: any) => setDuration(e.target.value)} disabled={!isAdmin} />
            <Input label="Status Matrículas" value={enrollmentStatus} onChange={(e: any) => setEnrollmentStatus(e.target.value)} disabled={!isAdmin} />
            <Input label="Período Inscrições" value={enrollmentPeriod} onChange={(e: any) => setEnrollmentPeriod(e.target.value)} disabled={!isAdmin} />
            <Input label="Início das Aulas" value={startDateInfo} onChange={(e: any) => setStartDateInfo(e.target.value)} disabled={!isAdmin} />
          </div>
          
          <Input 
            label="Link de Inscrição (Site ESUDA)" 
            placeholder="https://esuda.edu.br/..." 
            value={websiteUrl} 
            onChange={(e: any) => setWebsiteUrl(e.target.value)} 
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
