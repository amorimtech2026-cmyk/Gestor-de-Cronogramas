'use client';

import React, { useState } from 'react';
import { 
  Calendar, 
  Edit2, 
  Trash2 
} from 'lucide-react';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc 
} from 'firebase/firestore';
import { format, parseISO } from 'date-fns';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { HOLIDAYS_2026 } from '@/lib/calendar';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { ConfirmationModal } from '../ui/ConfirmationModal';

interface HolidaysManagerProps {
  holidays: any[];
  isAdmin: boolean;
}

export function HolidaysManager({ holidays, isAdmin }: HolidaysManagerProps) {
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
        message="Tem certeza que deseja excluir este feriado? Esta ação não pode ser desfeita."
        onConfirm={handleDelete}
        onCancel={() => setDeletingId(null)}
        loading={isDeleting}
      />
    </div>
  );
}
