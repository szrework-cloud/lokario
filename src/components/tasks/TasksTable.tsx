import { Tag } from "@/components/ui/Tag";
import { TaskRow } from "./TaskRow";

export interface Task {
  id: number;
  title: string;
  assignedTo?: string;
  dueDate: string;
  status: "À faire" | "En cours" | "Terminée" | "En retard";
  type?: "Interne" | "Client" | "Fournisseur";
}

interface TasksTableProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
}

export function TasksTable({ tasks, onTaskClick }: TasksTableProps) {
  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px]">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              <input type="checkbox" className="rounded border-slate-300" />
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Titre
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Assigné à
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Échéance
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Statut
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} onClick={onTaskClick} />
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

