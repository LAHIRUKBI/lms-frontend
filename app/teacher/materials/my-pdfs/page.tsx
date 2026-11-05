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
  Move,
  Files,
  Home,
  CheckCircle2,
  CheckSquare,
  Square,
  FolderOpen
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

  // Multiple PDF selection and bulk move states
  const [selectedPdfIds, setSelectedPdfIds] = useState<string[]>([]);
  const [isBulkMoveOpen, setIsBulkMoveOpen] = useState(false);
  const [isBulkMoving, setIsBulkMoving] = useState(false);

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
      setSelectedPdfIds((prev) => prev.filter((id) => id !== movingMaterial._id));
      fetchPdfs();
      fetchFolders();
    } catch (err) {
      alert("Failed to move document");
    }
  };

  // Move multiple selected PDFs using the existing single-material API.
  // Promise.allSettled allows successful moves to complete even if one fails.
  const handleBulkMoveConfirm = async () => {
    if (selectedPdfIds.length === 0 || isBulkMoving) return;

    setIsBulkMoving(true);

    try {
      const token = localStorage.getItem("token");
      const destinationFolderId = targetMoveFolderId === "" ? null : targetMoveFolderId;

      const failedIds: string[] = [];
      let movedCount = 0;

      // Process up to five documents at a time to avoid sending too many
      // simultaneous requests when a large number of PDFs is selected.
      for (let index = 0; index < selectedPdfIds.length; index += 5) {
        const batchIds = selectedPdfIds.slice(index, index + 5);

        const results = await Promise.allSettled(
          batchIds.map((materialId) =>
            axios.put(
              `${process.env.NEXT_PUBLIC_API_URL}/api/folders/move-material/${materialId}`,
              { folderId: destinationFolderId },
              { headers: { Authorization: `Bearer ${token}` } }
            )
          )
        );

        results.forEach((result, batchIndex) => {
          if (result.status === "fulfilled") {
            movedCount += 1;
          } else {
            failedIds.push(batchIds[batchIndex]);
          }
        });
      }

      await Promise.all([fetchPdfs(), fetchFolders()]);

      // Keep only failed items selected so they can be retried.
      setSelectedPdfIds(failedIds);
      setIsBulkMoveOpen(false);
      setMovingMaterial(null);

      if (failedIds.length === 0) {
        alert(`${movedCount} document(s) moved successfully!`);
      } else {
        alert(
          `${movedCount} document(s) moved successfully. ${failedIds.length} document(s) could not be moved. The failed documents remain selected so you can retry.`
        );
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "An error occurred while moving the selected documents.");
    } finally {
      setIsBulkMoving(false);
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

  const togglePdfSelection = (pdfId: string) => {
    setSelectedPdfIds((prev) =>
      prev.includes(pdfId)
        ? prev.filter((id) => id !== pdfId)
        : [...prev, pdfId]
    );
  };

  // Flatten the folder tree for the native select while preserving its hierarchy
  // through indentation and branch markers (Root > Parent > Sub-folder).
  const moveFolderOptions = useMemo(() => {
    const options: any[] = [];
    const visited = new Set<string>();
    const childrenByParent = new Map<string, any[]>();

    folders.forEach((folder) => {
      const rawParentId = folder.parentFolderId;
      const parentId = rawParentId && typeof rawParentId === "object"
        ? String(rawParentId._id || "")
        : String(rawParentId || "");

      const siblings = childrenByParent.get(parentId) || [];
      siblings.push(folder);
      childrenByParent.set(parentId, siblings);
    });

    childrenByParent.forEach((children) => {
      children.sort((a, b) => String(a.name).localeCompare(String(b.name)));
    });

    const appendChildren = (parentId: string, depth: number) => {
      const children = childrenByParent.get(parentId) || [];

      children.forEach((child) => {
        const childId = String(child._id);
        if (visited.has(childId)) return;

        visited.add(childId);
        options.push({ ...child, depth });
        appendChildren(childId, depth + 1);
      });
    };

    // Start from Root Directory.
    appendChildren("", 0);

    // Keep any orphaned/cyclic records visible rather than hiding a teacher's folder.
    folders
      .filter((folder) => !visited.has(String(folder._id)))
      .sort((a, b) => String(a.name).localeCompare(String(b.name)))
      .forEach((folder) => {
        const folderId = String(folder._id);
        if (visited.has(folderId)) return;
        visited.add(folderId);
        options.push({ ...folder, depth: 0 });
        appendChildren(folderId, 1);
      });

    return options;
  }, [folders]);

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

  const visiblePdfIds = paginatedPdfs.map((pdf) => pdf._id);
  const allVisiblePdfsSelected =
    visiblePdfIds.length > 0 && visiblePdfIds.every((id) => selectedPdfIds.includes(id));
  const publishedPdfCount = pdfs.filter((pdf) => pdf.isPublished).length;
  const readyPdfCount = pdfs.filter((pdf) => pdf.status === "approved" && !pdf.isPublished).length;
  const pendingPdfCount = pdfs.filter((pdf) => pdf.status === "pending").length;

  return (
    <div className={`min-h-screen w-full overflow-x-hidden transition-colors duration-300 ${darkMode ? "bg-[#0b1628] text-[#e2e8f0]" : "bg-[#f4f4f1] text-[#22231f]"}`}>
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

      <div className="mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6 sm:py-8 lg:px-9">
        {/* Compact page header with overview cards aligned beside the main actions */}
        <header className={`mb-5 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-3 border-b pb-4 sm:gap-x-4 xl:grid-cols-[auto_minmax(0,1fr)_auto] ${darkMode ? "border-[#223650]" : "border-[#deded8]"}`}>
          <div className="col-start-1 row-start-1 flex items-center">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] border ${darkMode ? "border-[#30445f] bg-[#17263d] text-[#dbe5f1]" : "border-[#deded8] bg-white text-[#393a34]"}`}>
              <FileStack size={20} strokeWidth={1.8} />
            </div>
          </div>

          <div className="col-start-2 row-start-1 grid grid-cols-2 gap-1.5 sm:flex sm:items-center sm:justify-end sm:gap-2 xl:col-start-3">
            <button
              onClick={() => { setFolderNameInput(""); setIsCreateFolderOpen(true); }}
              className={`inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl border px-2.5 py-2 text-[10px] font-semibold transition-all hover:-translate-y-0.5 sm:min-h-10 sm:gap-2 sm:px-3.5 sm:text-xs ${darkMode ? "border-[#49658e] bg-[#1a2e4b] text-[#d7e5fb] hover:border-[#6684b2] hover:bg-[#243d60]" : "border-[#d9d9d2] bg-white text-[#34352f] hover:bg-[#f9f9f6]"}`}
            >
              <FolderPlus size={14} />
              New folder
            </button>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className={`inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl px-2.5 py-2 text-[10px] font-semibold shadow-sm transition-all hover:-translate-y-0.5 sm:min-h-10 sm:gap-2 sm:px-3.5 sm:text-xs ${darkMode ? "bg-[#a9c9f2] text-[#142944] shadow-[0_4px_14px_rgba(111,156,216,0.18)] hover:bg-[#c0d8f7]" : "bg-[#292a25] text-white hover:bg-[#41423b]"}`}
            >
              <Plus size={15} />
              Add documents
            </button>
          </div>

          {/* Overview cards are intentionally compact and share the header row on desktop. */}
          <section className="col-span-2 row-start-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4 sm:gap-2 xl:col-span-1 xl:col-start-2 xl:row-start-1">
            {[
              { label: "All documents", value: pdfs.length, note: "In your library", icon: Files },
              { label: "Published", value: publishedPdfCount, note: "Shared with learners", icon: Globe },
              { label: "Ready to publish", value: readyPdfCount, note: "Approved by admin", icon: CheckCircle2 },
              { label: "Under review", value: pendingPdfCount, note: "Awaiting approval", icon: Loader2 },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  title={item.note}
                  className={`flex min-h-[52px] min-w-0 items-center justify-between gap-1.5 rounded-[13px] border px-2.5 py-1.5 sm:min-h-[56px] sm:px-3 ${darkMode ? "border-[#2c4565] bg-[#14253c]" : "border-[#dfe3e9] bg-white"}`}
                >
                  <div className="min-w-0">
                    <span className={`block truncate text-[9px] font-medium sm:text-[10px] ${darkMode ? "text-[#a7b7cd]" : "text-[#777870]"}`}>{item.label}</span>
                    <span className="mt-0.5 block text-[19px] font-semibold leading-none tracking-[-0.05em] tabular-nums sm:text-[21px]">{item.value}</span>
                  </div>
                  <Icon size={13} strokeWidth={1.8} className={`shrink-0 ${darkMode ? "text-[#91a9c8]" : "text-[#858b95]"}`} />
                </div>
              );
            })}
          </section>
        </header>

        {/* Main workspace surface */}
        <section className={`overflow-hidden rounded-[28px] border shadow-[0_12px_40px_rgba(25,26,22,0.035)] ${darkMode ? "border-[#223650] bg-[#0f1b2e]" : "border-[#e0e0d9] bg-[#fdfdfa]"}`}>
          <div className={`border-b px-4 py-4 sm:px-6 ${darkMode ? "border-[#223650]" : "border-[#e7e7e1]"}`}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className={`mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${darkMode ? "text-[#8295b0]" : "text-[#92938a]"}`}>Your library</p>
                <div className="flex min-w-0 items-center gap-2 overflow-x-auto whitespace-nowrap text-xs">
                  <button
                    onClick={() => { setCurrentFolder(null); setFolderHistory([]); }}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 font-semibold transition-colors ${!currentFolder ? (darkMode ? "bg-[#223650] text-white" : "bg-[#e9e9e3] text-[#292a25]") : (darkMode ? "text-[#a7b7cd] hover:bg-[#1d304b]" : "text-[#85867d] hover:bg-[#f0f0eb]")}`}
                  >
                    <Home size={12} /> Root directory
                  </button>
                  {folderHistory.map((folder, idx) => (
                    <div key={folder._id} className="flex shrink-0 items-center gap-1.5">
                      <ChevronRight size={12} className={darkMode ? "text-[#6f829d]" : "text-[#b0b1a8]"} />
                      <button
                        onClick={() => {
                          const sliced = folderHistory.slice(0, idx + 1);
                          setFolderHistory(sliced);
                          setCurrentFolder(folder);
                        }}
                        className={`rounded-full px-2.5 py-1.5 font-semibold transition-colors ${idx === folderHistory.length - 1 ? (darkMode ? "bg-[#223650] text-white" : "bg-[#e9e9e3] text-[#292a25]") : (darkMode ? "text-[#a7b7cd] hover:bg-[#1d304b]" : "text-[#85867d] hover:bg-[#f0f0eb]")}`}
                      >
                        {folder.name}
                      </button>
                    </div>
                  ))}
                  {currentFolder && (
                    <button onClick={navigateUp} className={`ml-1 inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-semibold ${darkMode ? "text-[#c3cfdf] hover:bg-[#1d304b]" : "text-[#6d6e66] hover:bg-[#f0f0eb]"}`}>
                      <ArrowLeft size={12} /> Back
                    </button>
                  )}
                </div>
              </div>

              <div className="relative w-full lg:max-w-[360px]">
                <Search size={16} className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 ${darkMode ? "text-[#8295b0]" : "text-[#96978e]"}`} />
                <input
                  type="text"
                  placeholder="Search by title or subject..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`h-11 w-full rounded-2xl border pl-10 pr-4 text-xs outline-none transition-all focus:ring-2 focus:ring-[#92938a]/20 ${darkMode ? "border-[#2a3d58] bg-[#17263d] text-[#edf2f8] placeholder:text-[#8295b0] focus:border-[#8295b0]" : "border-[#e1e1db] bg-white text-[#30312b] placeholder:text-[#a0a198] focus:border-[#b8b9af]"}`}
                />
              </div>
            </div>
          </div>

          {/* Folder area */}
          {currentLevelFolders.length > 0 && (
            <div className={`border-b px-4 py-3 sm:px-6 ${darkMode ? "border-[#223650] bg-[#101e32]" : "border-[#d6e0ed] bg-[#eaf0f8]"}`}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold tracking-[-0.02em]">Folders</h2>
                  <p className={`mt-0.5 text-[10px] ${darkMode ? "text-[#a5b6cd]" : "text-[#64758d]"}`}>Open a folder to view what is inside.</p>
                </div>
                <span className={`rounded-full border px-2.5 py-1 text-[9px] font-semibold tabular-nums ${darkMode ? "border-[#456486] bg-[#1b3150] text-[#d6e6fb]" : "border-[#b9cbe2] bg-white text-[#294b75]"}`}>{currentLevelFolders.length} folders</span>
              </div>

              <div className="grid grid-cols-2 gap-x-2 gap-y-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                {currentLevelFolders.map((f) => (
                  <div key={f._id} className="group relative min-w-0 pt-[10px] transition-transform duration-200 hover:-translate-y-0.5">
                    {/* Raised folder tab. The body below completes the folder silhouette. */}
                    <div
                      aria-hidden="true"
                      className={`pointer-events-none absolute left-0 top-0 z-20 h-[19px] w-[57%] max-w-[108px] rounded-t-[10px] border border-b-0 ${darkMode ? "border-[#6385ad] bg-[#254568]" : "border-[#193f6d] bg-[#244f82]"}`}
                    />

                    {/* Entire folder-shaped card */}
                    <div
                      onClick={() => enterFolder(f)}
                      className={`relative z-10 min-h-[108px] min-w-0 cursor-pointer rounded-[13px] rounded-tl-[4px] border px-2.5 pb-2 pt-3 transition-all duration-200 ${darkMode ? "border-[#6385ad] bg-[#254568] text-[#f3f7fd] shadow-[0_4px_12px_rgba(0,0,0,0.22)] hover:border-[#88a9d0] hover:bg-[#2d527c]" : "border-[#193f6d] bg-[#244f82] text-white shadow-[0_4px_12px_rgba(31,71,120,0.2)] hover:border-[#315f96] hover:bg-[#2b5c94]"}`}
                    >
                      <div className="flex min-w-0 items-start gap-2">
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] border ${darkMode ? "border-[#7798c0] bg-[#3b6089] text-[#f7faff]" : "border-[#8eabd0] bg-[#dce9f8] text-[#1e4879]"}`}>
                          <FolderOpen size={17} strokeWidth={2} />
                        </div>

                        <div className="group/foldername relative min-w-0 flex-1" title={f.name}>
                          <h3 className="truncate text-[11px] font-bold leading-tight text-white">{f.name}</h3>
                          <p className={`mt-1 truncate text-[9px] ${darkMode ? "text-[#d0def0]" : "text-[#dbe8f8]"}`}>
                            {f.isPublished ? "Shared folder" : "Private folder"}
                          </p>
                          {/* Full folder name appears beneath the name when hovered. */}
                          <span className={`pointer-events-none absolute left-0 top-full z-50 mt-1.5 hidden max-w-[220px] whitespace-normal break-words rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold leading-4 shadow-xl group-hover/foldername:block ${darkMode ? "border-[#7898bd] bg-[#142942] text-[#f1f6fd]" : "border-[#315f91] bg-[#173b64] text-white"}`}>
                            {f.name}
                          </span>
                        </div>

                        <ChevronRight size={13} className={`mt-0.5 shrink-0 transition-transform group-hover:translate-x-0.5 ${darkMode ? "text-[#d1e0f2]" : "text-[#d9e7f8]"}`} />
                      </div>

                      <div className="mt-2 flex min-w-0 flex-wrap items-center gap-1" aria-label="Folder sharing status">
                        {f.isPublished && (
                          <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[8px] font-semibold ${darkMode ? "border-[#7898bd] bg-[#345777] text-[#f0f6ff]" : "border-[#87a4c8] bg-[#315f91] text-white"}`}>
                            <Globe size={8} className="mr-0.5" /> Published
                          </span>
                        )}
                        {f.isFree && (
                          <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[8px] font-semibold ${darkMode ? "border-[#7898bd] bg-[#345777] text-[#f0f6ff]" : "border-[#87a4c8] bg-[#315f91] text-white"}`}>
                            <Gift size={8} className="mr-0.5" /> Free
                          </span>
                        )}
                        {f.classIds && f.classIds.length > 0 && (
                          <span className={`text-[8px] ${darkMode ? "text-[#d0def0]" : "text-[#dbe8f8]"}`}>
                            {f.classIds.length} class{f.classIds.length === 1 ? "" : "es"}
                          </span>
                        )}
                      </div>

                      <div
                        className={`mt-2 flex flex-wrap items-center justify-end gap-1 border-t border-dashed pt-1.5 ${darkMode ? "border-[#6385ad]" : "border-[#7292b9]"}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => openFolderPublishModal(f)}
                          title={f.isPublished ? "Manage folder publishing" : "Publish folder"}
                          className={`rounded-md border px-2 py-1 text-[9px] font-bold leading-none shadow-sm transition-colors ${f.isPublished ? (darkMode ? "border-[#7898bd] bg-[#355778] text-[#f0f6ff] hover:border-[#a3bddc] hover:bg-[#416990]" : "border-[#9ab2d1] bg-[#dce9f8] text-[#1e4879] hover:border-[#7394bd] hover:bg-[#cbdcf0]") : "border-[#f0a04b] bg-[#d96b16] text-white shadow-[0_2px_7px_rgba(217,107,22,0.25)] hover:border-[#ffc078] hover:bg-[#ed7b20]"}`}
                        >
                          {f.isPublished ? "Manage" : "Publish"}
                        </button>

                        {f.isPublished && (
                          <button
                            onClick={() => handleFolderUnpublish(f._id)}
                            title="Unpublish folder"
                            aria-label="Unpublish folder"
                            className="rounded-md border border-[#a51f35] bg-[#b4233b] px-2 py-1 text-[9px] font-bold leading-none text-white shadow-[0_2px_7px_rgba(180,35,59,0.22)] transition-colors hover:border-[#d34a60] hover:bg-[#cf304b]"
                          >
                            Unpublish
                          </button>
                        )}

                        <button
                          onClick={() => { setRenamingFolder(f); setFolderNameInput(f.name); }}
                          title="Rename folder"
                          aria-label={`Rename ${f.name}`}
                          className={`rounded-md p-1.5 transition-colors ${darkMode ? "text-[#d5e4f7] hover:bg-[#416387] hover:text-white" : "text-[#dce9f8] hover:bg-[#3a6899] hover:text-white"}`}
                        >
                          <Edit2 size={11} />
                        </button>

                        <button
                          onClick={() => handleDeleteFolder(f._id)}
                          title="Delete folder"
                          aria-label={`Delete ${f.name}`}
                          className="rounded-md p-1.5 text-[#ffd5dc] transition-colors hover:bg-[#a51f35] hover:text-white"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Document controls */}
          <div className="px-4 pb-3.5 pt-4 sm:px-6">
            <div className="mb-3 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold tracking-[-0.03em]">Documents</h2>
                <p className={`mt-0.5 text-[11px] ${darkMode ? "text-[#94a3b8]" : "text-[#92938a]"}`}>
                  {currentFolder ? `Files inside ${currentFolder.name}` : "Files saved in your root directory"}
                </p>
              </div>
              <div className={`flex items-center gap-2 self-start rounded-full border px-3 py-2 text-[10px] font-semibold ${darkMode ? "border-[#2a3d58] bg-[#17263d] text-[#cbd5e1]" : "border-[#e3e3dc] bg-white text-[#77786f]"}`}>
                <FileText size={13} /> {filteredPdfs.length} matching file{filteredPdfs.length === 1 ? "" : "s"}
              </div>
            </div>

            <div className="mb-3 flex flex-col gap-2.5 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex max-w-full gap-1 overflow-x-auto rounded-2xl border p-1 scrollbar-none dark:border-[#2a3d58] dark:bg-[#17263d] border-[#e3e3dc] bg-[#f4f4f0]">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`shrink-0 rounded-xl px-3.5 py-2 text-[11px] font-semibold transition-all ${activeTab === tab.id ? (darkMode ? "bg-[#a9c9f2] text-[#142944] shadow-[0_2px_9px_rgba(111,156,216,0.2)]" : "bg-[#292a25] text-white shadow-sm") : (darkMode ? "text-[#b9cbe4] hover:bg-[#263e60] hover:text-[#edf5ff]" : "text-[#777870] hover:bg-white hover:text-[#30312b]")}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {filteredPdfs.length > 0 && (
                <button
                  onClick={() => {
                    if (allVisiblePdfsSelected) {
                      setSelectedPdfIds((prev) => prev.filter((id) => !visiblePdfIds.includes(id)));
                    } else {
                      setSelectedPdfIds((prev) => Array.from(new Set([...prev, ...visiblePdfIds])));
                    }
                  }}
                  className={`inline-flex min-h-9 items-center justify-center gap-2 self-start rounded-xl border px-3 py-2 text-[10px] font-semibold transition-colors xl:self-auto ${darkMode ? "border-[#49658e] bg-[#1a2e4b] text-[#cfe0fa] hover:border-[#6684b2] hover:bg-[#243d60]" : "border-[#deded7] text-[#66675f] hover:bg-white"}`}
                >
                  {allVisiblePdfsSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                  {allVisiblePdfsSelected ? "Deselect visible" : "Select visible"}
                </button>
              )}
            </div>

            {/* Bulk selection toolbar */}
            {selectedPdfIds.length > 0 && (
              <div className={`mb-4 flex flex-col gap-3 rounded-[18px] border p-3 sm:flex-row sm:items-center sm:justify-between ${darkMode ? "border-[#3a506e] bg-[#1d304b]" : "border-[#cfcfc7] bg-[#efefe9]"}`}>
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${darkMode ? "bg-[#29496e] text-[#e2efff]" : "bg-white text-[#34352f]"}`}>
                    <Check size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold">{selectedPdfIds.length} document{selectedPdfIds.length === 1 ? "" : "s"} selected</p>
                    <p className={`mt-0.5 text-[10px] ${darkMode ? "text-[#a7b7cd]" : "text-[#777870]"}`}>Move the selected files together to one folder.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setSelectedPdfIds([])} className={`flex-1 rounded-xl px-3 py-2 text-[11px] font-semibold sm:flex-none ${darkMode ? "text-[#c3d5f1] hover:bg-[#29486c]" : "text-[#777870] hover:bg-white"}`}>Clear</button>
                  <button
                    onClick={() => {
                      setMovingMaterial(null);
                      setTargetMoveFolderId("");
                      setIsBulkMoveOpen(true);
                    }}
                    className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-[10px] font-semibold sm:flex-none ${darkMode ? "bg-[#b5dfd4] text-[#173d3a] shadow-[0_3px_10px_rgba(114,190,171,0.12)] hover:bg-[#ccebe2]" : "bg-[#292a25] text-white hover:bg-[#41423b]"}`}
                  >
                    <Move size={13} /> Move selected
                  </button>
                </div>
              </div>
            )}

            {loading ? (
              <div className={`flex min-h-[260px] flex-col items-center justify-center rounded-[22px] border border-dashed ${darkMode ? "border-[#30445f] text-[#cbd5e1]" : "border-[#d9d9d2] text-[#777870]"}`}>
                <Loader2 size={26} className="mb-3 animate-spin" />
                <p className="text-xs font-semibold">Preparing your library</p>
                <p className="mt-1 text-[10px] opacity-70">Your documents will appear here shortly.</p>
              </div>
            ) : filteredPdfs.length === 0 ? (
              <div className={`flex min-h-[250px] flex-col items-center justify-center rounded-[22px] border border-dashed px-5 text-center ${darkMode ? "border-[#30445f] bg-[#111f33]" : "border-[#d9d9d2] bg-[#fafaf7]"}`}>
                <div className={`mb-3 flex h-14 w-14 items-center justify-center rounded-[20px] ${darkMode ? "bg-[#1d304b] text-[#c3cfdf]" : "bg-[#eeeeee] text-[#777870]"}`}>
                  <Files size={23} strokeWidth={1.6} />
                </div>
                <h3 className="text-sm font-semibold">Nothing here just yet</h3>
                <p className={`mt-1 max-w-sm text-[11px] leading-5 ${darkMode ? "text-[#a7b7cd]" : "text-[#85867d]"}`}>
                  {currentFolder ? "This folder is empty, or no documents match your current filters." : "Try another filter or add your first teaching document to the library."}
                </p>
                {!currentFolder && (
                  <button onClick={() => setIsUploadModalOpen(true)} className={`mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[11px] font-semibold ${darkMode ? "bg-[#a9c9f2] text-[#142944] hover:bg-[#c0d8f7]" : "bg-[#292a25] text-white"}`}>
                    <Plus size={14} /> Add documents
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {paginatedPdfs.map((pdf) => {
                    const coverSrc = getImageUrl(pdf.coverImage) || getImageUrl(pdf.thumbnail);
                    const isSelected = selectedPdfIds.includes(pdf._id);

                    return (
                      <article
                        key={pdf._id}
                        className={`group rounded-[18px] border p-3 transition-all sm:p-3.5 ${isSelected ? (darkMode ? "border-[#3a506e] bg-[#17263d]" : "border-[#b9bab0] bg-[#f9f9f5]") : (darkMode ? "border-[#223650] bg-[#111f33] hover:border-[#3a506e]" : "border-[#e4e4dd] bg-white hover:border-[#c9cac1]")}`}
                      >
                        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
                          <div className="flex min-w-0 flex-1 items-center gap-2.5">
                            <input
                              type="checkbox"
                              aria-label={`Select ${pdf.title}`}
                              checked={isSelected}
                              onChange={() => togglePdfSelection(pdf._id)}
                              className={`h-4 w-4 shrink-0 cursor-pointer rounded border-[#a8a99f] accent-[#a9c9f2] focus:ring-2 focus:ring-[#8fb5e8]/40 ${darkMode ? "bg-[#17263d]" : "bg-white"}`}
                            />
                            <div className={`relative flex h-[52px] w-[42px] shrink-0 items-center justify-center overflow-hidden rounded-[13px] border ${darkMode ? "border-[#30445f] bg-[#1d304b]" : "border-[#e2e2db] bg-[#f3f3ee]"}`}>
                              {coverSrc ? (
                                <img src={coverSrc} alt={pdf.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                              ) : (
                                <div className={`flex flex-col items-center gap-1 ${darkMode ? "text-[#dbe5f1]" : "text-[#777870]"}`}>
                                  <FileText size={18} strokeWidth={1.6} />
                                  <span className="text-[7px] font-bold tracking-widest">PDF</span>
                                </div>
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="mb-1 flex flex-wrap items-center gap-1.5">
                                <h3 className="max-w-full truncate text-xs font-semibold tracking-[-0.01em] sm:text-sm">{pdf.title}</h3>
                                {pdf.status === "pending" && <span className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${darkMode ? "border-[#3a506e] bg-[#223650] text-[#d3d3cb]" : "border-[#deded7] bg-[#f3f3ee] text-[#696a62]"}`}>Pending</span>}
                                {pdf.status === "approved" && !pdf.isPublished && <span className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${darkMode ? "border-[#3a506e] text-[#c7c8bf]" : "border-[#d9d9d2] text-[#66675f]"}`}>Ready to publish</span>}
                                {pdf.status === "rejected" && <span className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${darkMode ? "border-[#5a514a] bg-[#302a25] text-[#d1c7bd]" : "border-[#e0d9d1] bg-[#f6f2ed] text-[#766d64]"}`}>Rejected</span>}
                                {pdf.isPublished && <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-semibold ${darkMode ? "border-[#3a506e] bg-[#223650] text-[#d3d3cb]" : "border-[#deded7] bg-[#f3f3ee] text-[#696a62]"}`}><Globe size={9} /> Published</span>}
                                {pdf.isFree && <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-semibold ${darkMode ? "border-[#3a506e] text-[#c7c8bf]" : "border-[#d9d9d2] text-[#66675f]"}`}><Gift size={9} /> Free</span>}
                              </div>
                              <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] ${darkMode ? "text-[#96978e]" : "text-[#85867d]"}`}>
                                <span className="inline-flex items-center gap-1"><BookOpen size={11} /> {pdf.subject}</span>
                                {pdf.grade && <span>{pdf.grade}</span>}
                                <span className="inline-flex items-center gap-1"><Calendar size={11} /> {new Date(pdf.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 border-t pt-2.5 sm:shrink-0 sm:justify-end sm:border-t-0 sm:pt-0 dark:border-[#223650] border-[#eeeeee]">
                            <button
                              onClick={() => { setIsBulkMoveOpen(false); setMovingMaterial(pdf); setTargetMoveFolderId(pdf.folderId || ""); }}
                              className={`inline-flex min-h-8 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold transition-colors ${darkMode ? "border-[#536f9b] bg-[#1e3555] text-[#d5e4ff] hover:border-[#718fbb] hover:bg-[#2a486e]" : "border-[#e0e0d9] text-[#55564e] hover:bg-[#f4f4ef]"}`}
                              title="Move to another folder"
                            >
                              <Move size={12} /> Move
                            </button>

                            {pdf.status === "approved" && (
                              <>
                                <button
                                  onClick={() => openPublishModal(pdf)}
                                  className={`inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold transition-colors ${darkMode ? "bg-[#b5dfd4] text-[#173d3a] hover:bg-[#ccebe2]" : "bg-[#292a25] text-white hover:bg-[#41423b]"}`}
                                >
                                  <Globe size={12} /> {pdf.isPublished ? "Manage" : "Publish"}
                                </button>
                                {pdf.isPublished && (
                                  <button
                                    onClick={() => handleUnpublish(pdf._id)}
                                    className={`min-h-8 rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold transition-colors ${darkMode ? "border-[#79586f] bg-[#392b43] text-[#e9c9dc] hover:border-[#9a708b] hover:bg-[#4b3654]" : "border-[#e2dcd5] text-[#766d64] hover:bg-[#f6f2ed]"}`}
                                    title="Unpublish completely"
                                  >Unpublish</button>
                                )}
                              </>
                            )}

                            <a
                              href={getPdfViewUrl(pdf.fileUrl)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`inline-flex min-h-8 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold transition-colors ${darkMode ? "border-[#4c747c] bg-[#1c3943] text-[#c9eeeb] hover:border-[#65949a] hover:bg-[#28515a]" : "border-[#e0e0d9] text-[#55564e] hover:bg-[#f4f4ef]"}`}
                            >
                              <Eye size={12} /> View
                            </a>

                            <button onClick={() => setDeleteItem(pdf)} title="Delete document" className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${darkMode ? "border-[#765365] bg-[#332638] text-[#e8c2d0] hover:border-[#a06d82] hover:bg-[#493044] hover:text-[#ffe8ef]" : "border-[#e0e0d9] text-[#85867d] hover:border-[#d7cec4] hover:bg-[#f6f2ed] hover:text-[#766d64]"}`}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {pdf.status === "rejected" && (pdf.rejectReason || pdf.adminRejectReason || pdf.reason) && (
                          <div className={`mt-2.5 flex items-start gap-2 rounded-xl border px-3 py-2 text-[10px] leading-5 ${darkMode ? "border-[#514b45] bg-[#26231f] text-[#c9c0b7]" : "border-[#e2dcd5] bg-[#f8f5f0] text-[#766d64]"}`}>
                            <AlertCircle size={13} className="mt-0.5 shrink-0" />
                            <div><span className="font-semibold">Rejection reason: </span>{pdf.rejectReason || pdf.adminRejectReason || pdf.reason}</div>
                          </div>
                        )}

                        {pdf.isPublished && ((pdf.classIds && pdf.classIds.length > 0) || pdf.isFree) && (
                          <div className={`mt-2.5 flex flex-wrap items-center gap-1.5 border-t pt-2.5 ${darkMode ? "border-[#223650]" : "border-[#eeeeee]"}`}>
                            <span className={`mr-1 text-[9px] font-semibold uppercase tracking-[0.12em] ${darkMode ? "text-[#94a3b8]" : "text-[#96978e]"}`}>Shared with</span>
                            {pdf.isFree && (
                              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[9px] font-semibold ${darkMode ? "border-[#3a506e] bg-[#223650] text-[#d3d3cb]" : "border-[#deded7] bg-[#f3f3ee] text-[#696a62]"}`}>
                                <Gift size={10} /> Public
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
                                  className={`ml-0.5 rounded-full p-0.5 ${darkMode ? "hover:bg-[#3a506e]" : "hover:bg-[#e3e3dc]"}`}
                                  title="Remove from public access"
                                ><X size={9} /></button>
                              </span>
                            )}
                            {pdf.classIds && pdf.classIds.map((cls: any) => {
                              const classId = cls._id || cls;
                              const className = cls.grade === "Other" ? (cls.customGradeName || "Other") : cls.grade;
                              const displayTitle = className ? `${className} ${cls.medium || ""} (${cls.mode || ""})`.trim() : "Class";
                              return (
                                <span key={classId} className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[9px] font-semibold ${darkMode ? "border-[#3a506e] bg-[#1d304b] text-[#c4c5bc]" : "border-[#e1e1da] bg-[#f7f7f3] text-[#6c6d64]"}`}>
                                  {displayTitle}
                                  <button onClick={() => handleRemoveSingleClass(pdf, classId)} className={`ml-0.5 rounded-full p-0.5 ${darkMode ? "hover:bg-[#3a506e]" : "hover:bg-[#e7e7e0]"}`} title="Remove from this class"><X size={9} /></button>
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>

                {totalPages > 1 && (
                  <div className={`mt-5 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between ${darkMode ? "border-[#223650]" : "border-[#e7e7e1]"}`}>
                    <span className={`text-[10px] ${darkMode ? "text-[#a7b7cd]" : "text-[#85867d]"}`}>
                      Page <strong className={darkMode ? "text-[#e2e8f0]" : "text-[#34352f]"}>{currentPage}</strong> of <strong className={darkMode ? "text-[#e2e8f0]" : "text-[#34352f]"}>{totalPages}</strong> · {filteredPdfs.length} documents
                    </span>
                    <div className="flex w-full gap-2 sm:w-auto">
                      <button
                        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className={`flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-[10px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none ${darkMode ? "border-[#49658e] bg-[#1a2e4b] text-[#cfe0fa] hover:border-[#6684b2] hover:bg-[#243d60]" : "border-[#deded7] bg-white text-[#55564e] hover:bg-[#f4f4ef]"}`}
                      ><ChevronLeft size={13} /> Previous</button>
                      <button
                        onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className={`flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-[10px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none ${darkMode ? "border-[#49658e] bg-[#1a2e4b] text-[#cfe0fa] hover:border-[#6684b2] hover:bg-[#243d60]" : "border-[#deded7] bg-white text-[#55564e] hover:bg-[#f4f4ef]"}`}
                      >Next <ChevronRight size={13} /></button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </div>

      {/* Create / Rename Folder Modal */}
      {(isCreateFolderOpen || renamingFolder) && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#071226]/70 p-4 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-[26px] border p-5 shadow-2xl sm:p-6 ${darkMode ? "border-[#30445f] bg-[#111f33] text-[#e2e8f0]" : "border-[#e0e0d9] bg-[#fdfdfa] text-[#22231f]"}`}>
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className={`mb-1 text-[10px] font-semibold uppercase tracking-[0.15em] ${darkMode ? "text-[#94a3b8]" : "text-[#96978e]"}`}>Folder settings</p>
                <h3 className="text-lg font-semibold tracking-[-0.03em]">{renamingFolder ? "Rename folder" : "Create a folder"}</h3>
                <p className={`mt-1 text-[11px] ${darkMode ? "text-[#a7b7cd]" : "text-[#85867d]"}`}>
                  {renamingFolder ? "Choose a clear name for this folder." : currentFolder ? `This folder will be created inside ${currentFolder.name}.` : "Create a new folder in your root directory."}
                </p>
              </div>
              <button onClick={() => { setIsCreateFolderOpen(false); setRenamingFolder(null); }} className={`rounded-xl p-2 ${darkMode ? "text-[#c4d3e9] hover:bg-[#263f61]" : "text-[#85867d] hover:bg-[#eeeeee]"}`}><X size={17} /></button>
            </div>
            <form onSubmit={renamingFolder ? handleRenameFolder : handleCreateFolder}>
              <label className={`mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] ${darkMode ? "text-[#a7b7cd]" : "text-[#777870]"}`}>Folder name</label>
              <input
                type="text"
                value={folderNameInput}
                onChange={(e) => setFolderNameInput(e.target.value)}
                placeholder="e.g. 2024 Revision Papers"
                required
                className={`mb-5 h-12 w-full rounded-2xl border px-4 text-xs outline-none focus:ring-2 focus:ring-[#92938a]/20 ${darkMode ? "border-[#3d3e37] bg-[#1d304b] text-white placeholder:text-[#8295b0]" : "border-[#deded7] bg-white text-[#30312b] placeholder:text-[#a0a198]"}`}
              />
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => { setIsCreateFolderOpen(false); setRenamingFolder(null); }} className={`min-h-10 rounded-xl px-4 py-2 text-[11px] font-semibold ${darkMode ? "text-[#c4d3e9] hover:bg-[#263f61]" : "text-[#777870] hover:bg-[#f0f0eb]"}`}>Cancel</button>
                <button type="submit" className={`min-h-10 rounded-xl px-5 py-2 text-[11px] font-semibold ${darkMode ? "bg-[#a9c9f2] text-[#142944] hover:bg-[#c0d8f7]" : "bg-[#292a25] text-white hover:bg-[#41423b]"}`}>{renamingFolder ? "Save changes" : "Create folder"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Single / Bulk Move Modal */}
      {(movingMaterial || isBulkMoveOpen) && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#071226]/70 p-4 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-[26px] border p-5 shadow-2xl sm:p-6 ${darkMode ? "border-[#30445f] bg-[#111f33] text-[#e2e8f0]" : "border-[#e0e0d9] bg-[#fdfdfa] text-[#22231f]"}`}>
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className={`mb-1 text-[10px] font-semibold uppercase tracking-[0.15em] ${darkMode ? "text-[#94a3b8]" : "text-[#96978e]"}`}>Organize documents</p>
                <h3 className="text-lg font-semibold tracking-[-0.03em]">{isBulkMoveOpen ? `Move ${selectedPdfIds.length} documents` : "Move document"}</h3>
                <p className={`mt-1 text-[11px] leading-5 ${darkMode ? "text-[#a7b7cd]" : "text-[#85867d]"}`}>
                  {isBulkMoveOpen ? "All selected documents will be moved to the destination you choose." : `Move ${movingMaterial?.title || "this document"} to another folder.`}
                </p>
              </div>
              <button disabled={isBulkMoving} onClick={() => { setMovingMaterial(null); setIsBulkMoveOpen(false); }} className={`rounded-xl p-2 disabled:opacity-40 ${darkMode ? "text-[#c4d3e9] hover:bg-[#263f61]" : "text-[#85867d] hover:bg-[#eeeeee]"}`}><X size={17} /></button>
            </div>

            <label className={`mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] ${darkMode ? "text-[#a7b7cd]" : "text-[#777870]"}`}>Destination folder</label>
            <select
              value={targetMoveFolderId}
              onChange={(e) => setTargetMoveFolderId(e.target.value)}
              className={`mb-5 h-12 w-full rounded-2xl border px-3 text-xs outline-none focus:ring-2 focus:ring-[#92938a]/20 ${darkMode ? "border-[#3d3e37] bg-[#1d304b] text-white" : "border-[#deded7] bg-white text-[#30312b]"}`}
            >
              <option value="">Main directory · No folder</option>
              {moveFolderOptions.map((folder) => (
                <option key={folder._id} value={folder._id}>
                  {`${"　".repeat(folder.depth)}${folder.depth > 0 ? "↳ " : "▰ "}${folder.name}`}
                </option>
              ))}
            </select>

            <div className={`mb-5 rounded-2xl border border-dashed p-3 ${darkMode ? "border-[#45463e] bg-[#17263d]" : "border-[#dcdcd5] bg-[#f7f7f2]"}`}>
              <div className="flex items-center gap-2">
                <FolderOpen size={15} className={darkMode ? "text-[#cbd5e1]" : "text-[#777870]"} />
                <span className={`text-[10px] font-semibold ${darkMode ? "text-[#dbe5f1]" : "text-[#66675f]"}`}>Folder structure is preserved</span>
              </div>
              <p className={`mt-1 pl-6 text-[10px] leading-4 ${darkMode ? "text-[#94a3b8]" : "text-[#92938a]"}`}>Nested folders are shown with indentation so you can identify the correct destination.</p>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={isBulkMoving}
                onClick={() => { setMovingMaterial(null); setIsBulkMoveOpen(false); }}
                className={`min-h-10 rounded-xl px-4 py-2 text-[11px] font-semibold disabled:opacity-40 ${darkMode ? "text-[#c4d3e9] hover:bg-[#263f61]" : "text-[#777870] hover:bg-[#f0f0eb]"}`}
              >Cancel</button>
              <button
                type="button"
                disabled={isBulkMoving || (isBulkMoveOpen && selectedPdfIds.length === 0)}
                onClick={isBulkMoveOpen ? handleBulkMoveConfirm : handleMoveMaterialConfirm}
                className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-5 py-2 text-[11px] font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${darkMode ? "bg-[#a9c9f2] text-[#142944] hover:bg-[#c0d8f7]" : "bg-[#292a25] text-white hover:bg-[#41423b]"}`}
              >
                {isBulkMoving && <Loader2 size={13} className="animate-spin" />}
                {isBulkMoving ? "Moving documents..." : "Move now"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Publish Modal */}
      {publishModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#071226]/70 p-4 backdrop-blur-sm">
          <div className={`w-full max-w-lg rounded-[26px] border p-5 shadow-2xl sm:p-6 ${darkMode ? "border-[#30445f] bg-[#111f33] text-[#e2e8f0]" : "border-[#e0e0d9] bg-[#fdfdfa] text-[#22231f]"}`}>
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className={`mb-1 text-[10px] font-semibold uppercase tracking-[0.15em] ${darkMode ? "text-[#94a3b8]" : "text-[#96978e]"}`}>Sharing settings</p>
                <h3 className="text-lg font-semibold tracking-[-0.03em]">{selectedFolderForPublish ? `Publish ${selectedFolderForPublish.name}` : "Choose where to publish"}</h3>
                <p className={`mt-1 text-[11px] leading-5 ${darkMode ? "text-[#a7b7cd]" : "text-[#85867d]"}`}>
                  {selectedFolderForPublish ? "The approved documents in this folder and its nested folders will be shared." : "Choose one or more classes, or make this document publicly available."}
                </p>
              </div>
              <button onClick={() => setPublishModalOpen(false)} className={`rounded-xl p-2 ${darkMode ? "text-[#c4d3e9] hover:bg-[#263f61]" : "text-[#85867d] hover:bg-[#eeeeee]"}`}><X size={17} /></button>
            </div>

            <div
              onClick={() => setIsFreeChecked(!isFreeChecked)}
              className={`mb-5 flex cursor-pointer items-center justify-between gap-3 rounded-2xl border p-4 transition-colors ${isFreeChecked ? (darkMode ? "border-[#3a506e] bg-[#1d304b]" : "border-[#c7c8be] bg-[#f1f1eb]") : (darkMode ? "border-[#2b3f5b] bg-[#182b44] hover:bg-[#1d304b]" : "border-[#e2e2db] bg-white hover:bg-[#f8f8f4]")}`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] ${darkMode ? "bg-[#2b3f5b] text-[#dbe5f1]" : "bg-[#e9e9e3] text-[#55564e]"}`}><Gift size={17} /></div>
                <div className="min-w-0">
                  <h4 className="text-xs font-semibold">Make it free · Public</h4>
                  <p className={`mt-1 text-[10px] ${darkMode ? "text-[#a7b7cd]" : "text-[#85867d]"}`}>Visible to registered and unregistered students.</p>
                </div>
              </div>
              <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${isFreeChecked ? (darkMode ? "border-[#b5dfd4] bg-[#b5dfd4] text-[#173d3a]" : "border-[#292a25] bg-[#292a25] text-white") : (darkMode ? "border-[#7894bb]" : "border-[#b8b9af]")}`}>
                {isFreeChecked && <Check size={13} />}
              </div>
            </div>

            <div className="mb-2 flex items-center justify-between gap-2">
              <label className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${darkMode ? "text-[#a7b7cd]" : "text-[#777870]"}`}>Your classes</label>
              <span className={`text-[10px] ${darkMode ? "text-[#94a3b8]" : "text-[#92938a]"}`}>{selectedClassIds.length} selected</span>
            </div>
            {teacherClasses.length === 0 ? (
              <div className={`mb-5 rounded-2xl border border-dashed py-7 text-center text-xs ${darkMode ? "border-[#2b3f5b] text-[#a7b7cd]" : "border-[#deded7] text-[#85867d]"}`}>No classes created yet.</div>
            ) : (
              <div className="mb-5 max-h-56 space-y-2 overflow-y-auto pr-1">
                {teacherClasses.map((cls) => {
                  const isSelected = selectedClassIds.includes(cls._id);
                  const classNameToDisplay = cls.grade === "Other" ? (cls.customGradeName || "Other") : cls.grade;
                  return (
                    <div
                      key={cls._id}
                      onClick={() => toggleClassSelection(cls._id)}
                      className={`flex cursor-pointer items-center justify-between gap-3 rounded-2xl border p-3.5 transition-colors ${isSelected ? (darkMode ? "border-[#6385b5] bg-[#233f63]" : "border-[#c5c6bc] bg-[#f1f1eb]") : (darkMode ? "border-[#2b3f5b] bg-[#182b44] hover:bg-[#1d304b]" : "border-[#e2e2db] bg-white hover:bg-[#f8f8f4]")}`}
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-semibold">{classNameToDisplay}</span>
                          <span className={`text-[10px] ${darkMode ? "text-[#a7b7cd]" : "text-[#85867d]"}`}>({cls.medium} {cls.mode})</span>
                        </div>
                        <p className={`mt-1 text-[10px] ${darkMode ? "text-[#94a3b8]" : "text-[#92938a]"}`}>{cls.day} · {cls.startTime} – {cls.endTime}</p>
                      </div>
                      <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${isSelected ? (darkMode ? "border-[#b5dfd4] bg-[#b5dfd4] text-[#173d3a]" : "border-[#292a25] bg-[#292a25] text-white") : (darkMode ? "border-[#7894bb]" : "border-[#b8b9af]")}`}>
                        {isSelected && <Check size={13} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button onClick={() => setPublishModalOpen(false)} className={`min-h-10 rounded-xl px-4 py-2 text-[11px] font-semibold ${darkMode ? "text-[#c4d3e9] hover:bg-[#263f61]" : "text-[#777870] hover:bg-[#f0f0eb]"}`}>Cancel</button>
              <button
                onClick={handleConfirmPublish}
                disabled={selectedClassIds.length === 0 && !isFreeChecked}
                className={`min-h-10 rounded-xl px-5 py-2 text-[11px] font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${darkMode ? "bg-[#b5dfd4] text-[#173d3a] hover:bg-[#ccebe2]" : "bg-[#292a25] text-white hover:bg-[#41423b]"}`}
              >Publish now</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

}
