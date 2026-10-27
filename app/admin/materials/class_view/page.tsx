// src/app/admin/classes/view/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { 
  Calendar, 
  Clock, 
  BookOpen, 
  User, 
  Loader2, 
  ShieldAlert, 
  Monitor, 
  UserCheck, 
  UserX, 
  Trash2, 
  Search, 
  GraduationCap, 
  Image as ImageIcon, 
  Edit3, 
  X, 
  Check, 
  CreditCard, 
  ExternalLink, 
  Users, 
  ChevronLeft, 
  ChevronRight, 
  Bell, 
  ChevronDown, 
  ChevronUp, 
  Link as LinkIcon, 
  Ban,
  DollarSign
} from "lucide-react";
import { useTheme } from "@/app/context/ThemeContext";

// Cloudinary HTTPS URLs සහ Local backend paths දෙකටම ගැලපෙන Helper ශ්‍රිතය
const getClassCoverImageUrl = (photoUrl?: string) => {
  if (!photoUrl) return null;
  if (photoUrl.startsWith("http")) return photoUrl;
  return `${process.env.NEXT_PUBLIC_API_URL}${photoUrl.startsWith('/') ? '' : '/'}${photoUrl}`;
};

export default function AdminClassViewPage() {
  const router = useRouter();
  const { darkMode } = useTheme();
  const [groupedClasses, setGroupedClasses] = useState<any[]>([]);
  const [classRequests, setClassRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [searchQueries, setSearchQueries] = useState<{ [key: string]: string }>({});

  // Pagination State for each teacher's classes (teacherId -> pageNumber)
  const [teacherPages, setTeacherPages] = useState<{ [key: string]: number }>({});
  const classesPerPage = 2;

  // Pending Quick View Popup State (teacherId -> boolean)
  const [activePendingPopup, setActivePendingPopup] = useState<string | null>(null);

  // Teacher Sections Collapse State with LocalStorage persistence
  const [collapsedTeachers, setCollapsedTeachers] = useState<{ [key: string]: boolean }>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("admin_collapsed_teachers");
        return saved ? JSON.parse(saved) : {};
      } catch (e) {
        return {};
      }
    }
    return {};
  });

  const handleToggleCollapse = (teacherId: string) => {
    setCollapsedTeachers(prev => {
      const updated = { ...prev, [teacherId]: !prev[teacherId] };
      if (typeof window !== "undefined") {
        localStorage.setItem("admin_collapsed_teachers", JSON.stringify(updated));
      }
      return updated;
    });
  };

  // Admin Edit Class Modal States (Updated with Pricing & Limits)
  const [editingClass, setEditingClass] = useState<any | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [editCoverImage, setEditCoverImage] = useState<File | null>(null);
  const [editIsFree, setEditIsFree] = useState(false);
  const [editFee, setEditFee] = useState<string>("");
  const [editBillingType, setEditBillingType] = useState<"monthly" | "fixed_months">("monthly");
  const [editDurationMonths, setEditDurationMonths] = useState<string>("1");
  const [editHasBatchLimit, setEditHasBatchLimit] = useState(false);
  const [editBatchLimit, setEditBatchLimit] = useState<string>("");
  const [editLoading, setEditLoading] = useState(false);

  // Student Details Modal State (Free Card & Profile Info)
  const [selectedStudentDetails, setSelectedStudentDetails] = useState<any | null>(null);
  const [freeCardData, setFreeCardData] = useState<any | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    fetchData(token);
  }, [router]);

  const fetchData = async (token: string) => {
    try {
      const [classesRes, requestsRes] = await Promise.all([
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/classes/all`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/classes/requests/all`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setClassRequests(requestsRes.data);

      const teacherMap: { [key: string]: any } = {};

      classesRes.data.forEach((cls: any) => {
        if (!cls.teacherId) return;
        const teacherId = cls.teacherId._id;

        if (!teacherMap[teacherId]) {
          teacherMap[teacherId] = {
            teacher: cls.teacherId,
            classes: []
          };
        }
        teacherMap[teacherId].classes.push(cls);
      });

      setGroupedClasses(Object.values(teacherMap));
    } catch (err: any) {
      console.error("Error fetching data:", err);
      setError("An error occurred while retrieving data.");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (requestId: string, status: string) => {
    try {
      setActionLoading(requestId);
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/api/classes/requests/status`, { requestId, status }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchData(token);
    } catch (err) {
      console.error("Error updating status:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDropStudent = async (requestId: string) => {
    try {
      setActionLoading(requestId);
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/classes/requests/${requestId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchData(token);
    } catch (err) {
      console.error("Error dropping student:", err);
    } finally {
      setActionLoading(null);
    }
  };

  // පන්තියක සිටින සියලුම සිසුන් එකවර Approve කිරීම
  const handleApproveAllForClass = async (classId: string) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/api/classes/requests/approve-all`, { classId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchData(token);
    } catch (err) {
      console.error("Error approving all students:", err);
      alert("Failed to approve all students.");
    }
  };

  // පන්තියක සිටින සියලුම සිසුන් එකවර Block කිරීම
  const handleBlockAllForClass = async (classId: string) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/api/classes/requests/block-all`, { classId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchData(token);
    } catch (err) {
      console.error("Error blocking all students:", err);
      alert("Failed to block all students.");
    }
  };

  const handleOpenEditModal = (cls: any) => {
    setEditingClass(cls);
    setEditDescription(cls.description || "");
    setEditCoverImage(null);
    setEditIsFree(cls.isFree || false);
    setEditFee(cls.fee ? String(cls.fee) : "");
    setEditBillingType(cls.billingType || "monthly");
    setEditDurationMonths(cls.durationMonths ? String(cls.durationMonths) : "1");
    setEditHasBatchLimit(cls.hasBatchLimit || false);
    setEditBatchLimit(cls.batchLimit ? String(cls.batchLimit) : "");
  };

  // Handle Admin updating class cover, description, pricing & limits
  const handleAdminUpdateClassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass) return;
    setEditLoading(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      const formData = new FormData();
      formData.append("description", editDescription);
      if (editCoverImage) {
        formData.append("coverImage", editCoverImage);
      }
      formData.append("isFree", String(editIsFree));
      formData.append("fee", editIsFree ? "0" : editFee);
      formData.append("billingType", editIsFree ? "monthly" : editBillingType);
      formData.append("durationMonths", !editIsFree && editBillingType === "fixed_months" ? editDurationMonths : "1");
      formData.append("hasBatchLimit", String(editHasBatchLimit));
      formData.append("batchLimit", editHasBatchLimit ? editBatchLimit : "0");

      await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/api/classes/admin/update/${editingClass._id}`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data"
        }
      });

      await fetchData(token);
      setEditingClass(null);
      setEditCoverImage(null);
    } catch (err) {
      console.error("Error updating class details:", err);
      alert("Failed to update class details.");
    } finally {
      setEditLoading(false);
    }
  };

  const handleOpenStudentDetails = async (student: any, classId: string, isFreeCard: boolean) => {
    setSelectedStudentDetails(student);
    setDetailsLoading(true);
    setFreeCardData(null);

    if (!isFreeCard) {
      setDetailsLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/free-card/student/request/${student._id}?classId=${classId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFreeCardData(res.data);
    } catch (err) {
      console.log("No free card request found for this specific class.");
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleJumpToClass = (teacherId: string, targetClassId: string, allClassesList: any[]) => {
    setCollapsedTeachers(prev => {
      const updated = { ...prev, [teacherId]: false };
      if (typeof window !== "undefined") {
        localStorage.setItem("admin_collapsed_teachers", JSON.stringify(updated));
      }
      return updated;
    });

    const classIndex = allClassesList.findIndex((c: any) => c._id === targetClassId);
    if (classIndex !== -1) {
      const targetPage = Math.floor(classIndex / classesPerPage) + 1;
      setTeacherPages(prev => ({ ...prev, [teacherId]: targetPage }));
    }

    setActivePendingPopup(null);

    setTimeout(() => {
      const element = document.getElementById(`class-card-${targetClassId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('ring-4', 'ring-blue-500/50', 'transition-all', 'duration-500');
        setTimeout(() => {
          element.classList.remove('ring-4', 'ring-blue-500/50');
        }, 2000);
      }
    }, 150);
  };

  const getProfileImageUrl = (photoUrl: string) => {
    if (!photoUrl) return null;
    if (photoUrl.startsWith("http")) return photoUrl;
    return `${process.env.NEXT_PUBLIC_API_URL}/profile_photos/${photoUrl}`;
  };

  const getStudentProfileImageUrl = (photoUrl: string) => {
    if (!photoUrl) return null;
    if (photoUrl.startsWith("http")) return photoUrl;
    if (photoUrl.startsWith("/")) {
      return `${process.env.NEXT_PUBLIC_API_URL}${photoUrl}`;
    }
    return `${process.env.NEXT_PUBLIC_API_URL}/Student_profile_photos/${photoUrl}`;
  };

  const handleSearchChange = (classId: string, value: string) => {
    setSearchQueries(prev => ({ ...prev, [classId]: value }));
  };

  // මාසයේ දින ගණන සහ ගෙවී ගිය දින ගණන ගණනය කිරීම
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysPassed = Math.min(now.getDate(), totalDaysInMonth);

  return (
    <div className={`min-h-screen p-3 sm:p-6 font-sans transition-colors duration-500 ${darkMode ? "dark bg-slate-950 text-white" : "bg-slate-50 text-slate-900"}`}>

      {/* Admin Edit Class Modal */}
      {editingClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 text-slate-900 dark:text-white text-xs max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-2.5 border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold flex items-center gap-1.5">
                <Edit3 size={15} className="text-blue-500" /> Manage Class Info & Pricing (Admin)
              </h3>
              <button
                onClick={() => setEditingClass(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAdminUpdateClassSubmit} className="space-y-3.5">
              
              {/* Fee & Billing Settings */}
              <div className="p-3 rounded-2xl border bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-800/60 space-y-2.5">
                <div className="flex items-center justify-between border-b border-emerald-200/60 dark:border-emerald-900/60 pb-1.5">
                  <label className="text-[11px] font-bold uppercase text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                    <DollarSign size={13} /> Class Fee / Pricing
                  </label>
                  <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer select-none text-emerald-700 dark:text-emerald-300">
                    <input
                      type="checkbox"
                      checked={editIsFree}
                      onChange={(e) => {
                        setEditIsFree(e.target.checked);
                        if (e.target.checked) setEditFee("");
                      }}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                    />
                    Free Class
                  </label>
                </div>

                {!editIsFree ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Fee (LKR)</label>
                      <input
                        type="number"
                        min="1"
                        value={editFee}
                        onChange={(e) => setEditFee(e.target.value)}
                        placeholder="e.g. 2500"
                        className="w-full p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-none outline-none font-medium text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Payment Plan</label>
                      <div className="flex items-center gap-2 pt-2">
                        <label className="flex items-center gap-1 text-[11px] font-semibold cursor-pointer">
                          <input
                            type="radio"
                            name="adminBillingType"
                            value="monthly"
                            checked={editBillingType === "monthly"}
                            onChange={() => setEditBillingType("monthly")}
                            className="text-emerald-600 w-3.5 h-3.5"
                          />
                          Monthly
                        </label>
                        <label className="flex items-center gap-1 text-[11px] font-semibold cursor-pointer">
                          <input
                            type="radio"
                            name="adminBillingType"
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
                        <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Duration (Months)</label>
                        <input
                          type="number"
                          min="1"
                          max="24"
                          value={editDurationMonths}
                          onChange={(e) => setEditDurationMonths(e.target.value)}
                          placeholder="e.g. 3"
                          className="w-full p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-none outline-none font-medium text-xs"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 italic">This class is set as completely Free.</p>
                )}
              </div>

              {/* Batch Limit Settings */}
              <div className="p-3 rounded-2xl border bg-violet-50/40 dark:bg-violet-950/20 border-violet-200/80 dark:border-violet-800/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase text-violet-700 dark:text-violet-400 flex items-center gap-1">
                    <Users size={13} /> Batch Limit / Student Seats
                  </label>
                  <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer select-none text-violet-700 dark:text-violet-300">
                    <input
                      type="checkbox"
                      checked={editHasBatchLimit}
                      onChange={(e) => {
                        setEditHasBatchLimit(e.target.checked);
                        if (!e.target.checked) setEditBatchLimit("");
                      }}
                      className="rounded text-violet-600 focus:ring-violet-500 w-3.5 h-3.5"
                    />
                    Limit Seats
                  </label>
                </div>

                {editHasBatchLimit && (
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Maximum Students Allowed</label>
                    <input
                      type="number"
                      min="1"
                      value={editBatchLimit}
                      onChange={(e) => setEditBatchLimit(e.target.value)}
                      placeholder="e.g. 50"
                      className="w-full p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-none outline-none font-medium text-xs"
                    />
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Class Description</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Enter class description..."
                  rows={2}
                  className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-none outline-none font-medium text-xs resize-none"
                ></textarea>
              </div>

              {/* Cover Photo */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                  <ImageIcon size={12} /> Class Cover Photo
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setEditCoverImage(e.target.files ? e.target.files[0] : null)}
                  className="w-full p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-none outline-none text-[11px] file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingClass(null)}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md shadow-blue-600/25 transition-all flex items-center gap-1.5"
                >
                  {editLoading ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Details & Free Card Info Modal */}
      {selectedStudentDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3 my-8 max-h-[90vh] overflow-y-auto custom-scrollbar text-slate-900 dark:text-white text-xs">
            <div className="flex justify-between items-center border-b pb-2.5 border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
                  {selectedStudentDetails.profileImage ? (
                    <img src={getStudentProfileImageUrl(selectedStudentDetails.profileImage) || ""} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User size={20} className="text-slate-400" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold">{selectedStudentDetails.name}</h3>
                  <p className="text-[10px] text-slate-400">{selectedStudentDetails.email}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudentDetails(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[9px]">Phone:</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{selectedStudentDetails.phone || "N/A"}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[9px]">School / Grade:</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{selectedStudentDetails.school || "N/A"} ({selectedStudentDetails.grade || "N/A"})</p>
                </div>
                <div className="col-span-2 mt-0.5">
                  <span className="text-slate-400 font-bold uppercase text-[9px]">Address:</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{selectedStudentDetails.address || "N/A"}</p>
                </div>
              </div>

              {detailsLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="animate-spin text-blue-600" size={20} />
                </div>
              ) : freeCardData ? (
                <div className="space-y-2.5 pt-1.5 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold text-[11px]">
                    <CreditCard size={14} /> Free Card Request Details
                  </div>

                  <div className="p-2.5 rounded-xl bg-amber-50/50 dark:bg-amber-500/10 border border-amber-200/50 dark:border-amber-500/20 space-y-1">
                    <span className="text-amber-700 dark:text-amber-400 font-bold uppercase text-[9px]">Father's Details</span>
                    <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                      <div><span className="text-slate-400 text-[9px]">Name:</span> <p className="font-semibold">{freeCardData.fatherName || "N/A"}</p></div>
                      <div><span className="text-slate-400 text-[9px]">Phone:</span> <p className="font-semibold">{freeCardData.fatherPhone || "N/A"}</p></div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-amber-50/50 dark:bg-amber-500/10 border border-amber-200/50 dark:border-amber-500/20 space-y-1">
                    <span className="text-amber-700 dark:text-amber-400 font-bold uppercase text-[9px]">Mother's Details</span>
                    <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                      <div><span className="text-slate-400 text-[9px]">Name:</span> <p className="font-semibold">{freeCardData.motherName || "N/A"}</p></div>
                      <div><span className="text-slate-400 text-[9px]">Phone:</span> <p className="font-semibold">{freeCardData.motherPhone || "N/A"}</p></div>
                    </div>
                  </div>

                  {freeCardData.familyBackground && (
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                      <span className="text-slate-400 font-bold uppercase text-[9px]">Family Background / Reason:</span>
                      <p className="text-[11px] text-slate-700 dark:text-slate-300 italic whitespace-pre-wrap">{freeCardData.familyBackground}</p>
                    </div>
                  )}

                  {freeCardData.files && freeCardData.files.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-slate-400 font-bold uppercase text-[9px]">Documents ({freeCardData.files.length}):</span>
                      <div className="space-y-1">
                        {freeCardData.files.map((fileUrl: string, idx: number) => (
                          <a
                            key={idx}
                            href={`${process.env.NEXT_PUBLIC_API_URL}${fileUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-colors text-[11px] font-semibold text-blue-600 dark:text-blue-400"
                          >
                            <span className="truncate">Document {idx + 1}</span>
                            <ExternalLink size={12} />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 italic text-center py-2">No Free Card Request submitted.</p>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setSelectedStudentDetails(null)}
                className="px-4 py-1.5 bg-slate-900 dark:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-5">

        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Teachers, Classes & Requests</h1>
          </div>
          <div className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-xs shadow-md shadow-blue-600/20">
            Total Educators: {groupedClasses.length}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 p-3 rounded-xl text-xs font-medium flex items-center gap-2">
            <ShieldAlert size={16} /> {error}
          </div>
        )}

        {/* Content Area */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="animate-spin text-blue-600 mb-3" size={32} />
            <p className="text-slate-500 text-xs font-medium">Loading classes and requests...</p>
          </div>
        ) : groupedClasses.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-16 flex flex-col items-center justify-center text-center px-4 shadow-sm">
            <BookOpen size={36} className="text-slate-300 dark:text-slate-600 mb-3" />
            <h3 className="text-lg font-bold mb-1">No Classes Found</h3>
            <p className="text-slate-500 text-xs">No teachers have created classes yet.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {groupedClasses.map((item) => {
              const teacher = item.teacher;
              const classesList = item.classes;

              const teacherId = teacher._id;
              const currentPage = teacherPages[teacherId] || 1;
              const totalPages = Math.ceil(classesList.length / classesPerPage);
              const startIndex = (currentPage - 1) * classesPerPage;
              const currentClasses = classesList.slice(startIndex, startIndex + classesPerPage);

              const teacherClassIds = classesList.map((c: any) => c._id);
              const teacherPendingRequests = classRequests.filter(
                (req: any) => teacherClassIds.includes(req.classId?._id) && req.status === 'Pending'
              );
              const pendingCount = teacherPendingRequests.length;
              const isCollapsed = !!collapsedTeachers[teacherId];

              return (
                <div
                  key={teacherId}
                  className={`rounded-2xl border p-4 sm:p-5 shadow-sm transition-all duration-300 flex flex-col gap-3.5 relative text-xs ${
                    darkMode 
                      ? "bg-slate-900 border-slate-800 text-white" 
                      : "bg-white border-slate-200 text-slate-900"
                  }`}
                >

                  {/* Teacher Info Banner */}
                  <div className={`rounded-xl px-3 py-2.5 border flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs ${
                    darkMode ? "bg-slate-800/80 border-slate-700/80 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                  }`}>
                    <div className="flex items-center gap-2.5 w-full sm:w-auto">
                      <div className={`w-9 h-9 rounded-full overflow-hidden border flex items-center justify-center shadow-2xs shrink-0 ${
                        darkMode ? "border-slate-700 bg-slate-900" : "border-white bg-slate-100"
                      }`}>
                        {teacher?.profilePhoto ? (
                          <img
                            src={getProfileImageUrl(teacher.profilePhoto) || ""}
                            alt={teacher.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <User size={18} className="text-slate-400" />
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 relative">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-extrabold text-xs sm:text-sm tracking-tight">{teacher?.name}</h3>

                          {pendingCount > 0 && (
                            <div className="relative">
                              <button
                                onClick={() => setActivePendingPopup(activePendingPopup === teacherId ? null : teacherId)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-500 hover:bg-amber-600 text-white animate-pulse shadow-2xs transition-all cursor-pointer"
                                title="Click to view pending requests"
                              >
                                <Bell size={9} /> {pendingCount} Pending
                              </button>

                              {activePendingPopup === teacherId && (
                                <div className={`absolute left-0 mt-1.5 w-64 rounded-xl shadow-xl z-50 p-2.5 space-y-1.5 border text-xs ${
                                  darkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                                }`}>
                                  <div className={`flex items-center justify-between border-b pb-1.5 ${darkMode ? "border-slate-800" : "border-slate-100"}`}>
                                    <span className="text-[10px] font-bold uppercase opacity-80">Pending Requests</span>
                                    <button onClick={() => setActivePendingPopup(null)} className="text-slate-400 hover:text-slate-600">
                                      <X size={12} />
                                    </button>
                                  </div>
                                  <div className="max-h-40 overflow-y-auto space-y-1 custom-scrollbar">
                                    {teacherPendingRequests.map((req: any) => {
                                      const studentName = req.studentId?.name || "Student";
                                      const classObj = req.classId;
                                      if (!classObj) return null;

                                      return (
                                        <div
                                          key={req._id}
                                          onClick={() => handleJumpToClass(teacherId, classObj._id, classesList)}
                                          className={`p-1.5 rounded-lg border cursor-pointer transition-all group text-[11px] ${
                                            darkMode ? "bg-slate-800 border-slate-700 hover:bg-blue-900/20" : "bg-slate-50 border-slate-200 hover:bg-blue-50"
                                          }`}
                                        >
                                          <p className="font-bold group-hover:text-blue-600">👤 {studentName}</p>
                                          <p className="text-[9px] opacity-70 truncate mt-0.5">
                                            📚 <span className="text-teal-600 dark:text-teal-400 font-semibold">{classObj.grade === 'Other' ? classObj.customGradeName : classObj.grade} - {classObj.medium} ({classObj.day})</span>
                                          </p>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <span className="opacity-40 hidden sm:inline">•</span>
                        <p className="text-[11px] font-bold text-teal-600 dark:text-teal-400 flex items-center gap-1">
                          <BookOpen size={11} /> {teacher?.subject}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="bg-blue-600 text-white px-3 py-1 rounded-lg text-[11px] font-bold shadow-2xs flex items-center gap-1">
                        <GraduationCap size={12} /> Classes: {classesList.length}
                      </div>

                      <button
                        onClick={() => handleToggleCollapse(teacherId)}
                        className={`p-1.5 rounded-lg border transition-all flex items-center gap-1 text-[11px] font-bold ${
                          darkMode ? "bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-700" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                        title={isCollapsed ? "Expand Classes" : "Collapse Classes"}
                      >
                        {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                        <span className="hidden sm:inline">{isCollapsed ? "Show" : "Hide"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Classes & Student Requests */}
                  {!isCollapsed && (
                    <div className="flex flex-col animate-fadeIn space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Conducted Classes & Requests</h4>

                        {classesList.length > classesPerPage && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setTeacherPages(prev => ({ ...prev, [teacherId]: Math.max(currentPage - 1, 1) }))}
                              disabled={currentPage === 1}
                              className={`p-1 rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-all border text-[11px] ${
                                darkMode ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-700"
                              }`}
                            >
                              <ChevronLeft size={12} />
                            </button>
                            <span className="text-[11px] font-bold px-1.5">
                              {currentPage}/{totalPages}
                            </span>
                            <button
                              onClick={() => setTeacherPages(prev => ({ ...prev, [teacherId]: Math.min(currentPage + 1, totalPages) }))}
                              disabled={currentPage === totalPages}
                              className={`p-1 rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-all border text-[11px] ${
                                darkMode ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-700"
                              }`}
                            >
                              <ChevronRight size={12} />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {currentClasses.map((cls: any) => {
                          const clsRequests = classRequests.filter((req: any) => req.classId?._id === cls._id);
                          const totalStudentsCount = clsRequests.length;
                          const approvedStudentsCount = clsRequests.filter((req: any) => req.status === 'Approved').length;

                          // Check if batch is full
                          const isFull = cls.hasBatchLimit && cls.batchLimit > 0 && approvedStudentsCount >= cls.batchLimit;

                          const query = (searchQueries[cls._id] || "").toLowerCase();
                          const filteredRequests = clsRequests.filter((req: any) =>
                            req.studentId?.name?.toLowerCase().includes(query)
                          );

                          const classCoverUrl = getClassCoverImageUrl(cls.coverImage);

                          return (
                            <div 
                              key={cls._id} 
                              id={`class-card-${cls._id}`} 
                              className={`p-3.5 rounded-xl border shadow-2xs flex flex-col justify-between gap-3 transition-all ${
                                darkMode ? "bg-slate-800/40 border-slate-700/80" : "bg-slate-50 border-slate-200/80"
                              }`}
                            >

                              <div className="space-y-2.5">
                                {/* Class Cover Image Display */}
                                <div className={`relative w-full h-28 rounded-xl overflow-hidden border ${
                                  darkMode ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-slate-100"
                                }`}>
                                  {classCoverUrl ? (
                                    <img src={classCoverUrl} alt={cls.grade} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-0.5">
                                      <ImageIcon size={20} />
                                      <span className="text-[9px] italic">No cover photo</span>
                                    </div>
                                  )}

                                  {/* Price Tag Overlay on Cover */}
                                  {cls.isFree ? (
                                    <span className="absolute top-1.5 left-1.5 px-2 py-0.5 bg-emerald-600/95 text-white rounded-md text-[9px] font-black shadow-sm">
                                      FREE
                                    </span>
                                  ) : cls.fee ? (
                                    <span className="absolute top-1.5 left-1.5 px-2 py-0.5 bg-slate-900/90 text-white rounded-md text-[9px] font-black shadow-sm">
                                      LKR {cls.fee.toLocaleString()}
                                    </span>
                                  ) : null}

                                  <button
                                    onClick={() => handleOpenEditModal(cls)}
                                    className="absolute top-1.5 right-1.5 bg-slate-900/70 hover:bg-slate-900 text-white px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 backdrop-blur-sm transition-all"
                                  >
                                    <Edit3 size={11} /> Edit
                                  </button>
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-1.5">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="px-2.5 py-0.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-extrabold">
                                      {cls.grade === 'Other' ? cls.customGradeName : cls.grade}
                                    </span>
                                    <span className="px-2.5 py-0.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg text-[10px] font-extrabold">
                                      {cls.medium}
                                    </span>
                                    <span className="px-2.5 py-0.5 bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-lg text-[10px] font-extrabold flex items-center gap-0.5">
                                      <Monitor size={10} /> {cls.mode}
                                    </span>

                                    {/* Fee Badge */}
                                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold flex items-center gap-0.5 ${
                                      cls.isFree 
                                        ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                                        : "bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400"
                                    }`}>
                                      <DollarSign size={10} className="shrink-0" />
                                      {cls.isFree 
                                        ? "Free" 
                                        : `LKR ${Number(cls.fee || 0).toLocaleString()} ${cls.billingType === 'fixed_months' ? `(${cls.durationMonths || 1} Mo)` : '/ Mo'}`
                                      }
                                    </span>

                                    {/* Batch Limit / Capacity Badge */}
                                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold flex items-center gap-0.5 ${
                                      isFull 
                                        ? "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400" 
                                        : cls.hasBatchLimit 
                                          ? "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400" 
                                          : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                                    }`}>
                                      <Users size={10} className="shrink-0" />
                                      {cls.hasBatchLimit 
                                        ? `${approvedStudentsCount}/${cls.batchLimit} Seats ${isFull ? '(Full)' : ''}`
                                        : "Unlimited Seats"
                                      }
                                    </span>
                                  </div>

                                  <div className="px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20 rounded-lg text-[10px] font-bold flex items-center gap-1">
                                    <Users size={11} /> Requests: {totalStudentsCount}
                                  </div>
                                </div>

                                {/* මාසික දින ගණන සහ ගෙවී ගිය දින පෙන්වන කොටස */}
                                <div className="p-2 rounded-lg bg-blue-50/60 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 text-[10px] font-bold text-blue-700 dark:text-blue-300 flex items-center justify-between">
                                  <span>📅 Monthly Progress:</span>
                                  <span>Days Passed: {daysPassed} / {totalDaysInMonth} Days</span>
                                </div>

                                <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold opacity-80">
                                  <div className="flex items-center gap-1">
                                    <Calendar size={12} className="text-blue-500" /> <span>Every {cls.day}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Clock size={12} className="text-orange-500" /> <span>{cls.startTime} - {cls.endTime}</span>
                                  </div>
                                </div>

                                {cls.mode === 'Online' ? (
                                  <div className="text-[11px]">
                                    {cls.provideLater || !cls.onlineLink ? (
                                      <span className="inline-block px-2.5 py-0.5 bg-amber-50 dark:bg-amber-500/10 text-amber-600 rounded-lg font-bold">Online Link: Provide Later</span>
                                    ) : (
                                      <div className="p-2 rounded-lg border bg-blue-50/50 dark:bg-slate-900/60 border-blue-200 dark:border-slate-800 space-y-1">
                                        <a 
                                          href={cls.onlineLink} 
                                          target="_blank" 
                                          rel="noopener noreferrer" 
                                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold inline-flex items-center gap-1 transition-all shadow-sm"
                                        >
                                          <LinkIcon size={11} /> Open Meeting Link
                                        </a>

                                        {cls.linkDisplayMode === 'immediate' ? (
                                          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">🟢 Open Immediately</p>
                                        ) : cls.linkStartDateTime && cls.linkEndDateTime ? (
                                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                                            ⏳ {new Date(cls.linkStartDateTime).toLocaleString()} - {new Date(cls.linkEndDateTime).toLocaleString()}
                                          </p>
                                        ) : null}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-[11px] space-y-0.5 text-slate-500 dark:text-slate-400">
                                    {cls.instituteName && <p>🏢 {cls.instituteName}</p>}
                                    {cls.instituteAddress && <p>📍 {cls.instituteAddress}</p>}
                                  </div>
                                )}

                                {cls.description ? (
                                  <p className={`text-[11px] italic p-2 rounded-lg border ${
                                    darkMode ? "bg-slate-900 border-slate-700 text-slate-300" : "bg-white border-slate-200 text-slate-600"
                                  }`}>
                                    {cls.description}
                                  </p>
                                ) : (
                                  <p className="text-[10px] text-slate-400 italic">No description provided.</p>
                                )}
                              </div>

                              {/* Student Requests Section for this Class */}
                              <div className={`pt-2.5 border-t ${darkMode ? "border-slate-700/80" : "border-slate-200/80"}`}>
                                <div className="flex items-center justify-between mb-1.5">
                                  <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    Student Requests ({clsRequests.length})
                                  </h5>
                                </div>

                                {/* Approve All සහ Block All බටන්ස් */}
                                {clsRequests.length > 0 && (
                                  <div className="grid grid-cols-2 gap-1.5 mb-2">
                                    <button
                                      onClick={() => handleApproveAllForClass(cls._id)}
                                      className="py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-extrabold flex items-center justify-center gap-1 shadow-sm transition-all"
                                    >
                                      <UserCheck size={12} /> Approve All
                                    </button>
                                    <button
                                      onClick={() => handleBlockAllForClass(cls._id)}
                                      className="py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[10px] font-extrabold flex items-center justify-center gap-1 shadow-sm transition-all"
                                    >
                                      <Ban size={12} /> Block All
                                    </button>
                                  </div>
                                )}

                                {clsRequests.length > 0 && (
                                  <div className="relative mb-2">
                                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                      type="text"
                                      placeholder="Search student..."
                                      value={searchQueries[cls._id] || ""}
                                      onChange={(e) => handleSearchChange(cls._id, e.target.value)}
                                      className={`w-full pl-8 pr-2.5 py-1 rounded-lg text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-500 border ${
                                        darkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                                      }`}
                                    />
                                  </div>
                                )}

                                {clsRequests.length === 0 ? (
                                  <p className="text-[11px] text-slate-400 italic">No student requests yet.</p>
                                ) : filteredRequests.length === 0 ? (
                                  <p className="text-[11px] text-slate-400 italic py-2 text-center">No student found.</p>
                                ) : (
                                  <div className="max-h-48 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      {filteredRequests.map((req: any) => {
                                        const student = req.studentId;
                                        if (!student) return null;

                                        return (
                                          <div key={req._id} className={`p-2.5 rounded-xl border flex flex-col justify-between gap-2 ${
                                            darkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200 shadow-2xs"
                                          }`}>
                                            <div
                                              onClick={() => handleOpenStudentDetails(student, cls._id, req.isFreeCard)}
                                              className="flex items-center gap-2 cursor-pointer group"
                                              title="Click to view details"
                                            >
                                              <div className={`w-7 h-7 rounded-full overflow-hidden shrink-0 flex items-center justify-center border group-hover:border-blue-500 transition-colors ${
                                                darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-100 border-slate-200"
                                              }`}>
                                                {student.profileImage ? (
                                                  <img src={getStudentProfileImageUrl(student.profileImage) || ""} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                  <User size={14} className="text-slate-400" />
                                                )}
                                              </div>
                                              <div className="overflow-hidden">
                                                <p className="text-[11px] font-bold truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{student.name}</p>

                                                <div className="flex flex-wrap items-center gap-1 mt-0.5">
                                                  <span className={`inline-block px-1.5 py-0.2 rounded-full text-[9px] font-extrabold ${req.status === 'Approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' :
                                                      req.status === 'Blocked' ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' :
                                                        'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                                                    }`}>
                                                    {req.status}
                                                  </span>

                                                  {req.isFreeCard && (
                                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400">
                                                      <CreditCard size={9} /> Free Card
                                                    </span>
                                                  )}
                                                </div>
                                              </div>
                                            </div>

                                            <div className={`flex items-center justify-between gap-1 pt-1 border-t ${darkMode ? "border-slate-800" : "border-slate-100"}`}>
                                              {actionLoading === req._id ? (
                                                <Loader2 className="animate-spin text-blue-600 mx-auto" size={12} />
                                              ) : (
                                                <div className="flex items-center gap-1 w-full justify-end">
                                                  {req.status !== 'Approved' && (
                                                    <button
                                                      onClick={() => handleStatusUpdate(req._id, 'Approved')}
                                                      className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[9px] font-bold flex items-center gap-0.5 transition-colors"
                                                      title="Approve"
                                                    >
                                                      <UserCheck size={10} /> Approve
                                                    </button>
                                                  )}
                                                  {req.status !== 'Blocked' && (
                                                    <button
                                                      onClick={() => handleStatusUpdate(req._id, 'Blocked')}
                                                      className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded-md text-[9px] font-bold flex items-center gap-0.5 transition-colors"
                                                      title="Block"
                                                    >
                                                      <UserX size={10} /> Block
                                                    </button>
                                                  )}
                                                  <button
                                                    onClick={() => handleDropStudent(req._id)}
                                                    className="px-2 py-0.5 bg-slate-600 hover:bg-slate-700 text-white rounded-md text-[9px] font-bold flex items-center gap-0.5 transition-colors"
                                                    title="Drop"
                                                  >
                                                    <Trash2 size={10} /> Drop
                                                  </button>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>

                            </div>
                          );
                        })}
                      </div>

                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}