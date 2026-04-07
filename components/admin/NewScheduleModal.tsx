'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Plus, 
  Menu, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft, 
  Save, 
  LayoutDashboard 
} from 'lucide-react';
import { 
  collection, 
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
import { format, parseISO } from 'date-fns';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { COMMON_DISCIPLINES, generateFullScheduleWithOrder } from '@/lib/calendar';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Card } from '../ui/Card';
import { SortableItem } from '../ui/SortableItem';

interface NewScheduleModalProps {
  courses: any[];
  holidays: any[];
  teachers: any[];
  onClose: () => void;
}

export function NewScheduleModal({ courses, holidays, teachers, onClose }: NewScheduleModalProps) {
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
                                  <span className="text-[10px] sm:text-xs font-bold text-gray-400 w-4">{specificOrders[courseId].indexOf(d) + COMMON_DISCIPLINES.length + 1}</span>
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
                        options={(teachers || [])
                          .sort((a: any, b: any) => {
                            const aIsSpec = a.specialties?.some((s: any) => s.disciplineName === c.disciplineName);
                            const bIsSpec = b.specialties?.some((s: any) => s.disciplineName === c.disciplineName);
                            if (aIsSpec && !bIsSpec) return -1;
                            if (!aIsSpec && bIsSpec) return 1;
                            return a.name.localeCompare(b.name);
                          })
                          .map((t: any) => {
                            const isSpec = t.specialties?.some((s: any) => s.disciplineName === c.disciplineName);
                            return { value: t.id, label: `${t.name}${isSpec ? ' ★' : ''}` };
                          })} 
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
                            options={(teachers || [])
                              .sort((a: any, b: any) => {
                                const aIsSpec = a.specialties?.some((s: any) => s.disciplineName === c.disciplineName);
                                const bIsSpec = b.specialties?.some((s: any) => s.disciplineName === c.disciplineName);
                                if (aIsSpec && !bIsSpec) return -1;
                                if (!aIsSpec && bIsSpec) return 1;
                                return a.name.localeCompare(b.name);
                              })
                              .map((t: any) => {
                                const isSpec = t.specialties?.some((s: any) => s.disciplineName === c.disciplineName);
                                return { value: t.id, label: `${t.name}${isSpec ? ' ★' : ''}` };
                              })} 
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
