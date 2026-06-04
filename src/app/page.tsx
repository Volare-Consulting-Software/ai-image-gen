import Link from "next/link";

import { listProjects } from "@/logic/projectQueries";
import { NewProjectComposer } from "@/components/NewProjectComposer";
import { StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

export default async function Home() {
  const projects = await listProjects();

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h1 className="mb-1 text-2xl font-extrabold tracking-tight">Start an image project</h1>
        <p className="mb-4 text-sm text-text-secondary">
          Describe what you want. We&apos;ll ask a few questions if it&apos;s vague, generate options
          to choose from, then refine your pick into a finished graphic.
        </p>
        <NewProjectComposer />
      </section>

      <section>
        <h2 className="mb-4 text-lg font-bold tracking-tight">Your projects</h2>
        {projects.length === 0 ? (
          <p className="text-sm text-text-muted">No projects yet. Create your first one above.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map(({ project, imageCount }) => (
              <li key={project.id}>
                <Link
                  href={`/projects/${project.id}`}
                  className="block overflow-hidden rounded-xl border border-border bg-surface transition-colors hover:border-border-strong"
                >
                  <div className="flex aspect-video items-center justify-center bg-surface-sunken">
                    {project.selectedImageId ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/images/${project.selectedImageId}`}
                        alt={project.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-xs font-medium text-text-muted">No image yet</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 p-3">
                    <span className="line-clamp-2 text-sm font-semibold">{project.title}</span>
                    <div className="flex items-center justify-between">
                      <StatusBadge status={project.status} />
                      <span className="text-xs text-text-muted">{imageCount} images</span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
