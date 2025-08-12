import Flow from "components/components/flow/flow.main.component";
import MainSidebar from "components/components/sidebar/sidebar.main.component";
import { ProjectProvider } from "@/contexts/ProjectContext";
import { getTopics } from "components/lib/getDocs";
import { getKubeSchemaBranches } from "@/lib/getBranches";
import { NewProjectClient } from "./page-client";

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