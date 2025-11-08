# Image Deck

A fullscreen swipeable image viewer with one-handed controls, designed for efficient photo consumption with gesture support, metadata editing, and customizable visual effects.

## Features

### Core Functionality
- **Fullscreen Image Deck**: Swipeable photo deck viewer with scrub-wheel style navigation
- **One-Handed Operation**: Optimized for mobile with intuitive swipe gestures
- **Multiple Transition Effects**: Choose from cards, coverflow, flip, cube, fade, or slide
- **Auto-Play Mode**: Automatically advance through images at your chosen speed
- **Smart Context Detection**: Works on performer, tag, and gallery image views
- **Resume Position**: Remembers where you left off in each gallery (session-based)
- **Progress Tracking**: Visual progress bar and counter display
- **Performance Optimized**: Lazy loading, virtual slides, GPU acceleration for smooth 60fps

### Metadata Modal
- **Quick Edit**: Swipe up (mobile) or press 'I' (desktop) to open metadata editor
- **Rating**: 5-star rating system (converts to Stash's 100-point scale)
- **Title & Details**: Edit image title and description inline
- **Tag Management**: Add/remove tags with autocomplete search
- **Organized Flag**: Mark images as organized
- **File Info**: View filename, performers, studio, date, photographer, view count
- **Quick Link**: Open image page in new tab without leaving the viewer
- **Save Changes**: All edits saved directly to Stash via GraphQL

### Visual Customization
- **Particle Effects**: Configurable floating particles (0-200 particles)
- **Ambient Glows**: Pulsing background ambient lighting
- **Edge Lighting**: Animated edge glow effects
- **Custom Colors**: Adjust particle and ambient hues (0-360° color wheel)
- **Strobe Mode**: Toggle disco strobe effect with configurable speed and intensity
- **Fullscreen Mode**: Native browser fullscreen support

### Gesture Controls (Mobile)
- **Swipe Left/Right**: Navigate through images (scrub-wheel style)
- **Swipe Down**: Close the deck viewer
- **Swipe Up**: Open metadata editor modal
- **Tap Controls**: Previous, play/pause, next, info buttons

### Desktop Controls
- **Arrow Keys**: Navigate left/right through images
- **Spacebar**: Play/pause auto-advance
- **I Key**: Open/close metadata modal
- **Escape**: Close metadata modal (if open) or close viewer
- **Mouse**: Click controls and drag to navigate
- **Info Button**: Click ℹ button to open metadata modal

## Settings

All settings are configurable in Stash Settings → Plugins → Image Deck.

### Playback Settings
- **Auto-play Interval** (100-5000ms, default: 500): Time between automatic transitions
- **Transition Effect** (default: "cards"): Visual transition style
  - `cards` - Stacked cards with depth and rotation
  - `coverflow` - iTunes-style coverflow flow
  - `flip` - 3D flip between images
  - `cube` - 3D cube rotation
  - `fade` - Simple crossfade
  - `slide` - Standard slide transition

### UI Settings
- **Show Progress Bar** (default: ON): Top progress indicator
- **Show Counter** (default: ON): "3 of 150" display

### Performance Settings
- **Preload Adjacent Images** (1-5, default: 2): Images to preload on each side
- **Swipe Resistance** (0-100, default: 50): Swipe gesture resistance
- **3D Effect Depth** (50-500, default: 150): Depth for cards/coverflow effects

### Visual Effects Settings
- **Particle Count** (0-200, default: 80): Number of floating particles (0 to disable)
- **Particle Speed** (0.1-3.0, default: 1.0): Speed multiplier for particles
- **Particle Size** (0.5-3.0, default: 1.5): Size multiplier for particles
- **Particle Color Hue** (0-360, default: 260): Particle color (260=purple, 200=blue, 300=magenta)
- **Ambient Glow Hue** (0-360, default: 260): Background glow color
- **Image Glow Intensity** (0-100, default: 40): Glow/shadow around images
- **Ambient Pulse Speed** (1-20 seconds, default: 6): Pulsing effect speed
- **Edge Glow Intensity** (0-100, default: 50): Intensity of edge lighting

### Strobe Settings
- **Strobe Speed** (50-1000ms, default: 150): Flash speed when strobe is enabled
- **Strobe Intensity** (10-100, default: 60): Strobe brightness

## How It Works

1. **Launch Button**: Look for the 🎴 button in the bottom-right corner on image pages
2. **Context Aware**: Automatically detects current view (performer images, tag images, gallery)
3. **Smart Loading**: Loads first 100 images for performance, first 3 load immediately
4. **Gesture Navigation**: Swipe horizontally to browse, vertically to dismiss or open metadata
5. **Auto-Play**: Hit play button to automatically advance at your set interval
6. **Resume**: Returns to where you left off when reopening the same gallery (session storage)
7. **Metadata Editing**: Press 'I' or swipe up to rate, tag, and edit without leaving the viewer

## Usage Scenarios

### Mobile (One-Handed)
1. Open any image gallery, performer images tab, or tag images
2. Tap the 🎴 button to launch fullscreen
3. Swipe right to advance through photos
4. Swipe up to see details and edit metadata
5. Rate with stars, add tags, edit title
6. Tap play for hands-free viewing
7. Swipe down to exit

### Desktop
1. Click the 🎴 launch button
2. Use arrow keys for quick navigation
3. Press 'I' to view/edit metadata
4. Click info button (ℹ) in controls
5. Spacebar for play/pause
6. ESC to close modal or viewer
7. Click fullscreen button (⛶) for immersive mode

## Metadata Modal Features

When you open the metadata modal (swipe up / press I / click ℹ):

- **File Info**: Filename displayed at top with link to full Stash page
- **Rating Stars**: Click/tap 1-5 stars to rate
- **Title Field**: Edit image title
- **Details**: Edit image description/details
- **Tags**:
  - View current tags
  - Remove tags by clicking ×
  - Search and add new tags with autocomplete
- **Info Display**: View performers, studio, date, photographer, view count
- **Organized Toggle**: Mark/unmark as organized
- **Save Button**: Saves all changes to Stash
- **Link**: "View in Stash →" opens full image page in new tab

## Supported Contexts

The plugin activates on:
- **Performer Pages**: Images tab (`/performers/*/images`)
- **Tag Pages**: Images tab (`/tags/*/images`)
- **Gallery Pages**: All gallery views (`/galleries/*`)
- **General Image Lists**: Any page with image grids

## Performance Optimizations

- **Lazy Loading**: Only loads images as needed
- **Virtual Slides**: For galleries >50 images, uses virtual DOM for performance
- **Thumbnail First**: Loads thumbnails first, upgrades to full resolution on view
- **GPU Acceleration**: Hardware-accelerated transforms and animations
- **Smart Preloading**: Only preloads 2-3 adjacent images
- **Session Storage**: Lightweight position tracking per gallery
- **Image Limit**: Loads max 100 images initially for performance (unlimited for galleries)

## Installation

1. Copy the plugin folder to your Stash plugins directory:
   ```
   /var/lib/stashapp/config/plugins/image-deck/
   ```

2. Files included:
   - `image-deck.yml` - Plugin configuration
   - `image-deck.js` - Core functionality
   - `image-deck.css` - Styles
   - `README.md` - This file

3. Restart Stash or reload plugins

4. Configure settings in Stash Settings → Plugins → Image Deck

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| ← → | Navigate images |
| Space | Play/Pause auto-advance |
| I | Open/close metadata modal |
| ESC | Close metadata modal or deck viewer |
| Click ⛶ | Toggle fullscreen mode |
| Click ⚡ | Toggle strobe effect |
| Click ℹ | Open metadata modal |

## Mobile Gestures

| Gesture | Action |
|---------|--------|
| Swipe → | Next image |
| Swipe ← | Previous image |
| Swipe ↓ | Close deck viewer |
| Swipe ↑ | Open metadata modal |
| Tap Center | Navigate or control playback |

## Visual Effect Customization

### Beefier Machines
- Increase particle count to 150-200
- Higher particle speed (1.5-2.0)
- Larger particles (2.0-3.0)
- More intense glows and effects

### Battery/Performance Saving
- Reduce particle count to 20-40 or disable (0)
- Use "fade" or "slide" transitions (less GPU intensive)
- Lower particle speed (0.5)
- Reduce glow intensities

### Color Themes
- **Purple** (default): Particle Hue 260, Ambient Hue 260
- **Blue**: Particle Hue 200, Ambient Hue 200
- **Magenta**: Particle Hue 300, Ambient Hue 300
- **Green**: Particle Hue 120, Ambient Hue 120
- **Sunset**: Particle Hue 30, Ambient Hue 15
- **Custom**: Set any 0-360° hue value

## Tips & Best Practices

### Fast Browsing
- Set interval to 200-300ms for rapid scanning
- Use "slide" effect for fastest transitions
- Lower particle count for smoother performance

### Leisurely Viewing
- Set interval to 1000-2000ms for comfortable viewing
- Use "cards" or "coverflow" for best visual depth
- Enable strobe mode for enhanced experience

### Metadata Workflow
1. Browse through images normally
2. See one you like? Swipe up or press 'I'
3. Rate it, add tags, edit title
4. Save changes
5. Close modal and continue browsing
6. Never leaves the viewing flow!

### Large Galleries
- Plugin loads first 100 images for performance
- Increase preload setting (3-5) for smoother navigation
- Use virtual slides mode (automatic for >50 images)

## Notes

- Position is saved per session (survives navigation, not browser restart)
- Auto-play stops at the last image (doesn't loop)
- Works with all image formats supported by Stash
- Thumbnails load first, full resolution loads on-demand
- Supports both portrait and landscape orientations
- Metadata changes save immediately to Stash database
- Respects `prefers-reduced-motion` for accessibility

## Troubleshooting

**Images not loading?**
- Check browser console for errors
- Ensure Swiper.js CDN is accessible
- Verify GraphQL permissions

**Performance issues?**
- Reduce particle count
- Use simpler transition effects (fade/slide)
- Lower particle speed and size
- Disable strobe and ambient effects

**Modal not opening?**
- Try pressing 'I' key
- Click the ℹ info button
- Check browser console for errors

## Credits

- Powered by [Swiper.js](https://swiperjs.com/) - Modern mobile touch slider
- Created by Codddarrr for the Stash community

## Version

1.1.0 - Major update with metadata editing, visual effects, and extensive customization
