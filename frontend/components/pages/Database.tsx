"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Download, Filter, Calendar, FileText, X } from "lucide-react";
import { IRecord } from "@/types/database";

export default function Database() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("date"); // Changed default sort to 'date'
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [records, setRecords] = useState<IRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAndParseGoogleSheet = async () => {
      setLoading(true);
      try {
        const sheetId = process.env.NEXT_PUBLIC_GOOGLE_SHEET_ID as string;
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_SHEETS_API_KEY as string;
        const range = "Sheet1!A2:F1000"; // Assuming data is in columns A-F

        const response = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?key=${apiKey}`
        );

        const data: { values: string[][] } = await response.json();
        console.log("Fetched Raw Rows:", data.values);

        if (!data.values || data.values.length === 0) {
          console.error("No data found in the sheet.");
          setRecords([]);
          return;
        }

        const formattedRecords: IRecord[] = data.values.map((row) => {
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

        console.log("Formatted Records:", formattedRecords);
        setRecords(formattedRecords);
      } catch (error) {
        console.error("Error loading Google Sheets data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAndParseGoogleSheet();
  }, []);

  const filteredAndSortedRecords = useMemo(() => {
    const filtered = records.filter((record) => {
      const matchesSearch = 
        record.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.location.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDate = dateFilter
        ? record.date.startsWith(dateFilter)
        : true;
      const matchesStatus = statusFilter
        ? record.status === statusFilter
        : true;
      return matchesSearch && matchesDate && matchesStatus;
    });

    // Sort records
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case "plate":
          aValue = a.plate;
          bValue = b.plate;
          break;
        case "date":
          aValue = new Date(a.date);
          bValue = new Date(b.date);
          break;
        case "time":
          // For time, direct string comparison should work for HH:MM:SS format
          aValue = a.time;
          bValue = b.time;
          break;
        case "status":
          aValue = a.status;
          bValue = b.status;
          break;
        case "location":
          aValue = a.location;
          bValue = b.location;
          break;
        default:
          aValue = new Date(a.date);
          bValue = new Date(b.date);
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [records, searchTerm, dateFilter, statusFilter, sortBy, sortOrder]);

  const totalRecords = filteredAndSortedRecords.length;
  const parkedCars = filteredAndSortedRecords.filter(
    (r) => r.status === "Parked"
  ).length;
  const exitedCars = filteredAndSortedRecords.filter(
    (r) => r.status === "Exited"
  ).length;

  const handleExport = () => {
    const csvContent = [
      ["ID", "Number Plate", "Date", "Time", "Status", "Location"],
      ...filteredAndSortedRecords.map((record) => [
        record.id,
        record.plate,
        record.date,
        record.time,
        record.status,
        record.location,
      ]),
    ]
      .map((row) => row.join(','))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `parking_records_${dateFilter || "all"}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setDateFilter("");
    setStatusFilter("");
    setSortBy("date"); // Changed default sort to 'date'
    setSortOrder("desc");
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const activeFiltersCount = [searchTerm, dateFilter, statusFilter].filter(
    Boolean
  ).length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Database</h1>
          <p className="text-gray-600">
            Complete parking records and number plate tracking
          </p>
        </div>
        <Button
          onClick={handleExport}
          className="bg-green-600 hover:bg-green-700"
        >
          <Download className="w-4 h-4 mr-2" />
          Export to Excel
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Records</p>
                <p className="text-3xl font-bold text-blue-600">
                  {totalRecords}
                </p>
              </div>
              <FileText className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Currently Parked</p>
                <p className="text-3xl font-bold text-green-600">
                  {parkedCars}
                </p>
              </div>
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Exited</p>
                <p className="text-3xl font-bold text-gray-600">{exitedCars}</p>
              </div>
              <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Search & Filter */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Filter className="w-5 h-5" />
              <span>Search & Filter</span>
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {activeFiltersCount} active
                </Badge>
              )}
            </CardTitle>
            {activeFiltersCount > 0 && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                <X className="w-4 h-4 mr-1" />
                Clear All
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by plate or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1 h-8 w-8 p-0"
                  onClick={() => setSearchTerm("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Date Filter */}
            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="pl-10"
              />
              {dateFilter && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1 h-8 w-8 p-0"
                  onClick={() => setDateFilter("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Status Filter */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md pl-3 pr-8"
              >
                <option value="">All Status</option>
                <option value="Parked">Parked</option>
                <option value="Exited">Exited</option>
              </select>
              {statusFilter && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1 h-8 w-8 p-0"
                  onClick={() => setStatusFilter("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Sort Options */}
            <div className="flex space-x-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="flex-1 p-2 border border-gray-300 rounded-md"
              >
                <option value="date">Sort by Date</option>
                <option value="plate">Sort by Plate</option>
                <option value="time">Sort by Time</option>
                <option value="status">Sort by Status</option>
                <option value="location">Sort by Location</option>
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                }
                className="px-3"
              >
                {sortOrder === "asc" ? "↑" : "↓"}
              </Button>
            </div>
          </div>

          {/* Quick Filter Buttons */}
          <div className="flex flex-wrap gap-2 mt-4">
            <Button
              variant={statusFilter === "Parked" ? "default" : "outline"}
              size="sm"
              onClick={() =>
                setStatusFilter(statusFilter === "Parked" ? "" : "Parked")
              }
            >
              Currently Parked (
              {records.filter((r) => r.status === "Parked").length})
            </Button>
            <Button
              variant={
                dateFilter === new Date().toISOString().split("T")[0]
                  ? "default"
                  : "outline"
              }
              size="sm"
              onClick={() =>
                setDateFilter(
                  dateFilter === new Date().toISOString().split("T")[0]
                    ? ""
                    : new Date().toISOString().split("T")[0]
                )
              }
            >
              Today
            </Button>
            <Button
              variant={dateFilter === "2024-01-14" ? "default" : "outline"}
              size="sm"
              onClick={() =>
                setDateFilter(dateFilter === "2024-01-14" ? "" : "2024-01-14")
              }
            >
              Yesterday
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Parking Records</CardTitle>
          <p className="text-sm text-gray-600">
            Showing {filteredAndSortedRecords.length} of {records.length} 
            records
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort("id")}
                  >
                    ID {sortBy === "id" && (sortOrder === "asc" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort("plate")}
                  >
                    Number Plate 
                    {sortBy === "plate" && (sortOrder === "asc" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort("date")}
                  >
                    Date 
                    {sortBy === "date" && (sortOrder === "asc" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort("time")}
                  >
                    Time 
                    {sortBy === "time" && (sortOrder === "asc" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort("location")}
                  >
                    Location 
                    {sortBy === "location" && (sortOrder === "asc" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort("status")}
                  >
                    Status 
                    {sortBy === "status" && (sortOrder === "asc" ? "↑" : "↓")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedRecords.map((record) => (
                  <TableRow key={record.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">{record.id}</TableCell>
                    <TableCell className="font-mono font-bold text-blue-600">
                      {record.plate}
                    </TableCell>
                    <TableCell>{record.date}</TableCell>
                    <TableCell>{record.time}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {record.location}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          record.status === "Parked" ? "default" : "secondary"
                        }
                        className={
                          record.status === "Parked"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }
                      >
                        {record.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredAndSortedRecords.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No records found for the selected criteria</p>
              <Button
                variant="outline"
                className="mt-2 bg-transparent"
                onClick={clearFilters}
              >
                Clear filters to see all records
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}