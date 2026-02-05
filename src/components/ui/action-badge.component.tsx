import { ReactNode } from 'react';

type BadgeVariant = 'blue' | 'orange' | 'green' | 'red' | 'gray';

interface ActionBadgeProps {
    children: ReactNode;
    variant?: BadgeVariant;
    onClick?: () => void;
    className?: string;
    size?: 'sm' | 'md';
}

const variantClasses: Record<BadgeVariant, string> = {
    blue: "bg-info text-info-foreground",
    orange: "bg-orange-500 text-white dark:bg-orange-600",
    green: "bg-success text-success-foreground",
    red: "bg-destructive text-white",
    gray: "bg-gray-500 text-white dark:bg-gray-600"
};

const sizeClasses = {
    sm: "h-4 text-[10px]",
    md: "h-5 text-xs"
};

export function ActionBadge({ 
    children, 
    variant = 'blue', 
    onClick, 
    className = "",
    size = 'sm'
}: ActionBadgeProps) {
    const baseClasses = "rounded-[3px] px-1 !font-[400] cursor-pointer";
    const variantClass = variantClasses[variant];
    const sizeClass = sizeClasses[size];
    
    return (
        <span
            className={`${baseClasses} ${variantClass} ${sizeClass} ${className}`}
            onClick={onClick}
        >
            {children}
        </span>
    );
}