'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Holiday } from '@/lib/calendar';
import { PublicPortal } from '@/components/PublicPortal';
import { AdminPortal } from '@/components/admin/AdminPortal';
import { seedData } from '@/lib/seed';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

// --- Dashboard ---

function DashboardContent() {
  const { user, loading, login, logout, isAdmin, isLoggingIn } = useAuth();
  const searchParams = useSearchParams();
  const initialScheduleId = searchParams.get('schedule');
  
  const [teachers, setTeachers] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);

  // Fetch Data
  useEffect(() => {
    // Public data fetching (no user required)
    const unsubTeachers = onSnapshot(collection(db, 'teachers'), (snap) => {
      setTeachers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubCourses = onSnapshot(collection(db, 'courses'), (snap) => {
      setCourses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubHolidays = onSnapshot(collection(db, 'holidays'), (snap) => {
      setHolidays(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any);
    });
    const unsubSchedules = onSnapshot(query(collection(db, 'schedules'), orderBy('createdAt', 'desc')), (snap) => {
      setSchedules(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubTeachers();
      unsubCourses();
      unsubHolidays();
      unsubSchedules();
    };
  }, []);

  if (loading) return <div className="h-screen flex items-center justify-center bg-gray-50">Carregando...</div>;

  if (!isAdmin) {
    return (
      <PublicPortal 
        teachers={teachers} 
        courses={courses} 
        holidays={holidays} 
        schedules={schedules} 
        onLogin={login}
        isLoggingIn={isLoggingIn}
        user={user}
        logout={logout}
        initialScheduleId={initialScheduleId}
      />
    );
  }

  return (
    <AdminPortal 
      user={user}
      logout={logout}
      teachers={teachers}
      courses={courses}
      holidays={holidays}
      schedules={schedules}
      isAdmin={isAdmin}
      seedData={() => seedData(() => {})} // Pass a dummy setActiveTab if needed, or refactor seedData
    />
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center bg-gray-50">Carregando...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
