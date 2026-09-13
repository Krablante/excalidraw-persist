# Доска / Doska

Doska is a self-hosted canvas for notes, drawings and images. This fork of
[Excalidraw Persist](https://github.com/ozencb/excalidraw-persist) keeps its SQLite
persistence, multiple boards, archive, shared links and per-board libraries, with
a compact Russian-language interface built around Excalidraw 0.18.0.

There is no full-width header bar: the canvas extends behind floating controls.
The board title is its own island at the top left. At the top right, the larger
menu button has a smaller fullscreen button below and a smaller Share button to
its left. On desktop, drawing tools occupy a separate top island and selected-object
properties open in a small inspector on the right. On phones, three separate controls sit at the
bottom: Undo/Redo, the current tool, and a circular **+**. The plus opens the native
tools; the current-tool button opens its properties when available in a content-sized
popover centered above it. Selecting an object on a phone does not open properties
automatically. During text entry, tool panels close so they cannot cover the text editor.
A separate hand button beside **+** selects canvas panning using the native tool switch.
Boards start with the hand tool selected on desktop and mobile, including after reload.
Double-click or double-tap existing text with the hand tool to edit it, including
text inside shapes. Dragging still pans the canvas; double-tapping empty space
does not create text. Finishing the edit returns to the hand tool.
Automatic completion and cancellation also return to the hand tool, including shapes,
arrows, text submission, image insertion and paste. Explicit selection stays available;
locked tools and continuous freehand drawing retain their native behavior.
Pinch zoom keeps the canvas point between your fingers anchored. With the hand
tool, lifting either finger lets the remaining finger continue panning without
starting a new gesture. This scales the canvas, not the browser page.
The last canvas position and zoom are remembered in this browser's localStorage,
separately for each board and shared link, including readonly links. Reopening or
reloading returns to that view. They are local preferences, not shared between
devices; clearing site data clears them. Drawings and images remain on the server.
Quick buttons place text above the hand, eraser above **+**, image above the eraser,
and pen to the hand's left. Image opens the native file picker and inserts the chosen
file directly onto the canvas. On screens narrower than 384 pixels the pen moves into the upper row to
keep the center control clear. Open panels sit above these shortcuts.
Tap an active shortcut again to toggle its properties, or the general tools panel
for tools without properties (such as hand and eraser), just like the center button.
Close the popover to regain canvas space and reopen
it with the current-tool button. Less-used properties remain under **Ещё параметры**.

The board-name button opens board navigation, creation, renaming and archive.
The top-right menu contains export, library, theme, canvas background, navigation,
help and license information. The adjacent Share button creates separate viewing
and editing links. Light and dark themes use the same layout.

## Run your own instance

Build this fork locally; the upstream container image does not include Doska's UI.
Docker Compose serves the app and API together through port 4002 and keeps the
database in a named volume.

```sh
git clone https://github.com/Krablante/excalidraw-persist.git
cd excalidraw-persist
docker compose up -d --build
```

Open `http://localhost:4002`. For remote use, put the service behind an HTTPS
reverse proxy and your own access controls. Editing links grant modification
access to anyone who can reach the instance and has the link. The main board list
is not a user-account system. This app persists changes to the server; it does not
provide live collaborative cursors or simultaneous-edit conflict resolution.

The container uses `DB_PATH=/app/data/database.sqlite`. Back up that database with
SQLite's online backup facility, or stop the service before copying it. Keep the
volume when recreating the container; `docker compose down -v` deletes its data.

## Fullscreen and colors

The header's expand icon uses the native Fullscreen API. The button is hidden on
browsers that do not support HTML fullscreen, including some iPhone browsers.
The header and dialogs remain available in fullscreen. The layout follows the
dynamic viewport and display safe areas; browser controls such as F11 remain native.

Click the active stroke, fill or canvas color to open the compact picker. Drag the
saturation/brightness field or hue slider; releasing applies one undoable change.
Arrow keys adjust the field, with Shift for larger steps. HEX accepts three or six
digits, optionally prefixed with `#`; Enter or blur applies it, and Escape discards
unfinished input. The bottom row offers transparency and drawing/common colors.
The native canvas eyedropper is available on desktop.

## Development

Use Node.js 22 or newer and the pnpm version pinned in `package.json`. Configure the
server environment from `packages/server/.env.example` before starting both packages.

```sh
pnpm install --frozen-lockfile
cp packages/server/.env.example packages/server/.env
pnpm dev
pnpm build
```

The UI uses native Excalidraw actions, moved through React portals rather than
duplicated drawing logic. A version-guarded build adapter performs the integration
for development and production. See [UI maintenance](docs/ui.md) before changing
the editor version or layout.

## License

MIT. The original Excalidraw Persist license is preserved in [LICENSE](LICENSE).
Excalidraw and its bundled assets retain their upstream licenses.
