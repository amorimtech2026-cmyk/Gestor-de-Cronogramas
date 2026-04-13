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
  { date: '2026-01-01', description: 'Confraternização Universal' },
  { date: '2026-02-16', description: 'Carnaval (Segunda)' },
  { date: '2026-02-17', description: 'Carnaval (Terça)' },
  { date: '2026-03-06', description: 'Data Magna de PE' },
  { date: '2026-04-03', description: 'Sexta-feira Santa' },
  { date: '2026-04-21', description: 'Tiradentes' },
  { date: '2026-05-01', description: 'Dia do Trabalho' },
  { date: '2026-06-04', description: 'Corpus Christi' },
  { date: '2026-06-24', description: 'São João' },
  { date: '2026-07-16', description: 'Nossa Senhora do Carmo' },
  { date: '2026-09-07', description: 'Independência' },
  { date: '2026-10-12', description: 'N. Sra. Aparecida' },
  { date: '2026-10-19', description: 'Dia do Comerciário Recife' },
  { date: '2026-11-02', description: 'Finados' },
  { date: '2026-11-15', description: 'Proclamação da República' },
  { date: '2026-11-20', description: 'Consciência Negra' },
  { date: '2026-12-08', description: 'Nossa Senhora da Conceição' },
  { date: '2026-12-25', description: 'Natal' }
];

export const HOLIDAYS_2027: Holiday[] = [
  { date: '2027-01-01', description: 'Confraternização Universal' },
  { date: '2027-02-08', description: 'Carnaval (Segunda)' },
  { date: '2027-02-09', description: 'Carnaval (Terça)' },
  { date: '2027-03-06', description: 'Data Magna de PE' },
  { date: '2027-03-26', description: 'Paixão de Cristo' },
  { date: '2027-04-21', description: 'Tiradentes' },
  { date: '2027-05-01', description: 'Dia do Trabalhador' },
  { date: '2027-05-27', description: 'Corpus Christi' },
  { date: '2027-06-24', description: 'São João' },
  { date: '2027-07-16', description: 'Nossa Senhora do Carmo' },
  { date: '2027-09-07', description: 'Independência do Brasil' },
  { date: '2027-10-12', description: 'Nossa Senhora Aparecida' },
  { date: '2027-10-18', description: 'Dia do Comerciário Recife' },
  { date: '2027-11-02', description: 'Finados' },
  { date: '2027-11-15', description: 'Proclamação da República' },
  { date: '2027-11-20', description: 'Dia da Consciência Negra' },
  { date: '2027-12-08', description: 'Nossa Senhora da Conceição' },
  { date: '2027-12-25', description: 'Natal' }
];

export function getHolidaysForYear(year: number): Holiday[] {
  // Fixed holidays
  const fixed = [
    { month: 1, day: 1, desc: 'Confraternização Universal' },
    { month: 3, day: 6, desc: 'Data Magna de PE' },
    { month: 4, day: 21, desc: 'Tiradentes' },
    { month: 5, day: 1, desc: 'Dia do Trabalho' },
    { month: 6, day: 24, desc: 'São João' },
    { month: 7, day: 16, desc: 'Nossa Senhora do Carmo' },
    { month: 9, day: 7, desc: 'Independência' },
    { month: 10, day: 12, desc: 'N. Sra. Aparecida' },
    { month: 11, day: 2, desc: 'Finados' },
    { month: 11, day: 15, desc: 'Proclamação da República' },
    { month: 11, day: 20, desc: 'Consciência Negra' },
    { month: 12, day: 8, desc: 'Nossa Senhora da Conceição' },
    { month: 12, day: 25, desc: 'Natal' },
  ];

  const holidays: Holiday[] = fixed.map(h => ({
    date: `${year}-${String(h.month).padStart(2, '0')}-${String(h.day).padStart(2, '0')}`,
    description: h.desc
  }));

  // Variable holidays (Easter based)
  // Simple Easter calculation (Butcher's Algorithm)
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  const easter = new Date(year, month - 1, day);
  
  const addDaysToDate = (date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };

  const formatDate = (date: Date) => format(date, 'yyyy-MM-dd');

  const sextaSanta = addDaysToDate(easter, -2);
  const carnavalSegunda = addDaysToDate(easter, -48);
  const carnavalTerca = addDaysToDate(easter, -47);
  const corpusChristi = addDaysToDate(easter, 60);

  holidays.push({ date: formatDate(sextaSanta), description: 'Sexta-feira Santa' });
  holidays.push({ date: formatDate(carnavalSegunda), description: 'Carnaval (Segunda)' });
  holidays.push({ date: formatDate(carnavalTerca), description: 'Carnaval (Terça)' });
  holidays.push({ date: formatDate(corpusChristi), description: 'Corpus Christi' });

  // Dia do Comerciário (3rd Monday of October)
  let comerciario = new Date(year, 9, 1); // Oct 1
  let mondayCount = 0;
  while (mondayCount < 3) {
    if (comerciario.getDay() === 1) mondayCount++;
    if (mondayCount < 3) comerciario.setDate(comerciario.getDate() + 1);
  }
  holidays.push({ date: formatDate(comerciario), description: 'Dia do Comerciário Recife' });

  return holidays.sort((a, b) => a.date.localeCompare(b.date));
}

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

  // 0. Aula Inaugural
  schedule.push({
    date: format(currentSaturday, 'yyyy-MM-dd'),
    disciplineName: "Aula Inaugural",
    order: 0,
    isCommon: true,
    courseId: 'all'
  });

  currentSaturday = getNextAvailableSaturday(addDays(currentSaturday, 7), holidays);

  // 1. Common Disciplines (2 saturdays each)
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

  // 2. Specific Disciplines (2 saturdays each)
  // After the common disciplines, courses split.
  // We'll generate them in parallel for the UI to show the split.
  
  const specificSchedules: Record<string, any[]> = {};
  const commonCount = COMMON_DISCIPLINES.length;
  courseNames.forEach(courseName => {
    specificSchedules[courseName] = [];
    let courseSaturday = currentSaturday; // Start from where common ended
    const disciplines = specificDisciplinesByCourse[courseName] || [];
    const numDisciplines = disciplines.length;

    for (let i = 0; i < numDisciplines; i++) {
      const disciplineName = disciplines[i] || `Disciplina Específica ${i + 1}`;
      
      // First Saturday
      specificSchedules[courseName].push({
        date: format(courseSaturday, 'yyyy-MM-dd'),
        disciplineName: disciplineName,
        order: i + commonCount + 1,
        isCommon: false,
        courseId: courseName
      });

      courseSaturday = getNextAvailableSaturday(addDays(courseSaturday, 7), holidays);

      // Second Saturday
      specificSchedules[courseName].push({
        date: format(courseSaturday, 'yyyy-MM-dd'),
        disciplineName: disciplineName,
        order: i + commonCount + 1,
        isCommon: false,
        courseId: courseName
      });

      courseSaturday = getNextAvailableSaturday(addDays(courseSaturday, 7), holidays);
    }

    // 3. Cerimônia de Encerramento
    specificSchedules[courseName].push({
      date: format(courseSaturday, 'yyyy-MM-dd'),
      disciplineName: "Cerimônia de Encerramento",
      order: numDisciplines + commonCount + 1,
      isCommon: false,
      courseId: courseName
    });
  });

  return {
    common: schedule,
    specific: specificSchedules
  };
}

export function generateFullScheduleWithOrder(
  startDateStr: string,
  coursesData: { id: string, name: string, disciplines: string[] }[],
  commonDisciplines: { name: string, modality: string }[],
  holidays: Holiday[]
) {
  const startDate = parseISO(startDateStr);
  const schedule: any[] = [];
  let currentSaturday = getNextAvailableSaturday(startDate, holidays);

  // 0. Aula Inaugural
  schedule.push({
    date: format(currentSaturday, 'yyyy-MM-dd'),
    disciplineName: "Aula Inaugural",
    order: 0,
    isCommon: true,
    courseId: 'all',
    courseName: 'Fase Comum'
  });

  currentSaturday = getNextAvailableSaturday(addDays(currentSaturday, 7), holidays);

  // 1. Common Disciplines
  for (let i = 0; i < commonDisciplines.length; i++) {
    const discipline = commonDisciplines[i];
    
    // First Saturday
    schedule.push({
      date: format(currentSaturday, 'yyyy-MM-dd'),
      disciplineName: discipline.name,
      order: i + 1,
      classNumber: 1,
      isCommon: true,
      courseId: 'all',
      courseName: 'Fase Comum'
    });

    currentSaturday = getNextAvailableSaturday(addDays(currentSaturday, 7), holidays);
    
    // Second Saturday
    schedule.push({
      date: format(currentSaturday, 'yyyy-MM-dd'),
      disciplineName: discipline.name,
      order: i + 1,
      classNumber: 2,
      isCommon: true,
      courseId: 'all',
      courseName: 'Fase Comum'
    });

    currentSaturday = getNextAvailableSaturday(addDays(currentSaturday, 7), holidays);
  }

  // 2. Specific Disciplines
  const specificSchedules: Record<string, any[]> = {};
  coursesData.forEach(course => {
    specificSchedules[course.id] = [];
    let courseSaturday = currentSaturday;
    const disciplines = course.disciplines;

    for (let i = 0; i < disciplines.length; i++) {
      const disciplineName = disciplines[i];
      
      // First Saturday
      specificSchedules[course.id].push({
        date: format(courseSaturday, 'yyyy-MM-dd'),
        disciplineName: disciplineName,
        order: i + commonDisciplines.length + 1,
        classNumber: 1,
        isCommon: false,
        courseId: course.id,
        courseName: course.name
      });

      courseSaturday = getNextAvailableSaturday(addDays(courseSaturday, 7), holidays);

      // Second Saturday
      specificSchedules[course.id].push({
        date: format(courseSaturday, 'yyyy-MM-dd'),
        disciplineName: disciplineName,
        order: i + commonDisciplines.length + 1,
        classNumber: 2,
        isCommon: false,
        courseId: course.id,
        courseName: course.name
      });

      courseSaturday = getNextAvailableSaturday(addDays(courseSaturday, 7), holidays);
    }

    // 3. Cerimônia de Encerramento
    specificSchedules[course.id].push({
      date: format(courseSaturday, 'yyyy-MM-dd'),
      disciplineName: "Cerimônia de Encerramento",
      order: disciplines.length + commonDisciplines.length + 1,
      isCommon: false,
      courseId: course.id,
      courseName: course.name
    });
  });

  return {
    common: schedule,
    specific: specificSchedules
  };
}
