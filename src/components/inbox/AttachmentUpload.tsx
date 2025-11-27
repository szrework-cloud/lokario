"use client";

import { useState, useRef } from "react";
import { Attachment } from "./types";

interface AttachmentUploadProps {
  attachments: Attachment[];
  onAdd: (file: File) => void;
  onRemove: (id: number) => void;
}

export function AttachmentUpload({
  attachments,
  onAdd,
  onRemove,
}: AttachmentUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onAdd(file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getFileType = (fileName: string): Attachment["type"] => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext || "")) {
      return "image";
    }
    if (ext === "pdf") {
      return "pdf";
    }
    if (["doc", "docx", "txt", "xls", "xlsx"].includes(ext || "")) {
      return "document";
    }
    return "other";
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm font-medium text-[#64748B] hover:bg-[#F9FAFB] hover:text-[#0F172A]"
        >
          <span>📎</span>
          <span>Ajouter une pièce jointe</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*,application/pdf,.doc,.docx,.txt,.xls,.xlsx"
        />
      </div>

      {attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center gap-2 p-2 bg-[#F9FAFB] rounded-lg"
            >
              <span className="text-lg">
                {attachment.type === "image" && "🖼️"}
                {attachment.type === "pdf" && "📄"}
                {attachment.type === "document" && "📎"}
                {attachment.type === "other" && "📎"}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{attachment.name}</p>
                <p className="text-xs text-[#64748B]">
                  {(attachment.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <button
                type="button"
                onClick={() => onRemove(attachment.id)}
                className="text-red-600 hover:text-red-700"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

