"use client";

import { useState, useEffect, useRef } from "react";

interface FilterRules {
  keywords?: string[];
  keywords_location?: "subject" | "content" | "any";
  sender_email?: string[];
  sender_domain?: string[];
  sender_phone?: string[];
  match_type?: "all" | "any";
}

interface FolderFiltersConfigProps {
  filters: FilterRules;
  onChange: (filters: FilterRules) => void;
}

export function FolderFiltersConfig({ filters, onChange }: FolderFiltersConfigProps) {
  const [keywords, setKeywords] = useState<string>(filters.keywords?.join(", ") || "");
  const [keywordsLocation, setKeywordsLocation] = useState<"subject" | "content" | "any">(
    filters.keywords_location || "any"
  );
  const [senderEmails, setSenderEmails] = useState<string>(filters.sender_email?.join(", ") || "");
  const [senderDomains, setSenderDomains] = useState<string>(filters.sender_domain?.join(", ") || "");
  const [senderPhones, setSenderPhones] = useState<string>(filters.sender_phone?.join(", ") || "");
  const [matchType, setMatchType] = useState<"all" | "any">(filters.match_type || "any");
  const timeoutRefs = useRef<{ [key: string]: NodeJS.Timeout | null }>({});
  const prevFiltersRef = useRef<string>("");

  // Synchroniser les états locaux avec les props seulement si les props ont vraiment changé
  useEffect(() => {
    const filtersKey = JSON.stringify({
      keywords: filters.keywords,
      keywords_location: filters.keywords_location,
      sender_email: filters.sender_email,
      sender_domain: filters.sender_domain,
      sender_phone: filters.sender_phone,
      match_type: filters.match_type,
    });
    
    // Ne mettre à jour que si les props ont vraiment changé (pas une mise à jour interne)
    if (prevFiltersRef.current !== filtersKey) {
    setKeywords(filters.keywords?.join(", ") || "");
    setKeywordsLocation(filters.keywords_location || "any");
    setSenderEmails(filters.sender_email?.join(", ") || "");
    setSenderDomains(filters.sender_domain?.join(", ") || "");
    setSenderPhones(filters.sender_phone?.join(", ") || "");
    setMatchType(filters.match_type || "any");
      prevFiltersRef.current = filtersKey;
    }
  }, [filters]);

  // Nettoyer les timeouts au démontage
  useEffect(() => {
    return () => {
      Object.values(timeoutRefs.current).forEach((timeout) => {
        if (timeout) clearTimeout(timeout);
      });
    };
  }, []);

  const updateFilters = (newFilters: Partial<FilterRules>) => {
    onChange({
      ...filters,
      ...newFilters,
    });
  };

  const handleKeywordsChange = (value: string) => {
    setKeywords(value);
    // Nettoyer le timeout précédent
    if (timeoutRefs.current.keywords) {
      clearTimeout(timeoutRefs.current.keywords);
    }
    // Debounce pour éviter trop d'appels à onChange pendant la saisie
    timeoutRefs.current.keywords = setTimeout(() => {
    const keywordList = value
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 0);
    updateFilters({
      keywords: keywordList.length > 0 ? keywordList : undefined,
    });
      timeoutRefs.current.keywords = null;
    }, 300);
  };

  const handleSenderEmailsChange = (value: string) => {
    setSenderEmails(value);
    // Nettoyer le timeout précédent
    if (timeoutRefs.current.senderEmails) {
      clearTimeout(timeoutRefs.current.senderEmails);
    }
    // Debounce pour éviter trop d'appels à onChange pendant la saisie
    timeoutRefs.current.senderEmails = setTimeout(() => {
    const emailList = value
      .split(",")
      .map((e) => e.trim())
      .filter((e) => e.length > 0);
    updateFilters({
      sender_email: emailList.length > 0 ? emailList : undefined,
    });
      timeoutRefs.current.senderEmails = null;
    }, 300);
  };

  const handleSenderDomainsChange = (value: string) => {
    setSenderDomains(value);
    // Nettoyer le timeout précédent
    if (timeoutRefs.current.senderDomains) {
      clearTimeout(timeoutRefs.current.senderDomains);
    }
    // Debounce pour éviter trop d'appels à onChange pendant la saisie
    timeoutRefs.current.senderDomains = setTimeout(() => {
    const domainList = value
      .split(",")
      .map((d) => d.trim())
      .filter((d) => d.length > 0);
    updateFilters({
      sender_domain: domainList.length > 0 ? domainList : undefined,
    });
      timeoutRefs.current.senderDomains = null;
    }, 300);
  };

  const handleSenderPhonesChange = (value: string) => {
    setSenderPhones(value);
    // Nettoyer le timeout précédent
    if (timeoutRefs.current.senderPhones) {
      clearTimeout(timeoutRefs.current.senderPhones);
    }
    // Debounce pour éviter trop d'appels à onChange pendant la saisie
    timeoutRefs.current.senderPhones = setTimeout(() => {
    const phoneList = value
      .split(",")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    updateFilters({
      sender_phone: phoneList.length > 0 ? phoneList : undefined,
    });
      timeoutRefs.current.senderPhones = null;
    }, 300);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-[#0F172A] mb-1">
          Mots-clés
        </label>
        <input
          type="text"
          value={keywords}
          onChange={(e) => handleKeywordsChange(e.target.value)}
          className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
          placeholder="rdv, rendez-vous, appointment (séparés par des virgules)"
        />
        <p className="text-xs text-[#64748B] mt-1">
          Mots-clés à chercher dans les messages. Séparez plusieurs mots par des virgules.
        </p>
      </div>

      {keywords && (
        <div>
          <label className="block text-sm font-medium text-[#0F172A] mb-1">
            Où chercher les mots-clés
          </label>
          <select
            value={keywordsLocation}
            onChange={(e) => {
              const value = e.target.value as "subject" | "content" | "any";
              setKeywordsLocation(value);
              updateFilters({ keywords_location: value });
            }}
            className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
          >
            <option value="any">Dans le sujet ou le contenu</option>
            <option value="subject">Uniquement dans le sujet</option>
            <option value="content">Uniquement dans le contenu</option>
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-[#0F172A] mb-1">
          Emails expéditeurs
        </label>
        <input
          type="text"
          value={senderEmails}
          onChange={(e) => handleSenderEmailsChange(e.target.value)}
          className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
          placeholder="contact@example.com, support@client.com (séparés par des virgules)"
        />
        <p className="text-xs text-[#64748B] mt-1">
          Emails spécifiques. Séparez plusieurs emails par des virgules.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-[#0F172A] mb-1">
          Domaines expéditeurs
        </label>
        <input
          type="text"
          value={senderDomains}
          onChange={(e) => handleSenderDomainsChange(e.target.value)}
          className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
          placeholder="amazon.com, ebay.com (séparés par des virgules)"
        />
        <p className="text-xs text-[#64748B] mt-1">
          Domaines d'emails (sans @). Tous les emails de ces domaines seront classés. Séparez par des virgules.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-[#0F172A] mb-1">
          Numéros de téléphone
        </label>
        <input
          type="text"
          value={senderPhones}
          onChange={(e) => handleSenderPhonesChange(e.target.value)}
          className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
          placeholder="+33612345678, +33612345679 (séparés par des virgules)"
        />
        <p className="text-xs text-[#64748B] mt-1">
          Numéros de téléphone expéditeurs (pour SMS/WhatsApp). Séparez par des virgules.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-[#0F172A] mb-1">
          Type de correspondance
        </label>
        <select
          value={matchType}
          onChange={(e) => {
            const value = e.target.value as "all" | "any";
            setMatchType(value);
            updateFilters({ match_type: value });
          }}
          className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
        >
          <option value="any">Au moins une condition (OU)</option>
          <option value="all">Toutes les conditions (ET)</option>
        </select>
        <p className="text-xs text-[#64748B] mt-1">
          "OU" : le message correspond si au moins une condition est remplie. "ET" : toutes les conditions doivent être remplies.
        </p>
      </div>
    </div>
  );
}

