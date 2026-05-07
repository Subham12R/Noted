export interface SharedPage {
  id: string
  name: string
  content: string | null
  folderId: string
  folderName: string
  ownerId: string
  ownerName: string | null
  ownerEmail: string
  ownerImage: string | null
  role: string
  sharedAt: string
  updatedAt: string
}

export interface SharedFolder {
  id: string
  name: string
  color: string | null
  image: string | null
  ownerId: string
  ownerName: string | null
  ownerEmail: string
  ownerImage: string | null
  role: string
  sharedAt: string
  pageCount: number
}
