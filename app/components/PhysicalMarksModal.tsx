// src/app/components/PhysicalMarksModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X } from 'lucide-react';

interface PhysicalMarksModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PhysicalMarksModal({ isOpen, onClose, onSuccess }: PhysicalMarksModalProps) {
  const [formData, setFormData] = useState({
    instituteName: '',
    studentName: '',
    indexNumber: '',
    subjectName: '',
    className: '',
    marks: '',
    grade: 'A'
  });

  const [classesList, setClassesList] = useState<any[]>([]);
  const [isOtherClass, setIsOtherClass] = useState(false);
  const [customClass, setCustomClass] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // ගුරුවරයාගේ පන්ති ලැයිස්තුව ලබා ගැනීම (ViewClassesPage API)
  useEffect(() => {
    if (!isOpen) return;
    const fetchTeacherClasses = async () => {
      try {
        const token = localStorage.getItem('token');
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        
        const res = await axios.get(`${API_URL}/api/classes/my-classes`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.data) {
          setClassesList(res.data);
        }
      } catch (error) {
        console.error('Error fetching teacher classes:', error);
      }
    };

    fetchTeacherClasses();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'className') {
      if (value === 'OTHER_CUSTOM') {
        setIsOtherClass(true);
        setFormData({ ...formData, className: '' });
      } else {
        setIsOtherClass(false);
        setFormData({ ...formData, className: value });
      }
      return;
    }

    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });

    const finalClassName = isOtherClass ? customClass : formData.className;

    if (!finalClassName) {
      setMessage({ text: 'Please select or enter a valid class name.', type: 'error' });
      setLoading(false);
      return;
    }

    const marksNum = Number(formData.marks);
    if (marksNum < 0 || marksNum > 100) {
      setMessage({ text: 'Marks must be between 0 and 100.', type: 'error' });
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setMessage({ text: 'Your login session was not found. Please log in again.', type: 'error' });
        return;
      }

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await axios.post(
        `${API_URL}/api/physical-marks/add`,
        {
          ...formData,
          className: finalClassName
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (response.data.success) {
        setMessage({ text: 'Physical marks successfully saved to the database!', type: 'success' });
        setFormData({
          instituteName: '',
          studentName: '',
          indexNumber: '',
          subjectName: '',
          className: '',
          marks: '',
          grade: 'A'
        });
        setCustomClass('');
        setIsOtherClass(false);
        onSuccess(); // Refresh the list in parent view
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (error: any) {
      setMessage({ 
        text: error.response?.data?.message || 'An error occurred while submitting marks.', 
        type: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl p-6 w-full max-w-lg relative animate-in fade-in zoom-in duration-200">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white bg-slate-100 dark:bg-slate-800 transition-colors"
        >
          <X size={18} />
        </button>

        <h1 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Physical Paper Marks</h1>
        <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">Enter the marks obtained by students for physical classroom papers.</p>

        {message.text && (
          <div className={`p-3 mb-4 rounded-xl text-xs font-medium ${message.type === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Student Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">Student Name *</label>
              <input
                type="text"
                name="studentName"
                value={formData.studentName}
                onChange={handleChange}
                required
                className="w-full px-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. A.B. Perera"
              />
            </div>

            {/* Index Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">Index Number *</label>
              <input
                type="text"
                name="indexNumber"
                value={formData.indexNumber}
                onChange={handleChange}
                required
                className="w-full px-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. 1024"
              />
            </div>

            {/* Class Selection Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">Select Class *</label>
              <select
                name="className"
                value={isOtherClass ? 'OTHER_CUSTOM' : formData.className}
                onChange={handleChange}
                required
                className="w-full px-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- Select Class --</option>
                {classesList.map((cls, idx) => {
                  const classNameStr = cls.grade === 'Other' ? cls.customGradeName : cls.grade;
                  const classDisplay = `${classNameStr} - ${cls.medium} (${cls.day})`;
                  return (
                    <option key={cls._id || idx} value={classDisplay}>
                      {classDisplay}
                    </option>
                  );
                })}
                <option value="OTHER_CUSTOM">Other</option>
              </select>
            </div>

            {/* Custom Class Input if 'Other' is selected */}
            {isOtherClass && (
              <div>
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">Enter Class Name & Year *</label>
                <input
                  type="text"
                  value={customClass}
                  onChange={(e) => setCustomClass(e.target.value)}
                  required
                  className="w-full px-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. Chemistry (2026)"
                />
              </div>
            )}

            {/* Institute Name (Optional) */}
            <div>
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">Institute Name (Optional)</label>
              <input
                type="text"
                name="instituteName"
                value={formData.instituteName}
                onChange={handleChange}
                className="w-full px-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. Wisdom Institute"
              />
            </div>

            {/* Subject Name (Optional) */}
            <div>
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">Subject Name (Optional)</label>
              <input
                type="text"
                name="subjectName"
                value={formData.subjectName}
                onChange={handleChange}
                className="w-full px-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. Combined Mathematics"
              />
            </div>

            {/* Marks */}
            <div>
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">Marks (0 - 100) *</label>
              <input
                type="number"
                name="marks"
                value={formData.marks}
                onChange={handleChange}
                required
                min="0"
                max="100"
                className="w-full px-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. 75"
              />
            </div>

            {/* Grade */}
            <div>
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">Grade *</label>
              <select
                name="grade"
                value={formData.grade}
                onChange={handleChange}
                className="w-full px-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="A">A - Excellent</option>
                <option value="B">B - Very Good</option>
                <option value="C">C - Good</option>
                <option value="S">S - Pass</option>
                <option value="F">F - Fail</option>
              </select>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-xl transition duration-200 text-xs font-bold shadow-md shadow-indigo-500/20 disabled:bg-indigo-300"
            >
              {loading ? 'Saving...' : 'Submit Marks'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}