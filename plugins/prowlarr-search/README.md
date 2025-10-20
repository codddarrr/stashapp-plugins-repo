# Prowlarr Search Plugin for Stash

This plugin adds a "Prowl" button to performer profile pages that allows you to search your Prowlarr indexers for content related to that performer.

## Features

- Adds a "Prowl" button to performer pages
- Searches Prowlarr indexers for the performer's name
- Optionally searches all performer aliases (opens one tab per alias)
- Filters results to XXX/Adult category indexers only
- Opens search results in new browser tabs

## Configuration

After installing the plugin, go to **Settings > Plugins** and configure:

1. **Prowlarr Server URL**: The base URL of your Prowlarr server (e.g., `http://localhost:9696`)
2. **Search All Aliases**: Enable to search for all performer aliases (default: enabled)
3. **XXX Category Only**: Filter to only XXX/Adult category indexers (default: enabled)

## Usage

1. Navigate to any performer profile page
2. Click the "Prowl" button in the header area
3. New tabs will open with Prowlarr search results for:
   - The performer's name
   - All aliases (if enabled in settings)

## Installation

The plugin files should be placed in:
```
/var/lib/stashapp/config/plugins/prowlarr-search/
├── manifest
├── prowlarr-search.yml
├── prowlarr-search.js
└── README.md
```

Restart Stash or reload plugins for the changes to take effect.

## Notes

- Multiple tabs will open (one per search term)
- There's a 100ms delay between opening tabs to avoid browser popup blocking
- Make sure your Prowlarr server is accessible from your browser
- The XXX category ID used is 6000 (standard Prowlarr adult content category)

## Troubleshooting

If the button doesn't appear:
1. Check that you're on a performer detail page (not the performers list)
2. Open browser console (F12) and look for `[Prowlarr Search]` log messages
3. Verify the plugin is enabled in Stash settings
4. Try refreshing the page

If searches don't work:
1. Verify your Prowlarr URL is correct and accessible from your browser
2. Ensure your Prowlarr server has XXX/Adult indexers configured
3. Check browser console for error messages
