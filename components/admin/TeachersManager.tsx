'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Edit2, 
  Trash2, 
  Plus 
} from 'lucide-react';
import { 
  deleteDoc, 
  doc, 
  updateDoc 
} from 'firebase/firestore';
import Image from 'next/image';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { COMMON_DISCIPLINES } from '@/lib/calendar';
import { syncTeacherAssignments } from '@/lib/sync';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { ConfirmationModal } from '../ui/ConfirmationModal';

interface TeachersManagerProps {
  teachers: any[];
  courses: any[];
  isAdmin: boolean;
}

export function TeachersManager({ teachers, courses, isAdmin }: TeachersManagerProps) {
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
                {Array.from(new Set(teacher.specialties?.map((s: any) => s.courseId === 'common' ? 'Fase Comum' : courses.find((c: any) => c.id === s.courseId)?.name).filter(Boolean))).slice(0, 2).map((courseName: any, i: number) => (
                  <span key={i} className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[8px] font-bold uppercase">
                    {courseName}
                  </span>
                ))}
                {(new Set(teacher.specialties?.map((s: any) => s.courseId)).size > 2) && (
                  <span className="text-[8px] text-gray-400 font-bold">+{new Set(teacher.specialties?.map((s: any) => s.courseId)).size - 2}</span>
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
      await syncTeacherAssignments();
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
