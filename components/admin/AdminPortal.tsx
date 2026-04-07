'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  Calendar, 
  BookOpen, 
  Users, 
  AlertCircle, 
  Save, 
  LogOut, 
  Menu, 
  X, 
  Plus 
} from 'lucide-react';
import Image from 'next/image';
import { Button } from '../ui/Button';
import { SidebarItem } from './SidebarItem';
import { DashboardOverview } from './DashboardOverview';
import { SchedulesList } from './SchedulesList';
import { CoursesManager } from './CoursesManager';
import { TeachersManager } from './TeachersManager';
import { HolidaysManager } from './HolidaysManager';
import { NewScheduleModal } from './NewScheduleModal';
import { NewCourseModal } from './NewCourseModal';
import { NewTeacherModal } from './NewTeacherModal';
import { ScheduleDetailsModal } from './ScheduleDetailsModal';

interface AdminPortalProps {
  user: any;
  logout: () => void;
  teachers: any[];
  courses: any[];
  holidays: any[];
  schedules: any[];
  isAdmin: boolean;
  seedData: () => Promise<void>;
}

export function AdminPortal({ 
  user, 
  logout, 
  teachers, 
  courses, 
  holidays, 
  schedules, 
  isAdmin, 
  seedData 
}: AdminPortalProps) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNewScheduleModalOpen, setIsNewScheduleModalOpen] = useState(false);
  const [isNewCourseModalOpen, setIsNewCourseModalOpen] = useState(false);
  const [isNewTeacherModalOpen, setIsNewTeacherModalOpen] = useState(false);
  const [viewingScheduleId, setViewingScheduleId] = useState<string | null>(null);

  const viewingSchedule = schedules.find(s => s.id === viewingScheduleId);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden bg-white border-b border-gray-200 p-4 flex justify-between items-center sticky top-0 z-40">
        <h2 className="text-xl font-bold text-indigo-600">Esuda Acadêmico</h2>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
        >
          {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-gray-200 hidden md:block">
          <h2 className="text-xl font-bold text-indigo-600">Esuda Acadêmico</h2>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <SidebarItem 
            icon={<LayoutDashboard />} 
            label="Dashboard" 
            active={activeTab === 'dashboard'} 
            onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }} 
          />
          <SidebarItem 
            icon={<Calendar />} 
            label="Cronogramas" 
            active={activeTab === 'schedules'} 
            onClick={() => { setActiveTab('schedules'); setIsSidebarOpen(false); }} 
          />
          <SidebarItem 
            icon={<BookOpen />} 
            label="Cursos" 
            active={activeTab === 'courses'} 
            onClick={() => { setActiveTab('courses'); setIsSidebarOpen(false); }} 
          />
          <SidebarItem 
            icon={<Users />} 
            label="Docentes" 
            active={activeTab === 'teachers'} 
            onClick={() => { setActiveTab('teachers'); setIsSidebarOpen(false); }} 
          />
          <SidebarItem 
            icon={<AlertCircle />} 
            label="Feriados" 
            active={activeTab === 'holidays'} 
            onClick={() => { setActiveTab('holidays'); setIsSidebarOpen(false); }} 
          />
          {isAdmin && (
            <button 
              onClick={() => { seedData(); setIsSidebarOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-amber-600 hover:bg-amber-50 mt-4 border border-dashed border-amber-200"
            >
              <Save className="w-5 h-5" /> Popular Banco (2026)
            </button>
          )}
        </nav>
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            {user?.photoURL && (
              <Image 
                src={user.photoURL} 
                width={40} 
                height={40} 
                className="rounded-full" 
                alt={user.displayName || ''} 
                referrerPolicy="no-referrer"
              />
            )}
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">{user?.displayName}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
          <Button onClick={logout} variant="secondary" className="w-full justify-center">
            <LogOut className="w-4 h-4" /> Sair
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 capitalize">
            {activeTab === 'schedules' ? 'Cronogramas' : 
             activeTab === 'courses' ? 'Cursos' :
             activeTab === 'teachers' ? 'Docentes' :
             activeTab === 'holidays' ? 'Feriados' : 'Dashboard'}
          </h1>
          {isAdmin && activeTab !== 'dashboard' && (
            <Button className="w-full sm:w-auto" onClick={() => {
              if (activeTab === 'schedules') setIsNewScheduleModalOpen(true);
              if (activeTab === 'courses') setIsNewCourseModalOpen(true);
              if (activeTab === 'teachers') setIsNewTeacherModalOpen(true);
              if (activeTab === 'holidays') {
                const input = document.querySelector('input[type="date"]') as HTMLInputElement;
                input?.focus();
              }
            }}>
              <Plus className="w-5 h-5" /> Novo {
                activeTab === 'schedules' ? 'Cronograma' : 
                activeTab === 'courses' ? 'Curso' :
                activeTab === 'teachers' ? 'Docente' : 'Feriado'
              }
            </Button>
          )}
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'dashboard' && <DashboardOverview schedules={schedules} courses={courses} teachers={teachers} setActiveTab={setActiveTab} />}
            {activeTab === 'schedules' && <SchedulesList schedules={schedules} courses={courses} onSelect={(s) => setViewingScheduleId(s.id)} isAdmin={isAdmin} />}
            {activeTab === 'courses' && <CoursesManager courses={courses} isAdmin={isAdmin} />}
            {activeTab === 'teachers' && <TeachersManager teachers={teachers} courses={courses} isAdmin={isAdmin} />}
            {activeTab === 'holidays' && <HolidaysManager holidays={holidays} isAdmin={isAdmin} />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Modals */}
      {isNewScheduleModalOpen && (
        <NewScheduleModal 
          courses={courses} 
          holidays={holidays}
          teachers={teachers}
          onClose={() => setIsNewScheduleModalOpen(false)} 
        />
      )}
      {isNewCourseModalOpen && (
        <NewCourseModal 
          isAdmin={isAdmin}
          onClose={() => setIsNewCourseModalOpen(false)} 
        />
      )}
      {isNewTeacherModalOpen && (
        <NewTeacherModal 
          courses={courses}
          isAdmin={isAdmin}
          onClose={() => setIsNewTeacherModalOpen(false)} 
        />
      )}

      {viewingSchedule && (
        <ScheduleDetailsModal
          schedule={viewingSchedule}
          courses={courses}
          teachers={teachers}
          isAdmin={isAdmin}
          onClose={() => setViewingScheduleId(null)}
          holidays={holidays}
        />
      )}
    </div>
  );
}
