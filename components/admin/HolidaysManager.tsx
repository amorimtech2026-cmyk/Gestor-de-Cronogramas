'use client';

import React, { useState } from 'react';
import { 
  Calendar, 
  Edit2, 
  Trash2,
  ChevronLeft,
  ChevronRight,
  Download
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
import { getHolidaysForYear } from '@/lib/calendar';
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
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loadingYear, setLoadingYear] = useState(false);

  const [showDuplicateConfirm, setShowDuplicateConfirm] = useState(false);
  const [duplicateIds, setDuplicateIds] = useState<string[]>([]);

  const handleLoadYearHolidays = async () => {
    setLoadingYear(true);
    try {
      const yearHolidays = getHolidaysForYear(selectedYear);
      const existingDates = new Set(holidays.map((h: any) => h.date));
      let added = 0;
      
      for (const h of yearHolidays) {
        if (!existingDates.has(h.date)) {
          await addDoc(collection(db, 'holidays'), h);
          added++;
        }
      }
      
      if (added > 0) {
        alert(`${added} novos feriados de ${selectedYear} foram adicionados!`);
      } else {
        alert(`Todos os feriados de ${selectedYear} já estão cadastrados.`);
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'holidays');
    } finally {
      setLoadingYear(false);
    }
  };

  const handleRemoveDuplicates = async () => {
    const seen = new Set<string>();
    const duplicates: string[] = [];
    
    holidays.forEach((h: any) => {
      const key = `${h.date}_${h.description.trim().toLowerCase()}`;
      if (seen.has(key)) {
        duplicates.push(h.id);
      } else {
        seen.add(key);
      }
    });

    if (duplicates.length === 0) {
      alert("Nenhum feriado duplicado encontrado.");
      return;
    }

    setDuplicateIds(duplicates);
    setShowDuplicateConfirm(true);
  };

  const confirmRemoveDuplicates = async () => {
    setIsDeleting(true);
    try {
      for (const id of duplicateIds) {
        await deleteDoc(doc(db, 'holidays', id));
      }
      setShowDuplicateConfirm(false);
      setDuplicateIds([]);
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, 'holidays');
    } finally {
      setIsDeleting(false);
    }
  };

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
        <Card className="p-4 sm:p-6 border-indigo-100 bg-indigo-50/30 flex flex-col items-center text-center space-y-6">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
            <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-indigo-900">
              Gerenciador de Feriados
            </h3>
            <p className="text-xs sm:text-sm text-indigo-600/70">
              Selecione o ano para carregar automaticamente os feriados nacionais e regionais.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center bg-white border border-indigo-200 rounded-xl p-1 shadow-sm">
              <button 
                onClick={() => setSelectedYear(selectedYear - 1)}
                className="p-2 hover:bg-indigo-50 text-indigo-600 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="px-6 font-black text-xl text-indigo-900 min-w-[100px]">
                {selectedYear}
              </div>
              <button 
                onClick={() => setSelectedYear(selectedYear + 1)}
                className="p-2 hover:bg-indigo-50 text-indigo-600 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <Button 
              onClick={handleLoadYearHolidays} 
              disabled={loadingYear}
              className="bg-indigo-600 hover:bg-indigo-700 text-white border-none shadow-lg"
            >
              <Download className="w-4 h-4 mr-2" />
              {loadingYear ? 'Carregando...' : `Carregar Feriados ${selectedYear}`}
            </Button>
          </div>

          <div className="pt-2">
            <Button variant="ghost" onClick={handleRemoveDuplicates} className="text-red-600 hover:bg-red-50 border-red-100">
              <Trash2 className="w-4 h-4 mr-2" /> Limpar Duplicados
            </Button>
          </div>
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
        isOpen={showDuplicateConfirm}
        title="Excluir Duplicados"
        message={`Deseja excluir os ${duplicateIds.length} feriados duplicados encontrados? Esta ação manterá apenas um registro para cada data/nome.`}
        onConfirm={confirmRemoveDuplicates}
        onCancel={() => setShowDuplicateConfirm(false)}
        loading={isDeleting}
      />

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
