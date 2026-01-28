'use client';

import { AppSidebarClient } from "@/components/sidebar/sidebar.client.component"
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from "@/components/ui/sidebar"
import { HelperComponent } from "../dialog/dialog.helper.component"
import ExportDialog from "../dialog/dialog.export.component"
import { Badge } from "../ui/badge"
import YamlImportButton from "../flow/flow.import.component"
import WarningsDrawer from "../warnings/warnings.main.component"
import { useProject } from "@/contexts/ProjectContext"
import { ProjectManager } from "../projects/project.manager.component"
import { VersionHistory } from "../projects/version.history.component"
import { Node, Edge } from '@xyflow/react'
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Save, History, FolderOpen, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { DeleteProjectDialog } from '../projects/delete-project-dialog'
import { ThemeToggle } from '@/components/ui/theme-toggle'

interface MainSidebarProps {
    children: React.ReactNode;
    topics?: string[];
    versions: any;
    currentNodes?: Node[];
    currentEdges?: Edge[];
    currentVersionSlug?: string | null;
    currentVersionId?: string | null;
    onLoadProject?: (nodes: Node[], edges: Edge[], projectId: string, projectName: string) => void;
    onLoadVersion?: (nodes: Node[], edges: Edge[], versionId?: string | null, versionData?: { id: string; slug?: string | null }) => void;
    getCurrentNodesEdges?: () => { nodes: Node[]; edges: Edge[] };
}

export default function MainSidebar({
    children,
    topics = [],
    versions,
    currentNodes = [],
    currentEdges = [],
    currentVersionSlug = null,
    currentVersionId = null,
    onLoadProject,
    onLoadVersion,
    getCurrentNodesEdges
}: MainSidebarProps) {
    const { currentProjectName, currentProjectId, navigateToProject } = useProject();
    const router = useRouter();
    const [loadDialogOpen, setLoadDialogOpen] = useState(false);
    const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const initialTopics = topics.sort((a, b) => a == "welcome.md" ? -1 : b == "welcome.md" ? 1 : a.localeCompare(b))

    const fetchProjects = async () => {
        try {
            const response = await fetch('/api/projects');
            if (response.ok) {
                const projectsData = await response.json();
                setProjects(projectsData);
            }
        } catch (error) {
            console.error('Failed to fetch projects:', error);
        }
    };

    const handleLoadProject = async (projectId: string) => {
        setLoading(true);
        try {
            const response = await fetch(`/api/projects/${projectId}`);
            if (response.ok) {
                const project = await response.json();
                if (onLoadProject) {
                    onLoadProject(project.nodes || [], project.edges || [], project.id, project.name);
                }
                setLoadDialogOpen(false);
                navigateToProject(project.slug);
            }
        } catch (error) {
            console.error('Failed to load project:', error);
            alert('Failed to load project');
        } finally {
            setLoading(false);
        }
    };

    const handleVersionBadgeClick = () => {
        if (currentProjectId && currentProjectName && onLoadVersion) {
            setVersionHistoryOpen(true);
        }
    };
    return (
        <SidebarProvider>
            <AppSidebarClient versions={versions} />
            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center gap-4 border-b px-4">
                    <SidebarTrigger />
                    <Separator
                        orientation="vertical"
                        className="data-[orientation=vertical]:h-4"
                    />
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem>
                                <BreadcrumbLink
                                    href="/"
                                    className="cursor-pointer hover:text-foreground"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        router.push('/');
                                    }}
                                >
                                    KubeForge
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            {currentProjectName && (
                                <>
                                    <BreadcrumbSeparator />
                                    <BreadcrumbItem>
                                        <Dialog open={loadDialogOpen} onOpenChange={setLoadDialogOpen}>
                                            <DialogTrigger asChild>
                                                <BreadcrumbLink
                                                    className="cursor-pointer hover:text-foreground"
                                                    onClick={() => {
                                                        fetchProjects();
                                                    }}
                                                >
                                                    {currentProjectName}
                                                </BreadcrumbLink>
                                            </DialogTrigger>
                                            <DialogContent className="max-w-2xl">
                                                <DialogHeader>
                                                    <DialogTitle>Load Project</DialogTitle>
                                                </DialogHeader>
                                                <div className="space-y-4 max-h-96 overflow-y-auto">
                                                    {projects.length === 0 ? (
                                                        <p className="text-muted-foreground text-center py-8">No saved projects</p>
                                                    ) : (
                                                        projects.map((project) => (
                                                            <Card key={project.id} className="cursor-pointer hover:bg-muted/50">
                                                                <div className="relative">
                                                                    <CardHeader className="pb-2 pr-10">
                                                                        <div className="flex items-center justify-between">
                                                                            <CardTitle className="text-base">{project.name}</CardTitle>
                                                                            <div className="flex items-center space-x-2">
                                                                                {currentProjectId === project.id && (
                                                                                    <Badge variant="secondary">Current</Badge>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        <CardDescription>
                                                                            Created: {new Date(project.createdAt).toLocaleDateString()}
                                                                            {project._count?.versions > 0 && (
                                                                                <span className="ml-2">
                                                                                    • {project._count.versions} version{project._count.versions !== 1 ? 's' : ''}
                                                                                </span>
                                                                            )}
                                                                        </CardDescription>
                                                                    </CardHeader>
                                                                    <CardContent className="pt-0 flex justify-end gap-2">
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            onClick={() => handleLoadProject(project.id)}
                                                                            disabled={loading}
                                                                            className=""
                                                                        >
                                                                            {loading ? 'Loading...' : 'Load Project'}
                                                                        </Button>
                                                                        <DeleteProjectDialog
                                                                            projectId={project.id}
                                                                            projectName={project.name}
                                                                            onDeleted={fetchProjects}
                                                                            currentProjectId={currentProjectId}
                                                                        />
                                                                    </CardContent>
                                                                </div>
                                                            </Card>
                                                        ))
                                                    )}
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    </BreadcrumbItem>
                                </>
                            )}
                        </BreadcrumbList>
                    </Breadcrumb>

                    {/* Version Badge */}
                    {currentProjectName && (
                        <Badge
                            variant="secondary"
                            className="bg-orange-500 text-white dark:bg-blue-600 h-4 rounded-[4px] px-2 text-[10px] font-normal ml-2 cursor-pointer hover:bg-orange-600 dark:hover:bg-blue-700 transition-colors"
                            onClick={handleVersionBadgeClick}
                            title="Click to view version history"
                        >
                            {currentVersionSlug || 'Latest'}
                        </Badge>
                    )}

                    <Separator
                        orientation="vertical"
                        className="data-[orientation=vertical]:h-4"
                    />

                    {/* Project Management Controls */}
                    {onLoadProject && (
                        <>
                            <ProjectManager
                                currentNodes={currentNodes}
                                currentEdges={currentEdges}
                                onLoadProject={onLoadProject}
                                currentProjectId={currentProjectId}
                                getCurrentNodesEdges={getCurrentNodesEdges}
                            />
                            {currentProjectId && currentProjectName && onLoadVersion && (
                                <VersionHistory
                                    projectId={currentProjectId}
                                    projectName={currentProjectName}
                                    onLoadVersion={onLoadVersion}
                                    externalOpen={versionHistoryOpen}
                                    onExternalOpenChange={setVersionHistoryOpen}
                                    currentVersionId={currentVersionId ?? undefined}
                                />
                            )}
                        </>
                    )}
                    <div className="flex-grow" />
                    <ThemeToggle />
                    <WarningsDrawer />
                    <ExportDialog />
                    <HelperComponent className="mr-2" topics={initialTopics} />
                </header>
                <div className="flex flex-1 flex-col gap-4 p-4">
                    {children}
                </div>

            </SidebarInset>
        </SidebarProvider>
    )
}
