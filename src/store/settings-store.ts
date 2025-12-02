import { create } from "zustand";

type ModuleKey =
  | "tasks"
  | "inbox"
  | "relances"
  | "projects"
  | "billing"
  | "reporting"
  | "chatbot_internal"
  | "chatbot_site"
  | "appointments";

type ModulesSettings = {
  [K in ModuleKey]?: { enabled: boolean }; // Tous les modules sont optionnels pour compatibilité backend
};

type IaSettings = {
  ai_relances: boolean;
  ai_summary: boolean;
  ai_chatbot_internal: boolean;
  ai_chatbot_site: boolean;
};

type IntegrationsSettings = {
  email_provider: string | null;
  email_from: string | null;
};

export type CompanySettings = {
  id: number;
  company_id: number;
  settings: {
    modules: ModulesSettings;
    ia: IaSettings;
    integrations: IntegrationsSettings;
  };
  created_at: string | Date;
  updated_at: string | Date;
};

export type CompanyInfo = {
  id: number;
  name: string;
  sector?: string | null;
  is_active: boolean;
  created_at: string;
};

type SettingsState = {
  company: CompanyInfo | null;
  settings: CompanySettings | null;
  isLoading: boolean;
  error: string | null;
  hasLoaded: boolean; // Track si on a déjà chargé les settings
  setSettings: (data: { company: CompanyInfo; settings: CompanySettings }) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  updateSettingsLocal: (partial: Partial<CompanySettings["settings"]>) => void;
  reset: () => void;
  setHasLoaded: (loaded: boolean) => void;
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  company: null,
  settings: null,
  isLoading: false,
  error: null,
  hasLoaded: false,
  setSettings: ({ company, settings }) =>
    set({ company, settings, isLoading: false, error: null, hasLoaded: true }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  updateSettingsLocal: (partial) => {
    const current = get().settings;
    if (!current) return;
    set({
      settings: {
        ...current,
        settings: {
          ...current.settings,
          ...partial,
        },
      },
    });
  },
  reset: () => set({ company: null, settings: null, isLoading: false, error: null, hasLoaded: false }),
  setHasLoaded: (loaded) => set({ hasLoaded: loaded }),
}));
