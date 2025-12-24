"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useBillingLineTemplates } from "@/hooks/useBillingLineTemplates";
import { createBillingLineTemplate, getBillingLineTemplates, BillingLineTemplate } from "@/services/billingLineTemplatesService";

interface SavedLine {
  id: number;
  description: string;
  unit?: string;
  unitPrice: number;
  taxRate: number;
}

interface DescriptionAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelectLine?: (line: SavedLine) => void;
  onSaveNewLine?: (description: string, unit: string | undefined, unitPrice: number, taxRate: number) => void;
  placeholder?: string;
  className?: string;
  defaultUnitPrice?: number;
  defaultTaxRate?: number;
}

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
  const { token } = useAuth();
  const { savedLines, invalidateCache } = useBillingLineTemplates();
  const [suggestions, setSuggestions] = useState<SavedLine[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Fonction pour mettre à jour les suggestions
  const updateSuggestions = (searchValue: string) => {
    if (searchValue.length >= 1) {
      // Filtrer les lignes enregistrées qui correspondent
      const filtered = savedLines.filter((line) =>
        line.description.toLowerCase().includes(searchValue.toLowerCase())
      );
      setSuggestions(filtered);
    } else {
      // Si le champ est vide, afficher toutes les suggestions
      setSuggestions(savedLines);
    }
  };

  useEffect(() => {
    if (showSuggestions) {
      updateSuggestions(value);
    }
  }, [value, showSuggestions, savedLines]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isInsideSuggestions = suggestionsRef.current?.contains(target);
      const isInsideInput = inputRef.current?.contains(target);
      
      if (
        suggestionsRef.current &&
        !isInsideSuggestions &&
        inputRef.current &&
        !isInsideInput
      ) {
        setShowSuggestions(false);
      }
    };

    // Utiliser 'click' au lieu de 'mousedown' pour éviter de fermer avant le clic sur le bouton
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const handleSelect = (line: SavedLine) => {
    // S'assurer que unitPrice et taxRate sont des numbers
    const lineWithNumbers: SavedLine = {
      ...line,
      unitPrice: typeof line.unitPrice === 'string' ? parseFloat(line.unitPrice) : line.unitPrice,
      taxRate: typeof line.taxRate === 'string' ? parseFloat(line.taxRate) : line.taxRate,
    };
    onChange(line.description);
    if (onSelectLine) {
      onSelectLine(lineWithNumbers);
    }
    setShowSuggestions(false);
    setSelectedIndex(-1);
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
          onSaveNewLine(value.trim(), undefined, defaultUnitPrice, defaultTaxRate);
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
          setSuggestions(savedLines);
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
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSelect(line);
                  }}
                  onMouseDown={(e) => {
                    // Empêcher la fermeture des suggestions lors du mousedown
                    e.preventDefault();
                  }}
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
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                  // Si on a une fonction onSaveNewLine, enregistrer la nouvelle ligne
                if (onSaveNewLine && value.trim().length > 0) {
                  // Sauvegarder dans la base de données
                  if (token) {
                    try {
                      await createBillingLineTemplate(token, {
                        description: value.trim(),
                        unit: undefined,
                        unit_price_ht: defaultUnitPrice,
                        tax_rate: defaultTaxRate,
                      });
                      // Invalider le cache pour forcer le rechargement
                      invalidateCache();
                      
                      // Recharger les lignes sauvegardées
                      const templates = await getBillingLineTemplates(token);
                      const adaptedLines: SavedLine[] = templates.map((template: BillingLineTemplate) => ({
                        id: template.id,
                        description: template.description,
                        unit: template.unit || undefined,
                        unitPrice: typeof template.unit_price_ht === 'string' ? parseFloat(template.unit_price_ht) : template.unit_price_ht,
                        taxRate: typeof template.tax_rate === 'string' ? parseFloat(template.tax_rate) : template.tax_rate,
                      }));
                      
                      // Sélectionner automatiquement la ligne créée
                      const newTemplate = templates.find(t => t.description === value.trim() && t.unit_price_ht === defaultUnitPrice && t.tax_rate === defaultTaxRate);
                      if (newTemplate) {
                        const newLine: SavedLine = {
                          id: newTemplate.id,
                          description: newTemplate.description,
                          unit: newTemplate.unit || undefined,
                          unitPrice: typeof newTemplate.unit_price_ht === 'string' ? parseFloat(newTemplate.unit_price_ht) : newTemplate.unit_price_ht,
                          taxRate: typeof newTemplate.tax_rate === 'string' ? parseFloat(newTemplate.tax_rate) : newTemplate.tax_rate,
                        };
                        // Sélectionner automatiquement la ligne créée
                        handleSelect(newLine);
                      } else {
                        // Si on ne trouve pas la ligne, juste mettre à jour le formulaire
                        onSaveNewLine(value.trim(), undefined, defaultUnitPrice, defaultTaxRate);
                        setShowSuggestions(false);
                      }
                    } catch (err) {
                      console.error("Erreur lors de la sauvegarde de la ligne:", err);
                      // Même en cas d'erreur, appeler onSaveNewLine pour mettre à jour le formulaire
                      onSaveNewLine(value.trim(), undefined, defaultUnitPrice, defaultTaxRate);
                      setShowSuggestions(false);
                    }
                  } else {
                    // Pas de token, juste appeler onSaveNewLine
                    onSaveNewLine(value.trim(), undefined, defaultUnitPrice, defaultTaxRate);
                    setShowSuggestions(false);
                  }
                }
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

