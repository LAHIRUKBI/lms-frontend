"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  UserPlus,
  Users,
  LogOut,
  GraduationCap,
  Sun,
  Moon,
  ShieldPlus,
  Shield,
  ClipboardList,
  Award,
  FileCheck,
  School,
  Ticket,
  Megaphone,
  FileText,
  LayoutDashboard,
  BellRing,
  CircleHelp,
  Bell,
  Trash2,
  X,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { useTheme } from "@/app/context/ThemeContext";
import axios from "axios";
import { io } from "socket.io-client";

interface AdminSidebarProps {
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export default function AdminSidebar({
  isMobileOpen,
  setIsMobileOpen,
  isCollapsed,
  setIsCollapsed,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { darkMode, toggleDarkMode } = useTheme();

  const [newStudentCount, setNewStudentCount] = useState(0);
  const [newMaterialCount, setNewMaterialCount] = useState(0);
  const [newQuizCount, setNewQuizCount] = useState(0);
  const [newClassRequestCount, setNewClassRequestCount] = useState(0);
  const [adminProfilePhoto, setAdminProfilePhoto] = useState<string>("");

  const [adminNotifications, setAdminNotifications] = useState<any[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const unreadCount = adminNotifications.filter((n) => !n.isRead).length;

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  const handleNavClick = async (path: string) => {
    setIsMobileOpen(false); // Mobile එකේදී item එකක් click කල පසු sidebar එක close වීම

    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };

    if (path === "/admin/student/student_view" && newStudentCount > 0) {
      try {
        await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/students/clear-sidebar`, {}, { headers });
        setNewStudentCount(0);
      } catch (error) {
        console.error(error);
      }
    }

    if (path === "/admin/materials/quize_view" && newQuizCount > 0) {
      try {
        await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/api/quiz/admin/clear-sidebar`, {}, { headers });
        setNewQuizCount(0);
      } catch (error) {
        console.error(error);
      }
    }

    if (path === "/admin/materials/class_view" && newClassRequestCount > 0) {
      setNewClassRequestCount(0);
    }

    if (path === "/admin/materials/review" && newMaterialCount > 0) {
      try {
        await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/api/materials/admin/clear-sidebar`, {}, { headers });
        setNewMaterialCount(0);
      } catch (error) {
        console.error(error);
      }
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const headers = { Authorization: `Bearer ${token}` };

    axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/notifications/admin`, { headers })
      .then((res) => setAdminNotifications(res.data))
      .catch(console.error);

    axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/students/new-count`, { headers })
      .then((res) => setNewStudentCount(res.data.count))
      .catch(console.error);

    axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/materials/admin/new-count`, { headers })
      .then((res) => setNewMaterialCount(res.data.count))
      .catch(console.error);

    axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/quiz/admin/new-count`, { headers })
      .then((res) => setNewQuizCount(res.data.count))
      .catch(console.error);

    axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/classes/requests/all`, { headers })
      .then((res) => {
        const pending = res.data.filter((r: any) => r.status === "Pending");
        setNewClassRequestCount(pending.length);
      })
      .catch(console.error);

    axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/profile`, { headers })
      .then((res) => {
        if (res.data.profilePhoto) {
          const photo = res.data.profilePhoto;
          // It either uses the Cloudinary HTTPS URL directly, or constructs a local path using localhost:5000.
          if (photo.startsWith("http")) {
            setAdminProfilePhoto(photo);
          } else {
            const cleanPath = photo.replace(/\\/g, "/");
            const baseUrl = `${process.env.NEXT_PUBLIC_API_URL}/${cleanPath.startsWith("/") ? cleanPath.substring(1) : cleanPath}`;
            setAdminProfilePhoto(`${baseUrl}?t=${new Date().getTime()}`);
          }
        }
      })
      .catch(console.error);

    const socket = io(`${process.env.NEXT_PUBLIC_API_URL}`);
    socket.emit("join_admin_room");
    socket.on("receive_admin_notification", (newNotif) => {
      setAdminNotifications((prev) => [newNotif, ...prev]);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleOpenAdminNotifications = async () => {
    setIsNotifOpen(!isNotifOpen);
    if (!isNotifOpen && unreadCount > 0) {
      try {
        const token = localStorage.getItem("token");
        await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/api/notifications/admin/mark-read`, {}, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAdminNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      } catch (error) {
        console.error(error);
      }
    }
  };

  const handleClearAll = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Are you sure you want to clear all notifications?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/notifications/admin/clear-all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAdminNotifications([]);
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteNotification = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/notifications/admin/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAdminNotifications((prev) => prev.filter((n) => n._id !== id));
    } catch (error) {
      console.error(error);
    }
  };

  const navItems = [
    { name: "Dashboard", path: "/admin/dashboard", icon: Home },
    { name: "Teachers", path: "/admin/teachers/list", icon: Users },
    { name: "Admins", path: "/admin/list", icon: Shield },
    { name: "Review Materials", path: "/admin/materials/review", icon: FileCheck },
    { name: "Review Quiz", path: "/admin/materials/quize_view", icon: ClipboardList },
    { name: "Tickets", path: "/admin/tickets", icon: Ticket },
    { name: "Students", path: "/admin/student/student_view", icon: GraduationCap },
    { name: "Class view", path: "/admin/materials/class_view", icon: School },
    { name: "View Physical", path: "/admin/viewphysicalmark", icon: Award },
    { name: "Create Add", path: "/admin/Add/create_add", icon: Megaphone },
    { name: "View Add", path: "/admin/Add/view_add", icon: FileText },
    { name: "Notice", path: "/admin/notice", icon: BellRing },
    { name: "Dashboard Editor", path: "/admin/swp", icon: LayoutDashboard },
    { name: "Notification Handler", path: "/admin/notification", icon: BellRing },
    { name: "FAQ", path: "/admin/faq/add_faq", icon: CircleHelp },
  ];

  const notifDropdownRef = useRef<HTMLDivElement>(null);

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Aside */}
      <aside
        className={`fixed top-0 bottom-0 lg:top-3 lg:bottom-3 z-50 flex flex-col transition-all duration-300 ease-in-out shadow-2xl backdrop-blur-2xl rounded-none lg:rounded-3xl border-r lg:border overflow-visible ${darkMode
            ? "bg-[#0F172A]/95 lg:bg-[#0F172A]/80 border-slate-800 lg:border-slate-700/40 shadow-black/50"
            : "bg-white/95 lg:bg-white/70 border-slate-200 lg:border-white/80 shadow-indigo-500/10"
          } ${isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          } lg:left-6 ${isCollapsed ? "lg:w-20 w-64" : "w-64"}`}
      >
        {/* Desktop Collapse Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`hidden lg:flex absolute -right-3.5 top-8 h-7 w-7 items-center justify-center rounded-full border shadow-lg transition-transform duration-300 hover:scale-110 z-[100] ${darkMode
              ? "bg-slate-900 border-slate-700 text-slate-300 hover:text-white"
              : "bg-white border-slate-200 text-slate-500 hover:text-slate-900"
            }`}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
        </button>

        {/* Mobile Close Button */}
        <button
          onClick={() => setIsMobileOpen(false)}
          className="lg:hidden absolute right-3 top-3.5 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
        >
          <X size={20} />
        </button>

        {/* Header / Brand Profile */}
        <div className={`p-3.5 pt-4 transition-all duration-300 ${isCollapsed ? "lg:px-2.5 px-3.5" : "px-3.5"}`}>
          <Link href="/admin/profile" onClick={() => setIsMobileOpen(false)}>
            <div
              className={`flex items-center gap-3 rounded-2xl cursor-pointer group transition-all duration-300 border backdrop-blur-md shadow-sm ${isCollapsed ? "lg:p-2 lg:justify-center p-3" : "p-3"
                } ${darkMode
                  ? "bg-slate-800/30 border-slate-700/40 hover:bg-slate-800/60 hover:border-blue-500/40"
                  : "bg-white/40 border-slate-200/40 hover:bg-white/70 hover:border-blue-200"
                }`}
            >
              <div
                className={`relative flex items-center justify-center rounded-full shadow-inner transition-transform group-hover:scale-105 overflow-hidden shrink-0 ${isCollapsed ? "lg:h-10 lg:w-10 h-11 w-11" : "h-11 w-11"
                  } ${darkMode ? "bg-slate-800 border border-slate-700" : "bg-blue-50 border border-blue-100"}`}
              >
                {adminProfilePhoto ? (
                  <img src={adminProfilePhoto} alt="Admin Profile" className="h-full w-full object-cover" />
                ) : (
                  <div className={`flex items-center justify-center ${darkMode ? "text-blue-400" : "text-blue-600"}`}>
                    <GraduationCap size={isCollapsed ? 20 : 22} />
                  </div>
                )}
                <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-green-500 dark:border-slate-800"></div>
              </div>

              <div
                className={`flex flex-col overflow-hidden transition-all duration-300 ${isCollapsed ? "lg:w-0 lg:opacity-0 lg:hidden w-auto opacity-100" : "w-auto opacity-100"
                  }`}
              >
                <h2 className={`text-sm font-bold tracking-tight truncate ${darkMode ? "text-white" : "text-slate-900"}`}>
                  LMS Admin
                </h2>
                <p className={`text-[10px] font-medium mt-0.5 opacity-70 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                  Control Panel
                </p>
              </div>
            </div>
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-2.5 pt-1 scrollbar-thin">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                href={item.path}
                key={item.path}
                title={item.name}
                onClick={() => handleNavClick(item.path)}
              >
                <div
                  className={`group flex items-center rounded-2xl px-3 py-2.5 text-sm font-medium transition-all duration-300 ease-in-out border backdrop-blur-sm relative ${isCollapsed ? "lg:justify-center lg:px-0 gap-3" : "gap-3"
                    } ${isActive
                      ? darkMode
                        ? "bg-blue-600/30 text-blue-300 border-blue-500/40 shadow-md shadow-blue-500/10"
                        : "bg-blue-50/80 text-blue-700 border-blue-200/70 shadow-md shadow-blue-100/60"
                      : darkMode
                        ? "text-slate-400 bg-slate-900/10 border-slate-800/30 hover:bg-slate-800/40 hover:text-white"
                        : "text-slate-600 bg-white/30 border-slate-200/30 hover:bg-white/60 hover:text-slate-900"
                    }`}
                >
                  <Icon size={18} className="shrink-0" />
                  <span
                    className={`transition-all duration-300 whitespace-nowrap overflow-hidden ${isCollapsed ? "lg:w-0 lg:opacity-0 lg:hidden w-auto opacity-100" : "w-auto opacity-100"
                      }`}
                  >
                    {item.name}
                  </span>

                  {item.name === "Review Materials" && newMaterialCount > 0 && (
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ${isCollapsed ? "lg:absolute lg:top-2 lg:right-2 lg:h-2.5 lg:w-2.5 lg:p-0 ml-auto" : "ml-auto"
                      }`}>
                      <span className={isCollapsed ? "lg:hidden" : ""}>{newMaterialCount}</span>
                    </span>
                  )}

                  {item.name === "Review Quiz" && newQuizCount > 0 && (
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ${isCollapsed ? "lg:absolute lg:top-2 lg:right-2 lg:h-2.5 lg:w-2.5 lg:p-0 ml-auto" : "ml-auto"
                      }`}>
                      <span className={isCollapsed ? "lg:hidden" : ""}>{newQuizCount}</span>
                    </span>
                  )}

                  {item.name === "Students" && newStudentCount > 0 && (
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ${isCollapsed ? "lg:absolute lg:top-2 lg:right-2 lg:h-2.5 lg:w-2.5 lg:p-0 ml-auto" : "ml-auto"
                      }`}>
                      <span className={isCollapsed ? "lg:hidden" : ""}>{newStudentCount}</span>
                    </span>
                  )}

                  {item.name === "Class view" && newClassRequestCount > 0 && (
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ${isCollapsed ? "lg:absolute lg:top-2 lg:right-2 lg:h-2.5 lg:w-2.5 lg:p-0 ml-auto" : "ml-auto"
                      }`}>
                      <span className={isCollapsed ? "lg:hidden" : ""}>{newClassRequestCount}</span>
                    </span>
                  )}

                  {isActive && (!isCollapsed || typeof window !== "undefined" && window.innerWidth < 1024) && (
                    <span className={`ml-auto h-1.5 w-1.5 rounded-full ${darkMode ? "bg-blue-400" : "bg-blue-600"}`} />
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Footer: Notifications, Theme & Logout */}
        <div className="p-2.5 pb-3.5 relative space-y-2">
          {/* Notifications Dropup */}
          <div ref={notifDropdownRef} className="relative w-full">
            <button
              onClick={handleOpenAdminNotifications}
              className={`flex w-full items-center rounded-2xl px-3 py-2.5 text-sm font-semibold transition-all duration-300 border backdrop-blur-sm shadow-sm ${isCollapsed ? "lg:justify-center lg:px-0 justify-between" : "justify-between"
                } ${isNotifOpen
                  ? darkMode
                    ? "bg-blue-600/30 text-blue-300 border-blue-500/40"
                    : "bg-blue-50/80 text-blue-700 border-blue-200"
                  : darkMode
                    ? "bg-slate-800/30 text-slate-300 border-slate-700/40 hover:bg-slate-800/60"
                    : "bg-white/40 text-slate-600 border-slate-200/50 hover:bg-white/70"
                }`}
            >
              <span className={`flex items-center ${isCollapsed ? "lg:gap-0 gap-3" : "gap-3"}`}>
                <div className="relative">
                  <Bell size={18} className={darkMode ? "text-slate-400" : "text-slate-500"} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm px-1">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <span className={isCollapsed ? "lg:hidden block" : "block"}>Alerts</span>
              </span>

              {(!isCollapsed || typeof window !== "undefined" && window.innerWidth < 1024) && unreadCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                  {unreadCount} New
                </span>
              )}
            </button>

            {/* Dropdown Modal Container */}
            {isNotifOpen && (
              <div
                className={`fixed sm:absolute bottom-16 sm:bottom-full sm:mb-3 left-4 right-4 sm:left-auto sm:right-auto sm:w-80 max-h-[70vh] sm:max-h-[400px] flex flex-col rounded-3xl border shadow-2xl z-50 backdrop-blur-2xl overflow-hidden ${darkMode ? "bg-slate-950/95 border-slate-800 text-slate-100" : "bg-white/95 border-slate-100 text-slate-900"
                  } ${isCollapsed ? "lg:left-full lg:ml-3" : "lg:left-full lg:ml-3"}`}
              >
                <div className={`p-4 border-b flex justify-between items-center ${darkMode ? "border-slate-800" : "border-slate-100"}`}>
                  <div>
                    <h3 className="font-bold text-sm">Admin Alerts</h3>
                    {unreadCount === 0 && (
                      <span className={`text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                        All caught up!
                      </span>
                    )}
                  </div>
                  {adminNotifications.length > 0 && (
                    <button
                      onClick={handleClearAll}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold uppercase transition-colors ${darkMode ? "bg-red-500/10 text-red-400 hover:bg-red-500/20" : "bg-red-50 text-red-600 hover:bg-red-100"
                        }`}
                    >
                      <Trash2 size={12} /> Clear
                    </button>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin">
                  {adminNotifications.length === 0 ? (
                    <div className={`p-6 text-center text-sm ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                      No alerts right now.
                    </div>
                  ) : (
                    adminNotifications.map((notif, index) => {
                      let targetUrl = "/admin/dashboard";
                      if (notif.title.toLowerCase().includes("ticket") || notif.ticketId) {
                        targetUrl = notif.ticketId ? `/admin/tickets?ticketId=${notif.ticketId}` : "/admin/tickets";
                      } else if (
                        notif.title.toLowerCase().includes("material") ||
                        notif.title.toLowerCase().includes("video") ||
                        notif.title.toLowerCase().includes("pdf")
                      ) {
                        targetUrl = "/admin/materials/review";
                      }

                      return (
                        <Link
                          href={targetUrl}
                          key={notif._id || index}
                          onClick={() => {
                            setIsNotifOpen(false);
                            setIsMobileOpen(false);
                          }}
                          className={`group relative p-3 rounded-2xl flex items-start gap-3 transition-colors ${!notif.isRead
                              ? darkMode
                                ? "bg-blue-950/40 hover:bg-blue-950/70"
                                : "bg-blue-50 hover:bg-blue-100"
                              : darkMode
                                ? "hover:bg-slate-900/50"
                                : "hover:bg-slate-50"
                            }`}
                        >
                          <div className={`mt-0.5 p-2 rounded-full shrink-0 ${!notif.isRead ? "bg-blue-600 text-white" : darkMode ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-400"
                            }`}>
                            <Bell size={13} />
                          </div>
                          <div className="pr-6 flex-1 overflow-hidden">
                            <h4 className="text-xs font-bold truncate">{notif.title}</h4>
                            <p className={`text-[11px] mt-1 leading-snug line-clamp-2 ${darkMode ? "text-slate-400" : "text-slate-600"}`}>
                              {notif.message}
                            </p>
                            <span className={`text-[9px] mt-1.5 block ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                              {new Date(notif.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <button
                            onClick={(e) => handleDeleteNotification(e, notif._id)}
                            className="absolute top-2.5 right-2.5 p-1 rounded-md opacity-70 hover:opacity-100 transition-opacity"
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

          {/* Theme & Logout Controls */}
          <div
            className={`rounded-2xl p-2 space-y-1.5 border backdrop-blur-md ${darkMode ? "bg-slate-800/30 border-slate-700/40" : "bg-white/40 border-slate-200/50"
              } ${isCollapsed ? "lg:p-1 lg:bg-transparent lg:border-none" : ""}`}
          >
            {/* Desktop Theme Toggle */}
            <button
              type="button"
              onClick={toggleDarkMode}
              className={`hidden lg:flex w-full items-center rounded-xl px-3 py-2 text-sm font-semibold transition-all ${isCollapsed ? "justify-center px-0 py-2.5" : "justify-between"
                } ${darkMode ? "text-slate-300 hover:bg-slate-700/80" : "text-slate-600 hover:bg-slate-200/50"}`}
            >
              <span className={`flex items-center ${isCollapsed ? "gap-0" : "gap-3"}`}>
                {darkMode ? <Moon size={18} /> : <Sun size={18} />}
                {!isCollapsed && <span>{darkMode ? "Dark Mode" : "Light Mode"}</span>}
              </span>
              {!isCollapsed && (
                <span className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${darkMode ? "bg-blue-600" : "bg-slate-300"}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${darkMode ? "translate-x-4" : "translate-x-0.5"}`} />
                </span>
              )}
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className={`flex w-full items-center rounded-xl px-3 py-2 text-sm font-bold transition-all ${isCollapsed ? "lg:justify-center lg:px-0 justify-start gap-3" : "gap-3"
                } ${darkMode ? "bg-red-600/10 text-red-400 hover:bg-red-600/20" : "bg-red-50 text-red-600 hover:bg-red-100"}`}
            >
              <LogOut size={18} />
              <span className={isCollapsed ? "lg:hidden block" : "block"}>Logout</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}