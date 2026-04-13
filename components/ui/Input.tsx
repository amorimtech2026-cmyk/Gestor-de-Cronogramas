'use client';

import React from 'react';

export const Input = ({ label, className, ...props }: any) => (
  <div className={`space-y-1.5 ${className || ''}`}>
    {label && <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">{label}</label>}
    <input 
      {...props}
      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
    />
  </div>
);
