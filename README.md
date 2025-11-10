# StashApp Plugins

A collection of plugins for [Stash](https://stashapp.cc), the self-hosted adult content management system.

## Available Plugins

### 🎴 Image Deck
A fullscreen image viewer with swipeable navigation, one-handed controls, and stunning visual effects. Perfect for browsing through performer images, galleries, or tag collections.

[View Documentation →](plugins/image-deck/)

**Key Features:**
- **Fullscreen Swipeable Navigation** - One-handed mobile controls with gesture support
- **Metadata Editing** - Rate, tag, and edit images without leaving the viewer
- **6 Transition Effects** - Cards, coverflow, flip, cube, fade, slide
- **Visual Effects** - Customizable particles, ambient glows, strobe mode
- **Auto-Play Mode** - Hands-free viewing with configurable speed
- **Resume Position** - Remembers where you left off (session-based)
- **GPU Accelerated** - Optimized for modern devices with 60fps performance

### 📺 Stream Queue
Create multiple playlist queues for external media players like VLC. Click numbered buttons on scene cards to add videos to different streams, then export as M3U8 playlists.

[View Documentation →](plugins/stream-queue/)

**Key Features:**
- **Multiple Independent Streams** - Configure 1-10 separate playlist queues
- **One-Click Queueing** - Numbered buttons on every scene thumbnail
- **M3U8 Export** - Download industry-standard playlists for VLC
- **Persistent Storage** - Queues survive page reloads
- **Floating Management Panel** - Real-time view of all your queues
- **VLC Compatible** - Works with VLC and any M3U8-compatible player

### 🃏 Living Cards
Automatically fetch and display IAFD (Internet Adult Film Database) profile cards for performers. Shows age, career span, and direct links to full profiles.

[View Documentation →](plugins/living-cards/)

**Key Features:**
- **Automatic IAFD Integration** - Fetches performer data from IAFD
- **Career Timeline** - Shows career start/end years and current age
- **Visual Profile Cards** - Clean, modern card design with performer photos
- **Smart Caching** - Reduces API calls with intelligent caching
- **Direct IAFD Links** - One-click access to full performer profiles

### Floating Scene Player
A powerful plugin that enhances the Stash scene browsing experience with a floating video player, seamless navigation, and smart thumbnail interactions.

[View Documentation →](plugins/floating-scene-player/)

**Key Features:**
- Floating, draggable, and resizable video player
- Smart thumbnail interactions with hover preview
- Quick navigation links to performers, tags, and studios
- Mobile-friendly with touch support
- Auto-orientation based on video aspect ratio

### Performer Tag Sync
High-performance bulk synchronization of performer tags to images, galleries, and scenes using direct database access. Process 200,000+ items in seconds instead of hours.

[View Documentation →](plugins/performer-tag-sync/)

**Key Features:**
- **Extreme Performance**: Process 200k+ images in under 20 seconds via direct SQL
- **Professional Database Handling**: WAL mode + read/write connection separation following Stash core practices
- **Two Modes**: ADD (append tags) or SET (replace tags)
- **Auto-Sync Hooks**: Automatically sync when performers are added/updated
- **Smart Filtering**: Exclude organized items or items with specific tags
- **Separate Control**: Enable/disable for images, galleries, and scenes independently
- **Safe Concurrent Access**: Designed to prevent write locks while Stash is running

### Prowlarr Search
Adds a "Prowl" button to performer pages that searches your Prowlarr indexers for adult content related to that performer.

[View Documentation →](plugins/prowlarr-search/)

**Key Features:**
- One-click search button on performer pages
- Searches performer name and all aliases
- Opens one tab per search term for comprehensive results
- Filters to XXX/Adult category indexers automatically
- Seamless integration with existing performer action buttons

## Installation

### Via Plugin Repository

Add this plugin source to your Stash instance:

**Plugin Index URL:** `https://codddarrr.github.io/stashapp-plugins-repo/main/index.yml`

1. Open Stash and navigate to **Settings → Plugins → Available Plugins**
2. Click **Add Source**
3. Paste the URL above
4. Browse and install plugins directly through the Stash UI

### Manual Installation

1. Clone this repository or download individual plugin folders
2. Copy the plugin folder to your Stash plugins directory:
   ```
   /var/lib/stashapp/config/plugins/<plugin-name>/
   ```
3. Restart Stash or reload plugins from **Settings → Plugins**
4. Enable the plugin

## Contributing

Contributions are welcome! If you have a plugin you'd like to add to this repository:

1. Fork this repository
2. Add your plugin to the `plugins/` directory
3. Include a README.md with documentation
4. Submit a pull request

## Resources

- [Stash Documentation](https://docs.stashapp.cc/)
- [Creating Plugins Guide](https://docs.stashapp.cc/in-app-manual/plugins/#creating-plugins)
- [Stash Community Forum](https://discourse.stashapp.cc/)
- [Share Your Plugins](https://discourse.stashapp.cc/t/-/33)
- [Community Plugin Sources](https://discourse.stashapp.cc/t/-/122)

## License

This repository is licensed under [AGPL-3.0](LICENSE). Individual plugins may have their own licenses.
