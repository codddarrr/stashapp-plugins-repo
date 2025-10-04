(function() {
    'use strict';

    // Plugin state
    let floatingPlayer = null;
    let floatingVideo = null;
    let currentSceneId = null;
    let currentSceneTitle = null;
    let isSceneListPage = false;
    let hoverTimeout = null;
    let launchButton = null;
    let isPlayerVisible = false;

    // Helper to get position from mouse or touch event
    const getEventPosition = (e) => {
        if (e.touches && e.touches.length > 0) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        return { x: e.clientX, y: e.clientY };
    };

    // Fetch plugin settings and UI configuration from GraphQL
    async function getPluginSettings() {
        try {
            const response = await fetch('/graphql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: `query Configuration {
                        configuration {
                            plugins
                            ui
                        }
                    }`
                })
            });
            const data = await response.json();
            const settings = data.data?.configuration?.plugins?.['floating-scene-player'] || {};
            const uiConfig = data.data?.configuration?.ui || {};

            // Set defaults
            if (settings.useThemeColors === undefined) settings.useThemeColors = true;
            if (settings.hoverAutoplay === undefined) settings.hoverAutoplay = false;
            if (settings.persistentPlayer === undefined) settings.persistentPlayer = false;

            console.log('[Floating Scene Player] Settings loaded:', settings);
            console.log('[Floating Scene Player] UI Config:', uiConfig);
            return { settings, uiConfig };
        } catch (error) {
            console.error('[Floating Scene Player] Error loading settings:', error);
            return {
                settings: { useThemeColors: true, hoverAutoplay: false, persistentPlayer: false },
                uiConfig: {}
            };
        }
    }

    // Determine page type
    function detectPageType() {
        const path = window.location.pathname;

        // Always support /scenes routes
        if (path.startsWith('/scenes') || path.includes('/scenes')) {
            isSceneListPage = true;
            return;
        }

        // Support specific performer/tag/studio pages (with ID), but not list pages
        if (/^\/performers\/\d+/.test(path) ||
            /^\/tags\/\d+/.test(path) ||
            /^\/studios\/\d+/.test(path) ||
            /^\/movies\/\d+/.test(path)) {
            isSceneListPage = true;
            return;
        }

        // Exclude all other pages (including /performers, /tags, /images, /galleries lists)
        isSceneListPage = false;
    }

    // Extract scene ID from URL or element
    function getSceneId(element) {
        // From URL string
        if (typeof element === 'string') {
            const match = element.match(/scenes\/(\d+)/);
            return match ? match[1] : null;
        }
        // From element
        if (element) {
            const link = element.closest('a[href*="/scenes/"]') || element.querySelector('a[href*="/scenes/"]');
            if (link) {
                const href = link.getAttribute('href');
                if (href) {
                    const match = href.match(/scenes\/(\d+)/);
                    return match ? match[1] : null;
                }
            }
        }
        return null;
    }

    // Create launch button
    async function createLaunchButton(config) {
        if (launchButton) return;

        const { settings } = config;
        const customCSS = settings.customButtonCSS || '';
        console.log('[Floating Scene Player] Applying button CSS:', customCSS);

        launchButton = document.createElement('button');
        launchButton.id = 'stash-player-launch-btn';
        launchButton.className = 'btn btn-primary';
        launchButton.innerHTML = '⛶';
        launchButton.title = 'Launch Scene Player';

        // Apply base styles and custom CSS
        const baseStyles = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 10000;
            font-size: 32px;
            padding: 8px 16px;
            line-height: 1;
        `;
        const finalStyles = baseStyles + (customCSS ? '; ' + customCSS : '');
        console.log('[Floating Scene Player] Final button styles:', finalStyles);
        launchButton.style.cssText = finalStyles;

        launchButton.onclick = () => {
            if (isPlayerVisible) {
                hidePlayer();
            } else {
                showPlayer();
            }
        };

        document.body.appendChild(launchButton);
    }

    // Show player and update launch button
    function showPlayer() {
        if (floatingPlayer) {
            floatingPlayer.style.display = 'flex';
            isPlayerVisible = true;
        }
        if (launchButton) {
            launchButton.innerHTML = '▼';
            launchButton.title = 'Hide Scene Player';
        }
    }

    // Hide player and update launch button
    function hidePlayer() {
        if (floatingPlayer) {
            floatingPlayer.style.display = 'none';
            isPlayerVisible = false;
            // Pause video but keep the source for persistent mode
            if (floatingVideo) {
                floatingVideo.pause();
            }
        }
        if (launchButton) {
            launchButton.innerHTML = '⛶';
            launchButton.title = 'Show Scene Player';
        }
    }

    // Get theme colors from UI configuration
    function getThemeColors(uiConfig, useTheme) {
        if (!useTheme) {
            return {
                background: '#1a1a1a',
                titleBar: 'linear-gradient(to bottom, #2a2a2a, #1a1a1a)',
                border: '#444',
                text: '#fff'
            };
        }

        // Extract theme colors from CSS variables or UI config
        const rootStyles = getComputedStyle(document.documentElement);
        const primaryColor = rootStyles.getPropertyValue('--primary') || uiConfig.primaryColor || '#007bff';
        const backgroundColor = rootStyles.getPropertyValue('--body-bg') || uiConfig.backgroundColor || '#1a1a1a';
        const borderColor = rootStyles.getPropertyValue('--border-color') || '#444';
        const textColor = rootStyles.getPropertyValue('--text-color') || '#fff';

        return {
            background: backgroundColor,
            titleBar: `linear-gradient(to bottom, ${primaryColor}22, ${backgroundColor})`,
            border: borderColor,
            text: textColor
        };
    }

    // Create floating player
    async function createFloatingPlayer(config) {
        if (floatingPlayer) return;

        const { settings, uiConfig } = config;
        const customPlayerCSS = settings.customPlayerCSS || '';
        const themeColors = getThemeColors(uiConfig, settings.useThemeColors);

        floatingPlayer = document.createElement('div');
        floatingPlayer.id = 'stash-floating-player';

        if (isSceneListPage) {
            // Larger, resizable player for scene list - hidden by default
            // Default to horizontal orientation, will auto-adjust when video loads
            const basePlayerStyles = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 640px;
                height: 460px;
                z-index: 10000;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8);
                background: #1a1a1a;
                border: 2px solid #444;
                display: none;
                flex-direction: column;
                min-width: 320px;
                min-height: 300px;
                max-width: 80vw;
                max-height: 80vh;
                background: ${themeColors.background};
                border: 2px solid ${themeColors.border};
            `;
            floatingPlayer.style.cssText = basePlayerStyles + (customPlayerCSS ? '; ' + customPlayerCSS : '');

            // Title bar for scene list
            const titleBar = document.createElement('div');
            titleBar.id = 'player-title-bar';
            titleBar.style.cssText = `
                background: ${themeColors.titleBar};
                padding: 8px 12px;
                color: ${themeColors.text};
                font-size: 14px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                cursor: move;
                user-select: none;
                border-bottom: 1px solid #444;
            `;

            const titleText = document.createElement('span');
            titleText.id = 'player-title-text';
            titleText.textContent = 'No scene selected';
            titleText.style.cssText = `
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                flex: 1;
            `;

            // Close button in title bar
            const closeBtn = document.createElement('button');
            closeBtn.innerHTML = '×';
            closeBtn.style.cssText = `
                width: 24px;
                height: 24px;
                border: none;
                background: rgba(255,255,255,0.1);
                color: white;
                border-radius: 3px;
                cursor: pointer;
                font-size: 18px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
                margin-left: 8px;
            `;
            closeBtn.onmouseover = () => {
                closeBtn.style.background = 'rgba(255,0,0,0.7)';
            };
            closeBtn.onmouseout = () => {
                closeBtn.style.background = 'rgba(255,255,255,0.1)';
            };
            closeBtn.onclick = (e) => {
                e.stopPropagation();
                if (settings.persistentPlayer) {
                    hidePlayer(); // Just hide, don't destroy
                } else {
                    hidePlayer();
                }
            };

            titleBar.appendChild(titleText);
            titleBar.appendChild(closeBtn);
            floatingPlayer.appendChild(titleBar);

            // Make draggable (mouse and touch support)
            let isDragging = false;
            let dragOffset = { x: 0, y: 0 };

            const startDrag = (e) => {
                // Don't start dragging if clicking on a button
                if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
                    return;
                }
                isDragging = true;
                const pos = getEventPosition(e);
                dragOffset.x = pos.x - floatingPlayer.offsetLeft;
                dragOffset.y = pos.y - floatingPlayer.offsetTop;
                floatingPlayer.style.cursor = 'grabbing';
                titleBar.style.cursor = 'grabbing';
                e.preventDefault(); // Prevent text selection on touch
            };

            const doDrag = (e) => {
                if (isDragging) {
                    const pos = getEventPosition(e);
                    floatingPlayer.style.left = (pos.x - dragOffset.x) + 'px';
                    floatingPlayer.style.top = (pos.y - dragOffset.y) + 'px';
                    floatingPlayer.style.right = 'auto';
                    floatingPlayer.style.bottom = 'auto';
                    e.preventDefault();
                }
            };

            const stopDrag = () => {
                isDragging = false;
                floatingPlayer.style.cursor = '';
                titleBar.style.cursor = 'move';
            };

            // Mouse events
            titleBar.addEventListener('mousedown', startDrag);
            document.addEventListener('mousemove', doDrag);
            document.addEventListener('mouseup', stopDrag);

            // Touch events for mobile
            titleBar.addEventListener('touchstart', startDrag, { passive: false });
            document.addEventListener('touchmove', doDrag, { passive: false });
            document.addEventListener('touchend', stopDrag);
        }

        // Video container
        const videoContainer = document.createElement('div');
        videoContainer.style.cssText = `
            flex: 1;
            position: relative;
            background: #000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        floatingVideo = document.createElement('video');
        floatingVideo.style.cssText = `
            width: 100%;
            height: 100%;
            object-fit: contain;
            background: #000;
            position: relative;
            z-index: 1;
        `;
        floatingVideo.controls = true;
        floatingVideo.muted = true;
        floatingVideo.playsInline = true;
        floatingVideo.autoplay = true;

        // Auto-resize player based on video orientation when metadata loads
        floatingVideo.addEventListener('loadedmetadata', () => {
            if (floatingVideo.videoWidth && floatingVideo.videoHeight) {
                const aspectRatio = floatingVideo.videoWidth / floatingVideo.videoHeight;

                // Only auto-resize if player is at default size (not manually resized)
                const currentWidth = parseInt(floatingPlayer.style.width);
                const currentHeight = parseInt(floatingPlayer.style.height);

                // Check if player is still at default horizontal size (640x460) or vertical size (360x720)
                const isDefaultSize = (currentWidth === 640 && currentHeight === 460) ||
                                     (currentWidth === 360 && currentHeight === 720);

                if (isDefaultSize) {
                    if (aspectRatio < 1) {
                        // Vertical video (portrait)
                        floatingPlayer.style.width = '360px';
                        floatingPlayer.style.height = '720px';
                    } else {
                        // Horizontal video (landscape)
                        floatingPlayer.style.width = '640px';
                        floatingPlayer.style.height = '460px';
                    }
                }
            }
        });

        // Placeholder text
        const placeholder = document.createElement('div');
        placeholder.id = 'player-placeholder';
        placeholder.style.cssText = `
            position: absolute;
            color: #666;
            font-size: 18px;
            text-align: center;
            pointer-events: none;
        `;
        placeholder.textContent = 'Click or hover on a scene to play';

        videoContainer.appendChild(floatingVideo);
        videoContainer.appendChild(placeholder);

        // Resize handle for scene list (touch-friendly)
        if (isSceneListPage) {
            const resizeHandle = document.createElement('div');
            resizeHandle.style.cssText = `
                position: absolute;
                bottom: 0;
                right: 0;
                width: 40px;
                height: 40px;
                cursor: nwse-resize;
                background: linear-gradient(135deg, transparent 50%, rgba(102, 102, 102, 0.8) 50%);
                border-radius: 0 0 6px 0;
                z-index: 1001;
                touch-action: none;
            `;

            // Custom resize logic for touch support
            let isResizing = false;
            let resizeStartX = 0;
            let resizeStartY = 0;
            let startWidth = 0;
            let startHeight = 0;

            const startResize = (e) => {
                isResizing = true;
                const pos = getEventPosition(e);
                resizeStartX = pos.x;
                resizeStartY = pos.y;
                startWidth = floatingPlayer.offsetWidth;
                startHeight = floatingPlayer.offsetHeight;
                e.preventDefault();
                e.stopPropagation();
            };

            const doResize = (e) => {
                if (isResizing) {
                    const pos = getEventPosition(e);
                    const deltaX = pos.x - resizeStartX;
                    const deltaY = pos.y - resizeStartY;

                    const newWidth = Math.max(320, Math.min(window.innerWidth * 0.8, startWidth + deltaX));
                    const newHeight = Math.max(300, Math.min(window.innerHeight * 0.8, startHeight + deltaY));

                    floatingPlayer.style.width = newWidth + 'px';
                    floatingPlayer.style.height = newHeight + 'px';
                    e.preventDefault();
                }
            };

            const stopResize = () => {
                isResizing = false;
            };

            // Mouse events
            resizeHandle.addEventListener('mousedown', startResize);
            document.addEventListener('mousemove', doResize);
            document.addEventListener('mouseup', stopResize);

            // Touch events
            resizeHandle.addEventListener('touchstart', startResize, { passive: false });
            document.addEventListener('touchmove', doResize, { passive: false });
            document.addEventListener('touchend', stopResize);

            floatingPlayer.appendChild(resizeHandle);
        }

        // Append video container
        floatingPlayer.appendChild(videoContainer);

        // Navigation links footer (scene list only)
        if (isSceneListPage) {
            const footer = document.createElement('div');
            footer.id = 'player-footer';
            footer.style.cssText = `
                background: rgba(26, 26, 26, 0.95);
                border-top: 1px solid #444;
                display: none;
            `;

            const navBar = document.createElement('div');
            navBar.id = 'player-nav-bar';
            navBar.style.cssText = `
                padding: 8px;
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
                align-items: center;
                max-height: 80px;
                overflow-y: auto;
                scrollbar-width: thin;
            `;

            footer.appendChild(navBar);
            floatingPlayer.appendChild(footer);

            // Show footer when video is playing
            floatingVideo.addEventListener('play', () => {
                footer.style.display = 'block';
            });
        }

        document.body.appendChild(floatingPlayer);

        // Hide placeholder when video loads
        floatingVideo.addEventListener('loadeddata', () => {
            const placeholder = document.getElementById('player-placeholder');
            if (placeholder) placeholder.style.display = 'none';
        });
    }

    // Fetch scene metadata
    async function fetchSceneMetadata(sceneId) {
        try {
            const response = await fetch('/graphql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: `
                        query FindScene($id: ID!) {
                            findScene(id: $id) {
                                id
                                title
                                performers {
                                    id
                                    name
                                }
                                tags {
                                    id
                                    name
                                }
                                studio {
                                    id
                                    name
                                }
                            }
                        }
                    `,
                    variables: { id: sceneId }
                })
            });

            const data = await response.json();
            return data.data?.findScene;
        } catch (error) {
            return null;
        }
    }

    // Update navigation links
    function updateNavLinks(metadata) {
        const navBar = document.getElementById('player-nav-bar');
        if (!navBar || !metadata) return;

        // Clear existing links
        navBar.innerHTML = '';

        // Ensure nav bar stays on top
        navBar.style.zIndex = '1000';
        navBar.style.position = 'relative';

        // Create link style
        const linkStyle = `
            padding: 3px 6px;
            background: rgba(52, 58, 64, 0.8);
            color: #fff;
            text-decoration: none;
            border-radius: 3px;
            font-size: 11px;
            display: inline-flex;
            align-items: center;
            gap: 3px;
            transition: all 0.2s;
            border: 1px solid rgba(255,255,255,0.1);
            white-space: nowrap;
            max-width: 150px;
            overflow: hidden;
            text-overflow: ellipsis;
        `;

        // Scene link
        const sceneLink = document.createElement('a');
        sceneLink.href = `/scenes/${metadata.id}`;
        sceneLink.innerHTML = '🎬 Scene';
        sceneLink.style.cssText = linkStyle;
        sceneLink.onmouseover = () => sceneLink.style.background = 'rgba(0, 123, 255, 0.8)';
        sceneLink.onmouseout = () => sceneLink.style.background = 'rgba(52, 58, 64, 0.8)';
        navBar.appendChild(sceneLink);

        // Performer links
        if (metadata.performers && metadata.performers.length > 0) {
            metadata.performers.forEach(performer => {
                const perfLink = document.createElement('a');
                perfLink.href = `/performers/${performer.id}`;
                perfLink.innerHTML = `👤 ${performer.name}`;
                perfLink.style.cssText = linkStyle;
                perfLink.onmouseover = () => perfLink.style.background = 'rgba(255, 0, 123, 0.8)';
                perfLink.onmouseout = () => perfLink.style.background = 'rgba(52, 58, 64, 0.8)';
                navBar.appendChild(perfLink);
            });
        }

        // Tag links (limit to first 5)
        if (metadata.tags && metadata.tags.length > 0) {
            metadata.tags.slice(0, 5).forEach(tag => {
                const tagLink = document.createElement('a');
                tagLink.href = `/tags/${tag.id}`;
                tagLink.innerHTML = `🏷️ ${tag.name}`;
                tagLink.style.cssText = linkStyle;
                tagLink.onmouseover = () => tagLink.style.background = 'rgba(40, 167, 69, 0.8)';
                tagLink.onmouseout = () => tagLink.style.background = 'rgba(52, 58, 64, 0.8)';
                navBar.appendChild(tagLink);
            });
        }

        // Studio link
        if (metadata.studio) {
            const studioLink = document.createElement('a');
            studioLink.href = `/studios/${metadata.studio.id}`;
            studioLink.innerHTML = `🏢 ${metadata.studio.name}`;
            studioLink.style.cssText = linkStyle;
            studioLink.onmouseover = () => studioLink.style.background = 'rgba(255, 193, 7, 0.8)';
            studioLink.onmouseout = () => studioLink.style.background = 'rgba(52, 58, 64, 0.8)';
            navBar.appendChild(studioLink);
        }
    }

    // Load video in floating player
    async function loadVideoInPlayer(sceneId, title) {
        if (!sceneId || !floatingVideo) return;

        currentSceneId = sceneId;
        currentSceneTitle = title || `Scene ${sceneId}`;

        const streamUrl = `/scene/${sceneId}/stream`;

        // Update title if on scene list
        if (isSceneListPage) {
            const titleText = document.getElementById('player-title-text');
            if (titleText) {
                titleText.textContent = currentSceneTitle;
                titleText.style.color = '#fff';
            }

            // Fetch and update navigation links
            const metadata = await fetchSceneMetadata(sceneId);
            if (metadata) {
                updateNavLinks(metadata);
                // Update title with actual title from metadata
                if (metadata.title && titleText) {
                    titleText.textContent = metadata.title;
                    currentSceneTitle = metadata.title;
                }

                // Ensure nav bar is still last child (on top)
                const navBar = document.getElementById('player-nav-bar');
                if (navBar && navBar.parentElement) {
                    navBar.parentElement.appendChild(navBar);
                }
            }
        }

        // Update video source
        if (floatingVideo.src !== window.location.origin + streamUrl) {
            floatingVideo.src = streamUrl;
            floatingVideo.play().catch(() => {
                floatingVideo.muted = true;
                floatingVideo.play().catch(() => {});
            });
        }
    }

    // Setup thumbnail interactions
    function setupThumbnailInteractions(config) {
        const { settings } = config;
        // Try broader selectors, but exclude nav bar links
        const thumbnails = document.querySelectorAll('a[href*="/scenes/"], .scene-card, [class*="scene"], [class*="Scene"], .grid-item, .wall-item');

        thumbnails.forEach(thumb => {
            // Skip if already enhanced or if it's inside the player nav bar
            if (thumb.dataset.enhanced === 'true' || thumb.closest('#player-nav-bar')) return;
            thumb.dataset.enhanced = 'true';

            // Handle both the link itself and elements containing links
            let link = thumb;
            if (thumb.tagName !== 'A') {
                link = thumb.querySelector('a[href*="/scenes/"]') || thumb.closest('a[href*="/scenes/"]');
            }
            if (!link) return;

            const sceneId = getSceneId(link);
            if (!sceneId) return;

            // Get title from thumbnail
            const titleElement = thumb.querySelector('.scene-card__title, [class*="title"], h5, .TruncatedText');
            const title = titleElement ? titleElement.textContent.trim() : `Scene ${sceneId}`;

            // Intercept click only when player is visible
            link.addEventListener('click', (e) => {
                if (isPlayerVisible) {
                    e.preventDefault();
                    e.stopPropagation();
                    loadVideoInPlayer(sceneId, title);
                    return false;
                }
                // When player is hidden, allow normal link behavior
            });

            // Hover to preview (only if enabled and player is visible)
            if (settings.hoverAutoplay) {
                thumb.addEventListener('mouseenter', () => {
                    if (!isPlayerVisible) return; // Don't preview if player is hidden

                    clearTimeout(hoverTimeout);
                    thumb.style.transform = 'scale(1.02)';
                    thumb.style.transition = 'transform 0.2s ease';
                    thumb.style.zIndex = '1000';

                    // Load video on hover after a short delay
                    hoverTimeout = setTimeout(() => {
                        loadVideoInPlayer(sceneId, title);
                    }, 500);
                });

                thumb.addEventListener('mouseleave', () => {
                    clearTimeout(hoverTimeout);
                    thumb.style.transform = 'scale(1)';
                    thumb.style.zIndex = '';
                });
            }

            // Visual indicator that it's clickable
            thumb.style.cursor = 'pointer';
        });
    }


    // Store plugin config globally
    let pluginConfig = null;

    // Initialize based on page type
    async function initialize() {
        // Load config once
        if (!pluginConfig) {
            pluginConfig = await getPluginSettings();
        }

        detectPageType();

        const { settings } = pluginConfig;

        // Handle persistent player mode
        if (settings.persistentPlayer) {
            // Create player and button once, keep them across navigation
            if (!floatingPlayer) {
                await createFloatingPlayer(pluginConfig);
            }
            if (!launchButton) {
                await createLaunchButton(pluginConfig);
            }
            // Always setup thumbnail interactions on current page
            setupThumbnailInteractions(pluginConfig);

            // Monitor for new thumbnails
            if (!window.thumbnailObserver) {
                window.thumbnailObserver = new MutationObserver(() => {
                    setupThumbnailInteractions(pluginConfig);
                });

                window.thumbnailObserver.observe(document.body, {
                    childList: true,
                    subtree: true
                });
            }
        } else {
            // Non-persistent mode: only create on supported pages
            if (!isSceneListPage) {
                return;
            }

            if (!floatingPlayer) {
                await createFloatingPlayer(pluginConfig);
            }
            if (!launchButton) {
                await createLaunchButton(pluginConfig);
            }
            setupThumbnailInteractions(pluginConfig);

            // Monitor for new thumbnails
            const observer = new MutationObserver(() => {
                setupThumbnailInteractions(pluginConfig);
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }

        // On single scene detail pages, auto-load the scene
        if (/^\/scenes\/\d+$/.test(window.location.pathname)) {
            const sceneId = getSceneId(window.location.pathname);
            if (sceneId) {
                loadVideoInPlayer(sceneId);
            }
        }
    }

    // Handle navigation changes (for SPAs)
    let lastPath = window.location.pathname;
    const checkNavigation = setInterval(async () => {
        if (window.location.pathname !== lastPath) {
            lastPath = window.location.pathname;

            // Reload config in case settings changed
            pluginConfig = await getPluginSettings();
            const { settings } = pluginConfig;

            if (settings.persistentPlayer) {
                // Keep player and button, just reinitialize thumbnails
                setTimeout(initialize, 500);
            } else {
                // Non-persistent: clean up and reinitialize
                if (floatingPlayer) {
                    floatingPlayer.remove();
                    floatingPlayer = null;
                    floatingVideo = null;
                    currentSceneId = null;
                    currentSceneTitle = null;
                    isPlayerVisible = false;
                }
                if (launchButton) {
                    launchButton.remove();
                    launchButton = null;
                }

                // Reinitialize (will create button only on supported pages)
                setTimeout(initialize, 500);
            }
        }
    }, 1000);

    // Start initialization
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();