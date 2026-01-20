import * as Y from "yjs"
import type { Block } from "@/types/blocks"

export interface YjsDocumentOptions {
  pageId: string
  initialBlocks?: Block[]
}

// Create a new Y.Doc for collaborative editing
export function createYjsDocument(options: YjsDocumentOptions): Y.Doc {
  const ydoc = new Y.Doc()

  // The blocks array stored as Y.Array for CRDT conflict resolution
  const yblocks = ydoc.getArray<Block>("blocks")

  // Initialize with existing blocks if provided
  if (options.initialBlocks && yblocks.length === 0) {
    ydoc.transact(() => {
      options.initialBlocks!.forEach((block) => yblocks.push([block]))
    })
  }

  return ydoc
}

// Get the blocks array from a Y.Doc
export function getYBlocks(ydoc: Y.Doc): Y.Array<Block> {
  return ydoc.getArray<Block>("blocks")
}

// Convert Y.Array blocks to regular Block array
export function yBlocksToArray(ydoc: Y.Doc): Block[] {
  const yblocks = getYBlocks(ydoc)
  return yblocks.toArray()
}

// Apply blocks to Y.Doc
export function applyBlocksToYDoc(ydoc: Y.Doc, blocks: Block[]): void {
  const yblocks = getYBlocks(ydoc)

  ydoc.transact(() => {
    // Clear existing blocks
    while (yblocks.length > 0) {
      yblocks.delete(0)
    }

    // Add new blocks
    blocks.forEach((block) => yblocks.push([block]))
  })
}

// Encode Y.Doc state to base64 string
export function encodeYDocState(ydoc: Y.Doc): string {
  const state = Y.encodeStateAsUpdate(ydoc)
  return Buffer.from(state).toString("base64")
}

// Decode base64 state and apply to Y.Doc
export function decodeYDocState(ydoc: Y.Doc, encodedState: string): void {
  const state = Buffer.from(encodedState, "base64")
  Y.applyUpdate(ydoc, new Uint8Array(state))
}

// Apply a binary update to Y.Doc
export function applyYDocUpdate(ydoc: Y.Doc, update: Uint8Array): void {
  Y.applyUpdate(ydoc, update)
}

// Get current state vector for sync
export function getStateVector(ydoc: Y.Doc): Uint8Array {
  return Y.encodeStateVector(ydoc)
}

// Get diff from a state vector
export function getStateDiff(ydoc: Y.Doc, stateVector: Uint8Array): Uint8Array {
  return Y.encodeStateAsUpdate(ydoc, stateVector)
}

// Merge two Y.Docs
export function mergeYDocs(doc1: Y.Doc, doc2: Y.Doc): Y.Doc {
  const merged = new Y.Doc()
  const state1 = Y.encodeStateAsUpdate(doc1)
  const state2 = Y.encodeStateAsUpdate(doc2)

  Y.applyUpdate(merged, state1)
  Y.applyUpdate(merged, state2)

  return merged
}

// Observe changes to blocks
export function observeBlocks(
  ydoc: Y.Doc,
  callback: (blocks: Block[], event: Y.YArrayEvent<Block>) => void
): () => void {
  const yblocks = getYBlocks(ydoc)

  const observer = (event: Y.YArrayEvent<Block>) => {
    callback(yblocks.toArray(), event)
  }

  yblocks.observe(observer)

  // Return unsubscribe function
  return () => {
    yblocks.unobserve(observer)
  }
}

// Observe all document updates
export function observeUpdates(
  ydoc: Y.Doc,
  callback: (update: Uint8Array, origin: unknown) => void
): () => void {
  ydoc.on("update", callback)

  return () => {
    ydoc.off("update", callback)
  }
}
