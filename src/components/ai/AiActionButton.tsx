interface AiActionButtonProps {
  onClick: () => void;
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function AiActionButton({
  onClick,
  label = "Générer avec l'IA",
  size = "md",
  className = "",
}: AiActionButtonProps) {
  const sizeClasses = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-1.5 text-sm",
    lg: "px-4 py-2 text-base",
  };

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#F97316] to-[#EA580C] px-3 py-1.5 text-sm font-medium text-white shadow-md transition-all hover:shadow-lg hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2 ${sizeClasses[size]} ${className}`}
    >
      <span>✨</span>
      <span>{label}</span>
    </button>
  );
}

