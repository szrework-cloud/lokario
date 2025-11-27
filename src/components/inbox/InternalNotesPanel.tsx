"use client";

import { useState } from "react";
import { InternalNote } from "./types";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";

interface InternalNotesPanelProps {
  notes: InternalNote[];
  onAddNote: (content: string) => void;
  onClose: () => void;
}

export function InternalNotesPanel({
  notes,
  onAddNote,
  onClose,
}: InternalNotesPanelProps) {
  const [newNote, setNewNote] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newNote.trim()) {
      onAddNote(newNote);
      setNewNote("");
    }
  };

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white border-l border-[#E5E7EB] shadow-xl z-50 overflow-y-auto">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[#0F172A]">Notes internes</h2>
          <button
            onClick={onClose}
            className="text-[#64748B] hover:text-[#0F172A]"
          >
            <svg
              className="w-6 h-6"
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

        {/* Formulaire d'ajout */}
        <Card className="mb-4">
          <CardHeader>
            <h3 className="text-sm font-semibold text-[#0F172A]">Ajouter une note</h3>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-2">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Ex: Cette cliente est compliquée, attention 🧐"
                className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                rows={3}
              />
              <button
                type="submit"
                className="w-full rounded-lg bg-[#F97316] px-4 py-2 text-sm font-medium text-white hover:bg-[#EA580C]"
              >
                Ajouter
              </button>
            </form>
          </CardContent>
        </Card>

        {/* Liste des notes */}
        <div className="space-y-3">
          {notes.length === 0 ? (
            <p className="text-sm text-[#64748B] text-center py-8">
              Aucune note interne
            </p>
          ) : (
            notes.map((note) => (
              <Card key={note.id}>
                <CardContent className="p-4">
                  <p className="text-sm text-[#0F172A] mb-2">{note.content}</p>
                  <div className="flex items-center justify-between text-xs text-[#64748B]">
                    <span>{note.author}</span>
                    <span>
                      {new Date(note.createdAt).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

