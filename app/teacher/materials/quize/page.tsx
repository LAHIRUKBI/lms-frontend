// src/app/components/TeacherQuizCreator.tsx

"use client";

import React, { useState, useRef, useEffect } from "react";
import { Plus, Trash2, Send, Image as ImageIcon, CheckCircle, Upload, X, HelpCircle, Award, Clock, FileText, ArrowRight, ArrowLeft, Eye, AlertCircle, ChevronDown, Edit3 } from "lucide-react";
import axios from "axios";
import QuizUploadSuccessPopup from "@/app/components/QuizUploadSuccessPopup";
import { useTheme } from "@/app/context/ThemeContext";

type QuestionType = "mcq" | "single" | "short" | "essay";

interface SubQuestion {
  id: string;
  subQuestionText: string;
  marks: number;
}

interface Question {
  id: string;
  _id?: string;
  type: QuestionType;
  questionText: string;
  imageFile?: File | null;
  imageUrl?: string;
  imagePublicId?: string;
  removeImage?: boolean;
  options: string[];
  correctAnswer: string | string[];
  marks: number;
  subQuestions?: SubQuestion[];
}

interface InitialQuiz {
  _id: string;
  title: string;
  description?: string;
  duration: number;
  questions: Array<{
    _id?: string;
    type: QuestionType;
    questionText: string;
    imageUrl?: string;
    imagePublicId?: string;
    options?: string[];
    correctAnswer?: string | string[];
    marks?: number;
    subQuestions?: Array<{ _id?: string; subQuestionText: string; marks: number }>;
  }>;
}

interface TeacherQuizCreatorProps {
  initialQuiz?: InitialQuiz | null;
  onCancel?: () => void;
  onSaved?: () => void;
}

export default function TeacherQuizCreator({ initialQuiz, onCancel, onSaved }: TeacherQuizCreatorProps) {
  const { darkMode } = useTheme();
  const isEditMode = Boolean(initialQuiz?._id);

  const [title, setTitle] = useState(initialQuiz?.title || "");
  const [description, setDescription] = useState(initialQuiz?.description || "");
  const [duration, setDuration] = useState(String(initialQuiz?.duration ?? 30));
  const [questions, setQuestions] = useState<Question[]>(() =>
    (initialQuiz?.questions || []).map((q, index) => ({
      id: String(q._id || `existing-${index}`),
      _id: q._id,
      type: q.type,
      questionText: q.questionText,
      imageUrl: q.imageUrl || undefined,
      imagePublicId: q.imagePublicId || undefined,
      options: Array.isArray(q.options) ? [...q.options] : [],
      correctAnswer: q.correctAnswer ?? "",
      marks: Number(q.marks ?? 3),
      subQuestions: (q.subQuestions || []).map((sq, sqIndex) => ({
        id: String(sq._id || `existing-${index}-sub-${sqIndex}`),
        subQuestionText: sq.subQuestionText,
        marks: Number(sq.marks ?? 5),
      })),
    }))
  );

  const [step, setStep] = useState<1 | 2>(1);

  const [currentType, setCurrentType] = useState<QuestionType>("mcq");
  const [currentText, setCurrentText] = useState("");

  const [currentImageFile, setCurrentImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [currentExistingImageUrl, setCurrentExistingImageUrl] = useState<string | null>(null);
  const [currentExistingImagePublicId, setCurrentExistingImagePublicId] = useState<string | null>(null);
  const [currentRemoveImage, setCurrentRemoveImage] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [currentOptions, setCurrentOptions] = useState<string[]>(["", ""]);
  const [currentCorrect, setCurrentCorrect] = useState<string>("");
  const [currentCorrectMultiple, setCurrentCorrectMultiple] = useState<string[]>([]);
  const [currentMarks, setCurrentMarks] = useState(3);

  const [hasSubQuestions, setHasSubQuestions] = useState(false);
  const [currentSubQuestions, setCurrentSubQuestions] = useState<SubQuestion[]>([
    { id: Date.now().toString(), subQuestionText: "", marks: 5 }
  ]);

  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  const [notification, setNotification] = useState<{ show: boolean; message: string; type: "error" | "info" }>({
    show: false,
    message: "",
    type: "error"
  });
  const [showReviewModal, setShowReviewModal] = useState(false);

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const triggerNotification = (message: string) => {
    setNotification({ show: true, message, type: "error" });
  };

  const handleTypeChange = (newType: QuestionType) => {
    // Re-selecting the already selected type must not overwrite a teacher-customized marks value.
    if (newType === currentType) return;

    setCurrentType(newType);
    if (newType === "mcq") {
      setCurrentMarks(3);
    } else if (newType === "single") {
      setCurrentMarks(2);
    } else if (newType === "essay") {
      setCurrentMarks(10);
    } else {
      setCurrentMarks(5);
    }
  };

  const totalQuizMarks = questions.reduce((sum, q) => {
    if (q.type === "essay" && q.subQuestions && q.subQuestions.length > 0) {
      const subTotal = q.subQuestions.reduce((subSum, sq) => subSum + sq.marks, 0);
      return sum + subTotal;
    }
    return sum + q.marks;
  }, 0);

  const handleAddOption = () => {
    setCurrentOptions([...currentOptions, ""]);
  };

  const handleOptionChange = (index: number, value: string) => {
    const updated = [...currentOptions];
    updated[index] = value;
    setCurrentOptions(updated);
  };

  const handleRemoveOption = (index: number) => {
    setCurrentOptions(currentOptions.filter((_, i) => i !== index));
  };

  const handleToggleMultipleCorrect = (option: string) => {
    if (currentCorrectMultiple.includes(option)) {
      setCurrentCorrectMultiple(currentCorrectMultiple.filter(item => item !== option));
    } else {
      setCurrentCorrectMultiple([...currentCorrectMultiple, option]);
    }
  };

  const handleAddSubQuestion = () => {
    setCurrentSubQuestions([
      ...currentSubQuestions,
      { id: Date.now().toString(), subQuestionText: "", marks: 5 }
    ]);
  };

  const handleSubQuestionChange = (index: number, field: keyof SubQuestion, value: any) => {
    const updated = [...currentSubQuestions];
    updated[index] = { ...updated[index], [field]: value };
    setCurrentSubQuestions(updated);
  };

  const handleRemoveSubQuestion = (id: string) => {
    if (currentSubQuestions.length === 1) {
      setCurrentSubQuestions([]);
      setHasSubQuestions(false);
      return;
    }
    setCurrentSubQuestions(currentSubQuestions.filter(sq => sq.id !== id));
  };

  const handleNextToQuestions = () => {
    if (!title.trim()) {
      triggerNotification("Please enter the quiz title.");
      return;
    }
    setStep(2);
  };

  const resetQuestionEditor = () => {
    setCurrentText("");
    setCurrentImageFile(null);
    setImagePreviewUrl(null);
    setCurrentExistingImageUrl(null);
    setCurrentExistingImagePublicId(null);
    setCurrentRemoveImage(false);
    if (imageInputRef.current) imageInputRef.current.value = "";
    setCurrentOptions(["", ""]);
    setCurrentCorrect("");
    setCurrentCorrectMultiple([]);
    setHasSubQuestions(false);
    setCurrentSubQuestions([{ id: Date.now().toString(), subQuestionText: "", marks: 5 }]);
    setEditingQuestionId(null);
    // Intentionally keep currentType and currentMarks unchanged so the next question
    // starts with the same type and marks until the teacher changes them.
  };

  const handleEditQuestion = (question: Question) => {
    setEditingQuestionId(question.id);
    setCurrentType(question.type);
    setCurrentText(question.questionText);
    setCurrentImageFile(null);
    setImagePreviewUrl(null);
    setCurrentExistingImageUrl(question.imageUrl || null);
    setCurrentExistingImagePublicId(question.imagePublicId || null);
    setCurrentRemoveImage(false);
    setCurrentOptions(question.options?.length ? [...question.options] : ["", ""]);
    setCurrentCorrect(Array.isArray(question.correctAnswer) ? "" : String(question.correctAnswer || ""));
    setCurrentCorrectMultiple(Array.isArray(question.correctAnswer) ? [...question.correctAnswer] : []);
    setCurrentMarks(Number(question.marks) || 3);
    setHasSubQuestions(Boolean(question.subQuestions?.length));
    setCurrentSubQuestions(
      question.subQuestions?.length
        ? question.subQuestions.map((sq) => ({ ...sq }))
        : [{ id: Date.now().toString(), subQuestionText: "", marks: 5 }]
    );
    setStep(2);
    setOpenDropdown(null);
  };

  const handleAddQuestionToQuiz = () => {
    if (!currentText.trim()) {
      triggerNotification("Please enter the question text or main description.");
      return;
    }

    if (currentType === "mcq" && currentOptions.some(opt => !opt.trim())) {
      triggerNotification("Please fill all MCQ options or remove empty ones.");
      return;
    }

    let finalCorrectAnswer: any = currentCorrect;
    if (currentType === "mcq") {
      if (currentCorrectMultiple.length === 0) {
        triggerNotification("Please select at least one correct answer for Multiple Choice (MCQ).");
        return;
      }
      finalCorrectAnswer = currentCorrectMultiple;
    } else if (currentType === "single") {
      if (!currentCorrect.trim()) {
        triggerNotification("Please provide the correct answer for Single Choice.");
        return;
      }
    } else if (currentType === "short") {
      finalCorrectAnswer = currentCorrect.trim() ? currentCorrect : "";
    }

    let calculatedMarks = currentMarks;
    let finalSubQuestions: SubQuestion[] = [];

    if (currentType === "essay") {
      if (hasSubQuestions && currentSubQuestions.length > 0) {
        if (currentSubQuestions.some(sq => !sq.subQuestionText.trim())) {
          triggerNotification("Please fill all essay sub-question texts.");
          return;
        }
        finalSubQuestions = currentSubQuestions;
        calculatedMarks = currentSubQuestions.reduce((sum, sq) => sum + sq.marks, 0);
      } else {
        calculatedMarks = currentMarks;
      }
    }

    const existingQuestion = editingQuestionId
      ? questions.find((question) => question.id === editingQuestionId)
      : undefined;

    const updatedQuestion: Question = {
      id: editingQuestionId || Date.now().toString(),
      _id: existingQuestion?._id,
      type: currentType,
      questionText: currentText,
      imageFile: currentImageFile,
      imageUrl: currentImageFile
        ? currentImageFile.name
        : (currentRemoveImage ? "" : (currentExistingImageUrl || undefined)),
      imagePublicId: currentRemoveImage ? "" : (currentExistingImagePublicId || undefined),
      removeImage: currentRemoveImage,
      options: (currentType === "mcq" || currentType === "single") ? [...currentOptions] : [],
      correctAnswer: finalCorrectAnswer,
      marks: calculatedMarks,
      subQuestions: (currentType === "essay" && hasSubQuestions && finalSubQuestions.length > 0)
        ? finalSubQuestions
        : undefined,
    };

    if (editingQuestionId) {
      setQuestions((previous) => previous.map((question) =>
        question.id === editingQuestionId ? updatedQuestion : question
      ));
    } else {
      setQuestions((previous) => [...previous, updatedQuestion]);
    }

    resetQuestionEditor();
  };

  const handleRemoveQuestion = (id: string) => {
    if (editingQuestionId === id) resetQuestionEditor();
    setQuestions((previous) => previous.filter((q) => q.id !== id));
  };

  const handlePreSubmitCheck = () => {
    if (questions.length === 0) {
      triggerNotification("Please add at least one question before submitting.");
      return;
    }
    setShowReviewModal(true);
  };

  const handleSubmitToAdmin = async () => {
    setShowReviewModal(false);
    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    formData.append("duration", duration);

    const questionsForServer = questions.map(({ imageFile, ...rest }) => rest);
    formData.append("questions", JSON.stringify(questionsForServer));

    questions.forEach((q, index) => {
      if (q.imageFile) {
        formData.append(`questionImage_${index}`, q.imageFile);
      }
    });

    try {
      const token = localStorage.getItem("token");
      const endpoint = isEditMode
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/quiz/${initialQuiz!._id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/quiz/quizzes`;

      const requestConfig = {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`
        },
      };

      const response = isEditMode
        ? await axios.put(endpoint, formData, requestConfig)
        : await axios.post(endpoint, formData, requestConfig);

      if (isEditMode && response.status === 200) {
        window.alert(response.data?.message || "Quiz updated successfully and sent for admin approval.");
        onSaved?.();
        return;
      }

      if (response.status === 201) {
        setShowSuccessPopup(true);
        setTitle("");
        setDescription("");
        setQuestions([]);
        setStep(1);
        resetQuestionEditor();
      }
    } catch (error: any) {
      console.error("Quiz submission/update error:", error);
      triggerNotification(
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Failed to connect with the server."
      );
    }
  };

  const durationLabels: { [key: string]: string } = {
    "30": "30 Mins",
    "60": "1 Hour",
    "90": "1.5 Hours",
    "120": "2 Hours",
    "150": "2.5 Hours",
    "180": "3 Hours"
  };

  const typeLabels: { [key in QuestionType]: string } = {
    "mcq": "Multiple Choice (MCQ)",
    "single": "Single Choice (MCQ)",
    "short": "Short Answer",
    "essay": "Essay / Structured Questions"
  };

  const questionTypeOrder: QuestionType[] = ["single", "mcq", "short", "essay"];


  return (
    <div
      ref={dropdownRef}
      className={`w-full max-w-full mx-auto overflow-hidden rounded-2xl border transition-colors duration-300 box-border ${
        darkMode
          ? "bg-[#0f172a] text-[#f1f5f9] border-[#334155] shadow-[0_24px_70px_rgba(0,0,0,0.24)]"
          : "bg-[#f8fafc] text-[#0f172a] border-[#e2e8f0] shadow-[0_24px_70px_rgba(31,53,39,0.08)]"
      }`}
    >
      {/* Notification Modal */}
      {notification.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0f172a]/65 backdrop-blur-md p-4">
          <div
            className={`w-full max-w-[420px] rounded-2xl border p-4 sm:p-5 text-center shadow-2xl ${
              darkMode ? "bg-[#1e293b] border-[#334155] text-[#f1f5f9]" : "bg-white border-[#e2e8f0] text-[#0f172a]"
            }`}
          >
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fcebea] text-[#c34e48]">
              <AlertCircle size={25} />
            </div>
            <p className={`mb-1 text-[10px] font-bold uppercase tracking-[0.2em] ${darkMode ? "text-[#94a3b8]" : "text-[#64748b]"}`}>
              A small check
            </p>
            <h3 className="text-lg font-bold tracking-tight">Attention required</h3>
            <p className={`mt-2 text-sm leading-6 ${darkMode ? "text-[#cbd5e1]" : "text-[#64748b]"}`}>
              {notification.message}
            </p>
            <button
              type="button"
              onClick={() => setNotification({ ...notification, show: false })}
              className="mt-4 w-full rounded-xl bg-[#4f46e5] px-4 py-3 text-xs font-bold text-white transition hover:bg-[#4338ca] focus:outline-none focus:ring-4 focus:ring-[#818cf8]/25"
            >
              Okay, got it
            </button>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-[#0f172a]/70 p-3 backdrop-blur-md sm:p-5">
          <div
            className={`my-auto flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border shadow-2xl ${
              darkMode ? "bg-[#0f172a] border-[#334155] text-[#f1f5f9]" : "bg-white border-[#e2e8f0] text-[#0f172a]"
            }`}
          >
            <div className={`flex items-start justify-between gap-4 border-b px-4 py-4 sm:px-5 ${darkMode ? "border-[#334155]" : "border-[#e2e8f0]"}`}>
              <div className="min-w-0">
                <div className={`mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] ${darkMode ? "text-[#a5b4fc]" : "text-[#6366f1]"}`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-[#818cf8]" /> Final check
                </div>
                <h2 className="flex items-center gap-2 text-base font-bold tracking-tight sm:text-lg">
                  <Eye size={20} className="shrink-0 text-[#818cf8]" />
                  {isEditMode ? "Review quiz before updating" : "Review quiz before submission"}
                </h2>
                <p className={`mt-1.5 text-xs leading-5 sm:text-sm ${darkMode ? "text-[#cbd5e1]" : "text-[#64748b]"}`}>
                  {isEditMode
                    ? "Check the revised quiz carefully before sending the changes for admin approval."
                    : "Take one final look at your quiz paper before sending it to the admin."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                aria-label="Close review"
                className={`shrink-0 rounded-xl p-2.5 transition ${darkMode ? "text-[#cbd5e1] hover:bg-[#334155] hover:text-white" : "text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#334155]"}`}
              >
                <X size={19} />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4 sm:px-5">
              <div className={`rounded-2xl border p-4 sm:p-5 ${darkMode ? "bg-[#1e293b] border-[#334155]" : "bg-[#f1f5f9] border-[#e2e8f0]"}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className={`mb-1 text-[10px] font-bold uppercase tracking-[0.17em] ${darkMode ? "text-[#a5b4fc]" : "text-[#6366f1]"}`}>
                      Quiz overview
                    </p>
                    <h3 className="break-words text-base font-bold leading-snug sm:text-lg">{title}</h3>
                    <p className={`mt-1.5 break-words text-xs leading-5 ${darkMode ? "text-[#cbd5e1]" : "text-[#64748b]"}`}>
                      {description || "No description provided."}
                    </p>
                  </div>
                  <span className={`rounded-xl px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider ${darkMode ? "bg-[#312e81] text-[#c7d2fe]" : "bg-[#eef2ff] text-[#4338ca]"}`}>
                    {isEditMode ? "Editing" : "New quiz"}
                  </span>
                </div>
                <div className={`mt-4 grid grid-cols-3 gap-2 border-t pt-4 ${darkMode ? "border-[#334155]" : "border-[#e2e8f0]"}`}>
                  <div>
                    <p className={`text-[9px] font-bold uppercase tracking-wider ${darkMode ? "text-[#94a3b8]" : "text-[#64748b]"}`}>Duration</p>
                    <p className="mt-1 text-sm font-bold tabular-nums">{duration} mins</p>
                  </div>
                  <div>
                    <p className={`text-[9px] font-bold uppercase tracking-wider ${darkMode ? "text-[#94a3b8]" : "text-[#64748b]"}`}>Total marks</p>
                    <p className="mt-1 text-sm font-bold tabular-nums">{totalQuizMarks}</p>
                  </div>
                  <div>
                    <p className={`text-[9px] font-bold uppercase tracking-wider ${darkMode ? "text-[#94a3b8]" : "text-[#64748b]"}`}>Questions</p>
                    <p className="mt-1 text-sm font-bold tabular-nums">{questions.length}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-bold">Question paper</h3>
                  <span className={`text-[10px] font-semibold ${darkMode ? "text-[#94a3b8]" : "text-[#64748b]"}`}>{questions.length} items</span>
                </div>
                {questions.map((q, idx) => (
                  <div
                    key={q.id}
                    className={`rounded-2xl border p-4 ${darkMode ? "bg-[#1e293b] border-[#334155]" : "bg-white border-[#e2e8f0]"}`}
                  >
                    <div className="mb-2.5 flex items-center justify-between gap-3">
                      <span className={`rounded-lg px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider ${darkMode ? "bg-[#312e81] text-[#c7d2fe]" : "bg-[#eef2ff] text-[#4338ca]"}`}>
                        {q.type} · {q.marks} marks
                      </span>
                      <span className={`text-[10px] font-bold tracking-wider ${darkMode ? "text-[#64748b]" : "text-[#94a3b8]"}`}>Q{String(idx + 1).padStart(2, "0")}</span>
                    </div>
                    <p className="break-words text-sm font-semibold leading-6">{q.questionText}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className={`flex flex-col-reverse gap-2.5 border-t px-4 py-3 sm:flex-row sm:justify-end sm:px-5 ${darkMode ? "border-[#334155] bg-[#111827]" : "border-[#e2e8f0] bg-[#f8fafc]"}`}>
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className={`rounded-xl border px-5 py-3 text-sm font-bold transition ${darkMode ? "border-[#475569] text-[#cbd5e1] hover:bg-[#334155]" : "border-[#e2e8f0] text-[#475569] hover:bg-[#f1f5f9]"}`}
              >
                Back & edit
              </button>
              <button
                type="button"
                onClick={handleSubmitToAdmin}
                className="flex items-center justify-center gap-2 rounded-xl bg-[#4f46e5] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#4338ca] focus:outline-none focus:ring-4 focus:ring-[#818cf8]/25"
              >
                <Send size={15} /> {isEditMode ? "Confirm & update quiz" : "Confirm & send to admin"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Workspace Header */}
      <div className={`relative overflow-hidden px-4 pb-4 pt-4 sm:px-6 sm:pb-5 sm:pt-5 lg:px-7 ${darkMode ? "bg-[#0f172a]" : "bg-[#f8fafc]"}`}>
        <div className="relative flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
          <div className="min-w-0">
            <h1 className="text-[22px] font-bold leading-tight tracking-[-0.04em] sm:text-2xl lg:text-[28px]">
              {isEditMode ? "Refine your quiz." : "Create a thoughtful quiz."}
            </h1>
            <p className={`mt-2 max-w-2xl text-xs leading-6 sm:text-sm ${darkMode ? "text-[#cbd5e1]" : "text-[#64748b]"}`}>
              {isEditMode
                ? "Make your updates, review each question and send the revised paper for approval."
                : "Bring your lesson objectives together in a clear, well-structured assessment."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isEditMode && onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-semibold transition ${darkMode ? "border-[#475569] bg-[#1e293b] text-[#cbd5e1] hover:bg-[#334155]" : "border-[#e2e8f0] bg-white text-[#475569] hover:bg-[#f1f5f9]"}`}
              >
                <ArrowLeft size={14} /> Back to my quizzes
              </button>
            )}
            <div className={`flex items-center gap-2 rounded-xl border px-3.5 py-2.5 ${darkMode ? "border-[#475569] bg-[#1e293b]" : "border-[#e2e8f0] bg-white"}`}>
              <Award size={15} className={darkMode ? "text-[#a5b4fc]" : "text-[#4f46e5]"} />
              <span className={`text-[10px] font-semibold ${darkMode ? "text-[#cbd5e1]" : "text-[#64748b]"}`}>Total marks</span>
              <span className="text-sm font-bold tabular-nums">{totalQuizMarks}</span>
            </div>
            <div className={`flex items-center gap-2 rounded-xl border px-3.5 py-2.5 ${darkMode ? "border-[#475569] bg-[#1e293b]" : "border-[#e2e8f0] bg-white"}`}>
              <HelpCircle size={15} className={darkMode ? "text-[#a5b4fc]" : "text-[#4f46e5]"} />
              <span className={`text-[10px] font-semibold ${darkMode ? "text-[#cbd5e1]" : "text-[#64748b]"}`}>Questions</span>
              <span className="text-sm font-bold tabular-nums">{questions.length}</span>
            </div>
          </div>
        </div>

        {/* Step Navigation */}
        <div className={`relative mt-4 grid grid-cols-2 gap-2 rounded-2xl border p-1.5 sm:mt-6 ${darkMode ? "border-[#334155] bg-[#0f172a]" : "border-[#e2e8f0] bg-[#f1f5f9]"}`}>
          <button
            type="button"
            onClick={() => setStep(1)}
            className={`flex min-w-0 items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition sm:px-3 ${
              step === 1
                ? darkMode ? "bg-[#312e81] text-[#f1f5f9] shadow-sm" : "bg-white text-[#0f172a] shadow-[0_2px_10px_rgba(79,70,229,0.07)]"
                : darkMode ? "text-[#94a3b8] hover:text-[#cbd5e1]" : "text-[#64748b] hover:text-[#475569]"
            }`}
          >
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${step === 1 ? "bg-[#4f46e5] text-white" : darkMode ? "bg-[#334155] text-[#94a3b8]" : "bg-[#e2e8f0] text-[#64748b]"}`}>01</span>
            <span className="min-w-0">
              <span className="block truncate text-xs font-bold sm:text-sm">Basic details</span>
              <span className={`mt-0.5 hidden text-[10px] sm:block ${step === 1 ? darkMode ? "text-[#c7d2fe]" : "text-[#64748b]" : "opacity-70"}`}>Set up your assessment</span>
            </span>
            {step === 1 && <CheckCircle size={15} className="ml-auto shrink-0 text-[#a5b4fc]" />}
          </button>
          <button
            type="button"
            onClick={() => {
              if (!title.trim()) {
                triggerNotification("Please enter the quiz title first.");
                return;
              }
              setStep(2);
            }}
            className={`flex min-w-0 items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition sm:px-3 ${
              step === 2
                ? darkMode ? "bg-[#312e81] text-[#f1f5f9] shadow-sm" : "bg-white text-[#0f172a] shadow-[0_2px_10px_rgba(79,70,229,0.07)]"
                : darkMode ? "text-[#94a3b8] hover:text-[#cbd5e1]" : "text-[#64748b] hover:text-[#475569]"
            }`}
          >
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${step === 2 ? "bg-[#4f46e5] text-white" : darkMode ? "bg-[#334155] text-[#94a3b8]" : "bg-[#e2e8f0] text-[#64748b]"}`}>02</span>
            <span className="min-w-0">
              <span className="block truncate text-xs font-bold sm:text-sm">Questions & review</span>
              <span className={`mt-0.5 hidden text-[10px] sm:block ${step === 2 ? darkMode ? "text-[#c7d2fe]" : "text-[#64748b]" : "opacity-70"}`}>Build your question paper</span>
            </span>
            {step === 2 && <CheckCircle size={15} className="ml-auto shrink-0 text-[#a5b4fc]" />}
          </button>
        </div>
      </div>

      {/* Workspace Body */}
      <div className="p-3 sm:p-4 lg:p-5">
        {/* STEP 1: Basic Details */}
        {step === 1 && (
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
            <section className={`rounded-2xl border p-4 shadow-sm sm:p-5 ${darkMode ? "bg-[#0f172a] border-[#334155]" : "bg-white border-[#e2e8f0]"}`}>
              <div className="mb-4 flex items-start gap-3">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ${darkMode ? "bg-[#312e81] text-[#a5b4fc]" : "bg-[#eef2ff] text-[#4f46e5]"}`}>
                  <FileText size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold tracking-tight sm:text-lg">Start with the essentials</h2>
                  <p className={`mt-1 text-xs leading-5 ${darkMode ? "text-[#cbd5e1]" : "text-[#64748b]"}`}>Give your quiz a clear identity and set the time students will have.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_170px]">
                <div className="min-w-0">
                  <label className={`mb-2 block text-[10px] font-bold uppercase tracking-[0.13em] ${darkMode ? "text-[#cbd5e1]" : "text-[#475569]"}`}>Quiz title <span className="text-[#6366f1]">*</span></label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Grade 10 · ICT Unit 02"
                    className={`w-full rounded-xl border px-3 py-2.5 text-xs outline-none transition placeholder:text-[#94a3b8] focus:border-[#6366f1] focus:ring-4 focus:ring-[#818cf8]/15 ${darkMode ? "bg-[#0f172a] border-[#475569] text-[#f1f5f9]" : "bg-[#f8fafc] border-[#e2e8f0] text-[#0f172a]"}`}
                  />
                </div>

                <div className="relative min-w-0">
                  <label className={`mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.13em] ${darkMode ? "text-[#cbd5e1]" : "text-[#475569]"}`}>
                    <Clock size={13} className={darkMode ? "text-[#818cf8]" : "text-[#6366f1]"} /> Duration
                  </label>
                  <button
                    type="button"
                    onClick={() => setOpenDropdown(openDropdown === "duration" ? null : "duration")}
                    className={`flex w-full items-center justify-between gap-2 rounded-xl border px-4 py-3.5 text-left text-sm font-semibold outline-none transition focus:border-[#6366f1] ${darkMode ? "bg-[#0f172a] border-[#475569] text-[#f1f5f9]" : "bg-[#f8fafc] border-[#e2e8f0] text-[#0f172a]"}`}
                  >
                    <span className="truncate">{durationLabels[duration] || `${duration} Mins`}</span>
                    <ChevronDown size={16} className={`shrink-0 text-[#64748b] transition-transform ${openDropdown === "duration" ? "rotate-180" : ""}`} />
                  </button>
                  {openDropdown === "duration" && (
                    <div className={`absolute left-0 right-0 top-full z-30 mt-2 max-h-56 overflow-y-auto rounded-xl border p-1.5 shadow-xl ${darkMode ? "bg-[#1e293b] border-[#475569]" : "bg-white border-[#e2e8f0]"}`}>
                      {[
                        { val: "30", label: "30 Mins" },
                        { val: "60", label: "1 Hour" },
                        { val: "90", label: "1.5 Hours" },
                        { val: "120", label: "2 Hours" },
                        { val: "150", label: "2.5 Hours" },
                        { val: "180", label: "3 Hours" }
                      ].map((item) => (
                        <button
                          type="button"
                          key={item.val}
                          onClick={() => { setDuration(item.val); setOpenDropdown(null); }}
                          className={`w-full rounded-lg px-3 py-2.5 text-left text-xs font-semibold transition ${duration === item.val ? darkMode ? "bg-[#312e81] text-[#c7d2fe]" : "bg-[#eef2ff] text-[#4338ca]" : darkMode ? "text-[#cbd5e1] hover:bg-[#334155]" : "text-[#475569] hover:bg-[#f1f5f9]"}`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <label className={`mb-2 block text-[10px] font-bold uppercase tracking-[0.13em] ${darkMode ? "text-[#cbd5e1]" : "text-[#475569]"}`}>Description <span className={`font-medium normal-case tracking-normal ${darkMode ? "text-[#64748b]" : "text-[#94a3b8]"}`}>(optional)</span></label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Briefly describe the topics, learning outcomes or instructions for this quiz..."
                  className={`w-full resize-y rounded-xl border px-3 py-2.5 text-xs leading-6 outline-none transition placeholder:text-[#94a3b8] focus:border-[#6366f1] focus:ring-4 focus:ring-[#818cf8]/15 ${darkMode ? "bg-[#0f172a] border-[#475569] text-[#f1f5f9]" : "bg-[#f8fafc] border-[#e2e8f0] text-[#0f172a]"}`}
                  rows={5}
                />
              </div>

              <div className={`mt-4 flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between ${darkMode ? "border-[#334155]" : "border-[#e2e8f0]"}`}>
                <p className={`text-[10px] leading-5 ${darkMode ? "text-[#64748b]" : "text-[#94a3b8]"}`}>
                  You can return to these details at any time.
                </p>
                <button
                  type="button"
                  onClick={handleNextToQuestions}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#4f46e5] px-5 py-3.5 text-xs font-bold text-white shadow-[0_8px_20px_rgba(79,70,229,0.16)] transition hover:-translate-y-0.5 hover:bg-[#4338ca] focus:outline-none focus:ring-4 focus:ring-[#818cf8]/25"
                >
                  Continue to questions <ArrowRight size={15} />
                </button>
              </div>
            </section>

            <aside className={`flex flex-col justify-between rounded-2xl border p-5 sm:p-6 ${darkMode ? "bg-[#1e293b] border-[#334155]" : "bg-[#f1f5f9] border-[#e2e8f0]"}`}>
              <div>
                <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${darkMode ? "bg-[#312e81] text-[#a5b4fc]" : "bg-white text-[#4f46e5]"}`}>
                  <Award size={18} />
                </div>
                <p className={`text-[9px] font-bold uppercase tracking-[0.2em] ${darkMode ? "text-[#a5b4fc]" : "text-[#6366f1]"}`}>A note for teachers</p>
                <h3 className="mt-2 text-base font-bold leading-snug tracking-tight">A clear brief makes a better assessment.</h3>
                <p className={`mt-2 text-xs leading-6 ${darkMode ? "text-[#cbd5e1]" : "text-[#64748b]"}`}>A few thoughtful details help students understand what they are about to work on.</p>
                <div className={`mt-6 space-y-4 border-t pt-5 ${darkMode ? "border-[#334155]" : "border-[#e2e8f0]"}`}>
                  {[
                    "Use a title students can recognise.",
                    "Choose a duration that suits the task.",
                    "Add any instructions students should know."
                  ].map((tip, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ${darkMode ? "bg-[#312e81] text-[#a5b4fc]" : "bg-white text-[#4f46e5]"}`}>0{index + 1}</span>
                      <p className={`pt-0.5 text-xs leading-5 ${darkMode ? "text-[#cbd5e1]" : "text-[#64748b]"}`}>{tip}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className={`mt-6 flex items-center gap-2 border-t pt-4 text-[10px] font-semibold ${darkMode ? "border-[#334155] text-[#94a3b8]" : "border-[#e2e8f0] text-[#64748b]"}`}>
                <CheckCircle size={13} /> Thoughtful teaching, well presented.
              </div>
            </aside>
          </div>
        )}

        {/* STEP 2: Question Builder */}
        {step === 2 && (
          <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)] 2xl:gap-6">
            {/* Question Editor */}
            <section className={`min-w-0 rounded-2xl border p-4 shadow-sm sm:p-6 lg:p-7 ${darkMode ? "bg-[#0f172a] border-[#334155]" : "bg-white border-[#e2e8f0]"}`}>
              <div className={`mb-4 flex flex-col justify-between gap-3 border-b pb-5 sm:flex-row sm:items-center ${darkMode ? "border-[#334155]" : "border-[#e2e8f0]"}`}>
                <div>
                  <p className={`mb-1 text-[9px] font-bold uppercase tracking-[0.2em] ${darkMode ? "text-[#a5b4fc]" : "text-[#6366f1]"}`}>Question studio</p>
                  <h2 className="text-base font-bold tracking-tight sm:text-lg">Build your question</h2>
                  <p className={`mt-1 text-[11px] leading-5 ${darkMode ? "text-[#94a3b8]" : "text-[#64748b]"}`}>Choose a format, write the question and set its marks.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className={`inline-flex w-fit items-center gap-1.5 rounded-lg px-2.5 py-2 text-[10px] font-bold transition ${darkMode ? "text-[#a5b4fc] hover:bg-[#334155]" : "text-[#4f46e5] hover:bg-[#eef2ff]"}`}
                >
                  <ArrowLeft size={13} /> Edit quiz details
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_110px]">
                <div className="relative min-w-0">
                  <label className={`mb-2 block text-[10px] font-bold uppercase tracking-[0.13em] ${darkMode ? "text-[#cbd5e1]" : "text-[#475569]"}`}>Question type</label>
                  <button
                    type="button"
                    onClick={() => setOpenDropdown(openDropdown === "questionType" ? null : "questionType")}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-left text-xs font-semibold transition focus:border-[#6366f1] ${darkMode ? "bg-[#0f172a] border-[#475569] text-[#f1f5f9]" : "bg-[#f8fafc] border-[#e2e8f0] text-[#0f172a]"}`}
                  >
                    <span className="truncate">{typeLabels[currentType]}</span>
                    <ChevronDown size={15} className={`shrink-0 text-[#64748b] transition-transform ${openDropdown === "questionType" ? "rotate-180" : ""}`} />
                  </button>
                  {openDropdown === "questionType" && (
                    <div className={`absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-xl border p-1.5 shadow-xl ${darkMode ? "bg-[#1e293b] border-[#475569]" : "bg-white border-[#e2e8f0]"}`}>
                      {questionTypeOrder.map((typeKey) => (
                        <button
                          type="button"
                          key={typeKey}
                          onClick={() => { handleTypeChange(typeKey); setOpenDropdown(null); }}
                          className={`w-full rounded-lg px-3 py-2.5 text-left text-xs font-semibold transition ${currentType === typeKey ? darkMode ? "bg-[#312e81] text-[#c7d2fe]" : "bg-[#eef2ff] text-[#4338ca]" : darkMode ? "text-[#cbd5e1] hover:bg-[#334155]" : "text-[#475569] hover:bg-[#f1f5f9]"}`}
                        >
                          {typeLabels[typeKey]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <label className={`mb-2 block text-[10px] font-bold uppercase tracking-[0.13em] ${darkMode ? "text-[#cbd5e1]" : "text-[#475569]"}`}>Marks</label>
                  <input
                    type="number"
                    value={currentMarks}
                    onChange={(e) => setCurrentMarks(Number(e.target.value))}
                    disabled={currentType === "essay" && hasSubQuestions}
                    className={`w-full rounded-xl border px-3.5 py-3 text-xs font-semibold outline-none transition focus:border-[#6366f1] focus:ring-4 focus:ring-[#818cf8]/15 disabled:cursor-not-allowed disabled:opacity-50 ${darkMode ? "bg-[#0f172a] border-[#475569] text-[#f1f5f9]" : "bg-[#f8fafc] border-[#e2e8f0] text-[#0f172a]"}`}
                    min={1}
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className={`mb-2 block text-[10px] font-bold uppercase tracking-[0.13em] ${darkMode ? "text-[#cbd5e1]" : "text-[#475569]"}`}>
                  {currentType === "essay" ? "Essay question / main passage / instructions" : "Question text"}
                </label>
                <textarea
                  value={currentText}
                  onChange={(e) => setCurrentText(e.target.value)}
                  placeholder={currentType === "essay" ? "Enter the paragraph, essay question or instructions..." : "Write your question clearly..."}
                  className={`w-full resize-y rounded-xl border px-3 py-2.5 text-xs leading-5 outline-none transition placeholder:text-[#94a3b8] focus:border-[#6366f1] focus:ring-4 focus:ring-[#818cf8]/15 sm:text-sm ${darkMode ? "bg-[#0f172a] border-[#475569] text-[#f1f5f9]" : "bg-[#f8fafc] border-[#e2e8f0] text-[#0f172a]"}`}
                  rows={currentType === "essay" ? 4 : 3}
                />
              </div>

              {/* Image Upload */}
              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.13em] ${darkMode ? "text-[#cbd5e1]" : "text-[#475569]"}`}>
                    <ImageIcon size={14} className={darkMode ? "text-[#818cf8]" : "text-[#6366f1]"} /> Question image
                  </label>
                  <span className={`text-[9px] font-medium ${darkMode ? "text-[#94a3b8]" : "text-[#94a3b8]"}`}>Optional</span>
                </div>
                <div className={`rounded-2xl border border-dashed p-3 ${darkMode ? "border-[#475569] bg-[#1e293b]" : "border-[#cbd5e1] bg-[#f8fafc]"}`}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${darkMode ? "bg-[#312e81] text-[#a5b4fc]" : "bg-[#eef2ff] text-[#4f46e5]"}`}>
                      <Upload size={17} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-semibold ${darkMode ? "text-[#e2e8f0]" : "text-[#334155]"}`}>Add an image to support your question</p>
                      <p className={`mt-1 text-[10px] leading-4 ${darkMode ? "text-[#94a3b8]" : "text-[#64748b]"}`}>Choose a clear image from your device.</p>
                    </div>
                    <input
                      type="file"
                      ref={imageInputRef}
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0];
                          setCurrentImageFile(file);
                          setCurrentRemoveImage(false);
                          setImagePreviewUrl(URL.createObjectURL(file));
                        }
                      }}
                      className={`w-full min-w-0 text-[10px] file:mr-2 file:cursor-pointer file:rounded-lg file:border-0 file:px-3 file:py-2 file:text-[10px] file:font-bold sm:max-w-[220px] ${darkMode ? "text-[#cbd5e1] file:bg-[#312e81] file:text-[#c7d2fe]" : "text-[#64748b] file:bg-[#eef2ff] file:text-[#4338ca]"}`}
                    />
                    {(currentImageFile || currentExistingImageUrl) && (
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentImageFile(null);
                          setImagePreviewUrl(null);
                          setCurrentExistingImageUrl(null);
                          setCurrentExistingImagePublicId(null);
                          setCurrentRemoveImage(true);
                          if (imageInputRef.current) imageInputRef.current.value = "";
                        }}
                        className={`shrink-0 self-end rounded-lg p-2 transition sm:self-auto ${darkMode ? "bg-[#3a2927] text-[#e5a29b] hover:bg-[#4b302d]" : "bg-[#f9ecea] text-[#bd5c54] hover:bg-[#f5dfdc]"}`}
                        title="Remove image"
                        aria-label="Remove image"
                      >
                        <X size={15} />
                      </button>
                    )}
                  </div>
                </div>
                {(imagePreviewUrl || currentExistingImageUrl) && !currentRemoveImage && (
                  <div className={`mt-3 inline-flex max-w-full items-center gap-3 rounded-xl border p-2.5 ${darkMode ? "border-[#475569] bg-[#1e293b]" : "border-[#e2e8f0] bg-[#f8fafc]"}`}>
                    <img
                      src={imagePreviewUrl || currentExistingImageUrl || ""}
                      alt="Question image preview"
                      className="h-16 w-16 shrink-0 rounded-lg object-cover"
                    />
                    <div className="min-w-0">
                      <p className={`text-[10px] font-bold ${darkMode ? "text-[#e2e8f0]" : "text-[#475569]"}`}>Image ready</p>
                      <p className={`mt-1 max-w-[220px] truncate text-[10px] ${darkMode ? "text-[#94a3b8]" : "text-[#64748b]"}`}>{currentImageFile?.name || "Existing question image"}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Multiple Choice Options */}
              {currentType === "mcq" && (
                <div className={`mt-6 rounded-2xl border p-4 sm:p-5 ${darkMode ? "bg-[#1e293b] border-[#334155]" : "bg-[#f8fafc] border-[#e2e8f0]"}`}>
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="text-xs font-bold">Answer options</h3>
                      <p className={`mt-1 text-[10px] ${darkMode ? "text-[#94a3b8]" : "text-[#64748b]"}`}>Tick every option that is correct.</p>
                    </div>
                    <span className={`rounded-lg px-2.5 py-1 text-[9px] font-bold ${darkMode ? "bg-[#312e81] text-[#c7d2fe]" : "bg-[#eef2ff] text-[#4338ca]"}`}>Multiple answers</span>
                  </div>
                  <div className="space-y-2.5">
                    {currentOptions.map((opt, idx) => (
                      <div key={idx} className="flex min-w-0 items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={currentCorrectMultiple.includes(opt) && opt.trim() !== ""}
                          onChange={() => handleToggleMultipleCorrect(opt)}
                          aria-label={`Mark option ${idx + 1} as correct`}
                          className="h-4 w-4 shrink-0 cursor-pointer accent-[#6366f1]"
                        />
                        <span className={`w-5 shrink-0 text-[10px] font-bold ${darkMode ? "text-[#64748b]" : "text-[#94a3b8]"}`}>{String.fromCharCode(65 + idx)}</span>
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => handleOptionChange(idx, e.target.value)}
                          placeholder={`Write option ${idx + 1}`}
                          className={`min-w-0 flex-1 rounded-xl border px-3 py-2.5 text-xs outline-none transition placeholder:text-[#94a3b8] focus:border-[#6366f1] ${darkMode ? "bg-[#0f172a] border-[#475569] text-[#f1f5f9]" : "bg-white border-[#e2e8f0] text-[#0f172a]"}`}
                        />
                        {currentOptions.length > 2 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(idx)}
                            className={`shrink-0 rounded-lg p-2 transition ${darkMode ? "text-[#64748b] hover:bg-[#3a2927] hover:text-[#e5a29b]" : "text-[#94a3b8] hover:bg-[#f9ecea] hover:text-[#bd5c54]"}`}
                            aria-label={`Remove option ${idx + 1}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={handleAddOption}
                    className={`mt-4 inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-[10px] font-bold transition ${darkMode ? "text-[#a5b4fc] hover:bg-[#334155]" : "text-[#4f46e5] hover:bg-[#eef2ff]"}`}
                  >
                    <Plus size={14} /> Add another option
                  </button>
                </div>
              )}

              {/* Single Choice Options */}
              {currentType === "single" && (
                <div className={`mt-6 rounded-2xl border p-4 sm:p-5 ${darkMode ? "bg-[#1e293b] border-[#334155]" : "bg-[#f8fafc] border-[#e2e8f0]"}`}>
                  <div className="mb-4">
                    <h3 className="text-xs font-bold">Answer options</h3>
                    <p className={`mt-1 text-[10px] ${darkMode ? "text-[#94a3b8]" : "text-[#64748b]"}`}>Select one correct answer.</p>
                  </div>
                  <div className="space-y-2.5">
                    {currentOptions.map((opt, idx) => (
                      <div key={idx} className="flex min-w-0 items-center gap-2.5">
                        <input
                          type="radio"
                          name="singleCorrectRadio"
                          checked={currentCorrect === opt && opt.trim() !== ""}
                          onChange={() => setCurrentCorrect(opt)}
                          aria-label={`Select option ${idx + 1} as correct`}
                          className="h-4 w-4 shrink-0 cursor-pointer accent-[#6366f1]"
                        />
                        <span className={`w-5 shrink-0 text-[10px] font-bold ${darkMode ? "text-[#64748b]" : "text-[#94a3b8]"}`}>{String.fromCharCode(65 + idx)}</span>
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => handleOptionChange(idx, e.target.value)}
                          placeholder={`Write option ${idx + 1}`}
                          className={`min-w-0 flex-1 rounded-xl border px-3 py-2.5 text-xs outline-none transition placeholder:text-[#94a3b8] focus:border-[#6366f1] ${darkMode ? "bg-[#0f172a] border-[#475569] text-[#f1f5f9]" : "bg-white border-[#e2e8f0] text-[#0f172a]"}`}
                        />
                        {currentOptions.length > 2 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(idx)}
                            className={`shrink-0 rounded-lg p-2 transition ${darkMode ? "text-[#64748b] hover:bg-[#3a2927] hover:text-[#e5a29b]" : "text-[#94a3b8] hover:bg-[#f9ecea] hover:text-[#bd5c54]"}`}
                            aria-label={`Remove option ${idx + 1}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={handleAddOption}
                    className={`mt-4 inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-[10px] font-bold transition ${darkMode ? "text-[#a5b4fc] hover:bg-[#334155]" : "text-[#4f46e5] hover:bg-[#eef2ff]"}`}
                  >
                    <Plus size={14} /> Add another option
                  </button>
                </div>
              )}

              {/* Essay Sub-questions */}
              {currentType === "essay" && (
                <div className={`mt-6 rounded-2xl border p-4 sm:p-5 ${darkMode ? "bg-[#1e293b] border-[#334155]" : "bg-[#f8fafc] border-[#e2e8f0]"}`}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <label className="flex cursor-pointer items-center gap-2.5 text-xs font-bold">
                      <input
                        type="checkbox"
                        checked={hasSubQuestions}
                        onChange={(e) => setHasSubQuestions(e.target.checked)}
                        className="h-4 w-4 shrink-0 cursor-pointer accent-[#6366f1]"
                      />
                      Add structured sub-questions
                    </label>
                    <span className={`rounded-lg px-2.5 py-1 text-[9px] font-semibold ${darkMode ? "bg-[#334155] text-[#cbd5e1]" : "bg-[#f1f5f9] text-[#64748b]"}`}>Optional parts</span>
                  </div>
                  {hasSubQuestions && (
                    <div className={`mt-4 space-y-3 border-t pt-4 ${darkMode ? "border-[#334155]" : "border-[#e2e8f0]"}`}>
                      {currentSubQuestions.map((sq, sIdx) => (
                        <div key={sq.id} className={`rounded-xl border p-3.5 ${darkMode ? "bg-[#111827] border-[#334155]" : "bg-white border-[#e2e8f0]"}`}>
                          <div className="mb-2.5 flex items-center justify-between gap-3">
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${darkMode ? "text-[#cbd5e1]" : "text-[#64748b]"}`}>Part {sIdx + 1}</span>
                            <div className="flex items-center gap-2">
                              <label className={`text-[9px] font-semibold ${darkMode ? "text-[#94a3b8]" : "text-[#94a3b8]"}`}>Marks</label>
                              <input
                                type="number"
                                value={sq.marks}
                                onChange={(e) => handleSubQuestionChange(sIdx, "marks", Number(e.target.value))}
                                className={`w-16 rounded-lg border px-2 py-1.5 text-center text-[11px] font-bold outline-none focus:border-[#6366f1] ${darkMode ? "bg-[#1e293b] border-[#475569] text-[#f1f5f9]" : "bg-[#f8fafc] border-[#e2e8f0] text-[#0f172a]"}`}
                                min={1}
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveSubQuestion(sq.id)}
                                className={`rounded-lg p-1.5 transition ${darkMode ? "text-[#94a3b8] hover:bg-[#3a2927] hover:text-[#e5a29b]" : "text-[#94a3b8] hover:bg-[#f9ecea] hover:text-[#bd5c54]"}`}
                                aria-label={`Remove part ${sIdx + 1}`}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                          <input
                            type="text"
                            value={sq.subQuestionText}
                            onChange={(e) => handleSubQuestionChange(sIdx, "subQuestionText", e.target.value)}
                            placeholder={`Enter sub-question ${sIdx + 1} (e.g. Explain the process)`}
                            className={`w-full rounded-lg border px-3 py-2.5 text-xs outline-none transition placeholder:text-[#94a3b8] focus:border-[#6366f1] ${darkMode ? "bg-[#1e293b] border-[#475569] text-[#f1f5f9]" : "bg-[#f8fafc] border-[#e2e8f0] text-[#0f172a]"}`}
                          />
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={handleAddSubQuestion}
                        className={`inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-[10px] font-bold transition ${darkMode ? "text-[#a5b4fc] hover:bg-[#334155]" : "text-[#4f46e5] hover:bg-[#eef2ff]"}`}
                      >
                        <Plus size={14} /> Add another part
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Short Answer Reference */}
              {currentType === "short" && (
                <div className="mt-6">
                  <label className={`mb-2 block text-[10px] font-bold uppercase tracking-[0.13em] ${darkMode ? "text-[#cbd5e1]" : "text-[#475569]"}`}>
                    Correct answer reference <span className={`font-medium normal-case tracking-normal ${darkMode ? "text-[#64748b]" : "text-[#94a3b8]"}`}>(optional · for teacher use)</span>
                  </label>
                  <input
                    type="text"
                    value={currentCorrect as string}
                    onChange={(e) => setCurrentCorrect(e.target.value)}
                    placeholder="Add a suggested answer for marking..."
                    className={`w-full rounded-xl border px-4 py-3 text-xs outline-none transition placeholder:text-[#94a3b8] focus:border-[#6366f1] focus:ring-4 focus:ring-[#818cf8]/15 ${darkMode ? "bg-[#0f172a] border-[#475569] text-[#f1f5f9]" : "bg-[#f8fafc] border-[#e2e8f0] text-[#0f172a]"}`}
                  />
                </div>
              )}

              <div className={`mt-4 flex flex-col-reverse gap-2.5 border-t pt-5 sm:flex-row ${darkMode ? "border-[#334155]" : "border-[#e2e8f0]"}`}>
                {editingQuestionId && (
                  <button
                    type="button"
                    onClick={resetQuestionEditor}
                    className={`rounded-xl border px-4 py-3 text-xs font-bold transition sm:flex-1 ${darkMode ? "border-[#475569] text-[#cbd5e1] hover:bg-[#334155]" : "border-[#e2e8f0] text-[#475569] hover:bg-[#f1f5f9]"}`}
                  >
                    Cancel editing
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleAddQuestionToQuiz}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#4f46e5] px-5 py-3.5 text-xs font-bold text-white shadow-[0_8px_20px_rgba(79,70,229,0.16)] transition hover:-translate-y-0.5 hover:bg-[#4338ca] focus:outline-none focus:ring-4 focus:ring-[#818cf8]/25 sm:flex-[1.5]"
                >
                  {editingQuestionId ? <Edit3 size={15} /> : <Plus size={16} />}
                  {editingQuestionId ? "Save question changes" : "Add question to quiz"}
                </button>
              </div>
            </section>

            {/* Added Questions Panel */}
            <aside className={`min-w-0 overflow-hidden rounded-2xl border shadow-sm xl:sticky xl:top-5 ${darkMode ? "bg-[#0f172a] border-[#334155]" : "bg-white border-[#e2e8f0]"}`}>
              <div className={`border-b px-5 py-5 sm:px-6 ${darkMode ? "border-[#334155]" : "border-[#e2e8f0]"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className={`mb-1 text-[9px] font-bold uppercase tracking-[0.2em] ${darkMode ? "text-[#a5b4fc]" : "text-[#6366f1]"}`}>Your question paper</p>
                    <h3 className="text-base font-bold tracking-tight">Added questions</h3>
                  </div>
                  <span className={`flex h-9 min-w-9 items-center justify-center rounded-xl px-2 text-xs font-bold tabular-nums ${darkMode ? "bg-[#312e81] text-[#c7d2fe]" : "bg-[#eef2ff] text-[#4338ca]"}`}>
                    {questions.length}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className={`rounded-xl px-3 py-2.5 ${darkMode ? "bg-[#1e293b]" : "bg-[#f1f5f9]"}`}>
                    <p className={`text-[9px] font-semibold uppercase tracking-wider ${darkMode ? "text-[#94a3b8]" : "text-[#94a3b8]"}`}>Questions</p>
                    <p className="mt-0.5 text-lg font-bold tabular-nums">{questions.length}</p>
                  </div>
                  <div className={`rounded-xl px-3 py-2.5 ${darkMode ? "bg-[#1e293b]" : "bg-[#f1f5f9]"}`}>
                    <p className={`text-[9px] font-semibold uppercase tracking-wider ${darkMode ? "text-[#94a3b8]" : "text-[#94a3b8]"}`}>Total marks</p>
                    <p className="mt-0.5 text-lg font-bold tabular-nums">{totalQuizMarks}</p>
                  </div>
                </div>
              </div>

              <div className="max-h-[560px] space-y-2.5 overflow-y-auto p-3 sm:p-4">
                {questions.length === 0 ? (
                  <div className={`flex min-h-[210px] flex-col items-center justify-center rounded-2xl border border-dashed px-5 py-10 text-center ${darkMode ? "border-[#475569] bg-[#1e293b]" : "border-[#e2e8f0] bg-[#f8fafc]"}`}>
                    <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${darkMode ? "bg-[#312e81] text-[#a5b4fc]" : "bg-[#eef2ff] text-[#4f46e5]"}`}>
                      <FileText size={21} />
                    </div>
                    <p className="text-xs font-bold">Your paper is taking shape</p>
                    <p className={`mt-1.5 max-w-[220px] text-[10px] leading-5 ${darkMode ? "text-[#94a3b8]" : "text-[#64748b]"}`}>Questions you add will appear here. You can edit or remove them at any time.</p>
                  </div>
                ) : (
                  questions.map((q, index) => {
                    let effectiveMarks = q.marks;
                    if (q.type === "essay" && q.subQuestions) {
                      effectiveMarks = q.subQuestions.reduce((s, sq) => s + sq.marks, 0);
                    }

                    return (
                      <div
                        key={q.id}
                        className={`group rounded-2xl border p-3 transition ${darkMode ? "bg-[#1e293b] border-[#334155] hover:border-[#475569]" : "bg-[#f8fafc] border-[#e2e8f0] hover:border-[#c7d2fe]"}`}
                      >
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="min-w-0 flex-1">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <span className={`rounded-md px-2 py-1 text-[8px] font-bold uppercase tracking-wider ${darkMode ? "bg-[#312e81] text-[#c7d2fe]" : "bg-[#eef2ff] text-[#4338ca]"}`}>
                                {q.type}
                              </span>
                              <span className={`text-[9px] font-semibold ${darkMode ? "text-[#94a3b8]" : "text-[#64748b]"}`}>{effectiveMarks} marks</span>
                              <span className={`ml-auto text-[9px] font-bold ${darkMode ? "text-[#64748b]" : "text-[#94a3b8]"}`}>Q{String(index + 1).padStart(2, "0")}</span>
                            </div>
                            <p className={`break-words text-xs font-semibold leading-5 ${darkMode ? "text-[#e2e8f0]" : "text-[#334155]"}`}>
                              {q.questionText}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleEditQuestion(q)}
                              className={`rounded-lg p-2 transition ${darkMode ? "text-[#a5b4fc] hover:bg-[#312e81] hover:text-[#c7d2fe]" : "text-[#4f46e5] hover:bg-[#eef2ff] hover:text-[#4338ca]"}`}
                              title="Edit question"
                              aria-label="Edit question"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveQuestion(q.id)}
                              className={`rounded-lg p-2 transition ${darkMode ? "text-[#64748b] hover:bg-[#3a2927] hover:text-[#e5a29b]" : "text-[#94a3b8] hover:bg-[#f9ecea] hover:text-[#bd5c54]"}`}
                              title="Delete question"
                              aria-label="Delete question"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {q.imageUrl && (
                          <span className={`mt-2 flex items-start gap-1.5 break-all text-[9px] font-medium ${darkMode ? "text-[#94a3b8]" : "text-[#64748b]"}`}>
                            <ImageIcon size={11} className="mt-0.5 shrink-0" /> Image attached: {q.imageUrl}
                          </span>
                        )}

                        {q.type === "mcq" && q.options && q.options.length > 0 && (
                          <div className={`mt-3 space-y-1.5 border-l-2 pl-3 ${darkMode ? "border-[#818cf8]" : "border-[#818cf8]"}`}>
                            {q.options.map((opt, oIdx) => {
                              const isCorrect = Array.isArray(q.correctAnswer) && q.correctAnswer.includes(opt);
                              return (
                                <div key={oIdx} className={`break-words text-[10px] leading-4 ${isCorrect ? darkMode ? "font-bold text-[#c7d2fe]" : "font-bold text-[#4338ca]" : darkMode ? "text-[#cbd5e1]" : "text-[#64748b]"}`}>
                                  <span className="mr-1.5 font-bold opacity-70">{String.fromCharCode(65 + oIdx)}.</span>{opt} {isCorrect && "· Correct"}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {q.type === "single" && q.options && q.options.length > 0 && (
                          <div className={`mt-3 space-y-1.5 border-l-2 pl-3 ${darkMode ? "border-[#818cf8]" : "border-[#818cf8]"}`}>
                            {q.options.map((opt, oIdx) => {
                              const isCorrect = opt === q.correctAnswer;
                              return (
                                <div key={oIdx} className={`break-words text-[10px] leading-4 ${isCorrect ? darkMode ? "font-bold text-[#c7d2fe]" : "font-bold text-[#4338ca]" : darkMode ? "text-[#cbd5e1]" : "text-[#64748b]"}`}>
                                  <span className="mr-1.5 font-bold opacity-70">{String.fromCharCode(65 + oIdx)}.</span>{opt} {isCorrect && "· Correct"}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {q.type === "essay" && q.subQuestions && (
                          <div className={`mt-3 space-y-1.5 border-l-2 pl-3 ${darkMode ? "border-[#818cf8] text-[#cbd5e1]" : "border-[#818cf8] text-[#64748b]"}`}>
                            {q.subQuestions.map((sq, sqIdx) => (
                              <div key={sq.id} className="break-words text-[10px] font-medium leading-4">
                                ({sqIdx + 1}) {sq.subQuestionText} <span className={`font-bold ${darkMode ? "text-[#c7d2fe]" : "text-[#4338ca]"}`}>[{sq.marks} marks]</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {q.type !== "mcq" && q.type !== "single" && q.type !== "essay" && (
                          <p className={`mt-2 break-words text-[10px] leading-4 ${darkMode ? "text-[#cbd5e1]" : "text-[#64748b]"}`}>
                            <span className="font-bold">Answer reference:</span> {String(q.correctAnswer || "None specified (Manual grading)")}
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {isEditMode && (
                <p className={`mx-4 mb-3 rounded-xl border px-3.5 py-3 text-[10px] leading-5 sm:mx-5 ${darkMode ? "border-[#475569] bg-[#1e293b] text-[#cbd5e1]" : "border-[#e2e8f0] bg-[#eef2ff] text-[#64748b]"}`}>
                  After updating, this quiz will return to Pending Admin Approval and will be temporarily unpublished. Its previous class and schedule selections will be retained for republishing after approval.
                </p>
              )}

              <div className={`border-t p-4 sm:p-5 ${darkMode ? "border-[#334155]" : "border-[#e2e8f0]"}`}>
                <button
                  type="button"
                  onClick={handlePreSubmitCheck}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#4f46e5] px-4 py-3 text-xs font-bold text-white shadow-[0_8px_20px_rgba(79,70,229,0.16)] transition hover:-translate-y-0.5 hover:bg-[#4338ca] focus:outline-none focus:ring-4 focus:ring-[#818cf8]/25"
                >
                  <Send size={15} /> {isEditMode ? "Review & update quiz" : "Review & submit quiz"}
                  <ArrowRight size={14} className="ml-1" />
                </button>
                <p className={`mt-2.5 text-center text-[9px] leading-4 ${darkMode ? "text-[#94a3b8]" : "text-[#94a3b8]"}`}>You can review the complete paper before sending it.</p>
              </div>
            </aside>
          </div>
        )}
      </div>

      <QuizUploadSuccessPopup
        isOpen={showSuccessPopup}
        onClose={() => setShowSuccessPopup(false)}
        message="Your quiz has been successfully submitted to the Admin for review and approval!"
      />
    </div>
  );
}
