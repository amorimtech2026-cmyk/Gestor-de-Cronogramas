import { collection, addDoc, serverTimestamp, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';

export const seedData = async (setActiveTab: (tab: string) => void) => {
  console.log('Iniciando carga de dados...');
  
  try {
    // 0. Clear existing data to avoid duplicates
    const collectionsToClear = ['holidays', 'courses'];
    for (const collName of collectionsToClear) {
      const snap = await getDocs(collection(db, collName));
      for (const d of snap.docs) {
        await deleteDoc(doc(db, collName, d.id));
      }
    }

    // 1. Holidays
    const holidaysToSeed = [
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

    for (const h of holidaysToSeed) {
      await addDoc(collection(db, 'holidays'), h);
    }

    // 2. Courses
    const coursesToSeed = [
      {
        name: "Design de Interiores Contemporâneo",
        imageUrl: "https://i.postimg.cc/1z7b2pRB/DESIGN-DE-INTER-CApa.png",
        marketingSummary: "Transforme espaços com criatividade e técnica. Uma abordagem contemporânea para o design de interiores.",
        fullDescription: "O curso de Especialização em Design de Interiores Contemporâneo da ESUDA foca na união entre estética, funcionalidade e tecnologia. Prepare-se para atuar em projetos residenciais e comerciais de alto padrão, utilizando as tendências mais recentes do mercado.\n\nO curso aborda desde a história do design até as mais modernas técnicas de luminotécnica, acústica e design biofílico, preparando o profissional para os desafios de um mercado em constante evolução.",
        workload: "360h",
        format: "Presencial, Remoto (ao vivo)",
        classDays: "Sábados",
        classTime: "08:00 - 18:00",
        duration: "10 meses",
        enrollmentPeriod: "Inscrições Abertas",
        startDateInfo: "Março de 2026",
        enrollmentStatus: "Abertas",
        websiteUrl: "https://esuda.edu.br/posgraduacao/design-de-interiores-contemporaneo/",
        specificDisciplines: [
          { name: "História e Teoria do Design de Interiores", syllabus: "" },
          { name: "Ergonomia e Antropometria Aplicada", syllabus: "" },
          { name: "Luminotécnica e Acústica em Interiores", syllabus: "" },
          { name: "Materiais e Revestimentos Contemporâneos", syllabus: "" },
          { name: "Projeto de Interiores Residenciais", syllabus: "" },
          { name: "Projeto de Interiores Comerciais e Corporativos", syllabus: "" },
          { name: "Detalhamento de Mobiliário e Marcenaria", syllabus: "" },
          { name: "Paisagismo e Design Biofílico", syllabus: "" },
          { name: "Gestão de Escritório e Empreendedorismo", syllabus: "" }
        ]
      },
      {
        name: "Gestão de Projetos e Obras, Orçamento e Perícia",
        imageUrl: "https://i.postimg.cc/Gh9KgZ8M/GEST-DE-PROJ-E-OBRAS-CAPA.png",
        marketingSummary: "Eficiência, lucro e sustentabilidade: domine o canteiro de obras com as melhores práticas de gestão.",
        fullDescription: "Aprenda as melhores práticas de Lean Construction, orçamentação estratégica e gestão de pleitos (claims). Este curso é focado em resultados reais, capacitando você para liderar equipes, reduzir desperdícios e entregar obras com excelência técnica e financeira.\n\nIdeal para engenheiros e arquitetos que buscam cargos de liderança e gestão estratégica no setor da construção civil.",
        workload: "360h",
        format: "Presencial, Remoto (ao vivo)",
        classDays: "Sábados",
        classTime: "08:00 - 18:00",
        duration: "10 meses",
        enrollmentPeriod: "Inscrições Abertas",
        startDateInfo: "31/01/2026",
        enrollmentStatus: "Abertas",
        websiteUrl: "https://esuda.edu.br/posgraduacao/gestao-de-projetos-e-obras-orcamento-e-pericia/",
        specificDisciplines: [
          { name: "Técnicas de Coordenação e Compatibilização de Projetos", syllabus: "" },
          { name: "Técnicas de Orçamentos, Cobranças e Custos de Projetos", syllabus: "" },
          { name: "Técnicas de Orçamentos, Cobranças e Custos de Obras", syllabus: "" },
          { name: "Técnicas de Planejamento e Coordenação de Obras", syllabus: "" },
          { name: "Lean Construction, Last Planner System e Logística de Canteiro", syllabus: "" },
          { name: "Engenharia de Segurança e Normas de Desempenho", syllabus: "" },
          { name: "Eficiência Energética e Sustentabilidade na Construção Civil", syllabus: "" },
          { name: "Administração Contratual, Medições e Gestão de Pleitos (Claims)", syllabus: "" },
          { name: "Sistemas Informatizados de Gestão Integrada e BI (ERP, CDE e Power BI)", syllabus: "" }
        ]
      },
      {
        name: "Engenharia e Gestão da Manutenção Predial na Construção 4.0",
        imageUrl: "https://i.postimg.cc/Kv4fpdkq/engen-construc-4-0.png",
        marketingSummary: "Lidere a eficiência operacional na era da tecnologia preditiva e gestão de ativos inteligentes.",
        fullDescription: "O futuro da manutenção é inteligente. Com foco em IoT, Sensores, Engenharia Diagnóstica e Gestão de Ativos com BIM 7D, este curso capacita você para garantir a longevidade e a valorização patrimonial de edificações.\n\nUtilize o que há de mais moderno na Construção 4.0 para otimizar processos de manutenção e reduzir custos operacionais em grandes empreendimentos.",
        workload: "360h",
        format: "Presencial, Remoto (ao vivo)",
        classDays: "Sábados",
        classTime: "08:00 - 18:00",
        duration: "10 meses",
        enrollmentPeriod: "Inscrições Abertas",
        startDateInfo: "31/01/2026",
        enrollmentStatus: "Abertas",
        websiteUrl: "https://esuda.edu.br/posgraduacao/engenharia-e-gestao-da-manutencao-predial-na-construcao-4-0/",
        specificDisciplines: [
          { name: "Engenharia Diagnóstica: Terapia Predial e Plano de Intervenção", syllabus: "" },
          { name: "Patologias Construtivas em Estruturas e Sistemas de Envoltória", syllabus: "" },
          { name: "Manutenção Avançada em Instalações Prediais (Elétrica, Hidráulica, HVAC)", syllabus: "" },
          { name: "Engenharia Condominial e Gestão de Sistemas de Segurança e Transporte", syllabus: "" },
          { name: "Termografia Infravermelha e Drones na Inspeção de Ativos", syllabus: "" },
          { name: "Manutenção Preditiva: IoT, Sensores Inteligentes e Automação Predial", syllabus: "" },
          { name: "CMMS e GMAO: Implementação de Sistemas de Gestão da Manutenção", syllabus: "" },
          { name: "Gestão da Manutenção: Planejamento, KPIs e Conformidade Operacional", syllabus: "" },
          { name: "Gestão de Ativos com BIM 7D (FM) e Orçamentação Preditiva", syllabus: "" }
        ]
      },
      {
        name: "Acústica Arquitetônica e Iluminação",
        imageUrl: "https://i.postimg.cc/tJ8qjKXs/ACUSTIC-ARQUITETO-CAPA.png",
        marketingSummary: "Onde a técnica encontra o conforto: projete experiências sensoriais de alto impacto.",
        fullDescription: "Especialize-se em criar ambientes saudáveis e produtivos através do som e da luz. Do design residencial à acústica de grandes teatros e iluminação urbana, domine as ferramentas para unir estética e performance técnica.\n\nO curso oferece uma base sólida em física do som e da luz, aplicada a projetos arquitetônicos reais.",
        workload: "360h",
        format: "Presencial, Remoto (ao vivo)",
        classDays: "Sábados",
        classTime: "08:00 - 18:00",
        duration: "10 meses",
        enrollmentPeriod: "Inscrições Abertas",
        startDateInfo: "Junho de 2026",
        enrollmentStatus: "Abertas",
        websiteUrl: "https://esuda.edu.br/posgraduacao/acustica-arquitetonica-e-iluminacao/",
        specificDisciplines: [
          { name: "Acústica Gráfica e Normas", syllabus: "" },
          { name: "Estudo das Tipologias Internas I: Ambientes Residenciais e Comerciais", syllabus: "" },
          { name: "Estudo das Tipologias Internas II: Estúdios, Teatros e Cinemas", syllabus: "" },
          { name: "Estudo das Tipologias Internas III: Grandes Ambientes", syllabus: "" },
          { name: "Acústica e Iluminação Urbana", syllabus: "" },
          { name: "Iluminação, Conceituação e Normas", syllabus: "" },
          { name: "Iluminação Residencial", syllabus: "" },
          { name: "Iluminação Comercial", syllabus: "" },
          { name: "Iluminação Externa: Jardins, Praças e Edificações Históricas", syllabus: "" }
        ]
      },
      {
        name: "Engenharia Legal e Perícias: Avaliações e Desempenho",
        imageUrl: "https://i.postimg.cc/fy1zNGwJ/engenharia-legal-capa.png",
        marketingSummary: "Seja a autoridade técnica que o mercado jurídico e imobiliário confia. Domine a arte da perícia.",
        fullDescription: "Domine a arte da perícia e avaliação imobiliária com foco em patologias construtivas, auditoria predial e conformidade com a NBR 15.575. Este curso prepara você para atuar com precisão técnica e segurança jurídica.\n\nTorne-se um especialista indispensável em laudos e perícias complexas, atuando junto ao poder judiciário e grandes empresas do setor imobiliário.",
        workload: "360h",
        format: "Presencial, Remoto (ao vivo)",
        classDays: "Sábados",
        classTime: "08:00 - 18:00",
        duration: "10 meses",
        enrollmentPeriod: "Inscrições Abertas",
        startDateInfo: "Julho de 2026",
        enrollmentStatus: "Abertas",
        websiteUrl: "https://esuda.edu.br/posgraduacao/engenharia-legal-e-pericias-avaliacoes-e-desempenho/",
        specificDisciplines: [
          { name: "Patologia das Construções, Investigação e Responsabilidade Civil", syllabus: "" },
          { name: "Auditoria Predial e NBR 16.747: Classificação de Risco e Laudos", syllabus: "" },
          { name: "Avaliação de Imóveis I: Método Comparativo (Foco Urbano e Inferência Estatística)", syllabus: "" },
          { name: "Avaliação de Imóveis II: Renda, Rurais e Laudos Complexos", syllabus: "" },
          { name: "Perícias Judiciais e Vistorias Cautelares de Vizinhança", syllabus: "" },
          { name: "Perícia em Desempenho: Verificação Judicial da NBR 15.575", syllabus: "" },
          { name: "Simulação Computacional (BIM 6D) e Análise de Ciclo de Vida (ACV) Legal", syllabus: "" },
          { name: "Certificações e Auditoria de Compliance Técnico Legal", syllabus: "" },
          { name: "Engenharia Legal Aplicada: Responsabilidade Civil, Ética e Fiscalização", syllabus: "" }
        ]
      },
      {
        name: "Tecnologia BIM na Construção Civil",
        imageUrl: "https://i.postimg.cc/8Ps4XqJ0/TECNOLOGIA-BIM-CAPA-1.png",
        marketingSummary: "Vença o desafio da digitalização e transforme sua carreira com o BIM além da modelagem.",
        fullDescription: "Vá além da modelagem. Aprenda a integrar processos, otimizar custos e utilizar Inteligência Artificial para elevar o patamar dos seus projetos e obras. Uma formação completa que abrange desde a conceituação até a gestão estratégica em CDE.\n\nO BIM é o presente e o futuro da construção civil. Este curso prepara você para liderar a transformação digital em escritórios e construtoras.",
        workload: "360h",
        format: "Presencial, Remoto (ao vivo)",
        classDays: "Sábados",
        classTime: "08:00 - 18:00",
        duration: "10 meses",
        enrollmentPeriod: "Inscrições Abertas",
        startDateInfo: "Agosto de 2026",
        enrollmentStatus: "Abertas",
        websiteUrl: "https://esuda.edu.br/posgraduacao/tecnologia-bim-na-construcao-civil/",
        specificDisciplines: [
          { name: "BIM - CONCEITUAÇÃO BÁSICA DO PLANEJAMENTO AO PÓS OBRA.", syllabus: "" },
          { name: "MODELAGEM ARQUITETÔNICA", syllabus: "" },
          { name: "MODELAGEM PARAMÉTRICA", syllabus: "" },
          { name: "MODELAGEM ESTRUTURAL", syllabus: "" },
          { name: "MODELAGEM DAS INSTALAÇÕES", syllabus: "" },
          { name: "BIM NO PLANEJAMENTO E ORÇAMENTAÇÃO", syllabus: "" },
          { name: "GESTÃO E COMPATIBILIZAÇÃO DE PROJETOS", syllabus: "" },
          { name: "COLABORAÇÃO E INTEGRAÇÃO COM CDE", syllabus: "" },
          { name: "BIM, ANÁLISE DE DADOS E IA", syllabus: "" }
        ]
      },
      {
        name: "Neuroarquitetura",
        imageUrl: "https://i.postimg.cc/tJ8qjKX7/NEUROARQUITETURA-CAPA.png",
        marketingSummary: "Projete ambientes que influenciam positivamente o comportamento e o bem-estar humano.",
        fullDescription: "A Neuroarquitetura estuda como o ambiente físico impacta o cérebro e o comportamento humano. Este curso inovador une neurociência e arquitetura para criar espaços que promovem saúde, produtividade e bem-estar.\n\nEntenda como cores, formas, iluminação e texturas afetam as emoções e a cognição, e aplique esse conhecimento em projetos residenciais, corporativos, escolares e hospitalares.",
        workload: "360h",
        format: "Presencial, Remoto (ao vivo)",
        classDays: "Sábados",
        classTime: "08:00 - 18:00",
        duration: "10 meses",
        enrollmentPeriod: "Inscrições Abertas",
        startDateInfo: "31/01/2026",
        enrollmentStatus: "Abertas",
        websiteUrl: "https://esuda.edu.br/posgraduacao/neuroarquitetura/",
        specificDisciplines: [
          { name: "NEUROCIÊNCIA APLICADA À ARQUITETURA", syllabus: "" },
          { name: "RITMO BIOLÓGICO E FATORES HUMANOS", syllabus: "" },
          { name: "NEUROARQUITETURA E DESIGN COGNITIVO", syllabus: "" },
          { name: "ESPAÇOS RESIDENCIAIS E COMERCIAIS: APLICAÇÕES E PRINCÍPIOS DA NEURARQUITETURA", syllabus: "" },
          { name: "ESPAÇOS COORPORATIVOS: APLICAÇÕES E PRINCÍPIOS DA NEURARQUITETURA", syllabus: "" },
          { name: "ESTÍMULOS E PERCEPÇÕES: NEUROARQUITETURA EM ESPAÇOS VERDES", syllabus: "" },
          { name: "NEUROILUMINAÇÃO", syllabus: "" },
          { name: "DESIGN BIOFÍLICO", syllabus: "" },
          { name: "NEUROURBANISMO", syllabus: "" }
        ]
      }
    ];

    for (const c of coursesToSeed) {
      await addDoc(collection(db, 'courses'), {
        ...c,
        createdAt: serverTimestamp()
      });
    }

    console.log('Dados cadastrados com sucesso!');
    setActiveTab('courses');
  } catch (e) {
    console.error('Erro ao popular banco:', e);
    handleFirestoreError(e, OperationType.WRITE, 'seed');
  }
};
