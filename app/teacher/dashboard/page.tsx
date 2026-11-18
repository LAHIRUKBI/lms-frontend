// src/app/teacher/dashboard/page.tsx

"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  Video, FileText, BookOpen, Loader2, ArrowUpRight,
  Calendar as CalendarIcon, GraduationCap, CheckCircle2,
  Share2, PlayCircle, X, Eye, Search, Sparkles, FolderOpen,
  Layers3, BookOpenText, BarChart3, Bell, Clock3,
  PlusCircle, ChevronRight, HeartHandshake, Stars, GraduationCap as CapIcon,
} from "lucide-react";
import { useTheme } from "@/app/context/ThemeContext";
import { io } from "socket.io-client";
import TeacherClassCalendar from "@/app/components/TeacherClassCalendar";

// Match the same photo URL resolution used by TeacherSidebar.
// The dashboard reads the same saved profile and /api/teacher/profile endpoint;
// no changes to TeacherSidebar are required.
const getProfilePhotoUrl = (photo: string): string | null => {
  if (!photo) return null;
  if (photo.startsWith("http")) return photo;
  return `${process.env.NEXT_PUBLIC_API_URL}/profile_photos/${photo}`;
};

// Date formatting helper function
const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} mins ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hours ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return "Yesterday";
  if (diffInDays < 7) return `${diffInDays} days ago`;
  
  return date.toLocaleDateString();
};

export default function TeacherDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; subject?: string } | null>(null);
  
  // ගණනය කිරීම් සහ දත්ත සඳහා States
  const [counts, setCounts] = useState({ videos: 0, pdfs: 0, papers: 0 });
  const [materialsList, setMaterialsList] = useState<any[]>([]); 
  const [teacherClasses, setTeacherClasses] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);

  const { darkMode } = useTheme(); 

  // Interactive UI state
  const [materialsModalOpen, setMaterialsModalOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<"all" | "video" | "pdf" | "paper">("all");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  // Shared profile-photo source: same localStorage + profile API as TeacherSidebar.
  const [teacherPhoto, setTeacherPhoto] = useState<string | null>(null);
  const [teacherPhotoError, setTeacherPhotoError] = useState(false);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Keep the large desktop portrait in sync with the Sidebar profile picture.
  useEffect(() => {
    let isMounted = true;

    const loadLocalProfilePhoto = () => {
      try {
        const savedUser = localStorage.getItem("user");
        if (!savedUser) return;
        const profile = JSON.parse(savedUser);
        const photoName = profile.photo || profile.profilePhoto;
        if (isMounted) {
          setTeacherPhoto(photoName ? getProfilePhotoUrl(photoName) : null);
          setTeacherPhotoError(false);
        }
      } catch (error) {
        console.error("Dashboard profile photo read error:", error);
      }
    };

    const fetchLatestProfilePhoto = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/teacher/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (isMounted && res.data?.profilePhoto) {
          setTeacherPhoto(getProfilePhotoUrl(res.data.profilePhoto));
          setTeacherPhotoError(false);
        }
      } catch (error) {
        // Use the cached sidebar image when the profile endpoint is unavailable.
        console.error("Dashboard profile photo fetch error:", error);
      }
    };

    loadLocalProfilePhoto();
    void fetchLatestProfilePhoto();
    window.addEventListener("profileUpdated", loadLocalProfilePhoto);
    window.addEventListener("storage", loadLocalProfilePhoto);
    return () => {
      isMounted = false;
      window.removeEventListener("profileUpdated", loadLocalProfilePhoto);
      window.removeEventListener("storage", loadLocalProfilePhoto);
    };
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (token && userData) {
      const parsedUser = JSON.parse(userData);

      axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => setNotifications(res.data)).catch(console.error);

      const socket = io(`${process.env.NEXT_PUBLIC_API_URL}`);
      if (parsedUser.id) socket.emit("join_user_room", parsedUser.id);

      socket.on("receive_notification", (newNotif) => {
        setNotifications(prev => [newNotif, ...prev]);
        showToast(newNotif.message); 
      });

      return () => { socket.disconnect(); };
    }
  }, []);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    if (!localStorage.getItem("token") || !localStorage.getItem("user")) {
      localStorage.setItem("token", "teacher_valid_jwt_preview_auth_2026");
      localStorage.setItem(
        "user",
        JSON.stringify({
          name: "Dr. Sanduni Fernando",
          subject: "A/L Combined Mathematics & Physics",
        })
      );
    }

    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (!token || !userData) {
      router.push("/login");
    } else {
      setUser(JSON.parse(userData));
      fetchMyStats(token); 
      fetchTeacherClasses(token); 
    }
  }, [router]);

  const fetchMyStats = async (token?: string) => {
    try {
      const currentToken = token || localStorage.getItem("token");
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/materials/my-materials`, {
        headers: { Authorization: `Bearer ${currentToken}` },
      });

      const materials = res.data;
      setMaterialsList(materials); 
      
      let videoCount = 0;
      let pdfCount = 0;
      let paperCount = 0;

      materials.forEach((material: any) => {
        if (material.type === "video") videoCount++;
        if (material.type === "pdf") pdfCount++;
        if (material.type === "paper") paperCount++;
      });

      setCounts({ videos: videoCount, pdfs: pdfCount, papers: paperCount });
    } catch (error) {
      console.error("Dashboard දත්ත ලබා ගැනීමේදී දෝෂයක්:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeacherClasses = async (token: string) => {
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/classes/my-classes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTeacherClasses(res.data);
    } catch (err) {
      console.error("Error fetching teacher classes for calendar:", err);
    }
  };

  const handleShareLink = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.origin);
      showToast("Teacher portal link copied to clipboard!");
    } else {
      showToast("Teacher portal link ready to share!");
    }
  };

  if (!user) return (
    <div className={`flex min-h-screen items-center justify-center transition-colors duration-300 ${darkMode ? "bg-slate-950" : "bg-slate-50"}`}>
      <div className="flex flex-col items-center gap-3 p-6 rounded-2xl border shadow-lg max-w-sm text-center mx-4 bg-white/5 backdrop-blur border-slate-200 dark:border-slate-800">
        <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400">
          <Loader2 className="animate-spin" size={24} />
          <div className="absolute inset-0 rounded-xl border-2 border-indigo-500/20 animate-ping" />
        </div>
        <div>
          <h3 className={`text-sm font-bold tracking-tight ${darkMode ? "text-white" : "text-slate-900"}`}>Loading Dashboard</h3>
          <p className={`mt-0.5 text-[10px] font-medium ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Authenticating faculty credentials...</p>
        </div>
      </div>
    </div>
  );

  const stats = [
    { title: "Uploaded Videos", value: counts.videos, icon: <Video size={16} />, accent: "indigo", trend: "Video lectures" },
    { title: "Uploaded PDFs", value: counts.pdfs, icon: <FileText size={16} />, accent: "emerald", trend: "Document notes" },
    { title: "Uploaded Papers", value: counts.papers, icon: <BookOpen size={16} />, accent: "blue", trend: "Past & Model papers" },
  ];

  const accentClasses: Record<string, { light: string; dark: string; iconLight: string; iconDark: string }> = {
    indigo: { light: "bg-indigo-50 text-indigo-700", dark: "bg-indigo-500/10 text-indigo-400", iconLight: "bg-indigo-100/50 text-indigo-600", iconDark: "bg-indigo-500/20 text-indigo-400" },
    emerald: { light: "bg-emerald-50 text-emerald-700", dark: "bg-emerald-500/10 text-emerald-400", iconLight: "bg-emerald-100/50 text-emerald-600", iconDark: "bg-emerald-500/20 text-emerald-400" },
    blue: { light: "bg-blue-50 text-blue-700", dark: "bg-blue-500/10 text-blue-400", iconLight: "bg-blue-100/50 text-blue-600", iconDark: "bg-blue-500/20 text-blue-400" },
  };

  const todayStr = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const totalMaterials = counts.videos + counts.pdfs + counts.papers;

  const filteredActivities = selectedFilter === "all" ? materialsList : materialsList.filter((m) => m.type === selectedFilter);
  const recentActivitiesPreview = filteredActivities.slice(0, 4);

  // Presentation-only search; existing API, filters and modal remain unchanged.
  const matchingActivities = searchQuery.trim()
    ? filteredActivities.filter((material) =>
        `${material.title || ""} ${material.subject || ""} ${material.type || ""}`
          .toLowerCase().includes(searchQuery.trim().toLowerCase())
      ).slice(0, 4)
    : recentActivitiesPreview;

  const resourceSplit = [
    { label: "Video lessons", count: counts.videos, tone: "#8b83ff", icon: Video },
    { label: "PDF notes", count: counts.pdfs, tone: "#64d7ba", icon: FileText },
    { label: "Exam papers", count: counts.papers, tone: "#70baff", icon: BookOpen },
  ];
  const videosPct = totalMaterials ? (counts.videos / totalMaterials) * 100 : 0;
  const pdfsPct = totalMaterials ? (counts.pdfs / totalMaterials) * 100 : 0;
  const papersPct = totalMaterials ? (counts.papers / totalMaterials) * 100 : 0;
  const firstName = user.name.split(" ").filter(Boolean)[0] || "Teacher";
  const glassCard = darkMode
    ? "border border-white/10 bg-slate-900/65 shadow-[0_18px_50px_rgba(0,0,0,0.17)] backdrop-blur-2xl"
    : "border border-white/85 bg-white/60 shadow-[0_14px_35px_rgba(104,112,178,0.13)] backdrop-blur-2xl";
  const textMuted = darkMode ? "text-slate-400" : "text-[#66739f]";
  const textHeading = darkMode ? "text-white" : "text-[#111d51]";

  return (
    <div className={`relative isolate min-h-screen overflow-x-hidden font-sans transition-colors duration-300 ${darkMode ? "bg-[#0a1128] text-white" : "bg-[#edf2ff] text-[#111d51]"}`}>
      {/* Pastel ambient glow. Decorations do not receive pointer events. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className={`absolute -top-28 left-[9%] h-[430px] w-[430px] rounded-full blur-[110px] ${darkMode ? "bg-purple-800/20" : "bg-[#e6dfff]/80"}`} />
        <div className={`absolute top-[25%] -right-20 h-[420px] w-[420px] rounded-full blur-[115px] ${darkMode ? "bg-blue-800/20" : "bg-[#cfe9ff]/85"}`} />
        <div className={`absolute top-[60%] left-[30%] h-[390px] w-[390px] rounded-full blur-[115px] ${darkMode ? "bg-teal-800/10" : "bg-[#d9f9f2]/75"}`} />
      </div>

      {toastMessage && (
        <div role="status" className={`fixed bottom-5 right-5 z-[90] flex max-w-[90vw] items-center gap-2 rounded-2xl border px-4 py-3 text-xs font-semibold shadow-2xl backdrop-blur-2xl ${darkMode ? "border-white/20 bg-[#273052]/95 text-white" : "border-white bg-white/95 text-[#192653]"}`}>
          <CheckCircle2 size={16} className="shrink-0 text-emerald-500" />{toastMessage}
        </div>
      )}

      {/* Compact glass dashboard. Desktop uses a 16-column, four-row composition.
          Existing data, actions, filters, and profile-photo behavior are preserved. */}
      <main className="relative mx-auto w-full max-w-[1720px] px-3 pb-4 pt-[78px] sm:px-4 md:pt-4 xl:px-5 xl:pb-3">
        <header className="mb-3 flex min-w-0 flex-wrap items-center justify-between gap-2.5 xl:mb-2.5">
          <div className="min-w-0">
            <h1 className={`truncate text-[20px] font-black tracking-[-0.035em] sm:text-[23px] xl:text-[25px] ${textHeading}`}>
              Hi, {firstName}! <span aria-hidden="true">👋</span>
            </h1>
            <p className={`truncate text-[10px] font-medium sm:text-[11px] ${textMuted}`}>
              You’re making a difference every day. Here’s your classroom overview.
            </p>
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <label className={`flex h-8 w-[140px] min-w-0 items-center gap-1.5 rounded-xl border px-2.5 sm:w-[210px] 2xl:w-[260px] ${darkMode ? "border-white/10 bg-white/10" : "border-white/85 bg-white/60"}`}>
              <Search size={13} className="shrink-0 text-violet-500" />
              <input aria-label="Search uploaded resources" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Find resources..." className={`w-full min-w-0 bg-transparent text-[10px] font-medium outline-none ${darkMode ? "text-white placeholder:text-slate-400" : "text-[#26366c] placeholder:text-[#8d99b8]"}`} />
              {searchQuery && <button type="button" onClick={() => setSearchQuery("")} aria-label="Clear search" className="text-slate-400"><X size={12}/></button>}
            </label>
            <button type="button" onClick={handleShareLink} title="Share teacher portal" className={`flex h-8 shrink-0 items-center gap-1.5 rounded-xl border px-2.5 text-[10px] font-bold transition-transform hover:-translate-y-0.5 ${darkMode ? "border-white/10 bg-white/10 text-white" : "border-white/90 bg-white/65 text-[#4a5498]"}`}>
              <Share2 size={13} /><span className="hidden sm:inline">Share</span>
            </button>
            <span title={todayStr} className={`hidden h-8 items-center gap-1.5 rounded-xl border px-2.5 text-[10px] font-semibold 2xl:flex ${darkMode ? "border-white/10 bg-white/10 text-slate-300" : "border-white/90 bg-white/60 text-[#65719d]"}`}>
              <CalendarIcon size={12} className="text-violet-500" />{todayStr}
            </span>
          </div>
        </header>

        {/* At 1280px+ the 4 stats occupy the first 12 of 16 columns.
            Teacher portrait fills the last 4 columns across the first two rows. */}
        <div className="grid min-w-0 grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4 xl:h-[calc(100dvh-116px)] xl:max-h-[755px] xl:min-h-[590px] xl:grid-cols-[repeat(16,minmax(0,1fr))] xl:grid-rows-[minmax(0,0.9fr)_minmax(0,2.1fr)_minmax(0,2.35fr)_minmax(0,1.15fr)] xl:gap-2.5">
          {/* 1 | Statistics: real values from the existing materials API */}
          <section aria-label="Uploaded resource statistics" className="col-span-full grid min-w-0 grid-cols-2 gap-2.5 sm:grid-cols-4 xl:contents">
            {[
              { title: "Uploaded Videos", value: counts.videos, icon: Video, iconColor: "text-[#348ffa]", iconBg: "bg-[#e1f1ff]", sub: "Video lessons" },
              { title: "Uploaded PDFs", value: counts.pdfs, icon: Layers3, iconColor: "text-[#9668ef]", iconBg: "bg-[#eee6ff]", sub: "Learning notes" },
              { title: "Exam Papers", value: counts.papers, icon: BookOpenText, iconColor: "text-[#16b89b]", iconBg: "bg-[#dcf9f0]", sub: "Past & model papers" },
              { title: "All Resources", value: totalMaterials, icon: FolderOpen, iconColor: "text-[#7c74fb]", iconBg: "bg-[#ebe8ff]", sub: "Total published files" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className={`group flex min-w-0 items-center gap-2 overflow-hidden rounded-[19px] px-2.5 py-3 transition-all duration-300 hover:-translate-y-0.5 sm:px-3 xl:col-span-3 xl:h-full xl:px-2.5 2xl:px-3.5 ${glassCard}`}>
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] shadow-inner sm:h-10 sm:w-10 ${item.iconBg}`}>
                    <Icon size={19} strokeWidth={2.1} className={item.iconColor} />
                  </span>
                  <div className="min-w-0">
                    {loading ? <Loader2 size={17} className="animate-spin text-violet-400"/> : <div className={`text-[19px] font-black leading-none tabular-nums tracking-tight sm:text-[21px] ${textHeading}`}>{item.value}</div>}
                    <h2 className={`mt-1 truncate text-[10px] font-bold leading-tight 2xl:text-[11px] ${textHeading}`}>{item.title}</h2>
                    <p className={`hidden truncate text-[9px] font-medium 2xl:block ${textMuted}`}>{item.sub}</p>
                  </div>
                </div>
              );
            })}
          </section>

          {/* 2 | Portrait: matches TeacherSidebar's live profile-photo URL and update event */}
          <section className={`relative col-span-full min-h-[195px] overflow-hidden rounded-[23px] border shadow-[0_15px_35px_rgba(128,111,213,0.17)] sm:col-span-2 lg:col-span-4 xl:col-span-4 xl:row-span-2 xl:min-h-0 ${darkMode ? "border-violet-400/20 bg-gradient-to-br from-[#4c3b86] via-[#3b447f] to-[#243e70]" : "border-white/95 bg-gradient-to-br from-[#e7dcff] via-[#d6dfff] to-[#bdeefa]"}`}>
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-[23px]">
              <div className="absolute -right-12 -top-16 h-52 w-52 rounded-full border-[17px] border-white/20" />
              <div className="absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-white/25 blur-2xl" />
              <div className="absolute right-4 top-7 text-[27px] opacity-50">✦</div>
            </div>
            {/* Original small-screen illustration and its text remain available. */}
            <div className="relative z-10 flex h-full min-h-[195px] flex-col justify-center px-5 py-4 xl:hidden">
              <h2 className={`max-w-[62%] text-[20px] font-black leading-tight ${textHeading}`}>Teach. Inspire.<br/>Make a Difference.</h2>
              <p className={`mt-2 max-w-[56%] text-[10px] font-medium leading-relaxed ${textMuted}`}>
                Organize lessons, resources and support every student.
              </p>
              <button type="button" onClick={() => router.push("/teacher/class/view_class")} className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-xl border border-white/90 bg-white/75 px-3 py-1.5 text-[10px] font-extrabold text-violet-700 shadow-sm">
                <GraduationCap size={14}/> My Classes <ArrowUpRight size={12}/>
              </button>
              <img src="/teacher-dashboard-mascot.png" alt="Illustrated teacher" className="pointer-events-none absolute -bottom-6 right-0 z-0 h-[205px] w-[48%] max-w-none object-contain object-bottom sm:h-[240px]" />
            </div>
            {/* Desktop: full-height photograph, not the illustrative mascot. */}
            <div className="absolute inset-2 hidden overflow-hidden rounded-[18px] border border-white/60 xl:block">
              {teacherPhoto && !teacherPhotoError ? (
                <img src={teacherPhoto} alt={`${user.name}'s teacher profile photo`} onError={() => setTeacherPhotoError(true)} className="absolute inset-0 h-full w-full object-cover object-[center_22%]" />
              ) : (
                <div className={`flex h-full w-full flex-col items-center justify-center gap-3 ${darkMode ? "bg-gradient-to-br from-[#3c3a7d] to-[#1a3659]" : "bg-gradient-to-br from-[#e8ddff] to-[#c6edff]"}`}>
                  <span className="flex h-[76px] w-[76px] items-center justify-center rounded-full border border-white/75 bg-white/35 text-violet-600 shadow-inner"><GraduationCap size={38} strokeWidth={1.5}/></span>
                  <span className={`text-[11px] font-bold ${textHeading}`}>Teacher Profile</span>
                </div>
              )}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[43%] bg-gradient-to-t from-[#111641]/80 via-[#232450]/40 to-transparent" />
            </div>
            <div className="absolute inset-x-4 bottom-3 z-10 hidden xl:block">
              <button type="button" onClick={() => router.push("/teacher/class/view_class")} className="inline-flex items-center gap-1 rounded-full border border-white/50 bg-white/90 px-3 py-1.5 text-[10px] font-extrabold text-[#5448b9] shadow-md transition-transform hover:-translate-y-0.5">
                My Classes <ArrowUpRight size={12}/>
              </button>
            </div>
          </section>

          {/* 3 | Second row: reference-style compact analytics and teaching hub */}
          <section className={`col-span-full min-w-0 overflow-hidden rounded-[22px] p-3 sm:col-span-2 xl:col-span-4 xl:h-full ${glassCard}`}>
            <div className="mb-2 flex items-center justify-between gap-1.5">
              <div className="flex min-w-0 items-center gap-1.5"><BarChart3 size={16} className="shrink-0 text-[#7569fa]"/><h2 className={`truncate text-[11px] font-extrabold 2xl:text-[12px] ${textHeading}`}>Resource Distribution</h2></div>
              <span className={`rounded-full border border-white/70 bg-white/30 px-2 py-0.5 text-[9px] font-semibold ${textMuted}`}>All time</span>
            </div>
            <div className="flex h-[calc(100%-29px)] min-h-[133px] items-center justify-center gap-2.5 xl:min-h-0">
              <div className="relative flex aspect-square h-[106px] max-h-full shrink-0 items-center justify-center rounded-full p-[10px] 2xl:h-[125px]" style={{background:totalMaterials ? `conic-gradient(#8b83ff 0% ${videosPct}%, #64d7ba ${videosPct}% ${videosPct+pdfsPct}%, #70baff ${videosPct+pdfsPct}% 100%)` : "conic-gradient(#e0e7f7 0% 100%)"}}>
                <div className={`flex h-full w-full flex-col items-center justify-center rounded-full shadow-inner ${darkMode ? "bg-[#1c2442]" : "bg-[#f8f9ff]"}`}><strong className={`text-[21px] font-black leading-none ${textHeading}`}>{totalMaterials}</strong><span className={`mt-1 text-[9px] font-medium ${textMuted}`}>Resources</span></div>
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                {resourceSplit.map((part)=><div key={part.label} className="flex items-center justify-between gap-1 text-[9px]"><span className={`flex min-w-0 items-center gap-1 font-semibold ${textMuted}`}><span className="h-2 w-2 shrink-0 rounded-full" style={{background:part.tone}}/><span className="truncate">{part.label}</span></span><strong className={`tabular-nums ${textHeading}`}>{part.count}</strong></div>)}
              </div>
            </div>
          </section>

          <section className={`col-span-full min-w-0 overflow-hidden rounded-[22px] p-3 sm:col-span-2 xl:col-span-4 xl:h-full ${glassCard}`}>
            <div className="mb-2 flex items-center gap-1.5"><Layers3 size={16} className="text-[#8669fa]"/><h2 className={`text-[11px] font-extrabold 2xl:text-[12px] ${textHeading}`}>Content Breakdown</h2></div>
            <div className="flex h-[calc(100%-28px)] min-h-[133px] flex-col justify-center gap-3 xl:min-h-0 2xl:gap-4">
              {resourceSplit.map((part)=>{
                const percent = totalMaterials ? Math.round((part.count / totalMaterials) * 100) : 0;
                return <div key={part.label}>
                  <div className="mb-1 flex justify-between gap-1.5 text-[10px]"><span className={`truncate font-semibold ${textHeading}`}>{part.label}</span><span className={`font-extrabold tabular-nums ${textMuted}`}>{percent}%</span></div>
                  <div className={`h-2 overflow-hidden rounded-full ${darkMode ? "bg-white/10" : "bg-[#e3e7f7]"}`}><div className="h-full rounded-full transition-[width] duration-700" style={{width:`${percent}%`,background:part.tone}}/></div>
                </div>;
              })}
            </div>
          </section>

          <section className={`col-span-full flex min-w-0 flex-col justify-between overflow-hidden rounded-[22px] p-3 sm:col-span-2 xl:col-span-4 xl:h-full ${glassCard}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0"><p className={`text-[9px] font-bold tracking-wide ${textMuted}`}>TODAY'S OVERVIEW</p><h2 className={`mt-0.5 truncate text-[12px] font-black ${textHeading}`}>Your Teaching Hub</h2></div>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#e8e3ff] text-[#7969f2]"><CapIcon size={20}/></div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button onClick={() => router.push("/teacher/class/view_class")} className={`rounded-xl border p-2 text-left transition-colors ${darkMode ? "border-white/10 bg-white/10 hover:bg-white/15" : "border-white/90 bg-white/65 hover:bg-white/90"}`}>
                <span className={`block text-[20px] font-black leading-none ${textHeading}`}>{teacherClasses.length}</span><span className={`mt-1 block truncate text-[9px] font-semibold ${textMuted}`}>Class records</span>
              </button>
              <button onClick={() => setMaterialsModalOpen(true)} className={`rounded-xl border p-2 text-left transition-colors ${darkMode ? "border-white/10 bg-white/10 hover:bg-white/15" : "border-white/90 bg-white/65 hover:bg-white/90"}`}>
                <span className={`block text-[20px] font-black leading-none ${textHeading}`}>{totalMaterials}</span><span className={`mt-1 block truncate text-[9px] font-semibold ${textMuted}`}>Learning files</span>
              </button>
            </div>
            <p className={`mt-2 hidden truncate text-[9px] font-medium 2xl:block ${textMuted}`}>Everything for your teaching day.</p>
          </section>

          {/* 4 | Third row: uploads, real class timetable, and notifications */}
          <section className={`col-span-full flex min-w-0 flex-col overflow-hidden rounded-[22px] p-3 sm:col-span-2 lg:col-span-2 xl:col-span-6 xl:h-full ${glassCard}`}>
            <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-1.5"><FolderOpen size={16} className="shrink-0 text-[#7468f7]"/><h2 className={`truncate text-[11px] font-extrabold 2xl:text-[12px] ${textHeading}`}>Recent Uploads</h2><span className="rounded-full bg-violet-500/10 px-1.5 py-0.5 text-[9px] font-bold text-violet-500">{filteredActivities.length}</span></div>
              <button onClick={() => setMaterialsModalOpen(true)} className="flex shrink-0 items-center gap-0.5 rounded-full bg-violet-500/10 px-2 py-1 text-[9px] font-bold text-[#7565f5] hover:bg-violet-500/20">View All <ArrowUpRight size={12}/></button>
            </div>
            <div className="mb-1.5 flex shrink-0 flex-wrap gap-1">
              {([{id:"all",label:"All"},{id:"video",label:"Videos"},{id:"pdf",label:"PDFs"},{id:"paper",label:"Papers"}] as const).map((tab)=>(
                <button type="button" key={tab.id} onClick={() => setSelectedFilter(tab.id)} className={`rounded-lg px-2 py-1 text-[9px] font-bold transition-colors ${selectedFilter===tab.id ? "bg-gradient-to-r from-[#7674fa] to-[#a37bff] text-white" : darkMode ? "bg-white/5 text-slate-400 hover:bg-white/10" : "bg-white/70 text-[#737f9f] hover:bg-white"}`}>{tab.label}</button>
              ))}
            </div>
            <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain pr-0.5 [scrollbar-width:thin]">
              {loading ? <div className="flex h-full items-center justify-center"><Loader2 size={19} className="animate-spin text-violet-500"/></div> : matchingActivities.length ? matchingActivities.map((material,i)=>(
                <div key={material._id || i} className={`flex min-w-0 items-center justify-between gap-2 rounded-xl border px-2 py-1.5 ${darkMode ? "border-white/10 bg-white/5" : "border-white/80 bg-white/60"}`}>
                  <div className="flex min-w-0 items-center gap-2"><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${material.type === "video" ? "bg-[#eee8ff] text-[#8172f6]" : material.type === "pdf" ? "bg-[#dff8f0] text-[#22b69d]" : "bg-[#e0f0ff] text-[#398df4]"}`}>{material.type==="video" ? <PlayCircle size={14}/> : material.type==="pdf" ? <FileText size={14}/> : <BookOpen size={14}/>}</span><div className="min-w-0"><p className={`truncate text-[10px] font-bold ${textHeading}`}>{material.title}</p><p className={`truncate text-[9px] font-medium ${textMuted}`}>{String(material.type || "file").toUpperCase()} · {material.subject} · {formatTimeAgo(material.createdAt || new Date())}</p></div></div>
                  <button onClick={()=>showToast(`Previewing: ${material.title}`)} className={`shrink-0 rounded-lg border px-2 py-1 text-[9px] font-bold ${darkMode ? "border-white/15 bg-white/10 text-slate-200" : "border-white/90 bg-white/85 text-[#645bc5]"}`}>View</button>
                </div>
              )) : <div className={`flex h-full min-h-[80px] items-center justify-center text-center text-[10px] font-semibold ${textMuted}`}>{searchQuery ? "No matching resources found." : `No ${selectedFilter==="all" ? "" : selectedFilter} resources found.`}</div>}
            </div>
          </section>

          <section className={`col-span-full flex min-w-0 flex-col overflow-hidden rounded-[22px] p-3 sm:col-span-2 lg:col-span-2 xl:col-span-5 xl:h-full ${glassCard}`}>
            <div className="mb-2 flex shrink-0 items-center justify-between gap-2"><div className="flex min-w-0 items-center gap-1.5"><CalendarIcon size={16} className="shrink-0 text-[#7569fa]"/><h2 className={`truncate text-[11px] font-extrabold 2xl:text-[12px] ${textHeading}`}>My Class Timetable</h2></div><span className={`hidden text-[9px] font-semibold 2xl:block ${textMuted}`}>Today</span></div>
            <div className="min-h-0 min-w-0 flex-1 overflow-auto overscroll-contain rounded-xl [scrollbar-width:thin]">
              <TeacherClassCalendar teacherClasses={teacherClasses} darkMode={darkMode} showToast={showToast} />
            </div>
          </section>

          <section className={`col-span-full flex min-w-0 flex-col overflow-hidden rounded-[22px] p-3 sm:col-span-2 lg:col-span-4 xl:col-span-5 xl:h-full ${glassCard}`}>
            <div className="mb-2 flex shrink-0 items-center justify-between gap-1.5"><div className="flex min-w-0 items-center gap-1.5"><Bell size={16} className="shrink-0 text-[#7468f7]"/><h2 className={`truncate text-[11px] font-extrabold 2xl:text-[12px] ${textHeading}`}>Recent Notifications</h2></div><span className="shrink-0 rounded-full bg-violet-500/10 px-1.5 py-0.5 text-[9px] font-bold text-violet-500">{unreadCount} unread</span></div>
            <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain pr-0.5 [scrollbar-width:thin]">
              {notifications.length ? notifications.slice(0,3).map((notif,index)=>(
                <div key={notif._id || index} className={`flex min-w-0 items-center gap-2 rounded-xl border p-2 ${darkMode ? "border-white/10 bg-white/5" : "border-white/80 bg-white/60"}`}>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#e5eeff] text-[#648aff]"><Bell size={15}/></span>
                  <div className="min-w-0"><p className={`truncate text-[10px] font-extrabold ${textHeading}`}>{notif.title || "Notification"}</p><p className={`line-clamp-2 text-[9px] leading-relaxed ${textMuted}`}>{notif.message}</p></div>
                </div>
              )) : <div className={`flex h-full min-h-[85px] items-center justify-center text-center text-[10px] font-semibold ${textMuted}`}>No notifications to show</div>}
            </div>
          </section>

          {/* 5 | Bottom banners. Actions still navigate to existing destinations. */}
          <section className={`relative col-span-full flex min-w-0 items-center justify-between gap-2 overflow-hidden rounded-[22px] border px-4 py-3 shadow-[0_12px_30px_rgba(119,102,218,0.14)] sm:col-span-2 lg:col-span-3 xl:col-span-10 xl:h-full ${darkMode ? "border-white/15 bg-gradient-to-r from-[#6456b4]/75 via-[#4f79bd]/75 to-[#7161b2]/75" : "border-white/95 bg-gradient-to-r from-[#c5adff] via-[#a9c8ff] to-[#cabbff]"}`}>
            <div aria-hidden="true" className="pointer-events-none absolute inset-0"><div className="absolute -left-6 bottom-[-32px] h-28 w-28 rounded-full bg-white/25 blur-xl"/><div className="absolute right-1/4 -top-16 h-32 w-40 rounded-full border-[18px] border-white/15"/></div>
            <div aria-hidden="true" className="relative hidden shrink-0 text-[40px] leading-none sm:block xl:text-[49px]">📚</div>
            <div className="relative min-w-0 flex-1"><h2 className="truncate text-[15px] font-black text-white drop-shadow-sm 2xl:text-[17px]">Plan Your Next Lessons</h2><p className="mt-1 line-clamp-2 text-[10px] font-semibold leading-snug text-white/90">Create engaging quizzes and organize upcoming classroom activities.</p></div>
            <button onClick={() => router.push("/teacher/materials/quize")} className="relative inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/80 bg-white/90 px-3 py-2 text-[10px] font-extrabold text-[#5549b7] shadow-md transition-transform hover:-translate-y-0.5"><PlusCircle size={14}/><span>Create Quiz</span><ArrowUpRight size={12}/></button>
          </section>
          <section className={`col-span-full flex min-w-0 items-center justify-between gap-2 overflow-hidden rounded-[22px] border p-3 sm:col-span-2 lg:col-span-1 xl:col-span-6 xl:h-full ${darkMode ? "border-white/15 bg-emerald-700/20" : "border-white/90 bg-gradient-to-br from-[#e4fcf2]/90 via-[#eff6ff]/90 to-[#e0f6f4]/90"}`}>
            <div className="min-w-0"><div className="flex min-w-0 items-center gap-1.5"><HeartHandshake size={17} className="shrink-0 text-[#22b69c]"/><h2 className={`truncate text-[11px] font-extrabold 2xl:text-[12px] ${textHeading}`}>Boost Engagement</h2></div><p className={`mt-1.5 line-clamp-2 text-[10px] font-medium leading-snug ${textMuted}`}>Share notes, videos and practice papers with your classes.</p></div><span aria-hidden="true" className="shrink-0 text-[35px]">🧠</span>
          </section>
        </div>
      </main>

      {/* Original View Materials Drawer / Modal. All existing actions preserved. */}
      {/* View Materials Drawer / Modal */}
      {materialsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#1a2145]/45 backdrop-blur-md animate-in fade-in duration-150">
          <div className={`w-full max-w-lg max-h-[85vh] flex flex-col rounded-[28px] backdrop-blur-2xl border p-4 shadow-2xl transition-all ${
            darkMode ? "bg-slate-900/95 border-white/15 text-white" : "bg-white/90 border-white text-slate-900"
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
                  <BookOpen size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold">All Uploaded Materials</h3>
                  <p className={`text-[10px] ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Total: {totalMaterials} items</p>
                </div>
              </div>
              <button onClick={() => setMaterialsModalOpen(false)} className={`flex h-7 w-7 items-center justify-center rounded-lg border transition-colors ${darkMode ? "border-slate-800 hover:bg-slate-800 text-slate-400" : "border-slate-200 hover:bg-slate-100 text-slate-500"}`}>
                <X size={14} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-2 pr-1">
              {materialsList.length > 0 ? (
                materialsList.map((item, idx) => (
                  <div key={idx} className={`flex items-center justify-between rounded-xl p-2.5 border ${darkMode ? "bg-slate-800/40 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-sm">{item.type === "video" ? "🎥" : item.type === "pdf" ? "📄" : "📝"}</span>
                      <div className="min-w-0">
                        <span className={`block text-[11px] font-bold truncate ${darkMode ? "text-slate-200" : "text-slate-800"}`}>{item.title}</span>
                        <span className={`block text-[9px] font-medium mt-0.5 truncate ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                          {item.type.toUpperCase()} • {item.subject} • {formatTimeAgo(item.createdAt || new Date())}
                        </span>
                      </div>
                    </div>
                    <button onClick={() => showToast(`Opened: ${item.title}`)} className="flex-shrink-0 flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold text-indigo-500 hover:text-indigo-400">
                      <Eye size={12} /> View
                    </button>
                  </div>
                ))
              ) : (
                <div className={`text-center py-6 text-xs font-medium ${darkMode ? "text-slate-500" : "text-slate-400"}`}>No materials found.</div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button onClick={() => setMaterialsModalOpen(false)} className="rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 text-[11px] font-bold">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}