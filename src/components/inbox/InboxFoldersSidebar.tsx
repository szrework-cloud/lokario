"use client";

import { useState, useEffect } from "react";
import { InboxFolder } from "./types";
import { useAuth } from "@/hooks/useAuth";
import { CreateFolderModal } from "./CreateFolderModal";
import { FolderSettingsModal } from "./FolderSettingsModal";

interface InboxFoldersSidebarProps {
  folders: InboxFolder[];
  activeFolderId: number | "all" | "pending";
  onFolderChange: (folderId: number | "all" | "pending") => void;
  onFolderEdit?: (folder: InboxFolder) => void;
  onFolderSave?: (folder: InboxFolder) => void;
  onFolderDelete?: (folderId: number) => void;
  counts: Record<number | "all" | "pending", number>;
}

export function InboxFoldersSidebar({
  folders,
  activeFolderId,
  onFolderChange,
  onFolderEdit,
  onFolderSave,
  onFolderDelete,
  counts,
}: InboxFoldersSidebarProps) {
  const { user } = useAuth();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<InboxFolder | null>(null);
  const canEdit = user?.role === "owner" || user?.role === "super_admin";
  
  // Debug: vérifier les permissions
  useEffect(() => {
    if (user) {
      console.log("[InboxFoldersSidebar] User role:", user.role, "canEdit:", canEdit);
    }
  }, [user, canEdit]);

  const systemFolders = folders.filter((f) => f.isSystem);
  const customFolders = folders.filter((f) => !f.isSystem);
  
  // Debug: vérifier les dossiers
  useEffect(() => {
    console.log("[InboxFoldersSidebar] Total folders:", folders.length);
    console.log("[InboxFoldersSidebar] System folders:", systemFolders.length);
    console.log("[InboxFoldersSidebar] Custom folders:", customFolders.length);
    console.log("[InboxFoldersSidebar] Custom folders list:", customFolders.map(f => ({ id: f.id, name: f.name, isSystem: f.isSystem })));
  }, [folders, systemFolders, customFolders]);

  const getFolderBadges = (folder: InboxFolder) => {
    const badges = [];
    if (folder.aiRules?.autoClassify) badges.push("IA");
    if (folder.autoReply?.mode === "auto") badges.push("Auto");
    if (folder.autoReply?.mode === "approval") badges.push("Approval");
    return badges;
  };

  const handleFolderClick = (folder: InboxFolder) => {
    if (canEdit && onFolderEdit) {
      setEditingFolder(folder);
    } else {
      onFolderChange(folder.id);
    }
  };

  return (
    <>
      <div className="w-48 border-r border-[#E5E7EB] bg-white h-full overflow-y-auto">
        <div className="p-2 space-y-0.5">
          {/* Inbox principal */}
          <button
            onClick={() => onFolderChange("all")}
            className={`w-full text-left px-2 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center justify-between ${
              activeFolderId === "all"
                ? "bg-[#F97316] text-white"
                : "text-[#64748B] hover:bg-[#F9FAFB] hover:text-[#0F172A]"
            }`}
          >
            <span className="truncate">📥 Inbox</span>
            {counts["all"] > 0 && (
              <span
                className={`px-1.5 py-0.5 rounded-full text-xs font-semibold ml-2 flex-shrink-0 ${
                  activeFolderId === "all"
                    ? "bg-white/20 text-white"
                    : "bg-[#E5E7EB] text-[#64748B]"
                }`}
              >
                {counts["all"]}
              </span>
            )}
          </button>

          {/* Réponses en attente */}
          {canEdit && (
            <button
              onClick={() => onFolderChange("pending")}
              className={`w-full text-left px-2 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center justify-between ${
                activeFolderId === "pending"
                  ? "bg-[#F97316] text-white"
                  : "text-[#64748B] hover:bg-[#F9FAFB] hover:text-[#0F172A]"
              }`}
            >
              <span className="truncate">⏳ Réponses en attente</span>
              {counts["pending"] > 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-xs font-semibold ml-2 flex-shrink-0 ${
                    activeFolderId === "pending"
                      ? "bg-white/20 text-white"
                      : "bg-[#E5E7EB] text-[#64748B]"
                  }`}
                >
                  {counts["pending"]}
                </span>
              )}
            </button>
          )}

          {/* Dossiers personnalisés */}
          {customFolders.length > 0 && (
            <div className="pt-2 mt-2 border-t border-[#E5E7EB]">
              {customFolders.map((folder) => {
                const badges = getFolderBadges(folder);
                const isActive = activeFolderId === folder.id;
                return (
                  <div
                    key={folder.id}
                    className={`group flex items-center gap-1 ${
                      isActive ? "bg-[#F97316]" : ""
                    }`}
                  >
                    <button
                      onClick={() => onFolderChange(folder.id)}
                      onContextMenu={(e) => {
                        if (canEdit) {
                          e.preventDefault();
                          setEditingFolder(folder);
                        }
                      }}
                      onDoubleClick={(e) => {
                        if (canEdit) {
                          e.preventDefault();
                          setEditingFolder(folder);
                        }
                      }}
                      className={`flex-1 w-full text-left px-2 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center justify-between ${
                        isActive
                          ? "bg-[#F97316] text-white"
                          : "text-[#64748B] hover:bg-[#F9FAFB] hover:text-[#0F172A]"
                      }`}
                      title={canEdit ? "Double-clic ou clic droit pour modifier" : ""}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: folder.color || "#64748B" }}
                          />
                          <span className="truncate">{folder.name}</span>
                        </div>
                        {badges.length > 0 && (
                          <div className="flex gap-1 mt-0.5">
                            {badges.map((badge) => (
                              <span
                                key={badge}
                                className={`text-[10px] px-1 py-0.5 rounded ${
                                  isActive
                                    ? "bg-white/20 text-white"
                                    : "bg-[#E5E7EB] text-[#64748B]"
                                }`}
                              >
                                {badge}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      {counts[folder.id] > 0 && (
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-xs font-semibold ml-2 flex-shrink-0 ${
                            isActive
                              ? "bg-white/20 text-white"
                              : "bg-[#E5E7EB] text-[#64748B]"
                          }`}
                        >
                          {counts[folder.id]}
                        </span>
                      )}
                    </button>
                    
                    {/* Bouton d'édition visible pour owner/super_admin (au survol seulement) */}
                    {canEdit && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingFolder(folder);
                        }}
                        className={`p-1 rounded transition-opacity duration-200 flex-shrink-0 ${
                          isActive
                            ? "text-white hover:bg-white/20 opacity-0 group-hover:opacity-100"
                            : "text-[#64748B] hover:bg-[#E5E7EB] hover:text-[#0F172A] opacity-0 group-hover:opacity-100"
                        }`}
                        title="Modifier le dossier"
                      >
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Dossiers système */}
          <div className="pt-2 mt-2 border-t border-[#E5E7EB]">
            {systemFolders.map((folder) => {
              const isActive = activeFolderId === folder.id;
              return (
                <button
                  key={folder.id}
                  onClick={() => onFolderChange(folder.id)}
                  className={`w-full text-left px-2 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center justify-between ${
                    isActive
                      ? "bg-[#F97316] text-white"
                      : "text-[#64748B] hover:bg-[#F9FAFB] hover:text-[#0F172A]"
                  }`}
                >
                  <span className="truncate">
                    {folder.name === "Archivé" ? "📦" : "🗑️"} {folder.name}
                  </span>
                  {counts[folder.id] > 0 && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-xs font-semibold ml-2 flex-shrink-0 ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-[#E5E7EB] text-[#64748B]"
                      }`}
                    >
                      {counts[folder.id]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Bouton créer dossier (owner/super_admin seulement) */}
          {canEdit && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="w-full mt-2 px-2 py-1.5 rounded-md text-xs font-medium text-[#F97316] hover:bg-[#F9FAFB] border border-[#E5E7EB]"
            >
              + Créer un dossier
            </button>
          )}
        </div>
      </div>

      {isCreateModalOpen && (
        <CreateFolderModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSave={(folder) => {
            // TODO: Appel API pour créer le dossier
            console.log("Create folder:", folder);
            setIsCreateModalOpen(false);
          }}
        />
      )}

      {editingFolder && (
        <FolderSettingsModal
          isOpen={!!editingFolder}
          onClose={() => setEditingFolder(null)}
          folder={editingFolder}
          onSave={(folder) => {
            onFolderSave?.(folder);
            setEditingFolder(null);
          }}
          onDelete={(folderId) => {
            onFolderDelete?.(folderId);
            setEditingFolder(null);
          }}
        />
      )}
    </>
  );
}

