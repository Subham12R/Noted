# Product Requirements Document (PRD)
## Noted - AI-Powered Study & Knowledge Management Platform

**Version:** 2.0
**Date:** January 2026
**Author:** Product Team
**Status:** Draft

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Product Vision](#2-product-vision)
3. [Target Users](#3-target-users)
4. [Current State Analysis](#4-current-state-analysis)
5. [Feature Requirements](#5-feature-requirements)
6. [Study Toolbar (Left Sidebar)](#6-study-toolbar-left-sidebar)
7. [Floating Pomodoro Timer](#7-floating-pomodoro-timer)
8. [Quiz Modal System](#8-quiz-modal-system)
9. [Enhanced File Library](#9-enhanced-file-library)
10. [AI Command System](#10-ai-command-system)
11. [Excalidraw Integration](#11-excalidraw-integration)
12. [Technical Requirements](#12-technical-requirements)
13. [User Stories](#13-user-stories)
14. [Success Metrics](#14-success-metrics)
15. [Release Plan](#15-release-plan)
16. [Risks & Mitigations](#16-risks--mitigations)
17. [Appendix](#17-appendix)

---

## 1. Executive Summary

### 1.1 Problem Statement
Students and knowledge workers struggle with fragmented tools for note-taking, studying, and file management. They use separate apps for notes (Notion), flashcards (Anki), whiteboards (Miro), and file storage (Google Drive), leading to:
- Context switching overhead
- Disconnected knowledge
- Inefficient study workflows
- No unified learning analytics

### 1.2 Solution
Transform **Noted** from a collaborative note-taking app into an **all-in-one Study & Knowledge Management Platform** that combines:
- AI-powered note-taking with real-time collaboration
- Spaced repetition flashcards generated from notes
- Interactive whiteboards (Excalidraw integration)
- File management with PDF annotation
- Learning analytics and study tracking
- Knowledge graph for connected thinking

### 1.3 Key Differentiators
| Feature | Noted | Notion | Anki | Obsidian |
|---------|-------|--------|------|----------|
| AI Content Generation | ✅ Advanced | ✅ Basic | ❌ | ❌ Plugin |
| Real-time Collaboration | ✅ | ✅ | ❌ | ❌ |
| Spaced Repetition | ✅ Native | ❌ | ✅ | ❌ Plugin |
| Whiteboard (Excalidraw) | ✅ | ❌ | ❌ | ❌ Plugin |
| Knowledge Graph | ✅ | ❌ | ❌ | ✅ |
| Study Analytics | ✅ | ❌ | ✅ Basic | ❌ |
| PDF Annotation | ✅ | ❌ | ❌ | ❌ Plugin |

---

## 2. Product Vision

### 2.1 Vision Statement
> "Empower learners to capture, connect, and retain knowledge effortlessly through AI-assisted study tools in one unified platform."

### 2.2 Mission
To become the go-to platform for students and lifelong learners by providing intelligent tools that adapt to individual learning patterns and maximize knowledge retention.

### 2.3 Core Principles
1. **AI-First**: Every feature should leverage AI to reduce friction
2. **Connected Knowledge**: Information should be linked, not siloed
3. **Evidence-Based Learning**: Use spaced repetition and active recall
4. **Seamless Collaboration**: Real-time sync for group study
5. **Privacy-Focused**: User data ownership and security

---

## 3. Target Users

### 3.1 Primary Personas

#### Persona 1: University Student (Sarah, 21)
**Goals:**
- Take lecture notes efficiently
- Review materials before exams
- Collaborate on group projects
- Track study progress

**Pain Points:**
- Switching between apps wastes time
- Manual flashcard creation is tedious
- No insight into study effectiveness
- Difficult to find old notes

**Success Metrics:**
- Reduced study prep time by 50%
- Improved exam scores
- Better retention of material

#### Persona 2: Professional Learner (James, 34)
**Goals:**
- Learn new skills for career growth
- Organize research and resources
- Annotate technical documents
- Build personal knowledge base

**Pain Points:**
- Information scattered across tools
- Forget what was learned months ago
- No structured review system
- Hard to connect concepts

**Success Metrics:**
- Certificates/skills acquired
- Knowledge retention over time
- Time to find information

#### Persona 3: Educator (Dr. Martinez, 45)
**Goals:**
- Create teaching materials
- Share resources with students
- Track student engagement
- Collaborate with colleagues

**Pain Points:**
- Students don't review materials
- Hard to create interactive content
- No visibility into student progress
- Content scattered across platforms

**Success Metrics:**
- Student engagement rates
- Material completion rates
- Time saved on content creation

### 3.2 User Segments
| Segment | Size | Priority | Revenue Potential |
|---------|------|----------|-------------------|
| University Students | 200M+ | P0 | Medium (Pro plans) |
| Graduate Students | 50M+ | P0 | High (Pro/Team) |
| Self-learners | 100M+ | P1 | Medium (Pro plans) |
| Corporate Training | 10M+ | P2 | Very High (Team) |
| K-12 Students | 500M+ | P3 | Low (Free/Edu) |

---

## 4. Current State Analysis

### 4.1 Existing Features
| Feature | Status | Quality | Notes |
|---------|--------|---------|-------|
| Rich Text Editor (TipTap) | ✅ Live | Good | Full-featured with slash commands |
| Real-time Collaboration | ✅ Live | Good | Yjs CRDT, cursor tracking |
| AI Generation (9 modes) | ✅ Live | Good | Groq/OpenAI/Anthropic + quiz/flashcard |
| Folder Organization | ✅ Live | Good | Nested hierarchy |
| Share Links | ✅ Live | Good | Permissions, expiration |
| Todo List | ✅ Live | Basic | Needs enhancement |
| Whiteboard (Excalidraw) | ✅ Live | Good | **UPGRADED** - Full Excalidraw integration |
| Subscription (Stripe) | ✅ Live | Good | Free/Pro/Team tiers |
| Authentication | ✅ Live | Good | Email + OAuth |
| Study Toolbar | ✅ Live | Good | **NEW** - Right sidebar with study tools |
| Floating Pomodoro | ✅ Live | Good | **NEW** - Draggable timer, persists across pages |
| Flashcard System | ✅ Live | Good | **NEW** - AI generation, spaced repetition UI |
| Quiz Modal | ✅ Live | Good | **NEW** - AI generation, multiple modes |

### 4.2 Technical Debt
- [x] ~~Whiteboard is custom canvas~~ → **DONE - Migrated to Excalidraw**
- [ ] No file storage system
- [ ] Search is basic (no full-text or semantic)
- [ ] No tagging system
- [ ] Mobile experience needs improvement
- [ ] No knowledge graph/backlinks

### 4.3 Competitive Analysis

```
Feature Matrix vs Competitors:

                    Noted   Notion  Obsidian  Roam    Anki
Real-time Collab    ████░   █████   ░░░░░     ░░░░░   ░░░░░
AI Integration      █████   ███░░   ██░░░     ░░░░░   ░░░░░
Note-taking         ████░   █████   █████     █████   ░░░░░
Flashcards          ░░░░░*  ░░░░░   ██░░░     ░░░░░   █████
Whiteboard          ██░░░*  ░░░░░   ░░░░░     ░░░░░   ░░░░░
Knowledge Graph     ░░░░░*  ░░░░░   █████     █████   ░░░░░
File Management     ░░░░░*  ████░   ███░░     ░░░░░   ░░░░░
Study Analytics     ░░░░░*  ░░░░░   ░░░░░     ░░░░░   ███░░

* = Planned features
```

---

## 5. Feature Requirements

### 5.1 Priority Framework
- **P0 (Must Have)**: Core functionality, blocks launch without it
- **P1 (Should Have)**: Important for competitive parity
- **P2 (Nice to Have)**: Differentiators, can ship later
- **P3 (Future)**: Roadmap items for future releases

---

### 5.2 Feature: Excalidraw Whiteboard Integration [P0]

**Priority:** P0 - Critical
**Effort:** Medium (2-3 weeks)
**Impact:** High

#### 5.2.1 Overview
Replace the current custom canvas whiteboard with Excalidraw, an open-source whiteboard tool with superior drawing capabilities, collaboration features, and hand-drawn aesthetic.

#### 5.2.2 Requirements

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| EXC-001 | Embed Excalidraw as TipTap node | P0 | Replace current WhiteboardNode |
| EXC-002 | Save/load drawing state | P0 | Persist to page content |
| EXC-003 | Real-time collaboration | P0 | Sync via existing WebSocket |
| EXC-004 | Resizable container | P0 | Match current behavior |
| EXC-005 | Full-page whiteboard mode | P1 | Dedicated /whiteboard route |
| EXC-006 | Export to PNG/SVG | P1 | Download drawings |
| EXC-007 | Library support | P2 | Reusable shapes/templates |
| EXC-008 | Dark mode support | P1 | Match app theme |

#### 5.2.3 User Stories
- As a student, I want to draw diagrams in my notes so I can visualize concepts
- As a teacher, I want to create interactive diagrams to explain complex topics
- As a team, we want to brainstorm together on a shared whiteboard

#### 5.2.4 Technical Approach
See [Section 6: Excalidraw Integration](#6-excalidraw-integration) for detailed implementation.

---

### 5.3 Feature: Flashcard System [P0]

**Priority:** P0 - Critical
**Effort:** High (4-6 weeks)
**Impact:** Very High

#### 5.3.1 Overview
A spaced repetition flashcard system integrated with notes, allowing AI-generated cards and scientifically-proven review schedules.

#### 5.3.2 Requirements

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| FC-001 | Create flashcard decks | P0 | Manual creation |
| FC-002 | Add cards to decks | P0 | Front/back format |
| FC-003 | AI generate cards from notes | P0 | One-click generation |
| FC-004 | Spaced repetition algorithm | P0 | FSRS or SM-2 |
| FC-005 | Review interface | P0 | Card flip, rating buttons |
| FC-006 | Progress tracking | P0 | Cards due, retention rate |
| FC-007 | Cloze deletion cards | P1 | {{c1::word}} syntax |
| FC-008 | Image cards | P1 | Image on front/back |
| FC-009 | Audio cards | P2 | For language learning |
| FC-010 | Share decks | P2 | Public/private sharing |
| FC-011 | Import from Anki | P2 | .apkg file support |

#### 5.3.3 User Stories
- As a student, I want to generate flashcards from my lecture notes so I don't have to manually create them
- As a learner, I want the app to show me cards when they're due so I can retain information long-term
- As a user, I want to see my retention statistics so I know how well I'm learning

#### 5.3.4 Acceptance Criteria
```gherkin
Feature: Flashcard Generation
  Scenario: Generate flashcards from a note
    Given I have a note with content about "Photosynthesis"
    When I click "Generate Flashcards"
    Then the AI should create 5-10 relevant flashcards
    And each card should have a question and answer
    And the cards should be added to a new deck

Feature: Spaced Repetition Review
  Scenario: Review due cards
    Given I have cards due for review today
    When I open the review screen
    Then I should see cards one at a time
    When I rate a card as "Good"
    Then the next review date should be calculated
    And the card should be removed from today's queue
```

#### 5.3.5 UI Mockups

```
┌─────────────────────────────────────────────────────┐
│  Flashcard Review                           [X]     │
├─────────────────────────────────────────────────────┤
│                                                     │
│     ┌───────────────────────────────────────┐       │
│     │                                       │       │
│     │    What is the process by which      │       │
│     │    plants convert sunlight into      │       │
│     │    chemical energy?                  │       │
│     │                                       │       │
│     │           [Tap to reveal]            │       │
│     │                                       │       │
│     └───────────────────────────────────────┘       │
│                                                     │
│     ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐            │
│     │Again│  │Hard │  │Good │  │Easy │            │
│     │ <1m │  │ 6m  │  │ 10m │  │ 4d  │            │
│     └─────┘  └─────┘  └─────┘  └─────┘            │
│                                                     │
│     Progress: 12/45 cards  │  Due today: 33        │
└─────────────────────────────────────────────────────┘
```

---

### 5.4 Feature: File Management & Storage [P0]

**Priority:** P0 - Critical
**Effort:** Medium (3-4 weeks)
**Impact:** High

#### 5.4.1 Requirements

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| FM-001 | Upload files to notes | P0 | Drag-drop, paste |
| FM-002 | Image preview in editor | P0 | Inline display |
| FM-003 | File library view | P0 | Grid/list of all files |
| FM-004 | Storage quota per tier | P0 | Free: 100MB, Pro: 10GB |
| FM-005 | PDF viewer | P1 | View PDFs in app |
| FM-006 | PDF annotation | P1 | Highlight, underline, notes |
| FM-007 | Extract highlights to note | P2 | One-click export |
| FM-008 | Video/audio playback | P2 | Inline players |
| FM-009 | OCR for images | P3 | Extract text from images |

#### 5.4.2 Storage Tiers

| Tier | Storage Limit | Max File Size |
|------|--------------|---------------|
| Free | 100 MB | 5 MB |
| Pro | 10 GB | 100 MB |
| Team | 100 GB | 500 MB |

---

### 5.5 Feature: Tagging System [P0]

**Priority:** P0 - Critical
**Effort:** Low (1-2 weeks)
**Impact:** High

#### 5.5.1 Requirements

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| TAG-001 | Create/edit/delete tags | P0 | Color picker |
| TAG-002 | Add tags to pages | P0 | Multi-select |
| TAG-003 | Add tags to folders | P0 | Inheritance option |
| TAG-004 | Filter by tags | P0 | Sidebar filter |
| TAG-005 | Tag autocomplete | P0 | While typing |
| TAG-006 | Hierarchical tags | P1 | Parent/child |
| TAG-007 | AI tag suggestions | P2 | Based on content |

---

### 5.6 Feature: Study Sessions & Analytics [P1]

**Priority:** P1 - Should Have
**Effort:** Medium (2-3 weeks)
**Impact:** Medium

#### 5.6.1 Requirements

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| SS-001 | Pomodoro timer | P0 | 25/5 default, customizable |
| SS-002 | Session tracking | P0 | Start/stop/pause |
| SS-003 | Link session to note | P1 | What was studied |
| SS-004 | Study streak | P1 | Days in a row |
| SS-005 | Daily/weekly goals | P1 | Hour targets |
| SS-006 | Analytics dashboard | P1 | Charts and stats |
| SS-007 | Study heatmap | P2 | GitHub-style calendar |
| SS-008 | Focus mode | P2 | Hide distractions |

#### 5.6.2 Analytics Dashboard Mockup

```
┌─────────────────────────────────────────────────────────────────┐
│  Study Analytics                                    This Week ▼ │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  12.5 hrs    │  │  🔥 7 days   │  │  85%         │          │
│  │  Study Time  │  │  Streak      │  │  Retention   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                 │
│  Study Time (hours)                                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │     ▄▄                                                   │   │
│  │  ▄▄ ██ ▄▄    ▄▄                      ▄▄                 │   │
│  │  ██ ██ ██ ▄▄ ██    ▄▄ ▄▄          ▄▄ ██ ▄▄             │   │
│  │  ██ ██ ██ ██ ██ ▄▄ ██ ██ ▄▄ ▄▄ ▄▄ ██ ██ ██             │   │
│  │  Mon Tue Wed Thu Fri Sat Sun                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Top Subjects                    Flashcard Progress             │
│  ┌────────────────────────┐     ┌────────────────────────┐     │
│  │ Biology     ████████ 4h│     │ New:      45 cards     │     │
│  │ Chemistry   █████░░░ 2h│     │ Learning: 120 cards    │     │
│  │ Physics     ███░░░░░ 1h│     │ Review:   89 cards     │     │
│  │ Math        ██░░░░░░ 1h│     │ Mastered: 234 cards    │     │
│  └────────────────────────┘     └────────────────────────┘     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### 5.7 Feature: Knowledge Graph & Bi-directional Links [P1]

**Priority:** P1 - Should Have
**Effort:** High (4-5 weeks)
**Impact:** High

#### 5.7.1 Requirements

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| KG-001 | Wiki-style links [[Page]] | P0 | In editor |
| KG-002 | Backlinks panel | P0 | Show pages linking here |
| KG-003 | Link autocomplete | P0 | Search while typing |
| KG-004 | Knowledge graph view | P1 | Interactive visualization |
| KG-005 | Unlinked mentions | P1 | Find implicit references |
| KG-006 | Graph filtering | P2 | By tag, date, folder |
| KG-007 | Local graph (single note) | P2 | Neighbors only |

---

### 5.8 Feature: Quiz System [P1]

**Priority:** P1 - Should Have
**Effort:** Medium (3-4 weeks)
**Impact:** Medium

#### 5.8.1 Requirements

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| QZ-001 | Create quizzes manually | P0 | Question builder |
| QZ-002 | AI generate quiz from note | P0 | One-click |
| QZ-003 | Multiple choice questions | P0 | Single/multi answer |
| QZ-004 | True/False questions | P0 | Simple format |
| QZ-005 | Fill-in-the-blank | P1 | Text input |
| QZ-006 | Timed quizzes | P1 | Countdown timer |
| QZ-007 | Quiz results & review | P0 | Score, correct answers |
| QZ-008 | Share quizzes | P2 | With students |
| QZ-009 | Quiz analytics | P2 | Performance over time |

---

### 5.9 Feature: Advanced Search [P1]

**Priority:** P1 - Should Have
**Effort:** Medium (2-3 weeks)
**Impact:** High

#### 5.9.1 Requirements

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| SR-001 | Full-text search | P0 | PostgreSQL tsvector |
| SR-002 | Search in file names | P0 | Quick find |
| SR-003 | Search filters | P0 | Type, date, tag |
| SR-004 | Search highlighting | P0 | Show matches |
| SR-005 | Semantic search | P1 | AI embeddings |
| SR-006 | Search in PDFs | P2 | Extract text |
| SR-007 | Recent searches | P2 | History |
| SR-008 | Saved searches | P3 | Bookmarks |

---

### 5.10 Feature: AI Enhancements [P1]

**Priority:** P1 - Should Have
**Effort:** Medium (2-3 weeks)
**Impact:** High

#### 5.10.1 New AI Modes

| Mode | Description | Input | Output |
|------|-------------|-------|--------|
| `generate_flashcards` | Create flashcards from text | Note content | Array of cards |
| `generate_quiz` | Create quiz questions | Note content | Quiz object |
| `explain_simple` | ELI5 explanation | Selected text | Simple explanation |
| `find_gaps` | Identify knowledge gaps | Note + quiz results | Gap analysis |
| `create_outline` | Structure content | Raw notes | Organized outline |
| `suggest_links` | Find related notes | Current note | Link suggestions |
| `study_plan` | Generate study schedule | Topics + deadline | Daily plan |

---

### 5.11 Feature: Templates [P2]

**Priority:** P2 - Nice to Have
**Effort:** Low (1 week)
**Impact:** Medium

#### 5.11.1 Default Templates
- Cornell Notes
- Meeting Notes
- Lecture Notes
- Project Brief
- Weekly Review
- Book Summary
- Research Notes
- Daily Journal

---

### 5.12 Feature: Mobile App [P2]

**Priority:** P2 - Nice to Have
**Effort:** Very High (3-4 months)
**Impact:** High

#### 5.12.1 Requirements

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| MOB-001 | View notes | P0 | Read-only first |
| MOB-002 | Edit notes | P0 | Basic editing |
| MOB-003 | Flashcard review | P0 | Core feature |
| MOB-004 | Offline support | P1 | Local cache |
| MOB-005 | Quick capture | P1 | Widget, share sheet |
| MOB-006 | Push notifications | P1 | Review reminders |
| MOB-007 | Camera scan | P2 | OCR to notes |

---

## 6. Study Toolbar (Left Sidebar)

### 6.1 Overview

**Priority:** P0 - Critical
**Effort:** Medium (2-3 weeks)
**Impact:** Very High

A dedicated vertical toolbar positioned on the left side of the screen, providing quick access to study tools, flashcards, knowledge graph, quizzes, and other learning features. This toolbar is separate from the existing navigation sidebar and focuses exclusively on study/productivity tools.

### 6.2 Design Specification

```
┌──────┬────────────────────────────────────────────────────────────┐
│      │                                                            │
│  ⚡  │  ┌─────────────────────────────────────────────────────┐   │
│      │  │                                                     │   │
│  📚  │  │                                                     │   │
│      │  │                    NOTE EDITOR                      │   │
│  🧠  │  │                                                     │   │
│      │  │                                                     │   │
│  ❓  │  │                                                     │   │
│      │  │                                                     │   │
│  📊  │  │                                                     │   │
│      │  │                                                     │   │
│  📁  │  └─────────────────────────────────────────────────────┘   │
│      │                                                            │
│  ⏱️  │  ┌─────────────────────────────────────────────────────┐   │
│      │  │  🍅 25:00  [Pause] [Stop]                           │   │
│  ⚙️  │  └─────────────────────────────────────────────────────┘   │
│      │                                                            │
└──────┴────────────────────────────────────────────────────────────┘
  Left                           Main Content Area
Toolbar
```

### 6.3 Toolbar Items

| Icon | Name | Action | Keyboard Shortcut |
|------|------|--------|-------------------|
| ⚡ | Quick Actions | Open command palette | `Cmd/Ctrl + K` |
| 📚 | Flashcards | Open flashcard panel/modal | `Cmd/Ctrl + Shift + F` |
| 🧠 | Knowledge Graph | Open graph view | `Cmd/Ctrl + Shift + G` |
| ❓ | Quiz | Open quiz modal | `Cmd/Ctrl + Shift + Q` |
| 📊 | Analytics | Open study analytics | `Cmd/Ctrl + Shift + A` |
| 📁 | File Library | Open file manager | `Cmd/Ctrl + Shift + L` |
| ⏱️ | Pomodoro | Toggle floating timer | `Cmd/Ctrl + Shift + P` |
| ⚙️ | Settings | Open toolbar settings | - |

### 6.4 Requirements

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| STB-001 | Fixed position left toolbar | P0 | Always visible when logged in |
| STB-002 | Collapsible/expandable | P0 | Icon-only or icon+label |
| STB-003 | Tooltip on hover | P0 | Show name and shortcut |
| STB-004 | Badge notifications | P0 | Cards due, quiz pending |
| STB-005 | Customizable order | P1 | Drag to reorder |
| STB-006 | Hide/show individual items | P1 | User preference |
| STB-007 | Dark/light mode | P0 | Match app theme |
| STB-008 | Mobile responsive | P1 | Bottom bar on mobile |
| STB-009 | Context-aware actions | P2 | Change based on current page |

### 6.5 Toolbar States

```
┌────────────────────────────────────────────────────────────────┐
│  COLLAPSED (48px)          EXPANDED (200px)                    │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌────┐                    ┌──────────────────────┐            │
│  │ 📚 │                    │ 📚  Flashcards    12 │            │
│  └────┘                    └──────────────────────┘            │
│    ↑                              ↑                            │
│  Badge: 12                    Full label + badge               │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### 6.6 Component Structure

```typescript
// src/components/study-toolbar/StudyToolbar.tsx
interface StudyToolbarProps {
  isExpanded: boolean
  onToggleExpand: () => void
  activeItem: ToolbarItem | null
  onItemClick: (item: ToolbarItem) => void
}

type ToolbarItem =
  | 'quick-actions'
  | 'flashcards'
  | 'knowledge-graph'
  | 'quiz'
  | 'analytics'
  | 'file-library'
  | 'pomodoro'
  | 'settings'

// Context for global toolbar state
interface StudyToolbarContextType {
  isExpanded: boolean
  toggleExpanded: () => void
  activePanel: ToolbarItem | null
  openPanel: (item: ToolbarItem) => void
  closePanel: () => void
  badges: Record<ToolbarItem, number>
}
```

### 6.7 User Stories

- As a student, I want quick access to flashcards while taking notes so I can create cards without leaving my note
- As a user, I want to see how many flashcards are due without opening the flashcard panel
- As a learner, I want to open the knowledge graph with one click to see connections
- As a user, I want to customize which tools appear in my toolbar

---

## 7. Floating Pomodoro Timer

### 7.1 Overview

**Priority:** P0 - Critical
**Effort:** Low-Medium (1-2 weeks)
**Impact:** High

A floating, persistent Pomodoro timer that remains visible across all pages in the application. Unlike traditional page-bound components, this timer maintains its state and position throughout the user's session, enabling uninterrupted study tracking.

### 7.2 Key Characteristics

| Aspect | Specification |
|--------|---------------|
| Persistence | Remains active across page navigation |
| Position | Floating, draggable anywhere on screen |
| State | Stored in localStorage + synced to server |
| Modes | Pomodoro (25min), Short Break (5min), Long Break (15min), Custom |
| Visibility | Always on top, minimizable to icon |

### 7.3 Design Specification

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                      FLOATING TIMER STATES                      │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  EXPANDED (Default)              MINIMIZED                      │
│  ┌─────────────────────┐        ┌─────────┐                    │
│  │  🍅 Focus Time      │        │ 🍅 25:00│                    │
│  │                     │        └─────────┘                    │
│  │     25:00           │                                        │
│  │                     │        MICRO (Icon only)               │
│  │  ┌─────┐ ┌─────┐   │        ┌───┐                           │
│  │  │ ▶️  │ │ ⏹️  │   │        │🍅 │ ← Badge shows time        │
│  │  └─────┘ └─────┘   │        └───┘                           │
│  │                     │                                        │
│  │  Session: 3/4       │                                        │
│  │  [Settings] [Stats] │                                        │
│  └─────────────────────┘                                        │
│                                                                 │
│  BREAK MODE                      COMPLETED                      │
│  ┌─────────────────────┐        ┌─────────────────────┐        │
│  │  ☕ Short Break     │        │  ✅ Session Complete │        │
│  │                     │        │                     │        │
│  │     05:00           │        │  Great work! 🎉     │        │
│  │                     │        │  Total: 2h 15m      │        │
│  │  ┌─────┐ ┌─────┐   │        │                     │        │
│  │  │ ⏭️  │ │ ⏹️  │   │        │  [New Session]      │        │
│  │  │Skip │ │     │   │        └─────────────────────┘        │
│  │  └─────┘ └─────┘   │                                        │
│  └─────────────────────┘                                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.4 Requirements

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| PT-001 | Floating window component | P0 | Rendered at app root level |
| PT-002 | Draggable positioning | P0 | Remember last position |
| PT-003 | Persist across navigation | P0 | Use React Portal + Context |
| PT-004 | Timer modes (Focus/Break) | P0 | Auto-switch between modes |
| PT-005 | Sound notifications | P0 | Configurable sounds |
| PT-006 | Browser notifications | P0 | When tab not focused |
| PT-007 | Minimize to icon | P0 | Reduce screen footprint |
| PT-008 | Session counting | P0 | Track Pomodoros completed |
| PT-009 | Link to current note | P1 | Track what was studied |
| PT-010 | Custom durations | P1 | User-defined times |
| PT-011 | Auto-start breaks | P1 | Optional setting |
| PT-012 | Daily goal tracking | P1 | X pomodoros per day |
| PT-013 | Keyboard shortcuts | P1 | Start/pause/stop |
| PT-014 | Do Not Disturb mode | P2 | Hide other notifications |
| PT-015 | Sync across devices | P2 | Server-side timer state |

### 7.5 Technical Implementation

```typescript
// src/context/PomodoroContext.tsx
interface PomodoroContextType {
  // Timer State
  isRunning: boolean
  isPaused: boolean
  mode: 'focus' | 'short-break' | 'long-break'
  timeRemaining: number // seconds
  sessionsCompleted: number

  // UI State
  isVisible: boolean
  isMinimized: boolean
  position: { x: number; y: number }

  // Settings
  settings: PomodoroSettings

  // Actions
  start: () => void
  pause: () => void
  resume: () => void
  stop: () => void
  skip: () => void
  setMode: (mode: PomodoroMode) => void
  toggleVisibility: () => void
  toggleMinimize: () => void
  updatePosition: (pos: { x: number; y: number }) => void
  updateSettings: (settings: Partial<PomodoroSettings>) => void

  // Linked content
  linkedPageId: string | null
  linkToPage: (pageId: string) => void
}

interface PomodoroSettings {
  focusDuration: number      // default: 25 * 60
  shortBreakDuration: number // default: 5 * 60
  longBreakDuration: number  // default: 15 * 60
  sessionsUntilLongBreak: number // default: 4
  autoStartBreaks: boolean
  autoStartFocus: boolean
  soundEnabled: boolean
  soundVolume: number
  notificationsEnabled: boolean
  dailyGoal: number // pomodoros
}

// Rendered in root layout, outside of page components
// src/app/layout.tsx
<PomodoroProvider>
  <FloatingPomodoro />
  {children}
</PomodoroProvider>
```

### 7.6 Persistence Strategy

```typescript
// Timer state persistence
// 1. localStorage for immediate access
// 2. Server sync for cross-device (optional)

interface PersistedPomodoroState {
  isRunning: boolean
  mode: PomodoroMode
  timeRemaining: number
  sessionsCompleted: number
  startedAt: number | null // timestamp
  linkedPageId: string | null
  position: { x: number; y: number }
}

// On page load:
// 1. Load from localStorage
// 2. If timer was running, calculate elapsed time
// 3. Resume or complete based on time passed
```

### 7.7 User Stories

- As a student, I want the timer to keep running when I switch between notes
- As a user, I want to minimize the timer to a small icon when I need more screen space
- As a learner, I want to see how many pomodoros I've completed today
- As a user, I want to hear a sound when my focus session ends
- As a student, I want the timer to automatically start my break after a focus session

---

## 8. Quiz Modal System

### 8.1 Overview

**Priority:** P0 - Critical
**Effort:** Medium (3-4 weeks)
**Impact:** High

A flexible quiz system that displays in a modal overlay by default, with options for fullscreen mode. Quizzes can be generated from notes using AI or created manually, with various question types and display preferences.

### 8.2 Display Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| Modal (Default) | Centered overlay, 80% viewport | Quick review, casual study |
| Fullscreen | Takes entire screen | Exam simulation, focused study |
| Sidebar | Panel on right side | Reference notes while quizzing |
| Embedded | Inline in note | Interactive learning |

### 8.3 Design Specification

```
┌─────────────────────────────────────────────────────────────────┐
│                        MODAL MODE (Default)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   │
│    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   │
│    ░░  ┌─────────────────────────────────────────────┐  ░░░   │
│    ░░  │  📝 Biology Quiz           [⛶] [✕]         │  ░░░   │
│    ░░  ├─────────────────────────────────────────────┤  ░░░   │
│    ░░  │                                             │  ░░░   │
│    ░░  │  Question 3 of 10                  ⏱️ 12:34 │  ░░░   │
│    ░░  │                                             │  ░░░   │
│    ░░  │  What is the powerhouse of the cell?       │  ░░░   │
│    ░░  │                                             │  ░░░   │
│    ░░  │  ○ A) Nucleus                              │  ░░░   │
│    ░░  │  ○ B) Mitochondria                         │  ░░░   │
│    ░░  │  ○ C) Ribosome                             │  ░░░   │
│    ░░  │  ○ D) Endoplasmic Reticulum                │  ░░░   │
│    ░░  │                                             │  ░░░   │
│    ░░  │  ┌──────────────────────────────────────┐  │  ░░░   │
│    ░░  │  │  ← Previous    [Submit]    Next →    │  │  ░░░   │
│    ░░  │  └──────────────────────────────────────┘  │  ░░░   │
│    ░░  │                                             │  ░░░   │
│    ░░  │  Progress: ████████░░░░░░░░░░ 30%          │  ░░░   │
│    ░░  └─────────────────────────────────────────────┘  ░░░   │
│    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        FULLSCREEN MODE                          │
├─────────────────────────────────────────────────────────────────┤
│  📝 Biology Quiz                         ⏱️ 12:34    [Exit ⛶]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                     Question 3 of 10                            │
│                                                                 │
│     ┌─────────────────────────────────────────────────────┐     │
│     │                                                     │     │
│     │     What is the powerhouse of the cell?            │     │
│     │                                                     │     │
│     │     ┌─────────────────────────────────────────┐    │     │
│     │     │  A) Nucleus                             │    │     │
│     │     └─────────────────────────────────────────┘    │     │
│     │     ┌─────────────────────────────────────────┐    │     │
│     │     │  B) Mitochondria                   ✓    │    │     │
│     │     └─────────────────────────────────────────┘    │     │
│     │     ┌─────────────────────────────────────────┐    │     │
│     │     │  C) Ribosome                            │    │     │
│     │     └─────────────────────────────────────────┘    │     │
│     │     ┌─────────────────────────────────────────┐    │     │
│     │     │  D) Endoplasmic Reticulum               │    │     │
│     │     └─────────────────────────────────────────┘    │     │
│     │                                                     │     │
│     └─────────────────────────────────────────────────────┘     │
│                                                                 │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ... ┌────┐  │
│  │ 1 ✓│ │ 2 ✓│ │ 3  │ │ 4  │ │ 5  │ │ 6  │ │ 7  │     │ 10 │  │
│  └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘     └────┘  │
│                                                                 │
│         [← Previous]              [Submit Answer]   [Next →]    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 8.4 Requirements

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| QM-001 | Modal display mode | P0 | Default, centered overlay |
| QM-002 | Fullscreen mode | P0 | Toggle with button/shortcut |
| QM-003 | Remember user preference | P0 | localStorage |
| QM-004 | Keyboard navigation | P0 | 1-4 for options, Enter to submit |
| QM-005 | Timer display | P0 | Optional, configurable |
| QM-006 | Progress indicator | P0 | Questions answered |
| QM-007 | Question navigation | P0 | Jump to any question |
| QM-008 | AI quiz generation | P0 | From selected text or note |
| QM-009 | Multiple question types | P0 | MCQ, True/False, Fill-blank |
| QM-010 | Instant feedback mode | P1 | Show correct after each |
| QM-011 | Review mode | P1 | See all answers at end |
| QM-012 | Sidebar display mode | P2 | For reference while quizzing |
| QM-013 | Embedded in note | P2 | Inline quiz blocks |
| QM-014 | Share quiz link | P2 | Public/private access |
| QM-015 | Quiz templates | P2 | Save quiz structure |

### 8.5 Question Types

```typescript
type QuestionType =
  | 'multiple-choice'      // Single correct answer
  | 'multiple-select'      // Multiple correct answers
  | 'true-false'           // Binary choice
  | 'fill-blank'           // Text input
  | 'matching'             // Match pairs
  | 'ordering'             // Arrange in order
  | 'short-answer'         // Free text (AI graded)

interface Question {
  id: string
  type: QuestionType
  question: string
  options?: string[]        // For choice questions
  correctAnswer: string | string[]
  explanation?: string
  points: number
  difficulty: 'easy' | 'medium' | 'hard'
  tags: string[]
  sourcePageId?: string     // Where question was generated from
}

interface Quiz {
  id: string
  title: string
  description?: string
  questions: Question[]
  settings: QuizSettings
  createdAt: Date
  sourcePageId?: string
  isAIGenerated: boolean
}

interface QuizSettings {
  displayMode: 'modal' | 'fullscreen' | 'sidebar' | 'embedded'
  timeLimit?: number        // seconds, optional
  shuffleQuestions: boolean
  shuffleOptions: boolean
  showTimer: boolean
  showProgress: boolean
  instantFeedback: boolean  // Show correct answer immediately
  allowSkip: boolean
  allowBack: boolean        // Navigate to previous questions
  passingScore: number      // Percentage to pass
}
```

### 8.6 Quiz Results Screen

```
┌─────────────────────────────────────────────────────────────────┐
│                        QUIZ RESULTS                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                    🎉 Quiz Completed!                           │
│                                                                 │
│         ┌─────────────────────────────────┐                    │
│         │                                 │                    │
│         │           85%                   │                    │
│         │         SCORE                   │                    │
│         │                                 │                    │
│         │    17/20 Correct                │                    │
│         │    Time: 15:32                  │                    │
│         │                                 │                    │
│         └─────────────────────────────────┘                    │
│                                                                 │
│   Performance Breakdown:                                        │
│   ┌─────────────────────────────────────────────────────┐      │
│   │ Easy      ████████████████████ 100% (5/5)          │      │
│   │ Medium    ████████████░░░░░░░░  80% (8/10)         │      │
│   │ Hard      ████████░░░░░░░░░░░░  60% (4/5)          │      │
│   └─────────────────────────────────────────────────────┘      │
│                                                                 │
│   ┌────────────┐  ┌────────────┐  ┌────────────────────┐       │
│   │Review All  │  │ Retry Quiz │  │Create Flashcards   │       │
│   │  Answers   │  │            │  │  from Mistakes     │       │
│   └────────────┘  └────────────┘  └────────────────────┘       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 8.7 User Stories

- As a student, I want to take quizzes in fullscreen mode for focused exam practice
- As a user, I want the quiz to remember my preferred display mode
- As a learner, I want to see explanations for wrong answers after submitting
- As a student, I want to create flashcards from questions I got wrong
- As a user, I want to navigate between questions freely

---

## 9. Enhanced File Library

### 9.1 Overview

**Priority:** P0 - Critical
**Effort:** Medium (3-4 weeks)
**Impact:** High

A comprehensive file management system with advanced organization, preview capabilities, and deep integration with notes. Accessible from the left study toolbar.

### 9.2 Design Specification

```
┌─────────────────────────────────────────────────────────────────┐
│  📁 File Library                        [Grid ▢] [List ≡] [+]  │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  Storage: 2.3 GB / 10 GB  [Upgrade]       │
│  │ 🔍 Search files │  ████████░░░░░░░░░░░░░░░░ 23%             │
│  └─────────────────┘                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📂 Quick Access                                                │
│  ├── 📄 Recent Files                                           │
│  ├── ⭐ Starred                                                 │
│  ├── 🖼️ Images                                                  │
│  ├── 📑 PDFs                                                    │
│  ├── 🎵 Audio                                                   │
│  └── 🎬 Video                                                   │
│                                                                 │
│  📂 Folders                                                     │
│  ├── 📁 Biology                                                 │
│  ├── 📁 Chemistry                                               │
│  └── 📁 Research Papers                                         │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │  ┌────┐  │ │  ┌────┐  │ │  ┌────┐  │ │  ┌────┐  │          │
│  │  │ 📄 │  │ │  │ 🖼️ │  │ │  │ 📑 │  │ │  │ 🎵 │  │          │
│  │  └────┘  │ │  └────┘  │ │  └────┘  │ │  └────┘  │          │
│  │ notes.md │ │ diagram  │ │ paper.pdf│ │lecture.mp3│          │
│  │ 2.3 MB   │ │ 1.2 MB   │ │ 5.4 MB   │ │ 45.2 MB  │          │
│  │ Jan 15   │ │ Jan 14   │ │ Jan 12   │ │ Jan 10   │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│                                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │  ┌────┐  │ │  ┌────┐  │ │  ┌────┐  │ │  ┌────┐  │          │
│  │  │ 🖼️ │  │ │  │ 📑 │  │ │  │ 🎬 │  │ │  │ 📄 │  │          │
│  │  └────┘  │ │  └────┘  │ │  └────┘  │ │  └────┘  │          │
│  │ chart.png│ │thesis.pdf│ │ demo.mp4 │ │ data.csv │          │
│  │ 0.8 MB   │ │ 12.1 MB  │ │ 120.5 MB │ │ 0.2 MB   │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 9.3 File Preview Panel

```
┌─────────────────────────────────────────────────────────────────┐
│  📄 thesis.pdf                                    [✕]           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │                   PDF PREVIEW                           │   │
│  │                                                         │   │
│  │              [Full-screen viewer]                       │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Details                                                        │
│  ├── Type: PDF Document                                        │
│  ├── Size: 12.1 MB                                             │
│  ├── Pages: 45                                                  │
│  ├── Created: Jan 12, 2026                                     │
│  ├── Modified: Jan 14, 2026                                    │
│  └── Location: /Research Papers/                               │
│                                                                 │
│  Tags: #research #thesis #biology                              │
│                                                                 │
│  Linked Notes:                                                  │
│  ├── 📝 Chapter 1 Summary                                      │
│  └── 📝 Research Notes                                         │
│                                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ Open     │ │ Download │ │ Annotate │ │ Delete   │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 9.4 Requirements

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| FL-001 | Grid/List view toggle | P0 | User preference |
| FL-002 | File type filtering | P0 | Images, PDFs, Audio, etc. |
| FL-003 | Folder organization | P0 | Create, rename, delete |
| FL-004 | Drag-drop upload | P0 | Multiple files |
| FL-005 | File preview panel | P0 | Quick view without opening |
| FL-006 | Storage usage display | P0 | Show quota and usage |
| FL-007 | Search files | P0 | By name, type, date |
| FL-008 | File thumbnails | P0 | Auto-generated previews |
| FL-009 | Star/favorite files | P1 | Quick access |
| FL-010 | Recent files section | P1 | Last 20 accessed |
| FL-011 | Bulk operations | P1 | Select multiple, delete/move |
| FL-012 | File tagging | P1 | Custom tags |
| FL-013 | Link files to notes | P1 | Reference tracking |
| FL-014 | PDF annotation | P1 | Highlight, comment |
| FL-015 | Image editor | P2 | Crop, resize, annotate |
| FL-016 | Audio/video player | P2 | Inline playback |
| FL-017 | OCR for images | P2 | Extract text |
| FL-018 | Version history | P3 | Previous versions |
| FL-019 | File sharing | P2 | Share links |
| FL-020 | Duplicate detection | P3 | Find similar files |

### 9.5 Supported File Types

| Category | Extensions | Preview | Actions |
|----------|-----------|---------|---------|
| Images | jpg, png, gif, svg, webp | ✅ Thumbnail + Full | View, Edit, OCR |
| Documents | pdf | ✅ Page preview | View, Annotate, Extract |
| Documents | doc, docx | ✅ Preview | View, Convert |
| Spreadsheets | xls, xlsx, csv | ✅ Table preview | View, Import |
| Audio | mp3, wav, m4a, ogg | ✅ Waveform | Play, Transcribe |
| Video | mp4, webm, mov | ✅ Thumbnail | Play |
| Code | js, ts, py, etc. | ✅ Syntax highlight | View, Edit |
| Archives | zip, rar, 7z | ❌ | Extract |

### 9.6 User Stories

- As a student, I want to see all my PDFs in one place so I can quickly find research papers
- As a user, I want to preview files without downloading them
- As a learner, I want to link files to my notes for easy reference
- As a researcher, I want to annotate PDFs and export highlights to notes
- As a user, I want to see how much storage I've used

---

## 10. AI Command System

### 10.1 Overview

**Priority:** P0 - Critical
**Effort:** Medium (2-3 weeks)
**Impact:** Very High

Extend the existing AI chat/command interface to control study features, generate content, and automate workflows. Users can interact with features using natural language commands.

### 10.2 Command Categories

| Category | Commands | Description |
|----------|----------|-------------|
| Flashcards | `/flashcards`, `/review` | Generate and review cards |
| Quiz | `/quiz`, `/test` | Generate and take quizzes |
| Timer | `/pomodoro`, `/timer` | Control study timer |
| Files | `/files`, `/upload` | File management |
| Graph | `/graph`, `/links` | Knowledge graph |
| Study | `/study`, `/plan` | Study planning |

### 10.3 Command Reference

```
┌─────────────────────────────────────────────────────────────────┐
│                     AI COMMAND REFERENCE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  FLASHCARD COMMANDS                                             │
│  ─────────────────────────────────────────────────────────────  │
│  /flashcards generate       Generate flashcards from this note │
│  /flashcards generate 10    Generate exactly 10 flashcards     │
│  /flashcards review         Start reviewing due cards          │
│  /flashcards stats          Show flashcard statistics          │
│  /flashcards due            Show cards due today               │
│                                                                 │
│  QUIZ COMMANDS                                                  │
│  ─────────────────────────────────────────────────────────────  │
│  /quiz generate             Generate quiz from this note       │
│  /quiz generate 20 hard     Generate 20 hard questions         │
│  /quiz start                Start the last generated quiz      │
│  /quiz fullscreen           Open quiz in fullscreen mode       │
│  /quiz results              Show recent quiz results           │
│                                                                 │
│  POMODORO COMMANDS                                              │
│  ─────────────────────────────────────────────────────────────  │
│  /pomodoro start            Start a focus session              │
│  /pomodoro start 45         Start 45-minute session            │
│  /pomodoro pause            Pause current timer                │
│  /pomodoro stop             Stop and reset timer               │
│  /pomodoro status           Show timer status                  │
│  /pomodoro stats            Show today's pomodoro stats        │
│                                                                 │
│  FILE COMMANDS                                                  │
│  ─────────────────────────────────────────────────────────────  │
│  /files                     Open file library                  │
│  /files recent              Show recent files                  │
│  /files search <query>      Search for files                   │
│  /files upload              Open upload dialog                 │
│                                                                 │
│  GRAPH COMMANDS                                                 │
│  ─────────────────────────────────────────────────────────────  │
│  /graph                     Open knowledge graph               │
│  /graph local               Show local graph for this note     │
│  /links                     Show backlinks for this note       │
│  /links suggest             AI suggest related notes           │
│                                                                 │
│  STUDY COMMANDS                                                 │
│  ─────────────────────────────────────────────────────────────  │
│  /study plan                Generate study plan                │
│  /study summary             Summarize today's study session    │
│  /study goals               Show/set study goals               │
│                                                                 │
│  NATURAL LANGUAGE (Examples)                                    │
│  ─────────────────────────────────────────────────────────────  │
│  "Create flashcards from this note"                            │
│  "Quiz me on this topic"                                        │
│  "Start a 30 minute focus session"                              │
│  "Show my study stats for this week"                           │
│  "Find notes related to photosynthesis"                        │
│  "Open my recent PDFs"                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 10.4 Requirements

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| AI-001 | Slash command parsing | P0 | `/command` syntax |
| AI-002 | Natural language understanding | P0 | Intent detection |
| AI-003 | Flashcard generation command | P0 | From current note |
| AI-004 | Quiz generation command | P0 | From current note |
| AI-005 | Pomodoro control commands | P0 | Start/stop/pause |
| AI-006 | File library commands | P1 | Open, search |
| AI-007 | Knowledge graph commands | P1 | Open, local view |
| AI-008 | Study planning commands | P1 | Generate plans |
| AI-009 | Command autocomplete | P0 | Show suggestions |
| AI-010 | Command history | P1 | Recent commands |
| AI-011 | Contextual commands | P1 | Based on current note |
| AI-012 | Batch commands | P2 | Chain multiple actions |
| AI-013 | Custom command aliases | P3 | User-defined shortcuts |

### 10.5 Technical Implementation

```typescript
// src/lib/ai/commands.ts

interface AICommand {
  name: string
  aliases: string[]
  description: string
  category: CommandCategory
  parameters?: CommandParameter[]
  execute: (context: CommandContext, args: string[]) => Promise<CommandResult>
}

type CommandCategory =
  | 'flashcards'
  | 'quiz'
  | 'pomodoro'
  | 'files'
  | 'graph'
  | 'study'

interface CommandContext {
  currentPageId?: string
  currentPageContent?: string
  selectedText?: string
  userId: string
}

// Command registry
const commands: AICommand[] = [
  {
    name: 'flashcards',
    aliases: ['fc', 'cards'],
    description: 'Flashcard operations',
    category: 'flashcards',
    parameters: [
      { name: 'action', type: 'string', options: ['generate', 'review', 'stats', 'due'] },
      { name: 'count', type: 'number', optional: true }
    ],
    execute: async (context, args) => {
      const [action, count] = args
      switch (action) {
        case 'generate':
          return generateFlashcards(context.currentPageContent, parseInt(count) || 10)
        case 'review':
          return openFlashcardReview()
        case 'stats':
          return getFlashcardStats(context.userId)
        case 'due':
          return getDueCards(context.userId)
      }
    }
  },
  {
    name: 'pomodoro',
    aliases: ['pomo', 'timer'],
    description: 'Pomodoro timer control',
    category: 'pomodoro',
    execute: async (context, args) => {
      const [action, duration] = args
      switch (action) {
        case 'start':
          return pomodoroContext.start(parseInt(duration) * 60 || undefined)
        case 'pause':
          return pomodoroContext.pause()
        case 'stop':
          return pomodoroContext.stop()
        case 'status':
          return getPomodoroStatus()
      }
    }
  },
  // ... more commands
]

// Natural language intent detection
async function detectIntent(input: string): Promise<DetectedIntent> {
  // Use AI to parse natural language into commands
  const response = await ai.generate({
    prompt: `Parse this user request into a command:
    Input: "${input}"
    Available commands: flashcards, quiz, pomodoro, files, graph, study
    Return JSON: { command, action, parameters }`,
    model: 'fast'
  })
  return JSON.parse(response)
}
```

### 10.6 AI Chat Integration

```
┌─────────────────────────────────────────────────────────────────┐
│  AI Assistant                                            [✕]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 👤 Create flashcards from this note about mitosis       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 🤖 I'll generate flashcards from your note on mitosis.  │   │
│  │                                                         │   │
│  │ ✅ Generated 8 flashcards:                              │   │
│  │                                                         │   │
│  │ 1. What are the 4 phases of mitosis?                   │   │
│  │ 2. What happens during prophase?                        │   │
│  │ 3. Define "chromosome"                                  │   │
│  │ ... and 5 more                                          │   │
│  │                                                         │   │
│  │ ┌────────────────┐ ┌────────────────┐                  │   │
│  │ │ Review Now     │ │ Edit Cards     │                  │   │
│  │ └────────────────┘ └────────────────┘                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 👤 Start a 30 minute focus session                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 🤖 Starting a 30-minute Pomodoro session! 🍅            │   │
│  │                                                         │   │
│  │ Timer is now running. I'll notify you when it's done.  │   │
│  │                                                         │   │
│  │ ┌────────────────┐                                     │   │
│  │ │ View Timer     │                                     │   │
│  │ └────────────────┘                                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Type a message or command...                      [Send]│   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Quick: /flashcards  /quiz  /pomodoro  /files  /graph          │
└─────────────────────────────────────────────────────────────────┘
```

### 10.7 User Stories

- As a student, I want to type "quiz me" and get a quiz without navigating menus
- As a user, I want to start a Pomodoro timer with a voice-like command
- As a learner, I want the AI to understand "create cards from this" naturally
- As a power user, I want slash commands for quick access to features

---

## 11. Excalidraw Integration

> **Note:** See Section 5.2 for basic requirements. This section covers technical implementation details.

### 11.1 Why Excalidraw?

| Aspect | Current (Custom Canvas) | Excalidraw |
|--------|------------------------|------------|
| Drawing Tools | 9 basic shapes | 20+ tools + libraries |
| Hand-drawn Style | ❌ | ✅ Signature aesthetic |
| Collaboration | Manual sync | Built-in real-time |
| Export | ❌ | PNG, SVG, clipboard |
| Libraries | ❌ | Reusable shape collections |
| Maintenance | High (custom code) | Low (community maintained) |
| Mobile Support | Basic | Full touch support |
| Accessibility | Limited | Good |

### 6.2 Technical Implementation

#### 6.2.1 Package Installation
```bash
npm install @excalidraw/excalidraw
```

#### 6.2.2 TipTap Node Extension

```typescript
// src/components/tiptap-node/excalidraw-node/excalidraw-node-extension.ts
import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { ExcalidrawNodeView } from './excalidraw-node-view'

export const ExcalidrawNode = Node.create({
  name: 'excalidraw',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      elements: { default: '[]' },
      appState: { default: '{}' },
      files: { default: '{}' },
      width: { default: 800 },
      height: { default: 500 },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="excalidraw"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, {
      'data-type': 'excalidraw'
    })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ExcalidrawNodeView)
  },
})
```

#### 6.2.3 Node View Component

```tsx
// src/components/tiptap-node/excalidraw-node/excalidraw-node-view.tsx
import { NodeViewWrapper } from '@tiptap/react'
import { Excalidraw, exportToBlob } from '@excalidraw/excalidraw'
import { useCallback, useState, useEffect } from 'react'

export function ExcalidrawNodeView({ node, updateAttributes }) {
  const [excalidrawAPI, setExcalidrawAPI] = useState(null)

  const initialData = {
    elements: JSON.parse(node.attrs.elements || '[]'),
    appState: JSON.parse(node.attrs.appState || '{}'),
    files: JSON.parse(node.attrs.files || '{}'),
  }

  const handleChange = useCallback((elements, appState, files) => {
    updateAttributes({
      elements: JSON.stringify(elements),
      appState: JSON.stringify({
        viewBackgroundColor: appState.viewBackgroundColor,
        currentItemFontFamily: appState.currentItemFontFamily,
      }),
      files: JSON.stringify(files),
    })
  }, [updateAttributes])

  return (
    <NodeViewWrapper className="excalidraw-wrapper">
      <div
        style={{
          width: node.attrs.width,
          height: node.attrs.height,
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          overflow: 'hidden',
        }}
      >
        <Excalidraw
          excalidrawAPI={(api) => setExcalidrawAPI(api)}
          initialData={initialData}
          onChange={handleChange}
          UIOptions={{
            canvasActions: {
              saveAsImage: true,
              export: { saveFileToDisk: true },
            },
          }}
        />
      </div>
    </NodeViewWrapper>
  )
}
```

#### 6.2.4 Real-time Collaboration

```typescript
// Extend existing WebSocket server for Excalidraw sync
// server/socket-handlers/excalidraw.ts

import { Server } from 'socket.io'

export function setupExcalidrawHandlers(io: Server) {
  io.on('connection', (socket) => {
    socket.on('excalidraw:join', ({ pageId, nodeId }) => {
      socket.join(`excalidraw:${pageId}:${nodeId}`)
    })

    socket.on('excalidraw:update', ({ pageId, nodeId, elements, appState }) => {
      socket.to(`excalidraw:${pageId}:${nodeId}`).emit('excalidraw:sync', {
        elements,
        appState,
        userId: socket.data.userId,
      })
    })

    socket.on('excalidraw:pointer', ({ pageId, nodeId, pointer }) => {
      socket.to(`excalidraw:${pageId}:${nodeId}`).emit('excalidraw:pointer', {
        pointer,
        userId: socket.data.userId,
        userName: socket.data.userName,
      })
    })
  })
}
```

#### 6.2.5 Slash Command Integration

```typescript
// Add to SlashCommandMenu.tsx
{
  title: 'Excalidraw',
  description: 'Insert an interactive whiteboard',
  icon: <PencilEdit01Icon />,
  command: ({ editor, range }) => {
    editor.chain().focus().deleteRange(range).insertContent({
      type: 'excalidraw',
      attrs: { width: 800, height: 500 },
    }).run()
  },
  category: 'Advanced',
}
```

### 6.3 Migration Plan

#### Phase 1: Add Excalidraw (Week 1)
- [ ] Install @excalidraw/excalidraw package
- [ ] Create ExcalidrawNode extension
- [ ] Add slash command `/excalidraw`
- [ ] Test basic functionality

#### Phase 2: Feature Parity (Week 2)
- [ ] Add resize handles
- [ ] Implement save/load
- [ ] Add export buttons (PNG, SVG)
- [ ] Dark mode support

#### Phase 3: Collaboration (Week 3)
- [ ] Add WebSocket handlers
- [ ] Implement pointer sync
- [ ] Add user cursors
- [ ] Test multi-user editing

#### Phase 4: Migration (Week 4)
- [ ] Deprecate old WhiteboardNode
- [ ] Migration script for existing data
- [ ] Update documentation
- [ ] Remove old whiteboard code

### 6.4 Data Migration

```typescript
// scripts/migrate-whiteboard-to-excalidraw.ts
// Convert old whiteboard shapes to Excalidraw elements

function migrateShape(oldShape: OldShape): ExcalidrawElement {
  switch (oldShape.type) {
    case 'rectangle':
      return {
        type: 'rectangle',
        x: oldShape.x,
        y: oldShape.y,
        width: oldShape.width,
        height: oldShape.height,
        strokeColor: oldShape.strokeColor,
        backgroundColor: oldShape.fillColor,
        // ... other Excalidraw properties
      }
    case 'circle':
      return {
        type: 'ellipse',
        x: oldShape.x - oldShape.radius,
        y: oldShape.y - oldShape.radius,
        width: oldShape.radius * 2,
        height: oldShape.radius * 2,
        // ...
      }
    // Handle other shape types...
  }
}
```

---

## 12. Technical Requirements

### 12.1 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                            │
├─────────────────────────────────────────────────────────────────┤
│  Next.js App (React 19)                                         │
│  ├── TipTap Editor + Excalidraw                                │
│  ├── Flashcard Review UI                                        │
│  ├── PDF Viewer (PDF.js)                                        │
│  ├── Knowledge Graph (D3.js)                                    │
│  └── Analytics Dashboard (Recharts)                             │
├─────────────────────────────────────────────────────────────────┤
│                         API Layer                               │
├─────────────────────────────────────────────────────────────────┤
│  Next.js API Routes                   WebSocket Server          │
│  ├── /api/flashcards/*               ├── Real-time collab      │
│  ├── /api/files/*                    ├── Excalidraw sync        │
│  ├── /api/search/*                   ├── Presence tracking      │
│  ├── /api/study/*                    └── Cursor sync            │
│  └── /api/ai/*                                                  │
├─────────────────────────────────────────────────────────────────┤
│                         Data Layer                              │
├─────────────────────────────────────────────────────────────────┤
│  PostgreSQL (Drizzle ORM)    Redis           Object Storage     │
│  ├── Users, Auth             ├── Sessions    ├── Files          │
│  ├── Notes, Folders          ├── Cache       ├── Thumbnails     │
│  ├── Flashcards              ├── Rate Limit  └── Exports        │
│  ├── Study Sessions          └── Pub/Sub                        │
│  └── pgvector (embeddings)                                      │
├─────────────────────────────────────────────────────────────────┤
│                         AI Layer                                │
├─────────────────────────────────────────────────────────────────┤
│  Groq API          OpenAI API         Ollama (self-hosted)      │
│  ├── Generation    ├── Embeddings     └── Local inference       │
│  └── Flashcards    └── Semantic search                          │
└─────────────────────────────────────────────────────────────────┘
```

### 12.2 New Dependencies

```json
{
  "dependencies": {
    "@excalidraw/excalidraw": "^0.17.0",
    "react-pdf": "^7.0.0",
    "pdfjs-dist": "^3.11.0",
    "d3": "^7.8.0",
    "recharts": "^2.10.0",
    "pgvector": "^0.1.0",
    "@upstash/ratelimit": "^1.0.0"
  }
}
```

### 12.3 Database Extensions

```sql
-- Enable pgvector for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable full-text search
CREATE INDEX idx_pages_fts ON pages
  USING GIN (to_tsvector('english', content));
```

### 12.4 Performance Requirements

| Metric | Target | Current |
|--------|--------|---------|
| Page Load (LCP) | < 2.5s | ~3s |
| Time to Interactive | < 3.5s | ~4s |
| API Response (p95) | < 200ms | ~150ms |
| WebSocket Latency | < 100ms | ~80ms |
| Search Results | < 500ms | N/A |
| File Upload (10MB) | < 5s | N/A |

### 12.5 Security Requirements

| Requirement | Implementation |
|-------------|----------------|
| File Upload Validation | MIME type check, size limits, virus scan |
| Rate Limiting | Per-user, per-endpoint limits |
| Input Sanitization | DOMPurify for HTML, parameterized queries |
| Access Control | Row-level security, ownership checks |
| Encryption | TLS 1.3, encrypted storage for sensitive data |

---

## 13. User Stories

### 13.1 Flashcard Stories

```
FC-US-001: AI Flashcard Generation
As a student
I want to generate flashcards from my lecture notes with one click
So that I can start reviewing immediately without manual card creation

Acceptance Criteria:
- Button visible in note editor toolbar
- AI generates 5-15 cards based on content length
- Cards appear in a new deck linked to the note
- User can edit/delete generated cards
- Generation takes < 10 seconds

FC-US-002: Spaced Repetition Review
As a learner
I want to review flashcards using spaced repetition
So that I can remember information long-term with minimal effort

Acceptance Criteria:
- Daily notification of cards due
- Review interface shows one card at a time
- Rating buttons (Again, Hard, Good, Easy)
- Next review date calculated using FSRS algorithm
- Session summary at end
```

### 13.2 Whiteboard Stories

```
WB-US-001: Excalidraw Drawing
As a visual learner
I want to draw diagrams and sketches in my notes
So that I can visualize concepts and relationships

Acceptance Criteria:
- Insert Excalidraw with /excalidraw command
- All Excalidraw tools available
- Drawings persist when saving note
- Resize canvas as needed
- Export to PNG/SVG

WB-US-002: Collaborative Whiteboard
As a study group member
I want to draw together with my peers in real-time
So that we can brainstorm and explain concepts visually

Acceptance Criteria:
- Multiple users can draw simultaneously
- User cursors visible with names
- Changes sync within 100ms
- Conflict-free editing
```

### 13.3 File Management Stories

```
FM-US-001: Upload Files
As a researcher
I want to upload PDFs and images to my notes
So that I can keep all my materials in one place

Acceptance Criteria:
- Drag-drop upload in editor
- Progress indicator
- Preview in editor
- File library view
- Storage quota shown

FM-US-002: PDF Annotation
As a student
I want to highlight and annotate PDFs
So that I can mark important sections for review

Acceptance Criteria:
- Highlight text in PDF
- Add margin notes
- Multiple highlight colors
- Export highlights to note
- Annotations persist
```

---

## 14. Success Metrics

### 14.1 Key Performance Indicators (KPIs)

| Metric | Current | Target (6mo) | Target (12mo) |
|--------|---------|--------------|---------------|
| Monthly Active Users | - | 10,000 | 50,000 |
| Daily Active Users | - | 2,000 | 15,000 |
| Paid Conversion Rate | - | 3% | 5% |
| User Retention (30-day) | - | 40% | 60% |
| NPS Score | - | 30 | 50 |

### 14.2 Feature-Specific Metrics

| Feature | Metric | Target |
|---------|--------|--------|
| Flashcards | Cards created/user/month | 50+ |
| Flashcards | Daily review completion | 70% |
| Whiteboard | Drawings created/user/month | 10+ |
| Search | Searches/user/day | 5+ |
| Study Sessions | Minutes studied/user/week | 120+ |
| AI Generation | Requests/user/month | 20+ |

### 14.3 Technical Metrics

| Metric | Target |
|--------|--------|
| Uptime | 99.9% |
| Error Rate | < 0.1% |
| API Latency (p95) | < 200ms |
| Page Load Time | < 3s |
| Lighthouse Score | > 90 |

---

## 15. Release Plan

### 15.1 Release Timeline

```
Q1 2026 (Current)
├── v2.0.0 - Core UI Overhaul
│   ├── Study Toolbar (Left Sidebar)
│   │   ├── Flashcard, Quiz, Graph buttons
│   │   ├── Collapsible with badges
│   │   └── Keyboard shortcuts
│   ├── Floating Pomodoro Timer
│   │   ├── Draggable, persistent across pages
│   │   ├── Sound notifications
│   │   └── Session tracking
│   └── Excalidraw Integration
│       ├── Replace custom whiteboard
│       ├── Real-time collaboration
│       └── Export to PNG/SVG
├── v2.1.0 - Tagging System
│   ├── Tag CRUD with colors
│   ├── Tag filtering
│   └── Auto-suggestions
└── v2.2.0 - Enhanced File Library
    ├── Grid/List views
    ├── File preview panel
    ├── Storage quota display
    ├── Folder organization
    └── Drag-drop uploads

Q2 2026
├── v2.3.0 - Flashcard System
│   ├── Deck management
│   ├── AI generation from notes
│   ├── Spaced repetition (FSRS)
│   └── Toolbar integration
├── v2.4.0 - Quiz Modal System
│   ├── Modal & Fullscreen modes
│   ├── AI quiz generation
│   ├── Multiple question types
│   ├── Instant feedback mode
│   └── Results & retry
├── v2.5.0 - AI Command System
│   ├── Slash commands (/flashcards, /quiz, /pomodoro)
│   ├── Natural language understanding
│   └── Quick action buttons
└── v2.6.0 - Full-text Search
    ├── PostgreSQL FTS
    ├── Filters by type/date/tag
    └── Search highlighting

Q3 2026
├── v2.7.0 - PDF Annotation
│   ├── PDF viewer (PDF.js)
│   ├── Highlight, underline, notes
│   └── Export highlights to notes
├── v2.8.0 - Knowledge Graph
│   ├── [[Wiki-style links]]
│   ├── Backlinks panel
│   └── Interactive graph (D3.js)
└── v2.9.0 - Study Analytics Dashboard
    ├── Study time heatmap
    ├── Flashcard retention curves
    ├── Quiz performance charts
    └── Progress reports

Q4 2026
├── v2.10.0 - Advanced Features
│   ├── Semantic search (pgvector)
│   ├── AI study plan generator
│   ├── Focus mode (Do Not Disturb)
│   └── Custom Pomodoro sounds
├── v2.11.0 - Collaboration Enhancements
│   ├── Shared flashcard decks
│   ├── Group quizzes
│   └── Study groups
└── v3.0.0 - Mobile App Beta
    ├── iOS/Android (React Native)
    ├── Offline flashcard review
    ├── Quick capture
    └── Push notifications
```

### 15.2 Release Checklist

For each release:
- [ ] Feature complete
- [ ] Unit tests passing (>80% coverage)
- [ ] Integration tests passing
- [ ] Performance benchmarks met
- [ ] Security review completed
- [ ] Documentation updated
- [ ] Changelog written
- [ ] Beta testing (1 week)
- [ ] Gradual rollout (10% → 50% → 100%)

---

## 16. Risks & Mitigations

### 16.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Excalidraw bundle size | Medium | Medium | Dynamic import, code splitting |
| Real-time sync conflicts | Low | High | Yjs CRDT, conflict resolution |
| Storage costs scaling | Medium | High | Tiered limits, compression |
| AI API rate limits | Medium | Medium | Queue system, fallback providers |
| Search performance at scale | Low | Medium | Indexing strategy, caching |

### 16.2 Product Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Feature bloat | Medium | High | Focus on core use cases |
| Poor mobile experience | High | High | Prioritize responsive design |
| Competition from Notion AI | High | Medium | Differentiate with study features |
| User churn after trial | Medium | High | Onboarding optimization |

### 16.3 Business Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Low conversion rate | Medium | High | A/B test pricing, features |
| High infrastructure costs | Medium | Medium | Optimize queries, caching |
| AI provider cost increases | Low | Medium | Multi-provider support |

---

## 17. Appendix

### 17.1 Glossary

| Term | Definition |
|------|------------|
| CRDT | Conflict-free Replicated Data Type - enables real-time collaboration |
| FSRS | Free Spaced Repetition Scheduler - modern SRS algorithm |
| SM-2 | SuperMemo 2 - classic spaced repetition algorithm |
| Excalidraw | Open-source whiteboard tool with hand-drawn aesthetic |
| TipTap | Headless rich-text editor framework based on ProseMirror |
| Yjs | CRDT implementation for real-time collaboration |
| pgvector | PostgreSQL extension for vector similarity search |

### 17.2 References

- [Excalidraw Documentation](https://docs.excalidraw.com/)
- [FSRS Algorithm Paper](https://github.com/open-spaced-repetition/fsrs4anki)
- [TipTap Documentation](https://tiptap.dev/)
- [Yjs Documentation](https://docs.yjs.dev/)

### 17.3 Related Documents

- [ARCHITECTURE_ENHANCEMENT.md](./ARCHITECTURE_ENHANCEMENT.md) - Technical implementation details
- Database schema definitions
- API documentation

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Jan 2026 | Product Team | Initial PRD |
| 1.1 | Jan 2026 | Product Team | Added Study Toolbar, Floating Pomodoro, Quiz Modal, Enhanced File Library, AI Commands |
| 1.2 | Jan 2026 | Development Team | Updated implementation status - marked completed features |

---

## 18. Implementation Status

### 18.1 Completed Features ✅

| Feature | Status | Notes |
|---------|--------|-------|
| **Study Toolbar** | ✅ COMPLETE | Moved to right side, floating with drag functionality, all icons/shortcuts |
| **Floating Pomodoro Timer** | ✅ COMPLETE | Draggable, persistent, sound notifications, session tracking, minimize |
| **Flashcard System** | ✅ COMPLETE | Context, modal, AI generation, deck management, review interface |
| **Quiz Modal System** | ✅ COMPLETE | Context, modal, AI generation, multiple question types, fullscreen mode |
| **Excalidraw Integration** | ✅ COMPLETE | TipTap node, resize, export PNG, dark mode, slash command |
| **AI Quiz/Flashcard Commands** | ✅ COMPLETE | Natural language detection, JSON parsing, context integration |

### 18.2 In Progress Features 🚧

| Feature | Status | Remaining Work |
|---------|--------|----------------|
| **AI Command System** | 🚧 PARTIAL | Need slash commands (/flashcards, /quiz), more command types |

### 18.3 Not Started Features ❌

| Feature | Priority | Estimated Effort |
|---------|----------|------------------|
| **File Library & Storage** | P0 | 3-4 weeks |
| **Tagging System** | P0 | 1-2 weeks |
| **Knowledge Graph** | P1 | 4-5 weeks |
| **Study Analytics Dashboard** | P1 | 2-3 weeks |
| **Advanced Search** | P1 | 2-3 weeks |
| **PDF Annotation** | P1 | 2-3 weeks |
| **Templates** | P2 | 1 week |
| **Mobile App** | P2 | 3-4 months |

### 18.4 Next Sprint Recommendations

**Sprint 1: File Library Foundation (P0)**
- [ ] Create file storage API endpoints
- [ ] Build File Library panel UI (grid/list view)
- [ ] Implement drag-drop upload
- [ ] Add storage quota tracking
- [ ] File preview panel

**Sprint 2: Tagging System (P0)**
- [ ] Database schema for tags
- [ ] Tag CRUD API endpoints
- [ ] Tag UI in sidebar/page editor
- [ ] Tag filtering functionality
- [ ] Tag autocomplete

**Sprint 3: Knowledge Graph (P1)**
- [ ] Wiki-style [[link]] syntax in editor
- [ ] Backlinks panel component
- [ ] Link autocomplete
- [ ] D3.js graph visualization

**Sprint 4: Analytics Dashboard (P1)**
- [ ] Study session tracking API
- [ ] Dashboard UI with charts
- [ ] Flashcard retention metrics
- [ ] Quiz performance tracking

---

**Approval**

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Product Owner | | | |
| Tech Lead | | | |
| Design Lead | | | |
