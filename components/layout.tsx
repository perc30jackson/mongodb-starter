import { ReactNode } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Building2, Network, FileText, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Meta, { MetaProps } from '@/components/layout/meta';

interface LayoutProps {
  children: ReactNode;
  meta?: MetaProps;
  showNavigation?: boolean;
}

export default function Layout({ 
  children, 
  meta,
  showNavigation = true 
}: LayoutProps) {
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
    <div className="min-h-screen bg-black text-white">
      {meta && <Meta props={meta} />}
      
      {showNavigation && (
        <header className="border-b border-gray-800">
          <nav className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center space-x-6">
              {/* Logo/Brand */}
              <Link href="/" className="flex items-center space-x-2">
                <Network className="h-6 w-6 text-blue-500" />
                <span className="text-lg font-semibold">Meraki Dashboard</span>
              </Link>
              
              {/* Navigation Buttons */}
              <div className="hidden md:flex items-center space-x-2">
                <Button
                  variant={currentPage === 'networks' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => {
                    if (currentPage !== 'networks') {
                      router.push('/networks');
                    }
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
                    if (currentPage !== 'organizations') {
                      router.push('/organizations');
                    }
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
                    if (currentPage !== 'reports') {
                      router.push('/reports');
                    }
                  }}
                  className="flex items-center space-x-2"
                >
                  <FileText className="h-4 w-4" />
                  <span>Reports</span>
                </Button>
              </div>
            </div>
            
            {/* Mobile menu button */}
            <div className="md:hidden">
              <Button variant="ghost" size="sm">
                <Menu className="h-5 w-5" />
              </Button>
            </div>
          </nav>
          
          {/* Mobile navigation */}
          <div className="md:hidden px-4 pb-3">
            <div className="flex flex-col space-y-2">
              <Button
                variant={currentPage === 'networks' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => {
                  if (currentPage !== 'networks') {
                    router.push('/networks');
                  }
                }}
                className="flex items-center space-x-2 justify-start"
              >
                <Network className="h-4 w-4" />
                <span>Networks</span>
              </Button>
              
              <Button
                variant={currentPage === 'organizations' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => {
                  if (currentPage !== 'organizations') {
                    router.push('/organizations');
                  }
                }}
                className="flex items-center space-x-2 justify-start"
              >
                <Building2 className="h-4 w-4" />
                <span>Organizations</span>
              </Button>
              
              <Button
                variant={currentPage === 'reports' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => {
                  if (currentPage !== 'reports') {
                    router.push('/reports');
                  }
                }}
                className="flex items-center space-x-2 justify-start"
              >
                <FileText className="h-4 w-4" />
                <span>Reports</span>
              </Button>
            </div>
          </div>
        </header>
      )}
      
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
