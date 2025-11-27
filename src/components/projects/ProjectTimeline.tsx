import { TimelineEvent } from "./types";
import Link from "next/link";

interface ProjectTimelineProps {
  events: TimelineEvent[];
}

export function ProjectTimeline({ events }: ProjectTimelineProps) {
  return (
    <div className="space-y-4">
      {events.map((event, index) => (
        <div key={index} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="h-3 w-3 rounded-full bg-slate-900"></div>
            {index < events.length - 1 && (
              <div className="h-12 w-0.5 bg-slate-200"></div>
            )}
          </div>
          <div className="flex-1 pb-4">
            <p className="text-sm font-medium text-slate-900">
              {event.title.includes("#") ? (
                <Link
                  href={`/app/billing?invoice=${event.title.match(/#(\d+)/)?.[1] || ""}`}
                  className="hover:text-slate-600"
                >
                  {event.title}
                </Link>
              ) : (
                event.title
              )}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {new Date(event.date).toLocaleDateString("fr-FR")}
            </p>
            {event.description && (
              <p className="text-xs text-slate-600 mt-1">
                {event.description.includes("#") ? (
                  <Link
                    href={`/app/billing?invoice=${event.description.match(/#(\d+)/)?.[1] || ""}`}
                    className="hover:text-slate-600"
                  >
                    {event.description}
                  </Link>
                ) : (
                  event.description
                )}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

