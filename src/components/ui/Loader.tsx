export function Loader({ text = "Chargement..." }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900"></div>
      <p className="mt-4 text-sm text-slate-600">{text}</p>
    </div>
  );
}

