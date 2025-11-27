"use client";

import { useState, useEffect, useRef } from "react";

interface SavedLine {
  id: number;
  description: string;
  unitPrice: number;
  taxRate: number;
}

interface DescriptionAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelectLine?: (line: SavedLine) => void;
  onSaveNewLine?: (description: string, unitPrice: number, taxRate: number) => void;
  placeholder?: string;
  className?: string;
  defaultUnitPrice?: number;
  defaultTaxRate?: number;
}

// TODO: Récupérer depuis le backend
const mockSavedLines: SavedLine[] = [
  { id: 1, description: "Prestation de service - Installation", unitPrice: 1250, taxRate: 20 },
  { id: 2, description: "Matériel supplémentaire", unitPrice: 150, taxRate: 20 },
  { id: 3, description: "Main d'œuvre", unitPrice: 50, taxRate: 20 },
  { id: 4, description: "Déplacement", unitPrice: 80, taxRate: 20 },
  { id: 5, description: "Forfait installation complète", unitPrice: 2000, taxRate: 20 },
  { id: 6, description: "Service de maintenance", unitPrice: 300, taxRate: 20 },
  { id: 7, description: "Fourniture électrique", unitPrice: 120, taxRate: 20 },
  { id: 8, description: "Fourniture plomberie", unitPrice: 200, taxRate: 20 },
  { id: 9, description: "Peinture", unitPrice: 25, taxRate: 10 },
  { id: 10, description: "Carrelage", unitPrice: 45, taxRate: 20 },
  { id: 11, description: "Pose de carrelage", unitPrice: 35, taxRate: 20 },
  { id: 12, description: "Rénovation complète", unitPrice: 5000, taxRate: 20 },
  { id: 13, description: "Service beauté - Coupe", unitPrice: 35, taxRate: 20 },
  { id: 14, description: "Service beauté - Coloration", unitPrice: 80, taxRate: 20 },
  { id: 15, description: "Service beauté - Soin", unitPrice: 60, taxRate: 20 },
];

export function DescriptionAutocomplete({
  value,
  onChange,
  onSelectLine,
  onSaveNewLine,
  placeholder,
  className,
  defaultUnitPrice = 0,
  defaultTaxRate = 20,
}: DescriptionAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<SavedLine[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Fonction pour mettre à jour les suggestions
  const updateSuggestions = (searchValue: string) => {
    if (searchValue.length >= 1) {
      // Filtrer les lignes enregistrées qui correspondent
      const filtered = mockSavedLines.filter((line) =>
        line.description.toLowerCase().includes(searchValue.toLowerCase())
      );
      setSuggestions(filtered);
    } else {
      // Si le champ est vide, afficher toutes les suggestions
      setSuggestions(mockSavedLines);
    }
  };

  useEffect(() => {
    if (showSuggestions) {
      updateSuggestions(value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, showSuggestions]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (line: SavedLine) => {
    onChange(line.description);
    if (onSelectLine) {
      onSelectLine(line);
    }
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions) return;

    // Nombre total d'options (suggestions + option "Créer")
    const totalOptions = suggestions.length + 1;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < totalOptions - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        handleSelect(suggestions[selectedIndex]);
      } else if (selectedIndex === suggestions.length) {
        // Option "Créer une description" sélectionnée
        if (onSaveNewLine && value.trim().length > 0) {
          onSaveNewLine(value.trim(), defaultUnitPrice, defaultTaxRate);
        }
        setShowSuggestions(false);
        inputRef.current?.blur();
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  return (
    <div className="relative w-full" style={{ zIndex: showSuggestions ? 1000 : 'auto' }}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          // Toujours afficher les suggestions quand on tape
          setShowSuggestions(true);
        }}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          // Afficher toutes les suggestions disponibles quand on clique dans le champ
          // Même si le champ est vide, on affiche toutes les lignes enregistrées
          setSuggestions(mockSavedLines);
          setShowSuggestions(true);
          setSelectedIndex(-1);
        }}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />
      {showSuggestions && (
        <div
          ref={suggestionsRef}
          className="absolute z-[1000] w-full mt-1 bg-white border border-[#E5E7EB] rounded-lg shadow-lg max-h-60 overflow-y-auto"
          style={{ position: 'absolute', top: '100%', left: 0, right: 0 }}
        >
          {suggestions.length > 0 ? (
            <>
              {suggestions.map((line, index) => (
                <button
                  key={line.id}
                  type="button"
                  onClick={() => handleSelect(line)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-[#F9FAFB] transition-colors ${
                    index === selectedIndex ? "bg-[#F9FAFB]" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[#0F172A]">{line.description}</span>
                    <span className="text-xs text-[#64748B] ml-2">
                      {line.unitPrice.toLocaleString("fr-FR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      € • TVA {line.taxRate}%
                    </span>
                  </div>
                </button>
              ))}
              {value.length > 0 && <div className="border-t border-[#E5E7EB]"></div>}
            </>
          ) : value.length > 0 ? (
            <div className="px-3 py-2 text-xs text-[#64748B]">
              Aucune ligne enregistrée ne correspond
            </div>
          ) : null}
          {/* Option "Créer une description" - affichée seulement si on a tapé quelque chose */}
          {value.length > 0 && (
            <button
              type="button"
              onClick={() => {
                // Si on a une fonction onSaveNewLine, enregistrer la nouvelle ligne
                if (onSaveNewLine && value.trim().length > 0) {
                  onSaveNewLine(value.trim(), defaultUnitPrice, defaultTaxRate);
                }
                setShowSuggestions(false);
                inputRef.current?.blur();
              }}
              className={`w-full text-left px-3 py-2 text-sm font-medium text-[#F97316] hover:bg-orange-50 transition-colors border-t border-[#E5E7EB] ${
                selectedIndex === suggestions.length ? "bg-orange-50" : ""
              }`}
            >
              + Créer une description : "{value}"
            </button>
          )}
        </div>
      )}
    </div>
  );
}

