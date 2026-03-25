import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RefreshButtonProps {
  onRefresh: () => Promise<void>;
  className?: string;
}

export function RefreshButton({ onRefresh, className }: RefreshButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (isRefreshing) return; // Prevent double-clicks

    setIsRefreshing(true);
    
    try {
      await onRefresh();
    } catch (error) {
      console.error('Refresh failed:', error);
      // Error handling is done by the parent component
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Button
      onClick={handleRefresh}
      disabled={isRefreshing}
      variant="outline"
      size="sm"
      className={cn(
        "gap-2 hover:text-primary hover:border-primary transition-colors",
        isRefreshing && "pointer-events-none",
        className
      )}
    >
      <RefreshCw 
        className={cn(
          "w-4 h-4 transition-transform", 
          isRefreshing && "animate-spin"
        )} 
      />
      {isRefreshing ? 'Refreshing...' : 'Refresh'}
    </Button>
  );
}