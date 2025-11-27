"use client";

import { useEffect } from "react";
import { usePage } from "@/contexts/PageContext";

interface PageTitleProps {
  title: string;
  subtitle?: string;
  rightContent?: React.ReactNode;
}

export function PageTitle({
  title,
  subtitle,
  rightContent,
}: PageTitleProps) {
  const { setPageInfo } = usePage();

  useEffect(() => {
    setPageInfo({ title, subtitle, rightContent });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, subtitle, rightContent]);

  return null;
}

