import { getKubeSchemaBranches } from "@/lib/getBranches";
import { AppSidebarClient } from "@/components/sidebar/sidebar.client.component";

export default async function AppSidebar(props: any) {
  const versions = await getKubeSchemaBranches();

  return <AppSidebarClient {...props} versions={versions} />;
}
