#!/usr/bin/env python3
"""
Performer Tag Sync
Efficiently syncs performer tags to images, galleries, and scenes using direct SQLite access.
High-performance implementation optimized for large libraries.
"""

import sqlite3
import sys
import json
import os
from pathlib import Path

# Try to import stashapi for config and logging, fallback to basic logging
try:
    import stashapi.log as log
    from stashapi.stashapp import StashInterface
    USE_STASH_LOG = True
except ImportError:
    USE_STASH_LOG = False
    class log:
        @staticmethod
        def info(msg): print(f"INFO: {msg}", file=sys.stderr)
        @staticmethod
        def warning(msg): print(f"WARNING: {msg}", file=sys.stderr)
        @staticmethod
        def error(msg): print(f"ERROR: {msg}", file=sys.stderr)
        @staticmethod
        def debug(msg): print(f"DEBUG: {msg}", file=sys.stderr)
        @staticmethod
        def progress(p): pass

# Schema version compatibility
# This plugin is tested with Stash schema version 72
SUPPORTED_SCHEMA_VERSIONS = [72]
SCHEMA_WARNING_ONLY = True  # Set to False to refuse running on unsupported versions

# Plugin settings with defaults
DEFAULT_SETTINGS = {
    "enableImages": True,
    "enableGalleries": True,
    "enableScenes": True,
    "tagMode": "ADD",
    "batchSize": 5000,  # Much larger batches possible with SQL
    "excludeOrganized": False,
    "excludeTag": ""
}


def get_database_path():
    """Find the Stash database file"""
    # Try to get from stashapi
    if USE_STASH_LOG:
        try:
            stash = StashInterface(json.loads(sys.stdin.read())["server_connection"])
            config = stash.get_configuration()
            if config and "general" in config and "databasePath" in config["general"]:
                return config["general"]["databasePath"]
        except Exception as e:
            log.debug(f"Could not get database path from stashapi: {e}")

    # Try common locations
    common_paths = [
        "/var/lib/stashapp/config/stash-go.sqlite",
        os.path.expanduser("~/.stash/stash-go.sqlite"),
        os.path.join(os.path.dirname(__file__), "../../stash-go.sqlite"),
    ]

    for path in common_paths:
        if os.path.exists(path):
            log.info(f"Found database at: {path}")
            return path

    log.error("Could not find stash-go.sqlite database file")
    log.error("Please specify database path in plugin settings or ensure it's in a standard location")
    sys.exit(1)


def check_schema_version(db_path):
    """Check database schema version for compatibility"""
    conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
    cursor = conn.cursor()

    cursor.execute("SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1")
    version = cursor.fetchone()[0]
    conn.close()

    log.info(f"Database schema version: {version}")

    if version not in SUPPORTED_SCHEMA_VERSIONS:
        msg = f"WARNING: Database schema version {version} is not in tested versions {SUPPORTED_SCHEMA_VERSIONS}"
        if SCHEMA_WARNING_ONLY:
            log.warning(msg)
            log.warning("Proceeding anyway - if you encounter errors, please report the issue")
        else:
            log.error(msg)
            log.error("Refusing to run on unsupported schema version to prevent data corruption")
            sys.exit(1)

    return version


def create_indexes_if_needed(db_path):
    """Create performance indexes if they don't exist"""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    indexes = [
        # Index for filtering organized images/galleries/scenes
        ("idx_images_organized", "CREATE INDEX IF NOT EXISTS idx_images_organized ON images(organized) WHERE organized IS NOT NULL"),
        ("idx_galleries_organized", "CREATE INDEX IF NOT EXISTS idx_galleries_organized ON galleries(organized) WHERE organized IS NOT NULL"),
        ("idx_scenes_organized", "CREATE INDEX IF NOT EXISTS idx_scenes_organized ON scenes(organized) WHERE organized IS NOT NULL"),

        # Index for images_tags lookups (likely already exists)
        ("idx_images_tags_image_id", "CREATE INDEX IF NOT EXISTS idx_images_tags_image_id ON images_tags(image_id)"),
        ("idx_galleries_tags_gallery_id", "CREATE INDEX IF NOT EXISTS idx_galleries_tags_gallery_id ON galleries_tags(gallery_id)"),
        ("idx_scenes_tags_scene_id", "CREATE INDEX IF NOT EXISTS idx_scenes_tags_scene_id ON scenes_tags(scene_id)"),
    ]

    for name, sql in indexes:
        try:
            log.debug(f"Creating index {name}...")
            cursor.execute(sql)
            log.debug(f"Index {name} created or already exists")
        except sqlite3.Error as e:
            log.warning(f"Could not create index {name}: {e}")

    conn.commit()
    conn.close()
    log.info("Performance indexes verified")


def load_settings():
    """Load plugin settings from stdin or use defaults"""
    try:
        json_input = json.loads(sys.stdin.read())
        if "server_connection" in json_input:
            stash = StashInterface(json_input["server_connection"])
            config = stash.get_configuration()
            settings = DEFAULT_SETTINGS.copy()

            if "plugins" in config and "performer-tag-sync" in config["plugins"]:
                user_settings = config["plugins"]["performer-tag-sync"]
                if user_settings:
                    settings.update(user_settings)

            # Ensure tagMode is uppercase
            settings["tagMode"] = settings.get("tagMode", "ADD").upper()
            if settings["tagMode"] not in ["ADD", "SET"]:
                log.warning(f"Invalid tagMode '{settings['tagMode']}', defaulting to ADD")
                settings["tagMode"] = "ADD"

            log.info(f"Settings loaded: {settings}")
            return settings
    except Exception as e:
        log.debug(f"Could not load settings from stash: {e}")

    log.info("Using default settings")
    return DEFAULT_SETTINGS.copy()


def get_exclusion_tag_id(conn, tag_name):
    """Get tag ID by name for exclusion filter"""
    if not tag_name or not tag_name.strip():
        return None

    cursor = conn.cursor()
    cursor.execute("SELECT id FROM tags WHERE name = ? COLLATE NOCASE", (tag_name.strip(),))
    row = cursor.fetchone()

    if row:
        log.info(f"Exclusion tag '{tag_name}' found with ID {row[0]}")
        return row[0]
    else:
        log.warning(f"Exclusion tag '{tag_name}' not found")
        return None


def sync_images(conn, settings, exclusion_tag_id):
    """Sync performer tags to images using direct SQL"""
    log.info("Starting image sync...")

    cursor = conn.cursor()

    # Build WHERE clause for exclusions
    where_clauses = []
    params = []

    if settings["excludeOrganized"]:
        where_clauses.append("i.organized = 0")

    if exclusion_tag_id:
        where_clauses.append(f"i.id NOT IN (SELECT image_id FROM images_tags WHERE tag_id = ?)")
        params.append(exclusion_tag_id)

    where_sql = " AND " + " AND ".join(where_clauses) if where_clauses else ""

    # Get all performer -> tags mappings
    log.info("Fetching performer tag mappings...")
    cursor.execute("""
        SELECT pt.performer_id, pt.tag_id
        FROM performers_tags pt
        ORDER BY pt.performer_id, pt.tag_id
    """)

    performer_tags = {}
    for perf_id, tag_id in cursor:
        if perf_id not in performer_tags:
            performer_tags[perf_id] = set()
        performer_tags[perf_id].add(tag_id)

    log.info(f"Found {len(performer_tags)} performers with tags")

    # Get all images with performers
    log.info("Fetching images with performers...")
    cursor.execute(f"""
        SELECT DISTINCT i.id
        FROM images i
        INNER JOIN performers_images pi ON i.id = pi.image_id
        {where_sql}
    """, params)

    image_ids = [row[0] for row in cursor.fetchall()]
    total_images = len(image_ids)
    log.info(f"Found {total_images} images to process")

    if total_images == 0:
        log.info("No images to process")
        return

    # Process in batches
    batch_size = settings["batchSize"]
    updated = 0

    for batch_start in range(0, total_images, batch_size):
        batch_end = min(batch_start + batch_size, total_images)
        batch_ids = image_ids[batch_start:batch_end]

        log.progress(0.1 + (0.9 * batch_end / total_images))
        log.info(f"Processing images {batch_start+1}-{batch_end}/{total_images}")

        # For each image in batch, get its performers and calculate target tags
        placeholders = ",".join("?" * len(batch_ids))
        cursor.execute(f"""
            SELECT pi.image_id, pi.performer_id
            FROM performers_images pi
            WHERE pi.image_id IN ({placeholders})
            ORDER BY pi.image_id
        """, batch_ids)

        image_performers = {}
        for img_id, perf_id in cursor:
            if img_id not in image_performers:
                image_performers[img_id] = set()
            image_performers[img_id].add(perf_id)

        # Calculate target tags for each image
        if settings["tagMode"] == "SET":
            # SET mode: replace all tags with performer tags
            for img_id in batch_ids:
                perfs = image_performers.get(img_id, set())
                target_tags = set()
                for perf_id in perfs:
                    target_tags.update(performer_tags.get(perf_id, set()))

                if target_tags:
                    # Delete existing tags
                    cursor.execute("DELETE FROM images_tags WHERE image_id = ?", (img_id,))

                    # Insert new tags
                    cursor.executemany(
                        "INSERT INTO images_tags (image_id, tag_id) VALUES (?, ?)",
                        [(img_id, tag_id) for tag_id in target_tags]
                    )
                    updated += 1
        else:
            # ADD mode: append performer tags to existing tags
            for img_id in batch_ids:
                perfs = image_performers.get(img_id, set())
                target_tags = set()
                for perf_id in perfs:
                    target_tags.update(performer_tags.get(perf_id, set()))

                if target_tags:
                    # Get existing tags
                    cursor.execute("SELECT tag_id FROM images_tags WHERE image_id = ?", (img_id,))
                    existing_tags = {row[0] for row in cursor}

                    # Insert only new tags
                    new_tags = target_tags - existing_tags
                    if new_tags:
                        cursor.executemany(
                            "INSERT INTO images_tags (image_id, tag_id) VALUES (?, ?)",
                            [(img_id, tag_id) for tag_id in new_tags]
                        )
                        updated += 1

        conn.commit()
        log.info(f"Updated {updated} images so far")

    log.info(f"Image sync complete - updated {updated} images")


def sync_galleries(conn, settings, exclusion_tag_id):
    """Sync performer tags to galleries using direct SQL"""
    log.info("Starting gallery sync...")

    cursor = conn.cursor()

    # Build WHERE clause
    where_clauses = []
    params = []

    if settings["excludeOrganized"]:
        where_clauses.append("g.organized = 0")

    if exclusion_tag_id:
        where_clauses.append(f"g.id NOT IN (SELECT gallery_id FROM galleries_tags WHERE tag_id = ?)")
        params.append(exclusion_tag_id)

    where_sql = " AND " + " AND ".join(where_clauses) if where_clauses else ""

    # Get performer tags mapping
    cursor.execute("SELECT performer_id, tag_id FROM performers_tags ORDER BY performer_id, tag_id")
    performer_tags = {}
    for perf_id, tag_id in cursor:
        if perf_id not in performer_tags:
            performer_tags[perf_id] = set()
        performer_tags[perf_id].add(tag_id)

    # Get galleries with performers
    cursor.execute(f"""
        SELECT DISTINCT g.id
        FROM galleries g
        INNER JOIN performers_galleries pg ON g.id = pg.gallery_id
        {where_sql}
    """, params)

    gallery_ids = [row[0] for row in cursor.fetchall()]
    total_galleries = len(gallery_ids)
    log.info(f"Found {total_galleries} galleries to process")

    if total_galleries == 0:
        return

    # Process in batches
    batch_size = settings["batchSize"]
    updated = 0

    for batch_start in range(0, total_galleries, batch_size):
        batch_end = min(batch_start + batch_size, total_galleries)
        batch_ids = gallery_ids[batch_start:batch_end]

        log.progress(0.1 + (0.9 * batch_end / total_galleries))
        log.info(f"Processing galleries {batch_start+1}-{batch_end}/{total_galleries}")

        placeholders = ",".join("?" * len(batch_ids))
        cursor.execute(f"""
            SELECT pg.gallery_id, pg.performer_id
            FROM performers_galleries pg
            WHERE pg.gallery_id IN ({placeholders})
            ORDER BY pg.gallery_id
        """, batch_ids)

        gallery_performers = {}
        for gal_id, perf_id in cursor:
            if gal_id not in gallery_performers:
                gallery_performers[gal_id] = set()
            gallery_performers[gal_id].add(perf_id)

        # Update tags
        if settings["tagMode"] == "SET":
            for gal_id in batch_ids:
                perfs = gallery_performers.get(gal_id, set())
                target_tags = set()
                for perf_id in perfs:
                    target_tags.update(performer_tags.get(perf_id, set()))

                if target_tags:
                    cursor.execute("DELETE FROM galleries_tags WHERE gallery_id = ?", (gal_id,))
                    cursor.executemany(
                        "INSERT INTO galleries_tags (gallery_id, tag_id) VALUES (?, ?)",
                        [(gal_id, tag_id) for tag_id in target_tags]
                    )
                    updated += 1
        else:  # ADD mode
            for gal_id in batch_ids:
                perfs = gallery_performers.get(gal_id, set())
                target_tags = set()
                for perf_id in perfs:
                    target_tags.update(performer_tags.get(perf_id, set()))

                if target_tags:
                    cursor.execute("SELECT tag_id FROM galleries_tags WHERE gallery_id = ?", (gal_id,))
                    existing_tags = {row[0] for row in cursor}
                    new_tags = target_tags - existing_tags
                    if new_tags:
                        cursor.executemany(
                            "INSERT INTO galleries_tags (gallery_id, tag_id) VALUES (?, ?)",
                            [(gal_id, tag_id) for tag_id in new_tags]
                        )
                        updated += 1

        conn.commit()
        log.info(f"Updated {updated} galleries so far")

    log.info(f"Gallery sync complete - updated {updated} galleries")


def sync_scenes(conn, settings, exclusion_tag_id):
    """Sync performer tags to scenes using direct SQL"""
    log.info("Starting scene sync...")

    cursor = conn.cursor()

    # Build WHERE clause
    where_clauses = []
    params = []

    if settings["excludeOrganized"]:
        where_clauses.append("s.organized = 0")

    if exclusion_tag_id:
        where_clauses.append(f"s.id NOT IN (SELECT scene_id FROM scenes_tags WHERE tag_id = ?)")
        params.append(exclusion_tag_id)

    where_sql = " AND " + " AND ".join(where_clauses) if where_clauses else ""

    # Get performer tags mapping
    cursor.execute("SELECT performer_id, tag_id FROM performers_tags ORDER BY performer_id, tag_id")
    performer_tags = {}
    for perf_id, tag_id in cursor:
        if perf_id not in performer_tags:
            performer_tags[perf_id] = set()
        performer_tags[perf_id].add(tag_id)

    # Get scenes with performers
    cursor.execute(f"""
        SELECT DISTINCT s.id
        FROM scenes s
        INNER JOIN performers_scenes ps ON s.id = ps.scene_id
        {where_sql}
    """, params)

    scene_ids = [row[0] for row in cursor.fetchall()]
    total_scenes = len(scene_ids)
    log.info(f"Found {total_scenes} scenes to process")

    if total_scenes == 0:
        return

    # Process in batches
    batch_size = settings["batchSize"]
    updated = 0

    for batch_start in range(0, total_scenes, batch_size):
        batch_end = min(batch_start + batch_size, total_scenes)
        batch_ids = scene_ids[batch_start:batch_end]

        log.progress(0.1 + (0.9 * batch_end / total_scenes))
        log.info(f"Processing scenes {batch_start+1}-{batch_end}/{total_scenes}")

        placeholders = ",".join("?" * len(batch_ids))
        cursor.execute(f"""
            SELECT ps.scene_id, ps.performer_id
            FROM performers_scenes ps
            WHERE ps.scene_id IN ({placeholders})
            ORDER BY ps.scene_id
        """, batch_ids)

        scene_performers = {}
        for scene_id, perf_id in cursor:
            if scene_id not in scene_performers:
                scene_performers[scene_id] = set()
            scene_performers[scene_id].add(perf_id)

        # Update tags
        if settings["tagMode"] == "SET":
            for scene_id in batch_ids:
                perfs = scene_performers.get(scene_id, set())
                target_tags = set()
                for perf_id in perfs:
                    target_tags.update(performer_tags.get(perf_id, set()))

                if target_tags:
                    cursor.execute("DELETE FROM scenes_tags WHERE scene_id = ?", (scene_id,))
                    cursor.executemany(
                        "INSERT INTO scenes_tags (scene_id, tag_id) VALUES (?, ?)",
                        [(scene_id, tag_id) for tag_id in target_tags]
                    )
                    updated += 1
        else:  # ADD mode
            for scene_id in batch_ids:
                perfs = scene_performers.get(scene_id, set())
                target_tags = set()
                for perf_id in perfs:
                    target_tags.update(performer_tags.get(perf_id, set()))

                if target_tags:
                    cursor.execute("SELECT tag_id FROM scenes_tags WHERE scene_id = ?", (scene_id,))
                    existing_tags = {row[0] for row in cursor}
                    new_tags = target_tags - existing_tags
                    if new_tags:
                        cursor.executemany(
                            "INSERT INTO scenes_tags (scene_id, tag_id) VALUES (?, ?)",
                            [(scene_id, tag_id) for tag_id in new_tags]
                        )
                        updated += 1

        conn.commit()
        log.info(f"Updated {updated} scenes so far")

    log.info(f"Scene sync complete - updated {updated} scenes")


def main():
    """Main entry point"""
    try:
        # Load settings
        settings = load_settings()

        # Get database path
        db_path = get_database_path()

        # Check schema version
        schema_version = check_schema_version(db_path)

        # Create performance indexes
        create_indexes_if_needed(db_path)

        # Open database connection
        conn = sqlite3.connect(db_path)

        # Get exclusion tag ID if configured
        exclusion_tag_id = get_exclusion_tag_id(conn, settings.get("excludeTag", ""))

        # Run syncs based on settings
        if settings["enableImages"]:
            sync_images(conn, settings, exclusion_tag_id)

        if settings["enableGalleries"]:
            sync_galleries(conn, settings, exclusion_tag_id)

        if settings["enableScenes"]:
            sync_scenes(conn, settings, exclusion_tag_id)

        conn.close()
        log.info("All sync operations complete!")
        log.progress(1.0)

    except Exception as e:
        log.error(f"Fatal error: {e}")
        import traceback
        log.error(traceback.format_exc())
        sys.exit(1)


if __name__ == "__main__":
    main()
