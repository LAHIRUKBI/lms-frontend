// src/app/components/CreateClassModal.tsx

"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Plus, BookOpen, CheckCircle2, AlertCircle, Loader2, Image as ImageIcon, Link as LinkIcon, MapPin, Building, X, ChevronDown, DollarSign, Users } from "lucide-react";
import ClassCreateConfirmPopup from "@/app/components/ClassCreateConfirmPopup";
import { useTheme } from "@/app/context/ThemeContext";

interface CreateClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClassCreated: () => void;
}

export default function CreateClassModal({ isOpen, onClose, onClassCreated }: CreateClassModalProps) {
  const router = useRouter();
  const { darkMode } = useTheme();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Form States
  const [grade, setGrade] = useState("Grade 1");
  const [customGradeName, setCustomGradeName] = useState("");
  const [medium, setMedium] = useState("Sinhala Medium");
  const [mode, setMode] = useState("Online");
  
  // Online Specific States
  const [onlineLink, setOnlineLink] = useState("");
  const [provideLater, setProvideLater] = useState(false);
  const [linkDisplayMode, setLinkDisplayMode] = useState("scheduled");
  const [linkStartDateTime, setLinkStartDateTime] = useState("");
  const [linkEndDateTime, setLinkEndDateTime] = useState("");

  // Offline Specific States
  const [instituteName, setInstituteName] = useState("");
  const [instituteAddress, setInstituteAddress] = useState("");

  // Recurring Day & Time
  const [day, setDay] = useState("Monday");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("10:00");
  const [description, setDescription] = useState("");
  const [coverImage, setCoverImage] = useState<File | null>(null);

  // --- අලුතින් එක් කළ Fee & Batch Limit States ---
  const [isFree, setIsFree] = useState(false);
  const [fee, setFee] = useState<string>("");
  const [billingType, setBillingType] = useState<"monthly" | "fixed_months">("monthly");
  const [durationMonths, setDurationMonths] = useState<string>("1");

  const [hasBatchLimit, setHasBatchLimit] = useState(false);
  const [batchLimit, setBatchLimit] = useState<string>("");

  // Custom Dropdown Open States
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

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
  }, [router]);

  if (!isOpen) return null;

  // Helper to get day index from day name
  const getDayIndex = (dayName: string) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days.indexOf(dayName);
  };

  // Helper to calculate min/max datetime for the selected recurring day & class time
  const getScheduledConstraints = () => {
    const targetDayIndex = getDayIndex(day);
    const now = new Date();
    
    const currentDayIndex = now.getDay();
    let dayDifference = targetDayIndex - currentDayIndex;
    if (dayDifference < 0) {
      dayDifference += 7;
    }
    
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + dayDifference);
    
    const dateString = targetDate.toISOString().split('T')[0];
    
    return {
      min: `${dateString}T${startTime}`,
      max: `${dateString}T${endTime}`
    };
  };

  const constraints = getScheduledConstraints();

  // Strict validator when user picks date/time
  const handleStartDateTimeChange = (val: string) => {
    if (!val) {
      setLinkStartDateTime("");
      return;
    }

    const selectedDate = new Date(val);
    const selectedDayOfWeek = selectedDate.getDay();
    const targetDayIndex = getDayIndex(day);

    if (selectedDayOfWeek !== targetDayIndex) {
      setMessage({ type: "error", text: `You can only select dates that fall on the recurring class day (${day}).` });
      setLinkStartDateTime("");
      return;
    }

    setMessage({ type: "", text: "" });
    setLinkStartDateTime(val);
  };

  const handleEndDateTimeChange = (val: string) => {
    if (!val) {
      setLinkEndDateTime("");
      return;
    }

    const selectedDate = new Date(val);
    const selectedDayOfWeek = selectedDate.getDay();
    const targetDayIndex = getDayIndex(day);

    if (selectedDayOfWeek !== targetDayIndex) {
      setMessage({ type: "error", text: `You can only select dates that fall on the recurring class day (${day}).` });
      setLinkEndDateTime("");
      return;
    }

    setMessage({ type: "", text: "" });
    setLinkEndDateTime(val);
  };

  const handleFormSubmitTrigger = (e: React.FormEvent) => {
    e.preventDefault();
    if (grade === "Other" && !customGradeName.trim()) {
      setMessage({ type: "error", text: "Please enter a custom class name for 'Other'." });
      return;
    }

    if (!isFree && (!fee || Number(fee) <= 0)) {
      setMessage({ type: "error", text: "Please enter a valid class fee amount, or mark it as Free." });
      return;
    }

    if (!isFree && billingType === "fixed_months" && (!durationMonths || Number(durationMonths) < 1)) {
      setMessage({ type: "error", text: "Please enter a valid duration in months." });
      return;
    }

    if (hasBatchLimit && (!batchLimit || Number(batchLimit) < 1)) {
      setMessage({ type: "error", text: "Please specify the maximum number of students (Batch Limit)." });
      return;
    }

    // Validation for Scheduled Online Links against Recurring Day & Time
    if (mode === "Online" && !provideLater && linkDisplayMode === "scheduled") {
      if (linkStartDateTime && linkEndDateTime) {
        const startDate = new Date(linkStartDateTime);
        const endDate = new Date(linkEndDateTime);

        if (startDate >= endDate) {
          setMessage({ type: "error", text: "Start Date & Time must be earlier than End Date & Time." });
          return;
        }

        const selectedDayOfWeek = startDate.getDay();
        const targetDayIndex = getDayIndex(day);

        if (selectedDayOfWeek !== targetDayIndex) {
          setMessage({ type: "error", text: `The scheduled link start date must fall on the recurring class day (${day}).` });
          return;
        }

        const startHourMin = startDate.getHours() * 60 + startDate.getMinutes();
        const endHourMin = endDate.getHours() * 60 + endDate.getMinutes();
        
        const [classStartH, classStartM] = startTime.split(":").map(Number);
        const [classEndH, classEndM] = endTime.split(":").map(Number);
        const classStartMin = classStartH * 60 + classStartM;
        const classEndMin = classEndH * 60 + classEndM;

        if (endHourMin < classStartMin || startHourMin > classEndMin) {
          setMessage({ type: "error", text: `The scheduled link time must overlap with the class duration (${startTime} - ${endTime}).` });
          return;
        }
      }
    }

    setIsCreateModalOpen(true);
  };

  const handleCreateClass = async () => {
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("grade", grade);
      if (grade === "Other") formData.append("customGradeName", customGradeName);
      formData.append("medium", medium);
      formData.append("mode", mode);
      
      if (mode === "Online") {
        formData.append("provideLater", String(provideLater));
        if (!provideLater) {
          formData.append("onlineLink", onlineLink);
          formData.append("linkDisplayMode", linkDisplayMode);
          if (linkDisplayMode === 'scheduled') {
            formData.append("linkStartDateTime", linkStartDateTime);
            formData.append("linkEndDateTime", linkEndDateTime);
          }
        }
      } else {
        formData.append("instituteName", instituteName);
        formData.append("instituteAddress", instituteAddress);
      }

      formData.append("day", day);
      formData.append("startTime", startTime);
      formData.append("endTime", endTime);
      if (description) formData.append("description", description);
      if (coverImage) formData.append("coverImage", coverImage);

      // Fee & Limits append කිරීම
      formData.append("isFree", String(isFree));
      formData.append("fee", isFree ? "0" : fee);
      formData.append("billingType", isFree ? "monthly" : billingType);
      formData.append("durationMonths", !isFree && billingType === "fixed_months" ? durationMonths : "1");
      formData.append("hasBatchLimit", String(hasBatchLimit));
      formData.append("batchLimit", hasBatchLimit ? batchLimit : "0");

      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/classes/create`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data"
        }
      });

      setMessage({ type: "success", text: res.data.message });
      setDescription("");
      setCoverImage(null);
      setOnlineLink("");
      setLinkStartDateTime("");
      setLinkEndDateTime("");
      setInstituteName("");
      setInstituteAddress("");
      setIsFree(false);
      setFee("");
      setBillingType("monthly");
      setDurationMonths("1");
      setHasBatchLimit(false);
      setBatchLimit("");

      setTimeout(() => {
        onClassCreated();
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setMessage({ type: "error", text: err.response?.data?.message || "An error occurred while creating the class." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div 
        ref={dropdownRef}
        className={`relative w-full max-w-3xl rounded-2xl p-4 sm:p-6 shadow-2xl transition-colors duration-500 max-h-[92vh] overflow-y-auto ${darkMode ? "bg-slate-950 text-slate-100 border border-slate-800" : "bg-white text-slate-900"}`}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors z-20"
        >
          <X size={20} />
        </button>

        <ClassCreateConfirmPopup
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onConfirm={handleCreateClass}
          classData={{
            grade: grade === "Other" ? customGradeName : grade,
            medium,
            mode,
            day,
            startTime,
            endTime,
            description,
            coverImageFile: coverImage,
            isFree,
            fee: isFree ? 0 : Number(fee),
            billingType,
            durationMonths: Number(durationMonths),
            hasBatchLimit,
            batchLimit: Number(batchLimit)
          }}
        />

        <div className="space-y-4">
          
          {/* Header Section */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/50 dark:border-slate-800 pr-8">
            <div>
              <h1 className={`text-lg sm:text-xl font-extrabold flex items-center gap-2 ${darkMode ? "text-white" : "text-slate-900"}`}>
                <BookOpen className="text-blue-600 shrink-0" size={20} /> Create New Class
              </h1>
              <p className={`text-xs mt-0.5 ${darkMode ? "text-slate-400" : "text-slate-600"}`}>Setup classes with pricing, batch limit, and online or physical details.</p>
            </div>
          </div>

          {message.text && (
            <div className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-xs ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
              {message.type === 'success' ? <CheckCircle2 size={16} className="shrink-0" /> : <AlertCircle size={16} className="shrink-0" />}
              <p className="font-medium break-all">{message.text}</p>
            </div>
          )}

          {/* Form Container */}
          <div className={`rounded-2xl p-3 sm:p-5 border shadow-sm transition-colors duration-500 ${darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
            
            <form onSubmit={handleFormSubmitTrigger} className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">

              {/* Grade Selection */}
              <div className="space-y-1 relative">
                <label className={`text-[11px] font-bold uppercase block ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Select Grade</label>
                <div
                  onClick={() => setOpenDropdown(openDropdown === "grade" ? null : "grade")}
                  className={`w-full p-2.5 rounded-xl flex items-center justify-between cursor-pointer font-medium text-xs select-none ${darkMode ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-700"}`}
                >
                  <span className="truncate">{grade}</span>
                  <ChevronDown size={14} className={`transition-transform duration-200 shrink-0 ${openDropdown === "grade" ? "rotate-180" : ""}`} />
                </div>

                {openDropdown === "grade" && (
                  <div className={`absolute left-0 right-0 top-full mt-1.5 max-h-52 overflow-y-auto rounded-xl shadow-xl z-30 border ${darkMode ? "bg-slate-900 border-slate-700 text-slate-200" : "bg-white border-slate-200 text-slate-700"}`}>
                    {Array.from({ length: 13 }, (_, i) => (
                      <div
                        key={i + 1}
                        onClick={() => { setGrade(`Grade ${i + 1}`); setOpenDropdown(null); }}
                        className={`p-2.5 text-xs font-medium cursor-pointer transition-colors ${darkMode ? "hover:bg-slate-800" : "hover:bg-slate-100"} ${grade === `Grade ${i + 1}` ? (darkMode ? "bg-slate-800 text-blue-400 font-bold" : "bg-slate-100 text-blue-600 font-bold") : ""}`}
                      >
                        Grade {i + 1}
                      </div>
                    ))}
                    <div
                      onClick={() => { setGrade("Other"); setOpenDropdown(null); }}
                      className={`p-2.5 text-xs font-medium cursor-pointer transition-colors border-t ${darkMode ? "border-slate-800 hover:bg-slate-800" : "border-slate-100 hover:bg-slate-100"} ${grade === "Other" ? (darkMode ? "bg-slate-800 text-blue-400 font-bold" : "bg-slate-100 text-blue-600 font-bold") : ""}`}
                    >
                      Other (Custom Name)
                    </div>
                  </div>
                )}
              </div>

              {grade === "Other" && (
                <div className="space-y-1 sm:col-span-3">
                  <label className={`text-[11px] font-bold uppercase block ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Custom Class Name</label>
                  <input
                    type="text"
                    value={customGradeName}
                    onChange={(e) => setCustomGradeName(e.target.value)}
                    placeholder="e.g. Advanced ICT Revision"
                    required
                    className={`w-full p-2.5 rounded-xl border-none outline-none font-medium text-xs focus:ring-1 focus:ring-blue-500 ${darkMode ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-700"}`}
                  />
                </div>
              )}

              {/* Medium */}
              <div className="space-y-1 relative">
                <label className={`text-[11px] font-bold uppercase block ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Medium</label>
                <div
                  onClick={() => setOpenDropdown(openDropdown === "medium" ? null : "medium")}
                  className={`w-full p-2.5 rounded-xl flex items-center justify-between cursor-pointer font-medium text-xs select-none ${darkMode ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-700"}`}
                >
                  <span className="truncate">{medium}</span>
                  <ChevronDown size={14} className={`transition-transform duration-200 shrink-0 ${openDropdown === "medium" ? "rotate-180" : ""}`} />
                </div>

                {openDropdown === "medium" && (
                  <div className={`absolute left-0 right-0 top-full mt-1.5 rounded-xl shadow-xl z-30 border overflow-hidden ${darkMode ? "bg-slate-900 border-slate-700 text-slate-200" : "bg-white border-slate-200 text-slate-700"}`}>
                    {["Sinhala Medium", "English Medium"].map((med) => (
                      <div
                        key={med}
                        onClick={() => { setMedium(med); setOpenDropdown(null); }}
                        className={`p-2.5 text-xs font-medium cursor-pointer transition-colors ${darkMode ? "hover:bg-slate-800" : "hover:bg-slate-100"} ${medium === med ? (darkMode ? "bg-slate-800 text-blue-400 font-bold" : "bg-slate-100 text-blue-600 font-bold") : ""}`}
                      >
                        {med}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Mode */}
              <div className="space-y-1 relative">
                <label className={`text-[11px] font-bold uppercase block ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Class Mode</label>
                <div
                  onClick={() => setOpenDropdown(openDropdown === "mode" ? null : "mode")}
                  className={`w-full p-2.5 rounded-xl flex items-center justify-between cursor-pointer font-medium text-xs select-none ${darkMode ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-700"}`}
                >
                  <span className="truncate">{mode}</span>
                  <ChevronDown size={14} className={`transition-transform duration-200 shrink-0 ${openDropdown === "mode" ? "rotate-180" : ""}`} />
                </div>

                {openDropdown === "mode" && (
                  <div className={`absolute left-0 right-0 top-full mt-1.5 rounded-xl shadow-xl z-30 border overflow-hidden ${darkMode ? "bg-slate-900 border-slate-700 text-slate-200" : "bg-white border-slate-200 text-slate-700"}`}>
                    {["Online", "Offline"].map((m) => (
                      <div
                        key={m}
                        onClick={() => { setMode(m); setOpenDropdown(null); }}
                        className={`p-2.5 text-xs font-medium cursor-pointer transition-colors ${darkMode ? "hover:bg-slate-800" : "hover:bg-slate-100"} ${mode === m ? (darkMode ? "bg-slate-800 text-blue-400 font-bold" : "bg-slate-100 text-blue-600 font-bold") : ""}`}
                      >
                        {m}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ================= NEW SECTION: CLASS PRICING & PAYMENT ================= */}
              <div className="sm:col-span-3 p-3.5 rounded-2xl border bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-800/60 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/60 dark:border-emerald-900/60 pb-2">
                  <label className={`text-xs font-bold uppercase flex items-center gap-1.5 ${darkMode ? "text-emerald-400" : "text-emerald-800"}`}>
                    <DollarSign size={15} className="shrink-0" /> Class Fee / Pricing
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold cursor-pointer select-none text-emerald-700 dark:text-emerald-300">
                    <input
                      type="checkbox"
                      checked={isFree}
                      onChange={(e) => {
                        setIsFree(e.target.checked);
                        if (e.target.checked) setFee("");
                      }}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 shrink-0"
                    />
                    Free Class (No Fee)
                  </label>
                </div>

                {!isFree ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    {/* Fee Amount */}
                    <div className="space-y-1">
                      <label className={`text-[11px] font-bold uppercase block ${darkMode ? "text-slate-400" : "text-slate-600"}`}>Fee Amount (LKR)</label>
                      <input
                        type="number"
                        min="1"
                        value={fee}
                        onChange={(e) => setFee(e.target.value)}
                        placeholder="e.g. 2500"
                        required={!isFree}
                        className={`w-full p-2.5 rounded-xl border-none outline-none font-medium text-xs ${darkMode ? "bg-slate-800 text-slate-200" : "bg-white text-slate-700 shadow-sm"}`}
                      />
                    </div>

                    {/* Billing Type */}
                    <div className="space-y-1">
                      <label className={`text-[11px] font-bold uppercase block ${darkMode ? "text-slate-400" : "text-slate-600"}`}>Payment Plan</label>
                      <div className="flex items-center gap-3 pt-2">
                        <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer select-none">
                          <input
                            type="radio"
                            name="billingType"
                            value="monthly"
                            checked={billingType === "monthly"}
                            onChange={() => setBillingType("monthly")}
                            className="text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                          />
                          Monthly
                        </label>
                        <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer select-none">
                          <input
                            type="radio"
                            name="billingType"
                            value="fixed_months"
                            checked={billingType === "fixed_months"}
                            onChange={() => setBillingType("fixed_months")}
                            className="text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                          />
                          Custom Months
                        </label>
                      </div>
                    </div>

                    {/* Duration in Months */}
                    {billingType === "fixed_months" && (
                      <div className="space-y-1">
                        <label className={`text-[11px] font-bold uppercase block ${darkMode ? "text-slate-400" : "text-slate-600"}`}>Duration (Months)</label>
                        <input
                          type="number"
                          min="1"
                          max="24"
                          value={durationMonths}
                          onChange={(e) => setDurationMonths(e.target.value)}
                          placeholder="e.g. 3 or 6"
                          required={billingType === "fixed_months"}
                          className={`w-full p-2.5 rounded-xl border-none outline-none font-medium text-xs ${darkMode ? "bg-slate-800 text-slate-200" : "bg-white text-slate-700 shadow-sm"}`}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 italic">
                    Students will be able to request and join this class completely free of charge.
                  </p>
                )}
              </div>

              {/* ================= NEW SECTION: BATCH LIMIT / SEATS ================= */}
              <div className="sm:col-span-3 p-3.5 rounded-2xl border bg-violet-50/40 dark:bg-violet-950/20 border-violet-200/80 dark:border-violet-800/60 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className={`text-xs font-bold uppercase flex items-center gap-1.5 ${darkMode ? "text-violet-400" : "text-violet-800"}`}>
                    <Users size={15} className="shrink-0" /> Student Capacity (Batch Limit)
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold cursor-pointer select-none text-violet-700 dark:text-violet-300">
                    <input
                      type="checkbox"
                      checked={hasBatchLimit}
                      onChange={(e) => {
                        setHasBatchLimit(e.target.checked);
                        if (!e.target.checked) setBatchLimit("");
                      }}
                      className="rounded text-violet-600 focus:ring-violet-500 w-4 h-4 shrink-0"
                    />
                    Set Seat Limit
                  </label>
                </div>

                {hasBatchLimit ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <label className={`text-[11px] font-bold uppercase block ${darkMode ? "text-slate-400" : "text-slate-600"}`}>Maximum Students Allowed</label>
                      <input
                        type="number"
                        min="1"
                        value={batchLimit}
                        onChange={(e) => setBatchLimit(e.target.value)}
                        placeholder="e.g. 50"
                        required={hasBatchLimit}
                        className={`w-full p-2.5 rounded-xl border-none outline-none font-medium text-xs ${darkMode ? "bg-slate-800 text-slate-200" : "bg-white text-slate-700 shadow-sm"}`}
                      />
                    </div>
                    <div className="flex items-end pb-1.5">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                        Once this limit is reached, new student requests will be automatically prevented.
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 italic">
                    Unlimited seats. Any registered student can send a request to join.
                  </p>
                )}
              </div>

              {/* Online Configurations */}
              {mode === "Online" ? (
                <div className="sm:col-span-3 space-y-3 p-3 rounded-xl border bg-blue-50/40 dark:bg-slate-800/40 border-blue-200 dark:border-slate-700">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className={`text-[11px] font-bold uppercase flex items-center gap-1.5 ${darkMode ? "text-blue-400" : "text-blue-700"}`}>
                      <LinkIcon size={14} className="shrink-0" /> Online Meeting Link
                    </label>
                    <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={provideLater}
                        onChange={(e) => setProvideLater(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 shrink-0"
                      />
                      Provide Later
                    </label>
                  </div>

                  {!provideLater && (
                    <div className="space-y-3">
                      <input
                        type="url"
                        value={onlineLink}
                        onChange={(e) => setOnlineLink(e.target.value)}
                        placeholder="https://zoom.us/j/... or Google Meet link"
                        required={!provideLater}
                        className={`w-full p-2.5 rounded-xl border-none outline-none font-medium text-xs ${darkMode ? "bg-slate-800 text-slate-200" : "bg-white text-slate-700 shadow-sm"}`}
                      />

                      {/* Display Type Selection */}
                      <div className="space-y-1">
                        <label className={`text-[11px] font-bold uppercase block ${darkMode ? "text-slate-400" : "text-slate-600"}`}>Link Availability Type</label>
                        <div className="flex flex-wrap gap-4">
                          <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none">
                            <input
                              type="radio"
                              name="linkDisplayMode"
                              value="immediate"
                              checked={linkDisplayMode === 'immediate'}
                              onChange={(e) => setLinkDisplayMode(e.target.value)}
                              className="text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 shrink-0"
                            />
                            Open Immediately
                          </label>
                          <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none">
                            <input
                              type="radio"
                              name="linkDisplayMode"
                              value="scheduled"
                              checked={linkDisplayMode === 'scheduled'}
                              onChange={(e) => setLinkDisplayMode(e.target.value)}
                              className="text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 shrink-0"
                            />
                            Schedule
                          </label>
                        </div>
                      </div>

                      {linkDisplayMode === 'scheduled' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                          <div>
                            <label className={`text-[11px] font-bold uppercase block mb-1 ${darkMode ? "text-slate-400" : "text-slate-600"}`}>Start Date & Time ({day})</label>
                            <input
                              type="datetime-local"
                              value={linkStartDateTime}
                              min={constraints.min}
                              onChange={(e) => handleStartDateTimeChange(e.target.value)}
                              required={!provideLater && linkDisplayMode === 'scheduled'}
                              className={`w-full p-2.5 sm:p-2 rounded-xl border-none text-xs font-medium ${darkMode ? "bg-slate-800 text-slate-200" : "bg-white text-slate-700 shadow-sm"}`}
                            />
                          </div>
                          <div>
                            <label className={`text-[11px] font-bold uppercase block mb-1 ${darkMode ? "text-slate-400" : "text-slate-600"}`}>End Date & Time ({day})</label>
                            <input
                              type="datetime-local"
                              value={linkEndDateTime}
                              min={linkStartDateTime || constraints.min}
                              onChange={(e) => handleEndDateTimeChange(e.target.value)}
                              required={!provideLater && linkDisplayMode === 'scheduled'}
                              className={`w-full p-2.5 sm:p-2 rounded-xl border-none text-xs font-medium ${darkMode ? "bg-slate-800 text-slate-200" : "bg-white text-slate-700 shadow-sm"}`}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="sm:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl border bg-orange-50/40 dark:bg-slate-800/40 border-orange-200 dark:border-slate-700">
                  <div className="space-y-1">
                    <label className={`text-[11px] font-bold uppercase flex items-center gap-1.5 ${darkMode ? "text-orange-400" : "text-orange-700"}`}>
                      <Building size={14} className="shrink-0" /> Institute Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={instituteName}
                      onChange={(e) => setInstituteName(e.target.value)}
                      placeholder="e.g. Siyapatha Education Institute"
                      className={`w-full p-2.5 rounded-xl border-none outline-none font-medium text-xs ${darkMode ? "bg-slate-800 text-slate-200" : "bg-white text-slate-700 shadow-sm"}`}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={`text-[11px] font-bold uppercase flex items-center gap-1.5 ${darkMode ? "text-orange-400" : "text-orange-700"}`}>
                      <MapPin size={14} className="shrink-0" /> Institute Address (Optional)
                    </label>
                    <input
                      type="text"
                      value={instituteAddress}
                      onChange={(e) => setInstituteAddress(e.target.value)}
                      placeholder="e.g. Main Street, Gampaha"
                      className={`w-full p-2.5 rounded-xl border-none outline-none font-medium text-xs ${darkMode ? "bg-slate-800 text-slate-200" : "bg-white text-slate-700 shadow-sm"}`}
                    />
                  </div>
                </div>
              )}

              {/* Recurring Day of the Week */}
              <div className="space-y-1 relative">
                <label className={`text-[11px] font-bold uppercase block ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Recurring Class Day</label>
                <div
                  onClick={() => setOpenDropdown(openDropdown === "day" ? null : "day")}
                  className={`w-full p-2.5 rounded-xl flex items-center justify-between cursor-pointer font-medium text-xs select-none ${darkMode ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-700"}`}
                >
                  <span className="truncate">{day}</span>
                  <ChevronDown size={14} className={`transition-transform duration-200 shrink-0 ${openDropdown === "day" ? "rotate-180" : ""}`} />
                </div>

                {openDropdown === "day" && (
                  <div className={`absolute left-0 right-0 top-full mt-1.5 max-h-52 overflow-y-auto rounded-xl shadow-xl z-30 border ${darkMode ? "bg-slate-900 border-slate-700 text-slate-200" : "bg-white border-slate-200 text-slate-700"}`}>
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((d) => (
                      <div
                        key={d}
                        onClick={() => { setDay(d); setOpenDropdown(null); }}
                        className={`p-2.5 text-xs font-medium cursor-pointer transition-colors ${darkMode ? "hover:bg-slate-800" : "hover:bg-slate-100"} ${day === d ? (darkMode ? "bg-slate-800 text-blue-400 font-bold" : "bg-slate-100 text-blue-600 font-bold") : ""}`}
                      >
                        {d}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Time Slots */}
              <div className="space-y-1 sm:col-span-2">
                <label className={`text-[11px] font-bold uppercase block ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Class Duration Time</label>
                <div className="grid grid-cols-2 gap-2.5">
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                    className={`w-full p-2.5 rounded-xl border-none outline-none font-medium text-xs ${darkMode ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-700"}`}
                  />
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                    className={`w-full p-2.5 rounded-xl border-none outline-none font-medium text-xs ${darkMode ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-700"}`}
                  />
                </div>
              </div>

              {/* Description */}
              <div className="sm:col-span-2 space-y-1">
                <label className={`text-[11px] font-bold uppercase block ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Description (Optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter a short description about this class..."
                  rows={2}
                  className={`w-full p-2.5 rounded-xl border-none outline-none font-medium text-xs resize-none ${darkMode ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-700"}`}
                ></textarea>
              </div>

              {/* Cover Photo */}
              <div className="sm:col-span-1 space-y-1">
                <label className={`text-[11px] font-bold uppercase flex items-center gap-1.5 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                  <ImageIcon size={14} className="shrink-0" /> Cover Photo
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setCoverImage(e.target.files ? e.target.files[0] : null)}
                  className={`w-full p-1.5 rounded-xl border-none outline-none font-medium text-[10px] file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer ${darkMode ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-700"}`}
                />
              </div>

              {/* Submit */}
              <div className="sm:col-span-3 flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-7 py-3 sm:py-2.5 rounded-xl font-bold text-xs transition-all shadow-md shadow-blue-600/20 disabled:opacity-70"
                >
                  {loading ? <Loader2 className="animate-spin shrink-0" size={16} /> : <Plus size={16} className="shrink-0" />}
                  <span>{loading ? "Creating..." : "Create Class"}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      </div>
    </div>
  );
}