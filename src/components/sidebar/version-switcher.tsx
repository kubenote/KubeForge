"use client";

import * as React from "react";
import { Check, ChevronsUpDown, GalleryVerticalEnd } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "components/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "components/components/ui/sidebar";
import { useVersion } from "@/providers/VersionProvider";
import { Badge } from "../ui/badge";
import { SiKubernetes } from "react-icons/si";

export function VersionSwitcher({
  versions,
  defaultVersion,
  onSelect, // <- Add callback prop
}: {
  versions: string[];
  defaultVersion: string;
  onSelect?: (version: string) => void;
}) {
  const { version, setVersion } = useVersion();

  React.useEffect(() => {
    const savedVersion = localStorage.getItem("preferredK8sVersion");
    if (savedVersion) {
      setVersion(savedVersion);
    } else {
      onSelect?.("v1.33.3"); // <- Invoke callback if defined
    }
  }, []);

  const handleSelect = (version: string) => {
    localStorage.setItem("preferredK8sVersion", version); // Cache in localStorage
    onSelect?.(version); // <- Invoke callback if defined
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <GalleryVerticalEnd className="size-4" />
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-medium">Kubernetes Version</span>
                <Badge
                  variant="secondary"
                  className="bg-blue-500 text-white dark:bg-blue-600 h-4 rounded-[3px] px-0.5 cursor-pointer mr-2 text-[10px] !font-[400]"
                >
                  <SiKubernetes />
                  {version}
                </Badge>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width)"
            align="start"
          >
            {versions
              .filter((version) => !version.includes("main"))
              .sort()
              .reverse()
              .map((version2) => (
                <DropdownMenuItem
                  key={version2}
                  onSelect={() => handleSelect(version2)}
                >
                  {version2}
                  {version2 === version && <Check className="ml-auto" />}
                </DropdownMenuItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
