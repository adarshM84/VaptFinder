document.addEventListener('DOMContentLoaded', () => {
    const statusContainer = document.getElementById('status-container');
    const resultsSection = document.getElementById('results');
    const browserStatusDiv = document.getElementById('browser-status');
    const libraryResultsDiv = document.getElementById('library-results');
    const scanBtn = document.getElementById('scan-btn');

    // 1. Check Browser Version
    const userAgent = navigator.userAgent;
    const browserInfo = getBrowserInfo(userAgent);
    displayBrowserInfo(browserInfo);

    // 2. Scan for libraries
    scanLibraries();

    scanBtn.addEventListener('click', () => {
        // Reset UI
        resultsSection.classList.add('hidden');
        statusContainer.classList.remove('hidden');
        libraryResultsDiv.innerHTML = '';
        scanLibraries();
    });

    function scanLibraries() {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            const activeTab = tabs[0];
            if (!activeTab.url || activeTab.url.startsWith('chrome://')) {
                showError("Cannot scan this page.");
                return;
            }

            // Inject content script if not already present? 
            // Actually, manifest injects content.js automatically on load.
            // But for SPA navigations or if popup opened late, we might need to re-trigger or ask content script for state.
            // For simplicity, we'll reload the page-script injection via scripting API or just trust activeTab injection logic.

            // Better approach for manual scan: execute script again
            chrome.scripting.executeScript({
                target: { tabId: activeTab.id },
                files: ['content.js']
            }, () => {
                if (chrome.runtime.lastError) {
                    showError("Scan failed: " + chrome.runtime.lastError.message);
                }
            });
        });
    }

    // Listen for data from content.js
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === "libsDetected") {
            fetchVulnerabilities(message.libraries);
        }
    });

    function displayBrowserInfo(info) {
        // Simple heuristic for "outdated" chrome (current is approx 120+, let's say < 110 is old for this demo)
        // In reality we'd fetch from an API
        const isVulnerable = info.name === "Chrome" && parseInt(info.version) < 110;

        const html = `
        <div class="item-name">${info.name} ${info.version}</div>
        <div class="item-version">${isVulnerable ? "Potentially Information Exposure (Older Version)" : "Version appears recent"}</div>
        ${isVulnerable ? '<span class="vuln-badge">Update Recommended</span>' : ''}
      `;

        browserStatusDiv.innerHTML = html;
        browserStatusDiv.className = 'item-card ' + (isVulnerable ? 'warning' : 'safe');
    }

    async function fetchVulnerabilities(libraries) {
        statusContainer.classList.add('hidden');
        resultsSection.classList.remove('hidden');
        libraryResultsDiv.innerHTML = '';

        if (Object.keys(libraries).length === 0) {
            libraryResultsDiv.innerHTML = '<div class="item-card safe"><div class="item-name">No common libraries detected</div></div>';
            return;
        }

        const entries = Object.entries(libraries);

        // 1. Render all cards immediately with loading state
        entries.forEach(([lib, version]) => {
            const cardId = `lib-${lib}`;
            libraryResultsDiv.innerHTML += `
            <div id="${cardId}" class="item-card">
              <div class="item-name">${capitalize(lib)}</div>
              <div class="item-version">Version: ${version}</div>
              <div class="loader" style="width:16px; height:16px; border-width:2px; margin:0;"></div>
            </div>
          `;
        });

        // 2. Fetch vulnerabilities in parallel
        const fetchPromises = entries.map(async ([lib, version]) => {
            // Prepare OSV query
            // Ecosystem 'npm' is a safe bet for most frontend libs (jquery, react, vue, etc)
            const query = {
                version: version,
                package: {
                    name: lib.toLowerCase(),
                    ecosystem: 'npm'
                }
            };

            try {
                const response = await fetch('https://api.osv.dev/v1/query', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(query)
                });
                console.log(query, response);
                const data = await response.json();
                const cardId = `lib-${lib}`;
                updateLibraryCard(cardId, lib, version, data.vulns);

            } catch (error) {
                console.error("OSV API Error:", error);
                const cardId = `lib-${lib}`;
                const card = document.getElementById(cardId);
                if (card) {
                    card.className = 'item-card warning';
                    card.innerHTML += '<div class="vuln-badge" style="background:#f39c12">API Error</div>';
                }
            }
        });

        await Promise.all(fetchPromises);
    }

    function updateLibraryCard(cardId, lib, version, vulns) {
        const card = document.getElementById(cardId);
        if (!card) return;

        const isVulnerable = vulns && vulns.length > 0;
        card.className = `item-card ${isVulnerable ? 'vulnerable' : 'safe'}`;

        let html = `
        <div class="item-name">${capitalize(lib)}</div>
        <div class="item-version">Version: ${version}</div>
        ${isVulnerable ? '<span class="vuln-badge">Vulnerable</span>' : '<span style="color:#2ecc71; font-size:12px;">No known vulnerabilities</span>'}
      `;

        if (isVulnerable) {
            vulns.forEach(v => {
                // Prefer CVE ID if available, else OSV ID
                const cveId = v.aliases ? v.aliases.find(a => a.startsWith('CVE-')) : null;
                const displayId = cveId || v.id;
                const link = cveId ?
                    `https://www.cve.org/CVERecord?id=${cveId}` :
                    `https://osv.dev/vulnerability/${v.id}`;
                const summary = v.summary || v.details || "Vulnerability details";

                html += `
             <div class="cve-list">
               <a href="${link}" target="_blank" class="cve-item">
                 ${displayId} - ${summary.substring(0, 60)}...
               </a>
             </div>
           `;
            });
        }

        card.innerHTML = html;
    }

    function showError(msg) {
        statusContainer.classList.remove('hidden');
        statusContainer.innerHTML = `<p style="color:red">${msg}</p>`;
    }

    function getBrowserInfo(ua) {
        // Very basic UA parser
        let tem,
            M = ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
        if (/trident/i.test(M[1])) {
            tem = /\brv[ :]+(\d+)/g.exec(ua) || [];
            return { name: 'IE', version: (tem[1] || '') };
        }
        if (M[1] === 'Chrome') {
            tem = ua.match(/\b(OPR|Edge)\/(\d+)/);
            if (tem != null) return { name: tem[1].replace('OPR', 'Opera'), version: tem[2] };
        }
        M = M[2] ? [M[1], M[2]] : [navigator.appName, navigator.appVersion, '-?'];
        if ((tem = ua.match(/version\/(\d+)/i)) != null) M.splice(1, 1, tem[1]);
        return { name: M[0], version: M[1] };
    }

    function capitalize(s) {
        return s.charAt(0).toUpperCase() + s.slice(1);
    }
});
