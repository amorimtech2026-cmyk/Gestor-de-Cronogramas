import { addDays, isSaturday, format, parseISO, startOfDay, isSameDay } from 'date-fns';

export interface Holiday {
  date: string; // YYYY-MM-DD
  description: string;
}

export const COMMON_DISCIPLINES = [
  { name: "Gestão de Escritórios de Arquitetura e Engenharia: Branding e Precificação", modality: "Presencial" },
  { name: "Novas Fontes de Receita: Elaboração de Laudos e Perícias (EAD)", modality: "EAD" },
  { name: "Solução Criativa de Problemas Complexos (Design Thinking) (EAD)", modality: "EAD" },
  { name: "Práticas Simuladas: Estrutura Legal, Contábil e Empreendedorismo", modality: "Presencial" },
  { name: "Negociação e Gestão de Conflitos (EAD)", modality: "EAD" },
  { name: "Inteligência Artificial Aplicada", modality: "Presencial" },
  { name: "Competências Estratégicas, Liderança e Alta Performance (EAD)", modality: "EAD" },
  { name: "Marketing Pessoal e Digital para Arquitetos e Engenheiros", modality: "Presencial" },
  { name: "Metodologia da Pesquisa e Didática do Ensino Superior (EAD)", modality: "EAD" }
];

export const HOLIDAYS_2026: Holiday[] = [
  { date: '2026-02-16', description: 'Carnaval' },
  { date: '2026-03-06', description: 'Data Magna de PE' },
  { date: '2026-04-03', description: 'Sexta-feira Santa' },
  { date: '2026-05-01', description: 'Dia do Trabalho' },
  { date: '2026-09-07', description: 'Independência' },
  { date: '2026-10-12', description: 'N. Sra. Aparecida' },
  { date: '2026-10-19', description: 'Dia do Comerciário Recife' },
  { date: '2026-11-02', description: 'Finados' },
  { date: '2026-11-20', description: 'Consciência Negra' },
  { date: '2026-12-25', description: 'Natal' }
];

export function isHoliday(date: Date, holidays: Holiday[]): boolean {
  const dateStr = format(date, 'yyyy-MM-dd');
  return holidays?.some(h => h.date === dateStr) || false;
}

/**
 * Regra: NÃO haverá aula se:
 * O sábado for feriado OU a sexta-feira anterior for feriado OU a segunda-feira posterior for feriado.
 */
export function isSaturdayBlocked(saturday: Date, holidays: Holiday[]): boolean {
  if (!isSaturday(saturday)) return true;

  const friday = addDays(saturday, -1);
  const monday = addDays(saturday, 2);

  return isHoliday(friday, holidays) || isHoliday(saturday, holidays) || isHoliday(monday, holidays);
}

export function getNextAvailableSaturday(startDate: Date, holidays: Holiday[]): Date {
  let current = startOfDay(startDate);
  
  // Find the first saturday on or after startDate
  while (!isSaturday(current)) {
    current = addDays(current, 1);
  }

  // Check if this saturday is blocked, if so, move to next
  while (isSaturdayBlocked(current, holidays)) {
    current = addDays(current, 7);
  }

  return current;
}

export function generateFullSchedule(
  startDateStr: string,
  courseNames: string[],
  specificDisciplinesByCourse: Record<string, string[]>,
  holidays: Holiday[]
) {
  const startDate = parseISO(startDateStr);
  const schedule: any[] = [];
  let currentSaturday = getNextAvailableSaturday(startDate, holidays);

  // 1. Common Disciplines (9 disciplines, 2 saturdays each)
  for (let i = 0; i < COMMON_DISCIPLINES.length; i++) {
    const discipline = COMMON_DISCIPLINES[i];
    
    // First Saturday
    schedule.push({
      date: format(currentSaturday, 'yyyy-MM-dd'),
      disciplineName: discipline.name,
      order: i + 1,
      isCommon: true,
      courseId: 'all'
    });

    // Move to next available Saturday for the second session of the same discipline
    currentSaturday = getNextAvailableSaturday(addDays(currentSaturday, 7), holidays);
    
    schedule.push({
      date: format(currentSaturday, 'yyyy-MM-dd'),
      disciplineName: discipline.name,
      order: i + 1,
      isCommon: true,
      courseId: 'all'
    });

    // Move to next available Saturday for the next discipline
    currentSaturday = getNextAvailableSaturday(addDays(currentSaturday, 7), holidays);
  }

  // 2. Specific Disciplines (9 disciplines per course, 2 saturdays each)
  // After the 9th common discipline, courses split.
  // We'll generate them in parallel for the UI to show the split.
  
  const specificSchedules: Record<string, any[]> = {};
  courseNames.forEach(courseName => {
    specificSchedules[courseName] = [];
    let courseSaturday = currentSaturday; // Start from where common ended
    const disciplines = specificDisciplinesByCourse[courseName] || [];

    for (let i = 0; i < 9; i++) {
      const disciplineName = disciplines[i] || `Disciplina Específica ${i + 1}`;
      
      // First Saturday
      specificSchedules[courseName].push({
        date: format(courseSaturday, 'yyyy-MM-dd'),
        disciplineName: disciplineName,
        order: i + 10,
        isCommon: false,
        courseId: courseName
      });

      courseSaturday = getNextAvailableSaturday(addDays(courseSaturday, 7), holidays);

      // Second Saturday
      specificSchedules[courseName].push({
        date: format(courseSaturday, 'yyyy-MM-dd'),
        disciplineName: disciplineName,
        order: i + 10,
        isCommon: false,
        courseId: courseName
      });

      courseSaturday = getNextAvailableSaturday(addDays(courseSaturday, 7), holidays);
    }
  });

  return {
    common: schedule,
    specific: specificSchedules
  };
}
