import Layout from "./Layout.jsx";

import AdminDashboard from "./AdminDashboard";

import Channels from "./Channels";

import Sites from "./Sites";

import SportsCalendar from "./SportsCalendar";

import SiteView from "./SiteView";

import Users from "./Users";

import SuperAdminDashboard from "./SuperAdminDashboard";

import Settings from "./Settings";

import SiteDisplay from "./SiteDisplay";

import BrandSchemes from "./BrandSchemes";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    AdminDashboard: AdminDashboard,
    
    Channels: Channels,
    
    Sites: Sites,
    
    SportsCalendar: SportsCalendar,
    
    SiteView: SiteView,
    
    Users: Users,
    
    SuperAdminDashboard: SuperAdminDashboard,
    
    Settings: Settings,
    
    SiteDisplay: SiteDisplay,
    
    BrandSchemes: BrandSchemes,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<AdminDashboard />} />
                
                
                <Route path="/AdminDashboard" element={<AdminDashboard />} />
                
                <Route path="/Channels" element={<Channels />} />
                
                <Route path="/Sites" element={<Sites />} />
                
                <Route path="/SportsCalendar" element={<SportsCalendar />} />
                
                <Route path="/SiteView" element={<SiteView />} />
                
                <Route path="/Users" element={<Users />} />
                
                <Route path="/SuperAdminDashboard" element={<SuperAdminDashboard />} />
                
                <Route path="/Settings" element={<Settings />} />
                
                <Route path="/SiteDisplay" element={<SiteDisplay />} />
                
                <Route path="/BrandSchemes" element={<BrandSchemes />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}