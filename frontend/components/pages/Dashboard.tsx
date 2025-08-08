"use client";

import { useState, useEffect, Dispatch, SetStateAction } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Car,
  Users,
  MapPin,
  Camera,
  TrendingUp,
  AlertTriangle,
  Eye,
  Download,
  BarChart3,
} from "lucide-react";
import { IRecord } from "@/types/database";

const API_KEY = process.env.NEXT_PUBLIC_BASE_URL!;

export default function Dashboard({
  setCurrentPage,
}: {
  setCurrentPage: Dispatch<SetStateAction<string>>;
}) {
  const [currentCount, setCurrentCount] = useState<number>(0);
  const [totalSpaces, setTotalSpaces] = useState<number>(0);
  const [activeFeeds, setActiveFeeds] = useState<number>(0);
  const [excelPreview, setExcelPreview] = useState<IRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [locationData, setLocationData] = useState<LocationOccupancy[]>([]);

  useEffect(() => {
    const fetchLocationOccupancy = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/dashboard/multicam`);
        const multicamData = await res.json();

        // Transform multicamFeeds into LocationOccupancy[]
        const transformed: LocationOccupancy[] = multicamData.map(
          (cam: any) => ({
            location: cam.name,
            occupied: cam.totalSlots - cam.availableSlots,
            available: cam.availableSlots,
            total: cam.totalSlots,
          })
        );

        setLocationData(transformed);
      } catch (err) {
        console.error("Failed to fetch multicam occupancy:", err);
      }
    };

    fetchLocationOccupancy();
    const interval = setInterval(fetchLocationOccupancy, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchAndParseGoogleSheet = async () => {
      try {
        const sheetId = process.env.NEXT_PUBLIC_GOOGLE_SHEET_ID as string;
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_SHEETS_API_KEY as string;
        const range = "Sheet1!A1:G100";

        const response = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?key=${apiKey}`
        );

        const data: { values: string[][] } = await response.json();
        console.log("Fetched Data:", data);

        if (!data.values || data.values.length === 0) {
          console.error("No data found in the sheet.");
          setExcelPreview([]);
          return;
        }

        const headers = data.values[0];
        const rows: string[][] = data.values.slice(1);

        // Limit to latest 20 entries
        const latestRows = rows.slice(-20);

        const formattedRecords: IRecord[] = latestRows.map((row: string[]) => {
          // Assuming columns: ID, NUMBERPLATE, DATE, TIME, STATUS, LOCATION
          const [id, plate, date, time, status, location] = row;
          return {
            id: parseInt(id),
            plate,
            date,
            time,
            status,
            location,
          };
        });

        setExcelPreview(formattedRecords);
      } catch (error) {
        console.error("Error loading Google Sheets data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAndParseGoogleSheet();
  }, []);

  // Simulate real-time car counting
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     setCurrentCount((prev) => {
  //       const change = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
  //       const newCount = Math.max(0, Math.min(totalSpaces, prev + change));
  //       return newCount;
  //     });

  //     // Update location data randomly
  //     // setLocationData((prev) =>
  //     //   prev.map((location) => {
  //     //     const change = Math.floor(Math.random() * 3) - 1;
  //     //     const newOccupied = Math.max(
  //     //       0,
  //     //       Math.min(location.total, location.occupied + change)
  //     //     );
  //     //     return {
  //     //       ...location,
  //     //       occupied: newOccupied,
  //     //       available: location.total - newOccupied,
  //     //     };
  //     //   })
  //     // );
  //   }, 3000);

  //   return () => clearInterval(interval);
  // }, [totalSpaces]);

  const availableSpaces = totalSpaces - currentCount;
  const occupancyRate = (currentCount / totalSpaces) * 100;

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        const res = await fetch(`${API_KEY}/dashboard/stats`);
        const data = await res.json();

        setCurrentCount(data.currentCount);
        setTotalSpaces(data.totalSpaces);
        setActiveFeeds(data.activeFeeds);
      } catch (err) {
        console.error("Failed to fetch dashboard stats:", err);
      }
    };

    fetchDashboardStats();

    const interval = setInterval(fetchDashboardStats, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-600">Real-time parking management overview</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Last updated</p>
          <p className="text-sm font-medium">
            {new Date().toLocaleTimeString()}
          </p>
        </div>
      </div>

      {/* Real-time Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Current Cars
            </CardTitle>
            <Car className="w-5 h-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {currentCount}
            </div>
            <div className="flex items-center mt-2">
              <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-sm text-green-600">Live Count</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Available Spaces
            </CardTitle>
            <MapPin className="w-5 h-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {availableSpaces}
            </div>
            <div className="flex items-center mt-2">
              <span className="text-sm text-gray-500">
                of {totalSpaces} total
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Capacity
            </CardTitle>
            <Users className="w-5 h-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              {totalSpaces}
            </div>
            <div className="flex items-center mt-2">
              {occupancyRate > 80 && (
                <>
                  <AlertTriangle className="w-4 h-4 text-red-500 mr-1" />
                  <span className="text-sm text-red-600">High Occupancy</span>
                </>
              )}
              {occupancyRate <= 80 && (
                <span className="text-sm text-gray-500">Normal Level</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Active Feeds
            </CardTitle>
            <Camera className="w-5 h-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              {activeFeeds}
            </div>
            <div className="flex items-center mt-2">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              <span className="text-sm text-green-600">All Online</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Location-wise Occupancy and Excel Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Location-wise Occupancy Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-blue-500" />
              <span>Location-wise Occupancy</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {locationData.map((location, index) => {
                const occupancyPercentage =
                  (location.occupied / location.total) * 100;
                const availablePercentage =
                  (location.available / location.total) * 100;

                return (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        {location.location}
                      </span>
                      <div className="flex items-center space-x-4 text-xs">
                        <span className="text-red-600">
                          Occupied: {location.occupied}
                        </span>
                        <span className="text-green-600">
                          Available: {location.available}
                        </span>
                      </div>
                    </div>
                    <div className="flex w-full h-6 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-red-400 to-red-600 transition-all duration-500"
                        style={{ width: `${occupancyPercentage}%` }}
                      ></div>
                      <div
                        className="bg-gradient-to-r from-green-400 to-green-600 transition-all duration-500"
                        style={{ width: `${availablePercentage}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{occupancyPercentage.toFixed(1)}% occupied</span>
                      <span>{availablePercentage.toFixed(1)}% available</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary Chart */}
            <div className="mt-6 pt-4 border-t">
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                Overall Distribution
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {locationData.reduce((sum, loc) => sum + loc.occupied, 0)}
                  </div>
                  <div className="text-xs text-red-700">Total Occupied</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {locationData.reduce((sum, loc) => sum + loc.available, 0)}
                  </div>
                  <div className="text-xs text-green-700">Total Available</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Excel Sheet Preview */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>Recent Entries</span>
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage("database")}
            >
              <Eye className="w-4 h-4 mr-2" />
              View Full Database
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {excelPreview.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="font-medium text-gray-800">
                      {entry.plate}
                    </div>
                    <div className="text-sm text-gray-500">
                      Date: {entry.date}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant={
                        entry.status === "Parked" ? "default" : "secondary"
                      }
                      className={
                        entry.status === "Parked"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }
                    >
                      {entry.status}
                    </Badge>
                    {entry.time !== "-" && (
                      <div className="text-xs text-gray-500 mt-1">
                        Time: {entry.time}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t">
              <Button variant="outline" className="w-full bg-transparent">
                <Download className="w-4 h-4 mr-2" />
                Export Today's Data
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Car Counter Widget
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span>Live Car Counter</span>
            <Badge variant="secondary" className="ml-2">
              LIVE
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
              <div className="text-4xl font-bold text-blue-600 mb-2">
                {currentCount}
              </div>
              <div className="text-sm text-blue-700">Cars Currently Parked</div>
            </div>
            <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
              <div className="text-4xl font-bold text-green-600 mb-2">
                {availableSpaces}
              </div>
              <div className="text-sm text-green-700">Available Spaces</div>
            </div>
            <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
              <div className="text-4xl font-bold text-purple-600 mb-2">
                {totalSpaces}
              </div>
              <div className="text-sm text-purple-700">Total Capacity</div>
            </div>
          </div>
        </CardContent>
      </Card> */}
    </div>
  );
}
