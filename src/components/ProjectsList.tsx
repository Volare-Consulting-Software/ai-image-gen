"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { StatusBadge } from "@/components/StatusBadge";
import type { ProjectListItem } from "@/logic/projectQueries";
import { formatCostUsd } from "@/lib/format";

// The gallery of existing projects with a client-side search box that filters by
// title / prompt. Each card shows its total spend.
export function ProjectsList({ projects }: { projects: ProjectListItem[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(({ project }) =>
      [project.title, project.originalPrompt, project.refinedPrompt]
        .filter((v): v is string => Boolean(v))
        .some((v) => v.toLowerCase().includes(q)),
    );
  }, [projects, query]);

  if (projects.length === 0) {
    return <p className="text-sm text-text-muted">No projects yet. Create your first one above.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search projects by prompt…"
        className="w-full max-w-sm rounded-lg border border-border bg-base p-2 text-text-primary outline-none focus:border-accent"
      />

      {filtered.length === 0 ? (
        <p className="text-sm text-text-muted">No projects match “{query}”.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(({ project, imageCount, recentImageIds, totalCostUsd }) => (
            <li key={project.id}>
              <Link
                href={`/projects/${project.id}`}
                className="block overflow-hidden rounded-xl border border-border bg-surface transition-colors hover:border-border-strong"
              >
                {recentImageIds.length === 0 ? (
                  <div className="flex aspect-video items-center justify-center bg-surface-sunken">
                    <span className="text-xs font-medium text-text-muted">No image yet</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-px bg-border">
                    {recentImageIds.map((id) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={id}
                        src={`/api/images/${id}`}
                        alt={project.title}
                        className="aspect-square w-full bg-surface-sunken object-cover"
                      />
                    ))}
                  </div>
                )}
                <div className="flex flex-col gap-2 p-3">
                  <span className="line-clamp-2 text-sm font-semibold">{project.title}</span>
                  <div className="flex items-center justify-between">
                    <StatusBadge status={project.status} />
                    <span className="text-xs text-text-muted">
                      {imageCount} images
                      {totalCostUsd > 0 && ` · ${formatCostUsd(totalCostUsd)}`}
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
