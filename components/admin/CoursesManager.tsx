'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Edit2, 
  Trash2, 
  Plus,
  FileText,
  Printer,
  ChevronDown,
  ChevronUp,
  BookOpen
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
  const [isCleaning, setIsCleaning] = useState(false);
  
  const handleCleanup = async () => {
    if (!isAdmin) return;
    setIsCleaning(true);
    try {
      // 1. Group courses by name
      const groups = new Map();
      courses.forEach(c => {
        const name = c.name.trim().toLowerCase();
        if (!groups.has(name)) groups.set(name, []);
        groups.get(name).push(c);
      });

      let totalCleaned = 0;
      let totalSynced = 0;

      for (const [name, group] of groups.entries()) {
        if (group.length > 1) {
          // Keep the one with most disciplines or the first one
          const master = group.sort((a: any, b: any) => (b.specificDisciplines?.length || 0) - (a.specificDisciplines?.length || 0))[0];
          const slaves = group.filter((c: any) => c.id !== master.id);
          const slaveIds = slaves.map((c: any) => c.id);

          // Update all classes pointing to slaves
          const classesSnap = await getDocs(collection(db, 'classes'));
          for (const classDoc of classesSnap.docs) {
            const data = classDoc.data();
            if (slaveIds.includes(data.courseId)) {
              await updateDoc(classDoc.ref, { courseId: master.id });
            }
          }

          // Update all schedules pointing to slaves
          const schedulesSnap = await getDocs(collection(db, 'schedules'));
          for (const scheduleDoc of schedulesSnap.docs) {
            const data = scheduleDoc.data();
            if (data.courseIds && data.courseIds.some((id: string) => slaveIds.includes(id))) {
              const newCourseIds = Array.from(new Set(data.courseIds.map((id: string) => slaveIds.includes(id) ? master.id : id)));
              await updateDoc(scheduleDoc.ref, { courseIds: newCourseIds });
            }
          }

          // Update teacher specialties
          const teachersSnap = await getDocs(collection(db, 'teachers'));
          for (const teacherDoc of teachersSnap.docs) {
            const data = teacherDoc.data();
            if (data.specialties && data.specialties.some((s: any) => slaveIds.includes(s.courseId))) {
              const newSpecialties = data.specialties.map((s: any) => 
                slaveIds.includes(s.courseId) ? { ...s, courseId: master.id } : s
              );
              await updateDoc(teacherDoc.ref, { specialties: newSpecialties });
            }
          }

          // Delete slaves
          for (const slave of slaves) {
            await deleteDoc(doc(db, 'courses', slave.id));
            totalCleaned++;
          }
        }
      }

      // 2. Cross-reference teachers from schedules
      const allSchedulesSnap = await getDocs(collection(db, 'schedules'));
      const allTeachersSnap = await getDocs(collection(db, 'teachers'));
      const teachersMap = new Map();
      allTeachersSnap.docs.forEach(d => teachersMap.set(d.id, { ref: d.ref, ...d.data() }));

      const allClassesSnap = await getDocs(collection(db, 'classes'));
      for (const classDoc of allClassesSnap.docs) {
        const classData = classDoc.data();
        if (classData.teacherId && classData.courseId && classData.disciplineName) {
          const teacher = teachersMap.get(classData.teacherId);
          if (teacher) {
            const specialties = teacher.specialties || [];
            const alreadyHas = specialties.some((s: any) => 
              s.courseId === classData.courseId && s.disciplineName === classData.disciplineName
            );
            
            if (!alreadyHas) {
              const newSpecialties = [...specialties, { 
                courseId: classData.courseId, 
                disciplineName: classData.disciplineName 
              }];
              await updateDoc(teacher.ref, { specialties: newSpecialties });
              teacher.specialties = newSpecialties; // Update local map to avoid redundant writes
              totalSynced++;
            }
          }
        }
      }

      // 3. Fix broken course names in schedules
      const schedulesToFixSnap = await getDocs(collection(db, 'schedules'));
      const classesForFixSnap = await getDocs(collection(db, 'classes'));
      let schedulesFixed = 0;

      // Build a global map of courseId -> courseName from all classes
      const globalCourseNameMap = new Map();
      classesForFixSnap.docs.forEach(d => {
        const data = d.data();
        if (data.courseId && data.courseName) {
          globalCourseNameMap.set(data.courseId, data.courseName);
        }
      });

      for (const scheduleDoc of schedulesToFixSnap.docs) {
        const scheduleData = scheduleDoc.data();
        
        const newCourseNames = scheduleData.courseIds.map((cid: string) => {
          // 1. Try to find in current courses list (passed as prop)
          const course = courses.find(c => c.id === cid);
          if (course) return course.name;

          // 2. Try to find in our global map from classes
          if (globalCourseNameMap.has(cid)) return globalCourseNameMap.get(cid);

          // 3. If cid itself looks like a name (not a Firebase ID)
          if (cid.length > 15 && !cid.includes(' ')) return 'Curso'; // Likely an ID
          return cid; // Likely already a name
        });

        // Only update if names changed or were missing
        const currentNames = scheduleData.courseNames || [];
        const hasMissingNames = currentNames.length !== newCourseNames.length;
        const namesChanged = JSON.stringify(currentNames) !== JSON.stringify(newCourseNames);

        if (hasMissingNames || namesChanged) {
          await updateDoc(scheduleDoc.ref, { courseNames: newCourseNames });
          schedulesFixed++;
        }
      }

      alert(`Limpeza concluída!\n- ${totalCleaned} cursos duplicados removidos.\n- ${totalSynced} especialidades de professores sincronizadas.\n- ${schedulesFixed} cronogramas corrigidos.`);
    } catch (e) {
      console.error("Erro na limpeza:", e);
      alert("Ocorreu um erro durante a limpeza.");
    } finally {
      setIsCleaning(false);
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

  // Função específica para corrigir a matriz do curso de Neuroarquitetura conforme solicitado pelo usuário
  const fixNeuroMatrix = async () => {
    if (!isAdmin) return;
    setIsCleaning(true);
    try {
      const neuroCourse = courses.find(c => c.name.toLowerCase() === 'neuroarquitetura');
      if (!neuroCourse) {
        alert("Curso 'Neuroarquitetura' não encontrado.");
        return;
      }

      const newMatrix = [
        "Neurociência Aplicada à Arquitetura",
        "Ritmo Biológico e Fatores Humanos",
        "Neuroarquitetura e Design Cognitivo",
        "Espaços Residenciais e Comerciais: Aplicações e Princípios da Neurarquitetura",
        "Espaços Coorporativos: Aplicações e Princípios da Neurarquitetura",
        "Estímulos e Percepções: Neuroarquitetura em Espaços Verdes",
        "Neuroiluminação",
        "Design Biofílico",
        "Neurourbanismo"
      ];

      // Convert to new object structure if needed
      const objectMatrix = newMatrix.map(name => ({ name, syllabus: '' }));

      await updateDoc(doc(db, 'courses', neuroCourse.id), {
        specificDisciplines: objectMatrix
      });

      alert("Matriz de Neuroarquitetura corrigida com sucesso!");
    } catch (e) {
      console.error("Erro ao corrigir matriz:", e);
      alert("Erro ao corrigir matriz.");
    } finally {
      setIsCleaning(false);
    }
  };

  const generateCoursePDF = (course: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const disciplines = course.specificDisciplines || [];
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Relatório do Curso - ${course.name}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap');
          body { 
            font-family: 'Inter', sans-serif; 
            padding: 40px; 
            color: #1f2937;
            line-height: 1.5;
          }
          .header { 
            text-align: center; 
            border-bottom: 3px solid #4f46e5; 
            padding-bottom: 20px; 
            margin-bottom: 30px; 
          }
          .header h1 { 
            margin: 0; 
            color: #312e81; 
            font-size: 28px; 
            font-weight: 900;
            text-transform: uppercase;
          }
          .header p { margin: 5px 0 0; color: #6b7280; font-weight: 500; }
          
          .section { margin-bottom: 30px; }
          .section-title { 
            font-size: 14px; 
            font-weight: 900; 
            color: #4f46e5; 
            text-transform: uppercase; 
            letter-spacing: 0.05em;
            margin-bottom: 15px;
            border-left: 4px solid #4f46e5;
            padding-left: 10px;
          }
          
          .info-grid { 
            display: grid; 
            grid-template-columns: repeat(2, 1fr); 
            gap: 15px; 
            background: #f9fafb;
            padding: 20px;
            border-radius: 12px;
          }
          .info-item { font-size: 13px; }
          .info-label { font-weight: 700; color: #374151; }
          
          .description { font-size: 14px; text-align: justify; color: #4b5563; }
          
          .discipline-item { 
            margin-bottom: 20px; 
            padding-bottom: 15px; 
            border-bottom: 1px solid #e5e7eb;
            page-break-inside: avoid;
          }
          .discipline-name { font-size: 15px; font-weight: 700; color: #111827; margin-bottom: 5px; }
          .discipline-syllabus { font-size: 13px; color: #4b5563; font-style: italic; }
          
          .footer { 
            margin-top: 50px; 
            font-size: 10px; 
            color: #9ca3af; 
            text-align: center; 
            border-top: 1px solid #e5e7eb;
            padding-top: 20px;
          }
          
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${course.name}</h1>
          <p>Relatório Técnico do Curso</p>
        </div>

        <div class="section">
          <div class="section-title">Informações Gerais</div>
          <div class="info-grid">
            <div class="info-item"><span class="info-label">Carga Horária:</span> ${course.workload || 'N/A'}</div>
            <div class="info-item"><span class="info-label">Duração:</span> ${course.duration || 'N/A'}</div>
            <div class="info-item"><span class="info-label">Formato:</span> ${course.format || 'N/A'}</div>
            <div class="info-item"><span class="info-label">Dias de Aula:</span> ${course.classDays || 'N/A'}</div>
            <div class="info-item"><span class="info-label">Horário:</span> ${course.classTime || 'N/A'}</div>
            <div class="info-item"><span class="info-label">Status:</span> ${course.enrollmentStatus || 'N/A'}</div>
          </div>
        </div>

        ${course.fullDescription ? `
        <div class="section">
          <div class="section-title">Descrição do Curso</div>
          <div class="description">${course.fullDescription.replace(/\n/g, '<br>')}</div>
        </div>
        ` : ''}

        <div class="section">
          <div class="section-title">Matriz Curricular Detalhada</div>
          ${disciplines.map((d: any) => `
            <div class="discipline-item">
              <div class="discipline-name">${typeof d === 'string' ? d : d.name}</div>
              ${(typeof d === 'object' && d.syllabus) ? `<div class="discipline-syllabus">${d.syllabus.replace(/\n/g, '<br>')}</div>` : ''}
            </div>
          `).join('')}
        </div>

        <div class="footer">
          Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}<br>
          Esuda Acadêmico - Gestão de Cronogramas
        </div>

        <script>
          window.onload = () => {
            window.print();
            // window.close();
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      {isAdmin && (
        <div className="flex flex-wrap justify-end gap-2">
          <Button 
            variant="secondary" 
            onClick={fixNeuroMatrix} 
            disabled={isCleaning}
            className="bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
          >
            {isCleaning ? 'Corrigindo...' : 'Corrigir Matriz Neuroarquitetura'}
          </Button>
          <Button 
            variant="secondary" 
            onClick={handleCleanup} 
            disabled={isCleaning}
            className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
          >
            {isCleaning ? 'Limpando...' : 'Limpar Duplicados e Sincronizar Professores'}
          </Button>
        </div>
      )}
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
              <button 
                onClick={(e) => { e.stopPropagation(); generateCoursePDF(course); }} 
                className="text-indigo-500 hover:bg-indigo-50 p-2 rounded flex items-center gap-1 text-xs font-bold"
                title="Gerar PDF do Curso"
              >
                <Printer className="w-4 h-4" />
                <span className="hidden sm:inline">PDF</span>
              </button>
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
  const [disciplines, setDisciplines] = useState(
    (course.specificDisciplines || []).map((d: any, i: number) => {
      const name = typeof d === 'string' ? d : d.name;
      const syllabus = typeof d === 'object' ? (d.syllabus || '') : '';
      return { id: `disc-${i}-${Date.now()}`, name, syllabus, isExpanded: false };
    })
  );
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
    setSaving(true);
    try {
      const disciplineData = disciplines.map((d: any) => ({ name: d.name, syllabus: d.syllabus || '' }));
      const disciplineNames = disciplineData.map((d: any) => d.name);
      
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
        specificDisciplines: disciplineData
      });

      // Create a map of renamed disciplines
      const oldDisciplines = course.specificDisciplines || [];
      const renamedMap = new Map();
      disciplineNames.forEach((newName: string, i: number) => {
        const oldD = oldDisciplines[i];
        const oldName = typeof oldD === 'string' ? oldD : oldD?.name;
        if (oldName && oldName !== newName) {
          renamedMap.set(oldName, newName);
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
    setDisciplines([...disciplines, { id: `new-${Date.now()}`, name: newDisc, syllabus: '', isExpanded: true }]);
    setNewDisc('');
  };

  const removeDisc = (index: number) => {
    setDisciplines(disciplines.filter((_: any, i: number) => i !== index));
  };

  const updateDiscName = (index: number, newName: string) => {
    const next = [...disciplines];
    next[index] = { ...next[index], name: newName };
    setDisciplines(next);
  };

  const updateDiscSyllabus = (index: number, newSyllabus: string) => {
    const next = [...disciplines];
    next[index] = { ...next[index], syllabus: newSyllabus };
    setDisciplines(next);
  };

  const toggleExpand = (index: number) => {
    const next = [...disciplines];
    next[index] = { ...next[index], isExpanded: !next[index].isExpanded };
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
                  items={disciplines.map((d: any) => d.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {disciplines.map((disc: any, i: number) => (
                    <SortableItem key={disc.id} id={disc.id}>
                      <div className="flex flex-col gap-2 p-1.5 bg-gray-50 rounded-lg border border-gray-200 pl-8 group hover:border-indigo-200 transition-all">
                        <div className="flex items-center gap-2">
                          <input 
                            className="flex-1 border-none bg-transparent focus:ring-2 focus:ring-indigo-500/20 focus:bg-white rounded px-2 h-8 text-sm outline-none font-medium text-gray-700 transition-all" 
                            value={disc.name} 
                            onChange={(e: any) => updateDiscName(i, e.target.value)}
                            disabled={!isAdmin}
                            placeholder="Nome da disciplina"
                          />
                          <button 
                            onClick={() => toggleExpand(i)}
                            className={`p-1 rounded hover:bg-gray-200 transition-colors ${disc.syllabus ? 'text-indigo-600' : 'text-gray-400'}`}
                            title={disc.isExpanded ? "Recolher Ementa" : "Editar Ementa"}
                          >
                            {disc.isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                          {isAdmin && (
                            <button onClick={() => removeDisc(i)} className="text-red-400 hover:text-red-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        
                        {disc.isExpanded && (
                          <div className="px-2 pb-2 animate-in fade-in slide-in-from-top-1 duration-200">
                            <TextArea 
                              placeholder="Digite a ementa da disciplina..."
                              value={disc.syllabus}
                              onChange={(e: any) => updateDiscSyllabus(i, e.target.value)}
                              rows={3}
                              className="text-xs"
                              disabled={!isAdmin}
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
