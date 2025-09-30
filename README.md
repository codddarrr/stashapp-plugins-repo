# StashApp Plugins

A collection of plugins for [Stash](https://stashapp.cc), the self-hosted adult content management system.

## Available Plugins

### Floating Scene Player
A powerful plugin that enhances the Stash scene browsing experience with a floating video player, seamless navigation, and smart thumbnail interactions.

[View Documentation →](plugins/floating-scene-player/)

**Key Features:**
- Floating, draggable, and resizable video player
- Smart thumbnail interactions with hover preview
- Quick navigation links to performers, tags, and studios
- Mobile-friendly with touch support
- Auto-orientation based on video aspect ratio

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
