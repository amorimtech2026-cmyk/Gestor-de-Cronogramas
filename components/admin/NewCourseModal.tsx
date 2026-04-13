'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  Menu,
  ChevronDown,
  ChevronUp
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
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { TextArea } from '../ui/TextArea';
import { SortableItem } from '../ui/SortableItem';

interface NewCourseModalProps {
  isAdmin: boolean;
  onClose: () => void;
}

export function NewCourseModal({ isAdmin, onClose }: NewCourseModalProps) {
  const [name, setName] = useState('');
  const [marketingSummary, setMarketingSummary] = useState('');
  const [fullDescription, setFullDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [workload, setWorkload] = useState('360h');
  const [format, setFormat] = useState('Presencial, Remoto (ao vivo)');
  const [classDays, setClassDays] = useState('Sáb');
  const [classTime, setClassTime] = useState('08:00 - 17:00');
  const [duration, setDuration] = useState('10 meses');
  const [enrollmentPeriod, setEnrollmentPeriod] = useState('');
  const [startDateInfo, setStartDateInfo] = useState('');
  const [enrollmentStatus, setEnrollmentStatus] = useState('Abertas');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [disciplines, setDisciplines] = useState<{id: string, name: string, syllabus: string, isExpanded: boolean}[]>([]);
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
      setDisciplines((items: any[]) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
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
        specificDisciplines: disciplines.map((d: any) => ({ name: d.name, syllabus: d.syllabus || '' })),
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
            placeholder="Texto curto para o card..." 
            value={marketingSummary} 
            onChange={(e: any) => setMarketingSummary(e.target.value)} 
          />

          <TextArea 
            label="Descrição Completa / Texto Publicitário (Opcional)" 
            placeholder="Texto longo para o detalhe do curso..." 
            value={fullDescription} 
            onChange={(e: any) => setFullDescription(e.target.value)} 
            rows={6}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Carga Horária" value={workload} onChange={(e: any) => setWorkload(e.target.value)} />
            <Input label="Formato" value={format} onChange={(e: any) => setFormat(e.target.value)} />
            <Input label="Dias de Aula" value={classDays} onChange={(e: any) => setClassDays(e.target.value)} />
            <Input label="Horário" value={classTime} onChange={(e: any) => setClassTime(e.target.value)} />
            <Input label="Duração" value={duration} onChange={(e: any) => setDuration(e.target.value)} />
            <Input label="Status Matrículas" value={enrollmentStatus} onChange={(e: any) => setEnrollmentStatus(e.target.value)} />
            <Input label="Período Inscrições" value={enrollmentPeriod} onChange={(e: any) => setEnrollmentPeriod(e.target.value)} />
            <Input label="Início das Aulas" value={startDateInfo} onChange={(e: any) => setStartDateInfo(e.target.value)} />
          </div>

          <Input 
            label="Link de Inscrição (Site ESUDA)" 
            placeholder="https://esuda.edu.br/..." 
            value={websiteUrl} 
            onChange={(e: any) => setWebsiteUrl(e.target.value)} 
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
                    setDisciplines([...disciplines, { id: `new-${Date.now()}`, name: newDisc, syllabus: '', isExpanded: true }]);
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
                  items={disciplines.map((d: any) => d.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {disciplines.map((disc: any, i: number) => (
                    <SortableItem key={disc.id} id={disc.id}>
                      <div className="flex flex-col gap-2 p-1.5 bg-gray-50 rounded-lg border border-gray-200 pl-8 sm:pl-10 relative group hover:border-indigo-200 transition-all">
                        <Menu className="w-4 h-4 text-gray-300 absolute left-3 top-1/2 -translate-y-1/2" />
                        <div className="flex items-center gap-2">
                          <input 
                            className="flex-1 border-none bg-transparent focus:ring-2 focus:ring-indigo-500/20 focus:bg-white rounded px-2 h-8 text-sm outline-none font-medium text-gray-700 transition-all" 
                            value={disc.name} 
                            onChange={(e: any) => {
                              const next = [...disciplines];
                              next[i] = { ...next[i], name: e.target.value };
                              setDisciplines(next);
                            }}
                            placeholder="Nome da disciplina"
                          />
                          <button 
                            onClick={() => {
                              const next = [...disciplines];
                              next[i] = { ...next[i], isExpanded: !next[i].isExpanded };
                              setDisciplines(next);
                            }}
                            className={`p-1 rounded hover:bg-gray-200 transition-colors ${disc.syllabus ? 'text-indigo-600' : 'text-gray-400'}`}
                          >
                            {disc.isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                          <button onClick={() => setDisciplines(disciplines.filter((_: any, idx: number) => idx !== i))} className="text-red-500 hover:bg-red-50 p-1.5 rounded shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {disc.isExpanded && (
                          <div className="px-2 pb-2 animate-in fade-in slide-in-from-top-1 duration-200">
                            <TextArea 
                              placeholder="Digite a ementa da disciplina..."
                              value={disc.syllabus}
                              onChange={(e: any) => {
                                const next = [...disciplines];
                                next[i] = { ...next[i], syllabus: e.target.value };
                                setDisciplines(next);
                              }}
                              rows={3}
                              className="text-xs"
                            />
                          </div>
                        )}
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
