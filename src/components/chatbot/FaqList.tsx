"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";

interface FaqItem {
  id: number;
  question: string;
  answer: string;
}

interface FaqListProps {
  items: FaqItem[];
  onAdd?: () => void;
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
}

export function FaqList({ items, onAdd, onEdit, onDelete }: FaqListProps) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Card key={item.id}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900 mb-1">
                  {item.question}
                </p>
                <p className="text-sm text-slate-600">{item.answer}</p>
              </div>
              <div className="flex gap-2 ml-4">
                {onEdit && (
                  <button
                    onClick={() => onEdit(item.id)}
                    className="text-xs text-slate-600 hover:text-slate-900"
                  >
                    Modifier
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => onDelete(item.id)}
                    className="text-xs text-red-600 hover:text-red-700"
                  >
                    Supprimer
                  </button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      {onAdd && (
        <button
          onClick={onAdd}
          className="w-full rounded-lg border border-dashed border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          + Ajouter une question
        </button>
      )}
    </div>
  );
}

