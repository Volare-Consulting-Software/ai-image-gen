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
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">Start an image project</h1>
        <p className="mb-4 text-sm text-zinc-500">
          Describe what you want. We&apos;ll ask a few questions if it&apos;s vague, generate options
          with Gemini, then sharpen your pick with Claude.
        </p>
        <NewProjectComposer />
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold tracking-tight">Your projects</h2>
        {projects.length === 0 ? (
          <p className="text-sm text-zinc-500">No projects yet — create your first above.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map(({ project, imageCount }) => (
              <li key={project.id}>
                <Link
                  href={`/projects/${project.id}`}
                  className="block overflow-hidden rounded-lg border border-zinc-200 bg-white transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="flex aspect-video items-center justify-center bg-zinc-100 dark:bg-zinc-800">
                    {project.selectedImageId ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/images/${project.selectedImageId}`}
                        alt={project.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-3xl">🖼️</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 p-3">
                    <span className="line-clamp-2 text-sm font-medium">{project.title}</span>
                    <div className="flex items-center justify-between">
                      <StatusBadge status={project.status} />
                      <span className="text-xs text-zinc-500">{imageCount} images</span>
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
