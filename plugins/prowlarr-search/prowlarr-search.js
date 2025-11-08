(function() {
    'use strict';

    // Unique namespace prefix to avoid conflicts
    const PLUGIN_PREFIX = 'prowlarr-search';
    const BUTTON_ID = `${PLUGIN_PREFIX}-button`;
    const BUTTON_ADDED_ATTR = `data-${PLUGIN_PREFIX}-added`;

    // Plugin state
    let pluginConfig = null;
    let prowlButton = null;

    // Fetch plugin settings from GraphQL
    async function getPluginSettings() {
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
            const settings = data?.data?.configuration?.plugins?.['prowlarr-search'] || {};

            // Set defaults
            if (settings.searchAllAliases === undefined) settings.searchAllAliases = true;
            if (settings.xxxCategoryOnly === undefined) settings.xxxCategoryOnly = true;

            console.log('[Prowlarr Search] Settings loaded:', settings);
            return settings;
        } catch (error) {
            console.error('[Prowlarr Search] Error loading settings:', error);
            return {
                searchAllAliases: true,
                xxxCategoryOnly: true,
                prowlarrUrl: ''
            };
        }
    }

    // Detect if we're on a performer detail page
    function isPerformerPage() {
        const path = window.location.pathname;
        return /^\/performers\/\d+/.test(path);
    }

    // Extract performer ID from URL
    function getPerformerId() {
        const path = window.location.pathname;
        const match = path.match(/^\/performers\/(\d+)/);
        return match ? match[1] : null;
    }

    // Fetch performer data including name and aliases
    async function fetchPerformerData(performerId) {
        try {
            const response = await fetch('/graphql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: `
                        query FindPerformer($id: ID!) {
                            findPerformer(id: $id) {
                                id
                                name
                                alias_list
                            }
                        }
                    `,
                    variables: { id: performerId }
                })
            });

            const data = await response.json();
            return data?.data?.findPerformer || null;
        } catch (error) {
            console.error('[Prowlarr Search] Error fetching performer data:', error);
            return null;
        }
    }

    // Construct Prowlarr search URL
    function buildProwlarrSearchUrl(searchTerm, baseUrl, xxxOnly) {
        if (!baseUrl) {
            console.error('[Prowlarr Search] No Prowlarr URL configured');
            return null;
        }

        // Remove trailing slash from base URL
        baseUrl = baseUrl.replace(/\/$/, '');

        // Build the search URL (Prowlarr search page format)
        let url = `${baseUrl}/search?query=${encodeURIComponent(searchTerm)}`;

        // Add XXX category filter (category 6000 for Adult content)
        if (xxxOnly) {
            url += '&categories=6000';
        }

        return url;
    }

    // Perform Prowlarr search
    async function performProwlSearch() {
        if (!pluginConfig) {
            console.error('[Prowlarr Search] Plugin not configured');
            alert('Please configure Prowlarr settings in the plugin configuration page.');
            return;
        }

        if (!pluginConfig.prowlarrUrl) {
            alert('Please set your Prowlarr server URL in the plugin settings.');
            return;
        }

        const performerId = getPerformerId();
        if (!performerId) {
            console.error('[Prowlarr Search] Could not determine performer ID');
            return;
        }

        // Fetch performer data
        const performer = await fetchPerformerData(performerId);
        if (!performer) {
            alert('Could not fetch performer data.');
            return;
        }

        console.log('[Prowlarr Search] Performer data:', performer);

        // Build list of search terms
        const searchTerms = [performer.name];

        // Add aliases if enabled
        if (pluginConfig.searchAllAliases && performer.alias_list && performer.alias_list.length > 0) {
            searchTerms.push(...performer.alias_list);
        }

        console.log('[Prowlarr Search] Search terms:', searchTerms);

        // Open a tab for each search term
        searchTerms.forEach((term, index) => {
            const url = buildProwlarrSearchUrl(
                term,
                pluginConfig.prowlarrUrl,
                pluginConfig.xxxCategoryOnly
            );

            if (url) {
                // Slight delay between opening tabs to avoid browser blocking
                setTimeout(() => {
                    console.log('[Prowlarr Search] Opening search for:', term);
                    window.open(url, '_blank');
                }, index * 100);
            }
        });
    }

    // Create and add the Prowl button
    function createProwlButton() {
        if (!isPerformerPage()) {
            console.log('[Prowlarr Search] Not on performer page');
            return;
        }

        // Prevent duplicate button creation
        if (prowlButton || document.getElementById(BUTTON_ID)) {
            console.log('[Prowlarr Search] Button already exists');
            return;
        }

        // Find the button group - look for existing action buttons
        let buttonContainer = null;

        // Try to find Edit button or other action buttons first
        const editButton = Array.from(document.querySelectorAll('button')).find(btn =>
            btn.textContent.includes('Edit') && btn.closest('[class*="detail"]')
        );

        if (editButton) {
            buttonContainer = editButton.parentElement;
            console.log('[Prowlarr Search] Found button container via Edit button');
        }

        // Fallback: search for button groups or containers with multiple buttons
        if (!buttonContainer) {
            const allButtons = document.querySelectorAll('.btn');
            for (const btn of allButtons) {
                const parent = btn.parentElement;
                const siblingButtons = parent.querySelectorAll('.btn');
                if (siblingButtons.length >= 2) {
                    buttonContainer = parent;
                    console.log('[Prowlarr Search] Found button container with multiple buttons');
                    break;
                }
            }
        }

        if (!buttonContainer) {
            console.error('[Prowlarr Search] Could not find button container to attach button');
            return;
        }

        // Create the button
        prowlButton = document.createElement('button');
        prowlButton.id = BUTTON_ID;
        prowlButton.className = 'prowl btn btn-success';
        prowlButton.textContent = 'Prowl';
        prowlButton.title = 'Search Prowlarr for this performer';
        prowlButton.setAttribute('type', 'button');
        prowlButton.setAttribute(BUTTON_ADDED_ATTR, 'true');

        prowlButton.onclick = async (e) => {
            e.preventDefault();
            e.stopPropagation();

            // Disable button during search
            prowlButton.disabled = true;
            prowlButton.textContent = 'Prowling...';

            try {
                await performProwlSearch();
            } finally {
                // Re-enable button
                prowlButton.disabled = false;
                prowlButton.textContent = 'Prowl';
            }
        };

        // Append to the button container
        buttonContainer.appendChild(prowlButton);

        console.log('[Prowlarr Search] Button created and attached');
    }

    // Remove the button (for cleanup)
    function removeButton() {
        if (prowlButton) {
            prowlButton.remove();
            prowlButton = null;
        }
        const existingButton = document.getElementById(BUTTON_ID);
        if (existingButton) {
            existingButton.remove();
        }
    }

    // Initialize the plugin
    async function initialize() {
        console.log('[Prowlarr Search] Initializing...');

        // Load settings
        pluginConfig = await getPluginSettings();

        if (!isPerformerPage()) {
            console.log('[Prowlarr Search] Not on a performer page, skipping');
            return;
        }

        console.log('[Prowlarr Search] On performer page:', getPerformerId());

        // Wait a bit for the page to fully render
        setTimeout(createProwlButton, 500);
    }

    // Handle navigation changes (for SPAs)
    let lastPath = window.location.pathname;
    const checkNavigation = setInterval(async () => {
        if (window.location.pathname !== lastPath) {
            console.log('[Prowlarr Search] Navigation detected:', lastPath, '->', window.location.pathname);
            lastPath = window.location.pathname;

            // Remove old button
            removeButton();

            // Reinitialize
            setTimeout(initialize, 500);
        }
    }, 1000);

    // Start initialization
    console.log('[Prowlarr Search] Plugin loading...');
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        // DOM already loaded
        setTimeout(initialize, 100);
    }
})();
