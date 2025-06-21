/**
 * Scanner interface functionality
 * Handles communication between the UI and the scanner API
 */

document.addEventListener('DOMContentLoaded', function() {
    // API endpoints
    const API_ENDPOINTS = {
        SCAN: '/api/scan',
        SCAN_STATUS: '/api/scan/{scan_id}/status',
        SCAN_RESULTS: '/api/scan/{scan_id}/results',
        VOICE_COMMAND: '/api/voice-command',
        TEXT_COMMAND: '/api/text-command',
        SCAN_TYPES: '/api/scan-types',
        SCAN_HISTORY: '/api/scan-history'
    };
    
    // Cache for scan types
    let scanTypesCache = null;
    
    /**
     * Load available scan types
     * @returns {Promise} - Promise that resolves with scan types
     */
    function loadScanTypes() {
        // Return cached value if available
        if (scanTypesCache) {
            return Promise.resolve(scanTypesCache);
        }
        
        return fetch(API_ENDPOINTS.SCAN_TYPES)
            .then(response => response.json())
            .then(data => {
                scanTypesCache = data;
                return data;
            })
            .catch(error => {
                console.error('Error loading scan types:', error);
                return {};
            });
    }
    
    /**
     * Start a new scan
     * @param {string} targets - Target IPs or hostnames
     * @param {string} scanType - Type of scan
     * @param {string} customPorts - Custom ports (optional)
     * @returns {Promise} - Promise that resolves with scan response
     */
    function startScan(targets, scanType, customPorts) {
        const payload = {
            targets: targets,
            scan_type: scanType
        };
        
        if (scanType === 'custom' && customPorts) {
            payload.custom_ports = customPorts;
        }
        
        return fetch(API_ENDPOINTS.SCAN, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        })
        .then(response => response.json());
    }
    
    /**
     * Get scan status
     * @param {string} scanId - The ID of the scan
     * @returns {Promise} - Promise that resolves with scan status
     */
    function getScanStatus(scanId) {
        const endpoint = API_ENDPOINTS.SCAN_STATUS.replace('{scan_id}', scanId);
        
        return fetch(endpoint)
            .then(response => response.json());
    }
    
    /**
     * Get scan results
     * @param {string} scanId - The ID of the scan
     * @returns {Promise} - Promise that resolves with scan results
     */
    function getScanResults(scanId) {
        const endpoint = API_ENDPOINTS.SCAN_RESULTS.replace('{scan_id}', scanId);
        
        return fetch(endpoint)
            .then(response => response.json());
    }
    
    /**
     * Process voice command
     * @param {Blob} audioBlob - Audio blob to process
     * @returns {Promise} - Promise that resolves with voice command response
     */
    function processVoiceCommand(audioBlob) {
        const formData = new FormData();
        formData.append('audio', audioBlob);
        
        return fetch(API_ENDPOINTS.VOICE_COMMAND, {
            method: 'POST',
            body: formData
        })
        .then(response => response.json());
    }
    
    /**
     * Process text command
     * @param {string} command - Text command to process
     * @returns {Promise} - Promise that resolves with text command response
     */
    function processTextCommand(command) {
        return fetch(API_ENDPOINTS.TEXT_COMMAND, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ command: command })
        })
        .then(response => response.json());
    }
    
    /**
     * Get scan history
     * @returns {Promise} - Promise that resolves with scan history
     */
    function getScanHistory() {
        return fetch(API_ENDPOINTS.SCAN_HISTORY)
            .then(response => response.json());
    }
    
    /**
     * Check if scan is running
     * @param {string} scanId - Scan ID to check
     * @returns {Promise<boolean>} - Promise that resolves with boolean indicating if scan is running
     */
    function isScanRunning(scanId) {
        return getScanStatus(scanId)
            .then(status => {
                return status.status === 'running';
            })
            .catch(() => {
                return false;
            });
    }
    
    /**
     * Wait for scan to complete
     * @param {string} scanId - Scan ID to wait for
     * @param {function} progressCallback - Callback for progress updates
     * @param {number} interval - Polling interval in ms
     * @returns {Promise} - Promise that resolves when scan completes
     */
    function waitForScanCompletion(scanId, progressCallback, interval = 1000) {
        return new Promise((resolve, reject) => {
            const checkStatus = () => {
                getScanStatus(scanId)
                    .then(status => {
                        if (progressCallback) {
                            progressCallback(status);
                        }
                        
                        if (status.status === 'completed') {
                            resolve(status);
                        } else if (status.status === 'error') {
                            reject(new Error(status.error || 'Scan failed'));
                        } else {
                            setTimeout(checkStatus, interval);
                        }
                    })
                    .catch(error => {
                        reject(error);
                    });
            };
            
            checkStatus();
        });
    }
    
    /**
     * Format scan results for display
     * @param {Object} results - Raw scan results
     * @returns {Object} - Formatted results for UI
     */
    function formatScanResults(results) {
        if (!results || !results.results) {
            return {
                summary: {
                    total_targets: 0,
                    open_ports: 0,
                    closed_ports: 0,
                    duration: 'N/A'
                },
                open_ports: [],
                insights: []
            };
        }
        
        // Count open ports
        let openPorts = 0;
        let closedPorts = 0;
        const openPortsList = [];
        
        for (const target in results.results) {
            for (const port in results.results[target].ports) {
                const portData = results.results[target].ports[port];
                
                if (portData.status === 'open') {
                    openPorts++;
                    openPortsList.push({
                        target: target,
                        port: port,
                        service: portData.service
                    });
                } else if (portData.status === 'closed') {
                    closedPorts++;
                }
            }
        }
        
        // Format summary
        const summary = {
            total_targets: Array.isArray(results.targets) ? results.targets.length : 1,
            open_ports: openPorts,
            closed_ports: closedPorts,
            duration: results.duration ? `${results.duration.toFixed(2)}s` : 'N/A'
        };
        
        return {
            summary: summary,
            open_ports: openPortsList,
            insights: results.insights || []
        };
    }
    
    // Make scanner interface methods available globally
    window.ScannerInterface = {
        loadScanTypes,
        startScan,
        getScanStatus,
        getScanResults,
        processVoiceCommand,
        processTextCommand,
        getScanHistory,
        isScanRunning,
        waitForScanCompletion,
        formatScanResults
    };
});
