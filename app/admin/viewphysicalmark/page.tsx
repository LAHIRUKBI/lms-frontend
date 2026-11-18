// src/app/admin/viewphysicalmark/page.tsx
'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  Award,
  ArrowLeft,
  BookOpen,
  UserRound,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
  Users,
  UserRoundPlus,
} from 'lucide-react';
import { useTheme } from '@/app/context/ThemeContext';

const RECORDS_PER_PAGE = 10;
const CLASSES_PER_PAGE = 7;
const TEACHERS_PER_PAGE = 7;
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface PhysicalMark {
  _id: string;
  studentName?: string;
  indexNumber?: string;
  className?: string;
  subjectName?: string;
  instituteName?: string;
  marks?: number | string;
  grade?: string;
  teacherId?: string | null;
  teacherName?: string;
  createdAt?: string;
}

interface ClassGroup {
  key: string;
  teacherId: string | null;
  teacherName: string;
  className: string;
  records: PhysicalMark[];
}

interface TeacherGroup {
  key: string;
  teacherId: string | null;
  teacherName: string;
  classes: ClassGroup[];
  records: PhysicalMark[];
}

type Notice = { type: 'success' | 'error'; text: string } | null;
interface TeacherOption { _id: string; teacherId: string; name: string; }
type AssignmentTarget =
  | { kind: 'class'; className: string; count: number }
  | { kind: 'record'; recordId: string; studentName: string };


function numberOfStudents(records: PhysicalMark[]): number {
  const distinct = new Set(
    records.map((record) =>
      String(record.indexNumber || record._id).trim().toLowerCase()
    )
  );
  return distinct.size;
}

function gradeStyle(grade?: string): string {
  switch (grade) {
    case 'A': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
    case 'B': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    case 'C': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
    case 'S': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
    default: return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
  }
}

function formatDate(date?: string): string {
  if (!date) return '—';
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime())
    ? '—'
    : parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function errorText(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    return String(error.response?.data?.message || fallback);
  }
  return fallback;
}

export default function ViewPhysicalMarkPage() {
  const { darkMode } = useTheme();
  const [marksList, setMarksList] = useState<PhysicalMark[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null);
  const [selectedTeacherKey, setSelectedTeacherKey] = useState<string | null>(null);
  const [teacherPage, setTeacherPage] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [classPage, setClassPage] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingClass, setDeletingClass] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [assignmentTarget, setAssignmentTarget] = useState<AssignmentTarget | null>(null);
  const [teacherOptions, setTeacherOptions] = useState<TeacherOption[]>([]);
  const [assignTeacherId, setAssignTeacherId] = useState('');
  const [teacherLoading, setTeacherLoading] = useState(false);
  const [assignBusy, setAssignBusy] = useState(false);
  const [assignError, setAssignError] = useState('');

  const fetchMarks = useCallback(async () => {
    setLoading(true);
    setNotice(null);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/physical-marks/admin/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.data.success || !Array.isArray(res.data.data)) {
        throw new Error('Unexpected marks response');
      }
      setMarksList(res.data.data);
    } catch (error) {
      console.error('Failed to load admin physical marks:', error);
      setMarksList([]);
      setNotice({ type: 'error', text: errorText(error, 'Unable to load physical marks. Please try again.') });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchMarks(); }, [fetchMarks]);

  // Group by BOTH teacher identity and class name. Identical class names from
  // different teachers MUST NOT be merged together or bulk-deleted together.
  const allGroups = useMemo<ClassGroup[]>(() => {
    const groups = new Map<string, ClassGroup>();
    for (const record of marksList) {
      const teacherId = record.teacherId ? String(record.teacherId) : null;
      const className = record.className || 'General / Other Classes';
      const key = JSON.stringify([teacherId, className]);
      let group = groups.get(key);
      if (!group) {
        group = {
          key,
          teacherId,
          teacherName: record.teacherName?.trim() || (teacherId ? `Teacher ID: ${teacherId}` : 'Teacher not assigned (older record)'),
          className,
          records: [],
        };
        groups.set(key, group);
      }
      group.records.push(record);
    }
    return [...groups.values()];
  }, [marksList]);

  const groups = useMemo<ClassGroup[]>(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return allGroups;
    return allGroups.reduce<ClassGroup[]>((result, group) => {
      const groupMatches = [group.teacherName, group.className, group.teacherId || '']
        .some((value) => value.toLowerCase().includes(query));
      const records = groupMatches ? group.records : group.records.filter((record) =>
        [record.studentName, record.indexNumber, record.subjectName, record.instituteName, record.grade, String(record.marks ?? '')]
          .some((value) => String(value || '').toLowerCase().includes(query))
      );
      if (records.length > 0) result.push({ ...group, records });
      return result;
    }, []);
  }, [allGroups, searchQuery]);

  // Teachers are grouped by their verified identity, not only display name.
  // Unattributed historical marks remain in a separate group for admin assignment.
  const teacherGroups = useMemo<TeacherGroup[]>(() => {
    const byTeacher = new Map<string, TeacherGroup>();
    for (const group of groups) {
      const key = JSON.stringify(['teacher', group.teacherId]);
      let teacher = byTeacher.get(key);
      if (!teacher) {
        teacher = {
          key,
          teacherId: group.teacherId,
          teacherName: group.teacherName,
          classes: [],
          records: [],
        };
        byTeacher.set(key, teacher);
      }
      // Some older records have an ID but not the teacher's name; prefer a real name.
      if (teacher.teacherName.startsWith('Teacher ID:') && !group.teacherName.startsWith('Teacher ID:')) {
        teacher.teacherName = group.teacherName;
      }
      teacher.classes.push(group);
      teacher.records.push(...group.records);
    }
    return [...byTeacher.values()];
  }, [groups]);

  const totalTeacherPages = Math.max(1, Math.ceil(teacherGroups.length / TEACHERS_PER_PAGE));
  const safeTeacherPage = Math.min(teacherPage, totalTeacherPages);
  const visibleTeachers = teacherGroups.slice(
    (safeTeacherPage - 1) * TEACHERS_PER_PAGE,
    safeTeacherPage * TEACHERS_PER_PAGE
  );

  // Keep selection explicit: Teacher -> Class -> Student marks table.
  const selectedTeacher = teacherGroups.find((teacher) => teacher.key === selectedTeacherKey) || null;
  const teacherClasses = selectedTeacher?.classes || [];
  const totalClassPages = Math.max(1, Math.ceil(teacherClasses.length / CLASSES_PER_PAGE));
  const safeClassPage = Math.min(classPage, totalClassPages);
  const visibleClasses = teacherClasses.slice(
    (safeClassPage - 1) * CLASSES_PER_PAGE,
    safeClassPage * CLASSES_PER_PAGE
  );
  const selectedGroup = teacherClasses.find((group) => group.key === selectedGroupKey) || null;
  const activeRecords = selectedGroup?.records || [];
  const totalPages = Math.max(1, Math.ceil(activeRecords.length / RECORDS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const firstIndex = (safePage - 1) * RECORDS_PER_PAGE;
  const visibleRecords = activeRecords.slice(firstIndex, firstIndex + RECORDS_PER_PAGE);
  const shownStart = activeRecords.length ? firstIndex + 1 : 0;
  const shownEnd = Math.min(firstIndex + RECORDS_PER_PAGE, activeRecords.length);

  const pageWindowStart = Math.max(1, Math.min(safePage - 2, totalPages - 4));
  const pageNumbers = Array.from({ length: Math.min(totalPages, 5) }, (_, i) => pageWindowStart + i);
  const deleteBusy = deletingClass || deletingId !== null;

  const headers = () => ({
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  });

  // Existing marks saved before teacher tracking have no owner ID. Admin can
  // explicitly connect them to a real teacher, avoiding false attribution.
  const openAssignment = async (target: AssignmentTarget) => {
    setAssignmentTarget(target);
    setAssignTeacherId('');
    setTeacherOptions([]);
    setAssignError('');
    setTeacherLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/physical-marks/admin/teachers`, {
        headers: headers(),
      });
      if (!response.data.success || !Array.isArray(response.data.data)) {
        throw new Error('Could not load teachers');
      }
      setTeacherOptions(response.data.data);
    } catch (error) {
      setAssignError(errorText(error, 'Unable to load teachers. Please retry.'));
    } finally {
      setTeacherLoading(false);
    }
  };

  const handleAssignTeacher = async () => {
    if (!assignmentTarget || !assignTeacherId || assignBusy) return;
    const teacher = teacherOptions.find((option) => option._id === assignTeacherId);
    if (!teacher) return;

    // A class name is not proof of ownership. Explicit confirmation is needed.
    if (assignmentTarget.kind === 'class') {
      const proceed = window.confirm(
        `Assign ALL ${assignmentTarget.count} unattributed records in "${assignmentTarget.className}" to ${teacher.name}?\n\n` +
        'Confirm only if EVERY record in this group belongs to this teacher. Otherwise assign each record separately.'
      );
      if (!proceed) return;
    }
    setAssignBusy(true);
    setAssignError('');
    let saved = false;
    try {
      const body = assignmentTarget.kind === 'class'
        ? { teacherId: teacher._id, className: assignmentTarget.className }
        : { teacherId: teacher._id, recordId: assignmentTarget.recordId };
      const response = await axios.patch(`${API_URL}/api/physical-marks/admin/assign-teacher`, body, {
        headers: headers(),
      });
      if (!response.data.success) throw new Error('Assignment was not confirmed');
      saved = true;

      // Reload authoritative records after the update to avoid showing
      // incorrect ownership if another admin made a concurrent assignment.
      const refreshed = await axios.get(`${API_URL}/api/physical-marks/admin/all`, {
        headers: headers(),
      });
      if (!refreshed.data.success || !Array.isArray(refreshed.data.data)) {
        throw new Error('Teacher assigned, but record refresh failed. Use Refresh.');
      }
      setMarksList(refreshed.data.data);
      // After assignment, open the actual teacher and class where the updated
      // record now belongs. Recompute both pagination positions from server data.
      const targetClassName = assignmentTarget.kind === 'class'
        ? assignmentTarget.className
        : (marksList.find((record) => record._id === assignmentTarget.recordId)?.className || 'General / Other Classes');
      const newGroupKey = JSON.stringify([teacher._id, targetClassName]);
      const newTeacherKey = JSON.stringify(['teacher', teacher._id]);
      const orderedTeacherKeys: string[] = [];
      const orderedClassKeys: string[] = [];
      const seenTeachers = new Set<string>();
      const seenClasses = new Set<string>();
      for (const record of refreshed.data.data as PhysicalMark[]) {
        const id = record.teacherId ? String(record.teacherId) : null;
        const teacherKey = JSON.stringify(['teacher', id]);
        if (!seenTeachers.has(teacherKey)) {
          seenTeachers.add(teacherKey);
          orderedTeacherKeys.push(teacherKey);
        }
        if (teacherKey === newTeacherKey) {
          const classKey = JSON.stringify([id, record.className || 'General / Other Classes']);
          if (!seenClasses.has(classKey)) {
            seenClasses.add(classKey);
            orderedClassKeys.push(classKey);
          }
        }
      }
      const teacherIndex = orderedTeacherKeys.indexOf(newTeacherKey);
      const classIndex = orderedClassKeys.indexOf(newGroupKey);
      setSearchQuery('');
      setSelectedTeacherKey(newTeacherKey);
      setSelectedGroupKey(newGroupKey);
      setTeacherPage(Math.floor(Math.max(0, teacherIndex) / TEACHERS_PER_PAGE) + 1);
      setClassPage(Math.floor(Math.max(0, classIndex) / CLASSES_PER_PAGE) + 1);
      setCurrentPage(1);
      setNotice({ type: 'success', text: response.data.message || 'Teacher assigned successfully.' });
      setAssignmentTarget(null);
    } catch (error) {
      if (saved) {
        setAssignmentTarget(null);
        setNotice({ type: 'success', text: 'Teacher assignment was saved. Please click Refresh to reload the latest records.' });
      } else {
        setAssignError(errorText(error, 'Failed to assign teacher.'));
      }
    } finally {
      setAssignBusy(false);
    }
  };

  const handleDeleteRecord = async (record: PhysicalMark) => {
    if (deleteBusy) return;
    if (!window.confirm(`Permanently delete the mark record for ${record.studentName || record.indexNumber || 'this student'}?`)) return;
    setDeletingId(record._id);
    setNotice(null);
    try {
      const res = await axios.delete(`${API_URL}/api/physical-marks/admin/${record._id}`, { headers: headers() });
      if (!res.data.success) throw new Error('Record delete was not confirmed by the server');
      setMarksList((previous) => previous.filter((item) => item._id !== record._id));
      setNotice({ type: 'success', text: 'Mark record deleted successfully.' });
    } catch (error) {
      console.error('Error deleting a physical mark:', error);
      setNotice({ type: 'error', text: errorText(error, 'Unable to delete this record.') });
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteClass = async (group: ClassGroup) => {
    if (deleteBusy) return;
    const count = allGroups.find((item) => item.key === group.key)?.records.length ?? group.records.length;
    const confirmed = window.confirm(
      `Permanently delete ALL ${count} records for class "${group.className}"\nTeacher: ${group.teacherName}\n\n` +
      'This deletes the full teacher-and-class group (including records on other pages), not just the currently visible page. This cannot be undone.'
    );
    if (!confirmed) return;

    setDeletingClass(true);
    setNotice(null);
    try {
      const res = await axios.delete(`${API_URL}/api/physical-marks/admin/class`, {
        headers: headers(),
        data: { teacherId: group.teacherId, className: group.className },
      });
      if (!res.data.success) throw new Error('Class delete was not confirmed by the server');
      // Filter by exact group identity, not by class name alone.
      setMarksList((previous) => previous.filter((record) => {
        const key = JSON.stringify([record.teacherId ? String(record.teacherId) : null, record.className || 'General / Other Classes']);
        return key !== group.key;
      }));
      setSelectedGroupKey(null);
      setCurrentPage(1);
      setClassPage(1);
      setNotice({ type: 'success', text: `${res.data.deletedCount ?? count} physical mark records deleted from ${group.className}.` });
    } catch (error) {
      console.error('Error deleting physical marks class:', error);
      setNotice({ type: 'error', text: errorText(error, 'Unable to delete this class.') });
    } finally {
      setDeletingClass(false);
    }
  };

  const selectTeacher = (key: string) => {
    setSelectedTeacherKey(key);
    setSelectedGroupKey(null);
    setClassPage(1);
    setCurrentPage(1);
  };

  const selectTeacherPage = (next: number) => {
    const target = Math.max(1, Math.min(totalTeacherPages, next));
    setTeacherPage(target);
    setSelectedTeacherKey(null);
    setSelectedGroupKey(null);
    setClassPage(1);
    setCurrentPage(1);
  };

  const selectClassPage = (next: number) => {
    const target = Math.max(1, Math.min(totalClassPages, next));
    setClassPage(target);
    setSelectedGroupKey(null);
    setCurrentPage(1);
  };

  const panel = darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white';
  const muted = darkMode ? 'text-slate-400' : 'text-slate-500';
  const border = darkMode ? 'border-slate-800' : 'border-slate-100';
  const smallButton = `inline-flex h-7 min-w-7 items-center justify-center rounded-md border px-1 text-[11px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${darkMode
    ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`;
  const deleteButton = 'inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:opacity-40 dark:hover:bg-red-500/10 dark:hover:text-red-400';

  return (
    <main className={`min-h-screen px-3 py-3 transition-colors sm:px-4 lg:px-5 ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <div className="mx-auto w-full max-w-[1560px] space-y-3">
        <header className={`flex flex-col gap-3 rounded-xl border px-4 py-3 md:flex-row md:items-center md:justify-between ${panel}`}>
          <div className="flex min-w-0 items-center gap-2.5">
            <Award size={19} className="shrink-0 text-indigo-600 dark:text-indigo-400" />
            <div className="min-w-0">
              <h1 className="text-[15px] font-bold sm:text-base">View Physical Paper Marks</h1>
              <p className={`mt-0.5 text-[11px] ${muted}`}>Teacher-submitted classroom paper results</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative min-w-0 sm:w-[255px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setSelectedTeacherKey(null);
                  setSelectedGroupKey(null);
                  setTeacherPage(1);
                  setClassPage(1);
                  setCurrentPage(1);
                }}
                placeholder="Search teacher, class, student..."
                aria-label="Search physical marks"
                className={`h-9 w-full rounded-lg border py-1.5 pl-9 pr-3 text-[11px] outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 ${darkMode
                  ? 'border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500'
                  : 'border-slate-200 bg-white text-slate-800 placeholder:text-slate-400'}`}
              />
            </div>
            <button type="button" onClick={() => void fetchMarks()} disabled={loading || deleteBusy}
              className={`${smallButton} h-9 gap-1.5 px-3`} title="Refresh marks" aria-label="Refresh physical marks">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </header>

        <div className={`flex flex-wrap items-center gap-x-5 gap-y-1 px-1 text-[11px] ${muted}`}>
          <span><strong className="font-semibold text-slate-900 dark:text-white">{new Set(allGroups.map((group) => JSON.stringify(['teacher', group.teacherId]))).size}</strong> Teachers / Unassigned</span>
          <span><strong className="font-semibold text-slate-900 dark:text-white">{allGroups.length}</strong> Classes</span>
          <span><strong className="font-semibold text-slate-900 dark:text-white">{marksList.length}</strong> Records</span>
        </div>

        {notice && (
          <div role={notice.type === 'error' ? 'alert' : 'status'} className={`rounded-lg border px-3 py-2 text-xs ${notice.type === 'success'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300'
            : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300'}`}>
            {notice.text}
          </div>
        )}

        {loading ? (
          <div className={`flex min-h-52 items-center justify-center gap-2 rounded-xl border ${panel}`}>
            <Loader2 className="animate-spin text-indigo-600" size={20} />
            <span className={`text-xs ${muted}`}>Loading physical marks...</span>
          </div>
        ) : groups.length === 0 ? (
          <div className={`flex min-h-52 flex-col items-center justify-center gap-2 rounded-xl border p-6 text-center ${panel}`}>
            <FileText size={26} className="text-slate-400" />
            <p className={`text-xs ${muted}`}>{notice?.type === 'error' ? 'Unable to display records.' : 'No matching physical paper marks found.'}</p>
          </div>
        ) : (
          <div className="grid min-w-0 items-start gap-3 lg:grid-cols-[215px_minmax(0,1fr)] xl:grid-cols-[235px_minmax(0,1fr)]">
            {/* Level 1: one card per teacher (not one card per class). */}
            <aside className={`min-w-0 rounded-xl border p-2.5 ${panel}`} aria-label="Teachers with physical marks">
              <div className={`flex items-center justify-between border-b px-1 pb-2 ${border}`}>
                <div className="flex items-center gap-2">
                  <UserRound size={14} className="text-indigo-600 dark:text-indigo-400" />
                  <h2 className="text-xs font-semibold">Teachers</h2>
                </div>
                <span className={`text-[11px] tabular-nums ${muted}`}>{teacherGroups.length}</span>
              </div>

              <div className="mt-2 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-1">
                {visibleTeachers.map((teacher) => {
                  const active = teacher.key === selectedTeacher?.key;
                  return (
                    <button
                      key={teacher.key}
                      type="button"
                      aria-pressed={active}
                      onClick={() => selectTeacher(teacher.key)}
                      className={`min-w-0 rounded-lg border px-2.5 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${active
                        ? darkMode ? 'border-indigo-500/50 bg-indigo-500/10' : 'border-indigo-200 bg-indigo-50'
                        : darkMode ? 'border-slate-800 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-50'}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className={`min-w-0 break-words text-[11px] font-semibold leading-4 ${active ? 'text-indigo-700 dark:text-indigo-300' : ''}`}>
                          {teacher.teacherName}
                        </span>
                        <ChevronRight size={13} className="mt-0.5 shrink-0 text-slate-400" />
                      </div>
                      <p className={`mt-1 text-[10px] tabular-nums leading-4 ${muted}`}>
                        <strong>{teacher.classes.length}</strong> Classes · <strong>{numberOfStudents(teacher.records)}</strong> Students
                      </p>
                      <p className={`text-[10px] tabular-nums leading-4 ${muted}`}>
                        {teacher.records.length} Marks Records
                      </p>
                    </button>
                  );
                })}
              </div>

              {totalTeacherPages > 1 && (
                <nav aria-label="Teacher pages" className={`mt-2 flex items-center justify-between border-t px-1 pt-2 ${border}`}>
                  <span className={`text-[10px] tabular-nums ${muted}`}>{safeTeacherPage} / {totalTeacherPages}</span>
                  <div className="flex gap-1">
                    <button type="button" aria-label="Previous teachers" disabled={safeTeacherPage === 1}
                      onClick={() => selectTeacherPage(safeTeacherPage - 1)} className={smallButton}><ChevronLeft size={13} /></button>
                    <button type="button" aria-label="Next teachers" disabled={safeTeacherPage === totalTeacherPages}
                      onClick={() => selectTeacherPage(safeTeacherPage + 1)} className={smallButton}><ChevronRight size={13} /></button>
                  </div>
                </nav>
              )}
            </aside>

            <section className={`min-w-0 rounded-xl border ${panel}`} aria-label="Physical paper marks details">
              {!selectedTeacher ? (
                <div className="flex min-h-52 flex-col items-center justify-center gap-2 px-5 py-10 text-center">
                  <UserRound size={24} className="text-slate-400" />
                  <p className="text-xs font-semibold">Select a teacher</p>
                  <p className={`max-w-sm text-[11px] leading-5 ${muted}`}>
                    Choose a teacher from the left to see their classes and student marks.
                  </p>
                </div>
              ) : !selectedGroup ? (
                <>
                  {/* Level 2: a selected teacher's classes. */}
                  <div className={`border-b px-3 py-3 ${border}`}>
                    <p className={`text-[10px] ${muted}`}>Teacher</p>
                    <h2 className="break-words text-[13px] font-bold">{selectedTeacher.teacherName}</h2>
                    <p className={`mt-0.5 text-[10px] tabular-nums ${muted}`}>
                      {selectedTeacher.classes.length} Classes · {numberOfStudents(selectedTeacher.records)} Students · {selectedTeacher.records.length} Records
                    </p>
                  </div>
                  <div className="p-3">
                    <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold">
                      <BookOpen size={14} className="text-indigo-600 dark:text-indigo-400" /> Classes
                    </h3>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {visibleClasses.map((group) => (
                        <button
                          key={group.key}
                          type="button"
                          onClick={() => { setSelectedGroupKey(group.key); setCurrentPage(1); }}
                          className={`min-w-0 rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${darkMode
                            ? 'border-slate-800 hover:border-indigo-500/40 hover:bg-slate-800/50'
                            : 'border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/50'}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="break-words text-[11px] font-semibold leading-5">{group.className}</span>
                            <ChevronRight size={14} className="mt-0.5 shrink-0 text-slate-400" />
                          </div>
                          <div className={`mt-2 text-[10px] tabular-nums ${muted}`}>
                            {numberOfStudents(group.records)} Students · {group.records.length} Records
                          </div>
                        </button>
                      ))}
                    </div>
                    {totalClassPages > 1 && (
                      <nav aria-label="Class pages" className={`mt-3 flex items-center justify-between border-t pt-2 ${border}`}>
                        <span className={`text-[10px] tabular-nums ${muted}`}>Classes page {safeClassPage} / {totalClassPages}</span>
                        <div className="flex gap-1">
                          <button type="button" aria-label="Previous classes" disabled={safeClassPage === 1}
                            onClick={() => selectClassPage(safeClassPage - 1)} className={smallButton}><ChevronLeft size={13} /></button>
                          <button type="button" aria-label="Next classes" disabled={safeClassPage === totalClassPages}
                            onClick={() => selectClassPage(safeClassPage + 1)} className={smallButton}><ChevronRight size={13} /></button>
                        </div>
                      </nav>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Level 3: preserve the existing marks table and its actions. */}
                  <div className={`border-b px-3 py-2.5 ${border}`}>
                    <button
                      type="button"
                      onClick={() => { setSelectedGroupKey(null); setCurrentPage(1); }}
                      className={`mb-2 inline-flex items-center gap-1 text-[11px] font-semibold hover:text-indigo-600 dark:hover:text-indigo-400 ${muted}`}
                    >
                      <ArrowLeft size={13} /> Back to Classes
                    </button>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className={`text-[10px] ${muted}`}>Selected Class</p>
                        <h2 className="break-words text-[13px] font-bold leading-5">{selectedGroup.className}</h2>
                        <p className={`break-words text-[11px] ${muted}`}>
                          Teacher: <strong className="font-semibold text-slate-700 dark:text-slate-200">{selectedTeacher.teacherName}</strong>
                        </p>
                        <p className={`text-[10px] tabular-nums ${muted}`}>
                          {numberOfStudents(activeRecords)} Students · {activeRecords.length} Records
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {!selectedGroup.teacherId && (
                          <button
                            type="button"
                            disabled={deleteBusy}
                            onClick={() => void openAssignment({
                              kind: 'class',
                              className: selectedGroup.className,
                              count: allGroups.find((group) => group.key === selectedGroup.key)?.records.length ?? activeRecords.length,
                            })}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-indigo-200 px-2.5 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-40 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-900/20"
                            title="Assign the verified teacher to all older records in this class"
                          >
                            <UserRoundPlus size={13} /> Assign Teacher
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={deleteBusy}
                          onClick={() => void handleDeleteClass(selectedGroup)}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-red-200 px-2.5 text-[11px] font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-500/10"
                          title="Delete all marks in this teacher and class group"
                        >
                          {deletingClass ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                          Delete Class Marks
                        </button>
                      </div>
                    </div>
                  </div>
                {/* At xl+ use a compact fixed-layout table (no internal scrollbar). */}
                <table className="hidden w-full table-fixed border-collapse text-left xl:table">
                  <colgroup>
                    <col style={{ width: '12%' }} />
                    <col style={{ width: '18%' }} />
                    <col style={{ width: '15%' }} />
                    <col style={{ width: '17%' }} />
                    <col style={{ width: '11%' }} />
                    <col style={{ width: '9%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '8%' }} />
                  </colgroup>
                  <thead>
                    <tr className={`border-b text-[10px] uppercase tracking-wide ${darkMode ? 'border-slate-800 bg-slate-800/70 text-slate-400' : 'border-slate-100 bg-slate-50 text-slate-500'}`}>
                      <th scope="col" className="px-2 py-2.5">Index No</th>
                      <th scope="col" className="px-2 py-2.5">Student Name</th>
                      <th scope="col" className="px-2 py-2.5">Subject</th>
                      <th scope="col" className="px-2 py-2.5">Institute</th>
                      <th scope="col" className="px-1 py-2.5 text-center">Marks</th>
                      <th scope="col" className="px-1 py-2.5 text-center">Grade</th>
                      <th scope="col" className="px-1 py-2.5">Date</th>
                      <th scope="col" className="px-1 py-2.5 text-center" aria-label="Actions">Action</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y text-[11px] ${darkMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
                    {visibleRecords.map((record) => (
                      <tr key={record._id} className={darkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50/80'}>
                        <td className={`break-all px-2 py-2 font-mono font-semibold ${muted}`}>{record.indexNumber || '—'}</td>
                        <td className="break-words px-2 py-2 font-semibold">{record.studentName || '—'}</td>
                        <td className={`break-words px-2 py-2 ${muted}`}>{record.subjectName || '—'}</td>
                        <td className={`break-words px-2 py-2 ${muted}`}>{record.instituteName || '—'}</td>
                        <td className="px-1 py-2 text-center font-semibold tabular-nums text-indigo-600 dark:text-indigo-400">{record.marks ?? '—'}<span className={muted}> / 100</span></td>
                        <td className="px-1 py-2 text-center">
                          <span className={`inline-flex min-w-6 justify-center rounded px-1 py-0.5 text-[10px] font-bold ${gradeStyle(record.grade)}`}>{record.grade || '—'}</span>
                        </td>
                        <td className={`break-words px-1 py-2 text-[10px] ${muted}`}>{formatDate(record.createdAt)}</td>
                        <td className="px-1 py-2 text-center">
                          <div className="flex items-center justify-center gap-0.5">
                            {!record.teacherId && (
                              <button type="button" disabled={deleteBusy}
                                onClick={() => void openAssignment({ kind: 'record', recordId: record._id, studentName: record.studentName || record.indexNumber || 'this student' })}
                                title="Assign teacher to this record only"
                                aria-label={`Assign teacher for ${record.studentName || record.indexNumber}`}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10 disabled:opacity-40">
                                <UserRoundPlus size={14} />
                              </button>
                            )}
                            <button type="button" disabled={deleteBusy} onClick={() => void handleDeleteRecord(record)}
                            title="Delete this student's record" aria-label={`Delete record for ${record.studentName || record.indexNumber}`}
                            className={deleteButton}>
                            {deletingId === record._id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                          </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* On narrower screens, keep all fields readable without a sideways scrollbar. */}
                <div className={`divide-y xl:hidden ${darkMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
                  {visibleRecords.map((record) => (
                    <div key={record._id} className="px-3 py-2.5">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="break-words text-xs font-semibold">{record.studentName || '—'}</p>
                          <p className={`break-all font-mono text-[10px] ${muted}`}>Index: {record.indexNumber || '—'}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="text-[11px] font-semibold tabular-nums text-indigo-600 dark:text-indigo-400">{record.marks ?? '—'} / 100</span>
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${gradeStyle(record.grade)}`}>{record.grade || '—'}</span>
                          {!record.teacherId && (
                            <button type="button" disabled={deleteBusy}
                              onClick={() => void openAssignment({ kind: 'record', recordId: record._id, studentName: record.studentName || record.indexNumber || 'this student' })}
                              title="Assign teacher to this record" aria-label={`Assign teacher for ${record.studentName || record.indexNumber}`}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10 disabled:opacity-40">
                              <UserRoundPlus size={14} />
                            </button>
                          )}
                          <button type="button" disabled={deleteBusy} onClick={() => void handleDeleteRecord(record)}
                            aria-label={`Delete record for ${record.studentName || record.indexNumber}`}
                            title="Delete this student's record" className={deleteButton}>
                            {deletingId === record._id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                          </button>
                        </div>
                      </div>
                      <p className={`mt-1 break-words text-[10px] leading-4 ${muted}`}>Subject: {record.subjectName || '—'} · Institute: {record.instituteName || '—'}</p>
                      <p className={`text-[10px] leading-4 ${muted}`}>Added: {formatDate(record.createdAt)} · Teacher: {selectedTeacher.teacherName}</p>
                    </div>
                  ))}
                </div>

                <div className={`flex flex-col items-center justify-between gap-2 border-t px-3 py-2.5 sm:flex-row ${border}`}>
                  <p className={`text-[10px] tabular-nums ${muted}`}>Showing {shownStart}–{shownEnd} of {activeRecords.length} records</p>
                  <nav aria-label="Student marks pagination" className="flex flex-wrap items-center justify-center gap-1">
                    <button type="button" disabled={safePage === 1} onClick={() => setCurrentPage(1)} aria-label="First page" className={smallButton}><ChevronsLeft size={13} /></button>
                    <button type="button" disabled={safePage === 1} onClick={() => setCurrentPage(Math.max(1, safePage - 1))} aria-label="Previous page" className={smallButton}><ChevronLeft size={13} /></button>
                    {pageNumbers.map((pageNumber) => (
                      <button type="button" key={pageNumber} aria-label={`Page ${pageNumber}`}
                        aria-current={pageNumber === safePage ? 'page' : undefined}
                        onClick={() => setCurrentPage(pageNumber)}
                        className={pageNumber === safePage
                          ? 'inline-flex h-7 min-w-7 items-center justify-center rounded-md bg-indigo-600 px-1 text-[11px] font-semibold text-white'
                          : smallButton}>{pageNumber}</button>
                    ))}
                    <button type="button" disabled={safePage === totalPages} onClick={() => setCurrentPage(Math.min(totalPages, safePage + 1))} aria-label="Next page" className={smallButton}><ChevronRight size={13} /></button>
                    <button type="button" disabled={safePage === totalPages} onClick={() => setCurrentPage(totalPages)} aria-label="Last page" className={smallButton}><ChevronsRight size={13} /></button>
                  </nav>
                </div>
                </>
              )}
            </section>
          </div>
        )}

      </div>

      {assignmentTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4"
          role="presentation">
          <div role="dialog" aria-modal="true" aria-labelledby="assign-teacher-title"
            className={`w-full max-w-md rounded-xl border p-5 shadow-xl ${panel}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="assign-teacher-title" className="text-sm font-bold">Assign Teacher</h2>
                <p className={`mt-1 text-[11px] leading-5 ${muted}`}>
                  {assignmentTarget.kind === 'class'
                    ? `Unattributed records: ${assignmentTarget.className} (${assignmentTarget.count} records)`
                    : `Single record: ${assignmentTarget.studentName}`}
                </p>
              </div>
              <button type="button" disabled={assignBusy} onClick={() => setAssignmentTarget(null)}
                className={`${smallButton} px-2`} aria-label="Close teacher assignment">✕</button>
            </div>
            <p className={`mt-3 text-[11px] leading-5 ${muted}`}>
              Historical records do not include their original teacher. Select the actual teacher
              only after verifying the information. The change will be saved to the database.
            </p>
            <label htmlFor="physical-teacher" className="mt-4 block text-[11px] font-semibold">Teacher</label>
            <select id="physical-teacher" value={assignTeacherId}
              onChange={(event) => setAssignTeacherId(event.target.value)}
              disabled={teacherLoading || assignBusy}
              className={`mt-1 h-10 w-full rounded-lg border px-2 text-xs outline-none focus:border-indigo-500 ${darkMode
                ? 'border-slate-700 bg-slate-800 text-slate-100'
                : 'border-slate-200 bg-white text-slate-900'}`}>
              <option value="">{teacherLoading ? 'Loading teachers...' : 'Select teacher'}</option>
              {teacherOptions.map((teacher) => (
                <option key={teacher._id} value={teacher._id}>
                  {teacher.name} ({teacher.teacherId})
                </option>
              ))}
            </select>
            {assignError && <p role="alert" className="mt-2 text-xs text-red-600 dark:text-red-400">{assignError}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" disabled={assignBusy} onClick={() => setAssignmentTarget(null)}
                className={`${smallButton} h-9 px-3`}>Cancel</button>
              <button type="button" disabled={!assignTeacherId || teacherLoading || assignBusy}
                onClick={() => void handleAssignTeacher()}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-indigo-600 px-3 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
                {assignBusy && <Loader2 size={14} className="animate-spin" />}
                Save Teacher
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
