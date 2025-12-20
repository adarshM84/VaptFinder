// This script runs in the context of the webpage to access window variables
(function () {
    const results = {
        known: {},
        discovered: {}
    };

    /**
     * Rule-Based Definition for Known Libraries
     * Format: 
     * - name: Output key
     * - check: Function returning true/false or version string
     * - version: (Optional) Array of paths to check for version if 'check' returns true but not the version itself
     */
    const librarySignatures = [
        { name: "jquery", check: () => window.jQuery && window.jQuery.fn && window.jQuery.fn.jquery },
        { name: "react", check: () => window.__REACT_DEVTOOLS_GLOBAL_HOOK__ ? (window.React && window.React.version ? window.React.version : "Detected") : false },
        { name: "angular", check: () => window.angular && window.angular.version && window.angular.version.full },
        { name: "vue", check: () => window.Vue && window.Vue.version },
        { name: "lodash", check: () => window._ && window._.VERSION },
        { name: "backbone", check: () => window.Backbone && window.Backbone.VERSION },
        { name: "ember", check: () => window.Ember && window.Ember.VERSION },
        { name: "knockout", check: () => window.ko && window.ko.version },
        { name: "handlebars", check: () => window.Handlebars && window.Handlebars.VERSION },
        { name: "mustache", check: () => window.Mustache && window.Mustache.version },
        { name: "nextjs", check: () => window.__NEXT_DATA__ ? (window.__NEXT_DATA__.buildId || "Detected") : false },
        { name: "nuxtjs", check: () => window.__NUXT__ ? "Detected" : false },
        { name: "svelte", check: () => window.__svelte ? "Detected" : false },
        { name: "polymer", check: () => window.Polymer && window.Polymer.version },
        { name: "meteor", check: () => window.Meteor && window.Meteor.release },
        { name: "zepto", check: () => window.Zepto ? "Detected" : false },
        { name: "moment", check: () => window.moment && window.moment.version },
        { name: "socketio", check: () => window.io && window.io.version },
        { name: "modernizr", check: () => window.Modernizr && window.Modernizr._version },
        {
            name: "bootstrap",
            check: () => {
                if (window.bootstrap && window.bootstrap.Tooltip && window.bootstrap.Tooltip.VERSION) return window.bootstrap.Tooltip.VERSION;
                if (window.jQuery && window.jQuery.fn && window.jQuery.fn.tooltip && window.jQuery.fn.tooltip.Constructor && window.jQuery.fn.tooltip.Constructor.VERSION) return window.jQuery.fn.tooltip.Constructor.VERSION;
                return false;
            }
        },
        {
            name: "datatables",
            check: () => window.jQuery && window.jQuery.fn && window.jQuery.fn.DataTable && window.jQuery.fn.DataTable.version
        }
    ];

    // 1. Run Known Signatures
    librarySignatures.forEach(lib => {
        try {
            const result = lib.check();
            if (result) {
                results.known[lib.name] = result;
            }
        } catch (e) {
            // Safe execution
        }
    });

    // 2. Dynamic Auto-Discovery (Differential Global Analysis)
    // Create a clean iframe to get a baseline 'window' object
    try {
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        document.body.appendChild(iframe);

        // Wait for iframe to load slightly (synchronous in most cases for about:blank)
        const cleanWindow = iframe.contentWindow;
        const currentWindowKeys = Object.keys(window);
        const cleanWindowKeys = new Set(Object.keys(cleanWindow));

        // Filter for keys present in current window but NOT in clean window
        const customGlobals = currentWindowKeys.filter(key => !cleanWindowKeys.has(key));

        // Heuristics for version detection in objects
        const versionKeys = ['version', 'VERSION', 'Version', 'v', 'ver', 'buildId'];

        customGlobals.forEach(globalKey => {
            // Skip already detected libraries (prevent duplication) based on simple name match or if already in 'known'
            // Also skip internal browser/extension stuff starting with _ unless known

            const obj = window[globalKey];
            if (!obj || typeof obj !== 'object') return;

            // Try to find a version
            let version = null;
            for (const vKey of versionKeys) {
                if (obj[vKey] && (typeof obj[vKey] === 'string' || typeof obj[vKey] === 'number')) {
                    version = obj[vKey];
                    break;
                }
            }

            if (version) {
                // Avoid cluttering with things we already found in 'known' if the key name is obvious
                // But for now, let's report everything that looks interesting.
                // We add it to 'discovered' if it's not simply a reference to a known library we already found.
                // E.g., if we found 'jquery', and 'jQuery' global exists, we might double report, but that's okay for VAPT.
                results.discovered[globalKey] = version;
            }
        });

        document.body.removeChild(iframe);
    } catch (e) {
        console.error("VAPT Find: Auto-discovery failed", e);
    }

    // Merge for backward compatibility or keep separate structure
    // Sending a unified structure is often easier for the popup
    const finalPayload = { ...results.known, ...results.discovered };

    //console.log("VAPT Libraries Found:", finalPayload); // Debug
    window.postMessage({ type: "VAPT_LIBS_DETECTED", libraries: finalPayload }, "*");

})();
