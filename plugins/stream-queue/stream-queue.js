(function() {
    'use strict';

    const PLUGIN_NAME = 'stream-queue';
    const STORAGE_KEY = 'stream-queue-data';
    let pluginConfig = null;
    let queues = {}; // { stream1: [{id, title, url}], stream2: [...], ... }

    console.log('[Stream Queue] Initializing...');

    // Fetch plugin configuration
    async function getPluginConfig() {
        try {
            const response = await fetch('/graphql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: `query Configuration {
                        configuration {
                            plugins
                        }
                    }`
                })
            });
            const data = await response.json();
            const settings = data?.data?.configuration?.plugins?.[PLUGIN_NAME] || {};

            // Set defaults
            if (!settings.streamCount || settings.streamCount === 0) settings.streamCount = 1;
            if (!settings.buttonSize || settings.buttonSize === 0) settings.buttonSize = 32;
            if (settings.showQueuePanel === undefined) settings.showQueuePanel = true;
            if (settings.autoDownload === undefined) settings.autoDownload = false;
            if (!settings.buttonColor || settings.buttonColor === 0) settings.buttonColor = 260;
            if (settings.maxQueueSize === undefined) settings.maxQueueSize = 0;
            if (!settings.streamingPath || settings.streamingPath === '') settings.streamingPath = '/scene/{id}/stream';
            if (!settings.apiKey || settings.apiKey === '') settings.apiKey = '';
            if (!settings.streamBaseUrl || settings.streamBaseUrl === '') settings.streamBaseUrl = '';

            // Clamp stream count to 1-10
            settings.streamCount = Math.max(1, Math.min(10, settings.streamCount));

            console.log(`[Stream Queue] Settings loaded:`, {
                ...settings,
                apiKey: settings.apiKey ? '***' : 'NOT SET',
                streamBaseUrl: settings.streamBaseUrl || '(using current page URL)'
            });

            // Info about auth configuration
            if (!settings.apiKey && !settings.streamBaseUrl) {
                console.info('[Stream Queue] 💡 For VLC with Authelia/proxy auth:');
                console.info('[Stream Queue]   Option 1: Configure Authelia bypass for /scene/*/stream (recommended)');
                console.info('[Stream Queue]   Option 2: Set Stream Base URL to internal IP (e.g., http://192.168.1.100:9999)');
                console.info('[Stream Queue]   See README for details');
            }

            return settings;
        } catch (error) {
            console.error(`[Stream Queue] Error loading settings:`, error);
            return {
                streamCount: 1,
                buttonSize: 32,
                showQueuePanel: true,
                autoDownload: false,
                buttonColor: 260,
                maxQueueSize: 0,
                streamingPath: '/scene/{id}/stream',
                apiKey: '',
                streamBaseUrl: ''
            };
        }
    }

    // Load queues from localStorage
    function loadQueues() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                queues = JSON.parse(stored);
                console.log('[Stream Queue] Loaded queues from localStorage:', queues);
            } else {
                // Initialize empty queues
                for (let i = 1; i <= pluginConfig.streamCount; i++) {
                    queues[`stream${i}`] = [];
                }
            }
        } catch (error) {
            console.error('[Stream Queue] Error loading queues:', error);
            // Initialize empty queues on error
            for (let i = 1; i <= pluginConfig.streamCount; i++) {
                queues[`stream${i}`] = [];
            }
        }
    }

    // Save queues to localStorage
    function saveQueues() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(queues));
            console.log('[Stream Queue] Saved queues to localStorage');
        } catch (error) {
            console.error('[Stream Queue] Error saving queues:', error);
        }
    }

    // Extract scene ID from any element - works with any card structure
    function extractSceneId(element) {
        if (!element) return null;

        // Check the element itself and all children for scene ID
        const elementsToCheck = [element, ...element.querySelectorAll('*')];

        for (const el of elementsToCheck) {
            // Check href attributes
            if (el.href) {
                const match = el.href.match(/\/scenes?\/(\d+)/);
                if (match) return match[1];
            }

            // Check src attributes (video previews)
            if (el.src) {
                const match = el.src.match(/\/scene\/(\d+)/);
                if (match) return match[1];
            }

            // Check data attributes
            for (const attr of el.attributes || []) {
                if (attr.value) {
                    const match = attr.value.match(/\/scenes?\/(\d+)/);
                    if (match) return match[1];
                }
            }
        }

        return null;
    }

    // Get scene information from any DOM element
    function getSceneInfo(element) {
        const id = extractSceneId(element);
        if (!id) return null;

        // Try to find title from various possible locations
        const title = element.querySelector('.wall-item-title')?.textContent?.trim() ||
                     element.querySelector('.card-section-title')?.textContent?.trim() ||
                     element.querySelector('.scene-card-preview-title')?.textContent?.trim() ||
                     element.querySelector('.TruncatedText')?.textContent?.trim() ||
                     element.querySelector('a[href*="/scenes/"]')?.textContent?.trim() ||
                     `Scene ${id}`;

        // Use custom stream base URL if configured, otherwise use current page origin
        const baseUrl = pluginConfig.streamBaseUrl || window.location.origin;
        let streamUrl = baseUrl + pluginConfig.streamingPath.replace('{id}', id);

        // Append API key if configured
        if (pluginConfig.apiKey) {
            const separator = streamUrl.includes('?') ? '&' : '?';
            streamUrl += `${separator}apikey=${pluginConfig.apiKey}`;
        }

        return { id, title, url: streamUrl };
    }

    // Add scene to queue
    function addToQueue(streamNumber, sceneInfo) {
        const queueKey = `stream${streamNumber}`;

        // Check if already in queue
        if (queues[queueKey].some(item => item.id === sceneInfo.id)) {
            showNotification(`Already in Stream ${streamNumber}`, 'warning');
            return;
        }

        // Check max queue size
        if (pluginConfig.maxQueueSize > 0 && queues[queueKey].length >= pluginConfig.maxQueueSize) {
            showNotification(`Stream ${streamNumber} is full (max ${pluginConfig.maxQueueSize})`, 'error');
            return;
        }

        queues[queueKey].push(sceneInfo);
        saveQueues();
        updateQueuePanel();
        showNotification(`Added to Stream ${streamNumber}`, 'success');

        if (pluginConfig.autoDownload) {
            downloadPlaylist(streamNumber);
        }
    }

    // Remove scene from queue
    function removeFromQueue(streamNumber, sceneId) {
        const queueKey = `stream${streamNumber}`;
        queues[queueKey] = queues[queueKey].filter(item => item.id !== sceneId);
        saveQueues();
        updateQueuePanel();
    }

    // Clear entire queue
    function clearQueue(streamNumber) {
        const queueKey = `stream${streamNumber}`;
        queues[queueKey] = [];
        saveQueues();
        updateQueuePanel();
        showNotification(`Cleared Stream ${streamNumber}`, 'success');
    }

    // Generate M3U8 playlist content
    function generateM3U8(streamNumber) {
        const queueKey = `stream${streamNumber}`;
        const queue = queues[queueKey] || [];

        if (queue.length === 0) {
            return null;
        }

        let m3u8 = '#EXTM3U\n';
        m3u8 += '#PLAYLIST:Stream Queue ' + streamNumber + '\n\n';

        queue.forEach(scene => {
            m3u8 += `#EXTINF:-1,${scene.title}\n`;
            m3u8 += `${scene.url}\n\n`;
        });

        return m3u8;
    }

    // Download playlist as M3U8 file
    function downloadPlaylist(streamNumber) {
        const m3u8Content = generateM3U8(streamNumber);

        if (!m3u8Content) {
            showNotification(`Stream ${streamNumber} is empty`, 'warning');
            return;
        }

        // Log playlist content for debugging
        console.log(`[Stream Queue] Generated M3U8 playlist for Stream ${streamNumber}:`);
        console.log(m3u8Content);

        // Info about auth configuration
        if (!pluginConfig.apiKey && !pluginConfig.streamBaseUrl) {
            console.info('[Stream Queue] 💡 If VLC fails to play streams (auth required):');
            console.info('[Stream Queue]   • Set Stream Base URL to internal IP (e.g., http://192.168.1.100:9999)');
            console.info('[Stream Queue]   • Or configure Authelia to bypass /scene/*/stream');
            console.info('[Stream Queue]   • See README for details');
        }

        const blob = new Blob([m3u8Content], { type: 'application/vnd.apple.mpegurl' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `stream-queue-${streamNumber}.m3u8`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showNotification(`Downloaded Stream ${streamNumber} playlist`, 'success');
    }

    // Show notification
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `stream-queue-notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => notification.classList.add('show'), 10);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    }

    // Create context menu
    let contextMenu = null;

    function createContextMenu() {
        // Remove existing menu
        if (contextMenu) contextMenu.remove();

        contextMenu = document.createElement('div');
        contextMenu.className = 'stream-queue-context-menu';
        contextMenu.style.display = 'none';

        const title = document.createElement('div');
        title.className = 'stream-queue-context-title';
        title.textContent = 'Add to Stream Queue';
        contextMenu.appendChild(title);

        for (let i = 1; i <= pluginConfig.streamCount; i++) {
            const item = document.createElement('div');
            item.className = 'stream-queue-context-item';
            item.setAttribute('data-stream', i);
            item.innerHTML = `
                <svg viewBox="0 0 24 24" width="16" height="16">
                    <path fill="currentColor" d="M14,3V5H17.59L7.76,14.83L9.17,16.24L19,6.41V10H21V3M19,19H5V5H12V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19Z" />
                </svg>
                <span>Stream ${i}</span>
            `;
            contextMenu.appendChild(item);
        }

        document.body.appendChild(contextMenu);
    }

    // Setup context menu on scene cards
    function setupContextMenu() {
        // Listen for right-clicks anywhere
        document.addEventListener('contextmenu', (e) => {
            // Traverse up the DOM tree to find a scene container
            let target = e.target;
            let sceneContainer = null;

            // Go up the DOM tree looking for a container with scene info
            for (let i = 0; i < 15 && target && target !== document.body; i++) {
                // Try to extract scene ID from this element
                const sceneId = extractSceneId(target);
                if (sceneId) {
                    sceneContainer = target;
                    break;
                }

                // Also check for common container classes
                if (target.classList && (
                    target.classList.contains('wall-item') ||
                    target.classList.contains('scene-card') ||
                    target.classList.contains('card') ||
                    target.classList.contains('scene-card-preview') ||
                    target.classList.contains('scene-card-link')
                )) {
                    // Double-check this container has scene info
                    if (extractSceneId(target)) {
                        sceneContainer = target;
                        break;
                    }
                }

                target = target.parentElement;
            }

            // If no scene container found, abort
            if (!sceneContainer) return;

            // Get scene info
            const sceneInfo = getSceneInfo(sceneContainer);
            if (!sceneInfo) return;

            // Prevent default context menu
            e.preventDefault();
            e.stopPropagation();

            // Show context menu
            createContextMenu();
            contextMenu.style.left = e.pageX + 'px';
            contextMenu.style.top = e.pageY + 'px';
            contextMenu.style.display = 'block';

            // Add click handlers to menu items
            contextMenu.querySelectorAll('.stream-queue-context-item').forEach(item => {
                item.onclick = (ev) => {
                    ev.stopPropagation();
                    const streamNum = parseInt(item.getAttribute('data-stream'));
                    addToQueue(streamNum, sceneInfo);
                    contextMenu.style.display = 'none';
                };
            });
        });

        // Hide menu on click elsewhere
        document.addEventListener('click', () => {
            if (contextMenu) {
                contextMenu.style.display = 'none';
            }
        });

        // Hide menu on scroll
        document.addEventListener('scroll', () => {
            if (contextMenu) {
                contextMenu.style.display = 'none';
            }
        }, true);
    }

    // Create queue management panel
    function createQueuePanel() {
        if (!pluginConfig.showQueuePanel) return;

        // Remove existing panel
        const existing = document.querySelector('.stream-queue-panel');
        if (existing) existing.remove();

        const panel = document.createElement('div');
        panel.className = 'stream-queue-panel';
        panel.innerHTML = `
            <div class="stream-queue-header">
                <h3>📺 Stream Queues</h3>
                <button class="stream-queue-toggle">−</button>
            </div>
            <div class="stream-queue-body">
                ${Array.from({length: pluginConfig.streamCount}, (_, i) => i + 1).map(num => `
                    <div class="stream-queue-stream" data-stream="${num}">
                        <div class="stream-queue-stream-header">
                            <span class="stream-queue-stream-title">Stream ${num}</span>
                            <div class="stream-queue-stream-actions">
                                <button class="stream-queue-download-btn" data-stream="${num}" title="Download M3U8">
                                    <svg viewBox="0 0 24 24" width="16" height="16">
                                        <path fill="currentColor" d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z" />
                                    </svg>
                                </button>
                                <button class="stream-queue-clear-btn" data-stream="${num}" title="Clear Queue">
                                    <svg viewBox="0 0 24 24" width="16" height="16">
                                        <path fill="currentColor" d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <div class="stream-queue-items" data-stream="${num}"></div>
                    </div>
                `).join('')}
            </div>
        `;

        document.body.appendChild(panel);

        // Toggle panel
        panel.querySelector('.stream-queue-toggle').addEventListener('click', () => {
            panel.classList.toggle('minimized');
            const btn = panel.querySelector('.stream-queue-toggle');
            btn.textContent = panel.classList.contains('minimized') ? '+' : '−';
        });

        // Draggable panel
        const header = panel.querySelector('.stream-queue-header');
        let isDragging = false;
        let offsetX = 0;
        let offsetY = 0;

        header.addEventListener('mousedown', (e) => {
            // Don't drag if clicking the toggle button
            if (e.target.closest('.stream-queue-toggle')) return;

            isDragging = true;
            const rect = panel.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;

            // Prevent text selection while dragging
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            // Calculate new position
            let newX = e.clientX - offsetX;
            let newY = e.clientY - offsetY;

            // Keep panel within viewport bounds
            const maxX = window.innerWidth - panel.offsetWidth;
            const maxY = window.innerHeight - panel.offsetHeight;

            newX = Math.max(0, Math.min(newX, maxX));
            newY = Math.max(0, Math.min(newY, maxY));

            // Update position
            panel.style.left = newX + 'px';
            panel.style.top = newY + 'px';
            panel.style.right = 'auto';
            panel.style.bottom = 'auto';
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });

        // Download buttons
        panel.querySelectorAll('.stream-queue-download-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const streamNum = parseInt(btn.getAttribute('data-stream'));
                downloadPlaylist(streamNum);
            });
        });

        // Clear buttons
        panel.querySelectorAll('.stream-queue-clear-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const streamNum = parseInt(btn.getAttribute('data-stream'));
                if (confirm(`Clear all scenes from Stream ${streamNum}?`)) {
                    clearQueue(streamNum);
                }
            });
        });

        updateQueuePanel();
    }

    // Update queue panel with current queue state
    function updateQueuePanel() {
        const panel = document.querySelector('.stream-queue-panel');
        if (!panel) return;

        for (let i = 1; i <= pluginConfig.streamCount; i++) {
            const queueKey = `stream${i}`;
            const queue = queues[queueKey] || [];
            const container = panel.querySelector(`.stream-queue-items[data-stream="${i}"]`);

            if (!container) continue;

            if (queue.length === 0) {
                container.innerHTML = '<div class="stream-queue-empty">Empty queue</div>';
            } else {
                container.innerHTML = queue.map((scene, index) => `
                    <div class="stream-queue-item" data-scene-id="${scene.id}">
                        <span class="stream-queue-item-number">${index + 1}</span>
                        <span class="stream-queue-item-title">${scene.title}</span>
                        <button class="stream-queue-item-remove" data-stream="${i}" data-id="${scene.id}" title="Remove">
                            ✕
                        </button>
                    </div>
                `).join('');

                // Add remove button handlers
                container.querySelectorAll('.stream-queue-item-remove').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const streamNum = parseInt(btn.getAttribute('data-stream'));
                        const sceneId = btn.getAttribute('data-id');
                        removeFromQueue(streamNum, sceneId);
                    });
                });
            }
        }
    }

    // Initialize plugin
    async function initialize() {
        console.log('[Stream Queue] Loading configuration...');
        pluginConfig = await getPluginConfig();
        loadQueues();

        // Create queue panel
        createQueuePanel();

        // Setup right-click context menu
        setupContextMenu();

        console.log('[Stream Queue] Initialized with', pluginConfig.streamCount, 'streams');
    }

    // Wait for page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        setTimeout(initialize, 500);
    }

})();
