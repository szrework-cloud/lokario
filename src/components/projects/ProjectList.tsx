import { ProjectCard } from "./ProjectCard";
import { Project } from "./types";

interface ProjectListProps {
  projects: Project[];
  onProjectClick: (project: Project) => void;
}

export function ProjectList({ projects, onProjectClick }: ProjectListProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          onClick={() => onProjectClick(project)}
        />
      ))}
    </div>
  );
}

