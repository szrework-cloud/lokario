import { Card, CardContent } from "@/components/ui/Card";
import { Tag } from "@/components/ui/Tag";
import { Project } from "./types";

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
}

export function ProjectCard({ project, onClick }: ProjectCardProps) {
  const statusVariant: Record<Project["status"], "default" | "info" | "success" | "error" | "warning"> = {
    "En attente": "default",
    "Nouveau": "default",
    "En cours": "info",
    "Terminé": "success",
  };

  return (
    <div className="cursor-pointer" onClick={onClick}>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-6">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-lg font-semibold text-slate-900">
            {project.name}
          </h3>
          <Tag variant={statusVariant[project.status]}>{project.status}</Tag>
        </div>
        <p className="text-sm text-slate-600 mb-4">{project.client}</p>
        <div className="space-y-2 text-xs text-slate-500">
          {project.startDate && (
            <p>
              <span className="font-medium">Début:</span>{" "}
              {new Date(project.startDate).toLocaleDateString("fr-FR")}
            </p>
          )}
          {project.endDate && (
            <p>
              <span className="font-medium">Fin:</span>{" "}
              {new Date(project.endDate).toLocaleDateString("fr-FR")}
            </p>
          )}
          {!project.startDate && !project.endDate && (
            <p className="text-slate-400">Aucune date définie</p>
          )}
        </div>
      </CardContent>
    </Card>
    </div>
  );
}

