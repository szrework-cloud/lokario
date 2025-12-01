"use client";

import { useState } from "react";
import { InboxItem, InboxFolder } from "./types";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";

interface AutoReplyPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: InboxItem;
  folder: InboxFolder;
  generatedReply: string;
  onApprove: () => void;
  onEdit: (editedText: string) => void;
  onReject: () => void;
}

export function AutoReplyPreviewModal({
  isOpen,
  onClose,
  conversation,
  folder,
  generatedReply,
  onApprove,
  onEdit,
  onReject,
}: AutoReplyPreviewModalProps) {
  const [editedReply, setEditedReply] = useState(generatedReply);
  const [isEditing, setIsEditing] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[#0F172A]">
              Réponse automatique en attente
            </h2>
            <button
              onClick={onClose}
              className="text-[#64748B] hover:text-[#0F172A]"
            >
              ✕
            </button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Info conversation */}
          <div className="p-3 bg-[#F9FAFB] rounded-lg">
            <p className="text-sm font-medium text-[#0F172A]">
              Client: {conversation.client}
            </p>
            <p className="text-xs text-[#64748B] mt-1">
              Sujet: {conversation.subject}
            </p>
            <p className="text-xs text-[#64748B]">
              Dossier: {folder.name}
            </p>
          </div>

          {/* Message client */}
          <div>
            <label className="text-sm font-medium text-[#0F172A] mb-2 block">
              Message du client
            </label>
            <div className="p-3 bg-white border border-[#E5E7EB] rounded-lg">
              <p className="text-sm text-[#0F172A] whitespace-pre-wrap">
                {conversation.lastMessage}
              </p>
            </div>
          </div>

          {/* Réponse générée */}
          <div>
            <label className="text-sm font-medium text-[#0F172A] mb-2 block">
              Réponse générée par l'IA
            </label>
            {isEditing ? (
              <textarea
                value={editedReply}
                onChange={(e) => setEditedReply(e.target.value)}
                className="w-full p-3 border border-[#E5E7EB] rounded-lg text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                rows={6}
                placeholder="Modifiez la réponse..."
              />
            ) : (
              <div className="p-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg">
                <p className="text-sm text-[#0F172A] whitespace-pre-wrap">
                  {generatedReply}
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t border-[#E5E7EB]">
            {isEditing ? (
              <>
                <button
                  onClick={() => {
                    onEdit(editedReply);
                    setIsEditing(false);
                  }}
                  className="flex-1 rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110"
                >
                  Envoyer la version modifiée
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditedReply(generatedReply);
                  }}
                  className="px-4 py-2 rounded-lg border border-[#E5E7EB] text-sm font-medium text-[#64748B] hover:bg-[#F9FAFB] hover:text-[#0F172A]"
                >
                  Annuler
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onApprove}
                  className="flex-1 rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110"
                >
                  Approuver et envoyer
                </button>
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 rounded-lg border border-[#E5E7EB] text-sm font-medium text-[#0F172A] hover:bg-[#F9FAFB]"
                >
                  Modifier
                </button>
                <button
                  onClick={onReject}
                  className="px-4 py-2 text-sm font-medium text-[#64748B] hover:text-[#0F172A]"
                >
                  Refuser
                </button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

