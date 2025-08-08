"use client"
import { AuthProvider } from "@/contexts/AuthContext"
import AppRouter from "@/components/AppRouter"

export default function Home() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  )
}
