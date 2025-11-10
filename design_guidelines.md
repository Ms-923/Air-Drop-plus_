# Design Guidelines: Privacy-First P2P File Sharing Web App

## Design Approach
**System-Based Approach** inspired by privacy-focused utilities like Firefox Send, Bitwarden, and Signal Web. Clean, functional interface prioritizing clarity, trust, and performance over decorative elements.

**Core Principle**: Minimal, distraction-free design that reinforces privacy and security while clearly communicating connection states and transfer progress.

---

## Typography
- **Primary Font**: Inter or system fonts (-apple-system, BlinkMacSystemFont, "Segoe UI") via Google Fonts CDN
- **Hierarchy**:
  - Hero/Room Code: text-4xl to text-5xl, font-bold
  - Section Headers: text-xl to text-2xl, font-semibold
  - File Names: text-base, font-medium
  - Transfer Stats: text-sm, font-normal
  - Help Text/Status: text-xs to text-sm, font-normal

---

## Layout System
**Spacing Units**: Tailwind units of **2, 4, 6, and 8** (e.g., p-4, m-6, gap-8)
- Container: max-w-4xl mx-auto px-6
- Component spacing: space-y-6 or space-y-8 between major sections
- Card padding: p-6 or p-8
- Button padding: px-6 py-3
- Icon-text gaps: gap-2

**Single-Page Layout**:
- Centered vertical layout with max-w-4xl container
- No hero section - immediate utility focus
- Clear visual zones: Room Management → Connection Status → File Transfer → Transfer List

---

## Component Library

### Room Management
- **Room Creation Card**: Bordered card with prominent "Create Room" button and generated room code display
- **Join Room Input**: Large input field with "Join" button inline
- **Shareable Link**: Read-only input with copy button (using Heroicons clipboard icon)
- Card style: border, rounded-lg, p-6 or p-8

### Connection Status
- **Status Badge**: Inline badge with icon + text showing state
  - States: "Connecting...", "Connected", "Disconnected", "Peer Left"
  - Icons: Heroicons (signal, check-circle, x-circle, user-minus)
- Position: Top of interface, sticky or fixed for visibility

### File Selection
- **Drop Zone**: Large dashed border rectangle with centered text and upload icon
  - "Drag files here or click to browse"
  - Heroicons cloud-arrow-up icon
  - Min height: h-48
  - Hover state: subtle border emphasis (no color mentioned)
- **File Picker Button**: Standard button as alternative

### File Transfer Cards
- **Individual File Card** for each transfer:
  - File icon (Heroicons document or photo for images)
  - File name (truncate with ellipsis)
  - File size (e.g., "2.4 MB")
  - Progress bar (full-width, rounded, h-2)
  - Transfer stats row: "1.2 MB / 2.4 MB • 850 KB/s • 2s left"
  - Action buttons: Pause/Resume, Cancel (small, icon buttons)
- Card layout: border, rounded-lg, p-4, space-y-3

### Download Section
- **Completed Files**: List with download icon button per file
- Clear "Download" button with Heroicons arrow-down-tray icon

### Error Messaging
- **Toast/Alert Style**: border-l-4 with error icon, p-4, rounded
- Position: Top of viewport or inline within relevant section
- Heroicons exclamation-triangle icon

---

## Navigation & Controls
- **Primary Actions**: Large buttons (px-6 py-3)
- **Secondary Actions**: Outlined or ghost button style
- **Icon Buttons**: p-2 or p-3, rounded-md
- **Icons**: Heroicons (outline style) via CDN

---

## Accessibility
- Focus states on all interactive elements (ring-2 ring-offset-2)
- Clear focus order: Room management → File selection → Transfer controls
- ARIA labels for icon-only buttons
- Status announcements for screen readers on connection state changes

---

## Images
**No hero images or decorative imagery**. This is a utility-focused interface.

Optional small graphic: Privacy/security icon or illustration in room creation card (80x80px max, subtle)

---

## Animations
**Minimal**: Progress bar fill animation only (smooth transition). No page transitions or decorative animations that could impact performance.

---

## Key Visual Patterns
- **Card-based organization** for logical grouping
- **Monospace font** for room codes and technical data
- **Status indicators** always visible
- **Progressive disclosure**: Show advanced options (TURN config, encryption) in collapsible sections
- **Empty states**: Clear messaging when no files selected or no peer connected