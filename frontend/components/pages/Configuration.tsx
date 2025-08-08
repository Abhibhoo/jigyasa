"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Camera, Plus, Edit, Trash2, Settings, Save } from "lucide-react";
import { useToast } from "../ui/use-toast";

type FeedType = "multicam" | "counter";

interface Feed {
  id: number;
  name: string;
  url: string;
  type: FeedType;
  totalSlots?: number;
  availableSlots?: number;
  initialCount?: number;
  status: "active" | "inactive";
}

const API_BASE = "http://localhost:5000/api/feeds";

export default function Configuration() {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [globalCount, setGlobalCount] = useState<number>(0);
  const [editingFeed, setEditingFeed] = useState<Feed | null>(null);
  const [newFeed, setNewFeed] = useState({
    name: "",
    url: "",
    type: "multicam" as FeedType,
    totalSlots: 0,
    availableSlots: 0,
    initialCount: 0,
  });

  const multicamFeeds = feeds.filter((f) => f.type === "multicam");
  const counterFeeds = feeds.filter((f) => f.type === "counter");
  const { toast } = useToast();

  useEffect(() => {
    fetch(API_BASE)
      .then((res) => res.json())
      .then((data) => {
        if (data.feeds) setFeeds(data.feeds);
      })
      .catch((err) => console.error("Error fetching feeds:", err));
  }, []);

  const handleAddFeed = async () => {
    if (!newFeed.name || !newFeed.url) return;
    const body = {
      name: newFeed.name,
      url: newFeed.url,
      type: newFeed.type,
      totalSlots: newFeed.type === "multicam" ? newFeed.totalSlots : undefined,
      availableSlots:
        newFeed.type === "multicam" ? newFeed.availableSlots : undefined,
      status: "active" as "active",
    };

    const res = await fetch(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (data.feed) {
      setFeeds([...feeds, data.feed]);
      setNewFeed({
        name: "",
        url: "",
        type: "multicam",
        totalSlots: 0,
        availableSlots: 0,
        initialCount: 0,
      });
    }
  };

  const handleEditFeed = async (feed: Feed) => {
    const res = await fetch(`${API_BASE}/${feed.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(feed),
    });

    const data = await res.json();
    if (data.feed) {
      setFeeds((prev) => prev.map((f) => (f.id === feed.id ? data.feed : f)));
      setEditingFeed(null);
    }
  };

  async function updateGlobalCarCount(count: number): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/global_count`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count }),
      });
      const data = await res.json();

      return data.status === "success";
    } catch (error) {
      console.error("Failed to update global car count:", error);
      return false;
    }
  }

  const handleDeleteFeed = async (id: number) => {
    const res = await fetch(`${API_BASE}/${id}`, {
      method: "DELETE",
    });

    const data = await res.json();
    if (data.status === "success") {
      setFeeds(feeds.filter((f) => f.id !== id));
    }
  };

  const toggleFeedStatus = async (id: number) => {
    const feed = feeds.find((f) => f.id === id);
    if (!feed) return;

    const updated = {
      ...feed,
      status: (feed.status === "active" ? "inactive" : "active") as
        | "active"
        | "inactive",
    };
    await handleEditFeed(updated);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Configuration</h1>
          <p className="text-gray-600">
            Manage camera feeds and parking slot configurations
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-purple-600 hover:bg-purple-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Feed
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Feed Configuration</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Feed Name</label>
                <Input
                  value={newFeed.name}
                  onChange={(e) =>
                    setNewFeed({ ...newFeed, name: e.target.value })
                  }
                  placeholder="Enter feed name"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Video Source URL</label>
                <Input
                  value={newFeed.url}
                  onChange={(e) =>
                    setNewFeed({ ...newFeed, url: e.target.value })
                  }
                  placeholder="https://example.com/video_feed"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Feed Type</label>
                <select
                  value={newFeed.type}
                  onChange={(e) =>
                    setNewFeed({
                      ...newFeed,
                      type: e.target.value as "multicam" | "counter",
                    })
                  }
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="multicam">Multicam Feed</option>
                  <option value="counter">Car Counter Feed</option>
                </select>
              </div>

              {newFeed.type === "multicam" && (
                <>
                  <div>
                    <label className="text-sm font-medium">Total Slots</label>
                    <Input
                      type="number"
                      value={newFeed.totalSlots}
                      onChange={(e) =>
                        setNewFeed({
                          ...newFeed,
                          totalSlots: Number.parseInt(e.target.value) || 0,
                        })
                      }
                      placeholder="Enter total parking slots"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">
                      Available Slots
                    </label>
                    <Input
                      type="number"
                      value={newFeed.availableSlots}
                      onChange={(e) =>
                        setNewFeed({
                          ...newFeed,
                          availableSlots: Number.parseInt(e.target.value) || 0,
                        })
                      }
                      placeholder="Enter available slots"
                    />
                  </div>
                </>
              )}

              <Button onClick={handleAddFeed} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add Feed
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Feeds</p>
                <p className="text-3xl font-bold text-blue-600">
                  {feeds.length}
                </p>
              </div>
              <Settings className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Multicam Feeds</p>
                <p className="text-3xl font-bold text-green-600">
                  {multicamFeeds.length}
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
                  {counterFeeds.length}
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
                <p className="text-sm text-gray-600">Total Slots</p>
                <p className="text-3xl font-bold text-orange-600">
                  {feeds.reduce((sum, feed) => sum + (feed.totalSlots || 0), 0)}
                </p>
              </div>
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Multicam Feeds Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Camera className="w-5 h-5" />
            <span>Multicam Feeds</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Video Source URL</TableHead>
                  <TableHead>Total Slots</TableHead>
                  <TableHead>Available Slots</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {multicamFeeds.map((feed) => (
                  <TableRow key={feed.id}>
                    <TableCell className="font-medium">{feed.name}</TableCell>
                    <TableCell className="font-mono text-sm text-gray-600 max-w-xs truncate">
                      {feed.url}
                    </TableCell>
                    <TableCell>{feed.totalSlots}</TableCell>
                    <TableCell>{feed.availableSlots}</TableCell>
                    <TableCell>
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
                        {feed.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingFeed(feed)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>
                                Edit Multicam Feed Configuration
                              </DialogTitle>
                            </DialogHeader>
                            {editingFeed && (
                              <div className="space-y-4">
                                <div>
                                  <label className="text-sm font-medium">
                                    Feed Name
                                  </label>
                                  <Input
                                    value={editingFeed.name}
                                    onChange={(e) =>
                                      setEditingFeed({
                                        ...editingFeed,
                                        name: e.target.value,
                                      })
                                    }
                                  />
                                </div>
                                <div>
                                  <label className="text-sm font-medium">
                                    Video Source URL
                                  </label>
                                  <Input
                                    value={editingFeed.url}
                                    onChange={(e) =>
                                      setEditingFeed({
                                        ...editingFeed,
                                        url: e.target.value,
                                      })
                                    }
                                  />
                                </div>
                                <div>
                                  <label className="text-sm font-medium">
                                    Total Slots
                                  </label>
                                  <Input
                                    type="number"
                                    value={editingFeed.totalSlots}
                                    onChange={(e) =>
                                      setEditingFeed({
                                        ...editingFeed,
                                        totalSlots:
                                          Number.parseInt(e.target.value) || 0,
                                      })
                                    }
                                  />
                                </div>
                                <div>
                                  <label className="text-sm font-medium">
                                    Available Slots
                                  </label>
                                  <Input
                                    type="number"
                                    value={editingFeed.availableSlots}
                                    onChange={(e) =>
                                      setEditingFeed({
                                        ...editingFeed,
                                        availableSlots:
                                          Number.parseInt(e.target.value) || 0,
                                      })
                                    }
                                  />
                                </div>
                                <Button
                                  onClick={() => handleEditFeed(editingFeed)}
                                  className="w-full"
                                >
                                  <Save className="w-4 h-4 mr-2" />
                                  Save Changes
                                </Button>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                        <Button
                          size="sm"
                          variant={
                            feed.status === "active" ? "destructive" : "default"
                          }
                          onClick={() => toggleFeedStatus(feed.id)}
                        >
                          {feed.status === "active" ? "Disable" : "Enable"}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteFeed(feed.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Car Counter Feeds Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <div className="w-5 h-5 bg-purple-100 rounded flex items-center justify-center">
                <span className="text-purple-600 font-bold text-xs">#</span>
              </div>
              <span>Car Counter Feeds</span>
            </CardTitle>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="bg-purple-600 hover:bg-purple-700">
                  <Settings className="w-4 h-4 mr-2" />
                  Set Initial Count
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Set Initial Count</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Global Count</label>
                    <Input
                      type="number"
                      value={globalCount}
                      onChange={(e) =>
                        setGlobalCount(parseInt(e.target.value) || 0)
                      }
                      placeholder="Enter global count"
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={async () => {
                      const success = await updateGlobalCarCount(globalCount);
                      toast({
                        title: success ? "Success" : "Error",
                        description: success
                          ? "Global car count updated successfully."
                          : "Failed to update global car count.",
                        variant: success ? "default" : "destructive",
                      });
                    }}
                  >
                    Set Global Count
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Counter URL</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {counterFeeds.map((feed) => (
                  <TableRow key={feed.id}>
                    <TableCell className="font-medium">{feed.name}</TableCell>
                    <TableCell className="font-mono text-sm text-gray-600 max-w-xs truncate">
                      {feed.url}
                    </TableCell>
                    <TableCell>
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
                        {feed.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingFeed(feed)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>
                                Edit Counter Feed Configuration
                              </DialogTitle>
                            </DialogHeader>
                            {editingFeed && (
                              <div className="space-y-4">
                                <div>
                                  <label className="text-sm font-medium">
                                    Feed Name
                                  </label>
                                  <Input
                                    value={editingFeed.name}
                                    onChange={(e) =>
                                      setEditingFeed({
                                        ...editingFeed,
                                        name: e.target.value,
                                      })
                                    }
                                  />
                                </div>
                                <div>
                                  <label className="text-sm font-medium">
                                    Counter URL
                                  </label>
                                  <Input
                                    value={editingFeed.url}
                                    onChange={(e) =>
                                      setEditingFeed({
                                        ...editingFeed,
                                        url: e.target.value,
                                      })
                                    }
                                  />
                                </div>
                                <Button
                                  onClick={() => handleEditFeed(editingFeed)}
                                  className="w-full"
                                >
                                  <Save className="w-4 h-4 mr-2" />
                                  Save Changes
                                </Button>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                        <Button
                          size="sm"
                          variant={
                            feed.status === "active" ? "destructive" : "default"
                          }
                          onClick={() => toggleFeedStatus(feed.id)}
                        >
                          {feed.status === "active" ? "Disable" : "Enable"}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteFeed(feed.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
