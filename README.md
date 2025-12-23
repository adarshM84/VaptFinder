# VaptFinder

**🛡️ VaptFinder** is a lightweight, privacy-focused **Chrome Extension** designed to help developers and security enthusiasts quickly identify potential vulnerabilities in web technologies.

### 🚀 Key Features

1. **🔍 Passive Scan**
   Automatically scans the current browser tab to detect commonly used JavaScript libraries (such as **React**, **jQuery**, **Lodash**, etc.) and checks whether the identified versions have any known vulnerabilities.

2. **📦 Product Lookup**
   Enables manual vulnerability lookups for software packages across multiple ecosystems, including **npm**, **PyPI**, **Maven**, **Go**, and more.

### 🌐 Download from Chrome Web Store

👉 **[VaptFinder – Vulnerability Finder](https://chromewebstore.google.com/detail/vaptfinder-vulnerability/dohdndfnnomgnjadhfflijaheaanafoo?authuser=0&hl=en-GB)**

🔒 **Privacy-first**, ⚡ **lightweight**, and 🎯 **developer-friendly** — VaptFinder helps you stay informed about potential security risks with ease.

## Features

-   **Automatic Library Detection**: Scans the DOM for popular libraries and determines their version.
-   **Vulnerability Database**: Queries the **OSV.dev** (Open Source Vulnerabilities) API for real-time vulnerability data.
-   **Manual Search**: Search for any product/package name and version to check its security status.
-   **Multi-Ecosystem Support**: Supports npm, PyPI, Maven, Go, NuGet, RubyGems, Packagist, crates.io, and Linux distributions.
-   **Report Generation**: Generate and download a PNG report of the scan results.
-   **Browser Status**: Checks if your generic browser version is potentially outdated (basic check).

## Privacy & External Communications

VaptFinder is designed with privacy in mind. It does **not** track you, uses no analytics, and sends data **only** when necessary to perform a vulnerability check.

### External API Usage
The extension communicates with **one** external service:

*   **OSV.dev (`https://api.osv.dev/v1/query`)**
    *   **Purpose**: To check if a specific package version has known vulnerabilities.
    *   **Data Sent**:
        *   Package Name (e.g., `react`)
        *   Package Version (e.g., `16.8.0`)
        *   Ecosystem (e.g., `npm`)
    *   **When**:
        *   Automatically when a library is detected on a webpage.
        *   Manually when you click "Check Vulnerabilities" in the Product Lookup tab.

api.osv.dev is a distributed vulnerability database for Open Source <a href="https://osv.dev/" target="_blank">OSV</a>.

**No other external calls are made.** The extension does not collect browsing history or send page URLs to any server.

## Installation

### From Source (Developer Mode)

1.  Clone or download this repository.
2.  Open Chrome and navigate to `chrome://extensions/`.
3.  Toggle **Developer mode** in the top right corner.
4.  Click **Load unpacked**.
5.  Select the folder containing this project (where `manifest.json` is located).

## Usage

1.  **Navigate** to any website.
2.  **Click** the VaptFinder extension icon.
3.  **Dashboard**: View detected libraries and their vulnerability status instantly.
4.  **Product Lookup**: Switch tabs to manually check any package you are interested in.
5.  **Report**: Click "Generate Report" to save a snapshot of your findings.

## License
[MIT](LICENSE)