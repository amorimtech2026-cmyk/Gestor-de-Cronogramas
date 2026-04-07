import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc,
  query,
  where
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Sincroniza as atribuições de professores nos cronogramas existentes.
 * Se uma disciplina tiver apenas UM professor especialista (estrela), 
 * esse professor é automaticamente atribuído a todas as aulas dessa disciplina 
 * que ainda não possuem professor ou que precisam ser atualizadas.
 */
export async function syncTeacherAssignments() {
  try {
    // 1. Buscar todos os professores
    const teachersSnap = await getDocs(collection(db, 'teachers'));
    const teachers = teachersSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

    // 2. Mapear especialidades para professores
    // Estrutura: { "Nome da Disciplina": [teacherId1, teacherId2] }
    const specialtyMap: { [key: string]: string[] } = {};

    teachers.forEach(teacher => {
      teacher.specialties?.forEach((spec: any) => {
        const key = spec.disciplineName;
        if (!specialtyMap[key]) specialtyMap[key] = [];
        specialtyMap[key].push(teacher.id);
      });
    });

    // 3. Identificar disciplinas com apenas UM especialista
    const uniqueSpecialists: { [key: string]: string } = {};
    Object.entries(specialtyMap).forEach(([discipline, teacherIds]) => {
      if (teacherIds.length === 1) {
        uniqueSpecialists[discipline] = teacherIds[0];
      }
    });

    // 4. Buscar todos os cronogramas
    const schedulesSnap = await getDocs(collection(db, 'schedules'));
    
    for (const scheduleDoc of schedulesSnap.docs) {
      const scheduleId = scheduleDoc.id;
      
      // 5. Buscar todas as aulas deste cronograma na coleção global 'classes'
      const classesQuery = query(collection(db, 'classes'), where('scheduleId', '==', scheduleId));
      const classesSnap = await getDocs(classesQuery);
      
      for (const classDoc of classesSnap.docs) {
        const classData = classDoc.data();
        const disciplineName = classData.disciplineName;
        
        // Se existe um especialista único para esta disciplina
        if (uniqueSpecialists[disciplineName]) {
          const targetTeacherId = uniqueSpecialists[disciplineName];
          
          // Só atualiza se o professor for diferente do atual
          if (classData.teacherId !== targetTeacherId) {
            await updateDoc(doc(db, 'classes', classDoc.id), {
              teacherId: targetTeacherId
            });
          }
        }
      }
    }
    
    console.log('Sincronização de professores concluída com sucesso.');
  } catch (error) {
    console.error('Erro ao sincronizar professores:', error);
    throw error;
  }
}
