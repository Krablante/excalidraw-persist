# Maintaining the Doska interface

Doska's shell owns board navigation and the placement of editor controls. Excalidraw
still owns drawing, tool switching, selection, property application, undo/redo,
image insertion, groups, links, library and export. Keep that boundary: changing
the layout should not introduce a second action manager or synthetic DOM clicks.

`packages/client/editorUiPlugin.ts` adapts the pinned Excalidraw 0.18.0 bundle at
build time. It identifies components by their destructured prop signatures in
the JavaScript AST, not minified function names. It wraps the existing return
elements of MobileMenu, the fixed desktop controls and SelectedShapeActions;
their hooks still execute inside the original components. Tagged native actions
allow the properties wrapper to group basic and advanced settings without
changing their applicability or behavior.

`EditorChrome.tsx` places desktop tools, menu and library in header slots through
React portals, preserving editor context. Mobile controls use native Undo/Redo
and selected-object actions, with local state only for opening/dismissing panels.
`Workbench.scss` supplies the warm paper/coral and dark themes, compact layout and
shared dialog styles. Keep the native `panelColumn` class and pointer-event
context when moving controls: both are necessary for working native UI.

`ExcalidrawEditor.tsx` memoizes the menu element passed as children. This is
important: Excalidraw compares children by identity, while the existing scene
callback updates wrapper state. Recreating children on each scene event causes
a render loop. Do not remove this memoization.

The adapter also gives the native main-menu trigger an accessible name and fixes
the editor's resize ordering: a changed editor breakpoint must trigger a render
even when a preceding window resize already committed identical dimensions.
The existing native ResizeObserver remains responsible; no extra observer,
polling, runtime bundle patching or remount-on-resize is used.

The same adapter replaces the bundled color Picker with `ColorPicker.tsx` and
normalizes the canvas-background palette so it uses that picker too. The picker
commits on release rather than saving on every pointer movement. Vite excludes
Excalidraw from prebundling so the adapter sees both development and production
entry points; the explicit CommonJS dependency list in `vite.config.ts` is needed
for development compatibility.

The adapter intentionally fails when its version or structural matches change.
`handToolFallback.ts` scopes hand-tool fallback changes to native completion,
cancellation, paste and unlock handlers, checking every replacement count in both
bundles. Do not replace every occurrence of `selection`: explicit selection and
the intermediate selection state used during text entry must remain intact.
Text submission switches to hand only after editing ends and must not override a
different tool chosen while the textarea loses focus.

When upgrading Excalidraw, review every match against the new source and verify
both development and production builds. Do not weaken the guards just to get a
successful build.

## Manual verification

Use an isolated database for destructive scenarios. The project does not add
automated test files for this UI. After type checking and building, exercise the
actual browser and inspect screenshots and console/network errors.

- Check desktop, narrow laptop, phone portrait and short landscape layouts;
  resize across the breakpoint without reloading or clicking to refresh it.
- Draw shapes, arrows and freehand strokes; add/edit text and an image. Check
  the current-tool icon, tool locking, hand tool, eraser and line completion.
- Select single/multiple objects. Change color, opacity, font, fill and advanced
  properties; duplicate/delete, group, undo and redo. Close/reopen properties.
  On mobile, selection must not auto-open properties. Create and double-tap-edit
  text, including with a properties panel already open: text entry must hide the
  panels immediately and keep textarea focus. Check a reduced-height viewport too.
- Check color field, hue, HEX, transparency, swatches and desktop eyedropper.
- Open extra tools, library, font picker, export, help, about and canvas background.
  Verify popovers remain readable and inside a narrow or short viewport.
- Rename/create/switch/archive/restore a board. Exercise permanent-delete
  cancellation and confirmation only on disposable data.
- Create viewing/editing links; verify readonly views have no drawing controls,
  editing links work and changes/images survive a reload.
- Check both themes, Escape and dialog focus, fullscreen, and request failures.

The persistence hook is separate from the UI adapter. There is no synthetic
“Saved” indicator: a reliable status would require acknowledged pending-write
tracking rather than a timer or a label that assumes success.
