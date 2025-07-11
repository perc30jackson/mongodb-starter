import Link from 'next/link';
import { useRouter } from 'next/router';
import { ChevronRight, Home, Building2, Network, Shield, Wifi, FileText } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export default function Breadcrumb() {
  const router = useRouter();
  const { pathname, query } = router;

  const getBreadcrumbs = (): BreadcrumbItem[] => {
    const breadcrumbs: BreadcrumbItem[] = [
      { label: 'Home', href: '/', icon: Home }
    ];

    if (pathname === '/organizations') {
      breadcrumbs.push({ label: 'Organizations', icon: Building2 });
    }
    
    if (pathname === '/reports') {
      breadcrumbs.push({ label: 'Reports', icon: FileText });
    }
    
    if (pathname === '/organization/[organizationId]' && query.organizationId) {
      breadcrumbs.push(
        { label: 'Organizations', href: '/organizations', icon: Building2 },
        { label: `Organization ${query.organizationId}`, icon: Building2 }
      );
    }

    if (pathname === '/[networkId]' && query.networkId) {
      breadcrumbs.push(
        { label: 'Networks', href: '/', icon: Network },
        { label: `Network ${query.networkId}`, icon: Network }
      );
    }

    if (pathname === '/firewall/[networkId]' && query.networkId) {
      breadcrumbs.push(
        { label: 'Networks', href: '/', icon: Network },
        { label: `Network ${query.networkId}`, href: `/${query.networkId}`, icon: Network },
        { label: 'Firewall', icon: Shield }
      );
    }

    if (pathname === '/switch/[networkId]' && query.networkId) {
      breadcrumbs.push(
        { label: 'Networks', href: '/', icon: Network },
        { label: `Network ${query.networkId}`, href: `/${query.networkId}`, icon: Network },
        { label: 'Switch', icon: Network }
      );
    }

    if (pathname === '/wireless/[networkId]' && query.networkId) {
      breadcrumbs.push(
        { label: 'Networks', href: '/', icon: Network },
        { label: `Network ${query.networkId}`, href: `/${query.networkId}`, icon: Network },
        { label: 'Wireless', icon: Wifi }
      );
    }

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  // Don't show breadcrumbs on home page
  if (breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <nav className="flex items-center space-x-1 text-sm text-muted-foreground mb-4">
      {breadcrumbs.map((item, index) => (
        <div key={item.label} className="flex items-center space-x-1">
          {index > 0 && <ChevronRight className="h-4 w-4" />}
          
          {item.href ? (
            <Link 
              href={item.href}
              className="flex items-center space-x-1 hover:text-foreground transition-colors"
            >
              {item.icon && <item.icon className="h-4 w-4" />}
              <span>{item.label}</span>
            </Link>
          ) : (
            <div className="flex items-center space-x-1 text-foreground">
              {item.icon && <item.icon className="h-4 w-4" />}
              <span>{item.label}</span>
            </div>
          )}
        </div>
      ))}
    </nav>
  );
}
