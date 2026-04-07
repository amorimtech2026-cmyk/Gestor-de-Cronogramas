'use client';

import React from 'react';
import { motion } from 'motion/react';
import { 
  BookOpen, 
  X, 
  Menu, 
  Calendar, 
  Clock, 
  RotateCcw, 
  Edit, 
  ArrowRight,
  Download,
  CheckCircle2
} from 'lucide-react';
import Image from 'next/image';
import { COMMON_DISCIPLINES } from '@/lib/calendar';

interface CourseLandingPageProps {
  course: any;
  onClose: () => void;
}

export function CourseLandingPage({ course, onClose }: CourseLandingPageProps) {
  const handleExportPDF = async () => {
    const html2pdf = (await import('html2pdf.js')).default;
    const element = document.getElementById('landing-page-content');
    if (!element) return;

    // Temporarily show the element for capture if it was hidden (though here it's visible)
    const opt = {
      margin: [0, 0],
      filename: `Propaganda_${course.name}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true,
        logging: false,
        letterRendering: true
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().from(element).set(opt).save();
  };

  return (
    <div className="fixed inset-0 z-[200] bg-white overflow-y-auto">
      {/* Controls */}
      <div className="fixed top-6 right-6 z-[210] flex gap-3">
        <button 
          onClick={handleExportPDF}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-full font-bold shadow-xl hover:bg-indigo-700 transition-all hover:scale-105"
        >
          <Download className="w-5 h-5" />
          <span>Baixar PDF</span>
        </button>
        <button 
          onClick={onClose}
          className="p-3 bg-white/80 backdrop-blur-md text-gray-900 rounded-full shadow-xl hover:bg-white transition-all border border-gray-100"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Landing Page Content */}
      <div id="landing-page-content" className="w-full max-w-[800px] mx-auto bg-white shadow-2xl min-h-screen pb-20 pdf-export-area">
        {/* Cabeçalho de Impacto */}
        <header className="relative h-[400px] flex flex-col justify-center px-12 text-white overflow-hidden">
          {course.imageUrl ? (
            <Image 
              src={course.imageUrl} 
              alt={course.name} 
              fill 
              className="object-cover" 
              priority
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="absolute inset-0 bg-indigo-900" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#1e293b] via-[#1e293b]/80 to-[#1e293b]/40" />
          
          <div className="relative z-10 space-y-6">
            <div className="inline-block bg-indigo-600 text-white px-4 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-widest">
              Inscrições Abertas
            </div>
            <h1 className="text-4xl sm:text-5xl font-black leading-tight max-w-2xl">
              {course.name}
            </h1>
            <p className="text-xl text-gray-200 max-w-xl font-medium leading-relaxed">
              {course.marketingSummary || 'Desenvolva competências de alto nível e transforme sua carreira com a excelência ESUDA.'}
            </p>
          </div>
        </header>

        {/* Caixa de Informações Técnicas */}
        <div className="px-12 -mt-12 relative z-20">
          <div className="bg-white border border-gray-100 rounded-[32px] p-8 shadow-2xl grid grid-cols-2 md:grid-cols-3 gap-y-8 gap-x-4">
            <div className="text-center">
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Carga Horária</p>
              <p className="text-sm font-bold text-gray-900">{course.workload || '360 Horas'}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Formato</p>
              <p className="text-sm font-bold text-gray-900">{course.format || 'Presencial Conectado'}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Dias</p>
              <p className="text-sm font-bold text-gray-900">{course.classDays || 'Sábados Quinzenais'}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Horário</p>
              <p className="text-sm font-bold text-gray-900">{course.classTime || '08:00 às 17:00'}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Duração</p>
              <p className="text-sm font-bold text-gray-900">{course.duration || '18 Meses'}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Inscrições</p>
              <p className="text-sm font-bold text-gray-900">{course.enrollmentPeriod || 'Abertas'}</p>
            </div>
            <div className="text-center col-span-2 md:col-span-1">
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Início das Aulas</p>
              <p className="text-sm font-bold text-gray-900">{course.startDateInfo || 'Agosto de 2026'}</p>
            </div>
          </div>
        </div>

        {/* Sobre o Curso */}
        <section className="px-12 py-16 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-1.5 h-8 bg-indigo-600 rounded-full" />
            <h2 className="text-2xl font-black text-gray-900">Sobre o Curso</h2>
          </div>
          <div className="text-gray-600 text-base leading-relaxed text-justify whitespace-pre-wrap">
            {course.fullDescription || course.marketingSummary || 'Este curso oferece uma formação sólida e atualizada, preparando o aluno para os desafios reais do mercado de trabalho com uma metodologia prática e focada em resultados.'}
          </div>
        </section>

        {/* O Novo Modelo Educacional Esuda */}
        <section className="mx-12 p-10 bg-indigo-50 rounded-[40px] border border-indigo-100 space-y-6">
          <h2 className="text-2xl font-black text-indigo-700">O Novo Modelo Educacional Esuda</h2>
          <p className="text-gray-700 text-base leading-relaxed font-medium">
            O mercado de trabalho atual não exige apenas especialistas técnicos, mas líderes capazes de navegar pela complexidade dos negócios. O grande diferencial da Esuda é o nosso Tronco Comum de disciplinas. Entendemos que todo profissional de excelência precisa dominar as bases de inovação, marketing, gestão de pessoas e liderança, independentemente de sua área específica. Ao unir a profundidade técnica com essa base gerencial robusta, garantimos que nossos alunos possuam uma visão 360 graus da organização, tornando-se profissionais completos e altamente competitivos para ocupar as posições mais estratégicas do mercado.
          </p>
          <div className="grid grid-cols-2 gap-4 pt-4">
            {['Visão Sistêmica', 'Liderança Ativa', 'Inovação Prática', 'Gestão de Negócios'].map((benefit) => (
              <div key={benefit} className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5" />
                <span>{benefit}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Matriz Curricular */}
        <section className="px-12 py-16 space-y-10">
          <div className="flex items-center gap-4">
            <div className="w-1.5 h-8 bg-indigo-600 rounded-full" />
            <h2 className="text-2xl font-black text-gray-900">Matriz Curricular</h2>
          </div>

          <div className="space-y-12">
            {/* Tronco Comum */}
            <div className="space-y-6">
              <h3 className="text-xs font-black text-indigo-500 uppercase tracking-[0.2em]">Tronco Comum (Base de Excelência)</h3>
              <div className="grid grid-cols-1 gap-3">
                {COMMON_DISCIPLINES.map((d, i) => (
                  <div key={i} className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100 group hover:border-indigo-200 transition-colors">
                    <div className="w-8 h-8 bg-white border border-gray-200 rounded-xl flex items-center justify-center text-xs font-black text-indigo-600 shadow-sm">
                      {String(i + 1).padStart(2, '0')}
                    </div>
                    <span className="text-sm font-bold text-gray-800">{d.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Específicas */}
            <div className="space-y-6">
              <h3 className="text-xs font-black text-indigo-500 uppercase tracking-[0.2em]">Disciplinas Específicas do Curso</h3>
              <div className="grid grid-cols-1 gap-3">
                {(course.specificDisciplines || []).map((d: string, i: number) => (
                  <div key={i} className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100 group hover:border-indigo-200 transition-colors">
                    <div className="w-8 h-8 bg-white border border-gray-200 rounded-xl flex items-center justify-center text-xs font-black text-indigo-600 shadow-sm">
                      {String(i + COMMON_DISCIPLINES.length + 1).padStart(2, '0')}
                    </div>
                    <span className="text-sm font-bold text-gray-800">{d}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Chamada de Fechamento */}
        <footer className="mx-12 mb-20 p-12 bg-[#1e293b] rounded-[40px] text-center space-y-8 shadow-2xl shadow-indigo-100">
          <div className="space-y-4">
            <h2 className="text-3xl font-black text-white">Pronto para transformar sua carreira?</h2>
            <p className="text-gray-400 text-lg max-w-md mx-auto">As vagas são limitadas para garantir a qualidade da interação entre alunos e docentes.</p>
          </div>
          <a 
            href={course.websiteUrl || "https://esuda.edu.br/posgraduacao/"}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-indigo-600 text-white px-10 py-5 rounded-2xl font-black text-lg shadow-xl hover:bg-indigo-700 transition-all hover:scale-105"
          >
            Quero me matricular agora
          </a>
        </footer>
      </div>
    </div>
  );
}
