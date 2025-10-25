# Performer Tag Sync

Efficiently synchronizes performer tags to images, galleries, and scenes in Stash. This plugin applies tags from performers to the content they appear in, either by adding to existing tags or replacing them entirely.

Built for speed - processes hundreds of thousands of items in seconds using direct database access.

**Inspired by**: [tagImagesWithPerfTags](https://github.com/stashapp/CommunityScripts/tree/main/plugins/tagImagesWithPerfTags) from CommunityScripts. This plugin reimplements the same functionality with direct SQL access for dramatically improved performance on large libraries.

## Features

- **High Performance**: Direct SQLite access for extreme speed (process 200k+ images in under 20 seconds)
- **Automatic Indexing**: Creates optimal database indexes on first run for sustained performance
- **Schema Validation**: Checks database compatibility before running (currently supports schema v72)
- **Selective Sync**: Enable/disable syncing for images, galleries, and scenes independently
- **Two Modes**:
  - **ADD Mode** (default): Appends performer tags to existing tags
  - **SET Mode**: Replaces all tags with only the performer tags
- **Auto-Sync Hooks**: Automatically sync tags when performers are added/updated (can be disabled)
- **Smart Filtering**: Exclude organized items or items with specific tags
- **Progress Reporting**: Track progress during bulk operations
- **Configurable Batching**: Handle 5,000-10,000 items per batch efficiently

## ⚠️ IMPORTANT WARNINGS - READ BEFORE USE

### Direct Database Access - Use with Caution
**This plugin bypasses the Stash API and modifies your database directly for performance.** While it includes safety checks, direct database access is inherently more dangerous than using the official API.

**CRITICAL - Before first use:**
1. **BACKUP YOUR DATABASE** - Copy `stash-go.sqlite` to a safe location
2. **Test on a small dataset first** - Use exclusion settings to limit scope
3. **Verify results** - Check a sample of items after running to ensure tags are correct
4. **Keep Stash closed** - Recommended to stop Stash before running bulk operations

**Why this approach?**
- The official API (GraphQL) is too slow for large libraries (30+ minutes for 200k images)
- Direct SQL processes the same data in seconds instead of hours
- This tradeoff sacrifices some safety for dramatic performance gains
- Inspired by [tagImagesWithPerfTags](https://github.com/stashapp/CommunityScripts/tree/main/plugins/tagImagesWithPerfTags) but optimized for speed

### Known Issues
- **UI Cache**: After running, the UI may show stale data. Solution: Hard refresh (Ctrl+Shift+R) or restart Stash
- **Schema Version**: Tested with Stash schema v72. Will show warnings on other versions but proceed anyway
- **Concurrent Access**: Don't run multiple instances simultaneously

### Tag Modes
- **ADD mode** (default): Appends performer tags to existing tags (safe)
- **SET mode**: **DESTRUCTIVE** - Replaces ALL existing tags with only performer tags. Use with extreme caution!

### If Something Goes Wrong
1. Stop the plugin immediately
2. Restore your database backup
3. Report the issue with your Stash version and schema version

## Installation

### Via Plugin Repository

This plugin is available in the community plugin repository:

**Plugin Index URL:** `https://codddarrr.github.io/stashapp-plugins-repo/main/index.yml`

Add this URL to your Stash plugin sources in **Settings → Plugins → Available Plugins** to install directly through the Stash UI.

### Manual Installation

1. Copy the plugin folder to your Stash plugins directory:
   ```
   /var/lib/stashapp/config/plugins/performer-tag-sync/
   ```

2. Ensure the folder contains:
   - `performer-tag-sync.yml` (plugin configuration)
   - `performer-tag-sync.py` (plugin code)
   - `README.md` (this file)

3. Restart Stash or reload plugins from **Settings → Plugins**

4. Enable the plugin if it's not already enabled

**Note**: The plugin automatically detects your Stash database location. If you have a non-standard setup, it will check common paths: `/var/lib/stashapp/config/stash-go.sqlite` and `~/.stash/stash-go.sqlite`

## Configuration

Access settings in **Settings → Plugins → Performer Tag Sync**:

### Enable for Images
Apply performer tags to images (default: **enabled**)

### Enable for Galleries
Apply performer tags to galleries (default: **enabled**)

### Enable for Scenes
Apply performer tags to scenes (default: **enabled**)

### Tag Mode
Choose how performer tags are applied:
- **ADD** (default): Appends performer tags to existing tags
- **SET**: Replaces all tags with only performer tags (destructive)

**Example:**
- Image has tags: `[Blonde, Outdoors]`
- Performer has tags: `[Latina, Curvy]`
- ADD mode result: `[Blonde, Outdoors, Latina, Curvy]`
- SET mode result: `[Latina, Curvy]`

### Batch Size
Number of items to process per batch (default: **5000**)

Recommended range: 5000-10000. Higher values are faster with minimal memory impact.

### Exclude Organized Items
Skip items marked as organized (default: **disabled**)

When enabled, items with the "organized" flag will not be auto-tagged.

### Exclude Items With Tag
Skip items that have a specific tag (default: **empty**)

Enter a tag name to exclude items with that tag from auto-tagging. Useful for marking items you want to manage manually.

## Usage

### Bulk Operations

The plugin provides three separate tasks for bulk syncing:

1. **Settings → Tasks → Sync Tags - All Images**
   - Processes all images with performers
   - Shows progress bar during execution

2. **Settings → Tasks → Sync Tags - All Galleries**
   - Processes all galleries with performers
   - Shows progress bar during execution

3. **Settings → Tasks → Sync Tags - All Scenes**
   - Processes all scenes with performers
   - Shows progress bar during execution

**Note**: These tasks respect the exclusion settings and will only process enabled types.

### Automatic Syncing

When hooks are enabled, tags sync automatically:

1. **On Create**: When you add a new image/gallery/scene with performers
2. **On Update**: When you add or change performers on an existing item

**Important**: Hooks only trigger when the performer list changes, not on other field updates.

## Performance

This plugin achieves extreme performance using direct database access:

- **Direct SQLite Access**: No API overhead, pure SQL queries
- **Automatic Indexing**: Creates optimal indexes on first run
- **Bulk Operations**: Processes thousands of items per transaction
- **Minimal Memory**: Stream processing with negligible memory footprint

**Expected Performance** (approximate, on modern hardware):
- 10,000 images: **5-10 seconds**
- 50,000 images: **20-30 seconds**
- 100,000 images: **40-60 seconds**
- 200,000 images: **1-2 minutes**

**Real-world example**: 200,700 images + 5,760 galleries + 42,664 scenes processed in 16 seconds.

### Schema Compatibility

The plugin includes automatic schema version checking:
- **Tested with**: Stash database schema version 72
- **Behavior**: Shows warning on untested versions but continues execution
- **Safety**: Version locking can be enabled by setting `SCHEMA_WARNING_ONLY = False` in the code

The plugin will refuse to run on unsupported schemas if strict mode is enabled, preventing potential data corruption.

## Troubleshooting

### Plugin Not Running
- Check **Settings → Logs** for errors
- Verify Python is available on your system
- Ensure plugin files have correct permissions
- Check that `stashapi` Python package is installed

### No Tags Being Applied
- Verify the target type is enabled in settings (Images/Galleries/Scenes)
- Check that performers actually have tags assigned
- Ensure items aren't excluded by "organized" or tag exclusion rules
- Check logs for exclusion messages

### Hooks Not Triggering
- Hooks only fire when performer list changes
- Verify the hook is enabled in **Settings → Plugins**
- Check that the specific type is enabled (enableImages, etc.)
- Look for hook execution messages in logs

### Slow Performance
- Increase batch size (try 5000-10000)
- Check server resources (CPU/memory)
- Verify database indexes were created (check logs on first run)
- Consider running during off-peak hours

### UI Shows Wrong Item Count After Running
- This is a UI cache issue, not data loss
- Try hard refresh: Ctrl+Shift+R (or Cmd+Shift+R on Mac)
- If that doesn't work, restart Stash
- Your data is safe in the database, just needs UI refresh

### Wrong Tags Applied
- Verify tag mode setting (ADD vs SET)
- Check performer tags are correct
- Review exclusion settings
- Check logs for which tags were applied

## Technical Details

### Architecture
- **Direct SQLite access** for maximum performance
- **Batch processing** with configurable batch sizes (5k-10k items)
- **Automatic indexing** creates optimal database indexes on first run
- **Schema validation** ensures database compatibility
- **Transaction-based updates** for data integrity

### Database Tables Modified
- `images_tags` - Image to tag associations
- `galleries_tags` - Gallery to tag associations
- `scenes_tags` - Scene to tag associations

### Performance Optimization
1. Creates indexes on first run for fast queries
2. Fetches all performer-tag mappings once (cached in memory)
3. Processes items in large batches (5000+ at a time)
4. Uses SQL transactions for atomic updates
5. Minimizes database round-trips

### Safety Features
- Schema version checking before execution
- Database integrity validation
- Read-only mode available (set `SCHEMA_WARNING_ONLY = False`)
- Automatic index creation (non-destructive)
- Transactional updates (atomic operations)

## License

This plugin is provided as-is for use with Stash.

## Support

For issues, questions, or feature requests:
1. Check this README for troubleshooting steps
2. Review logs in **Settings → Logs**
3. Verify plugin settings are correct
4. Open an issue on the plugin repository
