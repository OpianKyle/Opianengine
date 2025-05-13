import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Changed to default export
const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  // Initialize with light mode as default, only use stored preference if explicitly set
  const [theme, setTheme] = useState<Theme>(() => {
    // Check local storage first
    const storedTheme = localStorage.getItem('opian-theme');
    if (storedTheme && (storedTheme === 'dark' || storedTheme === 'light')) {
      return storedTheme as Theme;
    }
    
    // Default to light mode always (ignoring system preference)
    return 'light';
  });

  useEffect(() => {
    // Update local storage and document class when theme changes
    localStorage.setItem('opian-theme', theme);
    
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);
  
  // Ensure the correct theme class is applied when the app first loads
  useEffect(() => {
    // Remove any potential 'dark' class that might be applied by system preference
    if (theme === 'light') {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }, []);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export default ThemeProvider;