import { MenuIcon } from '@heroicons/react/outline';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Building2, Network, ChevronDown, Globe, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';

export default function Navbar({
  setSidebarOpen
}: {
  setSidebarOpen: (open: boolean) => void;
}) {
  const router = useRouter();
  
  // Determine current page based on route
  const getCurrentPage = () => {
    if (router.pathname === '/organizations') return 'organizations';
    if (router.pathname === '/reports') return 'reports';
    if (router.pathname === '/networks' || router.pathname === '/') return 'networks';
    return 'networks';
  };

  const currentPage = getCurrentPage();

  return (
    <nav
      className="absolute right-0 w-full flex items-center justify-between md:justify-end px-4 h-16 border-b border-color-border-200 bg-color-background-100"
      aria-label="Navbar"
    >
      <button
        type="button"
        className="inline-flex md:hidden items-center justify-center rounded-md text-foreground hover:text-primary focus:outline-none focus:ring-0"
        onClick={() => setSidebarOpen(true)}
      >
        <span className="sr-only">Open sidebar</span>
        <MenuIcon className="h-6 w-6" aria-hidden="true" />
      </button>
      
      <div className="flex items-center space-x-4">
        {/* Navigation Buttons */}
        <div className="flex items-center space-x-2">
          <Button
            variant={currentPage === 'networks' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => {
              router.push('/networks');
            }}
            className="flex items-center space-x-2"
          >
            <Network className="h-4 w-4" />
            <span>Networks</span>
          </Button>
          <Button
            variant={currentPage === 'organizations' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => {
              router.push('/organizations');
            }}
            className="flex items-center space-x-2"
          >
            <Building2 className="h-4 w-4" />
            <span>Organizations</span>
          </Button>
          <Button
            variant={currentPage === 'reports' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => {
              router.push('/reports');
            }}
            className="flex items-center space-x-2"
          >
            <FileText className="h-4 w-4" />
            <span>Reports</span>
          </Button>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="text-sm text-color-text-300">
            Cisco Meraki Network Manager
          </div>
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
