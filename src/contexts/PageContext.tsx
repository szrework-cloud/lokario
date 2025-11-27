"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface PageContextType {
  title: string;
  subtitle: string;
  rightContent: ReactNode | null;
  setPageInfo: (info: {
    title?: string;
    subtitle?: string;
    rightContent?: ReactNode | null;
  }) => void;
}

const PageContext = createContext<PageContextType | undefined>(undefined);

export function PageProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState("Vue générale");
  const [subtitle, setSubtitle] = useState("Assistant administratif");
  const [rightContent, setRightContent] = useState<ReactNode | null>(null);

  const setPageInfo = (info: {
    title?: string;
    subtitle?: string;
    rightContent?: ReactNode | null;
  }) => {
    if (info.title !== undefined) setTitle(info.title);
    if (info.subtitle !== undefined) setSubtitle(info.subtitle);
    if (info.rightContent !== undefined) setRightContent(info.rightContent);
  };

  return (
    <PageContext.Provider value={{ title, subtitle, rightContent, setPageInfo }}>
      {children}
    </PageContext.Provider>
  );
}

export function usePage() {
  const context = useContext(PageContext);
  if (context === undefined) {
    throw new Error("usePage must be used within a PageProvider");
  }
  return context;
}

