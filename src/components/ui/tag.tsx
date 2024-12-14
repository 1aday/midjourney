import * as React from "react";
import { cn } from "@/lib/utils";

interface TagProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'sref' | 'ar' | 's';
  onRemove?: () => void;
}

const variantStyles = {
  default: 'bg-primary/10 text-primary',
  sref: 'bg-blue-100 text-blue-800',
  ar: 'bg-green-100 text-green-800',
  s: 'bg-purple-100 text-purple-800',
};

export const Tag = React.forwardRef<HTMLDivElement, TagProps>(
  ({ className, variant = 'default', children, onRemove, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-md px-2 py-1 text-sm font-semibold mr-2",
          variantStyles[variant],
          className
        )}
        {...props}
      >
        {children}
        {onRemove && (
          <button
            onClick={onRemove}
            className="ml-1 hover:text-gray-700"
            aria-label="Remove tag"
          >
            ×
          </button>
        )}
      </div>
    );
  }
);

Tag.displayName = "Tag";
