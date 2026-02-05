import { ProjectProvider } from "@/contexts/ProjectContext";
import { getTopics } from "@/lib/getDocs";
import { getKubeSchemaBranches } from "@/lib/getBranches";
import { NewProjectClient } from "./page-client";

export const dynamic = 'force-dynamic';

export default async function NewProjectPage() {
  const topics = getTopics();
  const versions = await getKubeSchemaBranches();

  return (
    <div className="flex flex-col min-h-screen">
      <ProjectProvider>
        <NewProjectClient topics={topics} versions={versions} />
      </ProjectProvider>
    </div>
  );
}