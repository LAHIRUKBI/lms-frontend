// src/app/teacher/classes/view/page.tsx

"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { 
  Trash2, 
  Calendar, 
  Clock, 
  Loader2, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Users, 
  User, 
  Mail, 
  Phone, 
  Building, 
  MapPin, 
  Edit3, 
  Link as LinkIcon, 
  X, 
  Save, 
  PlayCircle, 
  ChevronLeft, 
  ChevronRight, 
  Plus,
  DollarSign
} from "lucide-react";
import ClassDeleteConfirmPopup from "@/app/components/ClassDeleteConfirmPopup";
import CreateClassModal from "@/app/components/CreateClassModal";
import { useTheme } from "@/app/context/ThemeContext";

// Cloudinary HTTPS URLs සහ Local backend paths දෙකටම ගැලපෙන Helper ශ්‍රිතය
const getClassCoverImageUrl = (photoUrl?: string) => {
  if (!photoUrl) return null;
  if (photoUrl.startsWith("http")) return photoUrl;
  return `${process.env.NEXT_PUBLIC_API_URL}${photoUrl.startsWith('/') ? '' : '/'}${photoUrl}`;
};

export default function ViewClassesPage() {
  const router = useRouter();
  const { darkMode } = useTheme();
  const [fetching, setFetching] = useState(true);
  const [classes, setClasses] = useState<any[]>([]);
  const [classRequests, setClassRequests] = useState<any[]>([]);
  const [message, setMessage] = useState({ type: "", text: "" });

  const [deleteClassId, setDeleteClassId] = useState<string | null>(null);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination State for Classes (2 classes per page)
  const [currentClassPage, setCurrentClassPage] = useState(1);
  const classesPerPage = 2;

  // Pagination State for Students inside each class (4 students per page)
  const [studentPages, setStudentPages] = useState<{ [classId: string]: number }>({});
  const studentsPerPage = 4;

  // Edit Form State (Existing + New Fields)
  const [editOnlineLink, setEditOnlineLink] = useState("");
  const [editProvideLater, setEditProvideLater] = useState(false);
  const [editLinkDisplayMode, setEditLinkDisplayMode] = useState("scheduled");
  const [editLinkStart, setEditLinkStart] = useState("");
  const [editLinkEnd, setEditLinkEnd] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editIsFree, setEditIsFree] = useState(false);
  const [editFee, setEditFee] = useState<string>("");
  const [editBillingType, setEditBillingType] = useState<"monthly" | "fixed_months">("monthly");
  const [editDurationMonths, setEditDurationMonths] = useState<string>("1");
  const [editHasBatchLimit, setEditHasBatchLimit] = useState(false);
  const [editBatchLimit, setEditBatchLimit] = useState<string>("");

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    fetchClassesAndStudents(token);
  }, [router]);

  // Fetch classes and approved students belonging to the teacher
  const fetchClassesAndStudents = async (token?: string) => {
    const currentToken = token || localStorage.getItem("token");
    if (!currentToken) return;

    try {
      const [classesRes, requestsRes] = await Promise.all([
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/classes/my-classes`, {
          headers: { Authorization: `Bearer ${currentToken}` }
        }),
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/classes/requests/all`, {
          headers: { Authorization: `Bearer ${currentToken}` }
        })
      ]);
      setClasses(classesRes.data);
      setClassRequests(requestsRes.data);
    } catch (err) {
      console.error("Error fetching classes or students:", err);
    } finally {
      setFetching(false);
    }
  };

  // Actual class deletion execution after confirmation
  const handleDeleteClass = async () => {
    if (!deleteClassId) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/classes/${deleteClassId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClasses(classes.filter((c) => c._id !== deleteClassId));
      setMessage({ type: "success", text: "Class successfully removed." });
      setDeleteClassId(null);
    } catch (err) {
      console.error("Error deleting class:", err);
      setMessage({ type: "error", text: "Failed to remove the class." });
    }
  };

  const handleOpenEdit = (cls: any) => {
    setEditingClassId(cls._id);
    setEditOnlineLink(cls.onlineLink || "");
    setEditProvideLater(cls.provideLater || false);
    setEditLinkDisplayMode(cls.linkDisplayMode || "scheduled");
    setEditLinkStart(cls.linkStartDateTime ? new Date(cls.linkStartDateTime).toISOString().slice(0, 16) : "");
    setEditLinkEnd(cls.linkEndDateTime ? new Date(cls.linkEndDateTime).toISOString().slice(0, 16) : "");
    setEditDescription(cls.description || "");

    // Populate Pricing & Capacity into Edit States
    setEditIsFree(cls.isFree || false);
    setEditFee(cls.fee ? String(cls.fee) : "");
    setEditBillingType(cls.billingType || "monthly");
    setEditDurationMonths(cls.durationMonths ? String(cls.durationMonths) : "1");
    setEditHasBatchLimit(cls.hasBatchLimit || false);
    setEditBatchLimit(cls.batchLimit ? String(cls.batchLimit) : "");
  };

  const handleForceOpenNow = async (cls: any) => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/api/classes/teacher/update/${cls._id}`, {
        onlineLink: cls.onlineLink,
        provideLater: false,
        linkDisplayMode: 'immediate',
        linkStartDateTime: null,
        linkEndDateTime: null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setClasses(classes.map(c => c._id === cls._id ? res.data.classData : c));
      setMessage({ type: "success", text: "Class link opened immediately! Students can join now." });
    } catch (err) {
      console.error("Error opening class immediately:", err);
      setMessage({ type: "error", text: "Failed to open class." });
    }
  };

  const handleUpdateClassSubmit = async (classId: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/api/classes/teacher/update/${classId}`, {
        onlineLink: editProvideLater ? "" : editOnlineLink,
        provideLater: editProvideLater,
        linkDisplayMode: editLinkDisplayMode,
        linkStartDateTime: (editProvideLater || editLinkDisplayMode === 'immediate') ? null : editLinkStart,
        linkEndDateTime: (editProvideLater || editLinkDisplayMode === 'immediate') ? null : editLinkEnd,
        description: editDescription,
        // Send updated pricing and limit fields
        isFree: editIsFree,
        fee: editIsFree ? 0 : Number(editFee) || 0,
        billingType: editIsFree ? "monthly" : editBillingType,
        durationMonths: !editIsFree && editBillingType === "fixed_months" ? Number(editDurationMonths) || 1 : 1,
        hasBatchLimit: editHasBatchLimit,
        batchLimit: editHasBatchLimit ? Number(editBatchLimit) || 0 : 0
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setClasses(classes.map(c => c._id === classId ? res.data.classData : c));
      setMessage({ type: "success", text: "Class updated successfully!" });
      setEditingClassId(null);
    } catch (err) {
      console.error("Error updating class:", err);
      setMessage({ type: "error", text: "Failed to update class." });
    }
  };

  const handleCloseLink = async (classId: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/api/classes/teacher/update/${classId}`, {
        onlineLink: "",
        provideLater: true,
        linkStartDateTime: null,
        linkEndDateTime: null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setClasses(classes.map(c => c._id === classId ? res.data.classData : c));
      setMessage({ type: "success", text: "Online link closed and removed successfully." });
    } catch (err) {
      console.error("Error closing link:", err);
      setMessage({ type: "error", text: "Failed to close the link." });
    }
  };

  const getStudentProfileImageUrl = (photoUrl: string) => {
    if (!photoUrl) return null;
    if (photoUrl.startsWith("http")) return photoUrl;
    if (photoUrl.startsWith("/")) {
      return `${process.env.NEXT_PUBLIC_API_URL}${photoUrl}`;
    }
    return `${process.env.NEXT_PUBLIC_API_URL}/Student_profile_photos/${photoUrl}`;
  };

  // Filtered Classes based on Search Query
  const filteredClasses = useMemo(() => {
    if (!searchQuery.trim()) return classes;
    const query = searchQuery.toLowerCase();
    return classes.filter((cls) => {
      const gradeStr = (cls.grade === 'Other' ? cls.customGradeName : cls.grade)?.toLowerCase() || "";
      const mediumStr = cls.medium?.toLowerCase() || "";
      const modeStr = cls.mode?.toLowerCase() || "";
      const dayStr = cls.day?.toLowerCase() || "";
      const descStr = cls.description?.toLowerCase() || "";
      const instStr = cls.instituteName?.toLowerCase() || "";
      return gradeStr.includes(query) || mediumStr.includes(query) || modeStr.includes(query) || dayStr.includes(query) || descStr.includes(query) || instStr.includes(query);
    });
  }, [classes, searchQuery]);

  // Pagination Calculations for Classes
  const totalPages = Math.ceil(filteredClasses.length / classesPerPage);
  const currentClasses = useMemo(() => {
    const start = (currentClassPage - 1) * classesPerPage;
    return filteredClasses.slice(start, start + classesPerPage);
  }, [filteredClasses, currentClassPage]);

  // Handle student pagination per class
  const handleStudentPageChange = (classId: string, newPage: number) => {
    setStudentPages(prev => ({ ...prev, [classId]: newPage }));
  };

  return (
    <div className={`min-h-screen font-sans p-4 sm:p-6 transition-colors duration-500 ${darkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"}`}>
      
      {/* Class Delete Confirmation Popup */}
      <ClassDeleteConfirmPopup
        isOpen={!!deleteClassId}
        onClose={() => setDeleteClassId(null)}
        onConfirm={handleDeleteClass}
      />

      {/* Create Class Modal Component */}
      <CreateClassModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onClassCreated={() => {
          fetchClassesAndStudents();
          setMessage({ type: "success", text: "New class created successfully!" });
        }}
      />

      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header & Search Bar section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className={`text-2xl font-extrabold ${darkMode ? "text-white" : "text-slate-800"}`}>Your Created Classes</h1>
            <p className={`text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Manage your classes, pricing, student enrollment limits, and active online links.</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Create Class Button */}
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-md shadow-blue-600/20"
            >
              <Plus size={16} />
              <span>Create Class</span>
            </button>

            {/* Smooth Search Input */}
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search classes..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentClassPage(1);
                }}
                className={`w-full pl-10 pr-4 py-2 rounded-xl border text-xs transition-all outline-none shadow-sm ${
                  darkMode 
                    ? "bg-slate-900 border-slate-800 text-white focus:border-blue-500" 
                    : "bg-white border-slate-200 text-slate-800 focus:border-blue-500"
                }`}
              />
            </div>
          </div>
        </div>

        {/* Message Alert */}
        {message.text && (
          <div className={`flex items-center gap-3 p-3 rounded-xl border text-xs ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20'}`}>
            {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <p className="font-medium">{message.text}</p>
          </div>
        )}

        {/* Existing Classes List */}
        <div>
          {fetching ? (
            <div className="flex justify-center py-20">
              <Loader2 className="animate-spin text-blue-600 dark:text-blue-400" size={32} />
            </div>
          ) : filteredClasses.length === 0 ? (
            <div className={`rounded-2xl p-10 text-center border shadow-sm transition-colors duration-500 ${darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
              <p className="text-slate-400 text-xs font-medium">No classes found matching your criteria.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {currentClasses.map((cls) => {
                const enrolledStudents = classRequests.filter(
                  (req: any) => req.classId?._id === cls._id && req.status === 'Approved'
                );

                const currentStudentPage = studentPages[cls._id] || 1;
                const totalStudentPages = Math.ceil(enrolledStudents.length / studentsPerPage);
                const startIndex = (currentStudentPage - 1) * studentsPerPage;
                const currentStudents = enrolledStudents.slice(startIndex, startIndex + studentsPerPage);

                const isEditing = editingClassId === cls._id;
                const classCoverUrl = getClassCoverImageUrl(cls.coverImage);

                // Enrollment vs Batch Limit Calculation
                const isFull = cls.hasBatchLimit && cls.batchLimit > 0 && enrolledStudents.length >= cls.batchLimit;

                return (
                  <div key={cls._id} className={`p-5 rounded-2xl border shadow-sm flex flex-col gap-4 transition-all duration-300 ${darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
                    
                    <div className="flex flex-col md:flex-row items-start justify-between gap-4">
                      {classCoverUrl && (
                        <div className={`w-full md:w-48 h-32 rounded-xl overflow-hidden border flex-shrink-0 relative ${darkMode ? "border-slate-800" : "border-slate-200"}`}>
                          <img src={classCoverUrl} alt={cls.grade} className="w-full h-full object-cover" />
                          {cls.isFree ? (
                            <span className="absolute top-2 left-2 px-2 py-0.5 bg-emerald-600/90 text-white rounded-md text-[10px] font-black shadow-sm">
                              FREE
                            </span>
                          ) : cls.fee ? (
                            <span className="absolute top-2 left-2 px-2 py-0.5 bg-slate-900/80 text-white rounded-md text-[10px] font-black shadow-sm">
                              LKR {cls.fee.toLocaleString()}
                            </span>
                          ) : null}
                        </div>
                      )}
                      
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-0.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg text-[11px] font-extrabold">
                            {cls.grade === 'Other' ? cls.customGradeName : cls.grade}
                          </span>
                          <span className="px-2.5 py-0.5 bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-lg text-[11px] font-extrabold">{cls.medium}</span>
                          <span className="px-2.5 py-0.5 bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-lg text-[11px] font-extrabold">{cls.mode}</span>

                          {/* Fee Badge */}
                          <span className={`px-2.5 py-0.5 rounded-lg text-[11px] font-extrabold flex items-center gap-1 ${
                            cls.isFree 
                              ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                              : "bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400"
                          }`}>
                            <DollarSign size={12} className="shrink-0" />
                            {cls.isFree 
                              ? "Free Class" 
                              : `LKR ${Number(cls.fee || 0).toLocaleString()} ${cls.billingType === 'fixed_months' ? `(${cls.durationMonths || 1} Mo)` : '/ Mo'}`
                            }
                          </span>

                          {/* Seat Capacity Badge */}
                          <span className={`px-2.5 py-0.5 rounded-lg text-[11px] font-extrabold flex items-center gap-1 ${
                            isFull 
                              ? "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400" 
                              : cls.hasBatchLimit 
                                ? "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                          }`}>
                            <Users size={12} className="shrink-0" />
                            {cls.hasBatchLimit 
                              ? `${enrolledStudents.length}/${cls.batchLimit} Seats ${isFull ? '(Batch Full)' : ''}`
                              : "Unlimited Seats"
                            }
                          </span>
                        </div>

                        <h3 className={`text-base font-bold flex items-center gap-2 pt-0.5 ${darkMode ? "text-white" : "text-slate-800"}`}>
                          <Calendar size={15} className="text-slate-400" /> Every {cls.day}
                        </h3>

                        <p className={`text-[11px] font-medium flex items-center gap-1.5 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                          <Clock size={13} className="text-slate-400" /> {cls.startTime} - {cls.endTime}
                        </p>

                        {/* Online Link Display */}
                        {cls.mode === 'Online' ? (
                          <div className="text-xs space-y-1.5 pt-1">
                            {cls.provideLater || !cls.onlineLink ? (
                              <span className="inline-block px-2.5 py-0.5 bg-amber-50 dark:bg-amber-500/10 text-amber-600 rounded-lg font-bold text-[11px]">Online Link: Provide Later</span>
                            ) : (
                              <div className="p-2.5 rounded-xl border bg-blue-50/50 dark:bg-slate-800/60 border-blue-200 dark:border-slate-700 space-y-1.5">
                                <div className="flex items-center gap-2 flex-wrap justify-between">
                                  <a 
                                    href={cls.onlineLink} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold inline-flex items-center gap-1 transition-all shadow-sm"
                                  >
                                    <LinkIcon size={12} /> Join Class Link
                                  </a>

                                  <div className="flex items-center gap-1.5">
                                    {cls.linkDisplayMode === 'scheduled' && (
                                      <button 
                                        onClick={() => handleForceOpenNow(cls)}
                                        className="flex items-center gap-1 px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[10px] font-bold transition-colors shadow-sm"
                                        title="Open class immediately"
                                      >
                                        <PlayCircle size={11} /> Open Now
                                      </button>
                                    )}
                                    <button 
                                      onClick={() => handleCloseLink(cls._id)}
                                      className="px-2 py-1 bg-red-100 dark:bg-red-500/20 text-red-600 rounded-md text-[10px] font-bold hover:bg-red-200 transition-colors"
                                    >
                                      Close Link
                                    </button>
                                  </div>
                                </div>
                                {cls.linkDisplayMode === 'immediate' ? (
                                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                    🟢 Status: Open Immediately (දැන්ම ඕපන් කර ඇත)
                                  </p>
                                ) : cls.linkStartDateTime && cls.linkEndDateTime ? (
                                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                    ⏳ Scheduled: {new Date(cls.linkStartDateTime).toLocaleString()} සිට {new Date(cls.linkEndDateTime).toLocaleString()} දක්වා.
                                  </p>
                                ) : null}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className={`text-[11px] space-y-0.5 ${darkMode ? "text-slate-400" : "text-slate-600"}`}>
                            {cls.instituteName && <p className="flex items-center gap-1"><Building size={12} className="text-orange-500" /> {cls.instituteName}</p>}
                            {cls.instituteAddress && <p className="flex items-center gap-1"><MapPin size={12} className="text-orange-500" /> {cls.instituteAddress}</p>}
                          </div>
                        )}

                        {cls.description && (
                          <p className={`text-[11px] pt-0.5 line-clamp-2 break-all whitespace-pre-wrap ${darkMode ? "text-slate-400" : "text-slate-600"}`}>{cls.description}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0 self-start md:self-auto">
                        <button 
                          onClick={() => handleOpenEdit(cls)}
                          className="p-2.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 rounded-xl transition-colors"
                          title="Update Class Details"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button 
                          onClick={() => setDeleteClassId(cls._id)}
                          className="p-2.5 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-xl transition-colors"
                          title="Delete Class"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Inline Edit Panel */}
                    {isEditing && (
                      <div className={`p-4 rounded-xl border space-y-4 ${darkMode ? "bg-slate-800/80 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
                        <div className="flex items-center justify-between border-b pb-2 dark:border-slate-700">
                          <h4 className="text-xs font-bold flex items-center gap-1.5">
                            <Edit3 size={14} className="text-blue-500" /> Update Class Settings & Availability
                          </h4>
                          <button onClick={() => setEditingClassId(null)} className="text-slate-400 hover:text-slate-600">
                            <X size={16} />
                          </button>
                        </div>

                        {/* Fee & Billing Settings in Edit Mode */}
                        <div className="p-3 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-bold uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <DollarSign size={13} /> Class Fee / Pricing
                            </label>
                            <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                              <input
                                type="checkbox"
                                checked={editIsFree}
                                onChange={(e) => {
                                  setEditIsFree(e.target.checked);
                                  if (e.target.checked) setEditFee("");
                                }}
                                className="rounded text-emerald-600 w-3.5 h-3.5"
                              />
                              Free Class
                            </label>
                          </div>

                          {!editIsFree && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                              <div>
                                <label className="text-[10px] font-bold uppercase block mb-1">Fee (LKR)</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={editFee}
                                  onChange={(e) => setEditFee(e.target.value)}
                                  placeholder="e.g. 2500"
                                  className={`w-full p-2 rounded-xl border text-xs ${darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-800"}`}
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold uppercase block mb-1">Payment Plan</label>
                                <div className="flex items-center gap-3 pt-2">
                                  <label className="flex items-center gap-1 text-xs cursor-pointer">
                                    <input
                                      type="radio"
                                      name="editBillingType"
                                      value="monthly"
                                      checked={editBillingType === "monthly"}
                                      onChange={() => setEditBillingType("monthly")}
                                      className="text-emerald-600 w-3.5 h-3.5"
                                    />
                                    Monthly
                                  </label>
                                  <label className="flex items-center gap-1 text-xs cursor-pointer">
                                    <input
                                      type="radio"
                                      name="editBillingType"
                                      value="fixed_months"
                                      checked={editBillingType === "fixed_months"}
                                      onChange={() => setEditBillingType("fixed_months")}
                                      className="text-emerald-600 w-3.5 h-3.5"
                                    />
                                    Custom Mo
                                  </label>
                                </div>
                              </div>
                              {editBillingType === "fixed_months" && (
                                <div>
                                  <label className="text-[10px] font-bold uppercase block mb-1">Duration (Months)</label>
                                  <input
                                    type="number"
                                    min="1"
                                    max="24"
                                    value={editDurationMonths}
                                    onChange={(e) => setEditDurationMonths(e.target.value)}
                                    placeholder="e.g. 3"
                                    className={`w-full p-2 rounded-xl border text-xs ${darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-800"}`}
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Batch Limit Settings in Edit Mode */}
                        <div className="p-3 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-bold uppercase text-violet-600 dark:text-violet-400 flex items-center gap-1">
                              <Users size={13} /> Batch Limit / Capacity
                            </label>
                            <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                              <input
                                type="checkbox"
                                checked={editHasBatchLimit}
                                onChange={(e) => {
                                  setEditHasBatchLimit(e.target.checked);
                                  if (!e.target.checked) setEditBatchLimit("");
                                }}
                                className="rounded text-violet-600 w-3.5 h-3.5"
                              />
                              Set Seat Limit
                            </label>
                          </div>

                          {editHasBatchLimit && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] font-bold uppercase block mb-1">Max Students Allowed</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={editBatchLimit}
                                  onChange={(e) => setEditBatchLimit(e.target.value)}
                                  placeholder="e.g. 60"
                                  className={`w-full p-2 rounded-xl border text-xs ${darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-800"}`}
                                />
                              </div>
                              <p className="text-[10px] text-slate-400 self-end pb-1 italic">
                                Total currently enrolled: {enrolledStudents.length} students.
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Online Link Controls */}
                        {cls.mode === 'Online' && (
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between">
                              <label className="text-[11px] font-bold uppercase">Online Meeting Link</label>
                              <label className="flex items-center gap-1.5 text-[11px] font-semibold cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={editProvideLater}
                                  onChange={(e) => setEditProvideLater(e.target.checked)}
                                  className="rounded text-blue-600 w-3.5 h-3.5"
                                />
                                Provide Later
                              </label>
                            </div>
                            {!editProvideLater && (
                              <>
                                <input
                                  type="url"
                                  value={editOnlineLink}
                                  onChange={(e) => setEditOnlineLink(e.target.value)}
                                  placeholder="Enter updated meeting link"
                                  className={`w-full p-2.5 rounded-xl border text-xs ${darkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-800"}`}
                                />

                                <div className="space-y-1.5 pt-0.5">
                                  <label className="text-[10px] font-bold uppercase block">Link Availability Type</label>
                                  <div className="flex gap-4">
                                    <label className="flex items-center gap-1.5 text-[11px] font-semibold cursor-pointer">
                                      <input
                                        type="radio"
                                        name="editLinkDisplayMode"
                                        value="immediate"
                                        checked={editLinkDisplayMode === 'immediate'}
                                        onChange={(e) => setEditLinkDisplayMode(e.target.value)}
                                        className="text-blue-600"
                                      />
                                      Open Immediately
                                    </label>
                                    <label className="flex items-center gap-1.5 text-[11px] font-semibold cursor-pointer">
                                      <input
                                        type="radio"
                                        name="editLinkDisplayMode"
                                        value="scheduled"
                                        checked={editLinkDisplayMode === 'scheduled'}
                                        onChange={(e) => setEditLinkDisplayMode(e.target.value)}
                                        className="text-blue-600"
                                      />
                                      Schedule
                                    </label>
                                  </div>
                                </div>

                                {editLinkDisplayMode === 'scheduled' && (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                    <div>
                                      <label className="text-[10px] font-bold uppercase block mb-1">Start Date & Time</label>
                                      <input
                                        type="datetime-local"
                                        value={editLinkStart}
                                        onChange={(e) => setEditLinkStart(e.target.value)}
                                        className={`w-full p-2 rounded-xl border text-xs ${darkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-800"}`}
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[10px] font-bold uppercase block mb-1">End Date & Time</label>
                                      <input
                                        type="datetime-local"
                                        value={editLinkEnd}
                                        onChange={(e) => setEditLinkEnd(e.target.value)}
                                        className={`w-full p-2 rounded-xl border text-xs ${darkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-800"}`}
                                      />
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        )}

                        <div>
                          <label className="text-[11px] font-bold uppercase block mb-1">Description</label>
                          <input
                            type="text"
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            className={`w-full p-2.5 rounded-xl border text-xs ${darkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-800"}`}
                          />
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            onClick={() => setEditingClassId(null)}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleUpdateClassSubmit(cls._id)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <Save size={13} /> Save Changes
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Enrolled Students Section */}
                    <div className={`pt-4 border-t ${darkMode ? "border-slate-800" : "border-slate-100"}`}>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>
                          <Users size={14} className="text-blue-500" /> Enrolled Students ({enrolledStudents.length}{cls.hasBatchLimit ? ` / ${cls.batchLimit}` : ''})
                        </h4>

                        {totalStudentPages > 1 && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleStudentPageChange(cls._id, currentStudentPage - 1)}
                              disabled={currentStudentPage === 1}
                              className={`p-1 rounded-lg border transition-all ${
                                currentStudentPage === 1 
                                  ? "opacity-30 cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-400" 
                                  : darkMode ? "bg-slate-800 hover:bg-slate-700 text-slate-200" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                              }`}
                            >
                              <ChevronLeft size={14} />
                            </button>
                            <span className="text-[10px] font-bold px-1.5 text-slate-400">
                              {currentStudentPage}/{totalStudentPages}
                            </span>
                            <button
                              onClick={() => handleStudentPageChange(cls._id, currentStudentPage + 1)}
                              disabled={currentStudentPage === totalStudentPages}
                              className={`p-1 rounded-lg border transition-all ${
                                currentStudentPage === totalStudentPages 
                                  ? "opacity-30 cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-400" 
                                  : darkMode ? "bg-slate-800 hover:bg-slate-700 text-slate-200" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                              }`}
                            >
                              <ChevronRight size={14} />
                            </button>
                          </div>
                        )}
                      </div>

                      {enrolledStudents.length === 0 ? (
                        <p className={`text-[11px] italic ${darkMode ? "text-slate-500" : "text-slate-400"}`}>No students have joined this class yet.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {currentStudents.map((req: any) => {
                            const student = req.studentId;
                            if (!student) return null;

                            return (
                              <div key={req._id} className={`p-3 rounded-xl border flex items-start gap-2.5 transition-colors ${darkMode ? "bg-slate-800/40 border-slate-700/60" : "bg-slate-50 border-slate-200/80"}`}>
                                <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 shrink-0 flex items-center justify-center border">
                                  {student.profileImage ? (
                                    <img src={getStudentProfileImageUrl(student.profileImage) || ""} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <User size={15} className="text-slate-400" />
                                  )}
                                </div>
                                <div className="space-y-0.5 text-[11px] flex-1 overflow-hidden">
                                  <p className={`font-bold truncate ${darkMode ? "text-white" : "text-slate-800"}`}>{student.name}</p>
                                  <p className={`flex items-center gap-1 truncate ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                                    <Mail size={11} className="shrink-0 text-slate-400" /> {student.email}
                                  </p>
                                  <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[10px]">
                                    <span className={`flex items-center gap-1 ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
                                      <Phone size={10} className="text-slate-400" /> {student.phone || "No Phone"}
                                    </span>
                                    <span className={`flex items-center gap-1 ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
                                      <Building size={10} className="text-slate-400" /> {student.school || "No School"} ({student.grade || "N/A"})
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                  </div>
                );
              })}

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 pt-4">
                  <button
                    onClick={() => setCurrentClassPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentClassPage === 1}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      currentClassPage === 1 
                        ? "opacity-40 cursor-not-allowed bg-slate-200 dark:bg-slate-800 text-slate-400" 
                        : darkMode ? "bg-slate-800 hover:bg-slate-700 text-slate-200" : "bg-slate-200 hover:bg-slate-300 text-slate-700"
                    }`}
                  >
                    <ChevronLeft size={15} /> Previous
                  </button>

                  <span className={`text-xs font-bold px-2 py-1 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>
                    Page {currentClassPage} of {totalPages}
                  </span>

                  <button
                    onClick={() => setCurrentClassPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentClassPage === totalPages}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      currentClassPage === totalPages 
                        ? "opacity-40 cursor-not-allowed bg-slate-200 dark:bg-slate-800 text-slate-400" 
                        : darkMode ? "bg-slate-800 hover:bg-slate-700 text-slate-200" : "bg-slate-200 hover:bg-slate-300 text-slate-700"
                    }`}
                  >
                    Next <ChevronRight size={15} />
                  </button>
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  );
}