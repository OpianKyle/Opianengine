import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/providers/theme-provider';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  className?: string;
  iconSize?: number;
}

export function ThemeToggle({ className, iconSize = 5 }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      className={cn(
        "transition-colors hover:bg-opacity-15 hover:bg-[#43EB3E] border-none", 
        className
      )}
    >
      {theme === 'dark' ? (
        <Sun className="text-[#43EB3E]" style={{ height: `${iconSize}px`, width: `${iconSize}px` }} />
      ) : (
        <Moon className="text-[#043375]" style={{ height: `${iconSize}px`, width: `${iconSize}px` }} />
      )}
    </Button>
  );
}