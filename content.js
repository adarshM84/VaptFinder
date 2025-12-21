// Inject detector.js to access page context
function injectDetector() {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('detector.js');
    script.onload = function () {
        this.remove();
    };
    (document.head || document.documentElement).appendChild(script);
}

// Listen for messages from detector.js
if (!window.vaptListenerAdded) {
    window.addEventListener("message", function (event) {
        // We only accept messages from ourselves
        if (event.source != window) return;

        if (event.data.type && event.data.type == "VAPT_LIBS_DETECTED") {
            // Forward to popup/runtime
            try {
                chrome.runtime.sendMessage({
                    action: "libsDetected",
                    libraries: event.data.libraries
                });
            } catch (error) {
                // Check if context is invalidated
                if (error.message.includes("Extension context invalidated")) {
                    console.log("Context invalidated, ignoring message forwarding.");
                } else {
                    console.error("Error forwarding message:", error);
                }
            }
        }
    });
    window.vaptListenerAdded = true;
}

// Run injection
injectDetector();
