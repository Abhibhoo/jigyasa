"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  HelpCircle,
  Mail,
  Phone,
  FileText,
  Download,
  MessageCircle,
  Book,
  Video,
  Settings,
  Database,
  Camera,
} from "lucide-react"

export default function Help() {
  const faqs = [
    {
      question: "How do I add a new camera feed?",
      answer:
        "Go to Configuration page, click 'Add Feed', enter the camera details including name, URL, and slot information, then save.",
    },
    {
      question: "Why is my camera feed showing as offline?",
      answer:
        "Check the video source URL, ensure the camera is powered on, and verify network connectivity. You can also restart the feed from the Camera Feeds page.",
    },
    {
      question: "How can I export parking data?",
      answer:
        "Navigate to the Database page, use the search and filter options to select your desired data range, then click 'Export to Excel'.",
    },
    {
      question: "What should I do if the car counter is not accurate?",
      answer:
        "Verify the camera positioning, check lighting conditions, and ensure the counter feed URL is correct in the Configuration settings.",
    },
    {
      question: "How do I change API endpoints?",
      answer:
        "Go to Settings page and update the API Base URL, Video Stream URL, and Car Counter Stream URL as needed.",
    },
    {
      question: "Can I monitor multiple parking areas?",
      answer:
        "Yes, you can add multiple camera feeds and configure different sections with their own slot counts in the Configuration page.",
    },
  ]

  const quickLinks = [
    { icon: Camera, title: "Camera Setup", description: "Learn how to configure camera feeds" },
    { icon: Database, title: "Data Management", description: "Managing parking records and exports" },
    { icon: Settings, title: "System Configuration", description: "API and streaming setup guide" },
    { icon: Video, title: "Troubleshooting", description: "Common issues and solutions" },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Help & Support</h1>
          <p className="text-gray-600">Documentation, FAQs, and support resources</p>
        </div>
        <Badge variant="outline" className="text-green-600 border-green-600">
          System Status: Online
        </Badge>
      </div>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Book className="w-5 h-5" />
            <span>Quick Start Guide</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickLinks.map((link, index) => {
              const Icon = link.icon
              return (
                <div
                  key={index}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <Icon className="w-8 h-8 text-purple-500 mb-3" />
                  <h3 className="font-medium text-gray-800 mb-1">{link.title}</h3>
                  <p className="text-sm text-gray-600">{link.description}</p>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* FAQs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <HelpCircle className="w-5 h-5" />
            <span>Frequently Asked Questions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <div key={index} className="border-b border-gray-200 pb-4 last:border-b-0">
                <h3 className="font-medium text-gray-800 mb-2">{faq.question}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Support Contact */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageCircle className="w-5 h-5" />
              <span>Contact Support</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
              <Mail className="w-5 h-5 text-blue-500" />
              <div>
                <p className="font-medium text-blue-800">Email Support</p>
                <p className="text-sm text-blue-600">support@parkingms.com</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
              <Phone className="w-5 h-5 text-green-500" />
              <div>
                <p className="font-medium text-green-800">Phone Support</p>
                <p className="text-sm text-green-600">+1 (555) 123-4567</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg">
              <MessageCircle className="w-5 h-5 text-purple-500" />
              <div>
                <p className="font-medium text-purple-800">Live Chat</p>
                <p className="text-sm text-purple-600">Available 24/7</p>
              </div>
            </div>
            <Button className="w-full bg-blue-600 hover:bg-blue-700">
              <MessageCircle className="w-4 h-4 mr-2" />
              Start Live Chat
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="w-5 h-5" />
              <span>Documentation</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start bg-transparent">
                <Download className="w-4 h-4 mr-2" />
                User Manual (PDF)
              </Button>
              <Button variant="outline" className="w-full justify-start bg-transparent">
                <Download className="w-4 h-4 mr-2" />
                Installation Guide (PDF)
              </Button>
              <Button variant="outline" className="w-full justify-start bg-transparent">
                <Download className="w-4 h-4 mr-2" />
                API Documentation (PDF)
              </Button>
              <Button variant="outline" className="w-full justify-start bg-transparent">
                <Download className="w-4 h-4 mr-2" />
                Troubleshooting Guide (PDF)
              </Button>
            </div>
            <div className="pt-4 border-t">
              <p className="text-sm text-gray-600 mb-3">Need additional documentation or have specific questions?</p>
              <Button variant="outline" className="w-full bg-transparent">
                <Mail className="w-4 h-4 mr-2" />
                Request Documentation
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Version</p>
              <p className="font-medium">v2.1.0</p>
            </div>
            <div>
              <p className="text-gray-600">Last Updated</p>
              <p className="font-medium">January 15, 2024</p>
            </div>
            <div>
              <p className="text-gray-600">License</p>
              <p className="font-medium">Enterprise</p>
            </div>
            <div>
              <p className="text-gray-600">Support Plan</p>
              <p className="font-medium">Premium 24/7</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
