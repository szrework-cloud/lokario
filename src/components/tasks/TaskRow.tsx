import { Tag } from "@/components/ui/Tag";
import { Task } from "./TasksTable";

interface TaskRowProps {
  task: Task;
  onClick?: (task: Task) => void;
}

export function TaskRow({ task, onClick }: TaskRowProps) {
  const getStatusVariant = (status: Task["status"]): "default" | "warning" | "success" | "error" => {
    switch (status) {
      case "À faire":
        return "default";
      case "En cours":
        return "warning";
      case "Terminée":
        return "success";
      case "En retard":
        return "error";
      default:
        return "default";
    }
  };

  const getTypeVariant = (type?: Task["type"]): "info" | "success" | "warning" | "default" => {
    if (!type) return "default";
    switch (type) {
      case "Interne":
        return "info";
      case "Client":
        return "success";
      case "Fournisseur":
        return "warning";
      default:
        return "default";
    }
  };

  return (
    <tr
      className="hover:bg-slate-50 cursor-pointer"
      onClick={() => onClick?.(task)}
    >
      <td className="px-6 py-4 whitespace-nowrap">
        <input type="checkbox" className="rounded border-slate-300" />
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#0F172A]">
        {task.title}
        {task.type && (
          <div className="mt-1">
            <Tag variant={getTypeVariant(task.type)}>{task.type}</Tag>
          </div>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#64748B]">
        {task.assignedTo || "Non assigné"}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#64748B]">
        {task.dueDate}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <Tag variant={getStatusVariant(task.status)}>{task.status}</Tag>
      </td>
    </tr>
  );
}

