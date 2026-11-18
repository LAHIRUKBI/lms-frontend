// src/app/teacher/materials/physical-marks-view/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Award,
  Search,
  BookOpen,
  FileText,
  Trash2,
  Plus,
  Users,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { useTheme } from '@/app/context/ThemeContext';
import PhysicalMarksModal from '@/app/components/PhysicalMarksModal';

const RECORDS_PER_PAGE = 10;
const CLASSES_PER_PAGE = 7;

export default function PhysicalMarksViewPage() {
  const { darkMode } = useTheme();
  const [marksList, setMarksList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });
  const [isModalOpen, setIsModalOpen] = useState(false);

  // UI-only state: selected class, table page and class-list page.
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [classPage, setClassPage] = useState(1);

  useEffect(() => {
    fetchPhysicalMarks();
  }, []);

  // Original API request and data loading logic remain unchanged.
  const fetchPhysicalMarks = async () => {
    try {
      const token = localStorage.getItem('token');
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await axios.get(`${API_URL}/api/physical-marks/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setMarksList(res.data.data);
      }
    } catch (error) {
      console.error('Error fetching physical marks:', error);
    } finally {
      setLoading(false);
    }
  };

  // Original delete logic remains unchanged.
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this mark record?')) return;

    try {
      const token = localStorage.getItem('token');
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await axios.delete(`${API_URL}/api/physical-marks/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        setMarksList(marksList.filter((item) => item._id !== id));
        setMessage({ text: 'Mark record successfully deleted!', type: 'success' });
        setTimeout(() => setMessage({ text: '', type: '' }), 3000);
      }
    } catch (error) {
      console.error('Error deleting mark:', error);
      setMessage({ text: 'Failed to delete mark record.', type: 'error' });
    }
  };

  // Original search filter remains unchanged.
  const filteredMarks = marksList.filter((item) => {
    const query = searchQuery.toLowerCase();
    return (
      item.studentName?.toLowerCase().includes(query) ||
      item.indexNumber?.toLowerCase().includes(query) ||
      item.className?.toLowerCase().includes(query) ||
      item.subjectName?.toLowerCase().includes(query)
    );
  });

  // Original class grouping remains unchanged.
  const groupedByClass = filteredMarks.reduce<Record<string, any[]>>((acc, item) => {
    const className = item.className || 'General / Other Classes';
    if (!acc[className]) {
      acc[className] = [];
    }
    acc[className].push(item);
    return acc;
  }, {});

  // Display-only calculations: all fetched records remain available.
  const classNames = Object.keys(groupedByClass);
  const totalClassPages = Math.max(1, Math.ceil(classNames.length / CLASSES_PER_PAGE));
  const safeClassPage = Math.min(Math.max(1, classPage), totalClassPages);
  const activeClass = selectedClass && groupedByClass[selectedClass]
    ? selectedClass
    : classNames[(safeClassPage - 1) * CLASSES_PER_PAGE] || classNames[0] || null;
  const activeClassRecords: any[] = activeClass ? groupedByClass[activeClass] : [];
  const totalPages = Math.max(1, Math.ceil(activeClassRecords.length / RECORDS_PER_PAGE));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const firstRecordIndex = (safePage - 1) * RECORDS_PER_PAGE;
  const visibleRecords = activeClassRecords.slice(firstRecordIndex, firstRecordIndex + RECORDS_PER_PAGE);
  const firstShown = activeClassRecords.length ? firstRecordIndex + 1 : 0;
  const lastShown = Math.min(firstRecordIndex + RECORDS_PER_PAGE, activeClassRecords.length);

  // Count distinct students (multiple papers may belong to the same index number).
  const countStudents = (students: any[]) =>
    new Set(students.map((item) => String(item.indexNumber || item._id))).size;

  const pageWindowStart = Math.max(1, Math.min(safePage - 2, totalPages - 4));
  const visiblePageNumbers = Array.from(
    { length: Math.min(totalPages, 5) },
    (_, index) => pageWindowStart + index
  );

  // Class pagination avoids a separate scrollbar in the left panel.
  const visibleClassNames = classNames.slice(
    (safeClassPage - 1) * CLASSES_PER_PAGE,
    safeClassPage * CLASSES_PER_PAGE
  );

  const panel = darkMode
    ? 'border-slate-800 bg-slate-900'
    : 'border-slate-200 bg-white';
  const secondary = darkMode ? 'text-slate-400' : 'text-slate-500';
  const subtleBorder = darkMode ? 'border-slate-800' : 'border-slate-100';
  const pageButton = `inline-flex h-7 min-w-7 items-center justify-center rounded-md border px-1 text-[11px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${
    darkMode
      ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
  }`;

  const gradeClass = (grade: string) =>
    grade === 'A' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' :
    grade === 'B' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
    grade === 'C' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
    grade === 'S' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' :
    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';

  const deleteButtonClass = 'inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 dark:hover:bg-red-500/10 dark:hover:text-red-400';

  return (
    <div className={`min-h-screen px-3 py-3 transition-colors duration-200 sm:px-4 lg:px-5 ${
      darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      <div className="mx-auto w-full max-w-[1560px] space-y-3">
        {/* Compact heading, original Add action and original Search. */}
        <header className={`flex flex-col gap-3 rounded-xl border px-4 py-3 md:flex-row md:items-center md:justify-between ${panel}`}>
          <div className="flex min-w-0 items-center gap-2.5">
            <Award size={20} className="shrink-0 text-indigo-600 dark:text-indigo-400" />
            <div className="min-w-0">
              <h1 className="text-[15px] font-bold leading-5 sm:text-base">View Physical Paper Marks</h1>
              <p className={`mt-0.5 text-[11px] ${secondary}`}>
                Review all student marks recorded for physical classroom papers, organized class-wise.
              </p>
            </div>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto md:items-center">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 text-[11px] font-semibold text-white transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <Plus size={15} />
              <span>Add Physical Marks</span>
            </button>
            <div className="relative w-full sm:min-w-[230px] md:w-[250px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search student, index, class..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedClass(null);
                  setCurrentPage(1);
                  setClassPage(1);
                }}
                className={`h-9 w-full rounded-lg border py-1.5 pl-9 pr-3 text-[11px] outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 ${
                  darkMode
                    ? 'border-slate-700 bg-slate-800 text-white placeholder:text-slate-500'
                    : 'border-slate-200 bg-white text-slate-800 placeholder:text-slate-400'
                }`}
              />
            </div>
          </div>
        </header>

        {/* Original feedback messages. */}
        {message.text && (
          <div role="status" className={`rounded-lg border px-3 py-2 text-xs font-medium ${
            message.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-900/20 dark:text-green-300'
              : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300'
          }`}>
            {message.text}
          </div>
        )}

        {loading ? (
          <div className={`flex min-h-52 items-center justify-center gap-3 rounded-xl border ${panel}`}>
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
            <span className={`text-xs ${secondary}`}>Loading physical paper marks...</span>
          </div>
        ) : classNames.length === 0 ? (
          <div className={`flex min-h-52 flex-col items-center justify-center gap-2 rounded-xl border p-6 text-center ${panel}`}>
            <FileText size={27} className="text-slate-400" />
            <p className={`text-xs font-medium ${secondary}`}>No physical paper marks found.</p>
          </div>
        ) : (
          <div className="grid min-w-0 items-start gap-3 lg:grid-cols-[208px_minmax(0,1fr)] xl:grid-cols-[225px_minmax(0,1fr)]">
            {/* LEFT: slim class selector. No internal scrolling. */}
            <aside className={`min-w-0 rounded-xl border p-2.5 ${panel}`} aria-label="Class selection">
              <div className={`flex items-center justify-between gap-2 border-b px-1 pb-2 ${subtleBorder}`}>
                <div className="flex items-center gap-2">
                  <BookOpen size={15} className="text-indigo-600 dark:text-indigo-400" />
                  <h2 className="text-xs font-bold">Classes</h2>
                </div>
                <span className={`text-[11px] font-semibold tabular-nums ${secondary}`}>{classNames.length}</span>
              </div>

              <div className="mt-2 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-1">
                {visibleClassNames.map((className) => {
                  const students = groupedByClass[className];
                  const isSelected = activeClass === className;
                  return (
                    <button
                      key={className}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => {
                        setSelectedClass(className);
                        setCurrentPage(1);
                      }}
                      className={`w-full rounded-lg border px-2.5 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                        isSelected
                          ? darkMode
                            ? 'border-indigo-500/50 bg-indigo-500/10'
                            : 'border-indigo-200 bg-indigo-50'
                          : darkMode
                            ? 'border-slate-800 bg-slate-900 hover:bg-slate-800'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <span className={`min-w-0 break-words text-[11px] font-semibold leading-4 ${
                          isSelected ? 'text-indigo-700 dark:text-indigo-300' : ''
                        }`}>{className}</span>
                        <ChevronRight size={13} className={`mt-0.5 shrink-0 ${isSelected ? 'text-indigo-500' : 'text-slate-400'}`} />
                      </div>
                      <div className={`mt-1 flex items-center gap-1.5 text-[10px] tabular-nums ${secondary}`}>
                        <Users size={11} className="shrink-0" />
                        <span><strong className="font-semibold">{countStudents(students)}</strong> Students</span>
                        <span aria-hidden="true">·</span>
                        <span>{students.length} Records</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {totalClassPages > 1 && (
                <nav aria-label="Class list pages" className={`mt-2 flex items-center justify-between gap-2 border-t px-1 pt-2 ${subtleBorder}`}>
                  <span className={`text-[10px] tabular-nums ${secondary}`}>
                    {safeClassPage} / {totalClassPages}
                  </span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      aria-label="Previous class page"
                      disabled={safeClassPage === 1}
                      onClick={() => {
                        const nextPage = Math.max(1, safeClassPage - 1);
                        setClassPage(nextPage);
                        setSelectedClass(classNames[(nextPage - 1) * CLASSES_PER_PAGE] || null);
                        setCurrentPage(1);
                      }}
                      className={pageButton}
                    ><ChevronLeft size={13} /></button>
                    <button
                      type="button"
                      aria-label="Next class page"
                      disabled={safeClassPage === totalClassPages}
                      onClick={() => {
                        const nextPage = Math.min(totalClassPages, safeClassPage + 1);
                        setClassPage(nextPage);
                        setSelectedClass(classNames[(nextPage - 1) * CLASSES_PER_PAGE] || null);
                        setCurrentPage(1);
                      }}
                      className={pageButton}
                    ><ChevronRight size={13} /></button>
                  </div>
                </nav>
              )}
            </aside>

            {/* RIGHT: no fixed width and no horizontal or vertical table scroll. */}
            <section className={`min-w-0 rounded-xl border ${panel}`} aria-label="Selected class marks">
              <div className={`flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2.5 ${subtleBorder}`}>
                <div className="min-w-0">
                  <p className={`text-[10px] ${secondary}`}>Selected Class</p>
                  <h2 className="break-words text-[13px] font-bold leading-5">{activeClass}</h2>
                </div>
                <div className={`flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-medium tabular-nums ${secondary}`}>
                  <span>{countStudents(activeClassRecords)} Students</span>
                  <span>{activeClassRecords.length} Records</span>
                </div>
              </div>

              {/* A real seven-column table fits the available desktop width; on phones,
                  every field is displayed in stacked rows, avoiding sideways scrolling. */}
              <table className="hidden w-full table-fixed border-collapse text-left md:table">
                <colgroup>
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '20%' }} />
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '20%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '11%' }} />
                </colgroup>
                <thead>
                  <tr className={`border-b text-[10px] font-semibold uppercase tracking-wide ${
                    darkMode ? 'border-slate-800 bg-slate-800/70 text-slate-400' : 'border-slate-100 bg-slate-50 text-slate-500'
                  }`}>
                    <th scope="col" className="px-2 py-2.5">Index No</th>
                    <th scope="col" className="px-2 py-2.5">Student Name</th>
                    <th scope="col" className="px-2 py-2.5">Subject</th>
                    <th scope="col" className="px-2 py-2.5">Institute</th>
                    <th scope="col" className="px-1 py-2.5 text-center">Marks</th>
                    <th scope="col" className="px-1 py-2.5 text-center">Grade</th>
                    <th scope="col" className="px-1 py-2.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className={`divide-y text-[11px] ${darkMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
                  {visibleRecords.map((item: any) => (
                    <tr key={item._id} className={darkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50/80'}>
                      <td className={`break-all px-2 py-2 font-mono font-medium ${secondary}`}>{item.indexNumber}</td>
                      <td className="break-words px-2 py-2 font-semibold">{item.studentName}</td>
                      <td className={`break-words px-2 py-2 ${secondary}`}>{item.subjectName || '-'}</td>
                      <td className={`break-words px-2 py-2 ${secondary}`}>{item.instituteName || '-'}</td>
                      <td className="px-1 py-2 text-center font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
                        {item.marks}<span className={`font-normal ${secondary}`}> / 100</span>
                      </td>
                      <td className="px-1 py-2 text-center">
                        <span className={`inline-flex min-w-6 justify-center rounded px-1.5 py-0.5 text-[10px] font-bold ${gradeClass(item.grade)}`}>
                          {item.grade}
                        </span>
                      </td>
                      <td className="px-1 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleDelete(item._id)}
                          className={deleteButtonClass}
                          title="Delete Mark Record"
                          aria-label={`Delete mark record for ${item.studentName || item.indexNumber}`}
                        ><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Phone layout: all original fields, without horizontally scrolling a wide table. */}
              <div className={`divide-y md:hidden ${darkMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
                {visibleRecords.map((item: any) => (
                  <div key={item._id} className="px-3 py-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="break-words text-xs font-semibold">{item.studentName}</p>
                        <p className={`mt-0.5 break-all font-mono text-[10px] ${secondary}`}>Index: {item.indexNumber}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-[11px] font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
                          {item.marks}<span className={`font-normal ${secondary}`}> / 100</span>
                        </span>
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${gradeClass(item.grade)}`}>{item.grade}</span>
                        <button
                          type="button"
                          onClick={() => handleDelete(item._id)}
                          className={deleteButtonClass}
                          title="Delete Mark Record"
                          aria-label={`Delete mark record for ${item.studentName || item.indexNumber}`}
                        ><Trash2 size={14} /></button>
                      </div>
                    </div>
                    <p className={`mt-1 break-words text-[10px] leading-4 ${secondary}`}>
                      Subject: {item.subjectName || '-'} <span className="mx-1">·</span> Institute: {item.instituteName || '-'}
                    </p>
                  </div>
                ))}
              </div>

              {/* Original 10-record pagination, compact and without table scrolling. */}
              <div className={`flex flex-col items-center justify-between gap-2 border-t px-3 py-2.5 sm:flex-row ${subtleBorder}`}>
                <p className={`text-[10px] tabular-nums ${secondary}`}>
                  Showing {firstShown}–{lastShown} of {activeClassRecords.length} records
                </p>
                <nav aria-label="Physical marks pagination" className="flex flex-wrap items-center justify-center gap-1">
                  <button
                    type="button"
                    aria-label="First page"
                    title="First page"
                    disabled={safePage === 1}
                    onClick={() => setCurrentPage(1)}
                    className={pageButton}
                  ><ChevronsLeft size={13} /></button>
                  <button
                    type="button"
                    aria-label="Previous page"
                    title="Previous page"
                    disabled={safePage === 1}
                    onClick={() => setCurrentPage(Math.max(1, safePage - 1))}
                    className={pageButton}
                  ><ChevronLeft size={13} /></button>

                  {visiblePageNumbers.map((pageNumber) => (
                    <button
                      type="button"
                      key={pageNumber}
                      aria-label={`Page ${pageNumber}`}
                      aria-current={pageNumber === safePage ? 'page' : undefined}
                      onClick={() => setCurrentPage(pageNumber)}
                      className={pageNumber === safePage
                        ? 'inline-flex h-7 min-w-7 items-center justify-center rounded-md bg-indigo-600 px-1 text-[11px] font-semibold text-white'
                        : pageButton
                      }
                    >{pageNumber}</button>
                  ))}

                  <button
                    type="button"
                    aria-label="Next page"
                    title="Next page"
                    disabled={safePage === totalPages}
                    onClick={() => setCurrentPage(Math.min(totalPages, safePage + 1))}
                    className={pageButton}
                  ><ChevronRight size={13} /></button>
                  <button
                    type="button"
                    aria-label="Last page"
                    title="Last page"
                    disabled={safePage === totalPages}
                    onClick={() => setCurrentPage(totalPages)}
                    className={pageButton}
                  ><ChevronsRight size={13} /></button>
                </nav>
              </div>
            </section>
          </div>
        )}
      </div>

      {/* Existing Add Marks modal and refresh callback. */}
      <PhysicalMarksModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchPhysicalMarks}
      />
    </div>
  );
}
