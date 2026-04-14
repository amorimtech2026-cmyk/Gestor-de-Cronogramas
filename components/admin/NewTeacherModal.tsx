'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Plus 
} from 'lucide-react';
import { 
  collection, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { COMMON_DISCIPLINES } from '@/lib/calendar';
import { syncTeacherAssignments } from '@/lib/sync';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface NewTeacherModalProps {
  courses: any[];
  isAdmin: boolean;
  commonDisciplines: any[];
  onClose: () => void;
}

export function NewTeacherModal({ courses, isAdmin, commonDisciplines, onClose }: NewTeacherModalProps) {
  const [form, setForm] = useState({ 
    name: '', 
    titulacao: '',
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
    if (!form.name || !form.titulacao) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'teachers'), {
        ...form,
        createdAt: serverTimestamp()
      });
      await syncTeacherAssignments();
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
            <Input label="Titulação / Grau" placeholder="Ex: Mestre em Engenharia" value={form.titulacao} onChange={(e: any) => setForm({...form, titulacao: e.target.value})} />
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
                {(commonDisciplines.length > 0 ? commonDisciplines : COMMON_DISCIPLINES).map((disc: any) => {
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
                    {(course.specificDisciplines || []).map((d: any) => {
                      const discName = typeof d === 'string' ? d : d.name;
                      const isSelected = form.specialties?.some((s: any) => s.courseId === course.id && s.disciplineName === discName);
                      return (
                         <button
                           key={discName}
                           onClick={() => {
                             const current = form.specialties || [];
                             if (isSelected) {
                               setForm({ ...form, specialties: current.filter((s: any) => !(s.courseId === course.id && s.disciplineName === discName)) });
                             } else {
                               setForm({ ...form, specialties: [...current, { courseId: course.id, disciplineName: discName }] });
                             }
                           }}
                           className={`px-2 py-1 rounded text-[9px] sm:text-[10px] border transition-all ${isSelected ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300'}`}
                         >
                           {discName}
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
          <Button onClick={handleSave} disabled={saving || !form.name || !form.titulacao}>
            {saving ? 'Salvando...' : 'Criar Docente'}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
