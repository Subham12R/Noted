"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import styles from "@/styles/ShareModal.module.css"

interface ShareModalProps {
  pageId: string
  pageName: string
  isOpen: boolean
  onClose: () => void
}

interface UserInfo {
  id: string
  name: string | null
  email: string | null
  image: string | null
}

interface Collaborator {
  id: string
  role: string
  createdAt: string
  user: UserInfo
}

interface ShareLinkInfo {
  id: string
  token: string
  permission: string
  expiresAt: string | null
  viewCount: number
  hasPassword: boolean
  url: string
  isExpired: boolean
  createdAt: string
}

interface ShareSettings {
  pageId: string
  pageName: string
  isPublic: boolean
  isOwner: boolean
  currentUserRole: string
  owner: UserInfo & { role: string }
  collaborators: Collaborator[]
  shareLinks: ShareLinkInfo[]
}

type TabType = "link" | "people"

function getInitials(name: string | null): string {
  if (!name) return "?"
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export function ShareModal({ pageId, pageName, isOpen, onClose }: ShareModalProps) {
  const [settings, setSettings] = useState<ShareSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>("link")
  const [newLinkPermission, setNewLinkPermission] = useState<"view" | "edit">("view")
  const [isCreatingLink, setIsCreatingLink] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<"viewer" | "editor">("viewer")
  const [isInviting, setIsInviting] = useState(false)

  const fetchShareSettings = useCallback(async () => {
    if (!pageId) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/pages/${pageId}/share`)
      if (!response.ok) {
        throw new Error("Failed to load share settings")
      }
      const data = await response.json()
      setSettings(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }, [pageId])

  useEffect(() => {
    if (isOpen && pageId) {
      fetchShareSettings()
    }
  }, [isOpen, pageId, fetchShareSettings])

  const handleTogglePublic = async () => {
    if (!settings) return

    setIsSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/pages/${pageId}/share`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: !settings.isPublic }),
      })

      if (!response.ok) {
        throw new Error("Failed to update share settings")
      }

      const data = await response.json()
      setSettings((prev) => prev ? { ...prev, isPublic: data.isPublic } : null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsSaving(false)
    }
  }

  const handleCreateShareLink = async () => {
    setIsCreatingLink(true)
    setError(null)

    try {
      const response = await fetch(`/api/pages/${pageId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permission: newLinkPermission }),
      })

      if (!response.ok) {
        throw new Error("Failed to create share link")
      }

      await fetchShareSettings()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsCreatingLink(false)
    }
  }

  const handleDeleteShareLink = async (linkId: string) => {
    try {
      const response = await fetch(`/api/pages/${pageId}/share?linkId=${linkId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete share link")
      }

      await fetchShareSettings()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    }
  }

  const handleCopyLink = async (url: string, linkId: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(linkId)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      // Fallback
      const textArea = document.createElement("textarea")
      textArea.value = url
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand("copy")
      document.body.removeChild(textArea)
      setCopied(linkId)
      setTimeout(() => setCopied(null), 2000)
    }
  }

  const handleInviteCollaborator = async () => {
    if (!inviteEmail.trim()) return

    setIsInviting(true)
    setError(null)

    try {
      // First, find user by email
      const searchResponse = await fetch(`/api/users/search?email=${encodeURIComponent(inviteEmail)}`)
      if (!searchResponse.ok) {
        throw new Error("User not found with that email")
      }
      const { user } = await searchResponse.json()

      // Add as collaborator
      const response = await fetch(`/api/pages/${pageId}/collaborators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, role: inviteRole }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to add collaborator")
      }

      setInviteEmail("")
      await fetchShareSettings()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsInviting(false)
    }
  }

  const handleRemoveCollaborator = async (userId: string) => {
    try {
      const response = await fetch(`/api/pages/${pageId}/collaborators?userId=${userId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to remove collaborator")
      }

      await fetchShareSettings()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    }
  }

  const handleUpdateCollaboratorRole = async (userId: string, newRole: string) => {
    try {
      const response = await fetch(`/api/pages/${pageId}/collaborators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      })

      if (!response.ok) {
        throw new Error("Failed to update role")
      }

      await fetchShareSettings()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    }
  }

  if (!isOpen) return null

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Share &quot;{pageName}&quot;</h2>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === "link" ? styles.tabActive : ""}`}
            onClick={() => setActiveTab("link")}
          >
            <LinkIcon />
            Share Link
          </button>
          <button
            className={`${styles.tab} ${activeTab === "people" ? styles.tabActive : ""}`}
            onClick={() => setActiveTab("people")}
          >
            <PeopleIcon />
            People
            {settings && settings.collaborators.length > 0 && (
              <span className={styles.badge}>{settings.collaborators.length}</span>
            )}
          </button>
        </div>

        <div className={styles.content}>
          {isLoading ? (
            <div className={styles.loading}>
              <div className={styles.spinner} />
              Loading share settings...
            </div>
          ) : error ? (
            <div className={styles.error}>{error}</div>
          ) : settings ? (
            <>
              {activeTab === "link" && (
                <div className={styles.tabContent}>
                  {/* Public Access Toggle */}
                  <div className={styles.section}>
                    <div className={styles.toggleRow}>
                      <div className={styles.toggleInfo}>
                        <span className={styles.toggleLabel}>
                          <GlobeIcon />
                          Public access
                        </span>
                        <span className={styles.toggleDescription}>
                          {settings.isPublic
                            ? "Anyone with the link can view this note"
                            : "Only you and collaborators can access"}
                        </span>
                      </div>
                      <button
                        className={`${styles.toggle} ${settings.isPublic ? styles.toggleOn : ""}`}
                        onClick={handleTogglePublic}
                        disabled={isSaving || !settings.isOwner}
                        aria-pressed={settings.isPublic}
                      >
                        <span className={styles.toggleThumb} />
                      </button>
                    </div>
                  </div>

                  {/* Share Links */}
                  <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                      <span className={styles.sectionTitle}>Share Links</span>
                      {settings.isOwner && (
                        <button
                          className={styles.createLinkButton}
                          onClick={handleCreateShareLink}
                          disabled={isCreatingLink}
                        >
                          {isCreatingLink ? "Creating..." : "+ Create Link"}
                        </button>
                      )}
                    </div>

                    {settings.isOwner && (
                      <div className={styles.newLinkOptions}>
                        <label className={styles.radioLabel}>
                          <input
                            type="radio"
                            name="permission"
                            checked={newLinkPermission === "view"}
                            onChange={() => setNewLinkPermission("view")}
                          />
                          Can view
                        </label>
                        <label className={styles.radioLabel}>
                          <input
                            type="radio"
                            name="permission"
                            checked={newLinkPermission === "edit"}
                            onChange={() => setNewLinkPermission("edit")}
                          />
                          Can edit
                        </label>
                      </div>
                    )}

                    {settings.shareLinks.length === 0 ? (
                      <div className={styles.emptyState}>
                        <LinkIcon />
                        <p>No share links yet</p>
                        <span>Create a link to share this note</span>
                      </div>
                    ) : (
                      <div className={styles.linksList}>
                        {settings.shareLinks.map((link) => (
                          <div
                            key={link.id}
                            className={`${styles.linkItem} ${link.isExpired ? styles.linkExpired : ""}`}
                          >
                            <div className={styles.linkInfo}>
                              <div className={styles.linkUrl}>
                                <input
                                  type="text"
                                  value={link.url}
                                  readOnly
                                  className={styles.linkInput}
                                />
                              </div>
                              <div className={styles.linkMeta}>
                                <span className={`${styles.permissionBadge} ${styles[link.permission]}`}>
                                  {link.permission === "view" ? "View only" : "Can edit"}
                                </span>
                                {link.isExpired && (
                                  <span className={styles.expiredBadge}>Expired</span>
                                )}
                                <span className={styles.viewCount}>
                                  {link.viewCount} views
                                </span>
                              </div>
                            </div>
                            <div className={styles.linkActions}>
                              <button
                                className={`${styles.iconButton} ${copied === link.id ? styles.copied : ""}`}
                                onClick={() => handleCopyLink(link.url, link.id)}
                                title="Copy link"
                              >
                                {copied === link.id ? <CheckIcon /> : <CopyIcon />}
                              </button>
                              {settings.isOwner && (
                                <button
                                  className={`${styles.iconButton} ${styles.deleteButton}`}
                                  onClick={() => handleDeleteShareLink(link.id)}
                                  title="Delete link"
                                >
                                  <TrashIcon />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "people" && (
                <div className={styles.tabContent}>
                  {/* Invite Section */}
                  {settings.isOwner && (
                    <div className={styles.section}>
                      <div className={styles.inviteRow}>
                        <input
                          type="email"
                          placeholder="Enter email to invite..."
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          className={styles.inviteInput}
                        />
                        <select
                          value={inviteRole}
                          onChange={(e) => setInviteRole(e.target.value as "viewer" | "editor")}
                          className={styles.roleSelect}
                        >
                          <option value="viewer">Viewer</option>
                          <option value="editor">Editor</option>
                        </select>
                        <button
                          className={styles.inviteButton}
                          onClick={handleInviteCollaborator}
                          disabled={isInviting || !inviteEmail.trim()}
                        >
                          {isInviting ? "..." : "Invite"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* People List */}
                  <div className={styles.section}>
                    <span className={styles.sectionTitle}>People with access</span>

                    <div className={styles.peopleList}>
                      {/* Owner */}
                      <div className={styles.personItem}>
                        <div className={styles.personAvatar}>
                          {settings.owner.image ? (
                            <Image
                              src={settings.owner.image}
                              alt={settings.owner.name || "Owner"}
                              width={36}
                              height={36}
                              className={styles.avatarImage}
                            />
                          ) : (
                            <div className={styles.avatarFallback}>
                              {getInitials(settings.owner.name)}
                            </div>
                          )}
                        </div>
                        <div className={styles.personInfo}>
                          <span className={styles.personName}>
                            {settings.owner.name || "Unknown"}
                            {settings.isOwner && " (you)"}
                          </span>
                          <span className={styles.personEmail}>{settings.owner.email}</span>
                        </div>
                        <span className={styles.ownerBadge}>Owner</span>
                      </div>

                      {/* Collaborators */}
                      {settings.collaborators.map((collab) => (
                        <div key={collab.id} className={styles.personItem}>
                          <div className={styles.personAvatar}>
                            {collab.user.image ? (
                              <Image
                                src={collab.user.image}
                                alt={collab.user.name || "User"}
                                width={36}
                                height={36}
                                className={styles.avatarImage}
                              />
                            ) : (
                              <div className={styles.avatarFallback}>
                                {getInitials(collab.user.name)}
                              </div>
                            )}
                          </div>
                          <div className={styles.personInfo}>
                            <span className={styles.personName}>{collab.user.name || "Unknown"}</span>
                            <span className={styles.personEmail}>{collab.user.email}</span>
                          </div>
                          {settings.isOwner ? (
                            <div className={styles.personActions}>
                              <select
                                value={collab.role}
                                onChange={(e) => handleUpdateCollaboratorRole(collab.user.id, e.target.value)}
                                className={styles.roleSelectSmall}
                              >
                                <option value="viewer">Viewer</option>
                                <option value="editor">Editor</option>
                                <option value="admin">Admin</option>
                              </select>
                              <button
                                className={`${styles.iconButton} ${styles.deleteButton}`}
                                onClick={() => handleRemoveCollaborator(collab.user.id)}
                                title="Remove"
                              >
                                <TrashIcon />
                              </button>
                            </div>
                          ) : (
                            <span className={styles.roleBadge}>{collab.role}</span>
                          )}
                        </div>
                      ))}

                      {settings.collaborators.length === 0 && (
                        <div className={styles.emptyState}>
                          <PeopleIcon />
                          <p>No collaborators yet</p>
                          <span>Invite people to collaborate on this note</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}

// Icons
function LinkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}

function PeopleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function GlobeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  )
}
