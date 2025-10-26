# Card Eye Candy

A Stash plugin that adds stunning 3D parallax tilt effects to card containers, bringing your media library to life with smooth, interactive animations.

## Features

- **3D Parallax Tilt Effect**: Cards tilt and rotate in 3D space as you move your mouse
- **Auto-Animation**: Cards continuously move and tilt on their own for constant visual interest
- **Glare Effect**: Optional subtle light reflection overlay that follows your cursor
- **Hover Scaling**: Cards smoothly scale up when you hover over them
- **Parameter Randomization**: Vary animation values for organic, natural-looking movement
- **Gyroscope Support**: On mobile devices, cards respond to device orientation
- **Easy Toggle**: On/off switch in the top navigation bar for instant control
- **Highly Customizable**: 11 different settings to fine-tune the effect to your preference
- **Performance Optimized**: Uses vanilla JavaScript with no dependencies, 60+ fps animations
- **Universal Compatibility**: Works on any Stash page with card elements

## Supported Card Types

The plugin automatically applies effects to:
- Performer cards (`.performer-card`)
- Scene cards (`.scene-card`)
- Gallery cards (`.gallery-card`)
- Tag cards (`.tag-card`)
- Wall items (`.wall-item`)
- Gallery wall cards (`.GalleryWallCard`)
- Photo gallery images (`.react-photo-gallery--gallery img`)

## Installation

1. Copy the `card-eye-candy` folder to your Stash plugins directory
2. Restart Stash or reload plugins
3. Navigate to Settings → Plugins → Card Eye Candy to configure

## Usage

1. Look for the **"Eye Candy"** toggle switch in the top navigation bar
2. Click the toggle to turn effects on or off
3. When enabled, hover over any card to see the 3D tilt effect in action
4. Adjust settings in the plugin configuration to customize the experience

## Settings

### Enabled by Default
- **Type**: Boolean (on/off)
- **Default**: Disabled
- **Description**: Start with effects enabled automatically when you open or refresh Stash. When disabled, you'll need to manually toggle the effects on each session.

### Effect Intensity
- **Range**: 0-50
- **Default**: 15
- **Description**: Controls how much cards tilt. Higher values = more dramatic tilting

### Enable Glare Effect
- **Type**: Boolean (on/off)
- **Default**: Enabled
- **Description**: Adds a subtle light reflection that follows your cursor

### Glare Intensity
- **Range**: 0.0-1.0
- **Default**: 0.3
- **Description**: Maximum opacity of the glare overlay. Higher = brighter glare

### Scale on Hover
- **Type**: Boolean (on/off)
- **Default**: Enabled
- **Description**: Cards grow slightly when you hover over them

### Scale Amount
- **Range**: 1.0-1.2
- **Default**: 1.05
- **Description**: How much cards scale on hover (1.05 = 5% larger)

### 3D Perspective
- **Range**: 500-2000
- **Default**: 1000
- **Description**: Perspective depth for 3D effect. Lower values = more extreme perspective

### Animation Speed
- **Range**: 100-1000 milliseconds
- **Default**: 400
- **Description**: How quickly cards transition in/out of tilt state

### Enable Gyroscope
- **Type**: Boolean (on/off)
- **Default**: Enabled
- **Description**: Use device gyroscope for tilt on mobile devices

### Auto-Animate Cards
- **Type**: Boolean (on/off)
- **Default**: Disabled
- **Description**: Cards continuously tilt and move on their own without user interaction for constant visual interest

### Auto-Animation Speed
- **Range**: 2-20 seconds
- **Default**: 8
- **Description**: Duration of each auto-animation cycle. Lower = faster movement

### Randomize Animation Parameters
- **Type**: Boolean (on/off)
- **Default**: Enabled
- **Description**: Vary animation values around configured settings (±25%) for more organic, natural-looking movement. Each card gets slightly different parameters

## Recommended Settings

### Subtle & Elegant
- Effect Intensity: 10
- Glare Effect: Enabled
- Glare Intensity: 0.2
- Scale Amount: 1.03

### Dramatic & Bold
- Effect Intensity: 25
- Glare Effect: Enabled
- Glare Intensity: 0.5
- Scale Amount: 1.1

### Performance Mode (for slower systems)
- Effect Intensity: 10
- Glare Effect: Disabled
- Scale On Hover: Disabled
- Animation Speed: 200
- Auto-Animate: Disabled

### Animated & Organic (showcases new features)
- Effect Intensity: 15
- Auto-Animate: Enabled
- Auto-Animation Speed: 10
- Randomize Parameters: Enabled
- Glare Effect: Enabled
- Scale Amount: 1.05

## Technology

This plugin uses [Vanilla Tilt.js](https://github.com/micku7zu/vanilla-tilt.js), a lightweight 3D parallax tilt effect library that:
- Has zero dependencies
- Uses requestAnimationFrame for smooth 60+ fps animations
- Supports both mouse and touch/gyroscope input
- Is optimized for mobile devices

## Troubleshooting

**Toggle switch not appearing**
- Check browser console for errors
- Ensure the plugin is enabled in Stash settings
- Try refreshing the page

**Effects not applying to cards**
- Make sure the toggle is switched ON (green)
- Check that you're on a page with supported card types
- Try navigating to a different page and back

**Performance issues**
- Reduce Effect Intensity
- Disable Glare Effect
- Disable Scale on Hover
- Increase Animation Speed (lower number = faster but more CPU usage)

## Version History

### 1.0.1 (2025-10-25)
- Added "Enabled by Default" setting - effects can now start enabled automatically on launch/refresh
- Fixed: Toggle state now persists based on user configuration

### 1.0.0 (2025-10-20)
- Initial release
- 3D parallax tilt effects with mouse tracking
- Auto-animation for continuous card movement
- Parameter randomization for organic, varied animations
- Glare overlay effect
- Hover scaling
- Gyroscope support for mobile devices
- Support for all major card types including photo galleries
- 11 customizable settings
- Toggle switch in navigation bar
- Performance optimized with 60+ fps animations

## License

MIT License - Based on Vanilla Tilt.js

## Credits

- Vanilla Tilt.js by [Șandor Sergiu](https://github.com/micku7zu)
- Plugin created for the Stash community
