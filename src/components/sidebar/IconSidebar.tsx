'use client';

import { BoxIcon, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SidebarView = 'workloads' | 'templates';

interface IconSidebarProps {
    activeView: SidebarView;
    onViewChange: (view: SidebarView) => void;
}

export function IconSidebar({ activeView, onViewChange }: IconSidebarProps) {
    return (
        <div className="flex h-full w-12 flex-col items-center border-r bg-sidebar shrink-0">
            <a href="/dashboard" className="flex items-center justify-center h-16 w-full border-b shrink-0 cursor-pointer" title="Dashboard">
                <img
                    src="/icon.png"
                    alt="KubeForge"
                    className="w-6 h-6"
                />
            </a>
            <div className="flex flex-col items-center gap-2 pt-3">
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
            </div>
        </div>
    );
}
