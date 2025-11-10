# 📺 Stream Queue - Multi-Playlist Manager for External Players

Create multiple playlist queues for external media players like VLC. Click numbered buttons on scene cards to add scenes to different streams, then export as M3U8 playlists.

Perfect for organizing viewing sessions, creating themed playlists, or queueing up content for different contexts.

## ✨ Features

### Core Functionality
- **Multiple Independent Streams** - Configure 1-10 separate playlist queues
- **Numbered Queue Buttons** - Each scene card shows numbered buttons (1, 2, 3, etc.) to add to different streams
- **Persistent Storage** - Queues survive page reloads (saved in browser localStorage)
- **M3U8 Export** - Download industry-standard M3U8 playlist files
- **VLC Compatible** - Works with VLC and any M3U8-compatible player

### Queue Management
- **Floating Management Panel** - Real-time view of all your queues
- **Visual Queue Lists** - See exactly what's in each stream
- **Remove Individual Items** - Click X to remove scenes from queue
- **Clear Entire Queues** - One-click to clear a full stream
- **Queue Size Limits** - Optional max items per queue
- **Duplicate Prevention** - Can't add same scene twice to a queue

### User Experience
- **One-Click Add** - Numbered buttons on every scene thumbnail
- **Success Notifications** - Visual feedback for all actions
- **Minimizable Panel** - Collapse queue panel when not needed
- **Auto-download Option** - Optionally auto-download M3U8 on scene add
- **Session Persistence** - Queues persist across navigation

## 📦 Installation

1. Copy plugin files to your Stash plugins directory:
   ```
   /var/lib/stashapp/config/plugins/stream-queue/
   ```

2. Files included:
   - `stream-queue.yml` - Plugin configuration
   - `stream-queue.js` - Core functionality
   - `stream-queue.css` - Styles
   - `README.md` - Documentation

3. Restart Stash or reload plugins

4. Configure settings in **Stash Settings → Plugins → Stream Queue**

## ⚙️ Configuration

### Number of Streams (default: 3)
How many separate playlist queues to create (1-10). Each stream gets its own numbered button on scene cards.

**Examples:**
- **3 streams**: Perfect for "Watch Now", "Watch Later", "Favorites"
- **5 streams**: Organize by mood, performer, studio, or category
- **1 stream**: Simple single queue

### Button Size (default: 32)
Size of the stream queue buttons in pixels. Larger buttons are easier to click on mobile.

### Show Queue Panel (default: true)
Show/hide the floating panel with current queue status. You can still use the buttons even if hidden.

### Auto-download Playlist (default: false)
Automatically download M3U8 file when adding scenes. Great for quickly opening VLC without clicking download button.

### Button Color Hue (default: 260)
Base color hue for stream buttons (0-360 degrees on color wheel).
- 260 = Purple (default)
- 200 = Blue
- 300 = Magenta
- 120 = Green
- 30 = Orange

### Max Queue Size (default: 0)
Maximum number of scenes per queue. Set to 0 for unlimited.

### Streaming Path Pattern (default: `/scene/{id}/stream`)
URL pattern for streaming. Use `{id}` as placeholder for scene ID. Only change this if your Stash uses a custom streaming path.

## 🎯 Usage Guide

### Adding Scenes to Queues

1. **Browse scenes** on any Stash page (scenes, performers, tags, studios)
2. **Look for numbered buttons** in top-right corner of scene thumbnails
3. **Click a number** (1, 2, 3, etc.) to add scene to that stream
4. **See confirmation** - You'll get a success notification

### Managing Queues

The floating queue panel shows all your streams:

**Per-Stream Actions:**
- **Download button** (⬇️) - Download M3U8 playlist for that stream
- **Clear button** (🗑️) - Clear all scenes from that stream
- **Remove button** (✕) - Remove individual scenes

**Panel Controls:**
- **Minimize** (−) - Collapse panel to just the header
- **Expand** (+) - Show full queue lists

### Opening in VLC

#### Method 1: Download M3U8 File
1. Click download button for a stream
2. File downloads as `stream-queue-1.m3u8` (or 2, 3, etc.)
3. Open the file in VLC (double-click or File → Open)
4. VLC will play all scenes in order

#### Method 2: Direct URL (Advanced)
If you save the M3U8 file to a web-accessible location:
1. In VLC: Media → Open Network Stream
2. Paste URL to your M3U8 file
3. VLC will stream directly from Stash

## 🔧 Use Cases

### Scenario 1: Triple Queue System
**Configuration:** 3 streams

- **Stream 1**: "Watch Now" - Scenes you want to watch immediately
- **Stream 2**: "Watch Later" - Scenes to check out eventually
- **Stream 3**: "Favorites" - Best of the best for rewatching

### Scenario 2: Mood-Based Organization
**Configuration:** 5 streams

- **Stream 1**: Energetic content
- **Stream 2**: Relaxing content
- **Stream 3**: Specific performer focus
- **Stream 4**: New discoveries
- **Stream 5**: Classics/rewatches

### Scenario 3: Category Separation
**Configuration:** 4 streams

- **Stream 1**: Main library
- **Stream 2**: Amateur content
- **Stream 3**: Professional content
- **Stream 4**: Specific studio

### Scenario 4: Simple Single Queue
**Configuration:** 1 stream

- Just a straightforward "Watch Queue" - add scenes as you browse, watch in order

## 🎨 Visual Design

- **GPU Accelerated** - Smooth animations on modern devices
- **Purple Gradient Theme** - Matches Image Deck plugin aesthetic
- **Blur Effects** - Modern glassmorphism design
- **Responsive** - Works on desktop and mobile
- **Dark Theme** - Designed for Stash's dark interface

## 🔐 Authentication

When VLC opens M3U8 playlists, it accesses your Stash server directly (not through your browser). This means VLC needs its own way to authenticate. There are three approaches depending on your setup:

### Option 1: Authelia Bypass (Recommended for Authelia Users)

If you use Authelia or another reverse proxy for authentication, configure it to bypass authentication for Stash's streaming endpoints. This allows VLC to access streams without credentials.

**Authelia Configuration Example:**

Add to your `configuration.yml`:

```yaml
access_control:
  rules:
    # Bypass auth for Stash streaming endpoints
    - domain: your-stash-domain.com
      resources:
        - '^/scene/.*/stream.*$'
      policy: bypass

    # Keep other Stash URLs protected
    - domain: your-stash-domain.com
      policy: two_factor
```

**Advantages:**
- No credentials needed in M3U8 files
- Works with any media player
- Most secure approach for external access

**When to use:** You have Authelia/proxy auth protecting Stash, and Stash itself doesn't have authentication enabled.

### Option 2: Stream Base URL (Recommended for Local Network)

Use your Stash server's internal IP address or localhost to bypass proxy authentication entirely. VLC accesses Stash directly on your local network.

**Configuration:**
1. Go to **Stash Settings → Plugins → Stream Queue**
2. Set **Stream Base URL** to your internal address:
   - `http://192.168.1.100:9999` (internal IP)
   - `http://localhost:9999` (if VLC is on same machine)
   - `http://10.0.0.50:9999` (other internal subnet)

**How it works:**
- Browser uses normal URL (e.g., `https://your-stash-domain.com`)
- M3U8 files use internal IP (e.g., `http://192.168.1.100:9999/scene/123/stream`)
- VLC connects directly to Stash, bypassing Authelia completely

**Advantages:**
- Simple configuration
- No proxy/firewall issues
- Fast local streaming

**Limitations:**
- Only works on same network as Stash
- VLC must be able to reach internal IP

**When to use:** You're running VLC on the same network as Stash and want to bypass all authentication/proxy layers.

### Option 3: Stash API Key (For Stash Native Auth)

If Stash itself has authentication enabled (username/password configured), you can generate an API key and include it in stream URLs.

**Configuration:**
1. Enable authentication in **Stash Settings → Security**
2. Generate API key in **Stash Settings → Security → API Key**
3. Copy the API key
4. Go to **Stash Settings → Plugins → Stream Queue**
5. Paste API key into **Stash API Key** field

**How it works:**
- M3U8 files include API key in URLs: `/scene/123/stream?apikey=your-key-here`
- VLC authenticates using the API key

**Important:** This ONLY works if Stash has its own authentication enabled. If you're using Authelia without Stash auth, this option won't work.

**When to use:** Stash has username/password authentication enabled, and you want external players to authenticate directly.

### Which Option Should I Use?

**Quick Decision Guide:**

| Your Setup | Recommended Option |
|------------|-------------------|
| Authelia + No Stash auth | Option 1 (Authelia Bypass) OR Option 2 (Internal IP) |
| Stash auth enabled | Option 3 (API Key) |
| Local network only | Option 2 (Internal IP) |
| Remote access required | Option 1 (Authelia Bypass) OR Option 3 (API Key) |
| Simple/quick setup | Option 2 (Internal IP) |

**Note:** You can combine options! For example, use internal IP for local VLC and configure Authelia bypass for remote access.

## 📝 M3U8 Format

The generated playlist files use standard M3U8 format:

```m3u8
#EXTM3U
#PLAYLIST:Stream Queue 1

#EXTINF:-1,Scene Title Here
https://your-stash-server.com/scene/123/stream

#EXTINF:-1,Another Scene Title
https://your-stash-server.com/scene/456/stream

#EXTINF:-1,Third Scene
https://your-stash-server.com/scene/789/stream
```

This format is compatible with:
- VLC Media Player
- mpv
- IINA (macOS)
- Kodi/Plex
- Most IPTV players
- Any HTTP Live Streaming (HLS) compatible player

## 🐛 Troubleshooting

### Buttons not appearing on scene cards
- Hard refresh your browser (Ctrl+Shift+R / Cmd+Shift+R)
- Check that plugin is enabled in Stash settings
- Check browser console for errors

### VLC won't play the playlist

**Authentication Issues:**
- **Using Authelia?** Configure bypass rules (see Authentication → Option 1) OR use internal IP (Option 2)
- **Stash auth enabled?** Add your API key in plugin settings (see Authentication → Option 3)
- **No auth at all?** This shouldn't be a problem - check network connectivity below

**Network Issues:**
- Ensure VLC can reach your Stash server (ping the URL from command line)
- Try playing a single scene URL in VLC first: Media → Open Network Stream → paste `/scene/123/stream` URL
- If using **internal IP**: Make sure VLC is on same network as Stash
- If using **external domain**: Check firewall/port forwarding settings

**Certificate Issues:**
- If using HTTPS with self-signed certificates, VLC may reject them
- Solution: Use HTTP internal IP address instead (Option 2)
- Or: Install your certificate as trusted on the machine running VLC

**Testing Connectivity:**
1. Open a scene in Stash browser
2. Right-click video → Copy video URL
3. In VLC: Media → Open Network Stream
4. Paste URL and try playing
5. If this works but M3U8 doesn't, it's an authentication issue

### Queue panel not showing
- Check "Show Queue Panel" setting is enabled
- Panel may be minimized - look for small header in bottom-right
- Clear browser cache and reload

### Queues cleared after browser restart
- This is normal - queues are stored in localStorage per-browser
- Use different browsers for different queue sets
- Export M3U8 files to save queues permanently

### Max queue size not working
- Ensure "Max Queue Size" is set to a number > 0
- Setting it to 0 disables the limit (unlimited queue)

## 💡 Tips & Best Practices

1. **Use Multiple Browsers** - Different browsers = different queue sets (localStorage is per-browser)

2. **Save Important Playlists** - Download M3U8 files for playlists you want to keep long-term

3. **Organize by Context** - Use streams for different viewing contexts (solo, partner, specific moods)

4. **Mobile Friendly** - Buttons work great on touchscreens for quick queue building on phone/tablet

5. **VLC Tips**:
   - Use VLC's shuffle feature for random playback
   - Save VLC playlist as .xspf for extended features
   - VLC can save position in playlists

6. **Performance** - Each queue can hold hundreds of scenes, but keep reasonable sizes for VLC performance

7. **Backup Queues** - Periodically download your M3U8 files as backups

## 🔄 Version History

### 1.0.0
- Initial release
- Multiple independent stream queues
- M3U8 playlist generation
- Floating management panel
- localStorage persistence
- VLC compatibility

## 📄 License

Created by Codddarrr
Repository: https://github.com/codddarrr/stashapp-plugins-repo

## 🙏 Credits

- Built for StashApp
- Inspired by VLC's playlist functionality
- Uses M3U8 industry standard format
