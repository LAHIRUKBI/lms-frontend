// src/app/teacher/materials/my-pdfs/page.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { 
  FileStack, 
  BookOpen, 
  Loader2, 
  Eye, 
  Trash2, 
  AlertCircle, 
  Globe, 
  Search, 
  FileText, 
  Calendar, 
  X, 
  Check, 
  Gift, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Folder as FolderIcon, 
  FolderPlus, 
  ArrowLeft, 
  Edit2, 
  Move 
} from "lucide-react"; 
import { useTheme } from "@/app/context/ThemeContext";
import PublishSuccessPopup from "@/app/components/PublishSuccessPopup";
import DeleteConfirmPopup from "@/app/components/MeterialsDeleteConfirmPopup";
import MaterialUploadModal from "@/app/components/MaterialUploadModal";

const getImageUrl = (imageSource: any) => {
  if (!imageSource) return null;
  const rawUrl = typeof imageSource === "object" ? imageSource.url : imageSource;
  if (!rawUrl || typeof rawUrl !== "string") return null;
  return rawUrl.startsWith("http") ? rawUrl : `${process.env.NEXT_PUBLIC_API_URL}${rawUrl}`;
};

const getPdfViewUrl = (fileUrl: string) => {
  if (!fileUrl) return "#";
  return fileUrl.startsWith("http") ? fileUrl : `${process.env.NEXT_PUBLIC_API_URL}${fileUrl}`;
};

export default function MyPDFsPage() {
  const [pdfs, setPdfs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { darkMode } = useTheme();

  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const [isPublishPopupOpen, setIsPublishPopupOpen] = useState(false);
  const [publishedItemName, setPublishedItemName] = useState("");
  const [deleteItem, setDeleteItem] = useState<any>(null);

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;

  // Publishing Modals
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [selectedPdfForPublish, setSelectedPdfForPublish] = useState<any>(null);
  const [selectedFolderForPublish, setSelectedFolderForPublish] = useState<any>(null);

  const [teacherClasses, setTeacherClasses] = useState<any[]>([]);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [isFreeChecked, setIsFreeChecked] = useState(false);

  // Folder Management States
  const [folders, setFolders] = useState<any[]>([]);
  const [currentFolder, setCurrentFolder] = useState<any | null>(null);
  const [folderHistory, setFolderHistory] = useState<any[]>([]);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [folderNameInput, setFolderNameInput] = useState("");
  const [renamingFolder, setRenamingFolder] = useState<any | null>(null);

  const [movingMaterial, setMovingMaterial] = useState<any | null>(null);
  const [targetMoveFolderId, setTargetMoveFolderId] = useState<string>("");

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    await Promise.all([fetchPdfs(), fetchFolders(), fetchTeacherClasses()]);
    setLoading(false);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab, currentFolder]);

  const fetchPdfs = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/materials/my-materials`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPdfs(res.data.filter((m: any) => m.type === "pdf" || m.type === "paper"));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchFolders = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/folders/my-folders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFolders(res.data);
    } catch (err) {
      console.error("Error fetching folders:", err);
    }
  };

  const fetchTeacherClasses = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/classes/my-classes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTeacherClasses(res.data);
    } catch (err) {
      console.error("Error fetching teacher classes:", err);
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderNameInput.trim()) return;
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/folders/create`, {
        name: folderNameInput,
        parentFolderId: currentFolder ? currentFolder._id : null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFolderNameInput("");
      setIsCreateFolderOpen(false);
      fetchFolders();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to create folder");
    }
  };

  const handleRenameFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderNameInput.trim() || !renamingFolder) return;
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/api/folders/${renamingFolder._id}/rename`, {
        name: folderNameInput
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRenamingFolder(null);
      setFolderNameInput("");
      fetchFolders();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to rename folder");
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm("Are you sure you want to delete this folder? All contents will be moved to the upper directory.")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/folders/${folderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchFolders();
      fetchPdfs();
    } catch (err) {
      alert("Failed to delete folder");
    }
  };

  const handleMoveMaterialConfirm = async () => {
    if (!movingMaterial) return;
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/api/folders/move-material/${movingMaterial._id}`, {
        folderId: targetMoveFolderId === "" ? null : targetMoveFolderId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMovingMaterial(null);
      fetchPdfs();
      fetchFolders();
    } catch (err) {
      alert("Failed to move document");
    }
  };

  const enterFolder = (folder: any) => {
    setFolderHistory([...folderHistory, folder]);
    setCurrentFolder(folder);
    setCurrentPage(1);
  };

  const navigateUp = () => {
    const newHistory = [...folderHistory];
    newHistory.pop();
    setFolderHistory(newHistory);
    setCurrentFolder(newHistory.length > 0 ? newHistory[newHistory.length - 1] : null);
    setCurrentPage(1);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteItem) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/materials/${deleteItem._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPdfs(pdfs.filter((pdf) => pdf._id !== deleteItem._id));
      setDeleteItem(null);
      fetchFolders();
    } catch (err) {
      alert("An error occurred while deleting the material.");
    }
  };

  const openPublishModal = (pdf: any) => {
    setSelectedFolderForPublish(null);
    setSelectedPdfForPublish(pdf);
    setSelectedClassIds(pdf.classIds ? pdf.classIds.map((c: any) => c._id || c) : []);
    setIsFreeChecked(pdf.isFree || false);
    setPublishModalOpen(true);
  };

  const openFolderPublishModal = (folder: any) => {
    setSelectedPdfForPublish(null);
    setSelectedFolderForPublish(folder);
    setSelectedClassIds(folder.classIds ? folder.classIds.map((c: any) => c._id || c) : []);
    setIsFreeChecked(folder.isFree || false);
    setPublishModalOpen(true);
  };

  const handleConfirmPublish = async () => {
    const token = localStorage.getItem("token");
    try {
      if (selectedPdfForPublish) {
        const res = await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/api/materials/${selectedPdfForPublish._id}/publish`, {
          classIds: selectedClassIds,
          isFree: isFreeChecked
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });

        setPdfs(pdfs.map(pdf => pdf._id === selectedPdfForPublish._id ? res.data.material : pdf));
        setPublishedItemName(selectedPdfForPublish.title);
        fetchFolders(); // Parent folders වල state එකද refresh කිරීම
      } else if (selectedFolderForPublish) {
        const res = await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/api/folders/${selectedFolderForPublish._id}/publish`, {
          classIds: selectedClassIds,
          isFree: isFreeChecked
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });

        setFolders(folders.map(f => f._id === selectedFolderForPublish._id ? res.data.folder : f));
        setPublishedItemName(`Folder: ${selectedFolderForPublish.name}`);
        fetchPdfs();
        fetchFolders();
      }

      setPublishModalOpen(false);
      setSelectedPdfForPublish(null);
      setSelectedFolderForPublish(null);
      setIsPublishPopupOpen(true);
    } catch (err: any) {
      alert(err.response?.data?.message || "An error occurred while publishing.");
    }
  };

  const handleUnpublish = async (id: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/api/materials/${id}/publish`, {
        classIds: [],
        isFree: false
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPdfs(pdfs.map(pdf => pdf._id === id ? res.data.material : pdf));
      fetchFolders(); // Parent folder unpublish state එකට පත් කිරීම
    } catch (err: any) {
      alert("Failed to unpublish.");
    }
  };

  const handleFolderUnpublish = async (folderId: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/api/folders/${folderId}/publish`, {
        classIds: [],
        isFree: false
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFolders(folders.map(f => f._id === folderId ? res.data.folder : f));
      fetchPdfs();
      fetchFolders();
    } catch (err) {
      alert("Failed to unpublish folder.");
    }
  };

  const handleRemoveSingleClass = async (pdf: any, classIdToRemove: string) => {
    try {
      const updatedClassIds = (pdf.classIds || []).map((c: any) => c._id || c).filter((id: string) => id !== classIdToRemove);
      const token = localStorage.getItem("token");

      const res = await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/api/materials/${pdf._id}/publish`, {
        classIds: updatedClassIds,
        isFree: pdf.isFree
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setPdfs(pdfs.map(item => item._id === pdf._id ? res.data.material : item));
      fetchFolders();
    } catch (err: any) {
      alert("Failed to remove class.");
    }
  };

  const toggleClassSelection = (classId: string) => {
    if (selectedClassIds.includes(classId)) {
      setSelectedClassIds(selectedClassIds.filter(id => id !== classId));
    } else {
      setSelectedClassIds([...selectedClassIds, classId]);
    }
  };

  const currentLevelFolders = useMemo(() => {
    return folders.filter((f) => {
      if (!currentFolder) return !f.parentFolderId;
      return f.parentFolderId === currentFolder._id;
    });
  }, [folders, currentFolder]);

  const filteredPdfs = useMemo(() => {
    return pdfs.filter((pdf) => {
      const matchesSearch = 
        pdf.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        pdf.subject.toLowerCase().includes(searchTerm.toLowerCase());

      let matchesTab = true;
      if (activeTab === "published") matchesTab = pdf.isPublished;
      else if (activeTab === "approved") matchesTab = pdf.status === "approved" && !pdf.isPublished;
      else if (activeTab === "pending") matchesTab = pdf.status === "pending";
      else if (activeTab === "rejected") matchesTab = pdf.status === "rejected";

      const matchesFolder = currentFolder 
        ? pdf.folderId === currentFolder._id 
        : (!pdf.folderId);

      return matchesSearch && matchesTab && matchesFolder;
    });
  }, [pdfs, searchTerm, activeTab, currentFolder]);

  const totalPages = Math.ceil(filteredPdfs.length / itemsPerPage);
  const paginatedPdfs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPdfs.slice(start, start + itemsPerPage);
  }, [filteredPdfs, currentPage]);

  const tabs = [
    { id: "all", label: "All Files" },
    { id: "published", label: "Published" },
    { id: "approved", label: "Ready to Publish" },
    { id: "pending", label: "Pending" },
    { id: "rejected", label: "Rejected" },
  ];

  return (
    <div className={`p-4 sm:p-6 min-h-screen transition-colors duration-300 font-sans w-full overflow-x-hidden ${darkMode ? "bg-slate-950" : "bg-slate-50/80"}`}>

      <PublishSuccessPopup 
        isOpen={isPublishPopupOpen} 
        onClose={() => setIsPublishPopupOpen(false)} 
        itemName={publishedItemName}
      />

      <DeleteConfirmPopup 
        isOpen={!!deleteItem} 
        onClose={() => setDeleteItem(null)} 
        onConfirm={handleDeleteConfirm}
        title="Delete Document"
        itemName={deleteItem?.title}
      />

      <MaterialUploadModal 
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={() => {
          fetchPdfs();
          fetchFolders();
        }}
        currentFolderId={currentFolder?._id || null}
      />

      {/* Create / Rename Folder Modal */}
      {(isCreateFolderOpen || renamingFolder) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`w-full max-w-sm p-5 rounded-2xl shadow-xl border ${darkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"}`}>
            <h3 className="text-sm sm:text-base font-extrabold mb-2">
              {renamingFolder ? "Rename Folder" : "Create New Folder"}
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              {renamingFolder ? "Enter the new name for this folder." : currentFolder ? `Creating sub-folder inside "${currentFolder.name}"` : "Create a folder in the main directory."}
            </p>
            <form onSubmit={renamingFolder ? handleRenameFolder : handleCreateFolder}>
              <input 
                type="text" 
                value={folderNameInput} 
                onChange={(e) => setFolderNameInput(e.target.value)} 
                placeholder="e.g. 2024 Revision Papers"
                required
                className={`w-full px-3 py-2 rounded-xl text-xs border outline-none mb-4 focus:ring-2 focus:ring-orange-500 ${darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-300 text-slate-900"}`} 
              />
              <div className="flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => { setIsCreateFolderOpen(false); setRenamingFolder(null); }} 
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg ${darkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700"}`}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-1.5 text-xs font-bold rounded-lg bg-orange-600 hover:bg-orange-700 text-white shadow-sm"
                >
                  {renamingFolder ? "Update Name" : "Create Folder"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Move Material Modal */}
      {movingMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`w-full max-w-sm p-5 rounded-2xl shadow-xl border ${darkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"}`}>
            <h3 className="text-sm sm:text-base font-extrabold mb-1">Move Document</h3>
            <p className="text-xs text-slate-400 mb-3 truncate">
              Move <b>{movingMaterial.title}</b> to:
            </p>
            <select 
              value={targetMoveFolderId} 
              onChange={(e) => setTargetMoveFolderId(e.target.value)}
              className={`w-full px-3 py-2 rounded-xl text-xs border outline-none mb-4 focus:ring-2 focus:ring-orange-500 ${darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-300 text-slate-900"}`}
            >
              <option value="">📁 Main Directory (Root / No Folder)</option>
              {folders.map(f => (
                <option key={f._id} value={f._id}>📁 {f.name}</option>
              ))}
            </select>
            <div className="flex justify-end gap-2">
              <button 
                type="button" 
                onClick={() => setMovingMaterial(null)} 
                className={`px-3 py-1.5 text-xs font-bold rounded-lg ${darkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700"}`}
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleMoveMaterialConfirm} 
                className="px-4 py-1.5 text-xs font-bold rounded-lg bg-orange-600 hover:bg-orange-700 text-white shadow-sm"
              >
                Move Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Class Selection & Free Option Modal for Publishing (PDF OR FOLDER) */}
      {publishModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`w-full max-w-md p-4 sm:p-5 rounded-2xl shadow-2xl border ${darkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"}`}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm sm:text-base font-extrabold">
                {selectedFolderForPublish ? `Publish Folder: ${selectedFolderForPublish.name}` : "Select Classes & Access to Publish"}
              </h3>
              <button onClick={() => setPublishModalOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-500/10">
                <X size={18} />
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mb-3">
              {selectedFolderForPublish 
                ? "Publishing this folder will publish all approved PDFs inside it to the selected classes."
                : "Choose classes where this document should be published, or make it Free for everyone."}
            </p>

            <div 
              onClick={() => setIsFreeChecked(!isFreeChecked)}
              className={`mb-4 p-3 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                isFreeChecked 
                  ? (darkMode ? "bg-emerald-500/10 border-emerald-500/50 text-white" : "bg-emerald-50 border-emerald-300 text-slate-900")
                  : (darkMode ? "bg-slate-800/50 border-slate-800 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-700")
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`p-1.5 rounded-lg ${isFreeChecked ? "bg-emerald-600 text-white" : "bg-slate-500/20 text-slate-400"}`}>
                  <Gift size={16} />
                </div>
                <div>
                  <h4 className="font-bold text-xs">Make it Free (Public)</h4>
                  <p className="text-[10px] opacity-70">Visible to registered and unregistered students.</p>
                </div>
              </div>
              <div className={`w-4 h-4 rounded-md flex items-center justify-center border ${isFreeChecked ? "bg-emerald-600 border-emerald-600 text-white" : "border-slate-400"}`}>
                {isFreeChecked && <Check size={12} />}
              </div>
            </div>

            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Select Classes</div>
            {teacherClasses.length === 0 ? (
              <p className="text-xs text-center py-3 text-slate-500">No classes created yet.</p>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 mb-4">
                {teacherClasses.map((cls) => {
                  const isSelected = selectedClassIds.includes(cls._id);
                  const classNameToDisplay = cls.grade === "Other" ? (cls.customGradeName || "Other") : cls.grade;

                  return (
                    <div 
                      key={cls._id} 
                      onClick={() => toggleClassSelection(cls._id)}
                      className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                        isSelected 
                          ? (darkMode ? "bg-orange-500/10 border-orange-500/50 text-white" : "bg-orange-50 border-orange-300 text-slate-900")
                          : (darkMode ? "bg-slate-800/50 border-slate-800 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-700")
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs">{classNameToDisplay}</span>
                          <span className="text-[10px] opacity-70">({cls.medium} {cls.mode})</span>
                        </div>
                        <p className="text-[10px] opacity-60 mt-0.5">{cls.day} | {cls.startTime} - {cls.endTime}</p>
                      </div>
                      <div className={`w-4 h-4 rounded-md flex items-center justify-center border ${isSelected ? "bg-orange-600 border-orange-600 text-white" : "border-slate-400"}`}>
                        {isSelected && <Check size={12} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button onClick={() => setPublishModalOpen(false)} className={`px-4 py-2 rounded-xl text-xs font-bold ${darkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700"}`}>
                Cancel
              </button>
              <button 
                onClick={handleConfirmPublish}
                disabled={selectedClassIds.length === 0 && !isFreeChecked}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50 shadow-md shadow-orange-600/20"
              >
                Publish Now
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-6xl mx-auto px-1 sm:px-0">
        <div className="mb-6 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl shadow-sm shrink-0 ${darkMode ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" : "bg-white text-orange-600 border border-orange-100"}`}>
                <FileStack size={20} strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <h2 className={`text-base sm:text-2xl font-extrabold tracking-tight truncate ${darkMode ? "text-white" : "text-slate-900"}`}>
                  My Documents
                </h2>
                <p className={`mt-0.5 text-[10px] sm:text-xs font-medium truncate ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                  Manage, organize in folders, and publish your uploaded PDFs, Papers, and entire Folders.
                </p>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-2 shrink-0">
              <button
                onClick={() => { setFolderNameInput(""); setIsCreateFolderOpen(true); }}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-orange-500/30 text-orange-600 dark:text-orange-400 bg-orange-500/10 hover:bg-orange-500/20 transition-all active:scale-[0.98]"
              >
                <FolderPlus size={16} /> New Folder
              </button>
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white shadow-md shadow-orange-600/20 transition-all active:scale-[0.98]"
              >
                <Plus size={16} /> Add PDF and Papers
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
            <div className="grid grid-cols-2 gap-2 w-full sm:hidden">
              <button
                onClick={() => { setFolderNameInput(""); setIsCreateFolderOpen(true); }}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold border border-orange-500/30 text-orange-600 dark:text-orange-400 bg-orange-500/10"
              >
                <FolderPlus size={16} /> New Folder
              </button>
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white shadow-md shadow-orange-600/20"
              >
                <Plus size={16} /> Add PDF & Papers
              </button>
            </div>

            <div className="relative w-full">
              <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${darkMode ? "text-slate-500" : "text-slate-400"}`} />
              <input 
                type="text" 
                placeholder="Search documents by title or subject..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-3.5 py-2.5 sm:py-2 rounded-xl border text-xs font-medium transition-all focus:outline-none focus:ring-2 focus:ring-orange-500/50 ${
                  darkMode ? "bg-slate-900 border-slate-800 text-slate-200 placeholder-slate-500" : "bg-white border-slate-200 text-slate-800 placeholder-slate-400 shadow-sm"
                }`}
              />
            </div>
          </div>
        </div>

        {/* Breadcrumbs Navigation */}
        <div className="flex items-center gap-2 mb-4 p-2.5 rounded-xl border text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 overflow-x-auto shadow-sm">
          <button 
            onClick={() => { setCurrentFolder(null); setFolderHistory([]); }}
            className={`font-bold flex items-center gap-1 transition-colors ${!currentFolder ? "text-orange-600" : "text-slate-400 hover:text-orange-500"}`}
          >
            Root Directory
          </button>
          {folderHistory.map((folder, idx) => (
            <div key={folder._id} className="flex items-center gap-1.5 shrink-0">
              <span className="text-slate-400">/</span>
              <button 
                onClick={() => {
                  const sliced = folderHistory.slice(0, idx + 1);
                  setFolderHistory(sliced);
                  setCurrentFolder(folder);
                }}
                className={`font-bold transition-colors ${idx === folderHistory.length - 1 ? "text-orange-600" : "text-slate-400 hover:text-orange-500"}`}
              >
                {folder.name}
              </button>
            </div>
          ))}
          {currentFolder && (
            <button 
              onClick={navigateUp} 
              className="ml-auto flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-orange-500 px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft size={13} /> Back
            </button>
          )}
        </div>

        {/* Folders List Grid (With Publish & Unpublish Controls) */}
        {currentLevelFolders.length > 0 && (
          <div className="mb-6">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">
              Folders ({currentLevelFolders.length})
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {currentLevelFolders.map((f) => (
                <div 
                  key={f._id} 
                  onClick={() => enterFolder(f)}
                  className={`group relative p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-2.5 shadow-sm ${
                    darkMode 
                      ? "bg-slate-900/80 border-slate-800 hover:border-orange-500/50" 
                      : "bg-white border-slate-200 hover:border-orange-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 truncate min-w-0">
                      <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500 shrink-0">
                        <FolderIcon size={16} />
                      </div>
                      <span className="text-xs font-bold truncate">{f.name}</span>
                    </div>

                    <div 
                      className="flex items-center gap-1 shrink-0" 
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button 
                        onClick={() => openFolderPublishModal(f)} 
                        className={`p-1.5 rounded-lg border text-[11px] font-bold flex items-center gap-1 transition-all ${
                          f.isPublished 
                            ? "bg-blue-600 text-white border-blue-600" 
                            : "bg-orange-600/10 hover:bg-orange-600 text-orange-600 hover:text-white border-orange-500/20"
                        }`}
                        title="Publish this entire folder"
                      >
                        <Globe size={11} /> {f.isPublished ? "Edit" : "Publish"}
                      </button>

                      {f.isPublished && (
                        <button 
                          onClick={() => handleFolderUnpublish(f._id)}
                          className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-500 text-[10px] font-bold border border-rose-500/20"
                          title="Unpublish folder"
                        >
                          Unpublish
                        </button>
                      )}

                      <button 
                        onClick={() => { setRenamingFolder(f); setFolderNameInput(f.name); }} 
                        className="p-1.5 rounded-lg hover:bg-slate-500/10 text-slate-400 hover:text-orange-500" 
                        title="Rename"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button 
                        onClick={() => handleDeleteFolder(f._id)} 
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-500" 
                        title="Delete"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Folder Publish Badges */}
                  {f.isPublished && (
                    <div className="flex flex-wrap items-center gap-1 pt-1.5 border-t border-slate-100 dark:border-slate-800 text-[10px]">
                      {f.isFree && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold flex items-center gap-1">
                          <Gift size={9} /> Free
                        </span>
                      )}
                      {f.classIds && f.classIds.map((cls: any) => (
                        <span key={cls._id || cls} className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-bold">
                          {cls.grade === "Other" ? cls.customGradeName : cls.grade || "Class"}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="mb-5">
          <div className="grid grid-cols-2 gap-2 sm:hidden">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-center truncate ${
                  activeTab === tab.id
                    ? "bg-orange-600 text-white shadow-md shadow-orange-600/20"
                    : (darkMode ? "bg-slate-900 text-slate-400 border border-slate-800" : "bg-white text-slate-600 border border-slate-200 shadow-sm")
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="hidden sm:flex overflow-x-auto gap-1.5 pb-2 scrollbar-none">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? "bg-orange-600 text-white shadow-md shadow-orange-600/20"
                    : (darkMode ? "bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 shadow-sm")
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col justify-center items-center h-48 gap-2">
            <Loader2 className="animate-spin text-orange-500" size={30} />
            <span className={`text-xs font-medium ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Loading documents...</span>
          </div>
        ) : filteredPdfs.length === 0 ? (
          <div className={`py-12 px-4 flex flex-col items-center justify-center text-center rounded-2xl border ${darkMode ? "bg-slate-900/50 border-slate-800" : "bg-white border-slate-200 shadow-sm"}`}>
            <FileStack size={36} className="text-slate-400 mb-2 opacity-60" />
            <h3 className={`text-sm font-bold mb-0.5 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>No documents found</h3>
            <p className="text-xs text-slate-400">
              {currentFolder ? "This folder is empty or no documents match your filters." : "Try changing your search terms or filter tabs."}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3.5">
              {paginatedPdfs.map((pdf) => {
                const coverSrc = getImageUrl(pdf.coverImage) || getImageUrl(pdf.thumbnail);

                return (
                  <div 
                    key={pdf._id} 
                    className={`group flex flex-col gap-3 p-4 rounded-2xl border transition-all ${
                      darkMode ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200 shadow-sm"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                        <div className={`relative w-12 h-16 sm:w-14 sm:h-18 rounded-xl overflow-hidden flex-shrink-0 border flex items-center justify-center ${darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-100 border-slate-200"}`}>
                          {coverSrc ? (
                            <img 
                              src={coverSrc} 
                              alt={pdf.title} 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center text-orange-500">
                              <FileText size={18} />
                              <span className="text-[8px] font-bold mt-0.5 uppercase">PDF</span>
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                            <h3 className={`font-bold text-xs sm:text-sm truncate max-w-full ${darkMode ? "text-slate-200" : "text-slate-800"}`}>{pdf.title}</h3>
                            {pdf.status === 'pending' && <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">Pending</span>}
                            {pdf.status === 'approved' && !pdf.isPublished && <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">Ready to Publish</span>}
                            {pdf.status === 'rejected' && <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-red-500/10 text-red-400">Rejected</span>}
                            {pdf.isPublished && <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 flex items-center gap-1"><Globe size={9} /> Published</span>}
                            {pdf.isFree && <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 flex items-center gap-1"><Gift size={9} /> Free</span>}
                          </div>

                          <div className={`flex items-center flex-wrap gap-x-2.5 gap-y-1 text-[11px] font-medium ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                            <span className="flex items-center gap-1"><BookOpen size={11} className="shrink-0" /> {pdf.subject}</span>
                            {pdf.grade && <span>• {pdf.grade}</span>}
                            <span className="flex items-center gap-1"><Calendar size={11} className="shrink-0" /> {new Date(pdf.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end sm:justify-start gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                        <button 
                          onClick={() => { setMovingMaterial(pdf); setTargetMoveFolderId(pdf.folderId || ""); }}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-bold text-[11px] border border-slate-200 dark:border-slate-700 hover:bg-slate-500/10 transition-colors"
                          title="Move to another folder"
                        >
                          <Move size={12} /> <span className="hidden sm:inline">Move</span>
                        </button>

                        {pdf.status === 'approved' && (
                          <>
                            <button 
                              onClick={() => openPublishModal(pdf)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-xl font-bold text-[11px] bg-orange-600 hover:bg-orange-700 text-white shadow-sm shadow-orange-600/20"
                            >
                              <Globe size={12} /> {pdf.isPublished ? "Edit" : "Publish"}
                            </button>

                            {pdf.isPublished && (
                              <button 
                                onClick={() => handleUnpublish(pdf._id)}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-bold text-[11px] bg-rose-600/10 hover:bg-rose-600 text-rose-500 hover:text-white transition-all border border-rose-500/20"
                                title="Unpublish Completely"
                              >
                                Unpublish
                              </button>
                            )}
                          </>
                        )}

                        <a 
                          href={getPdfViewUrl(pdf.fileUrl)} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] font-bold flex items-center gap-1 hover:bg-slate-500/10"
                        >
                          <Eye size={13} /> View
                        </a>

                        <button onClick={() => setDeleteItem(pdf)} className="p-2 rounded-xl text-rose-500 hover:bg-rose-500/10">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    {pdf.status === 'rejected' && (pdf.rejectReason || pdf.adminRejectReason || pdf.reason) && (
                      <div className={`mt-1 p-2.5 rounded-xl border text-[11px] flex items-start gap-1.5 ${darkMode ? "bg-red-500/10 border-red-500/20 text-red-300" : "bg-red-50 border-red-200 text-red-700"}`}>
                        <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="font-bold block mb-0.5">Rejection Reason:</span>
                          <span>{pdf.rejectReason || pdf.adminRejectReason || pdf.reason}</span>
                        </div>
                      </div>
                    )}

                    {pdf.isPublished && ((pdf.classIds && pdf.classIds.length > 0) || pdf.isFree) && (
                      <div className={`mt-1 pt-2.5 border-t flex flex-wrap items-center gap-1.5 ${darkMode ? "border-slate-800" : "border-slate-100"}`}>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Published to:</span>

                        {pdf.isFree && (
                          <span className="text-[10px] px-2 py-0.5 rounded-lg font-bold border flex items-center gap-1 bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
                            <Gift size={10} /> Free Page
                            <button 
                              onClick={async () => {
                                const token = localStorage.getItem("token");
                                const res = await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/api/materials/${pdf._id}/publish`, {
                                  classIds: pdf.classIds.map((c: any) => c._id || c),
                                  isFree: false
                                }, { headers: { Authorization: `Bearer ${token}` } });
                                setPdfs(pdfs.map(item => item._id === pdf._id ? res.data.material : item));
                                fetchFolders();
                              }}
                              className="hover:bg-emerald-500/20 rounded p-0.5 ml-0.5"
                              title="Remove from Free"
                            >
                              <X size={10} />
                            </button>
                          </span>
                        )}

                        {pdf.classIds && pdf.classIds.map((cls: any) => {
                          const classId = cls._id || cls;
                          const className = cls.grade === "Other" ? (cls.customGradeName || "Other") : cls.grade;
                          const displayTitle = className ? `${className} ${cls.medium || ""} (${cls.mode || ""})`.trim() : "Class";
                          
                          return (
                            <span key={classId} className={`text-[10px] px-2 py-0.5 rounded-lg font-bold border flex items-center gap-1 ${darkMode ? "bg-slate-800 border-slate-700 text-orange-400" : "bg-orange-50 border-orange-200 text-orange-700"}`}>
                              {displayTitle}
                              <button 
                                onClick={() => handleRemoveSingleClass(pdf, classId)}
                                className="hover:bg-orange-500/20 rounded p-0.5 ml-0.5"
                                title="Remove from this class"
                              >
                                <X size={10} />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
                <span className={`text-xs font-medium text-center sm:text-left ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                  Showing page <span className="font-bold">{currentPage}</span> of <span className="font-bold">{totalPages}</span> ({filteredPdfs.length} total items)
                </span>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-center">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className={`flex items-center justify-center gap-1 px-4 py-2 rounded-xl text-xs font-bold transition-all border flex-1 sm:flex-initial ${
                      currentPage === 1 
                        ? "opacity-40 cursor-not-allowed border-slate-300 dark:border-slate-800" 
                        : (darkMode ? "bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-sm")
                    }`}
                  >
                    <ChevronLeft size={14} /> Previous
                  </button>

                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className={`flex items-center justify-center gap-1 px-4 py-2 rounded-xl text-xs font-bold transition-all border flex-1 sm:flex-initial ${
                      currentPage === totalPages 
                        ? "opacity-40 cursor-not-allowed border-slate-300 dark:border-slate-800" 
                        : (darkMode ? "bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-sm")
                    }`}
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}