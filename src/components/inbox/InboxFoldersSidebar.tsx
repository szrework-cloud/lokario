"use client";

import { useState } from "react";
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

  const systemFolders = folders.filter((f) => f.isSystem);
  const customFolders = folders.filter((f) => !f.isSystem);

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
                  <button
                    key={folder.id}
                    onClick={() => onFolderChange(folder.id)}
                    onContextMenu={(e) => {
                      if (canEdit) {
                        e.preventDefault();
                        setEditingFolder(folder);
                      }
                    }}
                    className={`w-full text-left px-2 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center justify-between group ${
                      isActive
                        ? "bg-[#F97316] text-white"
                        : "text-[#64748B] hover:bg-[#F9FAFB] hover:text-[#0F172A]"
                    }`}
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

