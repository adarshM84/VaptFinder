// This script runs in the context of the webpage to access window variables
(function () {
    const libraries = {};

    // 1. Detect jQuery
    if (window.jQuery && window.jQuery.fn && window.jQuery.fn.jquery) {
        libraries.jquery = window.jQuery.fn.jquery;
    }

    // 2. Detect React (Often hidden, but sometimes visible via devtools hooks or raw window objects if checking specifically)
    // Simple check for React Developer Tools hook
    if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
        // Exact version is hard to get without deep diving, usually just presence or we try to find a root
        libraries.react = "Detected";
        // If we can find a version attached to a root:
        // This is unreliable in production builds, but we can try common spots
        if (window.React && window.React.version) {
            libraries.react = window.React.version;
        }
    }

    // 3. Detect Angular
    if (window.angular && window.angular.version && window.angular.version.full) {
        libraries.angular = window.angular.version.full;
    }

    // 4. Detect Vue
    if (window.Vue && window.Vue.version) {
        libraries.vue = window.Vue.version;
    }

    // 5. Detect Lodash
    if (window._ && window._.VERSION) {
        libraries.lodash = window._.VERSION;
    }

    // 6. Detect Bootstrap (JS)
    // Bootstrap 5
    if (window.bootstrap && window.bootstrap.Tooltip && window.bootstrap.Tooltip.VERSION) {
        libraries.bootstrap = window.bootstrap.Tooltip.VERSION;
    }
    // Bootstrap 4 (often on $)
    else if (window.jQuery && window.jQuery.fn && window.jQuery.fn.tooltip && window.jQuery.fn.tooltip.Constructor && window.jQuery.fn.tooltip.Constructor.VERSION) {
        libraries.bootstrap = window.jQuery.fn.tooltip.Constructor.VERSION;
    }

    window.postMessage({ type: "VAPT_LIBS_DETECTED", libraries: libraries }, "*");
})();
