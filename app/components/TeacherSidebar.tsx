"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import axios from "axios";
import { io } from "socket.io-client";
import {
  Home,
  Video,
  FileText,
  GraduationCap,
  Sun,
  Moon,
  Film,
  FileStack,
  Bell,
  Trash2,
  X,
  ChevronsLeft,
  ChevronsRight,
  Settings,
  User,
  LogOut,
  ClipboardList,
  FileQuestion, 
  BookOpenCheck, 
  PlusCircle, 
  Eye, 
  Award,
  Menu
} from "lucide-react";
import { useTheme } from "@/app/context/ThemeContext";

// Cloudinary URL හෝ Local URL එක නිවැරදිව ලබා දෙන Helper ශ්‍රිතය
const getProfilePhotoUrl = (photo: string) => {
  if (!photo) return null;
  if (photo.startsWith("http")) return photo;
  return `${process.env.NEXT_PUBLIC_API_URL}/profile_photos/${photo}`;
};

export default function TeacherSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { darkMode, toggleDarkMode } = useTheme();

  const [teacherName, setTeacherName] = useState("LMS Teacher");
  const [teacherPhoto, setTeacherPhoto] = useState<string | null>(null);

  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // --- Notice State ---
  const [unreadNoticeCount, setUnreadNoticeCount] = useState(0);

  // --- Collapsible & Mobile Drawer State ---
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const notifDropdownRef = useRef<HTMLDivElement>(null);
  const mobileNotifRef = useRef<HTMLDivElement>(null);

  // Close notification dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedInsideDesktop = notifDropdownRef.current && notifDropdownRef.current.contains(target);
      const clickedInsideMobile = mobileNotifRef.current && mobileNotifRef.current.contains(target);

      if (!clickedInsideDesktop && !clickedInsideMobile) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Function to fetch notifications manually
  const fetchNotifications = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(res.data);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  // Function to fetch teacher notices count for the red dot indicator
  const fetchTeacherNoticesCount = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/teacher/notices`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const unread = res.data.filter((n: any) => !n.isRead).length;
      setUnreadNoticeCount(unread);
    } catch (err) {
      // Prevent console error if endpoint differs
    }
  };

  useEffect(() => {
    const loadUserDataLocally = () => {
      const userData = localStorage.getItem("user");
      if (userData) {
        const parsedUser = JSON.parse(userData);
        if (parsedUser.name) setTeacherName(parsedUser.name);

        const photoName = parsedUser.photo || parsedUser.profilePhoto;
        if (photoName) {
          setTeacherPhoto(getProfilePhotoUrl(photoName));
        }
      }
    };

    const fetchLatestProfile = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/teacher/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = res.data;
        if (data.name) setTeacherName(data.name);

        if (data.profilePhoto) {
          setTeacherPhoto(getProfilePhotoUrl(data.profilePhoto));
          const userData = localStorage.getItem("user");
          if (userData) {
            const parsedUser = JSON.parse(userData);
            parsedUser.profilePhoto = data.profilePhoto;
            parsedUser.photo = data.profilePhoto;
            localStorage.setItem("user", JSON.stringify(parsedUser));
          }
        }
      } catch (error) {
        console.error("Sidebar profile fetch error:", error);
      }
    };

    const setupSocket = () => {
      const token = localStorage.getItem("token");
      const userData = localStorage.getItem("user");

      if (token && userData) {
        const parsedUser = JSON.parse(userData);
        const socket = io(`${process.env.NEXT_PUBLIC_API_URL}`);

        if (parsedUser.id || parsedUser._id) {
          socket.emit("join_user_room", parsedUser.id || parsedUser._id);
        }

        socket.on("receive_notification", (newNotif) => {
          setNotifications((prev) => {
            if (prev.some((n) => n._id === newNotif._id)) return prev;
            return [newNotif, ...prev];
          });
        });

        return () => {
          socket.disconnect();
        };
      }
      return () => {};
    };

    loadUserDataLocally();
    fetchLatestProfile();

    fetchNotifications();
    fetchTeacherNoticesCount();

    const cleanupSocket = setupSocket();

    const interval = setInterval(() => {
      fetchNotifications();
      fetchTeacherNoticesCount();
    }, 10000);

    window.addEventListener("profileUpdated", loadUserDataLocally);

    return () => {
      window.removeEventListener("profileUpdated", loadUserDataLocally);
      cleanupSocket();
      clearInterval(interval);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  const handleOpenNotifications = async () => {
    setIsNotifOpen(!isNotifOpen);

    if (!isNotifOpen && unreadCount > 0) {
      try {
        const token = localStorage.getItem("token");
        await axios.put(
          `${process.env.NEXT_PUBLIC_API_URL}/api/notifications/mark-read`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        setNotifications((prev) =>
          prev.map((n) => ({ ...n, isRead: true }))
        );
      } catch (error) {
        console.error("Error marking notifications as read:", error);
      }
    }
  };

  const handleClearAll = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Are you sure you want to clear all notifications?")) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/notifications/clear-all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications([]);
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteNotification = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/notifications/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.filter((n) => n._id !== id));
    } catch (error) {
      console.error(error);
    }
  };

  const navItems = [
    { name: "Dashboard", path: "/teacher/dashboard", icon: Home },
    { name: "Notices", path: "/teacher/notice_view", icon: ClipboardList },
    { name: "Video Lessons", path: "/teacher/materials/my-videos", icon: Video },
    { name: "PDF / Paper", path: "/teacher/materials/my-pdfs", icon: FileStack },
    { name: "Ticket", path: "/teacher/tickets", icon: FileStack },
    { name: "Add Quiz", path: "/teacher/materials/quize", icon: FileQuestion },
    { name: "My Quizzes", path: "/teacher/materials/my-quize", icon: BookOpenCheck },
    { name: "Classes", path: "/teacher/class/view_class", icon: Eye },
    { name: "Student Marks", path: "/teacher/materials/quize_marks", icon: Award },
    { name: "Physical class", path: "/teacher/materials/physical-marks-view", icon: Eye },
  ];

  return (
    <>
      {/* --- MOBILE TOP BAR --- */}
      <div className={`md:hidden fixed top-0 left-0 right-0 h-16 px-4 flex items-center justify-between z-50 backdrop-blur-2xl border-b ${
        darkMode ? "bg-[#0F172A]/80 border-slate-700/40" : "bg-white/80 border-slate-200/60"
      }`}>
        {/* Left Side: Teacher Profile Photo */}
        <Link href="/teacher/profile" className="relative flex items-center justify-center rounded-full h-10 w-10 shadow-inner overflow-hidden border shrink-0">
          {teacherPhoto ? (
            <img src={teacherPhoto} alt={teacherName} className="h-full w-full object-cover rounded-full" />
          ) : (
            <div className={darkMode ? "text-indigo-400" : "text-indigo-600"}>
              <GraduationCap size={20} />
            </div>
          )}
          <div className="absolute bottom-0 right-0 h-2 w-2 rounded-full border-2 border-white bg-green-500 dark:border-slate-800"></div>
        </Link>

        {/* Right Side: Notifications & Hamburger Button */}
        <div className="flex items-center gap-2">
          {/* Mobile Notifications Bell & Dropdown */}
          <div ref={mobileNotifRef} className="relative">
            <button
              onClick={handleOpenNotifications}
              className={`p-2.5 rounded-xl border transition-all relative ${
                isNotifOpen
                  ? darkMode ? "bg-indigo-600/30 border-indigo-500/40 text-indigo-300" : "bg-indigo-50 border-indigo-200 text-indigo-700"
                  : darkMode ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-white border-slate-200 text-slate-700"
              }`}
              title="Notifications"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm px-1">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Mobile Notifications Dropdown Modal */}
            {isNotifOpen && (
              <div
                className={`fixed top-16 right-4 left-4 max-h-[75vh] flex flex-col rounded-3xl border shadow-2xl z-[100] transition-all duration-300 backdrop-blur-2xl ${
                  darkMode ? "bg-slate-950/95 border-slate-800" : "bg-white/95 border-slate-100"
                }`}
              >
                <div
                  className={`p-4 border-b flex justify-between items-center ${
                    darkMode ? "border-slate-800" : "border-slate-100"
                  }`}
                >
                  <div>
                    <h3 className={`font-bold text-sm ${darkMode ? "text-white" : "text-slate-900"}`}>Notifications</h3>
                    {unreadCount === 0 && (
                      <span className={`text-xs font-medium mt-1 block ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                        All caught up!
                      </span>
                    )}
                  </div>

                  {notifications.length > 0 && (
                    <button
                      onClick={handleClearAll}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors ${
                        darkMode ? "bg-red-500/10 text-red-400 hover:bg-red-500/20" : "bg-red-50 text-red-600 hover:bg-red-100"
                      }`}
                    >
                      <Trash2 size={12} /> Clear All
                    </button>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                  {notifications.length === 0 ? (
                    <div className={`p-6 text-center text-sm font-medium ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                      No notifications yet.
                    </div>
                  ) : (
                    notifications.map((notif, index) => {
                      let targetUrl = "/teacher/dashboard";
                      if (
                        notif.title.toLowerCase().includes("ticket") ||
                        notif.title.toLowerCase().includes("reply")
                      ) {
                        targetUrl = notif.ticketId
                          ? `/teacher/tickets?ticketId=${notif.ticketId}`
                          : "/teacher/tickets";
                      } else if (
                        notif.title.toLowerCase().includes("notice") ||
                        notif.targetType?.includes("teacher") ||
                        notif.targetType === "everyone"
                      ) {
                        targetUrl = "/teacher/notice_view";
                      }

                      return (
                        <Link
                          href={targetUrl}
                          key={notif._id || index}
                          onClick={() => setIsNotifOpen(false)}
                          className={`group relative p-3 rounded-2xl flex items-start gap-3 transition-colors duration-300 cursor-pointer ${
                            !notif.isRead
                              ? darkMode
                                ? "bg-indigo-950/40 hover:bg-indigo-950/70"
                                : "bg-indigo-50 hover:bg-indigo-100"
                              : darkMode
                              ? "hover:bg-slate-900/50"
                              : "hover:bg-slate-50"
                          }`}
                        >
                          <div
                            className={`mt-1 p-2 rounded-full flex-shrink-0 ${
                              !notif.isRead
                                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                                : darkMode
                                ? "bg-slate-800 text-slate-400"
                                : "bg-slate-100 text-slate-400"
                            }`}
                          >
                            <Bell size={14} />
                          </div>
                          <div className="pr-6 flex-1 overflow-hidden">
                            <h4
                              className={`text-xs font-bold truncate ${
                                !notif.isRead
                                  ? darkMode
                                    ? "text-indigo-300"
                                    : "text-indigo-700"
                                  : darkMode
                                  ? "text-slate-300"
                                  : "text-slate-800"
                              }`}
                            >
                              {notif.title}
                            </h4>
                            <p className={`text-[11px] mt-1 leading-relaxed line-clamp-2 ${darkMode ? "text-slate-400" : "text-slate-600"}`}>
                              {notif.message}
                            </p>
                            <span className={`text-[9px] font-medium mt-1.5 block ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                              {new Date(notif.createdAt).toLocaleString()}
                            </span>
                          </div>

                          <button
                            onClick={(e) => handleDeleteNotification(e, notif._id)}
                            className={`absolute top-2.5 right-2.5 p-1 rounded-lg transition-all duration-300 ${
                              darkMode
                                ? "hover:bg-red-500/20 text-slate-500 hover:text-red-400"
                                : "hover:bg-red-100 text-slate-400 hover:text-red-600"
                            }`}
                            title="Delete"
                          >
                            <X size={14} />
                          </button>
                        </Link>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Hamburger Button */}
          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className={`p-2.5 rounded-xl border transition-transform active:scale-95 ${
              darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-800"
            }`}
            title="Toggle Menu"
          >
            {isMobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* --- MOBILE OVERLAY BACKDROP --- */}
      {isMobileOpen && (
        <div 
          onClick={() => setIsMobileOpen(false)}
          className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        />
      )}

      {/* --- SIDEBAR CONTAINER --- */}
      <aside
        className={`fixed top-3 bottom-3 flex flex-col transition-all duration-300 ease-in-out z-45 shadow-2xl rounded-3xl overflow-y-auto md:overflow-visible backdrop-blur-2xl ${
          darkMode 
            ? "bg-[#0F172A]/90 border border-slate-700/40 shadow-black/50" 
            : "bg-white/90 border border-white/80 shadow-indigo-500/10"
        } ${
          isMobileOpen ? "right-3 translate-x-0 w-64" : "translate-x-full md:translate-x-0 right-3 md:right-auto md:left-3"
        } ${isCollapsed && !isMobileOpen ? "w-20" : "w-64"}`}
      >
        {/* Collapse Button (Hidden on mobile) */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`hidden md:flex absolute -right-3.5 top-8 h-7 w-7 items-center justify-center rounded-full border shadow-lg transition-transform duration-300 hover:scale-110 z-[100] ${
            darkMode
              ? "bg-slate-900 border-slate-700 text-slate-300 hover:text-white"
              : "bg-white border-slate-200 text-slate-500 hover:text-slate-900"
          }`}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
        </button>

        {/* Header / Brand Profile (Desktop view only) */}
        <div className={`hidden md:block p-3.5 pt-4 transition-all duration-300 ${isCollapsed ? "px-2.5" : "px-3.5"}`}>
          <Link
            href="/teacher/profile"
            className={`flex items-center gap-3 rounded-2xl cursor-pointer group transition-all duration-300 border backdrop-blur-md shadow-sm ${
              isCollapsed ? "p-2 justify-center" : "p-3"
            } ${
              darkMode
                ? "bg-slate-800/30 border-slate-700/40 hover:bg-slate-800/60 hover:border-indigo-500/40"
                : "bg-white/40 border-slate-200/40 hover:bg-white/70 hover:border-indigo-200"
            }`}
            title={teacherName}
          >
            <div
              className={`relative flex items-center justify-center rounded-full shadow-inner transition-transform group-hover:scale-105 overflow-hidden shrink-0 ${
                isCollapsed ? "h-10 w-10" : "h-11 w-11"
              } ${darkMode ? "bg-slate-800 border border-slate-700" : "bg-indigo-50 border border-indigo-100"}`}
            >
              {teacherPhoto ? (
                <img
                  src={teacherPhoto}
                  alt={teacherName}
                  className="h-full w-full object-cover rounded-full"
                />
              ) : (
                <div
                  className={`flex items-center justify-center ${
                    darkMode ? "text-indigo-400" : "text-indigo-600"
                  }`}
                >
                  <GraduationCap size={isCollapsed ? 20 : 22} />
                </div>
              )}
              <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-green-500 dark:border-slate-800"></div>
            </div>

            <div
              className={`flex flex-col overflow-hidden transition-all duration-300 ${
                isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100"
              }`}
            >
              <h2
                className={`text-sm font-bold tracking-tight truncate ${
                  darkMode ? "text-white" : "text-slate-900"
                }`}
              >
                {teacherName}
              </h2>
              <p
                className={`text-[10px] font-medium mt-0.5 opacity-70 ${
                  darkMode ? "text-slate-400" : "text-slate-500"
                }`}
              >
                View Profile
              </p>
            </div>
          </Link>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto px-2.5 pt-20 md:pt-1 scrollbar-thin">
          <div
            className={`px-2 font-bold uppercase tracking-wider transition-all duration-300 ${
              darkMode ? "text-slate-500" : "text-slate-400"
            } ${isCollapsed && !isMobileOpen ? "text-[8px] text-center opacity-0 h-0 overflow-hidden" : "text-[9px] opacity-100"}`}
          >
            Main Menu
          </div>

          {navItems.map((item) => {
            const isActive = pathname === item.path;
            const Icon = item.icon;
            const isNoticeTab = item.name === "Notices";

            return (
              <Link href={item.path} key={item.path} title={item.name} onClick={() => setIsMobileOpen(false)}>
                <div
                  className={`relative group flex items-center rounded-2xl px-3 py-2.5 text-sm font-medium transition-all duration-300 ease-in-out border backdrop-blur-sm ${
                    isCollapsed && !isMobileOpen ? "justify-center px-0" : "gap-3"
                  } ${
                    isActive
                      ? darkMode
                        ? "bg-indigo-600/30 text-indigo-300 border-indigo-500/40 shadow-md shadow-indigo-500/10 -translate-y-0.5"
                        : "bg-indigo-50/80 text-indigo-700 border-indigo-200/70 shadow-md shadow-indigo-100/60 -translate-y-0.5"
                      : darkMode
                      ? "text-slate-400 bg-slate-900/10 border-slate-800/30 hover:bg-slate-800/40 hover:text-white hover:-translate-y-0.5"
                      : "text-slate-600 bg-white/30 border-slate-200/30 hover:bg-white/60 hover:text-slate-900 hover:-translate-y-0.5"
                  }`}
                >
                  <div className="relative">
                    <Icon
                      size={18}
                      className={`transition-transform duration-300 shrink-0 ${
                        isActive ? "scale-110" : "group-hover:scale-110"
                      } ${
                        isActive
                          ? darkMode
                            ? "text-indigo-400"
                            : "text-indigo-600"
                          : darkMode
                          ? "text-slate-500"
                          : "text-slate-400"
                      }`}
                    />
                    {isNoticeTab && unreadNoticeCount > 0 && (isCollapsed && !isMobileOpen) && (
                      <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                      </span>
                    )}
                  </div>

                  <span
                    className={`truncate flex-1 transition-all duration-300 ${
                      isCollapsed && !isMobileOpen ? "w-0 opacity-0 overflow-hidden hidden" : "w-auto opacity-100"
                    }`}
                  >
                    {item.name}
                  </span>

                  {isNoticeTab && unreadNoticeCount > 0 && (!isCollapsed || isMobileOpen) && (
                    <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold animate-pulse">
                      {unreadNoticeCount}
                    </span>
                  )}

                  {isActive && (!isCollapsed || isMobileOpen) && !isNoticeTab && (
                    <span
                      className={`ml-auto h-1.5 w-1.5 rounded-full transition-all duration-300 ${
                        darkMode ? "bg-indigo-400" : "bg-indigo-600"
                      }`}
                    />
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Footer: Notifications, Theme & Logout */}
        <div className="p-2.5 pb-3.5 relative space-y-2">
          {/* Notifications Section (Desktop view) */}
          <div ref={notifDropdownRef} className="relative w-full hidden md:block">
            <button
              onClick={handleOpenNotifications}
              className={`flex w-full items-center rounded-2xl px-3 py-2.5 text-sm font-semibold transition-all duration-300 border backdrop-blur-sm shadow-sm ${
                isCollapsed && !isMobileOpen ? "justify-center px-0" : "justify-between"
              } ${
                isNotifOpen
                  ? darkMode
                    ? "bg-indigo-600/30 text-indigo-300 border-indigo-500/40"
                    : "bg-indigo-50/80 text-indigo-700 border-indigo-200"
                  : darkMode
                  ? "bg-slate-800/30 text-slate-300 border-slate-700/40 hover:bg-slate-800/60"
                  : "bg-white/40 text-slate-600 border-slate-200/50 hover:bg-white/70"
              }`}
              title="Notifications"
            >
              <span className={`flex items-center ${isCollapsed && !isMobileOpen ? "gap-0" : "gap-3"}`}>
                <div className="relative">
                  <Bell size={18} className={darkMode ? "text-slate-400" : "text-slate-500"} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm px-1">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <span
                  className={`transition-all duration-300 ${
                    isCollapsed && !isMobileOpen ? "w-0 opacity-0 overflow-hidden hidden" : "w-auto opacity-100"
                  }`}
                >
                  Notifications
                </span>
              </span>

              {(!isCollapsed || isMobileOpen) && unreadCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                  {unreadCount} New
                </span>
              )}
            </button>

            {/* Notifications Dropdown (Desktop) */}
            {isNotifOpen && (
              <div
                className={`absolute bottom-full mb-3 w-[235px] sm:w-80 max-h-[380px] flex flex-col rounded-3xl border shadow-2xl z-[100] transition-all duration-300 backdrop-blur-2xl ${
                  darkMode ? "bg-slate-950/95 border-slate-800" : "bg-white/95 border-slate-100"
                } ${isCollapsed && !isMobileOpen ? "left-0" : "right-0 md:left-full md:right-auto md:ml-3"}`}
              >
                <div
                  className={`p-4 sm:p-5 border-b flex justify-between items-center ${
                    darkMode ? "border-slate-800" : "border-slate-100"
                  }`}
                >
                  <div>
                    <h3 className={`font-bold text-sm ${darkMode ? "text-white" : "text-slate-900"}`}>Notifications</h3>
                    {unreadCount === 0 && (
                      <span className={`text-xs font-medium mt-1 block ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                        All caught up!
                      </span>
                    )}
                  </div>

                  {notifications.length > 0 && (
                    <button
                      onClick={handleClearAll}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-colors ${
                        darkMode ? "bg-red-500/10 text-red-400 hover:bg-red-500/20" : "bg-red-50 text-red-600 hover:bg-red-100"
                      }`}
                    >
                      <Trash2 size={12} /> Clear All
                    </button>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-1.5">
                  {notifications.length === 0 ? (
                    <div className={`p-6 text-center text-sm font-medium ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                      No notifications yet.
                    </div>
                  ) : (
                    notifications.map((notif, index) => {
                      let targetUrl = "/teacher/dashboard";
                      if (
                        notif.title.toLowerCase().includes("ticket") ||
                        notif.title.toLowerCase().includes("reply")
                      ) {
                        targetUrl = notif.ticketId
                          ? `/teacher/tickets?ticketId=${notif.ticketId}`
                          : "/teacher/tickets";
                      } else if (
                        notif.title.toLowerCase().includes("notice") ||
                        notif.targetType?.includes("teacher") ||
                        notif.targetType === "everyone"
                      ) {
                        targetUrl = "/teacher/notice_view";
                      }

                      return (
                        <Link
                          href={targetUrl}
                          key={notif._id || index}
                          onClick={() => {
                            setIsNotifOpen(false);
                            setIsMobileOpen(false);
                          }}
                          className={`group relative p-3 sm:p-4 rounded-2xl flex items-start gap-3 transition-colors duration-300 cursor-pointer ${
                            !notif.isRead
                              ? darkMode
                                ? "bg-indigo-950/40 hover:bg-indigo-950/70"
                                : "bg-indigo-50 hover:bg-indigo-100"
                              : darkMode
                              ? "hover:bg-slate-900/50"
                              : "hover:bg-slate-50"
                          }`}
                        >
                          <div
                            className={`mt-1 p-2 rounded-full flex-shrink-0 ${
                              !notif.isRead
                                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                                : darkMode
                                ? "bg-slate-800 text-slate-400"
                                : "bg-slate-100 text-slate-400"
                            }`}
                          >
                            <Bell size={14} />
                          </div>
                          <div className="pr-6 flex-1 overflow-hidden">
                            <h4
                              className={`text-xs sm:text-sm font-bold truncate ${
                                !notif.isRead
                                  ? darkMode
                                    ? "text-indigo-300"
                                    : "text-indigo-700"
                                  : darkMode
                                  ? "text-slate-300"
                                  : "text-slate-800"
                              }`}
                            >
                              {notif.title}
                            </h4>
                            <p className={`text-[11px] sm:text-xs mt-1 leading-relaxed line-clamp-2 ${darkMode ? "text-slate-400" : "text-slate-600"}`}>
                              {notif.message}
                            </p>
                            <span className={`text-[9px] sm:text-[10px] font-medium mt-1.5 block ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                              {new Date(notif.createdAt).toLocaleString()}
                            </span>
                          </div>

                          <button
                            onClick={(e) => handleDeleteNotification(e, notif._id)}
                            className={`absolute top-2.5 right-2.5 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 ${
                              darkMode
                                ? "hover:bg-red-500/20 text-slate-500 hover:text-red-400"
                                : "hover:bg-red-100 text-slate-400 hover:text-red-600"
                            }`}
                            title="Delete"
                          >
                            <X size={14} />
                          </button>
                        </Link>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Theme & Logout Container */}
          <div
            className={`rounded-2xl p-2 space-y-1.5 transition-all duration-300 border backdrop-blur-md ${
              darkMode 
                ? "bg-slate-800/30 border-slate-700/40 shadow-lg shadow-black/20" 
                : "bg-white/40 border-slate-200/50 shadow-sm"
            } ${isCollapsed && !isMobileOpen ? "p-1 bg-transparent border-none shadow-none" : ""}`}
          >
            {/* Dark Mode Toggle */}
            <button
              type="button"
              onClick={toggleDarkMode}
              className={`flex w-full items-center rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-300 ${
                isCollapsed && !isMobileOpen ? "justify-center px-0 py-2.5" : "justify-between"
              } ${
                darkMode ? "text-slate-300 hover:bg-slate-700/80" : "text-slate-600 hover:bg-slate-200/50"
              }`}
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              <span className={`flex items-center ${isCollapsed && !isMobileOpen ? "gap-0" : "gap-3"}`}>
                {darkMode ? <Moon size={18} /> : <Sun size={18} />}
                <span
                  className={`transition-all duration-300 ${
                    isCollapsed && !isMobileOpen ? "w-0 opacity-0 overflow-hidden hidden" : "w-auto opacity-100"
                  }`}
                >
                  {darkMode ? "Dark Mode" : "Light Mode"}
                </span>
              </span>

              {(!isCollapsed || isMobileOpen) && (
                <span
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-300 ${
                    darkMode ? "bg-indigo-600" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-300 ${
                      darkMode ? "translate-x-4" : "translate-x-0.5"
                    }`}
                  />
                </span>
              )}
            </button>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className={`flex w-full items-center rounded-xl px-3 py-2 text-sm font-bold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ${
                isCollapsed && !isMobileOpen ? "justify-center px-0 py-2.5" : "gap-3"
              } ${
                darkMode ? "bg-red-600/10 text-red-400 hover:bg-red-600/20" : "bg-red-50 text-red-600 hover:bg-red-100"
              }`}
              title="Logout"
            >
              <LogOut size={18} />
              <span
                className={`transition-all duration-300 ${
                  isCollapsed && !isMobileOpen ? "w-0 opacity-0 overflow-hidden hidden" : "w-auto opacity-100"
                }`}
              >
                Logout
              </span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}