"use client"

import { use } from "react"
import { NoteEditor } from "@/components/dashboard/NoteEditor"
import { AppLayout } from "@/components/layout"

interface NotePageProps {
  params: Promise<{ id: string }>
}

export default function NotePage({ params }: NotePageProps) {
  const { id } = use(params)
  return (
    <AppLayout showInput={true} showToolbar={true}>
      <NoteEditor pageId={id} />
    </AppLayout>
  )
}
