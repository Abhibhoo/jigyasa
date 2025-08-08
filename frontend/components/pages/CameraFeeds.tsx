"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Camera, Play, Pause, Eye } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  CameraConfigResponse,
  CounterFeed,
  MulticamFeed,
} from "@/types/camera";

type FeedStats = {
  activeFeeds: number;
  counterFeeds: number;
  multicamFeeds: number;
  totalFeeds: number;
};

export default function CameraFeeds() {
  const [multicamFeeds, setMulticamFeeds] = useState<MulticamFeed[]>([]);
  const [counterFeeds, setCounterFeeds] = useState<CounterFeed[]>([]);
  const [globalCarCount, setGlobalCarCount] = useState<number>(0);

  const [stats, setStats] = useState<FeedStats>({
    activeFeeds: 0,
    counterFeeds: 0,
    multicamFeeds: 0,
    totalFeeds: 0,
  });
  useEffect(() => {
    const fetchFeeds = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/camera/config");
        const data: CameraConfigResponse = await res.json();

        setMulticamFeeds(data.multicamFeeds);
        setCounterFeeds(data.counterFeeds);
        setGlobalCarCount(data.globalCarCount);
      } catch (err) {
        console.error("Failed to fetch camera config:", err);
      }
    };

    fetchFeeds();

    const interval = setInterval(fetchFeeds, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/camera/feeds");
        const data = await res.json();
        setStats(data);
      } catch (error) {
        console.error("Failed to fetch dashboard stats:", error);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5000); // every 5s

    return () => clearInterval(interval);
  }, []);

  const [viewingFeed, setViewingFeed] = useState<any>(null);
  const toggleFeedStatus = async (id: number, type: "multicam" | "counter") => {
    try {
      const res = await fetch("http://localhost:5000/api/camera/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, type }),
      });

      if (!res.ok) {
        throw new Error("Failed to toggle feed status");
      }

      const updatedFeed = await res.json();

      if (type === "multicam") {
        setMulticamFeeds((feeds) =>
          feeds.map((f) =>
            f.id === id ? { ...f, status: updatedFeed.status } : f
          )
        );
      } else {
        setCounterFeeds((feeds) =>
          feeds.map((f) =>
            f.id === id ? { ...f, status: updatedFeed.status } : f
          )
        );
      }
    } catch (err) {
      console.error("Toggle error:", err);
    }
  };

  const renderFeedCard = (feed: any, type: "multicam" | "counter") => (
    <Card key={feed.id} className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{feed.name}</CardTitle>
          <Badge
            variant={feed.status === "active" ? "default" : "secondary"}
            className={
              feed.status === "active"
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }
          >
            {feed.status === "active" ? "LIVE" : "OFFLINE"}
          </Badge>
        </div>
        <p className="text-sm text-gray-600">{feed.location}</p>
        {type === "multicam" && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Available Slots:</span>
            <span className="text-lg font-bold text-purple-600">
              {feed.availableSlots}
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Video Preview Placeholder */}
        <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
          {feed.status === "active" ? (
            <img
              src={feed.url}
              alt="Live Feed"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <Camera className="w-12 h-12 opacity-30" />
              <p className="text-sm ml-2">Feed Offline</p>
            </div>
          )}
        </div>

        {/* Feed Controls */}
        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            <Button
              size="sm"
              variant={feed.status === "active" ? "destructive" : "default"}
              onClick={() => toggleFeedStatus(feed.id, type)}
            >
              {feed.status === "active" ? (
                <>
                  <Pause className="w-4 h-4 mr-1" />
                  Stop
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-1" />
                  Start
                </>
              )}
            </Button>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setViewingFeed(feed)}
              >
                <Eye className="w-4 h-4 mr-1" />
                View
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl w-full h-[90vh] p-0">
              <DialogPrimitive.Title className="sr-only">
                {feed.name} - Live View
              </DialogPrimitive.Title>

              <div className="relative h-full flex flex-col">
                {/* Header */}
                <div className="p-4 border-b bg-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Camera className="w-5 h-5" />
                      <span className="font-semibold">
                        {feed.name} - Live View
                      </span>
                      <Badge
                        variant={
                          feed.status === "active" ? "default" : "secondary"
                        }
                        className={
                          feed.status === "active"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }
                      >
                        {feed.status === "active" ? "LIVE" : "OFFLINE"}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Video Content */}
                <div className="flex-1 bg-gray-900 flex items-center justify-center relative">
                  {feed.status === "active" ? (
                    <div className="relative w-full h-full">
                      <img
                        src={feed.url}
                        alt="Live Feed"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                      <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 px-3 py-1 rounded">
                        <p className="text-xs text-white">
                          {new Date().toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="absolute top-4 right-4">
                        <div className="flex items-center space-x-2 bg-red-600 px-3 py-1 rounded-full">
                          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                          <span className="text-xs font-medium text-white">
                            LIVE
                          </span>
                        </div>
                      </div>
                      {type === "multicam" && (
                        <div className="absolute bottom-4 right-4 bg-black bg-opacity-50 p-3 rounded text-white text-right">
                          <p className="text-sm opacity-75">Available Slots</p>
                          <p className="text-2xl font-bold">
                            {feed.availableSlots}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center text-gray-400">
                      <Camera className="w-24 h-24 mx-auto mb-4 opacity-30" />
                      <p className="text-2xl">Camera Offline</p>
                      <p className="text-lg opacity-75">
                        Please check camera connection
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="p-4 bg-gray-50 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-800">{feed.name}</p>
                      <p className="text-sm text-gray-600">{feed.location}</p>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant={
                          feed.status === "active" ? "destructive" : "default"
                        }
                        onClick={() => toggleFeedStatus(feed.id, type)}
                      >
                        {feed.status === "active" ? "Stop Feed" : "Start Feed"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Feed URL */}
        <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
          <span className="font-medium">URL:</span> {feed.url}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Camera Feeds</h1>
          <p className="text-gray-600">
            Monitor live video feeds from all parking areas
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Feeds</p>
                <p className="text-3xl font-bold text-gray-800">
                  {stats.totalFeeds}
                </p>
              </div>
              <Camera className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Multicam Feeds</p>
                <p className="text-3xl font-bold text-green-600">
                  {stats.multicamFeeds}
                </p>
              </div>
              <Camera className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Counter Feeds</p>
                <p className="text-3xl font-bold text-purple-600">
                  {stats.counterFeeds}
                </p>
              </div>
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-purple-600 font-bold text-sm">#</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Feeds</p>
                <p className="text-3xl font-bold text-blue-600">
                  {stats.activeFeeds}
                </p>
              </div>
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Multicam Feeds Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Camera className="w-5 h-5 text-green-500" />
            <span>Multicam Feeds</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {multicamFeeds.map((feed) => renderFeedCard(feed, "multicam"))}
          </div>
        </CardContent>
      </Card>

      {/* Car Counter Feeds Section */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
          <CardTitle className="flex items-center space-x-2">
            <div className="w-5 h-5 bg-purple-100 rounded flex items-center justify-center">
              <span className="text-purple-600 font-bold text-xs">#</span>
            </div>
            <span>Car Counter Feeds</span>
          </CardTitle>

          <div className="text-sm text-gray-600 flex items-center space-x-1">
            <span className="font-medium">Global Car Count:</span>
            <span className="text-lg font-bold text-purple-700">
              {globalCarCount}
            </span>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {counterFeeds.map((feed) => renderFeedCard(feed, "counter"))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
