"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { Bell, Calendar, Image as ImageIcon, Loader2, X } from "lucide-react";
import { useTheme } from "@/app/context/ThemeContext";

interface NoticeItem {
  _id: string;
  title: string;
  message: string;
  targetType: string;
  image?: string;
  createdAt: string;
}

export default function TeacherNoticeView() {
  const { darkMode } = useTheme();
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [loading, setLoading] = useState(true);

  // සම්පූර්ණ Notice එක බැලීම සඳහා Modal එක පාලනය කරන State එක
  const [selectedNotice, setSelectedNotice] = useState<NoticeItem | null>(null);

  useEffect(() => {
    fetchNotices();
  }, []);

  const fetchNotices = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const userDataString = localStorage.getItem("user");

      if (!token || !userDataString) {
        setLoading(false);
        return;
      }

      const userData = JSON.parse(userDataString);
      const teacherId = userData._id || userData.id;

      if (!teacherId) {
        setLoading(false);
        return;
      }

      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/teacher/notices/${teacherId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setNotices(res.data);
    } catch (err) {
      console.error("Error fetching notices:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`relative isolate min-h-screen overflow-x-hidden font-sans transition-colors duration-300 ${
      darkMode ? "bg-[#0a1128] text-slate-100" : "bg-[#edf2ff] text-[#141e50]"
    }`}>
      {/* Decorative pastels — purely visual; no event handling added. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className={`absolute -left-24 -top-24 h-[380px] w-[380px] rounded-full blur-[100px] ${darkMode ? "bg-violet-700/15" : "bg-[#dfd8ff]/80"}`} />
        <div className={`absolute -right-24 top-28 h-[400px] w-[400px] rounded-full blur-[105px] ${darkMode ? "bg-blue-700/10" : "bg-[#d7eaff]/85"}`} />
        <div className={`absolute bottom-0 left-[35%] h-72 w-72 rounded-full blur-[90px] ${darkMode ? "bg-teal-800/10" : "bg-[#d9f6f0]/70"}`} />
      </div>

      {/* Compact heading: same data, only refreshed layout. */}
      <main className="relative mx-auto w-full max-w-[1700px] px-3 pb-7 pt-[84px] sm:px-5 md:pt-6 lg:px-7 xl:px-8">
        <header className={`relative mb-4 overflow-hidden rounded-[24px] border px-4 py-4 shadow-[0_14px_35px_rgba(104,112,178,0.10)] backdrop-blur-2xl sm:px-5 sm:py-4 ${
          darkMode
            ? "border-white/10 bg-gradient-to-r from-violet-900/35 via-slate-900/65 to-blue-900/25"
            : "border-white/90 bg-gradient-to-r from-white/70 via-[#e9e8ff]/75 to-[#e1f4ff]/70"
        }`}>
          <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-20 h-48 w-48 rounded-full border-[25px] border-white/20" />
          <div className="relative flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] bg-gradient-to-br from-[#6b8eff] via-[#7c6afa] to-[#ae80f3] text-white shadow-[0_8px_18px_rgba(106,99,239,0.25)] sm:h-12 sm:w-12">
                <Bell size={22} strokeWidth={2} />
                <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-[2px] border-white bg-[#54d5bd]" />
              </div>
              <div className="min-w-0">
                <h1 className={`text-[19px] font-black leading-tight tracking-tight sm:text-[22px] ${darkMode ? "text-white" : "text-[#101a4d]"}`}>
                  Official Notices
                </h1>
                <p className={`mt-1 max-w-[620px] text-[10px] font-medium leading-relaxed sm:text-[11px] ${darkMode ? "text-slate-300" : "text-[#6977a0]"}`}>
                  Stay updated with the latest announcements from the administration.
                </p>
              </div>
            </div>
            <div className={`flex shrink-0 items-center gap-2 rounded-2xl border px-3 py-2 shadow-sm backdrop-blur-xl ${
              darkMode ? "border-white/15 bg-white/10 text-violet-200" : "border-white bg-white/65 text-[#6558cd]"
            }`}>
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-violet-500/10"><Bell size={14} /></span>
              <div className="leading-tight">
                <span className={`block text-[9px] font-semibold ${darkMode ? "text-slate-400" : "text-[#818cb0]"}`}>Total notices</span>
                <span className="block text-[15px] font-black tabular-nums">{notices.length}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Same loading / data / empty-state conditions as the original. */}
        {loading ? (
          <div className={`flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-[24px] border backdrop-blur-xl ${
            darkMode ? "border-white/10 bg-slate-900/55" : "border-white/90 bg-white/55"
          }`}>
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${darkMode ? "bg-violet-500/15" : "bg-[#eee9ff]"}`}>
              <Loader2 className="h-6 w-6 animate-spin text-[#8274fb]" />
            </div>
            <p className={`text-[12px] font-semibold ${darkMode ? "text-slate-400" : "text-[#6b78a1]"}`}>
              Loading notices...
            </p>
          </div>
        ) : notices.length > 0 ? (
          <section aria-label="Official notices" className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {notices.map((notice) => {
              const imgUrl = notice.image ? `${process.env.NEXT_PUBLIC_API_URL}${notice.image}` : null;

              return (
                <article
                  key={notice._id}
                  className={`group flex min-w-0 flex-col overflow-hidden rounded-[23px] border shadow-[0_10px_28px_rgba(104,112,178,0.11)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_34px_rgba(104,112,178,0.16)] ${
                    darkMode
                      ? "border-white/10 bg-slate-900/65 hover:border-violet-400/40"
                      : "border-white/90 bg-white/65 hover:border-violet-200"
                  }`}
                >
                  {/* Image URL resolution and image/no-image behavior preserved. */}
                  {imgUrl ? (
                    <div className={`relative h-[108px] w-full shrink-0 overflow-hidden sm:h-[116px] ${darkMode ? "bg-slate-800" : "bg-[#e9efff]"}`}>
                      <img
                        src={imgUrl}
                        alt={notice.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#25265b]/20 to-transparent" />
                    </div>
                  ) : (
                    <div className={`relative flex h-[108px] w-full shrink-0 flex-col sm:h-[116px] items-center justify-center gap-1.5 overflow-hidden ${
                      darkMode
                        ? "bg-gradient-to-r from-[#312d65]/60 via-[#284366]/45 to-[#24575a]/35 text-violet-300"
                        : "bg-gradient-to-r from-[#e9e2ff] via-[#e5edff] to-[#dbf8f1] text-[#8578ed]"
                    }`}>
                      <div aria-hidden="true" className="absolute -right-6 -top-9 h-24 w-24 rounded-full border-[14px] border-white/25" />
                      <span className={`relative flex h-10 w-10 items-center justify-center rounded-[15px] border shadow-sm ${darkMode ? "border-white/15 bg-white/10" : "border-white/80 bg-white/60"}`}>
                        <ImageIcon size={21} strokeWidth={1.7} />
                      </span>
                      <span className="relative text-[9px] font-bold tracking-wide opacity-80">No Image</span>
                    </div>
                  )}

                  <div className="flex min-h-[154px] flex-1 flex-col p-3.5 sm:p-4">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-1.5">
                      <span className={`inline-flex max-w-full items-center rounded-lg border px-2 py-1 text-[9px] font-extrabold uppercase tracking-wide ${
                        darkMode ? "border-violet-400/20 bg-violet-400/15 text-violet-200" : "border-violet-100 bg-[#f0eaff] text-[#7662dc]"
                      }`}>
                        <span className="truncate">{notice.targetType.replace('_', ' ')}</span>
                      </span>
                      <span className={`inline-flex shrink-0 items-center gap-1 text-[9px] font-semibold ${darkMode ? "text-slate-400" : "text-[#8290b2]"}`}>
                        <Calendar size={12} />
                        {new Date(notice.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className={`mb-1.5 line-clamp-2 text-[13px] font-extrabold leading-snug sm:text-[14px] ${darkMode ? "text-white" : "text-[#172251]"}`}>
                      {notice.title}
                    </h3>
                    <p className={`mb-3 line-clamp-2 flex-1 text-[10px] font-medium leading-[1.65] sm:text-[11px] ${darkMode ? "text-slate-400" : "text-[#7280a4]"}`}>
                      {notice.message}
                    </p>

                    {/* Same modal-opening logic. */}
                    <button
                      type="button"
                      onClick={() => setSelectedNotice(notice)}
                      className={`w-full rounded-xl border px-3 py-2 text-[10px] font-extrabold shadow-sm transition-all duration-200 hover:-translate-y-0.5 ${
                        darkMode
                          ? "border-violet-400/20 bg-violet-500/15 text-violet-200 hover:bg-violet-500/25"
                          : "border-white/95 bg-gradient-to-r from-[#ece9ff] to-[#e8f1ff] text-[#685ad4] hover:from-[#ded8ff] hover:to-[#daebff]"
                      }`}
                    >
                      Read Full Notice
                    </button>
                  </div>
                </article>
              );
            })}
          </section>
        ) : (
          <div className={`flex min-h-[235px] flex-col items-center justify-center rounded-[24px] border border-dashed p-6 text-center shadow-sm backdrop-blur-xl ${
            darkMode ? "border-white/15 bg-slate-900/50" : "border-white/90 bg-white/55"
          }`}>
            <div className={`mb-3 flex h-14 w-14 items-center justify-center rounded-[20px] border shadow-sm ${darkMode ? "border-white/10 bg-violet-500/10 text-violet-300" : "border-white bg-[#eeebff] text-[#8170ec]"}`}>
              <Bell size={25} />
            </div>
            <h3 className={`text-[15px] font-extrabold ${darkMode ? "text-slate-200" : "text-[#182456]"}`}>
              No Notices Yet
            </h3>
            <p className={`mt-1 text-[11px] font-medium ${darkMode ? "text-slate-400" : "text-[#7784a9]"}`}>
              You don't have any announcements at the moment.
            </p>
          </div>
        )}
      </main>

      {/* Original full-notice modal: same selection, full image and message. */}
      {selectedNotice && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#101838]/65 p-3 backdrop-blur-md transition-opacity sm:p-5">
          <div className={`relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-y-auto rounded-[26px] border shadow-[0_30px_90px_rgba(21,27,65,0.3)] backdrop-blur-2xl ${
            darkMode ? "border-white/15 bg-[#151d39]/95" : "border-white/90 bg-[#f9faff]/95"
          }`}>
            <button
              type="button"
              onClick={() => setSelectedNotice(null)}
              className={`absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-xl border shadow-lg backdrop-blur-xl transition-colors ${
                darkMode
                  ? "border-white/20 bg-slate-950/75 text-white hover:bg-rose-600"
                  : "border-white/80 bg-[#202650]/70 text-white hover:bg-rose-500"
              }`}
              title="Close"
              aria-label="Close notice"
            >
              <X size={17} />
            </button>

            {/* Uncropped image behavior preserved. */}
            {selectedNotice.image && (
              <div className={`flex w-full shrink-0 items-center justify-center border-b ${darkMode ? "border-white/10 bg-slate-950/50" : "border-white/70 bg-[#eaf0ff]"}`}>
                <img
                  src={`${process.env.NEXT_PUBLIC_API_URL}${selectedNotice.image}`}
                  alt={selectedNotice.title}
                  className="h-auto max-h-[60vh] w-full object-contain"
                />
              </div>
            )}

            <div className="flex-1 p-5 sm:p-6">
              <div className="mb-3 flex flex-wrap items-center gap-2.5">
                <span className={`rounded-lg border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ${
                  darkMode ? "border-violet-400/20 bg-violet-500/15 text-violet-200" : "border-violet-100 bg-[#f0eaff] text-[#7662dc]"
                }`}>
                  {selectedNotice.targetType.replace('_', ' ')}
                </span>
                <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${darkMode ? "text-slate-400" : "text-[#7b88a9]"}`}>
                  <Calendar size={13} />
                  {new Date(selectedNotice.createdAt).toLocaleString()}
                </span>
              </div>

              <h2 className={`mb-3 pr-5 text-[19px] font-black leading-snug sm:text-[22px] ${darkMode ? "text-white" : "text-[#172251]"}`}>
                {selectedNotice.title}
              </h2>
              <div className={`whitespace-pre-wrap text-[12px] font-medium leading-[1.85] sm:text-[13px] ${darkMode ? "text-slate-300" : "text-[#536181]"}`}>
                {selectedNotice.message}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
