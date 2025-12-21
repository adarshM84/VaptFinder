document.addEventListener('DOMContentLoaded', () => {
    // --- UI Elements ---
    // Tabs
    const tabs = document.querySelectorAll('.nav-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    // Scanner
    const statusContainer = document.getElementById('status-container');
    const resultsSection = document.getElementById('results');
    const browserStatusDiv = document.getElementById('browser-status');
    const libraryResultsDiv = document.getElementById('library-results');
    const scanBtn = document.getElementById('scan-btn');

    // Product Search
    const prodNameInput = document.getElementById('prod-name');
    const prodVersionInput = document.getElementById('prod-version');
    const prodSearchBtn = document.getElementById('prod-search-btn');
    const prodResultsDiv = document.getElementById('product-results');

    // CVE Search
    const cveIdInput = document.getElementById('cve-id');
    const cveSearchBtn = document.getElementById('cve-search-btn');
    const cveResultsDiv = document.getElementById('cve-results');

    // Report
    const reportBtn = document.getElementById('report-btn');
    const reportModal = document.getElementById('report-modal');
    const reportContent = document.getElementById('report-content');
    const closeModal = document.querySelector('.close-modal');


    // --- Event Listeners ---

    // Tab Switching
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs and contents
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            // Add active class to clicked tab and target content
            tab.classList.add('active');
            const targetId = tab.dataset.tab;
            document.getElementById(targetId).classList.add('active');
        });
    });

    // Scanner
    scanBtn.addEventListener('click', () => {
        resultsSection.classList.add('hidden');
        statusContainer.classList.remove('hidden');
        libraryResultsDiv.innerHTML = '';
        scanLibraries();
    });

    // Product Search
    prodSearchBtn.addEventListener('click', handleProductSearch);

    // CVE Search
    cveSearchBtn.addEventListener('click', handleCveSearch);

    // Report
    reportBtn.addEventListener('click', generateReport);
    closeModal.addEventListener('click', () => reportModal.classList.add('hidden'));
    window.addEventListener('click', (e) => {
        if (e.target === reportModal) reportModal.classList.add('hidden');
    });

    // --- Initial Actions ---
    // 1. Check Browser Version
    const userAgent = navigator.userAgent;
    const browserInfo = getBrowserInfo(userAgent);
    displayBrowserInfo(browserInfo);

    // 2. Scan for libraries (auto-scan on load)
    scanLibraries();


    // --- Functions: Scanner ---

    function scanLibraries() {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            const activeTab = tabs[0];
            if (!activeTab || !activeTab.url || activeTab.url.startsWith('chrome://')) {
                showError("Cannot scan this page.");
                return;
            }

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

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === "libsDetected") {
            fetchVulnerabilities(message.libraries);
        }
    });

    function displayBrowserInfo(info) {
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

        const fetchPromises = entries.map(async ([lib, version]) => {
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
        ${isVulnerable ? '<span class="vuln-badge">Vulnerable</span>' : '<span style="color:var(--success-color); font-size:12px;">No known vulnerabilities</span>'}
      `;

        if (isVulnerable) {
            vulns.forEach(v => {
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

    // --- Functions: Product Search ---

    async function handleProductSearch() {
        const name = prodNameInput.value.trim();
        const version = prodVersionInput.value.trim();

        if (!name || !version) {
            prodResultsDiv.innerHTML = '<p style="color:red">Please enter both product name and version.</p>';
            return;
        }

        prodResultsDiv.innerHTML = '<div class="loader"></div>';

        const query = {
            version: version,
            package: {
                name: name.toLowerCase(),
                ecosystem: 'npm' // Defaulting to npm for this demo as requested, but could be selectable
            }
        };

        try {
            const response = await fetch('https://api.osv.dev/v1/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(query)
            });
            const data = await response.json();
            displayProductResults(name, version, data.vulns);

        } catch (error) {
            prodResultsDiv.innerHTML = `<p style="color:red">Error: ${error.message}</p>`;
        }
    }

    function displayProductResults(name, version, vulns) {
        if (!vulns || vulns.length === 0) {
            prodResultsDiv.innerHTML = `
                <div class="item-card safe">
                    <div class="item-name">${capitalize(name)} v${version}</div>
                    <div style="color:var(--success-color); font-size:12px;">No known vulnerabilities found.</div>
                </div>`;
            return;
        }

        let html = '';
        vulns.forEach(v => {
            const cveId = v.aliases ? v.aliases.find(a => a.startsWith('CVE-')) : v.id;
            html += `
                <div class="item-card vulnerable">
                    <div class="item-name">${cveId}</div>
                    <div class="item-version">${v.summary || "No summary available"}</div>
                    <div class="cve-list">
                         <a href="https://osv.dev/vulnerability/${v.id}" target="_blank" class="cve-item">View Details on OSV</a>
                    </div>
                </div>
             `;
        });
        prodResultsDiv.innerHTML = `<p>Found ${vulns.length} vulnerabilities:</p>` + html;
    }


    // --- Functions: CVE Search ---

    async function handleCveSearch() {
        const cveId = cveIdInput.value.trim();
        if (!cveId) {
            cveResultsDiv.innerHTML = '<p style="color:red">Please enter a CVE ID.</p>';
            return;
        }

        cveResultsDiv.innerHTML = '<div class="loader"></div>';

        // OSV API uses /v1/vulns/{id} but prefers OSV IDs (GHSA-..., etc)
        // However, it can resolve CVE IDs if they are indexed.
        // Let's try fetching directly.

        try {
            // We'll try query by alias via text search if direct ID lookup fails? 
            // Actually, OSV's `v1/vulns/{id}` endpoint *expects* an OSV ID, but sometimes works with CVEs?
            // Documentation says "The ID of the vulnerability to retrieve."
            // Let's try the NVD API if OSV fails or returns nothing useful for a CVE ID, 
            // OR just link to it. The user wants to "Fetch and display" details.
            // Accessing NVD API requires an API key for reliability, otherwise rate limits are strict.
            // Circl.lu is a good alternative for CVEs.

            const url = `https://cve.circl.lu/api/cve/${cveId}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error("CVE not found or API error");

            const data = await response.json();
            if (!data) {
                cveResultsDiv.innerHTML = '<p>CVE not found.</p>';
                return;
            }

            displayCveDetails(data);

        } catch (error) {
            // Fallback: try OSV just in case? Or just show error.
            console.error(error);
            cveResultsDiv.innerHTML = `<p style="color:red">Error fetching CVE details. Please verify the ID.</p>`;
        }
    }

    function displayCveDetails(data) {
        if (!data.id) {
            cveResultsDiv.innerHTML = '<p>No data found for this CVE.</p>';
            return;
        }

        const html = `
            <div class="item-card warning">
                <div class="item-name">${data.id}</div>
                <div class="item-version">Published: ${data.Published}</div>
                <p style="font-size:13px; margin-top:8px;">${data.summary}</p>
                
                ${data.cvss ? `<div class="vuln-badge" style="background:${getSeverityColor(data.cvss)}">CVSS: ${data.cvss}</div>` : ''}
                
                <div class="cve-list">
                    <strong>References:</strong>
                    ${data.references.slice(0, 3).map(ref => `<a href="${ref}" target="_blank" class="cve-item">${ref.substring(0, 40)}...</a>`).join('')}
                </div>
            </div>
        `;
        cveResultsDiv.innerHTML = html;
    }

    function getSeverityColor(score) {
        if (score >= 9.0) return '#ef4444'; // Critical
        if (score >= 7.0) return '#f97316'; // High
        if (score >= 4.0) return '#f59e0b'; // Medium
        return '#10b981'; // Low
    }


    // --- Functions: Report Generation ---
    function generateReport() {
        const browserInfo = document.getElementById('browser-status').innerText;
        const libInfo = document.getElementById('library-results').innerText;

        const reportText = `
            <h4>VaptFind Scan Report</h4>
            <hr>
            <h5>Browser Status</h5>
            <p>${browserInfo.replace(/\n/g, '<br>')}</p>
            <hr>
            <h5>Library Scan Results</h5>
            <p>${libInfo.replace(/\n/g, '<br>') || "No libraries scanned yet."}</p>
            <hr>
            <p style="font-size:12px; color:#666;">Generated by VaptFind</p>
        `;

        reportContent.innerHTML = reportText;
        reportModal.classList.remove('hidden');
    }

    // --- Utilities ---
    function getBrowserInfo(ua) {
        let tem, M = ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
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
