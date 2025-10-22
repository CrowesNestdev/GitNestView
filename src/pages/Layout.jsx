

import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Calendar, Settings, MapPin, Tv, LayoutDashboard, LogOut, Building2, ArrowLeft, Palette } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

const adminItems = [
  {
    title: "Dashboard",
    url: createPageUrl("AdminDashboard"),
    icon: LayoutDashboard,
  },
  {
    title: "Sports Calendar",
    url: createPageUrl("SportsCalendar"),
    icon: Calendar,
  },
  {
    title: "Channels",
    url: createPageUrl("Channels"),
    icon: Tv,
  },
  {
    title: "Sites",
    url: createPageUrl("Sites"),
    icon: MapPin,
  },
  {
    title: "Brand Schemes",
    url: createPageUrl("BrandSchemes"),
    icon: Palette,
  },
  {
    title: "Users",
    url: createPageUrl("Users"),
    icon: Settings,
  },
];

const superAdminItems = [
  {
    title: "Super Admin",
    url: createPageUrl("SuperAdminDashboard"),
    icon: Building2,
  },
];

const siteItems = [
  {
    title: "My Schedule",
    url: createPageUrl("SiteView"),
    icon: Calendar,
  },
];

const settingsItem = {
  title: "Settings",
  url: createPageUrl("Settings"),
  icon: Settings,
};

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [user, setUser] = React.useState(null);
  const [company, setCompany] = React.useState(null);
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = React.useState(false);
  const [isViewingAsSuper, setIsViewingAsSuper] = React.useState(false);

  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setIsAdmin(currentUser.role === 'admin');
        setIsSuperAdmin(currentUser.is_super_admin === true);
        
        const viewingCompanyId = localStorage.getItem('superAdminViewingCompany');
        if (currentUser.is_super_admin && viewingCompanyId) {
          setIsViewingAsSuper(true);
          const companies = await base44.entities.Company.filter({ id: viewingCompanyId });
          if (companies.length > 0) {
            setCompany(companies[0]);
          }
        } else if (currentUser.company_id) {
          const companies = await base44.entities.Company.filter({ id: currentUser.company_id });
          if (companies.length > 0) {
            setCompany(companies[0]);
          }
        }
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUser();
  }, []);

  const handleExitSuperView = () => {
    localStorage.removeItem('superAdminViewingCompany');
    window.location.href = createPageUrl("SuperAdminDashboard");
  };

  // Check if this is SiteDisplay page AFTER all hooks - check multiple variations
  if (currentPageName === "SiteDisplay" || currentPageName === "site-display" || location.pathname.includes('/SiteDisplay') || location.pathname.includes('/site-display')) {
    return <>{children}</>;
  }

  let navigationItems = siteItems;
  if (isSuperAdmin && !isViewingAsSuper) {
    navigationItems = superAdminItems;
  } else if (isAdmin || isViewingAsSuper) {
    navigationItems = adminItems;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <style>{`
          :root {
            --primary: 222 47% 11%;
            --primary-foreground: 210 40% 98%;
            --secondary: 217 91% 60%;
            --accent: 38 92% 50%;
            --muted: 220 13% 95%;
          }
        `}</style>
        
        <Sidebar className="border-r border-gray-100 bg-white">
          <SidebarHeader className="border-b border-gray-100 p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg border border-gray-200">
                <img 
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f8a020fd37f54a0c84e66a/5400c33fd_CrowesNest.png" 
                  alt="Nest View Logo" 
                  className="w-8 h-8 object-contain"
                />
              </div>
              <div>
                <h2 className="font-bold text-gray-900 text-lg">Nest View</h2>
                <p className="text-xs text-gray-500">Multi-Site Manager</p>
              </div>
            </div>
            
            {isViewingAsSuper && company && (
              <div className="mt-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <Badge className="bg-indigo-600">Super Admin View</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleExitSuperView}
                    className="h-6 text-xs"
                  >
                    <ArrowLeft className="w-3 h-3 mr-1" />
                    Exit
                  </Button>
                </div>
                <p className="text-sm font-semibold text-gray-900">{company.name}</p>
              </div>
            )}
            
            {company && !isSuperAdmin && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Company</p>
                <p className="text-sm font-semibold text-gray-900">{company.name}</p>
              </div>
            )}
          </SidebarHeader>
          
          <SidebarContent className="p-3">
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 py-2">
                {isSuperAdmin && !isViewingAsSuper ? 'System Management' : isAdmin || isViewingAsSuper ? 'Admin Controls' : 'Your View'}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        className={`hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-xl mb-1 ${
                          location.pathname === item.url ? 'bg-blue-50 text-blue-700 shadow-sm' : ''
                        }`}
                      >
                        <Link to={item.url} className="flex items-center gap-3 px-4 py-3">
                          <item.icon className="w-5 h-5" />
                          <span className="font-medium">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                  <SidebarMenuItem>
                    <SidebarMenuButton 
                      asChild 
                      className={`hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-xl mb-1 ${
                        location.pathname === settingsItem.url ? 'bg-blue-50 text-blue-700 shadow-sm' : ''
                      }`}
                    >
                      <Link to={settingsItem.url} className="flex items-center gap-3 px-4 py-3">
                        <settingsItem.icon className="w-5 h-5" />
                        <span className="font-medium">{settingsItem.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t border-gray-100 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gradient-to-br from-gray-700 to-gray-900 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {user?.full_name?.charAt(0) || 'U'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">
                    {user?.full_name || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {isSuperAdmin ? 'Super Admin' : isAdmin ? 'Administrator' : 'Site User'}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => base44.auth.logout()}
                className="hover:bg-red-50 hover:text-red-600"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col bg-gray-50">
          <header className="bg-white border-b border-gray-100 px-6 py-4 md:hidden">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-gray-100 p-2 rounded-lg transition-colors duration-200" />
              <h1 className="text-xl font-bold text-gray-900">Nest View</h1>
            </div>
          </header>

          <div className="flex-1 overflow-auto">
            {user && !user.company_id && !user.is_super_admin && user.role !== 'admin' && (
              <div className="p-6">
                <Alert className="bg-amber-50 border-amber-200">
                  <Building2 className="w-4 h-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    You haven't been assigned to a company yet. Please contact support to get access.
                  </AlertDescription>
                </Alert>
              </div>
            )}
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

