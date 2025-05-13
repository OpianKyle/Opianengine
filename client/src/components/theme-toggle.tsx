import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/providers/theme-provider';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  className?: string;
  iconSize?: number;
}

export function ThemeToggle({ className, iconSize = 24 }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button 
      variant="ghost" 
      size="lg" 
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      className={cn(
        "transition-colors hover:bg-opacity-15 hover:bg-[#43EB3E] border-none rounded-full h-12 w-12 p-2", 
        className
      )}
    >
      {theme === 'dark' ? (
        <Sun className="text-[#43EB3E] h-full w-full" />
      ) : (
        <Moon className="text-[#043375] h-full w-full" />
      )}
    </Button>
  );
}