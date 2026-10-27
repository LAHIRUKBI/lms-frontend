// src/app/components/ClassCreateConfirmPopup.tsx

"use client";

import { CheckCircle2, X } from "lucide-react";

interface ClassCreateConfirmPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  classData: {
    grade: string;
    medium: string;
    mode: string;
    day: string;
    startTime: string;
    endTime: string;
    description?: string;
    coverImageFile?: File | null;
    // අලුතින් එක් කළ properties වල Types
    isFree?: boolean;
    fee?: number;
    billingType?: "monthly" | "fixed_months";
    durationMonths?: number;
    hasBatchLimit?: boolean;
    batchLimit?: number;
  };
}

export default function ClassCreateConfirmPopup({
  isOpen,
  onClose,
  onConfirm,
  classData,
}: ClassCreateConfirmPopupProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md p-6 rounded-3xl shadow-2xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 space-y-5">
        <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <CheckCircle2 size={20} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Confirm Class Creation</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Please review the details below before creating the class:
        </p>

        <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-500 font-medium">Grade:</span>
            <span className="font-bold text-slate-800 dark:text-white">{classData.grade}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-medium">Medium:</span>
            <span className="font-bold text-slate-800 dark:text-white">{classData.medium}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-medium">Class Mode:</span>
            <span className="font-bold text-slate-800 dark:text-white">{classData.mode}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-medium">Day:</span>
            <span className="font-bold text-slate-800 dark:text-white">{classData.day}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-medium">Time:</span>
            <span className="font-bold text-slate-800 dark:text-white">{classData.startTime} - {classData.endTime}</span>
          </div>

          {/* Pricing Info */}
          <div className="flex justify-between pt-1 border-t dark:border-slate-800">
            <span className="text-slate-500 font-medium">Class Fee:</span>
            <span className={`font-bold ${classData.isFree ? "text-emerald-600 dark:text-emerald-400" : "text-slate-800 dark:text-white"}`}>
              {classData.isFree 
                ? "Free Class" 
                : `LKR ${Number(classData.fee || 0).toLocaleString()} (${classData.billingType === "fixed_months" ? `${classData.durationMonths} Months Plan` : "Monthly"})`
              }
            </span>
          </div>

          {/* Student Capacity / Batch Limit */}
          <div className="flex justify-between">
            <span className="text-slate-500 font-medium">Student Limit:</span>
            <span className="font-bold text-slate-800 dark:text-white">
              {classData.hasBatchLimit ? `${classData.batchLimit} Students Maximum` : "Unlimited Seats"}
            </span>
          </div>

          {classData.description && (
            <div className="flex flex-col gap-1 pt-1 border-t dark:border-slate-800">
              <span className="text-slate-500 font-medium">Description:</span>
              <span className="text-slate-700 dark:text-slate-300 italic">{classData.description}</span>
            </div>
          )}

          {classData.coverImageFile && (
            <div className="flex justify-between items-center pt-1 border-t dark:border-slate-800">
              <span className="text-slate-500 font-medium">Cover Photo:</span>
              <span className="text-blue-600 dark:text-blue-400 font-semibold truncate max-w-[200px]">{classData.coverImageFile.name}</span>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2.5 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 font-bold text-xs rounded-xl transition-all bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-5 py-2 font-bold text-xs bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-sm transition-all shadow-blue-600/20"
          >
            Confirm & Create
          </button>
        </div>
      </div>
    </div>
  );
}