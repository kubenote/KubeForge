"use client";

import * as React from "react";
import { Check, ChevronsUpDown, GalleryVerticalEnd } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useVersion } from "@/providers/VersionProvider";
import { Badge } from "../ui/badge";
function KubernetesIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 32 32" fill="currentColor">
      <path d="M15.9.5a2.4 2.4 0 0 0-1.1.3L4 6.6a2.4 2.4 0 0 0-1.1 1.4l-2.8 12a2.4 2.4 0 0 0 .3 1.8l7.6 9.7a2.4 2.4 0 0 0 1.5.9l12.2.8a2.4 2.4 0 0 0 1.7-.6l8.4-8.9a2.4 2.4 0 0 0 .6-1.7l-.8-12.2a2.4 2.4 0 0 0-.9-1.5L21 .7a2.4 2.4 0 0 0-1.5-.3h-.2L16.1.5zm.1 3.7c.2 0 .3.1.5.2l.2.7v.5l.4 2.6h.2a9 9 0 0 1 3.5 1.4l2.1-1.6.4-.3.6.1.3.4.1.5-.2.5-1.5 2.2a9 9 0 0 1 2.1 3.2l2.7.2h.5l.3.5v.6l-.3.4-.5.2-2.6.3a9 9 0 0 1-.8 3.7l1.8 1.9.3.4-.1.6-.4.3-.5.1-.4-.2-2.3-1.7a9 9 0 0 1-3 1.8l-.1 2.7v.5l-.4.4h-.6l-.4-.3-.3-.5-.5-2.6a9 9 0 0 1-3.7-.6l-1.7 2-.4.3-.6-.1-.3-.4-.1-.5.2-.5 1.5-2.2a9 9 0 0 1-2.3-3.5l-2.4-.1h-.5l-.3-.5v-.6l.3-.4.5-.2 2.6-.3a9 9 0 0 1 .7-3.4l-1.8-2-.3-.4.1-.6.4-.3.5-.1.4.2 2.1 1.6a9 9 0 0 1 3.3-2l.1-2.4v-.5l.4-.4zm0 6.6a5.2 5.2 0 1 0 0 10.4 5.2 5.2 0 0 0 0-10.4z"/>
    </svg>
  );
}

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
    if (savedVersion && versions.includes(savedVersion)) {
      setVersion(savedVersion);
    } else if (versions.length > 0) {
      const latest = [...versions].filter(v => !v.includes("main")).sort().reverse()[0];
      if (latest) onSelect?.(latest);
    }
  }, [versions]);

  const handleSelect = (version: string) => {
    localStorage.setItem("preferredK8sVersion", version); // Cache in localStorage
    onSelect?.(version); // <- Invoke callback if defined
  };

  return (
    <>
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
                <span className="font-medium">Project Version</span>
                <Badge
                  variant="secondary"
                  className="bg-blue-500 text-white dark:bg-blue-600 h-4 rounded-[3px] px-0.5 cursor-pointer mr-2 text-[10px] !font-[400]"
                >
                  <KubernetesIcon />
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
    <hr className="border-t" />
    </>
  );
}
