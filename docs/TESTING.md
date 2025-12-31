---
title: "Manual Testing Guide: Mobile Viewer"
description: "Comprehensive manual testing procedures for mobile viewer UI on real iOS and Android devices, including checklists, test scenarios, and result recording templates."
audience: [qa-engineers, developers, testers]
tags: [testing, mobile, viewer, qa, manual-testing, ios, android]
created: 2025-12-31
updated: 2025-12-31
category: "testing-guide"
status: active
---

# Manual Testing Guide: Mobile Viewer

Complete manual testing procedures for the MeatyCapture mobile viewer redesign on real iOS and Android devices.

**Document Purpose:** Provide step-by-step testing instructions, comprehensive checklists, and standardized result recording templates for manual QA testing on physical mobile devices.

**Testing Scope:** Mobile viewer UI components, touch interactions, gestures, accessibility features, and device-specific behavior (safe areas, navigation bars, screen readers).

---

## Getting Started

### Prerequisites

Before starting manual testing, ensure you have:

1. **iOS Test Device**
   - iPhone 12, 13, 14, or later (minimum iOS 12)
   - Preferred: iPhone 12 Pro or iPhone 14 Pro (notched device)
   - Device configured and connected to development machine
   - Latest app build installed and running

2. **Android Test Device**
   - Pixel 4, 5, 6, or later (minimum Android 8.x)
   - Preferred: Pixel 5 or Pixel 6 (recent Android 11+)
   - Device configured and connected to development machine
   - Latest app build installed and running

3. **Testing Tools & Software**
   - Xcode (for iOS device management)
   - Android Studio (for Android device management)
   - Web browser with DevTools (for emulator testing during development)
   - Screenshot tool or device camera for documenting issues

4. **Test Environment Setup**
   ```bash
   # Start development server
   pnpm dev

   # Or for native app testing:
   # iOS (Tauri/Electron): Build and deploy to physical device
   # Android (Tauri/Electron): Build and deploy to physical device

   # Ensure test data is available
   # Create sample request-log files in ~/.meatycapture/projects/
   ```

### Test Environment Checklist

- [ ] iOS device has sufficient storage (>1GB free)
- [ ] Android device has sufficient storage (>1GB free)
- [ ] Both devices have active internet connection (or app is in offline mode)
- [ ] Both devices are fully charged or connected to power
- [ ] Screen brightness is set to medium level (for consistent screenshots)
- [ ] Date/time is correct on both devices
- [ ] VoiceOver/TalkBack can be enabled (Settings > Accessibility)

---

## iOS Device Testing

### Device Specifications

| Item | Requirement |
|------|-------------|
| Device | iPhone 12+ (notched device) |
| iOS Version | 12.0+ (tested on 14+, 15+, 16+) |
| Screen Sizes | 6.1" (iPhone 12, 13, 14), 6.7" (Pro Max) |
| Orientations | Portrait (primary), Landscape (secondary) |
| Safe Areas | Notch at top (~44px), optionally bottom gesture bar |

### T1: Portrait Mode - Basic UI & Interactions

**Duration:** ~10 minutes | **Device:** iPhone 12+ | **Orientation:** Portrait

#### Scenario: App Launch & Initial Display

1. **Launch the app**
   - [ ] App starts without crashes or errors
   - [ ] Viewer tab opens successfully
   - [ ] Document list loads within 2 seconds
   - [ ] No console errors visible (if dev tools available)

2. **Verify card display**
   - [ ] Cards are visible and properly formatted
   - [ ] First 2-3 cards are visible above fold (without scrolling)
   - [ ] Card width spans full screen minus safe margins (~16px left/right)
   - [ ] No horizontal scrolling occurs
   - [ ] Card height is ≥88px (touch target compliant)

3. **Verify header layout**
   - [ ] Page title "Request Log Viewer" is visible at top
   - [ ] Title does not overlap with notch
   - [ ] Search input is accessible in header
   - [ ] Sort button is visible
   - [ ] Filter badge (count) displays correctly

4. **Verify safe area (notch)**
   - [ ] Header content is below notch area
   - [ ] No content hidden under notch
   - [ ] Status bar text is visible above header
   - [ ] Spacing between notch and header content is adequate (>8px)

#### Scenario: Card Scrolling & Performance

5. **Scroll card list**
   - [ ] Scrolling is smooth (60fps, no jank)
   - [ ] Cards maintain consistent spacing while scrolling
   - [ ] No content jumps or layout shift
   - [ ] Scrolling is responsive to finger movement
   - [ ] Cards remain properly rendered during scroll

6. **Verify scroll performance**
   - [ ] No lag when scrolling quickly
   - [ ] No memory warnings or app slowdown
   - [ ] App responds immediately after scrolling stops
   - [ ] Scrolling stops cleanly (deceleration feels natural)

#### Scenario: Touch Interactions - FAB Button

7. **Tap filter FAB button**
   - [ ] FAB is positioned at bottom-right corner
   - [ ] FAB is 56x56px (large touch target)
   - [ ] FAB has filter icon (visible)
   - [ ] FAB has visual feedback on tap (scale/opacity change)
   - [ ] FAB does not overlap status icons at bottom of screen
   - [ ] Tapping FAB opens filter sheet within 300ms

8. **Verify FAB filter badge**
   - [ ] Badge shows count of active filters (0 initially)
   - [ ] Badge position is top-right of FAB
   - [ ] Badge text is readable (white text on blue)
   - [ ] Badge updates when filters are applied
   - [ ] Badge hides when count returns to 0

#### Scenario: Touch Interactions - Card Tap

9. **Tap a document card**
   - [ ] Card has visual feedback on tap (scale down 0.98)
   - [ ] Tapping opens detail sheet within 300ms
   - [ ] Card focus is retained visually
   - [ ] Sheet opens from bottom with slide-up animation
   - [ ] No duplicate tap registrations (tap debounced)

10. **Verify sheet opening**
    - [ ] Detail sheet slides up smoothly (300ms animation)
    - [ ] Sheet height is 50vh (half-screen)
    - [ ] Sheet contains document metadata (doc_id, title, item count, tags)
    - [ ] Sheet has drag handle at top (visible horizontal bar)
    - [ ] Scrim/backdrop appears behind sheet (semi-transparent)

---

### T2: Portrait Mode - Filter Sheet & Interactions

**Duration:** ~10 minutes | **Device:** iPhone 12+ | **Orientation:** Portrait

#### Scenario: Filter Sheet UI

11. **Open filter sheet (via FAB)**
    - [ ] Sheet slides up from bottom within 300ms
    - [ ] Sheet height is full-width (100vh, minus safe margins)
    - [ ] Drag handle is visible at top center
    - [ ] All 7 filter dropdowns are visible
    - [ ] "Clear All" button is in top-right
    - [ ] "Apply Filters" button is full-width at bottom
    - [ ] Filter badge shows active count (e.g., "Apply Filters (2)")

12. **Verify filter controls layout**
    - [ ] Project dropdown is first
    - [ ] Type dropdown is second
    - [ ] Domain dropdown is third
    - [ ] Priority dropdown is fourth
    - [ ] Status dropdown is fifth
    - [ ] Tags dropdown is sixth
    - [ ] Search input is last (or in header)
    - [ ] All controls have labels
    - [ ] All controls are ≥48px height (touch target compliant)

13. **Verify filter controls accessibility**
    - [ ] All dropdowns are expandable (tap to open)
    - [ ] Dropdown menus display options properly
    - [ ] Options are ≥48px height
    - [ ] Multi-select controls show selected items
    - [ ] No visual overflow or truncation

#### Scenario: Filter Application

14. **Apply a single filter**
    - [ ] Tap "Type" dropdown (or any filter)
    - [ ] Menu expands smoothly
    - [ ] Options are readable (not truncated)
    - [ ] Tap an option (e.g., "bug")
    - [ ] Option is marked as selected (checkmark or highlight)
    - [ ] Dropdown closes after selection (or remains for multi-select)
    - [ ] Filter badge updates to show "1"
    - [ ] "Apply Filters (1)" button reflects count

15. **Apply multiple filters**
    - [ ] Tap "Priority" dropdown
    - [ ] Select "p0"
    - [ ] Filter badge updates to "2"
    - [ ] Tap "Status" dropdown
    - [ ] Select "in-progress"
    - [ ] Filter badge updates to "3"
    - [ ] All selections remain visible in dropdowns

16. **Apply filters and update list**
    - [ ] Tap "Apply Filters" button (full-width, blue)
    - [ ] Sheet closes within 250ms
    - [ ] Sheet slides down smoothly
    - [ ] Document list updates to show filtered results
    - [ ] Card count decreases (fewer matches than before)
    - [ ] FAB badge shows "3" (active filters)
    - [ ] Filtered results are correct

#### Scenario: Clear Filters

17. **Clear all filters**
    - [ ] Reopen filter sheet (tap FAB)
    - [ ] Tap "Clear All" button (top-right)
    - [ ] All filter selections reset immediately
    - [ ] All dropdowns show "Select..." or default state
    - [ ] "Apply Filters" button shows "(0)"
    - [ ] Tap "Apply Filters"
    - [ ] Sheet closes
    - [ ] Card list returns to show all documents
    - [ ] FAB badge shows "0" or hides

#### Scenario: Dismiss Sheet Gesture

18. **Drag sheet down to dismiss (gesture)**
    - [ ] Reopen filter sheet
    - [ ] Place finger on drag handle
    - [ ] Drag downward ~100px smoothly
    - [ ] Sheet follows finger movement with ~70% opacity easing
    - [ ] Visual feedback: sheet translates down
    - [ ] Release finger
    - [ ] If dragged >100px: sheet closes with snap-back animation
    - [ ] If dragged <100px: sheet snaps back to open position
    - [ ] Focus returns to FAB

---

### T3: Portrait Mode - Detail Sheet & Navigation

**Duration:** ~10 minutes | **Device:** iPhone 12+ | **Orientation:** Portrait

#### Scenario: Detail Sheet Display

19. **View document preview in half-sheet**
    - [ ] Tap a card to open detail sheet
    - [ ] Sheet displays at 50vh (half-screen height)
    - [ ] Document data is visible:
      - [ ] doc_id badge (e.g., "REQ-20251230-web-app")
      - [ ] Document title
      - [ ] Item count (e.g., "5 items")
      - [ ] Updated date (e.g., "Updated: Dec 30, 2025")
      - [ ] Tags (first 2-3 visible)
    - [ ] "View Full Document" button is visible and ≥48px height
    - [ ] Drag handle is visible at top
    - [ ] Sheet is scrollable if content exceeds 50vh

20. **Expand detail sheet to full screen**
    - [ ] Tap "View Full Document" button
    - [ ] Sheet expands smoothly to 100vh (300ms animation)
    - [ ] Full document content becomes visible
    - [ ] Scroll to review full content
    - [ ] Back button or close button is visible
    - [ ] Safe area is respected (no content under notch)

#### Scenario: Detail Sheet Dismiss Gesture

21. **Dismiss detail sheet by dragging**
    - [ ] With detail sheet open at 50vh
    - [ ] Place finger on drag handle
    - [ ] Drag downward ~50px
    - [ ] Sheet follows finger with visual feedback
    - [ ] Release finger
    - [ ] If dragged >50px: sheet closes smoothly
    - [ ] Card list is visible again
    - [ ] Focus returns to the tapped card

22. **Dismiss expanded detail sheet**
    - [ ] Expand detail sheet to 100vh
    - [ ] Drag handle is still visible at top
    - [ ] Try dragging down from top
    - [ ] Sheet should resist collapse until >50px drag
    - [ ] Once >50px down: sheet starts to close
    - [ ] Release and sheet snaps back to card list
    - [ ] Focus returns properly

---

### T4: Landscape Mode - Layout & Responsiveness

**Duration:** ~8 minutes | **Device:** iPhone 12+ | **Orientation:** Landscape

#### Scenario: Rotate to Landscape

23. **Rotate device to landscape**
    - [ ] Device orientation changes smoothly
    - [ ] Cards reflow to landscape layout
    - [ ] No layout shift or content jump
    - [ ] Cards are still full-width (minus margins)
    - [ ] Card height may decrease for landscape
    - [ ] Card content remains readable

24. **Verify landscape layout**
    - [ ] Header remains at top with notch cleared
    - [ ] Search input is still accessible
    - [ ] Cards display 1 per row (not multi-column)
    - [ ] FAB is repositioned (bottom-right, clear of corners)
    - [ ] FAB is still 56x56px and accessible
    - [ ] No horizontal scrolling

#### Scenario: Filter Sheet in Landscape

25. **Open filter sheet in landscape**
    - [ ] Tap FAB
    - [ ] Sheet slides up from bottom
    - [ ] Sheet height is reduced (max 60-70vh in landscape)
    - [ ] All filter controls are still visible (may need to scroll within sheet)
    - [ ] Drag handle is visible
    - [ ] All buttons are accessible (not cut off)
    - [ ] Touch targets remain ≥44px

26. **Apply filters in landscape**
    - [ ] Select filters (same as portrait)
    - [ ] Filter count badge updates
    - [ ] Tap "Apply Filters"
    - [ ] Sheet closes
    - [ ] Card list updates
    - [ ] Gesture dismiss works same as portrait

#### Scenario: Detail Sheet in Landscape

27. **Open detail sheet in landscape**
    - [ ] Tap a card
    - [ ] Half-sheet opens at 50vh
    - [ ] Content is readable
    - [ ] "View Full Document" button is accessible
    - [ ] Drag handle is visible
    - [ ] No content is cut off

28. **Rotate back to portrait**
    - [ ] With detail sheet open, rotate back to portrait
    - [ ] Sheet height adjusts smoothly
    - [ ] Content reflows properly
    - [ ] No content is hidden or truncated
    - [ ] All interactions still work

---

### T5: Accessibility Testing - VoiceOver

**Duration:** ~15 minutes | **Device:** iPhone 12+ | **Orientation:** Portrait

**VoiceOver Setup:**
```
Settings > Accessibility > VoiceOver > Toggle ON
```

#### Scenario: Screen Reader Navigation

29. **Enable VoiceOver and navigate**
    - [ ] VoiceOver is enabled
    - [ ] All elements are announced (page title, cards, buttons)
    - [ ] Screen reader announces "Request Log Viewer" title
    - [ ] Each card is announced with doc_id, title, item count
    - [ ] FAB is announced as "Open filters, 0 active filters"
    - [ ] Navigation is logical (top to bottom, left to right)

30. **Navigate cards with rotor**
    - [ ] Swipe up then right with VoiceOver (two-finger swipe)
    - [ ] Rotor menu opens showing navigation options
    - [ ] Can navigate between buttons, links, headings
    - [ ] Can jump to search input directly
    - [ ] Card list items are accessible via rotor

#### Scenario: Sheet Accessibility

31. **Open filter sheet with VoiceOver**
    - [ ] Swipe right to FAB button
    - [ ] VoiceOver announces "Open filters, X active filters"
    - [ ] Double-tap to activate
    - [ ] Sheet opens and VoiceOver announces "Dialog"
    - [ ] "Filter options" or similar label is announced
    - [ ] Drag handle is announced
    - [ ] All filter controls are announced with labels

32. **Navigate filter controls**
    - [ ] Swipe right to move through filter dropdowns
    - [ ] Each control announces its name (e.g., "Type, popup button")
    - [ ] Selected options are announced
    - [ ] Can navigate to "Apply Filters" button
    - [ ] "Apply Filters (2)" count is announced correctly
    - [ ] "Clear All" button is found and announced

#### Scenario: Focus Management

33. **Check focus management after sheet close**
    - [ ] Apply filters and close sheet
    - [ ] VoiceOver focus should return to FAB
    - [ ] FAB is announced again
    - [ ] Can continue navigating from FAB
    - [ ] No focus trap or stuck focus

34. **Card navigation and detail sheet**
    - [ ] Navigate to a card
    - [ ] Card is announced with all metadata
    - [ ] Double-tap to open detail sheet
    - [ ] VoiceOver announces "Dialog" or "Detail View"
    - [ ] Document metadata is announced
    - [ ] "View Full Document" button is found
    - [ ] Swipe left to close or find close button
    - [ ] Focus returns to card after close

#### Scenario: Touch Target Verification

35. **Verify touch target sizes**
    - [ ] Use VoiceOver tap-and-hold to reveal touch target outline
    - [ ] FAB: ≥56x56px
    - [ ] Filter controls in sheet: ≥48px height
    - [ ] Apply/Clear buttons: ≥48px height
    - [ ] Card rows: ≥88px height
    - [ ] All targets are adequate

---

### T6: Pinch-to-Zoom & Text Scaling

**Duration:** ~5 minutes | **Device:** iPhone 12+ | **Orientation:** Portrait

#### Scenario: Pinch to Zoom

36. **Test pinch-to-zoom behavior**
    - [ ] Pinch-zoom on card list (expand gesture)
    - [ ] Content zooms smoothly
    - [ ] Cards scale up proportionally
    - [ ] No layout breaking or content overflow
    - [ ] Text remains readable after zoom
    - [ ] Can zoom back to 100% (pinch inward)

37. **Verify layout integrity at zoom levels**
    - [ ] Zoom to 150%
    - [ ] Cards are still centered
    - [ ] No horizontal scrolling required
    - [ ] Header remains sticky and accessible
    - [ ] FAB is still visible
    - [ ] Zoom to 200%
    - [ ] Layout degrades gracefully
    - [ ] Vertical scrolling still works
    - [ ] No content is unreachable

#### Scenario: Dynamic Type (Text Scaling)

38. **Test with larger text sizes**
    - [ ] Settings > Accessibility > Display & Text Size > Larger Accessibility Sizes
    - [ ] Select 150% or 200%
    - [ ] Reopen app
    - [ ] Text is larger throughout
    - [ ] Layout adjusts (may be narrower)
    - [ ] No text truncation or overlap
    - [ ] All controls remain accessible
    - [ ] Reset to default text size

---

### T7: Offline & Performance

**Duration:** ~10 minutes | **Device:** iPhone 12+ | **Orientation:** Portrait

#### Scenario: Offline Functionality

39. **Test offline mode**
    - [ ] Turn off WiFi/Cellular
    - [ ] App should display cached document list (or error gracefully)
    - [ ] Existing cards may show stale data (if persisted)
    - [ ] Filtering still works on cached data
    - [ ] All UI interactions function
    - [ ] Error message may display if needed

#### Scenario: Performance Under Load

40. **Scroll performance with many cards**
    - [ ] Open app with 50+ documents
    - [ ] Scroll rapidly through list
    - [ ] Scrolling remains smooth (60fps)
    - [ ] No dropped frames or jank
    - [ ] Cards render correctly during fast scroll
    - [ ] Memory usage is reasonable (no crashes)

41. **Filter performance**
    - [ ] Apply filters with many cards
    - [ ] Filtering completes in <100ms
    - [ ] No visible lag or spinner
    - [ ] Results update smoothly
    - [ ] Cards re-render without flicker

---

## Android Device Testing

### Device Specifications

| Item | Requirement |
|------|-------------|
| Device | Pixel 4+ (system navigation bar at bottom) |
| Android Version | 8.x+ (tested on 11+, 12+, 13+) |
| Screen Sizes | 5.7" (Pixel 4), 6.0" (Pixel 5), 6.7" (Pixel 6 Pro) |
| Orientations | Portrait (primary), Landscape (secondary) |
| Safe Areas | Status bar at top, system nav bar at bottom |

### A1: Portrait Mode - Basic UI & Interactions

**Duration:** ~10 minutes | **Device:** Pixel 4+ | **Orientation:** Portrait

#### Scenario: App Launch & Initial Display

1. **Launch the app**
   - [ ] App starts without crashes
   - [ ] Viewer tab is visible and active
   - [ ] Document list loads within 2 seconds
   - [ ] No console errors or warnings
   - [ ] Material Design elements are visible (if applicable)

2. **Verify card display**
   - [ ] Cards are visible and properly formatted
   - [ ] First 2-3 cards visible above fold
   - [ ] Card width spans full screen minus safe margins
   - [ ] No horizontal scrolling
   - [ ] Card height is ≥88px
   - [ ] Cards have appropriate shadow/elevation

3. **Verify header layout**
   - [ ] Header is at top with status bar
   - [ ] "Request Log Viewer" title is visible
   - [ ] Search input is accessible
   - [ ] Sort button is visible
   - [ ] Filter badge displays count

4. **Verify safe area (system nav bar)**
   - [ ] FAB does not overlap system navigation bar at bottom
   - [ ] Navigation buttons (back, home, recent) are above FAB
   - [ ] Adequate padding between FAB and nav bar
   - [ ] No content is hidden under nav bar
   - [ ] Sheet height accounts for nav bar inset

#### Scenario: Card Scrolling & Performance

5. **Scroll card list**
   - [ ] Scrolling is smooth (60fps, no jank)
   - [ ] Cards maintain consistent spacing
   - [ ] No layout shift or content jump
   - [ ] Scrolling is responsive
   - [ ] Fling gesture works (flick up/down to scroll)

6. **Verify scroll momentum**
   - [ ] Fling scroll has natural deceleration
   - [ ] Scroll bounces at end of list (or ends abruptly - platform-dependent)
   - [ ] No lag when stopping scroll
   - [ ] List returns to still state smoothly

#### Scenario: Touch Interactions - FAB Button

7. **Tap filter FAB button**
   - [ ] FAB is at bottom-right corner
   - [ ] FAB is 56x56px (large touch target)
   - [ ] FAB has filter icon (funnel shape)
   - [ ] FAB has visual feedback (ripple effect on tap)
   - [ ] FAB color matches Material Design primary color
   - [ ] FAB does not overlap navigation bar
   - [ ] Tapping opens filter sheet within 300ms

8. **Verify FAB badge**
   - [ ] Badge shows count initially (0)
   - [ ] Badge position is top-right
   - [ ] Badge color contrasts with FAB
   - [ ] Badge updates when filters applied
   - [ ] Badge hides when count = 0

#### Scenario: Touch Interactions - Card Tap

9. **Tap a card**
   - [ ] Card has visual feedback (ripple or scale)
   - [ ] Tapping opens detail sheet smoothly
   - [ ] Sheet opens from bottom within 300ms
   - [ ] No double-tap issues

10. **Verify detail sheet opening**
    - [ ] Sheet slides up from bottom
    - [ ] Sheet height is 50vh initially
    - [ ] Drag handle is visible
    - [ ] Document metadata is displayed
    - [ ] Scrim/backdrop appears
    - [ ] Sheet has elevation/shadow (Material Design)

---

### A2: Portrait Mode - Filter Sheet & Interactions

**Duration:** ~10 minutes | **Device:** Pixel 4+ | **Orientation:** Portrait

#### Scenario: Filter Sheet UI

11. **Open filter sheet**
    - [ ] FAB tap opens sheet within 300ms
    - [ ] Sheet slides up smoothly
    - [ ] Sheet is full-width (minus margins)
    - [ ] Drag handle is visible
    - [ ] All 7 filters visible
    - [ ] "Clear All" button present
    - [ ] "Apply Filters" button visible with count
    - [ ] No content is cut off by nav bar

12. **Verify filter control sizes**
    - [ ] All dropdowns are ≥48px height
    - [ ] All buttons are ≥48px height
    - [ ] Touch targets are easily tappable
    - [ ] No overlapping controls
    - [ ] Labels are readable

#### Scenario: Filter Application

13. **Select filters**
    - [ ] Tap "Type" dropdown
    - [ ] Options expand smoothly
    - [ ] Tap an option (e.g., "bug")
    - [ ] Option is selected (checkmark visible)
    - [ ] Filter badge updates
    - [ ] Tap "Apply Filters"
    - [ ] Sheet closes
    - [ ] Card list updates
    - [ ] FAB badge shows active count

14. **Multiple filter selections**
    - [ ] Reopen sheet
    - [ ] Select from different filter categories
    - [ ] Each selection is retained
    - [ ] All selections are visible
    - [ ] Apply and verify results

#### Scenario: Clear Filters

15. **Reset all filters**
    - [ ] Reopen sheet
    - [ ] Tap "Clear All"
    - [ ] All selections reset
    - [ ] "Apply Filters (0)" displayed
    - [ ] Tap Apply
    - [ ] Full document list is restored
    - [ ] FAB badge shows 0

#### Scenario: Gesture Dismiss

16. **Drag sheet down to dismiss**
    - [ ] Reopen filter sheet
    - [ ] Drag from top (drag handle area) downward
    - [ ] Sheet follows finger movement
    - [ ] Visual feedback while dragging
    - [ ] Release >100px down: sheet closes
    - [ ] Release <100px down: sheet snaps back to open

---

### A3: Portrait Mode - Detail Sheet & Navigation

**Duration:** ~10 minutes | **Device:** Pixel 4+ | **Orientation:** Portrait

#### Scenario: Detail Sheet

17. **Preview document in half-sheet**
    - [ ] Tap a card to open detail sheet
    - [ ] Sheet opens at 50vh
    - [ ] Document data displayed:
      - [ ] doc_id badge
      - [ ] Title
      - [ ] Item count
      - [ ] Updated date
      - [ ] Tags
    - [ ] "View Full Document" button visible
    - [ ] All content is readable

18. **Expand to full view**
    - [ ] Tap "View Full Document"
    - [ ] Sheet expands smoothly to 100vh
    - [ ] Full content is visible
    - [ ] Can scroll to review content
    - [ ] Close button or back button is visible

#### Scenario: Sheet Dismiss

19. **Drag detail sheet to close**
    - [ ] With sheet open at 50vh
    - [ ] Drag down from drag handle
    - [ ] Sheet follows movement
    - [ ] Release >50px down: sheet closes
    - [ ] Card list is visible again
    - [ ] No focus issues

20. **Dismiss expanded sheet**
    - [ ] Expand sheet to 100vh
    - [ ] Drag from top downward
    - [ ] Sheet resists collapse initially
    - [ ] Once >50px down: starts to collapse
    - [ ] Returns to card list
    - [ ] Can tap card again to reopen

---

### A4: Landscape Mode - Layout & Responsiveness

**Duration:** ~8 minutes | **Device:** Pixel 4+ | **Orientation:** Landscape

#### Scenario: Landscape Orientation

21. **Rotate to landscape**
    - [ ] Device rotates smoothly
    - [ ] Layout reflows automatically
    - [ ] Cards remain full-width
    - [ ] No layout shift or jump
    - [ ] Header adjusts for landscape
    - [ ] FAB is repositioned

22. **Verify landscape layout**
    - [ ] Cards are single column
    - [ ] No horizontal scrolling
    - [ ] Navigation bar is at bottom
    - [ ] FAB is clear of navigation buttons
    - [ ] Header content is not cut off

#### Scenario: Landscape Filter Sheet

23. **Open filter sheet in landscape**
    - [ ] FAB tap opens sheet
    - [ ] Sheet height is reduced (60-70vh max)
    - [ ] All controls are visible or scrollable
    - [ ] Buttons are still accessible
    - [ ] Touch targets remain ≥44px

#### Scenario: Landscape Detail Sheet

24. **Open detail sheet in landscape**
    - [ ] Sheet opens at 50vh
    - [ ] Content is readable
    - [ ] No content cut off by nav bar
    - [ ] Expand works same as portrait

#### Scenario: Orientation Change

25. **Rotate back to portrait**
    - [ ] Smooth transition
    - [ ] Layout reflows properly
    - [ ] All content is visible
    - [ ] Sheet heights adjust correctly
    - [ ] No content is lost

---

### A5: Accessibility Testing - TalkBack

**Duration:** ~15 minutes | **Device:** Pixel 4+ | **Orientation:** Portrait

**TalkBack Setup:**
```
Settings > Accessibility > TalkBack > Toggle ON
```

#### Scenario: Screen Reader Navigation

26. **Enable TalkBack**
    - [ ] TalkBack is enabled
    - [ ] All elements are announced
    - [ ] Screen announces "Request Log Viewer"
    - [ ] Cards are announced with metadata
    - [ ] FAB announces "Open filters, X active"

27. **Navigate with TalkBack gestures**
    - [ ] Swipe right to move to next item
    - [ ] Swipe left to move to previous item
    - [ ] Double-tap to activate
    - [ ] Swipe up then down for local context menu (on some devices)
    - [ ] Navigation is logical and complete

#### Scenario: Sheet Accessibility

28. **Open filter sheet with TalkBack**
    - [ ] Navigate to FAB
    - [ ] TalkBack announces button and function
    - [ ] Double-tap to open
    - [ ] Sheet opens and announces "Dialog" or similar
    - [ ] All filter controls are announced
    - [ ] Can navigate through all dropdowns

29. **Apply filters with TalkBack**
    - [ ] Navigate to first filter dropdown
    - [ ] Double-tap to expand
    - [ ] Navigate to option
    - [ ] Double-tap to select
    - [ ] Selection is confirmed
    - [ ] Navigate to "Apply Filters"
    - [ ] Double-tap to apply
    - [ ] Sheet closes and focus returns

#### Scenario: Detail Sheet with TalkBack

30. **Navigate detail sheet**
    - [ ] Navigate to a card
    - [ ] Double-tap to open detail sheet
    - [ ] Sheet announces all content
    - [ ] Can navigate through metadata
    - [ ] "View Full Document" button is found
    - [ ] Can activate to expand

#### Scenario: Focus Management

31. **Check focus after interactions**
    - [ ] After closing sheet, focus returns to appropriate element
    - [ ] No focus trap
    - [ ] Navigation flow is logical
    - [ ] All interactive elements are reachable

---

### A6: Pinch-to-Zoom & Text Scaling

**Duration:** ~5 minutes | **Device:** Pixel 4+ | **Orientation:** Portrait

#### Scenario: Pinch-to-Zoom

32. **Test pinch zoom**
    - [ ] Pinch-zoom on card list (expand)
    - [ ] Content zooms smoothly
    - [ ] No layout breaking
    - [ ] Can zoom back to 100%

33. **Verify layout at zoom**
    - [ ] Zoom to 150%
    - [ ] Cards scale proportionally
    - [ ] No horizontal scrolling forced
    - [ ] Header remains sticky
    - [ ] FAB remains accessible

#### Scenario: Font Size Scaling

34. **Test display size settings**
    - [ ] Settings > Display > Font Size > Large
    - [ ] Reopen app
    - [ ] Text is larger
    - [ ] Layout adjusts gracefully
    - [ ] No truncation or overlap
    - [ ] All controls remain accessible

---

### A7: Offline & Performance

**Duration:** ~10 minutes | **Device:** Pixel 4+ | **Orientation:** Portrait

#### Scenario: Offline Functionality

35. **Test offline behavior**
    - [ ] Disable WiFi/Mobile Data
    - [ ] App displays cached documents (if available)
    - [ ] Filtering works on cached data
    - [ ] All UI interactions function
    - [ ] No crashes or errors

#### Scenario: Performance

36. **Scroll performance with many cards**
    - [ ] Open with 50+ documents
    - [ ] Scroll rapidly
    - [ ] No jank or dropped frames
    - [ ] Smooth 60fps scrolling
    - [ ] No memory issues

37. **Filter performance**
    - [ ] Apply complex filters
    - [ ] Results update in <100ms
    - [ ] No visible lag
    - [ ] Smooth animations

---

### A8: Android-Specific Features

**Duration:** ~5 minutes | **Device:** Pixel 4+ | **Orientation:** Portrait

#### Scenario: Android 8.x Compatibility (if tested)

38. **Test on older Android version**
    - [ ] App runs on Android 8.x (if available)
    - [ ] UI renders correctly
    - [ ] Touch events work properly
    - [ ] Gestures are recognized
    - [ ] No crashes or warnings

#### Scenario: Material Design Integration

39. **Verify Material Design patterns**
    - [ ] FAB has ripple effect on tap
    - [ ] Cards have appropriate elevation
    - [ ] Buttons follow Material Design
    - [ ] Animations follow Material guidelines
    - [ ] Colors match Material Design palette

---

## Cross-Platform Comparison

### iOS vs Android Consistency

**Test:** Run same scenarios on both iOS and Android devices

| Feature | iOS Behavior | Android Behavior | Expected Match |
|---------|------------|-----------------|---|
| FAB position | Bottom-right, 16px from edges | Bottom-right, 16px from edges | Yes |
| Sheet animation duration | 300ms slide-up | 300ms slide-up | Yes |
| Drag threshold | >100px for dismiss | >100px for dismiss | Yes |
| Touch feedback | Scale/opacity change | Ripple effect | Acceptable (platform-native) |
| Filter count badge | Shown on FAB | Shown on FAB | Yes |
| Safe area handling | Notch respected | Nav bar respected | Yes |
| Accessibility | VoiceOver | TalkBack | Same feature parity |

---

## Test Result Recording

### Standard Test Report Template

Use this template to document manual test results.

```markdown
# Manual Testing Report: Mobile Viewer

## Test Session Information

| Item | Value |
|------|-------|
| Test Date | [YYYY-MM-DD] |
| Tester Name | [Your Name] |
| Device | [iPhone 12 Pro / Pixel 5] |
| OS Version | [iOS 16.2 / Android 13] |
| App Version | [Build number] |
| Test Duration | [e.g., 1 hour 30 minutes] |

## Test Environment

- [ ] Device fully charged or plugged in
- [ ] Internet connection active (or app works offline)
- [ ] App launched successfully
- [ ] Test data available (multiple documents)

## Test Scenarios Completed

### Portrait Mode Tests
- [ ] T1: Basic UI & Interactions (10 min)
- [ ] T2: Filter Sheet & Interactions (10 min)
- [ ] T3: Detail Sheet & Navigation (10 min)

### Landscape Mode Tests
- [ ] T4: Layout & Responsiveness (8 min)

### Accessibility Tests
- [ ] T5: VoiceOver / TalkBack (15 min)

### Additional Tests
- [ ] T6: Pinch-to-Zoom & Text Scaling (5 min)
- [ ] T7: Offline & Performance (10 min)

## Test Results Summary

### Overall Status
- [ ] PASS - All tests passed, no issues
- [ ] PASS WITH MINOR ISSUES - Minor issues found, not blocking
- [ ] FAIL - Critical issues found, blocking release

### Results by Category

#### UI & Layout (T1, T4)
- [ ] Pass
- [ ] Fail
- Notes: _____________________________________________

#### Interactions & Gestures (T2, T3)
- [ ] Pass
- [ ] Fail
- Notes: _____________________________________________

#### Accessibility (T5)
- [ ] Pass
- [ ] Fail
- Notes: _____________________________________________

#### Performance (T7)
- [ ] Pass
- [ ] Fail
- Notes: _____________________________________________

## Detailed Test Results

### iOS Device Testing Results (if applicable)

#### T1: Portrait Mode - Basic UI & Interactions
- [ ] App launches without crashes
- [ ] Cards display correctly
- [ ] Header layout is correct
- [ ] Safe area (notch) is respected
- [ ] Scrolling is smooth (60fps)
- [ ] FAB is positioned and sized correctly
- [ ] Card tap opens detail sheet

**Issues Found:** None / [List any issues]

#### T2: Portrait Mode - Filter Sheet & Interactions
- [ ] Filter sheet UI is complete
- [ ] All filter controls are accessible
- [ ] Filters can be applied
- [ ] Filter count badge updates
- [ ] Clear All button works
- [ ] Drag-to-dismiss gesture works

**Issues Found:** None / [List any issues]

#### T3: Portrait Mode - Detail Sheet & Navigation
- [ ] Detail sheet opens at 50vh
- [ ] Document metadata is displayed
- [ ] Expand to full screen works
- [ ] Drag-to-dismiss gesture works
- [ ] Focus management is correct

**Issues Found:** None / [List any issues]

#### T4: Landscape Mode - Layout & Responsiveness
- [ ] Layout reflows correctly
- [ ] No horizontal scrolling
- [ ] FAB is positioned correctly
- [ ] Sheet heights adjust for landscape
- [ ] Rotation back to portrait works smoothly

**Issues Found:** None / [List any issues]

#### T5: Accessibility Testing - VoiceOver
- [ ] VoiceOver navigation is complete
- [ ] All elements are announced
- [ ] Screen reader labels are appropriate
- [ ] Focus management is correct
- [ ] Touch target sizes are adequate (>44px)

**Issues Found:** None / [List any issues]

#### T6: Pinch-to-Zoom & Text Scaling
- [ ] Pinch zoom works smoothly
- [ ] Layout doesn't break at zoom levels
- [ ] Dynamic type scaling works
- [ ] Text remains readable

**Issues Found:** None / [List any issues]

#### T7: Offline & Performance
- [ ] App works offline (cached data)
- [ ] Scroll performance is smooth (60fps)
- [ ] Filter performance is fast (<100ms)
- [ ] No memory issues or crashes

**Issues Found:** None / [List any issues]

### Android Device Testing Results (if applicable)

[Repeat T1-T7 sections for Android device]

## Issues & Bugs Found

### Critical Issues (Blocking Release)

| Issue ID | Description | Steps to Reproduce | Expected Behavior | Actual Behavior | Device | Severity |
|----------|-------------|-------------------|-----------------|-----------------|--------|----------|
| BUG-001 | [Description] | 1. Step<br>2. Step<br>3. Step | Should [expected] | Does [actual] | iOS 12 | Critical |

### High Priority Issues

| Issue ID | Description | Impact | Severity |
|----------|-------------|--------|----------|
| BUG-002 | [Description] | [Impact] | High |

### Low Priority Issues

| Issue ID | Description | Impact | Severity |
|----------|-------------|--------|----------|
| BUG-003 | [Description] | Minor | Low |

## Screenshots & Evidence

### Pass Cases
- [Screenshot of correct layout]
- [Screenshot of FAB and filter sheet]
- [Screenshot of detail sheet]

### Fail Cases
- [Screenshot of issue with description]
- [Screenshot of layout problem]

## Sign-Off

| Role | Name | Status | Date |
|------|------|--------|------|
| QA Tester | [Your Name] | Pass / Fail | [YYYY-MM-DD] |
| QA Lead | [Name] | Approved / Rejected | [YYYY-MM-DD] |

## Notes & Observations

- Device behavior note 1
- Device behavior note 2
- Recommendations for improvements

## Appendix: Device Details

### iOS Device Specifications
- Device: [Model]
- iOS Version: [Version]
- Screen Size: [Size]
- Safe Area: [Notch size]

### Android Device Specifications
- Device: [Model]
- Android Version: [Version]
- Screen Size: [Size]
- DPI: [DPI]
- Navigation Style: [Gestures / Buttons]
```

---

## Known Testing Patterns

### Testing Filter Functionality

**Quick Filter Test (5 minutes):**
```
1. Tap FAB → Filter sheet opens
2. Tap "Type" → Select "bug"
3. Filter count shows "1"
4. Tap "Apply Filters"
5. Sheet closes, cards filter to bugs only
6. FAB badge shows "1"
7. Verify card count decreased
```

**Complex Filter Test (15 minutes):**
```
1. Open filter sheet
2. Select Type = "bug" OR "enhancement"
3. Select Priority = "p0" OR "p1"
4. Select Domain = "web"
5. Apply filters
6. Verify card results match all 3 filter criteria
7. Open sheet again
8. Verify all selections are retained
9. Clear All
10. Verify all documents return
```

### Testing Gesture Recognition

**Drag-to-Dismiss Test:**
```
1. Open filter sheet (or detail sheet)
2. Place finger on drag handle
3. Slowly drag downward 50px
4. Observe: sheet follows finger smoothly
5. Release and observe: sheet snaps back
6. Repeat: drag down 120px
7. Release and observe: sheet closes smoothly
8. Card list is visible
```

### Testing Safe Areas

**iPhone Notch Test:**
```
1. Open app in portrait
2. Verify: header title is below notch
3. Verify: no content is hidden under notch
4. Rotate to landscape
5. Verify: safe area top inset changes
6. Verify: all content remains visible
```

**Android Navigation Bar Test:**
```
1. Open filter sheet
2. Verify: sheet content doesn't overlap nav bar
3. Verify: FAB is above nav bar (16px+ margin)
4. Tap FAB and apply filters
5. Verify: FAB position doesn't change
6. Rotate to landscape
7. Verify: nav bar is at bottom (or side)
8. Verify: FAB is still properly positioned
```

---

## Troubleshooting Common Issues

### Issue: App Crashes on Startup

**Solution:**
1. Force quit the app
2. Restart the device
3. Reinstall the app
4. Check Xcode/Android Studio console for errors

### Issue: Gestures Not Recognized

**Solution:**
1. Ensure touch is responsive (try tapping button)
2. Update app to latest build
3. Test on different device if available
4. Check that gesture is on correct element (drag handle)

### Issue: VoiceOver/TalkBack Not Reading Elements

**Solution:**
1. Ensure accessibility service is enabled
2. Check that elements have `aria-label` attributes
3. Swipe right to navigate to element
4. Use rotor menu to find specific element types

### Issue: Layout Breaks on Zoom

**Solution:**
1. Test text scaling within normal range (100-150%)
2. Verify breakpoint is at 768px
3. Check that responsive styles are applied
4. Ensure no hardcoded pixel widths are blocking reflowing

---

## Post-Testing Checklist

After completing all manual tests:

- [ ] All test scenarios have been executed
- [ ] Test results have been documented in report template
- [ ] Screenshots/videos of any issues have been taken
- [ ] Bug reports have been created for any issues found
- [ ] Results have been reviewed by QA lead
- [ ] Approval/rejection decision has been made
- [ ] Results have been communicated to development team
- [ ] Device has been cleaned up (cache cleared if needed)

---

## Resources & References

- **[TESTING-MOBILE-VIEWER.md](./project_plans/implementation_plans/harden-polish/TESTING-MOBILE-VIEWER.md)** - Comprehensive testing guide (unit, integration, E2E, manual)
- **[Mobile Viewer UX PRD](./project_plans/PRDs/harden-polish/mobile-viewer-ux-v1.md)** - Feature requirements and specifications
- **[Mobile UI Design Spec](./design/mobile-viewer-ui-spec.md)** - UI mockups and design details
- **[Accessibility Guidelines](./guides/accessibility-guidelines.md)** - WCAG 2.1 AA standards

---

**Document Version:** 1.0
**Last Updated:** 2025-12-31
**Status:** Active

For questions or to report testing issues, contact the QA team or project engineering lead.
