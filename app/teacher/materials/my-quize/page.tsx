// src/app/teacher/materials/my-quize/page.tsx

"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle, Clock, Globe, FileText, Trash2, AlertCircle, Image as ImageIcon, X, Check, Eye, User, CheckSquare, Send, Calendar, ArrowLeft, Download, Award, ChevronDown, ChevronUp, Edit3, ChevronLeft, ChevronRight } from "lucide-react";
import { useTheme } from "@/app/context/ThemeContext";
import axios from "axios";
import { useRouter } from "next/navigation";
import QuizUploadSuccessPopup from "@/app/components/QuizUploadSuccessPopup";
import TeacherQuizCreator from "@/app/components/TeacherQuizCreator";

interface SubQuestion {
  _id?: string;
  subQuestionText: string;
  marks: number;
}

interface Question {
  id?: string;
  _id?: string;
  type: "mcq" | "single" | "short" | "essay";
  questionText: string;
  imageUrl?: string;
  imagePublicId?: string;
  options: string[];
  correctAnswer: any;
  marks: number;
  subQuestions?: SubQuestion[];
}

interface ClassSchedule {
  classId: any;
  publishType: "now" | "schedule";
  startDate?: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
}

interface QuizItem {
  _id: string;
  title: string;
  description: string;
  duration: number;
  status: "pending" | "approved" | "rejected";
  rejectReason?: string;
  isPublished: boolean;
  classIds?: any[];
  classSchedules?: ClassSchedule[];
  questions: Question[];
  createdAt: string;
}

export default function TeacherMyQuizzesPage() {
  const { darkMode } = useTheme();
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingQuiz, setEditingQuiz] = useState<QuizItem | null>(null);

  // Submissions count state per quiz
  const [quizSubmissionCounts, setQuizSubmissionCounts] = useState<{ [quizId: string]: { total: number; pending: number; evaluated: number } }>({});

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [quizToDelete, setQuizToDelete] = useState<string | null>(null);

  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [selectedQuizForPublish, setSelectedQuizForPublish] = useState<QuizItem | null>(null);
  const [teacherClasses, setTeacherClasses] = useState<any[]>([]);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  
  const [publishModes, setPublishModes] = useState<{ [classId: string]: "now" | "schedule" }>({});
  const [classScheduleData, setClassScheduleData] = useState<{ 
    [classId: string]: { startDate: string; startTime: string; endDate: string; endTime: string } 
  }>({});

  // Questions Collapse State persisted using localStorage
  const [collapsedQuestions, setCollapsedQuestions] = useState<{ [quizId: string]: boolean }>({});

  // Published Classes Pagination State per Quiz: { [quizId]: pageNumber }
  const [classPages, setClassPages] = useState<{ [quizId: string]: number }>({});
  const classesPerPage = 4;

  // Pagination State for Quizzes (1 per page)
  const [currentPage, setCurrentPage] = useState(1);
  const quizzesPerPage = 1;

  const fetchMyQuizzes = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/quiz/my-quizzes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const fetchedQuizzes = res.data;
      setQuizzes(fetchedQuizzes);

      // Load collapsed states from localStorage
      const savedCollapsed = localStorage.getItem("teacher_quiz_collapsed");
      if (savedCollapsed) {
        try {
          setCollapsedQuestions(JSON.parse(savedCollapsed));
        } catch (e) {
          console.error("Error parsing saved collapsed state", e);
        }
      }

      // Fetch submission counts
      const countsMap: { [quizId: string]: { total: number; pending: number; evaluated: number } } = {};
      for (const q of fetchedQuizzes) {
        if (q.isPublished) {
          try {
            const subRes = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/quiz/${q._id}/submissions`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            const subs = subRes.data || [];
            const evaluatedCount = subs.filter((s: any) => s.isEvaluated).length;
            const pendingCount = subs.length - evaluatedCount;
            countsMap[q._id] = {
              total: subs.length,
              pending: pendingCount,
              evaluated: evaluatedCount
            };
          } catch (e) {
            countsMap[q._id] = { total: 0, pending: 0, evaluated: 0 };
          }
        }
      }
      setQuizSubmissionCounts(countsMap);

    } catch (err) {
      console.error("Error fetching my quizzes:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeacherClasses = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/classes/my-classes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTeacherClasses(res.data);
    } catch (err) {
      console.error("Error fetching teacher classes:", err);
    }
  };

  useEffect(() => {
    fetchMyQuizzes();
    fetchTeacherClasses();
  }, []);

  const toggleQuestionsCollapse = (quizId: string) => {
    setCollapsedQuestions(prev => {
      const updated = {
        ...prev,
        [quizId]: !prev[quizId]
      };
      localStorage.setItem("teacher_quiz_collapsed", JSON.stringify(updated));
      return updated;
    });
  };

  const openPublishModal = (quiz: QuizItem) => {
    setSelectedQuizForPublish(quiz);
    const existingIds = quiz.classIds ? quiz.classIds.map((c: any) => c._id || c) : [];
    setSelectedClassIds(existingIds);

    const modes: { [key: string]: "now" | "schedule" } = {};
    const schedules: any = {};
    
    quiz.classSchedules?.forEach((sch) => {
      const cId = sch.classId?._id || sch.classId;
      modes[cId] = sch.publishType || "now";
      schedules[cId] = {
        startDate: sch.startDate ? sch.startDate.split('T')[0] : "",
        startTime: sch.startTime || "",
        endDate: sch.endDate ? sch.endDate.split('T')[0] : "",
        endTime: sch.endTime || ""
      };
    });

    setPublishModes(modes);
    setClassScheduleData(schedules);
    setPublishModalOpen(true);
  };

  const handleConfirmPublish = async () => {
    if (!selectedQuizForPublish) return;
    try {
      const token = localStorage.getItem("token");
      
      const formattedSchedules = selectedClassIds.map(cId => ({
        classId: cId,
        publishType: publishModes[cId] || "now",
        startDate: classScheduleData[cId]?.startDate || null,
        startTime: classScheduleData[cId]?.startTime || null,
        endDate: classScheduleData[cId]?.endDate || null,
        endTime: classScheduleData[cId]?.endTime || null,
      }));

      const res = await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/api/quiz/${selectedQuizForPublish._id}/publish`, {
        classIds: selectedClassIds,
        classSchedules: formattedSchedules
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.status === 200) {
        setPublishModalOpen(false);
        setSelectedQuizForPublish(null);
        fetchMyQuizzes();
      }
    } catch (err: any) {
      console.error(err.response?.data?.message || "Failed to publish quiz.");
    }
  };

  const handleUnpublish = async (id: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/api/quiz/${id}/publish`, {
        classIds: [],
        classSchedules: []
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.status === 200) {
        fetchMyQuizzes();
      }
    } catch (err: any) {
      console.error("Failed to unpublish quiz.");
    }
  };

  const handleRemoveClassFromQuiz = async (quiz: QuizItem, classIdToRemove: string) => {
    try {
      const token = localStorage.getItem("token");
      const updatedClassIds = (quiz.classIds || [])
        .map((c: any) => c._id || c)
        .filter((id: string) => id !== classIdToRemove);

      const updatedSchedules = (quiz.classSchedules || []).filter((sch: any) => {
        const cId = sch.classId?._id || sch.classId;
        return cId !== classIdToRemove;
      });

      const res = await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/api/quiz/${quiz._id}/publish`, {
        classIds: updatedClassIds,
        classSchedules: updatedSchedules
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.status === 200) {
        fetchMyQuizzes();
      }
    } catch (err: any) {
      console.error("Failed to remove class from quiz.");
    }
  };

  const toggleClassSelection = (classId: string) => {
    if (selectedClassIds.includes(classId)) {
      setSelectedClassIds(selectedClassIds.filter(id => id !== classId));
    } else {
      setSelectedClassIds([...selectedClassIds, classId]);
      if (!publishModes[classId]) {
        setPublishModes({ ...publishModes, [classId]: "now" });
      }
    }
  };

  const openDeleteModal = (id: string) => {
    setQuizToDelete(id);
    setDeleteModalOpen(true);
  };

  const confirmDeleteQuiz = async () => {
    if (!quizToDelete) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/quiz/${quizToDelete}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDeleteModalOpen(false);
      setQuizToDelete(null);
      fetchMyQuizzes();
    } catch (err: any) {
      console.error(err.response?.data?.message || "Failed to delete quiz.");
    }
  };

  const handleDownloadPDFAnswerKey = (quiz: QuizItem) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Please allow popups to download the PDF.");
      return;
    }

    let htmlContent = `
      <html>
        <head>
          <title>${quiz.title} - Answer Key</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 30px; color: #1e293b; }
            h1 { font-size: 22px; color: #0f172a; margin-bottom: 5px; }
            p { font-size: 13px; color: #64748b; margin-bottom: 20px; }
            .question-box { border: 1px solid #cbd5e1; border-radius: 8px; padding: 15px; margin-bottom: 15px; page-break-inside: avoid; }
            .q-title { font-weight: bold; font-size: 14px; margin-bottom: 8px; }
            .badge { background: #e0e7ff; color: #3730a3; padding: 3px 8px; font-size: 11px; border-radius: 4px; font-weight: bold; }
            ul { margin: 8px 0; padding-left: 20px; font-size: 13px; }
            li { margin-bottom: 4px; }
            .correct-ans { background: #d1fae5; color: #065f46; padding: 6px 10px; border-radius: 6px; font-weight: bold; margin-top: 8px; display: inline-block; font-size: 12px; }
          </style>
        </head>
        <body>
          <h1>${quiz.title} - Teacher's Answer Key</h1>
          <p>${quiz.description || 'No description provided.'} | Duration: ${quiz.duration} Minutes</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-bottom: 20px;" />
    `;

    quiz.questions.forEach((q, idx) => {
      let totalQMarks = q.marks;
      if (q.type === 'essay' && q.subQuestions && q.subQuestions.length > 0) {
        totalQMarks = q.subQuestions.reduce((s, sq) => s + sq.marks, 0);
      }

      htmlContent += `
        <div class="question-box">
          <div class="q-title">${idx + 1}. ${q.questionText} <span class="badge">${q.type.toUpperCase()} (${totalQMarks} Marks)</span></div>
      `;

      if ((q.type === 'mcq' || q.type === 'single') && q.options && q.options.length > 0) {
        htmlContent += `<ul>`;
        q.options.forEach((opt, oIdx) => {
          htmlContent += `<li><strong>(${oIdx + 1})</strong> ${opt}</li>`;
        });
        htmlContent += `</ul>`;
      }

      if (q.type === 'essay' && q.subQuestions && q.subQuestions.length > 0) {
        htmlContent += `<ul>`;
        q.subQuestions.forEach((sq, sqIdx) => {
          htmlContent += `<li><strong>(${sqIdx + 1})</strong> ${sq.subQuestionText} [${sq.marks} marks]</li>`;
        });
        htmlContent += `</ul>`;
      }

      if (q.type === 'mcq') {
        const correctStr = Array.isArray(q.correctAnswer) ? q.correctAnswer.join(', ') : String(q.correctAnswer || '');
        htmlContent += `<div class="correct-ans">✅ Correct Answers: ${correctStr}</div>`;
      } else if (q.type === 'single' || q.type === 'short') {
        const ansRef = String(q.correctAnswer || '').trim();
        htmlContent += `<div class="correct-ans">✅ Correct Answer Reference: ${ansRef || 'None specified (Manual evaluation)'}</div>`;
      } else {
        htmlContent += `<div class="correct-ans">📝 Essay / Structured Question (Evaluated by Teacher)</div>`;
      }

      htmlContent += `</div>`;
    });

    htmlContent += `
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  // Pagination Logic for Quizzes (1 full-width quiz per page)
  const indexOfLastQuiz = currentPage * quizzesPerPage;
  const indexOfFirstQuiz = indexOfLastQuiz - quizzesPerPage;
  const currentQuizzes = quizzes.slice(indexOfFirstQuiz, indexOfLastQuiz);
  const totalPages = Math.ceil(quizzes.length / quizzesPerPage);

  // Reuse the existing quiz creator form for editing so the same question types,
  // image upload handling and validation rules are used for both create and update.
  if (editingQuiz) {
    return (
      <div className={`min-h-screen p-3 sm:p-6 ${darkMode ? "bg-slate-950" : "bg-slate-50"}`}>
        <TeacherQuizCreator
          initialQuiz={editingQuiz}
          onCancel={() => setEditingQuiz(null)}
          onSaved={() => {
            setEditingQuiz(null);
            fetchMyQuizzes();
          }}
        />
      </div>
    );
  }

  return (
    <div className={`p-4 sm:p-6 lg:p-8 min-h-screen transition-colors duration-300 ${darkMode ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-900"}`}>
      
      {/* Class Selection & Scheduling Modal for Publishing / Edit Publishing */}
      {publishModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className={`w-full max-w-xl p-6 rounded-2xl shadow-xl border max-h-[90vh] overflow-y-auto ${darkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"}`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-extrabold">Select Classes & Schedule Quiz Publication</h3>
              <button onClick={() => setPublishModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-500/10">
                <X size={20} />
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-4">Choose additional or existing classes and select "Publish Now" or configure schedules without unpublishing.</p>

            {teacherClasses.length === 0 ? (
              <p className="text-xs text-center py-4 text-slate-500">No classes found. Please create a class first.</p>
            ) : (
              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1 mb-5">
                {teacherClasses.map((cls) => {
                  const isSelected = selectedClassIds.includes(cls._id);
                  const mode = publishModes[cls._id] || "now";
                  const sched = classScheduleData[cls._id] || { startDate: "", startTime: "", endDate: "", endTime: "" };
                  const gradeText = cls.grade === 'Other' ? (cls.customGradeName || 'Other') : `Grade ${cls.grade}`;

                  return (
                    <div 
                      key={cls._id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isSelected 
                          ? (darkMode ? "bg-indigo-500/10 border-indigo-500/50 text-white" : "bg-indigo-50 border-indigo-300 text-slate-900")
                          : (darkMode ? "bg-slate-800/40 border-slate-800 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-600")
                      }`}
                    >
                      <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleClassSelection(cls._id)}>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs">
                              {gradeText}
                            </span>
                            <span className="text-xs opacity-70">({cls.medium} - {cls.mode})</span>
                          </div>
                          <p className="text-xs opacity-60 mt-0.5">{cls.day} | {cls.startTime} - {cls.endTime}</p>
                        </div>
                        <div className={`w-5 h-5 rounded flex items-center justify-center border ${isSelected ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-400"}`}>
                          {isSelected && <Check size={14} />}
                        </div>
                      </div>

                      {isSelected && (
                        <div className="mt-3 pt-3 border-t border-indigo-500/20 space-y-3">
                          <div className="flex items-center gap-4 text-xs font-bold">
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input 
                                type="radio" 
                                name={`pub-mode-${cls._id}`} 
                                checked={mode === "now"} 
                                onChange={() => setPublishModes({ ...publishModes, [cls._id]: "now" })}
                              />
                              Publish Now
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input 
                                type="radio" 
                                name={`pub-mode-${cls._id}`} 
                                checked={mode === "schedule"} 
                                onChange={() => setPublishModes({ ...publishModes, [cls._id]: "schedule" })}
                              />
                              Schedule Publication
                            </label>
                          </div>

                          {mode === "schedule" && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-900/40 p-3 rounded-xl border border-indigo-500/20 text-xs">
                              <div>
                                <label className="block font-semibold mb-1 text-[11px] text-slate-300">Start Date & Time:</label>
                                <div className="flex gap-2">
                                  <input 
                                    type="date" 
                                    value={sched.startDate}
                                    onChange={(e) => setClassScheduleData({
                                      ...classScheduleData,
                                      [cls._id]: { ...sched, startDate: e.target.value }
                                    })}
                                    className="p-1.5 rounded-lg border bg-slate-800 border-slate-700 text-white flex-1 text-xs"
                                  />
                                  <input 
                                    type="time" 
                                    value={sched.startTime}
                                    onChange={(e) => setClassScheduleData({
                                      ...classScheduleData,
                                      [cls._id]: { ...sched, startTime: e.target.value }
                                    })}
                                    className="p-1.5 rounded-lg border bg-slate-800 border-slate-700 text-white text-xs"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block font-semibold mb-1 text-[11px] text-slate-300">End Date & Time (Close):</label>
                                <div className="flex gap-2">
                                  <input 
                                    type="date" 
                                    value={sched.endDate}
                                    onChange={(e) => setClassScheduleData({
                                      ...classScheduleData,
                                      [cls._id]: { ...sched, endDate: e.target.value }
                                    })}
                                    className="p-1.5 rounded-lg border bg-slate-800 border-slate-700 text-white flex-1 text-xs"
                                  />
                                  <input 
                                    type="time" 
                                    value={sched.endTime}
                                    onChange={(e) => setClassScheduleData({
                                      ...classScheduleData,
                                      [cls._id]: { ...sched, endTime: e.target.value }
                                    })}
                                    className="p-1.5 rounded-lg border bg-slate-800 border-slate-700 text-white text-xs"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button onClick={() => setPublishModalOpen(false)} className={`px-5 py-2.5 rounded-xl text-xs font-bold ${darkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700"}`}>
                Cancel
              </button>
              <button 
                onClick={handleConfirmPublish}
                disabled={selectedClassIds.length === 0}
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 shadow-sm"
              >
                Save & Update Publish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">My Quizzes</h1>
            <p className={`text-sm mt-1 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
              Manage your created quizzes, check admin approval status, view submissions, and publish them with flexible schedules.
            </p>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {deleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
            <div className={`w-full max-w-md p-6 rounded-2xl shadow-2xl border transition-all ${darkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"}`}>
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2 text-rose-500 font-bold text-lg">
                  <AlertCircle size={20} /> Confirm Deletion
                </div>
                <button onClick={() => setDeleteModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-500/10">
                  <X size={18} />
                </button>
              </div>
              <p className={`text-sm mb-6 ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
                Are you sure you want to delete this quiz? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setDeleteModalOpen(false)} className={`px-4 py-2 rounded-xl text-xs font-bold ${darkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700"}`}>
                  Cancel
                </button>
                <button onClick={confirmDeleteQuiz} className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white">
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-20">
            <p className="text-sm animate-pulse text-indigo-500">Loading your quizzes...</p>
          </div>
        ) : quizzes.length === 0 ? (
          <div className={`p-12 text-center rounded-2xl border ${darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm"}`}>
            <FileText size={40} className="mx-auto mb-3 text-slate-400 opacity-50" />
            <h3 className="text-base font-bold">No quizzes found</h3>
            <p className="text-xs text-slate-400 mt-1">You haven't created any quizzes yet.</p>
          </div>
        ) : (
          <>
            {/* Quizzes Displayed Full-Width (1 per row) with pagination */}
            <div className="space-y-6">
              {currentQuizzes.map((quiz) => {
                const isCollapsed = collapsedQuestions[quiz._id] || false;
                const subCounts = quizSubmissionCounts[quiz._id] || { total: 0, pending: 0, evaluated: 0 };

                // Pagination for published classes (4 per page)
                const currentClassPage = classPages[quiz._id] || 1;
                const allSchedules = quiz.classSchedules || [];
                const totalClassPages = Math.ceil(allSchedules.length / classesPerPage);
                const startIndex = (currentClassPage - 1) * classesPerPage;
                const paginatedSchedules = allSchedules.slice(startIndex, startIndex + classesPerPage);

                return (
                  <div 
                    key={quiz._id} 
                    className={`p-6 sm:p-8 rounded-3xl border shadow-md transition-all space-y-5 ${
                      darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
                    }`}
                  >
                    {/* Header info */}
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div>
                          <h2 className="text-xl font-extrabold">{quiz.title}</h2>
                          <p className={`text-xs mt-1 leading-relaxed ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
                            {quiz.description || "No description provided."}
                          </p>
                        </div>

                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide whitespace-nowrap ${
                          quiz.status === "approved" ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" :
                          quiz.status === "rejected" ? "bg-rose-500/10 text-rose-500 border border-rose-500/20" : 
                          "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                        }`}>
                          {quiz.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Clock size={14} /> {quiz.duration} minutes
                        </span>
                        <span>•</span>
                        <span>{quiz.questions.length} Questions</span>
                        {quiz.status === "approved" && (
                          <>
                            <span>•</span>
                            <span className={`font-bold ${quiz.isPublished ? "text-indigo-400" : "text-slate-400"}`}>
                              {quiz.isPublished ? "Published" : "Draft (Unpublished)"}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Submission Status Badges */}
                      {quiz.isPublished && (
                        <div className="flex items-center gap-2 pt-2 flex-wrap">
                          <span className="px-3 py-1 rounded-lg text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            Total Submissions: {subCounts.total}
                          </span>
                          <span className="px-3 py-1 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Pending Evaluation: {subCounts.pending}
                          </span>
                          <span className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Evaluated & Saved: {subCounts.evaluated}
                          </span>
                        </div>
                      )}
                    </div>

                    {quiz.status === "rejected" && quiz.rejectReason && (
                      <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-500 flex items-start gap-2">
                        <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                        <span><strong>Rejection Reason:</strong> {quiz.rejectReason}</span>
                      </div>
                    )}

                    {/* Published Classes & Schedules with Pagination (4 per page) */}
                    {quiz.isPublished && allSchedules.length > 0 && (
                      <div className={`pt-4 border-t space-y-3 ${darkMode ? "border-slate-800" : "border-slate-100"}`}>
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Published Classes & Schedules:</span>
                          <button
                            onClick={() => openPublishModal(quiz)}
                            className="text-xs font-bold text-indigo-400 hover:underline flex items-center gap-1.5"
                          >
                            <Edit3 size={14} /> Edit Publish / Add Class
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {paginatedSchedules.map((sch, sIdx) => {
                            const cls = sch.classId;
                            const classIdVal = cls?._id || cls;
                            
                            let gradeDisplay = "Class";
                            if (cls) {
                              if (typeof cls === 'object') {
                                if (cls.grade && cls.grade !== 'Other') {
                                  gradeDisplay = `Grade ${cls.grade}`;
                                } else if (cls.customGradeName) {
                                  gradeDisplay = cls.customGradeName;
                                } else if (cls.name) {
                                  gradeDisplay = cls.name;
                                } else if (cls.subject) {
                                  gradeDisplay = cls.subject;
                                }
                              } else {
                                const foundCls = teacherClasses.find((tc: any) => tc._id === cls);
                                if (foundCls) {
                                  gradeDisplay = foundCls.grade === 'Other' ? (foundCls.customGradeName || 'Other') : (foundCls.grade ? `Grade ${foundCls.grade}` : (foundCls.name || "Class"));
                                }
                              }
                            }

                            const resolvedClsObj = (typeof cls === 'object' && cls !== null) ? cls : teacherClasses.find((tc: any) => tc._id === classIdVal);
                            const mediumDisplay = resolvedClsObj?.medium ? ` - ${resolvedClsObj.medium}` : '';
                            const modeDisplay = resolvedClsObj?.mode ? ` (${resolvedClsObj.mode})` : '';

                            let isCurrentlyOpen = true;
                            if (sch.publishType === 'schedule') {
                              const now = new Date();
                              const startDateTime = sch.startDate && sch.startTime 
                                ? new Date(`${sch.startDate.split('T')[0]}T${sch.startTime}`)
                                : (sch.startDate ? new Date(sch.startDate) : null);
                              const endDateTime = sch.endDate && sch.endTime 
                                ? new Date(`${sch.endDate.split('T')[0]}T${sch.endTime}`)
                                : (sch.endDate ? new Date(sch.endDate) : null);

                              const isAfterStart = startDateTime ? now >= startDateTime : true;
                              const isBeforeEnd = endDateTime ? now <= endDateTime : true;
                              isCurrentlyOpen = isAfterStart && isBeforeEnd;
                            }

                            return (
                              <div key={sIdx} className={`p-3.5 rounded-2xl border text-xs space-y-2 relative ${darkMode ? "bg-slate-950/60 border-slate-800 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-700"}`}>
                                <div className="flex justify-between items-start gap-2">
                                  <div>
                                    <div className="font-extrabold text-indigo-400 text-sm">
                                      {gradeDisplay}{mediumDisplay}{modeDisplay}
                                    </div>
                                    <div className="text-[11px] opacity-70 mt-0.5">
                                      {resolvedClsObj?.day || ""} {resolvedClsObj?.startTime ? `| ${resolvedClsObj.startTime} - ${resolvedClsObj?.endTime}` : ""}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                      isCurrentlyOpen 
                                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                                        : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                    }`}>
                                      {isCurrentlyOpen ? "Open" : "Scheduled"}
                                    </span>

                                    <button
                                      onClick={() => handleRemoveClassFromQuiz(quiz, classIdVal)}
                                      title="Remove from this class"
                                      className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/20 text-rose-500 transition-colors"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </div>

                                <div className="text-[11px] opacity-80 flex items-center gap-1 pt-1.5 border-t border-slate-500/10">
                                  <Calendar size={12} />
                                  {sch.publishType === 'now' ? (
                                    <span className="text-emerald-400 font-semibold">Published Immediately (Now)</span>
                                  ) : (
                                    <span className="font-medium text-amber-300/90">
                                      Scheduled: {sch.startDate?.split('T')[0]} ({sch.startTime}) ➔ {sch.endDate?.split('T')[0]} ({sch.endTime})
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Published Classes Pagination Controls (if > 4 classes) */}
                        {totalClassPages > 1 && (
                          <div className="flex justify-between items-center pt-2 px-1 text-xs">
                            <span className="text-[11px] text-slate-400 font-medium">
                              Showing page {currentClassPage} of {totalClassPages} ({allSchedules.length} classes total)
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => setClassPages({ ...classPages, [quiz._id]: Math.max(currentClassPage - 1, 1) })}
                                disabled={currentClassPage === 1}
                                className={`p-1.5 rounded-lg border transition ${
                                  currentClassPage === 1 ? "opacity-40 cursor-not-allowed" : "hover:bg-indigo-600 hover:text-white"
                                } ${darkMode ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white"}`}
                              >
                                <ChevronLeft size={14} />
                              </button>
                              <button
                                onClick={() => setClassPages({ ...classPages, [quiz._id]: Math.min(currentClassPage + 1, totalClassPages) })}
                                disabled={currentClassPage === totalClassPages}
                                className={`p-1.5 rounded-lg border transition ${
                                  currentClassPage === totalClassPages ? "opacity-40 cursor-not-allowed" : "hover:bg-indigo-600 hover:text-white"
                                } ${darkMode ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white"}`}
                              >
                                <ChevronRight size={14} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Questions Section with Collapse/Expand Button (Persisted State) */}
                    <div className={`border-t pt-4 ${darkMode ? "border-slate-800" : "border-slate-100"}`}>
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => toggleQuestionsCollapse(quiz._id)}
                            className="text-xs font-bold text-indigo-400 hover:underline flex items-center gap-1"
                          >
                            {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                            {isCollapsed ? "View All Questions" : "Hide Questions"}
                          </button>
                        </div>
                        
                        <button
                          onClick={() => handleDownloadPDFAnswerKey(quiz)}
                          className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors"
                        >
                          <Download size={14} /> Answer sheet
                        </button>
                      </div>

                      {!isCollapsed && (
                        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                          {quiz.questions.map((q, idx) => {
                            let totalQMarks = q.marks;
                            if (q.type === 'essay' && q.subQuestions && q.subQuestions.length > 0) {
                              totalQMarks = q.subQuestions.reduce((s, sq) => s + sq.marks, 0);
                            }

                            return (
                              <div key={`${quiz._id}-question-${idx}`} className={`p-4 rounded-2xl border text-xs space-y-2.5 ${darkMode ? "bg-slate-950/50 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                                <div className="flex justify-between items-start">
                                  <p className="font-bold text-sm">
                                    {idx + 1}. {q.questionText}
                                  </p>
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 whitespace-nowrap">
                                    {q.type} ({totalQMarks} marks)
                                  </span>
                                </div>

                                {q.imageUrl && (
                                  <div className="mt-2">
                                    <span className="text-[10px] text-slate-400 flex items-center gap-1 mb-1">
                                      <ImageIcon size={12} /> Included Image:
                                    </span>
                                    <img 
                                      src={`${process.env.NEXT_PUBLIC_API_URL}${q.imageUrl}`} 
                                      alt="Question Visual" 
                                      className="max-h-36 rounded-xl border border-slate-700 object-contain" 
                                      onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                                    />
                                  </div>
                                )}

                                {(q.type === 'mcq' || q.type === 'single') && q.options && q.options.length > 0 && (
                                  <div className="space-y-1.5 mt-2 pl-3 border-l-2 border-indigo-500/40">
                                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      {q.options.map((opt, optIdx) => {
                                        const isCorrect = q.type === 'mcq' 
                                          ? (Array.isArray(q.correctAnswer) && q.correctAnswer.includes(opt))
                                          : (q.correctAnswer === opt);

                                        return (
                                          <li key={optIdx} className={`p-2.5 rounded-xl border text-xs ${isCorrect ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-bold" : (darkMode ? "bg-slate-900 border-slate-800 text-slate-300" : "bg-white border-slate-200 text-slate-700")}`}>
                                            <span className="font-bold mr-1">({optIdx + 1})</span> {opt} {isCorrect && "✅"}
                                          </li>
                                        );
                                      })}
                                    </ul>
                                  </div>
                                )}

                                {q.type === 'essay' && q.subQuestions && q.subQuestions.length > 0 && (
                                  <div className="space-y-1.5 mt-2 pl-3 border-l-2 border-indigo-500/40">
                                    <div className="space-y-1.5">
                                      {q.subQuestions.map((sq, sqIdx) => (
                                        <div key={sq._id || sqIdx} className="p-2 rounded-lg border text-xs bg-slate-900/40 flex justify-between items-center">
                                          <span><strong>({sqIdx + 1})</strong> {sq.subQuestionText}</span>
                                          <span className="text-indigo-400 font-bold">[{sq.marks} marks]</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                <div className="mt-2 pt-2 border-t border-slate-500/25 flex items-center justify-between">
                                  {q.type === 'mcq' && (
                                    <span className="font-mono bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-3 py-1 rounded-lg text-xs">
                                      ✅ Correct Answers: <strong className="text-emerald-400">{Array.isArray(q.correctAnswer) ? q.correctAnswer.join(', ') : String(q.correctAnswer || '')}</strong>
                                    </span>
                                  )}
                                  {q.type === 'single' && (
                                    <span className="font-mono bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-3 py-1 rounded-lg text-xs">
                                      ✅ Correct Answer: <strong className="text-emerald-400">{String(q.correctAnswer || '')}</strong>
                                    </span>
                                  )}
                                  {q.type === 'short' && (
                                    <span className="font-mono bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-3 py-1 rounded-lg text-xs">
                                      ✅ Correct Reference: <strong className="text-emerald-400">{String(q.correctAnswer || 'Manual grading')}</strong>
                                    </span>
                                  )}
                                  {q.type === 'essay' && (
                                    <span className="font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-3 py-1 rounded-lg text-xs">
                                      📝 Structured Essay Question (Evaluated by Teacher)
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Footer Actions */}
                    <div className={`flex flex-col sm:flex-row justify-between items-center pt-4 gap-3 border-t ${darkMode ? "border-slate-800" : "border-slate-100"}`}>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          onClick={() => setEditingQuiz(quiz)}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-indigo-500 hover:bg-indigo-500/10 transition-colors"
                        >
                          <Edit3 size={15} /> Edit Quiz
                        </button>
                        <button
                          onClick={() => openDeleteModal(quiz._id)}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 size={15} /> Delete Quiz
                        </button>
                      </div>

                      <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                        {quiz.status === "approved" && (
                          <>
                            {quiz.isPublished ? (
                              <button
                                onClick={() => handleUnpublish(quiz._id)}
                                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-all shadow-sm"
                              >
                                Unpublish
                              </button>
                            ) : (
                              <button
                                onClick={() => openPublishModal(quiz)}
                                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-sm flex items-center gap-1.5"
                              >
                                <Globe size={15} /> Publish to Classes
                              </button>
                            )}
                          </>
                        )}

                        {quiz.isPublished && (
                          <button
                            onClick={() => router.push(`/teacher/materials/submission?quizId=${quiz._id}`)}
                            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
                          >
                            <Eye size={15} /> View Submissions
                          </button>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>

            {/* Quiz Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-3 pt-6">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition ${
                    currentPage === 1 ? "opacity-40 cursor-not-allowed" : "hover:bg-indigo-600 hover:text-white"
                  } ${darkMode ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white"}`}
                >
                  Previous
                </button>
                <span className="text-xs font-extrabold px-3 py-1 rounded-lg bg-indigo-500/10 text-indigo-400">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition ${
                    currentPage === totalPages ? "opacity-40 cursor-not-allowed" : "hover:bg-indigo-600 hover:text-white"
                  } ${darkMode ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white"}`}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}