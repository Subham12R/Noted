"use client"

import { use } from "react"
import { FolderView } from "@/components/dashboard"
import { AppLayout } from "@/components/layout"

interface FolderPageProps {
  params: Promise<{ id: string }>
}

export default function FolderPage({ params }: FolderPageProps) {
  const { id } = use(params)
  return (
    <AppLayout>
      <FolderView folderId={id} />
    </AppLayout>
  )
}
