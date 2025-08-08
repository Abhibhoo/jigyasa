"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Save, Globe, Video, Hash, AlertCircle } from "lucide-react"

export default function Settings() {
  const [settings, setSettings] = useState({
    apiBaseUrl: process.env.REACT_APP_API_BASE_URL || "https://your-backend-url.com/api",
    videoStreamUrl: process.env.REACT_APP_VIDEO_STREAM_URL || "https://your-streaming-url.com/video_feed",
    carCounterStreamUrl:
      process.env.REACT_APP_CAR_COUNTER_STREAM_URL || "https://your-streaming-url.com/car_counter_feed",
  })

  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    // In a real application, these would be saved to environment variables or configuration
    localStorage.setItem("parking_settings", JSON.stringify(settings))
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const handleReset = () => {
    setSettings({
      apiBaseUrl: "https://your-backend-url.com/api",
      videoStreamUrl: "https://your-streaming-url.com/video_feed",
      carCounterStreamUrl: "https://your-streaming-url.com/car_counter_feed",
    })
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Settings</h1>
          <p className="text-gray-600">Configure API endpoints and streaming URLs</p>
        </div>
        {saved && <Badge className="bg-green-100 text-green-800">Settings Saved Successfully</Badge>}
      </div>

      {/* Environment Variables Info */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-blue-500" />
            <span>Environment Variables</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <p className="text-gray-600">
              These settings are typically configured through environment variables in your .env file:
            </p>
            <div className="bg-gray-50 p-4 rounded-lg font-mono text-xs space-y-1">
              <div>REACT_APP_API_BASE_URL=https://your-backend-url.com/api</div>
              <div>REACT_APP_VIDEO_STREAM_URL=https://your-streaming-url.com/video_feed</div>
              <div>REACT_APP_CAR_COUNTER_STREAM_URL=https://your-streaming-url.com/car_counter_feed</div>
            </div>
            <p className="text-amber-600 text-xs">
              ⚠️ Changes made here are for demonstration purposes and will be stored locally.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* API Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Globe className="w-5 h-5 text-green-500" />
            <span>API Configuration</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">API Base URL</label>
            <Input
              value={settings.apiBaseUrl}
              onChange={(e) => setSettings({ ...settings, apiBaseUrl: e.target.value })}
              placeholder="https://your-backend-url.com/api"
              className="font-mono"
            />
            <p className="text-xs text-gray-500 mt-1">
              Base URL for all API endpoints including authentication and data operations
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Video Streaming Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Video className="w-5 h-5 text-purple-500" />
            <span>Video Streaming Configuration</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Video Stream Base URL</label>
            <Input
              value={settings.videoStreamUrl}
              onChange={(e) => setSettings({ ...settings, videoStreamUrl: e.target.value })}
              placeholder="https://your-streaming-url.com/video_feed"
              className="font-mono"
            />
            <p className="text-xs text-gray-500 mt-1">Base URL for camera video feeds and live streaming</p>
          </div>
        </CardContent>
      </Card>

      {/* Car Counter Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Hash className="w-5 h-5 text-orange-500" />
            <span>Car Counter Configuration</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Car Counter Stream Base URL</label>
            <Input
              value={settings.carCounterStreamUrl}
              onChange={(e) => setSettings({ ...settings, carCounterStreamUrl: e.target.value })}
              placeholder="https://your-streaming-url.com/car_counter_feed"
              className="font-mono"
            />
            <p className="text-xs text-gray-500 mt-1">
              Base URL for car counting algorithms and real-time counting feeds
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle>Connection Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-green-800">API Connection</p>
                <p className="text-xs text-green-600">Connected</p>
              </div>
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            </div>
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-green-800">Video Streams</p>
                <p className="text-xs text-green-600">8 Active</p>
              </div>
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            </div>
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-green-800">Car Counter</p>
                <p className="text-xs text-green-600">Running</p>
              </div>
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex space-x-4">
        <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
          <Save className="w-4 h-4 mr-2" />
          Save Settings
        </Button>
        <Button onClick={handleReset} variant="outline">
          Reset to Default
        </Button>
      </div>
    </div>
  )
}
