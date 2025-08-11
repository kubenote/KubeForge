import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, SquareMinus, SquarePlus } from "lucide-react";

interface CollapsibleToggleProps {
    collapsed: boolean;
    onToggle: () => void;
    size?: number;
    variant?: 'chevron' | 'square';
    className?: string;
    position?: 'absolute' | 'relative';
}

export function CollapsibleToggle({ 
    collapsed, 
    onToggle, 
    size = 12, 
    variant = 'chevron',
    className = "",
    position = 'relative'
}: CollapsibleToggleProps) {
    if (variant === 'square') {
        return collapsed ? (
            <SquarePlus
                size={size}
                className={`cursor-pointer hover:text-[#888] ${className}`}
                onClick={onToggle}
            />
        ) : (
            <SquareMinus
                size={size}
                className={`cursor-pointer hover:text-[#888] ${className}`}
                onClick={onToggle}
            />
        );
    }

    const positionClasses = position === 'absolute' 
        ? "absolute left-[-8] top-1/2 -translate-y-1/2" 
        : "";
    
    return (
        <Button
            variant="ghost"
            size="icon"
            className={`w-4 h-4 p-0 ${positionClasses} ${className}`}
            onClick={onToggle}
        >
            {collapsed ? <ChevronRight size={size} /> : <ChevronDown size={size} />}
        </Button>
    );
}