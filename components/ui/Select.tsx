'use client';

import React from 'react';

export const Select = ({ label, options = [], children, ...props }: any) => (
  <div className="space-y-1.5">
    {label && <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">{label}</label>}
    <select 
      {...props}
      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm font-medium appearance-none cursor-pointer"
    >
      {children || options.map((opt: any) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);
