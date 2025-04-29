import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/providers/theme-provider';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      className="transition-colors hover:bg-opacity-15 hover:bg-[#43EB3E] border-none"
    >
      {theme === 'dark' ? (
        <Sun className="h-5 w-5 text-[#43EB3E]" />
      ) : (
        <Moon className="h-5 w-5 text-[#043375]" />
      )}
    </Button>
  );
}