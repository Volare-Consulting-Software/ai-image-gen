import { listProjects } from "@/logic/projectQueries";
import { NewProjectComposer } from "@/components/NewProjectComposer";
import { ProjectsList } from "@/components/ProjectsList";

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
        <ProjectsList projects={projects} />
      </section>
    </div>
  );
}
