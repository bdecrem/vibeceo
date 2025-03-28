"use client"

import { useRouter } from "next/navigation"
import { CEOModal } from "@/components/ceo-modal"

export default function CEOPage() {
  const router = useRouter()

  return (
    <CEOModal 
      isOpen={true}
      onClose={() => router.back()}
    />
  )
} 