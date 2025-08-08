"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Camera,
  Database,
  Settings,
  HelpCircle,
  LogOut,
  Car,
  Cog,
  Menu,
  X,
} from "lucide-react";

interface CollapsibleSidebarProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
  onToggle?: (collapsed: boolean) => void;
}

import { Eye } from "lucide-react";

const menuItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "camera-feeds", label: "Camera Feeds", icon: Camera },
  { id: "database", label: "Database", icon: Database },
  
  { id: "configuration", label: "Configuration", icon: Cog },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "help", label: "Help", icon: HelpCircle },
];

export default function CollapsibleSidebar({
  currentPage,
  setCurrentPage,
  onToggle,
}: CollapsibleSidebarProps) {
  const { logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleSidebar = () => {
    const newCollapsedState = !isCollapsed;
    setIsCollapsed(newCollapsedState);
    onToggle?.(newCollapsedState);
  };

  return (
    <div
      className={`fixed left-0 top-0 h-screen bg-white border-r shadow-lg z-50 flex flex-col transition-all duration-300 ${
        isCollapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Header */}
      <div className={`p-4 border-b ${isCollapsed ? "px-2" : "px-6"}`}>
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Car className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-800">ParkingMS</h1>
                <p className="text-xs text-gray-500">Admin Portal</p>
              </div>
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className={`p-2 hover:bg-gray-100 ${
              isCollapsed ? "w-full justify-center" : ""
            }`}
          >
            {isCollapsed ? (
              <Menu className="w-5 h-5" />
            ) : (
              <X className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <nav
        className={`p-2 space-y-1 flex-1 overflow-auto ${
          isCollapsed ? "px-1" : "px-4"
        }`}
      >
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={`w-full flex items-center space-x-3 px-3 py-3 rounded-lg text-left transition-colors group relative ${
                isActive
                  ? "bg-purple-100 text-purple-700 border border-purple-200"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-800"
              } ${isCollapsed ? "justify-center px-2" : ""}`}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && (
                <span className="font-medium">{item.label}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className={`p-2 border-t ${isCollapsed ? "px-1" : "px-4"}`}>
        {!isCollapsed ? (
          <div className="mb-3 p-3  rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">A</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">
                  Administrator
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {localStorage.getItem("email")}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-2 flex justify-center">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">A</span>
            </div>
          </div>
        )}

        <Button
          onClick={logout}
          variant="outline"
          className={`w-full flex items-center space-x-2 text-red-600 border-red-200 hover:bg-red-50 bg-transparent ${
            isCollapsed ? "justify-center px-2" : ""
          }`}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!isCollapsed && <span>Logout</span>}
        </Button>
      </div>
    </div>
  );
}
