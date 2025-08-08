"use client";


import { useAuth } from "@/contexts/AuthContext";
import Login from "@/components/pages/Login";
import Dashboard from "@/components/pages/Dashboard";
import CameraFeeds from "@/components/pages/CameraFeeds";
import Database from "@/components/pages/Database";
import Configuration from "@/components/pages/Configuration";
import Settings from "@/components/pages/Settings";
import Help from "@/components/pages/Help";
import CollapsibleSidebar from "@/components/CollapsibleSidebar";
import { useState } from "react";

export default function AppRouter() {
  const { isAuthenticated, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard setCurrentPage={setCurrentPage} />;
      case "camera-feeds":
        return <CameraFeeds />;
      case "database":
        return <Database />;
      
      case "configuration":
        return <Configuration />;
      case "settings":
        return <Settings />;
      case "help":
        return <Help />;
      default:
        return <Dashboard setCurrentPage={setCurrentPage} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <CollapsibleSidebar
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        onToggle={setSidebarCollapsed}
      />
      <main
        className={`flex-1 transition-all duration-300 ${
          sidebarCollapsed ? "ml-16" : "ml-64"
        }`}
      >
        <div className="lg:ml-0">{renderPage()}</div>
      </main>
    </div>
  );
}
