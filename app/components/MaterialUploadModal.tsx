// src/app/components/MaterialUploadModal.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { useTheme } from "@/app/context/ThemeContext";
import { 
  UploadCloud, 
  FileText, 
  BookOpen, 
  GraduationCap, 
  AlignLeft, 
  X, 
  Image as ImageIcon, 
  ChevronDown, 
  ExternalLink, 
  AlertTriangle,
  Folder as FolderIcon
} from "lucide-react";
import UploadSuccessPopup from "@/app/components/PdfUploadSuccessPopup";

interface MaterialUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentFolderId?: string | null; // වර්තමානයේ විවෘතව ඇති folder එක auto-select කර ගැනීමට
}

export default function MaterialUploadModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  currentFolderId = null 
}: MaterialUploadModalProps) {
  const { darkMode } = useTheme();
  const [uploading, setUploading] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showCompressSuggestion, setShowCompressSuggestion] = useState(false);
  
  // Material Type එක තෝරා ගැනීමට (Default එක 'pdf' වේ)
  const [materialType, setMaterialType] = useState<"pdf" | "paper">("pdf");

  const [subjectCategory, setSubjectCategory] = useState("");
  const [gradeCategory, setGradeCategory] = useState("");

  // Folder Support
  const [availableFolders, setAvailableFolders] = useState<any[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>("");

  // Custom Dropdown Open/Close States
  const [isSubjectOpen, setIsSubjectOpen] = useState(false);
  const [isGradeCategoryOpen, setIsGradeCategoryOpen] = useState(false);
  const [isSchoolGradeOpen, setIsSchoolGradeOpen] = useState(false);
  const [isUniSemesterOpen, setIsUniSemesterOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Cover Image States (Max 5MB)
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [selectedCover, setSelectedCover] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    subject: "",
    grade: "",
    description: "",
  });

  // Load Folders whenever modal opens
  useEffect(() => {
    if (isOpen) {
      fetchTeacherFolders();
      setSelectedFolderId(currentFolderId || "");
    }
  }, [isOpen, currentFolderId]);

  const fetchTeacherFolders = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/folders/my-folders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAvailableFolders(res.data);
    } catch (err) {
      console.error("Failed to load folders:", err);
    }
  };

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== "application/pdf") {
        setErrorMessage("Please select a valid PDF file.");
        setShowCompressSuggestion(false);
        return;
      }

      // 9MB File Size Validation (9 * 1024 * 1024 bytes)
      const MAX_PDF_SIZE = 9 * 1024 * 1024;
      if (file.size > MAX_PDF_SIZE) {
        setErrorMessage(`The file size (${(file.size / (1024 * 1024)).toFixed(2)} MB) is too large. The PDF file size must be a maximum of 9MB. Please compress it using one of the websites below and try again.`);
        setShowCompressSuggestion(true);
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      setSelectedFile(file);
      setErrorMessage("");
      setShowCompressSuggestion(false);
    }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith("image/")) {
        setErrorMessage("Please select a valid image file for the cover.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage("Cover image must be smaller than 5MB.");
        return;
      }
      setSelectedCover(file);
      setErrorMessage("");
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setErrorMessage("");
    setShowCompressSuggestion(false);
  };

  const removeCover = () => {
    setSelectedCover(null);
    if (coverInputRef.current) coverInputRef.current.value = "";
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setShowCompressSuggestion(false);

    if (!selectedFile) {
      setErrorMessage("Please attach a PDF file to upload.");
      return;
    }

    // Secondary Check for 9MB before request
    if (selectedFile.size > 9 * 1024 * 1024) {
      setErrorMessage("PDF ගොනුවේ ප්‍රමාණය උපරිම 9MB විය යුතුය. කරුණාකර එය Compress කර නැවත ලබා දෙන්න.");
      setShowCompressSuggestion(true);
      return;
    }

    setUploading(true);
    const token = localStorage.getItem("token");

    const uploadData = new FormData();
    uploadData.append("title", formData.title);
    uploadData.append("subject", formData.subject);
    uploadData.append("grade", formData.grade);
    uploadData.append("description", formData.description);
    uploadData.append("type", materialType);
    uploadData.append("file", selectedFile);
    
    // Pass selected folder if exists
    if (selectedFolderId) {
      uploadData.append("folderId", selectedFolderId);
    }
    
    if (selectedCover) {
      uploadData.append("coverImage", selectedCover);
    }

    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/materials/upload`, uploadData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      setShowPopup(true);
      setFormData({ title: "", subject: "", grade: "", description: "" });
      setSubjectCategory(""); 
      setGradeCategory(""); 
      setSelectedFolderId("");
      removeFile();
      removeCover();
      onSuccess(); // Refresh list in parent page
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || "An error occurred during the upload process.");
    } finally {
      setUploading(false);
    }
  };

  const inputClass = `w-full rounded-lg border py-1.5 sm:py-2 px-3 text-xs sm:text-sm outline-none focus:ring-2 pl-8 sm:pl-9 transition-colors ${
    darkMode 
      ? "border-slate-700 bg-slate-800 text-white focus:ring-indigo-500" 
      : "border-slate-300 bg-white text-gray-900 focus:ring-indigo-500"
  }`;

  const labelClass = `block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mb-1 ${darkMode ? "text-slate-300" : "text-slate-700"}`;

  const subjectsList = [
    "Mathematics", "Science", "Physics", "Chemistry", "Biology", 
    "IT", "English", "Sinhala", "History", "Geography", "Commerce"
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className={`w-full max-w-lg sm:max-w-2xl rounded-2xl shadow-2xl border p-4 sm:p-6 my-auto max-h-[90vh] overflow-y-auto ${darkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-gray-900"}`}>
        
        <div className="flex items-center justify-between mb-4 pb-2 border-b dark:border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`p-2.5 rounded-lg sm:rounded-xl shadow-sm shrink-0 ${darkMode ? "bg-indigo-500/20 text-indigo-400" : "bg-indigo-100 text-indigo-600"}`}>
              <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <h2 className={`text-base sm:text-xl font-extrabold tracking-tight truncate ${darkMode ? "text-white" : "text-gray-900"}`}>
                Upload Study Material or Exam Paper
              </h2>
              <p className={`mt-0.5 text-xs sm:text-sm font-medium truncate ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                Add new PDF documents, notes, tutorials, or exam papers for your students.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className={`p-1.5 rounded-lg transition-colors shrink-0 ${darkMode ? "text-slate-400 hover:bg-slate-800" : "text-slate-500 hover:bg-slate-100"}`}
          >
            <X size={20} />
          </button>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-300 text-[11px] sm:text-xs font-medium">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p>{errorMessage}</p>
                {showCompressSuggestion && (
                  <div className="mt-2.5 pt-2 border-t border-red-200 dark:border-red-800/40">
                    <p className="font-bold text-[10px] sm:text-[11px] text-red-800 dark:text-red-200 mb-1.5">
                      Reliable websites where you can easily compress PDFs for free:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <a
                        href="https://www.ilovepdf.com/compress_pdf"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white dark:bg-slate-800 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700 font-bold text-[10px] sm:text-[11px] hover:bg-red-100 dark:hover:bg-slate-700 transition-colors shadow-sm"
                      >
                        <span>iLovePDF Compress</span>
                        <ExternalLink size={11} />
                      </a>
                      <a
                        href="https://smallpdf.com/compress-pdf"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white dark:bg-slate-800 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700 font-bold text-[10px] sm:text-[11px] hover:bg-red-100 dark:hover:bg-slate-700 transition-colors shadow-sm"
                      >
                        <span>Smallpdf Compress</span>
                        <ExternalLink size={11} />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleUpload} className="space-y-4">
          {/* Material Type Selection (Radio Buttons) */}
          <div>
            <label className={labelClass}>Select Document Type</label>
            <div className="flex items-center gap-6 mt-1">
              <label className={`flex items-center gap-2 cursor-pointer text-xs sm:text-sm font-bold ${darkMode ? "text-slate-200" : "text-slate-800"}`}>
                <input 
                  type="radio" 
                  name="materialType" 
                  value="pdf" 
                  checked={materialType === "pdf"} 
                  onChange={() => setMaterialType("pdf")}
                  className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                />
                Study Note / Tutorial (PDF)
              </label>
              <label className={`flex items-center gap-2 cursor-pointer text-xs sm:text-sm font-bold ${darkMode ? "text-slate-200" : "text-slate-800"}`}>
                <input 
                  type="radio" 
                  name="materialType" 
                  value="paper" 
                  checked={materialType === "paper"} 
                  onChange={() => setMaterialType("paper")}
                  className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                />
                Exam Paper (PDF)
              </label>
            </div>
          </div>

          {/* Folder Selection Option */}
          <div>
            <label className={labelClass}>Select Target Folder (Optional)</label>
            <div className="relative">
              <FolderIcon size={14} className={`absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 ${darkMode ? "text-slate-500" : "text-slate-400"}`} />
              <select
                value={selectedFolderId}
                onChange={(e) => setSelectedFolderId(e.target.value)}
                className={inputClass}
              >
                <option value="">📁 Main Directory (Root / No Folder)</option>
                {availableFolders.map((folder) => (
                  <option key={folder._id} value={folder._id}>
                    📁 {folder.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {/* Document / Paper Title */}
            <div>
              <label className={labelClass}>{materialType === 'paper' ? 'Paper Title' : 'Document Title'}</label>
              <div className="relative">
                <FileText size={14} className={`absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 ${darkMode ? "text-slate-500" : "text-slate-400"}`} />
                <input type="text" name="title" value={formData.title} onChange={handleChange} required placeholder={materialType === 'paper' ? "e.g. 2024 - 1st Term Paper" : "e.g. Chapter 1 - Cloud Computing"} className={inputClass} />
              </div>
            </div>

            {/* Subject (Custom Dropdown) */}
            <div className="relative">
              <label className={labelClass}>Subject</label>
              <div className="relative">
                <BookOpen size={14} className={`absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 ${darkMode ? "text-slate-500" : "text-slate-400"}`} />
                <div 
                  onClick={() => { setIsSubjectOpen(!isSubjectOpen); setIsGradeCategoryOpen(false); setIsSchoolGradeOpen(false); setIsUniSemesterOpen(false); }}
                  className={`w-full rounded-lg border py-1.5 sm:py-2 px-3 pl-8 sm:pl-9 text-xs sm:text-sm cursor-pointer flex items-center justify-between transition-colors ${
                    darkMode ? "border-slate-700 bg-slate-800 text-white" : "border-slate-300 bg-white text-gray-900"
                  }`}
                >
                  <span className={!subjectCategory ? "opacity-50" : ""}>{subjectCategory || "Select Subject"}</span>
                  <ChevronDown size={14} className="opacity-60" />
                </div>

                {isSubjectOpen && (
                  <div className={`absolute left-0 right-0 top-full mt-1 z-30 max-h-48 overflow-y-auto rounded-xl border shadow-xl p-1 ${
                    darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-gray-900"
                  }`}>
                    {subjectsList.map((subj) => (
                      <div 
                        key={subj}
                        onClick={() => {
                          setSubjectCategory(subj);
                          setFormData({ ...formData, subject: subj });
                          setIsSubjectOpen(false);
                        }}
                        className={`px-3 py-2 text-xs rounded-lg cursor-pointer transition-colors ${
                          darkMode ? "hover:bg-slate-700" : "hover:bg-slate-100"
                        }`}
                      >
                        {subj}
                      </div>
                    ))}
                    <div 
                      onClick={() => {
                        setSubjectCategory("other");
                        setFormData({ ...formData, subject: "" });
                        setIsSubjectOpen(false);
                      }}
                      className={`px-3 py-2 text-xs rounded-lg cursor-pointer font-bold text-indigo-500 ${
                        darkMode ? "hover:bg-slate-700" : "hover:bg-slate-100"
                      }`}
                    >
                      Other (Type Subject)
                    </div>
                  </div>
                )}
              </div>

              {subjectCategory === "other" && (
                <div className="mt-2 relative">
                  <BookOpen size={14} className={`absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 ${darkMode ? "text-slate-500" : "text-slate-400"}`} />
                  <input 
                    type="text" 
                    name="subject" 
                    value={formData.subject} 
                    onChange={handleChange} 
                    required 
                    placeholder="Type your subject" 
                    className={inputClass} 
                  />
                </div>
              )}
            </div>

            {/* Grade / Batch */}
            <div className="md:col-span-2">
              <label className={labelClass}>Grade / Batch</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* Category Selector (Custom Dropdown) */}
                <div className="relative">
                  <GraduationCap size={14} className={`absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 ${darkMode ? "text-slate-500" : "text-slate-400"}`} />
                  <div 
                    onClick={() => { setIsGradeCategoryOpen(!isGradeCategoryOpen); setIsSubjectOpen(false); setIsSchoolGradeOpen(false); setIsUniSemesterOpen(false); }}
                    className={`w-full rounded-lg border py-1.5 sm:py-2 px-3 pl-8 sm:pl-9 text-xs sm:text-sm cursor-pointer flex items-center justify-between transition-colors ${
                      darkMode ? "border-slate-700 bg-slate-800 text-white" : "border-slate-300 bg-white text-gray-900"
                    }`}
                  >
                    <span className={!gradeCategory ? "opacity-50" : ""}>
                      {gradeCategory === "school" ? "School (Grade 1 - 13)" : gradeCategory === "university" ? "University (Semesters)" : gradeCategory === "other" ? "Other" : "Select Category"}
                    </span>
                    <ChevronDown size={14} className="opacity-60" />
                  </div>

                  {isGradeCategoryOpen && (
                    <div className={`absolute left-0 right-0 top-full mt-1 z-30 rounded-xl border shadow-xl p-1 ${
                      darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-gray-900"
                    }`}>
                      <div 
                        onClick={() => { setGradeCategory("school"); setFormData({ ...formData, grade: "" }); setIsGradeCategoryOpen(false); }}
                        className={`px-3 py-2 text-xs rounded-lg cursor-pointer ${darkMode ? "hover:bg-slate-700" : "hover:bg-slate-100"}`}
                      >
                        School (Grade 1 - 13)
                      </div>
                      <div 
                        onClick={() => { setGradeCategory("university"); setFormData({ ...formData, grade: "" }); setIsGradeCategoryOpen(false); }}
                        className={`px-3 py-2 text-xs rounded-lg cursor-pointer ${darkMode ? "hover:bg-slate-700" : "hover:bg-slate-100"}`}
                      >
                        University (Semesters)
                      </div>
                      <div 
                        onClick={() => { setGradeCategory("other"); setFormData({ ...formData, grade: "" }); setIsGradeCategoryOpen(false); }}
                        className={`px-3 py-2 text-xs rounded-lg cursor-pointer ${darkMode ? "hover:bg-slate-700" : "hover:bg-slate-100"}`}
                      >
                        Other
                      </div>
                    </div>
                  )}
                </div>

                {gradeCategory === "school" && (
                  <div className="relative">
                    <div 
                      onClick={() => setIsSchoolGradeOpen(!isSchoolGradeOpen)}
                      className={`w-full rounded-lg border py-1.5 sm:py-2 px-3 text-xs sm:text-sm cursor-pointer flex items-center justify-between transition-colors ${
                        darkMode ? "border-slate-700 bg-slate-800 text-white" : "border-slate-300 bg-white text-gray-900"
                      }`}
                    >
                      <span className={!formData.grade ? "opacity-50" : ""}>{formData.grade || "Select Grade"}</span>
                      <ChevronDown size={14} className="opacity-60" />
                    </div>

                    {isSchoolGradeOpen && (
                      <div className={`absolute left-0 right-0 top-full mt-1 z-30 max-h-48 overflow-y-auto rounded-xl border shadow-xl p-1 ${
                        darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-gray-900"
                      }`}>
                        {[...Array(13)].map((_, i) => (
                          <div 
                            key={`Grade ${i+1}`}
                            onClick={() => {
                              setFormData({ ...formData, grade: `Grade ${i + 1}` });
                              setIsSchoolGradeOpen(false);
                            }}
                            className={`px-3 py-2 text-xs rounded-lg cursor-pointer ${darkMode ? "hover:bg-slate-700" : "hover:bg-slate-100"}`}
                          >
                            Grade {i + 1}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {gradeCategory === "university" && (
                  <div className="relative">
                    <div 
                      onClick={() => setIsUniSemesterOpen(!isUniSemesterOpen)}
                      className={`w-full rounded-lg border py-1.5 sm:py-2 px-3 text-xs sm:text-sm cursor-pointer flex items-center justify-between transition-colors ${
                        darkMode ? "border-slate-700 bg-slate-800 text-white" : "border-slate-300 bg-white text-gray-900"
                      }`}
                    >
                      <span className={!formData.grade ? "opacity-50" : ""}>{formData.grade || "Select Semester"}</span>
                      <ChevronDown size={14} className="opacity-60" />
                    </div>

                    {isUniSemesterOpen && (
                      <div className={`absolute left-0 right-0 top-full mt-1 z-30 max-h-48 overflow-y-auto rounded-xl border shadow-xl p-1 ${
                        darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-gray-900"
                      }`}>
                        {[...Array(4)].map((_, yearIndex) => (
                          <div key={`Year ${yearIndex+1}`}>
                            <div className="px-3 py-1 text-[10px] font-bold text-indigo-400 uppercase">Year {yearIndex+1}</div>
                            <div 
                              onClick={() => { setFormData({ ...formData, grade: `Year ${yearIndex+1} Semester 1` }); setIsUniSemesterOpen(false); }}
                              className={`px-4 py-1.5 text-xs rounded-lg cursor-pointer ${darkMode ? "hover:bg-slate-700" : "hover:bg-slate-100"}`}
                            >
                              Semester 1
                            </div>
                            <div 
                              onClick={() => { setFormData({ ...formData, grade: `Year ${yearIndex+1} Semester 2` }); setIsUniSemesterOpen(false); }}
                              className={`px-4 py-1.5 text-xs rounded-lg cursor-pointer ${darkMode ? "hover:bg-slate-700" : "hover:bg-slate-100"}`}
                            >
                              Semester 2
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {gradeCategory === "other" && (
                  <div>
                    <input 
                      type="text" 
                      name="grade" 
                      value={formData.grade} 
                      onChange={handleChange} 
                      required 
                      placeholder="Type Grade/Batch name" 
                      className={`w-full rounded-lg border py-1.5 sm:py-2 px-3 text-xs sm:text-sm outline-none focus:ring-2 transition-colors ${darkMode ? "border-slate-700 bg-slate-800 text-white focus:ring-indigo-500" : "border-slate-300 bg-white text-gray-900 focus:ring-indigo-500"}`} 
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className={labelClass}>Short Description (Optional)</label>
            <div className="relative">
              <AlignLeft size={14} className={`absolute left-2.5 sm:left-3 top-2.5 sm:top-3 ${darkMode ? "text-slate-500" : "text-slate-400"}`} />
              <textarea 
                name="description" 
                value={formData.description} 
                onChange={handleChange} 
                rows={2}
                placeholder="Provide a brief overview of this document..." 
                className={`w-full rounded-lg border py-1.5 sm:py-2 px-3 text-xs sm:text-sm outline-none focus:ring-2 pl-8 sm:pl-9 transition-colors ${darkMode ? "border-slate-700 bg-slate-800 text-white focus:ring-indigo-500" : "border-slate-300 bg-white text-gray-900 focus:ring-indigo-500"}`}
              ></textarea>
            </div>
          </div>

          {/* Cover Image Upload Area */}
          <div>
            <label className={labelClass}>Cover Image (Optional - Max 5MB)</label>
            <div 
              onClick={() => !selectedCover && coverInputRef.current?.click()}
              className={`mt-1 border-2 border-dashed rounded-xl p-3 sm:p-4 flex flex-col items-center justify-center transition-all ${
                selectedCover 
                  ? darkMode ? "border-indigo-500 bg-indigo-500/10" : "border-indigo-400 bg-indigo-50"
                  : darkMode ? "border-slate-600 hover:border-indigo-500 cursor-pointer bg-slate-800/30" : "border-slate-300 hover:border-indigo-400 cursor-pointer bg-slate-50/50"
              }`}
            >
              {selectedCover ? (
                <div className="flex flex-col items-center text-center">
                  <ImageIcon className="w-7 h-7 sm:w-8 sm:h-8 text-indigo-500 mb-1" />
                  <p className={`text-xs sm:text-sm font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>{selectedCover.name}</p>
                  <p className={`text-[10px] sm:text-xs mt-0.5 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                    {(selectedCover.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                  <button 
                    type="button" 
                    onClick={(e) => { e.stopPropagation(); removeCover(); }}
                    className="mt-2 flex items-center gap-1 text-[11px] text-red-500 hover:text-red-600 bg-red-50 dark:bg-red-500/10 px-2 py-1 rounded-md font-bold transition-colors"
                  >
                    <X size={12} /> Remove Cover
                  </button>
                </div>
              ) : (
                <>
                  <ImageIcon className={`w-7 h-7 sm:w-8 sm:h-8 mb-1.5 ${darkMode ? "text-slate-400" : "text-gray-400"}`} />
                  <p className={`text-xs font-bold ${darkMode ? "text-slate-300" : "text-gray-700"}`}>
                    Click to upload cover image (JPG, PNG)
                  </p>
                  <p className={`text-[10px] mt-0.5 ${darkMode ? "text-slate-500" : "text-gray-500"}`}>
                    Must be smaller than 5MB
                  </p>
                </>
              )}
              <input 
                type="file" 
                ref={coverInputRef} 
                onChange={handleCoverChange} 
                accept="image/*" 
                className="hidden" 
              />
            </div>
          </div>

          {/* PDF File Upload Area */}
          <div>
            <label className={labelClass}>Upload PDF File</label>
            <div 
              onClick={() => !selectedFile && fileInputRef.current?.click()}
              className={`mt-1 border-2 border-dashed rounded-xl p-4 sm:p-5 flex flex-col items-center justify-center transition-all ${
                selectedFile 
                  ? darkMode ? "border-indigo-500 bg-indigo-500/10" : "border-indigo-400 bg-indigo-50"
                  : darkMode ? "border-slate-600 hover:border-indigo-500 cursor-pointer bg-slate-800/30" : "border-slate-300 hover:border-indigo-400 cursor-pointer bg-slate-50/50"
              }`}
            >
              {selectedFile ? (
                <div className="flex flex-col items-center text-center">
                  <FileText className="w-8 h-8 sm:w-10 sm:h-10 text-indigo-500 mb-2" />
                  <p className={`text-xs sm:text-sm font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>{selectedFile.name}</p>
                  <p className={`text-[10px] sm:text-xs mt-0.5 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                  <button 
                    type="button" 
                    onClick={(e) => { e.stopPropagation(); removeFile(); }}
                    className="mt-2.5 flex items-center gap-1 text-[11px] sm:text-xs text-red-500 hover:text-red-600 bg-red-50 dark:bg-red-500/10 px-2.5 py-1.5 rounded-md transition-colors font-bold"
                  >
                    <X size={14} /> Remove File
                  </button>
                </div>
              ) : (
                <>
                  <UploadCloud className={`w-8 h-8 sm:w-10 sm:h-10 mb-2 ${darkMode ? "text-slate-400" : "text-gray-400"}`} />
                  <p className={`text-xs sm:text-sm font-bold ${darkMode ? "text-slate-300" : "text-gray-700"}`}>
                    Click to browse or drag and drop
                  </p>
                  <p className={`text-[10px] sm:text-xs mt-0.5 ${darkMode ? "text-slate-500" : "text-gray-500"}`}>
                    Only PDF documents are supported (Max 9MB)
                  </p>
                </>
              )}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="application/pdf" 
                className="hidden" 
              />
            </div>
          </div>

          <div className="pt-4 border-t dark:border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-lg text-xs font-bold ${darkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700"}`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 sm:px-6 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all disabled:bg-indigo-400 flex items-center gap-1.5 shadow-sm active:scale-[0.98]"
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <UploadCloud size={16} />
                  Upload Document
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <UploadSuccessPopup 
        isOpen={showPopup} 
        onClose={() => {
          setShowPopup(false);
          onClose(); // Modal එක වසා දමයි
        }} 
        message="Your document has been successfully added to the system and is now pending admin approval."
      />
    </div>
  );
}