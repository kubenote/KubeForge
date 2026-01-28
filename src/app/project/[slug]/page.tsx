import { ProjectProvider } from "@/contexts/ProjectContext";
import { getTopics } from "@/lib/getDocs";
import { getKubeSchemaBranches } from "@/lib/getBranches";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ProjectPageClient } from "./page-client";
import { safeJsonParse } from "@/lib/safeJson";

interface ProjectPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { slug } = await params;
  const topics = getTopics();
  const versions = await getKubeSchemaBranches();
  
  // Find project by slug
  const project = await prisma.project.findUnique({
    where: { slug },
    include: {
      versions: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          slug: true,
          createdAt: true,
          message: true,
          nodes: true,
          edges: true,
        },
      },
    },
  });

  if (!project) {
    notFound();
  }

  // Get the latest version's nodes and edges
  const latestVersion = project.versions[0];
  const initialNodes = latestVersion ? safeJsonParse(latestVersion.nodes, []) : [];
  const initialEdges = latestVersion ? safeJsonParse(latestVersion.edges, []) : [];

  return (
    <div className="flex flex-col min-h-screen">
      <ProjectProvider>
        <ProjectPageClient 
          project={{
            ...project,
            versions: project.versions.map(v => ({
              id: v.id,
              slug: v.slug,
              createdAt: v.createdAt.toISOString(),
              message: v.message
            }))
          }}
          initialNodes={initialNodes}
          initialEdges={initialEdges}
          topics={topics}
          versions={versions}
        />
      </ProjectProvider>
    </div>
  );
}