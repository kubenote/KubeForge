import AppSidebar from "components/components/sidebar/sidebar.app.component"
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
import { getTopics } from "components/lib/getDocs"
import ExportDialog from "../dialog/dialog.export.component"
import { Badge } from "../ui/badge"
import YamlImportButton from "../flow/flow.import.component"
import WarningsDrawer from "../warnings/warnings.main.component"


export default function MainSidebar({ children }: any) {
    const topics = getTopics()
    const initialTopics = topics.sort((a, b) => a == "welcome.md" ? -1 : b == "welcome.md" ? 1 : a.localeCompare(b))
    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
                    <SidebarTrigger />
                    <Separator
                        orientation="vertical"
                        className="data-[orientation=vertical]:h-4"
                    />
                    <Breadcrumb className="px-4">
                        <BreadcrumbList>
                            <BreadcrumbItem className="hidden md:block">
                                <BreadcrumbLink href="#">
                                    KubeForge
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator className="hidden md:block" />
                            <BreadcrumbItem>
                                <BreadcrumbPage><Badge
                                    variant="secondary"
                                    className="bg-orange-500 text-white dark:bg-blue-600 h-4 rounded-[3px] px-1 cursor-pointer mr-2 text-[10px] !font-[400]"
                                >
                                    YAML
                                </Badge>
                                    Untitled Grid
                                </BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                    <Separator
                        orientation="vertical"
                        className="data-[orientation=vertical]:h-4"
                    />
                    <YamlImportButton />
                    <div className="flex-grow" />
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
