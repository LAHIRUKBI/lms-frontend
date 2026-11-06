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
      className={`w-full max-w-full sm:max-w-4xl md:max-w-5xl mx-auto p-2 sm:p-4 md:p-8 rounded-xl sm:rounded-3xl shadow-xl border transition-colors duration-300 space-y-6 overflow-x-hidden box-border ${
        darkMode ? "bg-slate-900 text-slate-100 border-slate-800" : "bg-white text-slate-900 border-slate-200"
      }`}
    >
      {/* Custom Notification Modal */}
      {notification.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className={`max-w-md w-full p-6 rounded-3xl shadow-2xl border text-center space-y-4 ${
            darkMode ? "bg-slate-800 border-slate-700 text-slate-100" : "bg-white border-slate-100 text-slate-900"
          }`}>
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto shadow-inner">
              <AlertCircle size={24} />
            </div>
            <h3 className="text-lg font-bold">Attention Required</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{notification.message}</p>
            <button
              onClick={() => setNotification({ ...notification, show: false })}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition shadow-lg shadow-indigo-600/20"
            >
              Okay, Got It
            </button>
          </div>
        </div>
      )}

      {/* Review Modal before Final Submission */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className={`max-w-3xl w-full max-h-[90vh] p-4 sm:p-8 rounded-3xl shadow-2xl border flex flex-col space-y-6 box-border ${
            darkMode ? "bg-slate-900 border-slate-700 text-slate-100" : "bg-white border-slate-200 text-slate-900"
          }`}>
            <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold flex items-center gap-2">
                  <Eye className="text-indigo-500 shrink-0" size={22} /> {isEditMode ? "Review Quiz Before Updating" : "Review Quiz Before Submission"}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {isEditMode ? "Check the revised quiz carefully before sending the changes for admin approval." : "Please inspect your quiz paper carefully before sending it to the admin."}
                </p>
              </div>
              <button onClick={() => setShowReviewModal(false)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto pr-1 flex-1">
              <div className={`p-4 rounded-2xl border ${darkMode ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
                <h3 className="font-bold text-base text-indigo-600 dark:text-indigo-400 break-words">{title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 break-words">{description || "No description provided."}</p>
                <div className="flex gap-3 sm:gap-4 mt-3 text-xs font-semibold flex-wrap">
                  <span>⏱️ Duration: {duration} Mins</span>
                  <span>📊 Total Marks: {totalQuizMarks}</span>
                  <span>❓ Questions: {questions.length}</span>
                </div>
              </div>

              <div className="space-y-3">
                {questions.map((q, idx) => (
                  <div key={q.id} className={`p-4 rounded-2xl border space-y-2 ${darkMode ? "bg-slate-800/30 border-slate-700" : "bg-white border-slate-200"}`}>
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-indigo-500 uppercase">{q.type} • {q.marks} Marks</span>
                      <span className="text-slate-400 font-semibold">Q{idx + 1}</span>
                    </div>
                    <p className="font-bold text-sm break-words">{q.questionText}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setShowReviewModal(false)}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Back & Edit
              </button>
              <button
                onClick={handleSubmitToAdmin}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-600/20 transition flex items-center justify-center gap-2"
              >
                <Send size={16} /> {isEditMode ? "Confirm & Update Quiz" : "Confirm & Send to Admin"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className={`pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b ${
        darkMode ? "border-slate-800" : "border-slate-200"
      }`}>
        <div>
          <h1 className="text-lg sm:text-2xl md:text-3xl font-extrabold flex items-center gap-2.5 sm:gap-3 tracking-tight">
            <div className={`p-2 sm:p-2.5 rounded-2xl border shadow-inner shrink-0 ${
              darkMode ? "bg-indigo-950/50 text-indigo-400 border-indigo-900/50" : "bg-indigo-50 text-indigo-600 border-indigo-100"
            }`}>
              <FileText size={22} />
            </div>
            {isEditMode ? "Edit Quiz" : "Create New Quiz"}
          </h1>
          <p className={`text-xs sm:text-sm mt-1.5 font-medium ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
            {isEditMode
              ? "Update the quiz details and questions. Your changes will be sent to the admin for approval again."
              : "Design your quiz questions cleanly and submit them seamlessly for admin approval."}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          {isEditMode && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border ${darkMode ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"}`}
            >
              <ArrowLeft size={14} /> Back to My Quizzes
            </button>
          )}
          <div className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl flex items-center gap-2 text-xs font-semibold shadow-sm border ${
            darkMode ? "bg-slate-800/80 border-slate-700/60 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-700"
          }`}>
            <Award size={14} className="text-indigo-500 shrink-0" /> Total Marks: <span className="text-indigo-600 dark:text-indigo-400 font-bold">{totalQuizMarks}</span>
          </div>
          <div className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl flex items-center gap-2 text-xs font-semibold shadow-sm border ${
            darkMode ? "bg-slate-800/80 border-slate-700/60 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-700"
          }`}>
            <HelpCircle size={14} className="text-indigo-500 shrink-0" /> Questions: <span className="text-indigo-600 dark:text-indigo-400 font-bold">{questions.length}</span>
          </div>
        </div>
      </div>

      {/* Step Indicator Tabs */}
      <div className={`flex border-b text-xs sm:text-sm font-semibold overflow-x-auto w-full ${darkMode ? "border-slate-800" : "border-slate-200"}`}>
        <button
          type="button"
          onClick={() => setStep(1)}
          className={`pb-3 px-3 sm:px-6 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            step === 1
              ? "border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400 font-bold"
              : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          }`}
        >
          <span className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold shrink-0 ${
            step === 1 ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20" : darkMode ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-600"
          }`}>1</span>
          Basic Details
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
          className={`pb-3 px-3 sm:px-6 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            step === 2
              ? "border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400 font-bold"
              : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          }`}
        >
          <span className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold shrink-0 ${
            step === 2 ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20" : darkMode ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-600"
          }`}>2</span>
          Add Questions & Submit
        </button>
      </div>

      {/* STEP 1: Basic Details */}
      {step === 1 && (
        <div className={`p-4 sm:p-6 md:p-8 rounded-2xl border shadow-sm backdrop-blur-md space-y-6 overflow-hidden box-border ${
          darkMode ? "bg-slate-800/40 border-slate-700" : "bg-slate-50 border-slate-200"
        }`}>
          <h2 className={`font-bold text-sm sm:text-base ${darkMode ? "text-slate-200" : "text-slate-800"}`}>
            Step 1: Enter Basic Quiz Details
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <div className="sm:col-span-2">
              <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${darkMode ? "text-slate-300" : "text-slate-600"}`}>Quiz Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Grade 10 - Science Unit Test"
                className={`w-full max-w-full box-border p-3 text-sm border rounded-xl outline-none transition-all shadow-sm ${
                  darkMode ? "bg-slate-800 border-slate-600 text-white focus:border-indigo-400" : "bg-white border-slate-300 text-slate-900 focus:border-indigo-500"
                }`}
              />
            </div>

            <div className="relative">
              <label className={`block text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
                <Clock size={14} className="text-indigo-500 shrink-0" /> Duration
              </label>
              <div
                onClick={() => setOpenDropdown(openDropdown === "duration" ? null : "duration")}
                className={`w-full p-3 rounded-xl flex items-center justify-between cursor-pointer font-medium text-sm select-none ${
                  darkMode ? "bg-slate-800 border border-slate-600 text-white" : "bg-white border border-slate-300 text-slate-900"
                }`}
              >
                <span className="truncate">{durationLabels[duration] || `${duration} Mins`}</span>
                <ChevronDown size={16} className={`transition-transform duration-200 shrink-0 ${openDropdown === "duration" ? "rotate-180" : ""}`} />
              </div>

              {openDropdown === "duration" && (
                <div className={`absolute left-0 right-0 top-full mt-1.5 max-h-52 overflow-y-auto rounded-xl shadow-xl z-30 border ${
                  darkMode ? "bg-slate-900 border-slate-700 text-slate-200" : "bg-white border-slate-200 text-slate-700"
                }`}>
                  {[
                    { val: "30", label: "30 Mins" },
                    { val: "60", label: "1 Hour" },
                    { val: "90", label: "1.5 Hours" },
                    { val: "120", label: "2 Hours" },
                    { val: "150", label: "2.5 Hours" },
                    { val: "180", label: "3 Hours" }
                  ].map((item) => (
                    <div
                      key={item.val}
                      onClick={() => { setDuration(item.val); setOpenDropdown(null); }}
                      className={`p-3 text-sm font-medium cursor-pointer transition-colors ${
                        darkMode ? "hover:bg-slate-800" : "hover:bg-slate-100"
                      } ${duration === item.val ? (darkMode ? "bg-slate-800 text-indigo-400 font-bold" : "bg-slate-100 text-indigo-600 font-bold") : ""}`}
                    >
                      {item.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${darkMode ? "text-slate-300" : "text-slate-600"}`}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Briefly describe what this quiz tests..."
              className={`w-full max-w-full box-border p-3 text-sm border rounded-xl outline-none transition-all shadow-sm ${
                darkMode ? "bg-slate-800 border-slate-600 text-white" : "bg-white border-slate-300 text-slate-900"
              }`}
              rows={4}
            />
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="button"
              onClick={handleNextToQuestions}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-7 py-3 rounded-xl font-bold transition-all text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-indigo-600/20 active:scale-[0.98]"
            >
              Next: Add Questions <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Add Questions & Review */}
      {step === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
          {/* Left Column: Form Inputs */}
          <div className={`lg:col-span-7 p-3 sm:p-6 rounded-2xl border shadow-sm backdrop-blur-md space-y-6 overflow-hidden box-border ${
            darkMode ? "bg-slate-800/40 border-slate-700" : "bg-slate-50 border-slate-200"
          }`}>
            <div className={`flex justify-between items-center pb-3 border-b ${darkMode ? "border-slate-700" : "border-slate-200"}`}>
              <h2 className={`font-bold text-sm sm:text-base ${darkMode ? "text-slate-200" : "text-slate-800"}`}>
                Step 2: Add Questions
              </h2>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1.5 shrink-0"
              >
                <ArrowLeft size={14} /> Edit Basic Details
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Question Type */}
              <div className="relative">
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${darkMode ? "text-slate-300" : "text-slate-600"}`}>Question Type</label>
                <div
                  onClick={() => setOpenDropdown(openDropdown === "questionType" ? null : "questionType")}
                  className={`w-full p-2.5 sm:p-3 rounded-xl flex items-center justify-between cursor-pointer font-medium text-xs sm:text-sm select-none ${
                    darkMode ? "bg-slate-800 border border-slate-600 text-white" : "bg-white border border-slate-300 text-slate-900"
                  }`}
                >
                  <span className="truncate">{typeLabels[currentType]}</span>
                  <ChevronDown size={14} className={`transition-transform duration-200 shrink-0 ${openDropdown === "questionType" ? "rotate-180" : ""}`} />
                </div>

                {openDropdown === "questionType" && (
                  <div className={`absolute left-0 right-0 top-full mt-1.5 rounded-xl shadow-xl z-30 border overflow-hidden ${
                    darkMode ? "bg-slate-900 border-slate-700 text-slate-200" : "bg-white border-slate-200 text-slate-700"
                  }`}>
                    {questionTypeOrder.map((typeKey) => (
                      <div
                        key={typeKey}
                        onClick={() => { handleTypeChange(typeKey); setOpenDropdown(null); }}
                        className={`p-2.5 sm:p-3 text-xs sm:text-sm font-medium cursor-pointer transition-colors ${
                          darkMode ? "hover:bg-slate-800" : "hover:bg-slate-100"
                        } ${currentType === typeKey ? (darkMode ? "bg-slate-800 text-indigo-400 font-bold" : "bg-slate-100 text-indigo-600 font-bold") : ""}`}
                      >
                        {typeLabels[typeKey]}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${darkMode ? "text-slate-300" : "text-slate-600"}`}>Marks</label>
                <input
                  type="number"
                  value={currentMarks}
                  onChange={(e) => setCurrentMarks(Number(e.target.value))}
                  disabled={currentType === "essay" && hasSubQuestions}
                  className={`w-full max-w-full box-border p-2.5 text-xs sm:text-sm border rounded-xl outline-none disabled:opacity-50 shadow-sm ${
                    darkMode ? "bg-slate-800 border-slate-600 text-white" : "bg-white border-slate-300 text-slate-900"
                  }`}
                  min={1}
                />
              </div>
            </div>

            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
                {currentType === "essay" ? "Essay Question / Main Passage / Instructions" : "Question Text"}
              </label>
              <textarea
                value={currentText}
                onChange={(e) => setCurrentText(e.target.value)}
                placeholder={currentType === "essay" ? "Enter paragraph, essay question or instructions..." : "Type your question here clearly..."}
                className={`w-full max-w-full box-border p-3 text-xs sm:text-sm border rounded-xl outline-none shadow-sm ${
                  darkMode ? "bg-slate-800 border-slate-600 text-white" : "bg-white border-slate-300 text-slate-900"
                }`}
                rows={currentType === "essay" ? 3 : 2}
              />
            </div>

            {/* Image Upload with Preview */}
            <div className="space-y-2">
              <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5 ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
                <ImageIcon size={14} className="text-indigo-500 shrink-0" /> Upload Question / Passage Image (Optional)
              </label>
              <div className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3 rounded-xl border border-dashed overflow-hidden ${
                darkMode ? "border-slate-600 bg-slate-800/60" : "border-slate-300 bg-white"
              }`}>
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
                  className={`w-full text-xs file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold cursor-pointer ${
                    darkMode ? "text-slate-400 file:bg-indigo-950 file:text-indigo-300" : "text-slate-500 file:bg-indigo-50 file:text-indigo-700"
                  }`}
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
                    className={`p-2 rounded-xl transition shrink-0 self-end sm:self-auto ${darkMode ? "text-slate-400 hover:text-red-400 bg-slate-700" : "text-slate-400 hover:text-red-500 bg-slate-100"}`}
                    title="Remove Image"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              {(imagePreviewUrl || currentExistingImageUrl) && !currentRemoveImage && (
                <div className="mt-3 relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-indigo-500/30 shadow-md">
                  <img
                    src={imagePreviewUrl || currentExistingImageUrl || ""}
                    alt="Question image preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>

            {/* MCQ Options */}
            {currentType === "mcq" && (
              <div className={`p-3 sm:p-4 rounded-2xl border shadow-sm space-y-3 overflow-hidden box-border ${darkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"}`}>
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <label className={`block text-xs font-bold uppercase tracking-wider ${darkMode ? "text-slate-300" : "text-slate-700"}`}>Answer Options (Check all correct answers)</label>
                  <span className={`text-[10px] font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg ${darkMode ? "bg-indigo-950/60 text-indigo-400" : "bg-indigo-50 text-indigo-600"}`}>Multiple selections allowed</span>
                </div>
                {currentOptions.map((opt, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      type="checkbox"
                      checked={currentCorrectMultiple.includes(opt) && opt.trim() !== ""}
                      onChange={() => handleToggleMultipleCorrect(opt)}
                      className={`w-4 h-4 text-indigo-600 rounded cursor-pointer shrink-0 ${darkMode ? "border-slate-600 bg-slate-800" : "border-slate-300"}`}
                    />
                    <span className="text-xs font-bold text-slate-400 w-4 shrink-0">{idx + 1}.</span>
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => handleOptionChange(idx, e.target.value)}
                      placeholder={`Option ${idx + 1}`}
                      className={`w-full max-w-full box-border p-2 sm:p-2.5 text-xs sm:text-sm border rounded-xl shadow-sm ${darkMode ? "bg-slate-800 border-slate-600 text-white" : "bg-white border-slate-300 text-slate-900"}`}
                    />
                    {currentOptions.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(idx)}
                        className="text-slate-400 hover:text-red-500 p-1.5 sm:p-2 rounded-xl transition shrink-0"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="text-xs text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1.5 mt-2 hover:underline p-1"
                >
                  <Plus size={16} /> Add another option
                </button>
              </div>
            )}

            {/* Single Choice Options */}
            {currentType === "single" && (
              <div className={`p-3 sm:p-4 rounded-2xl border shadow-sm space-y-3 overflow-hidden box-border ${darkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"}`}>
                <div className="flex justify-between items-center">
                  <label className={`block text-xs font-bold uppercase tracking-wider ${darkMode ? "text-slate-300" : "text-slate-700"}`}>Answer Options (Select 1 correct answer)</label>
                </div>
                {currentOptions.map((opt, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      type="radio"
                      name="singleCorrectRadio"
                      checked={currentCorrect === opt && opt.trim() !== ""}
                      onChange={() => setCurrentCorrect(opt)}
                      className={`w-4 h-4 text-indigo-600 cursor-pointer shrink-0 ${darkMode ? "border-slate-600 bg-slate-800" : "border-slate-300"}`}
                    />
                    <span className="text-xs font-bold text-slate-400 w-4 shrink-0">{idx + 1}.</span>
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => handleOptionChange(idx, e.target.value)}
                      placeholder={`Option ${idx + 1}`}
                      className={`w-full max-w-full box-border p-2 sm:p-2.5 text-xs sm:text-sm border rounded-xl shadow-sm ${darkMode ? "bg-slate-800 border-slate-600 text-white" : "bg-white border-slate-300 text-slate-900"}`}
                    />
                    {currentOptions.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(idx)}
                        className="text-slate-400 hover:text-red-500 p-1.5 sm:p-2 rounded-xl transition shrink-0"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="text-xs text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1.5 mt-2 hover:underline p-1"
                >
                  <Plus size={16} /> Add another option
                </button>
              </div>
            )}

            {/* Essay Sub-questions Toggle & Builder */}
            {currentType === "essay" && (
              <div className={`p-3 sm:p-4 rounded-2xl border shadow-sm space-y-4 overflow-hidden box-border ${darkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"}`}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className={`text-xs font-bold flex items-center gap-2 cursor-pointer ${darkMode ? "text-slate-300" : "text-slate-700"}`}>
                    <input 
                      type="checkbox"
                      checked={hasSubQuestions}
                      onChange={(e) => setHasSubQuestions(e.target.checked)}
                      className={`w-4 h-4 text-indigo-600 rounded shrink-0 ${darkMode ? "border-slate-600 bg-slate-800" : "border-slate-300"}`}
                    />
                    Add Sub-Questions (Optional parts like i, ii, iii)
                  </label>
                  <span className="text-[10px] font-semibold text-slate-400">Optional</span>
                </div>

                {hasSubQuestions && (
                  <div className={`space-y-3 pt-3 border-t ${darkMode ? "border-slate-700" : "border-slate-200"}`}>
                    {currentSubQuestions.map((sq, sIdx) => (
                      <div key={sq.id} className={`p-3 rounded-xl border space-y-2 ${darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
                        <div className="flex justify-between items-center gap-2">
                          <span className={`text-xs font-bold ${darkMode ? "text-slate-300" : "text-slate-700"}`}>Part {sIdx + 1}</span>
                          <div className="flex items-center gap-2">
                            <label className="text-[11px] font-semibold text-slate-500">Marks:</label>
                            <input
                              type="number"
                              value={sq.marks}
                              onChange={(e) => handleSubQuestionChange(sIdx, "marks", Number(e.target.value))}
                              className={`w-14 p-1 text-xs font-bold border rounded-lg text-center ${darkMode ? "bg-slate-800 border-slate-600 text-white" : "bg-white border-slate-300 text-slate-900"}`}
                              min={1}
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveSubQuestion(sq.id)}
                              className="text-slate-400 hover:text-red-500 p-1 rounded-lg transition shrink-0"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        <input
                          type="text"
                          value={sq.subQuestionText}
                          onChange={(e) => handleSubQuestionChange(sIdx, "subQuestionText", e.target.value)}
                          placeholder={`Enter sub-question ${sIdx + 1} (e.g., Explain process)`}
                          className={`w-full max-w-full box-border p-2 sm:p-2.5 text-xs sm:text-sm border rounded-xl shadow-sm ${darkMode ? "bg-slate-800 border-slate-600 text-white" : "bg-white border-slate-300 text-slate-900"}`}
                        />
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={handleAddSubQuestion}
                      className="text-xs text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1.5 mt-2 hover:underline p-1"
                    >
                      <Plus size={16} /> Add sub-question part
                    </button>
                  </div>
                )}
              </div>
            )}

            {currentType === "short" && (
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
                  Correct Answer Reference <span className="text-slate-400 font-normal lowercase">(optional - teacher can grade manually without this)</span>
                </label>
                <input
                  type="text"
                  value={currentCorrect as string}
                  onChange={(e) => setCurrentCorrect(e.target.value)}
                  placeholder="Provide standard correct answer reference (optional)"
                  className={`w-full max-w-full box-border p-3 text-xs sm:text-sm border rounded-xl shadow-sm outline-none ${darkMode ? "bg-slate-800 border-slate-600 text-white" : "bg-white border-slate-300 text-slate-900"}`}
                />
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
              {editingQuestionId && (
                <button
                  type="button"
                  onClick={resetQuestionEditor}
                  className={`sm:flex-1 py-3.5 rounded-xl font-bold transition-all text-sm border ${darkMode ? "border-slate-600 text-slate-300 hover:bg-slate-700" : "border-slate-300 text-slate-600 hover:bg-slate-100"}`}
                >
                  Cancel Question Edit
                </button>
              )}
              <button
                type="button"
                onClick={handleAddQuestionToQuiz}
                className="w-full sm:flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-xl font-bold transition-all text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-[0.98]"
              >
                {editingQuestionId ? <Edit3 size={17} /> : <Plus size={18} />}
                {editingQuestionId ? "Update This Question" : "Add This Question to Quiz"}
              </button>
            </div>
          </div>

          {/* Right Column: Added Questions List */}
          <div className={`lg:col-span-5 p-3 sm:p-6 rounded-2xl border shadow-sm flex flex-col justify-between backdrop-blur-md overflow-hidden box-border ${
            darkMode ? "bg-slate-800/40 border-slate-700" : "bg-slate-50 border-slate-200"
          }`}>
            <div>
              <div className={`flex justify-between items-center mb-4 pb-3 border-b ${darkMode ? "border-slate-700" : "border-slate-200"}`}>
                <h3 className={`font-bold text-sm ${darkMode ? "text-slate-200" : "text-slate-800"}`}>Added Questions List</h3>
                <span className={`text-xs px-3 py-1 rounded-xl font-extrabold shadow-inner ${darkMode ? "bg-indigo-950/60 text-indigo-400" : "bg-indigo-50 text-indigo-600"}`}>
                  {questions.length} Questions
                </span>
              </div>

              <div className="space-y-3 overflow-y-auto max-h-[420px] pr-1">
                {questions.length === 0 ? (
                  <div className="text-center py-16 sm:py-20 text-slate-400 space-y-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto ${darkMode ? "bg-slate-800 text-slate-400" : "bg-slate-200 text-slate-400"}`}>
                      <HelpCircle size={24} />
                    </div>
                    <p className="text-xs font-semibold">No questions added yet. Use the form on the left to add questions.</p>
                  </div>
                ) : (
                  questions.map((q, index) => {
                    let effectiveMarks = q.marks;
                    if (q.type === "essay" && q.subQuestions) {
                      effectiveMarks = q.subQuestions.reduce((s, sq) => s + sq.marks, 0);
                    }

                    return (
                      <div key={q.id} className={`p-3 sm:p-4 border rounded-2xl flex justify-between items-start shadow-sm text-xs gap-3 transition-all ${
                        darkMode ? "bg-slate-900 border-slate-700 text-slate-100" : "bg-white border-slate-200 text-slate-900"
                      }`}>
                        <div className="space-y-2 w-full overflow-hidden">
                          <div className="flex items-center justify-between">
                            <span className={`text-[10px] px-2.5 py-1 rounded-lg font-bold uppercase tracking-wider border ${
                              darkMode ? "bg-indigo-950/80 text-indigo-400 border-indigo-900/50" : "bg-indigo-50 text-indigo-600 border-indigo-100"
                            }`}>
                              {q.type} • {effectiveMarks} Marks
                            </span>
                          </div>
                          <p className={`font-bold text-sm leading-snug break-words ${darkMode ? "text-white" : "text-slate-800"}`}>
                            {index + 1}. {q.questionText}
                          </p>

                          {q.imageUrl && (
                            <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1 break-words">📷 Image attached: {q.imageUrl}</span>
                          )}

                          {q.type === "mcq" && q.options && q.options.length > 0 && (
                            <div className="pl-3 space-y-1 text-xs text-slate-500 dark:text-slate-400 border-l-2 border-indigo-500/40">
                              {q.options.map((opt, oIdx) => {
                                const isCorrect = Array.isArray(q.correctAnswer) && q.correctAnswer.includes(opt);
                                return (
                                  <div key={oIdx} className={`break-words ${isCorrect ? "text-indigo-600 dark:text-indigo-400 font-bold" : ""}`}>
                                    • {opt} {isCorrect && " (Correct)"}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {q.type === "single" && q.options && q.options.length > 0 && (
                            <div className="pl-3 space-y-1 text-xs text-slate-500 dark:text-slate-400 border-l-2 border-indigo-500/40">
                              {q.options.map((opt, oIdx) => {
                                const isCorrect = opt === q.correctAnswer;
                                return (
                                  <div key={oIdx} className={`break-words ${isCorrect ? "text-indigo-600 dark:text-indigo-400 font-bold" : ""}`}>
                                    • {opt} {isCorrect && " (Correct)"}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {q.type === "essay" && q.subQuestions && (
                            <div className="pl-3 space-y-1.5 text-xs text-slate-500 dark:text-slate-300 border-l-2 border-indigo-500/40">
                              {q.subQuestions.map((sq, sqIdx) => (
                                <div key={sq.id} className="font-semibold break-words">
                                  ({sqIdx + 1}) {sq.subQuestionText} <span className="text-indigo-500 font-bold">[{sq.marks} marks]</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {q.type !== "mcq" && q.type !== "single" && q.type !== "essay" && (
                            <p className="text-xs text-slate-500 dark:text-slate-300 font-medium pt-1 break-words">
                              <span className="text-slate-400 font-bold">Answer Ref:</span> {String(q.correctAnswer || "None specified (Manual grading)")}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleEditQuestion(q)}
                            className="text-indigo-500 hover:text-indigo-600 p-2 rounded-xl transition"
                            title="Edit Question"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveQuestion(q.id)}
                            className="text-slate-400 hover:text-red-500 p-2 rounded-xl transition"
                            title="Delete Question"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {isEditMode && (
              <p className={`mb-3 p-3 rounded-xl border text-[11px] leading-relaxed ${darkMode ? "bg-amber-500/10 border-amber-500/20 text-amber-200" : "bg-amber-50 border-amber-200 text-amber-800"}`}>
                After updating, this quiz will return to Pending Admin Approval and will be temporarily unpublished. Its previous class and schedule selections will be retained for republishing after approval.
              </p>
            )}
            <div className={`pt-4 border-t ${darkMode ? "border-slate-700" : "border-slate-200"}`}>
              <button
                onClick={handlePreSubmitCheck}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2.5 transition-all text-sm shadow-lg shadow-indigo-600/20 active:scale-[0.98]"
              >
                <Send size={18} /> {isEditMode ? "Review & Update Quiz" : "Submit Quiz to Admin"}
              </button>
            </div>
          </div>

        </div>
      )}

      <QuizUploadSuccessPopup 
        isOpen={showSuccessPopup}
        onClose={() => setShowSuccessPopup(false)}
        message="Your quiz has been successfully submitted to the Admin for review and approval!"
      />
    </div>
  );
}