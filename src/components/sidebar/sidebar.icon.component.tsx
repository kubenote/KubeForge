'use client';

import { BoxIcon, Layers, ListTree, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SidebarView = 'workloads' | 'layers' | 'templates' | 'integrations';

interface IconSidebarProps {
    activeView: SidebarView;
    onViewChange: (view: SidebarView) => void;
    showIntegrations?: boolean;
    bottomSlot?: React.ReactNode;
}

export function IconSidebar({ activeView, onViewChange, showIntegrations = true, bottomSlot }: IconSidebarProps) {
    return (
        <div className="flex h-full w-12 flex-col items-center border-r bg-sidebar shrink-0">
            <a href="/dashboard" className="flex items-center justify-center h-16 w-full border-b shrink-0 cursor-pointer" title="Dashboard">
                <img
                    src="/icon.png"
                    alt="KubeForge"
                    className="w-6 h-6"
                />
            </a>
            <div className="flex flex-col items-center gap-2 pt-3 flex-1">
                <button
                    onClick={() => onViewChange('workloads')}
                    className={cn(
                        'flex items-center justify-center w-8 h-8 rounded-md transition-colors cursor-pointer',
                        activeView === 'workloads'
                            ? 'bg-[#333] text-white'
                            : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                    )}
                    title="Workloads"
                >
                    <BoxIcon className="w-5 h-5" />
                </button>
                <button
                    onClick={() => onViewChange('layers')}
                    className={cn(
                        'flex items-center justify-center w-8 h-8 rounded-md transition-colors cursor-pointer',
                        activeView === 'layers'
                            ? 'bg-[#333] text-white'
                            : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                    )}
                    title="Layers"
                >
                    <ListTree className="w-5 h-5" />
                </button>
                <button
                    onClick={() => onViewChange('templates')}
                    className={cn(
                        'flex items-center justify-center w-8 h-8 rounded-md transition-colors cursor-pointer',
                        activeView === 'templates'
                            ? 'bg-[#333] text-white'
                            : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                    )}
                    title="Templates"
                >
                    <Layers className="w-5 h-5" />
                </button>
                {showIntegrations && (
                    <button
                        onClick={() => onViewChange('integrations')}
                        className={cn(
                            'flex items-center justify-center w-8 h-8 rounded-md transition-colors cursor-pointer',
                            activeView === 'integrations'
                                ? 'bg-[#333] text-white'
                                : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                        )}
                        title="Integrations"
                    >
                        <Zap className="w-5 h-5" />
                    </button>
                )}
            </div>
            {bottomSlot && (
                <div className="flex flex-col items-center gap-2 pb-3">
                    {bottomSlot}
                </div>
            )}
        </div>
    );
}
