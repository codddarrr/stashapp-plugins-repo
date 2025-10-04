# Floating Scene Player - Stash Plugin

A powerful plugin that enhances the Stash scene browsing experience with a floating video player, seamless navigation, and smart thumbnail interactions.

## Features

### 🎬 Floating Video Player
- **Launch Button**: Click the ⛶ button in the bottom-right corner to toggle the floating player
- **Persistent Mode**: Optional setting to keep player open across all pages while browsing
- **Draggable**: Click and drag the title bar to reposition the player anywhere on screen (works on mobile!)
- **Resizable**: Drag the resize handle in the bottom-right corner to adjust size (touch-friendly 40×40px handle)
- **Auto-Orientation**: Automatically resizes to vertical (360×720px) or horizontal (640×460px) based on video aspect ratio
- **Theme Matching**: Automatically adapts to your Stash UI theme colors (configurable)

### 🔗 Smart Navigation Links
When a video is playing, navigation links appear in the footer:
- **🎬 Scene** - Link to the full scene page
- **👤 Performers** - Quick access to performer profiles
- **🏷️ Tags** - Jump to tagged content (limited to first 5 tags)
- **🏢 Studio** - Visit the studio page
- **Color-coded hover effects** - Each link type has a unique highlight color

### 🖱️ Intelligent Thumbnail Interactions
- **Click Behavior**:
  - If player is hidden: Normal link behavior (navigates to scene page)
  - If player is visible: Loads the clicked scene in the floating player
- **Hover Preview** (configurable, disabled by default):
  - When enabled, hover over thumbnails for 500ms to preview the video
  - Only works when player is visible to prevent accidental triggers

### 📱 Mobile Support
- **Touch Dragging**: Drag the title bar with your finger to move the player
- **Touch Resizing**: Drag the resize handle in the corner to resize
- **Responsive**: Works seamlessly on both desktop and mobile devices

### 🌐 Compatibility Modes
- **Standard Mode** (default): Works on specific pages with scene content
  - Scene list pages (`/scenes`)
  - Scene detail pages (`/scenes/123`)
  - Specific performer pages (`/performers/123`)
  - Specific tag pages (`/tags/123`)
  - Specific studio pages (`/studios/123`)
  - Movie pages with IDs
- **Persistent Mode** (when enabled): Player available on all pages, stays open during navigation

## Installation

### Via Plugin Repository

This plugin is available in the community plugin repository:

**Plugin Index URL:** `https://codddarrr.github.io/stashapp-plugins-repo/main/index.yml`

Add this URL to your Stash plugin sources in **Settings → Plugins → Available Plugins** to install directly through the Stash UI.

### Manual Installation

1. Copy the plugin folder to your Stash plugins directory:
   ```
   /var/lib/stashapp/config/plugins/floating-scene-player/
   ```

2. Ensure the folder contains:
   - `floating-scene-player.yml` (plugin configuration)
   - `scene-player.js` (plugin code)
   - `README.md` (this file)

3. Restart Stash or reload plugins from **Settings → Plugins**

4. Enable the plugin if it's not already enabled

## Usage

1. **Navigate** to any scenes page in Stash
2. **Click** the ⛶ launch button in the bottom-right corner
3. **Click** on any scene thumbnail to start playing
   - When player is hidden: Links work normally
   - When player is visible: Loads video in floating player
4. **Hover** over thumbnails to preview (only works when player is visible)
5. **Drag** the title bar to reposition the player
6. **Resize** by dragging the corner handle
7. **Click** navigation links to explore performers, tags, and studios
8. **Close** the player with the × button when done

## Configuration

The plugin offers several customization settings accessible in **Settings → Plugins → Floating Scene Player**:

### Use UI Theme Colors
Apply your current Stash UI theme colors to the player (default: **enabled**). When enabled, the player will automatically match your Stash interface theme.

### Enable Hover Autoplay
Auto-play video preview when hovering over thumbnails (default: **disabled**). When enabled, hovering over a scene thumbnail for 500ms will load it in the floating player. Only works when the player is visible.

### Keep Player Open Across Pages
Player stays open when navigating between pages (default: **disabled**). When enabled, the player and its current video persist as you browse different Stash pages, allowing you to watch while performing other tasks like scanning or tagging.

### Custom Button CSS
Apply additional CSS styling to the launch button. The custom CSS is appended to the base button styles.

**Example:**
```css
border-radius: 50%; background-color: #ff0000 !important;
```

### Custom Player CSS
Apply additional CSS styling to the floating player container. The custom CSS is appended to the base player styles.

**Example:**
```css
border: 3px solid #00ff00; box-shadow: 0 0 20px #00ff00;
```

## Troubleshooting

### Plugin Not Loading
- Check browser console (F12) for JavaScript errors
- Verify plugin files are in the correct directory
- Restart Stash and reload plugins from **Settings → Plugins**
- Check that plugin is enabled in the plugins list
- Look for `[Floating Scene Player]` messages in the console

### Launch Button Not Appearing
- Make sure you're on a supported page (see Wide Compatibility section)
- List pages like `/performers`, `/tags`, `/images` are intentionally excluded
- Navigate to a specific page like `/scenes` or `/performers/123`

### Thumbnails Not Responding
- When player is hidden, links work normally (navigate to scene page)
- When player is visible, links load video in floating player
- Wait a few seconds for dynamic content to load

### Video Not Playing
- Check that the scene has a valid video file
- Ensure Stash streaming is configured correctly
- Video starts muted for autoplay compatibility
- Check browser console for network errors

### Navigation Links Not Showing
- Links only appear after a video is loaded and starts playing
- Ensure the scene has metadata (performers, tags, studio)
- Check that GraphQL API is accessible at `/graphql`

### Custom CSS Not Applying
- Make sure you've saved the settings in **Settings → Plugins**
- Reload the plugin or refresh the page after saving
- Check console for `[Floating Scene Player] Settings loaded:` message
- Use `!important` if Bootstrap styles are overriding your custom CSS

## Technical Details

### Architecture
- **Vanilla JavaScript** - No dependencies, pure DOM manipulation
- **IIFE Pattern** - Self-contained, no global namespace pollution
- **Event-driven** - Efficient event handling with proper cleanup
- **SPA-aware** - Monitors navigation changes and reinitializes as needed
- **Async/Await** - Modern async patterns for settings fetching

### APIs Used
- **GraphQL** - Fetches scene metadata and plugin settings
- **HTML5 Video** - Native video element with controls
- **MutationObserver** - Detects dynamically added thumbnails
- **Stream API** - Uses `/scene/{id}/stream` endpoint for video playback
- **Fetch API** - For GraphQL requests

### Performance
- **Debounced hover** - 500ms delay prevents unnecessary video loads
- **Dataset flags** - Prevents re-processing of enhanced thumbnails
- **Conditional events** - Hover preview only active when player is visible
- **Lazy loading** - Player created only on supported pages
- **Auto-orientation** - Detects video aspect ratio via `loadedmetadata` event

### Browser Compatibility
- Modern browsers (Chrome, Firefox, Safari, Edge)
- ES6+ features (arrow functions, template literals, const/let, async/await)
- CSS Flexbox for layout
- HTML5 video with stream support
- Touch events for mobile support

## License

This plugin is provided as-is for use with Stash. Feel free to modify and distribute.

## Support

For issues, questions, or feature requests:
1. Check this README for troubleshooting steps
2. Review browser console for `[Floating Scene Player]` messages
3. Verify settings in **Settings → Plugins → Floating Scene Player**
4. Open an issue on the Stash community forum
