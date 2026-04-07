'use client';

import React from 'react';
import { motion } from 'motion/react';
import { 
  BookOpen, 
  X, 
  Download,
  CheckCircle2,
  GraduationCap,
  Star,
  Users,
  Target,
  Zap
} from 'lucide-react';
import Image from 'next/image';
import { COMMON_DISCIPLINES } from '@/lib/calendar';

interface MarketingCatalogProps {
  courses: any[];
  onClose: () => void;
}

export function MarketingCatalog({ courses, onClose }: MarketingCatalogProps) {
  const handleExportPDF = async () => {
    const html2pdf = (await import('html2pdf.js')).default;
    const element = document.getElementById('marketing-catalog-content');
    if (!element) return;

    const opt = {
      margin: [0, 0],
      filename: `Catalogo_Pos_Graduacao_ESUDA.pdf`,
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
          <span>Baixar Catálogo Completo (PDF)</span>
        </button>
        <button 
          onClick={onClose}
          className="p-3 bg-white/80 backdrop-blur-md text-gray-900 rounded-full shadow-xl hover:bg-white transition-all border border-gray-100"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Catalog Content */}
      <div id="marketing-catalog-content" className="w-full max-w-[900px] mx-auto bg-white shadow-2xl min-h-screen pdf-export-area">
        
        {/* PAGE 1: COVER */}
        <section className="relative h-[1120px] flex flex-col justify-center items-center text-center px-20 text-white overflow-hidden bg-[#1e293b]">
          <div className="absolute inset-0 opacity-20">
            <Image 
              src="https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1200&q=80" 
              alt="Background" 
              fill 
              className="object-cover"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-900/60 via-[#1e293b] to-[#1e293b]" />
          
          <div className="relative z-10 space-y-12">
            <div className="w-32 h-32 bg-white rounded-3xl flex items-center justify-center mx-auto shadow-2xl rotate-3">
              <GraduationCap className="w-16 h-16 text-indigo-600" />
            </div>
            <div className="space-y-4">
              <h1 className="text-6xl font-black tracking-tighter leading-none">
                GUIA DE CURSOS <br />
                <span className="text-indigo-400">PÓS-GRADUAÇÃO</span>
              </h1>
              <p className="text-2xl font-light text-gray-300 tracking-widest uppercase">Faculdade ESUDA</p>
            </div>
            <div className="w-24 h-1 bg-indigo-500 mx-auto rounded-full" />
            <p className="text-xl text-gray-400 max-w-xl mx-auto leading-relaxed">
              Conheça o Novo Modelo Educacional que une excelência técnica, gestão estratégica e liderança inovadora.
            </p>
          </div>

          <div className="absolute bottom-20 left-0 right-0 flex justify-center gap-12 text-indigo-300/50">
            <Star className="w-8 h-8" />
            <Users className="w-8 h-8" />
            <Target className="w-8 h-8" />
          </div>
        </section>

        {/* PAGE 2: NOVO MODELO EDUCACIONAL */}
        <section className="min-h-[1120px] p-20 space-y-16 bg-gray-50">
          <div className="space-y-8">
            <div className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-full text-sm font-black uppercase tracking-[0.3em]">
              O Diferencial
            </div>
            <h2 className="text-5xl font-black text-gray-900 leading-tight">
              O Novo Modelo <br />
              <span className="text-indigo-600">Educacional Esuda</span>
            </h2>
            <div className="w-20 h-2 bg-indigo-600 rounded-full" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <p className="text-lg text-gray-700 leading-relaxed font-medium text-justify">
                O mercado de trabalho atual não exige apenas especialistas técnicos, mas líderes capazes de navegar pela complexidade dos negócios. O grande diferencial da Esuda é o nosso **Tronco Comum de disciplinas**. 
              </p>
              <p className="text-lg text-gray-700 leading-relaxed font-medium text-justify">
                Entendemos que todo profissional de excelência precisa dominar as bases de inovação, marketing, gestão de pessoas e liderança, independentemente de sua área específica. 
              </p>
            </div>
            <div className="bg-white p-8 rounded-[40px] shadow-xl border border-gray-100 space-y-6">
              <div className="flex items-center gap-4 text-indigo-600">
                <Zap className="w-8 h-8" />
                <h3 className="text-xl font-black">Benefícios Diretos</h3>
              </div>
              <ul className="space-y-4">
                {[
                  'Visão Sistêmica da Organização',
                  'Liderança e Gestão de Alta Performance',
                  'Inovação e Pensamento Estratégico',
                  'Marketing e Branding Pessoal',
                  'Networking Multidisciplinar'
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-gray-700 font-bold">
                    <CheckCircle2 className="w-5 h-5 text-indigo-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="space-y-8 pt-10">
            <h3 className="text-xs font-black text-indigo-500 uppercase tracking-[0.4em] text-center">Matriz do Tronco Comum (Para todos os cursos)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {COMMON_DISCIPLINES.map((d, i) => (
                <div key={i} className="flex items-center gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-sm font-black text-indigo-600">
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <span className="text-sm font-bold text-gray-800">{d.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PAGES 3+: THE COURSES */}
        {courses.map((course, index) => (
          <section key={course.id} className="min-h-[1120px] p-20 space-y-12 border-t border-gray-100 relative overflow-hidden">
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-bl-[200px] -z-10 opacity-50" />
            
            <div className="flex justify-between items-start">
              <div className="space-y-4 max-w-xl">
                <div className="text-xs font-black text-indigo-600 uppercase tracking-[0.3em]">Curso {index + 1} de {courses.length}</div>
                <h2 className="text-4xl font-black text-gray-900 leading-tight">{course.name}</h2>
                <p className="text-lg text-gray-500 font-medium italic">&quot;{course.marketingSummary}&quot;</p>
              </div>
              <div className="w-24 h-24 bg-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-indigo-100">
                <BookOpen className="w-10 h-10" />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Carga Horária', value: course.workload || '360h' },
                { label: 'Formato', value: course.format || 'Presencial/Remoto' },
                { label: 'Duração', value: course.duration || '10 meses' },
                { label: 'Início', value: course.startDateInfo || 'A definir' }
              ].map((info) => (
                <div key={info.label} className="bg-gray-50 p-6 rounded-3xl border border-gray-100 text-center">
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">{info.label}</p>
                  <p className="text-sm font-bold text-gray-900">{info.value}</p>
                </div>
              ))}
            </div>

            <div className="space-y-6">
              <h3 className="text-lg font-black text-gray-900 border-l-4 border-indigo-600 pl-4">Sobre a Especialização</h3>
              <p className="text-gray-600 text-base leading-relaxed text-justify whitespace-pre-wrap">
                {course.fullDescription || course.marketingSummary}
              </p>
            </div>

            <div className="space-y-6">
              <h3 className="text-lg font-black text-gray-900 border-l-4 border-indigo-600 pl-4">Disciplinas Específicas</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(course.specificDisciplines || []).map((d: string, i: number) => (
                  <div key={i} className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-xs font-black text-indigo-600">
                      {String(i + COMMON_DISCIPLINES.length + 1).padStart(2, '0')}
                    </div>
                    <span className="text-xs font-bold text-gray-800">{d}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-10 flex justify-center">
              <div className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl">
                Matrículas Abertas
              </div>
            </div>
          </section>
        ))}

        {/* FINAL PAGE: CONTACT & CTA */}
        <section className="h-[1120px] flex flex-col justify-center items-center text-center p-20 bg-[#1e293b] text-white">
          <div className="space-y-12">
            <h2 className="text-5xl font-black leading-tight">
              Sua jornada de <br />
              <span className="text-indigo-400">sucesso começa aqui.</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-md mx-auto">
              Junte-se à elite dos profissionais de Engenharia e Arquitetura formados pela ESUDA.
            </p>
            <div className="space-y-4">
              <div className="bg-indigo-600 text-white px-12 py-6 rounded-3xl font-black text-2xl shadow-2xl inline-block">
                esuda.edu.br
              </div>
              <p className="text-sm font-bold text-indigo-400 uppercase tracking-[0.3em]">Inscrições pelo site</p>
            </div>
          </div>
          
          <div className="mt-32 pt-20 border-t border-white/10 w-full max-w-md">
            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">
              Faculdade ESUDA - Pós-Graduação <br />
              Recife, PE
            </p>
          </div>
        </section>

      </div>
    </div>
  );
}
