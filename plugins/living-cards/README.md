# Living Cards

Brings your Stash cards to life with smooth, eye-catching transitions between random images on tags, performers, and galleries pages.

## Features

- **Smooth GSAP Animations**: Professional-quality transitions with multiple styles (fade, slide, flip, zoom, rotate)
- **Smart Visibility Detection**: Only animates cards that are currently visible on screen for optimal performance
- **Natural Randomness**: Uses normal distribution for timing variations that feel organic
- **Page-Specific Control**: Enable/disable independently for tags, performers, and galleries
- **Tab-Aware**: Automatically pauses animations when browser tab is inactive
- **Fully Configurable**: Adjust timing, randomness, and transition styles to your preference

## Settings

### Page Toggles
All toggles are **enabled by default** - turn OFF for pages you don't want animated.

- **Enable for Tags**: Animate card images on the tags page (default: ON)
- **Enable for Performers**: Animate card images on the performers page (default: ON)
- **Enable for Galleries**: Animate card images on the galleries page (default: ON)

### Source Toggles
Control where images come from. If both are enabled, randomly picks between them for each transition.

- **Source from Scenes**: Fetch scene screenshots (default: ON)
- **Source from Images**: Fetch standalone images (default: ON)

Note: Galleries always use images from that gallery regardless of these settings.

### Timing
- **Base Interval** (1-60 seconds, default: 5): Average time before transitioning to next image
- **Randomness Factor** (0-100, default: 75): Controls timing variation
  - 0 = No variation, all cards change at exactly the base interval
  - 75 = High variation (±3.75 seconds for 5 second interval, most transitions 2.5-7.5s)
  - 100 = Maximum variation (±5 seconds for 5 second interval)

### Transitions
- **Transition Style** (default: "random"): Animation effect for image changes

  Available styles (enter exactly as shown):
  - `fade` - Classic crossfade
  - `slide` - Slide left to right
  - `flip` - 3D flip effect
  - `zoom` - Scale in/out
  - `rotate` - Spin transition
  - `random` - Randomly picks a different style for each transition

- **Transition Duration** (100-3000ms, default: 800): How long the animation takes

## How It Works

1. **Visibility Tracking**: Uses IntersectionObserver to monitor which cards are visible
2. **Smart Timing**: Each visible card gets a randomized timer based on your settings
3. **Source Selection**: Randomly chooses between scenes and images (if both enabled)
4. **Image Fetching**: Queries Stash GraphQL for random images related to the card's entity
5. **Transition Selection**: If style is "random", picks a random animation effect
6. **Smooth Transition**: GSAP performs the animation when swapping images
7. **Repeat**: After transitioning, a new randomized timer starts

## Randomness Calculation

The plugin uses normal distribution (Box-Muller transform) for natural-feeling randomness:

```
actualInterval = baseInterval ± (randomnessFactor/100 × baseInterval × normalRandom)
```

For example, with baseInterval=5 and randomnessFactor=75:
- Most cards will change between 2.5-7.5 seconds
- Some will be outside this range (more natural clustering)

## Performance

- **Memory Efficient**: Timers are killed when cards scroll out of view
- **CPU Friendly**: Pauses all animations when tab is inactive
- **Bandwidth Conscious**: Only fetches images for visible cards

## Installation

1. Copy plugin to your Stash plugins directory
2. Restart Stash or reload plugins
3. Configure settings in Stash Settings → Plugins → Living Cards
4. Visit tags/performers/galleries pages to see it in action

## Notes

- Requires Stash to have content (scenes, images, galleries) for the transitions to work
- **For tags**:
  - With scenes: Fetches random scene screenshots with that tag
  - With images: Fetches random images with that tag
- **For performers**:
  - With scenes: Fetches random scene screenshots featuring that performer
  - With images: Fetches random performer images
- **For galleries**: Always cycles through images from that gallery
- If both scene and image sources are enabled, randomly alternates between them
- Works with Stash's React SPA navigation

## Version

1.0.0 - Initial release
