/**
 * Dashboard functionality for the AI-Powered Scanner
 * Handles main dashboard operations, scan form, and result display
 */

document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const scanForm = document.getElementById('scan-form');
    const targetsInput = document.getElementById('targets');
    const scanTypeSelect = document.getElementById('scan-type');
    const customPortsContainer = document.querySelector('.custom-ports-container');
    const customPortsInput = document.getElementById('custom-ports');
    const scanStatus = document.getElementById('scan-status');
    const scanProgressContainer = document.getElementById('scan-progress-container');
    const scanProgressBar = document.getElementById('scan-progress');
    const progressText = document.getElementById('progress-text');
    const scanTimeElement = document.getElementById('scan-time');
    const liveResults = document.getElementById('live-results');
    const liveResultsPlaceholder = document.getElementById('live-results-placeholder');
    const resultsTableBody = document.getElementById('results-table-body');
    const viewFullResultsBtn = document.getElementById('view-full-results-btn');
    const aiInsights = document.getElementById('ai-insights');
    const aiAgentPlaceholder = document.getElementById('ai-agent-placeholder');
    const insightsList = document.getElementById('insights-list');
    const anomaliesContainer = document.getElementById('anomalies-container');
    const anomaliesList = document.getElementById('anomalies-list');
    const recentScansList = document.getElementById('recent-scans-list');
    const recentScansPlaceholder = document.getElementById('recent-scans-placeholder');
    
    // Current scan state
    let currentScanId = null;
    let scanStartTime = null;
    let scanProgressInterval = null;
    let scanResultsInterval = null;
    
    // Initialize
    initializeDashboard();
    
    /**
     * Initialize the dashboard
     */
    function initializeDashboard() {
        // Load scan history
        loadScanHistory();
        
        // Set up event listeners
        scanTypeSelect.addEventListener('change', toggleCustomPorts);
        scanForm.addEventListener('submit', handleScanSubmit);
        viewFullResultsBtn.addEventListener('click', viewFullResults);
        
        // Initialize custom ports toggle
        toggleCustomPorts();
    }
    
    /**
     * Toggle custom ports input visibility based on scan type
     */
    function toggleCustomPorts() {
        if (scanTypeSelect.value === 'custom') {
            customPortsContainer.classList.remove('d-none');
        } else {
            customPortsContainer.classList.add('d-none');
        }
    }
    
    /**
     * Handle scan form submission
     * @param {Event} event - Form submit event
     */
    function handleScanSubmit(event) {
        event.preventDefault();
        
        const targets = targetsInput.value.trim();
        if (!targets) {
            showAlert('Please enter at least one target', 'danger');
            return;
        }
        
        const scanType = scanTypeSelect.value;
        const customPorts = customPortsInput.value.trim();
        
        // Validate custom ports if scan type is custom
        if (scanType === 'custom' && !customPorts) {
            showAlert('Please enter at least one port for custom scan', 'danger');
            return;
        }
        
        // Start the scan
        startScan(targets, scanType, customPorts);
    }
    
    /**
     * Start a new network scan
     * @param {string} targets - Target IPs or hostnames
     * @param {string} scanType - Type of scan
     * @param {string} customPorts - Custom ports (optional)
     */
    function startScan(targets, scanType, customPorts) {
        // Update UI to scanning state
        updateScanningState();
        
        // Prepare request payload
        const payload = {
            targets: targets,
            scan_type: scanType
        };
        
        if (scanType === 'custom' && customPorts) {
            payload.custom_ports = customPorts;
        }
        
        // Send scan request
        fetch('/api/scan', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                // Store the scan ID and start tracking progress
                currentScanId = data.scan_id;
                scanStartTime = Date.now();
                
                // Set up polling for scan progress
                setupScanProgressPolling();
                
                // Show success message
                showAlert(`Scan started with ID: ${data.scan_id}`, 'success');
            } else {
                // Show error and reset UI
                showAlert(`Error: ${data.message}`, 'danger');
                resetScanUI();
            }
        })
        .catch(error => {
            console.error('Error starting scan:', error);
            showAlert('Failed to start scan. Please try again.', 'danger');
            resetScanUI();
        });
    }
    
    /**
     * Set up polling for scan progress
     */
    function setupScanProgressPolling() {
        // Clear any existing intervals
        if (scanProgressInterval) clearInterval(scanProgressInterval);
        if (scanResultsInterval) clearInterval(scanResultsInterval);
        
        // Poll for scan progress every 1 second
        scanProgressInterval = setInterval(() => {
            if (!currentScanId) return;
            
            fetch(`/api/scan/${currentScanId}/status`)
                .then(response => response.json())
                .then(data => {
                    if (data.status === 'error') {
                        clearInterval(scanProgressInterval);
                        showAlert(`Error: ${data.message}`, 'danger');
                        return;
                    }
                    
                    // Update progress bar
                    updateProgressBar(data.progress);
                    
                    // Update elapsed time
                    updateElapsedTime();
                    
                    // Check if scan is complete
                    if (data.status === 'completed') {
                        scanComplete();
                    }
                })
                .catch(error => {
                    console.error('Error getting scan status:', error);
                });
        }, 1000);
        
        // Poll for scan results every 2 seconds
        scanResultsInterval = setInterval(() => {
            if (!currentScanId) return;
            
            fetch(`/api/scan/${currentScanId}/results`)
                .then(response => response.json())
                .then(data => {
                    updateLiveResults(data);
                })
                .catch(error => {
                    console.error('Error getting scan results:', error);
                });
        }, 2000);
    }
    
    /**
     * Handle scan completion
     */
    function scanComplete() {
        // Clear intervals
        if (scanProgressInterval) clearInterval(scanProgressInterval);
        if (scanResultsInterval) clearInterval(scanResultsInterval);
        
        // Update UI
        scanStatus.textContent = 'Completed';
        scanStatus.className = 'badge bg-success';
        scanProgressBar.style.width = '100%';
        progressText.textContent = '100%';
        
        // Enable view full results button
        viewFullResultsBtn.classList.remove('d-none');
        
        // Reload scan history
        loadScanHistory();
        
        // Fetch final results
        fetch(`/api/scan/${currentScanId}/results`)
            .then(response => response.json())
            .then(data => {
                updateLiveResults(data);
                displayAIInsights(data);
            })
            .catch(error => {
                console.error('Error getting final scan results:', error);
            });
    }
    
    /**
     * Update the progress bar
     * @param {number} progress - Progress percentage
     */
    function updateProgressBar(progress) {
        // Ensure progress is a number and between 0-100
        const progressValue = Math.min(Math.max(parseFloat(progress) || 0, 0), 100);
        
        // Update progress bar
        scanProgressBar.style.width = `${progressValue}%`;
        progressText.textContent = `${Math.round(progressValue)}%`;
    }
    
    /**
     * Update elapsed time display
     */
    function updateElapsedTime() {
        if (!scanStartTime) return;
        
        const elapsed = Math.floor((Date.now() - scanStartTime) / 1000);
        scanTimeElement.textContent = `Time: ${elapsed}s`;
    }
    
    /**
     * Update live results display
     * @param {Object} data - Scan results data
     */
    function updateLiveResults(data) {
        if (!data || !data.results) return;
        
        // Show results and hide placeholder
        liveResults.classList.remove('d-none');
        liveResultsPlaceholder.classList.add('d-none');
        
        // Clear previous results
        resultsTableBody.innerHTML = '';
        
        // Track open ports for sorting
        const openPorts = [];
        
        // Process results
        for (const target in data.results) {
            const targetData = data.results[target];
            for (const port in targetData.ports) {
                const portData = targetData.ports[port];
                
                // Add to open ports array if open
                if (portData.status === 'open') {
                    openPorts.push({
                        target,
                        port,
                        service: portData.service
                    });
                }
            }
        }
        
        // Sort open ports first
        openPorts.sort((a, b) => a.target.localeCompare(b.target) || parseInt(a.port) - parseInt(b.port));
        
        // Add open ports to the table
        openPorts.forEach(item => {
            addResultRow(item.target, item.port, 'open', item.service);
        });
        
        // If no open ports found, add a message
        if (openPorts.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td colspan="4" class="text-center">No open ports found</td>
            `;
            resultsTableBody.appendChild(row);
        }
    }
    
    /**
     * Add a result row to the table
     * @param {string} target - Target IP or hostname
     * @param {string|number} port - Port number
     * @param {string} status - Port status
     * @param {string} service - Service name
     */
    function addResultRow(target, port, status, service) {
        const row = document.createElement('tr');
        
        // Set status class
        const statusClass = status === 'open' ? 'port-open' : 
                           (status === 'closed' ? 'port-closed' : 'port-filtered');
        
        row.innerHTML = `
            <td class="truncate">${target}</td>
            <td>${port}</td>
            <td class="${statusClass}">${status}</td>
            <td>${service}</td>
        `;
        
        resultsTableBody.appendChild(row);
    }
    
    /**
     * Display AI insights from scan results
     * @param {Object} data - Scan results data
     */
    function displayAIInsights(data) {
        if (!data || !data.insights) return;
        
        // Show insights and hide placeholder
        aiInsights.classList.remove('d-none');
        aiAgentPlaceholder.classList.add('d-none');
        
        // Clear previous insights
        insightsList.innerHTML = '';
        anomaliesList.innerHTML = '';
        
        // Process insights
        data.insights.forEach(insight => {
            switch (insight.type) {
                case 'statistics':
                    displayStatisticsInsight(insight);
                    break;
                case 'common_services':
                    displayServicesInsight(insight);
                    break;
                case 'security_recommendations':
                    displayRecommendationsInsight(insight);
                    break;
                case 'anomalies':
                    displayAnomaliesInsight(insight);
                    break;
            }
        });
    }
    
    /**
     * Display statistics insight
     * @param {Object} insight - Statistics insight data
     */
    function displayStatisticsInsight(insight) {
        const statsHTML = `
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <span>Total Targets</span>
                <span class="badge bg-primary rounded-pill">${insight.total_targets}</span>
            </li>
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <span>Open Ports</span>
                <span class="badge bg-success rounded-pill">${insight.open_ports}</span>
            </li>
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <span>Closed Ports</span>
                <span class="badge bg-danger rounded-pill">${insight.closed_ports}</span>
            </li>
        `;
        
        insightsList.innerHTML += statsHTML;
    }
    
    /**
     * Display common services insight
     * @param {Object} insight - Common services insight data
     */
    function displayServicesInsight(insight) {
        if (!insight.services || insight.services.length === 0) return;
        
        let servicesHTML = '';
        insight.services.forEach(service => {
            servicesHTML += `
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    <span>${service.service}</span>
                    <span class="badge bg-info rounded-pill">${service.count}</span>
                </li>
            `;
        });
        
        insightsList.innerHTML += servicesHTML;
    }
    
    /**
     * Display security recommendations insight
     * @param {Object} insight - Security recommendations insight data
     */
    function displayRecommendationsInsight(insight) {
        if (!insight.recommendations || insight.recommendations.length === 0) return;
        
        // Show a summary in the insights list
        insightsList.innerHTML += `
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <span>Security Recommendations</span>
                <span class="badge bg-warning rounded-pill">${insight.recommendations.length}</span>
            </li>
        `;
        
        // Add a few examples
        insight.recommendations.slice(0, 2).forEach(recommendation => {
            insightsList.innerHTML += `
                <li class="list-group-item">
                    <small class="d-block text-warning">${recommendation.service}: ${recommendation.description}</small>
                </li>
            `;
        });
    }
    
    /**
     * Display anomalies insight
     * @param {Object} insight - Anomalies insight data
     */
    function displayAnomaliesInsight(insight) {
        if (!insight.details || insight.details.length === 0) return;
        
        // Show anomalies container
        anomaliesContainer.classList.remove('d-none');
        
        // Add anomalies to the list
        insight.details.forEach(anomaly => {
            const severityClass = `severity-${anomaly.severity}`;
            
            anomaliesList.innerHTML += `
                <li class="list-group-item">
                    <div class="d-flex align-items-center mb-1">
                        <span class="badge ${severityClass} me-2">${anomaly.severity}</span>
                        <strong>${anomaly.type.replace('_', ' ')}</strong>
                    </div>
                    <small class="d-block">${anomaly.description}</small>
                    <small class="d-block text-muted">Target: ${anomaly.target || 'Multiple'}</small>
                </li>
            `;
        });
    }
    
    /**
     * Load scan history
     */
    function loadScanHistory() {
        fetch('/api/scan-history')
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success' && data.history && data.history.length > 0) {
                    displayScanHistory(data.history);
                } else {
                    // Show placeholder if no history
                    recentScansPlaceholder.classList.remove('d-none');
                    recentScansList.classList.add('d-none');
                }
            })
            .catch(error => {
                console.error('Error loading scan history:', error);
                recentScansPlaceholder.classList.remove('d-none');
                recentScansList.classList.add('d-none');
            });
    }
    
    /**
     * Display scan history
     * @param {Array} history - Array of scan history items
     */
    function displayScanHistory(history) {
        // Show list and hide placeholder
        recentScansPlaceholder.classList.add('d-none');
        recentScansList.classList.remove('d-none');
        
        // Clear previous history
        recentScansList.innerHTML = '';
        
        // Display up to 5 most recent scans
        history.slice(0, 5).forEach(item => {
            const targets = Array.isArray(item.targets) 
                ? item.targets.join(', ') 
                : item.targets || 'Unknown';
            
            recentScansList.innerHTML += `
                <li class="list-group-item">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <small class="text-muted">${item.datetime}</small>
                            <div class="mb-1">Targets: <span class="text-truncate">${targets}</span></div>
                            <div class="d-flex">
                                <span class="badge bg-success me-2">${item.open_ports} open</span>
                                <span class="badge bg-secondary">${item.target_count} targets</span>
                            </div>
                        </div>
                        <a href="/results?scan_id=${item.scan_id}" class="btn btn-sm btn-outline-primary">
                            View
                        </a>
                    </div>
                </li>
            `;
        });
    }
    
    /**
     * View full scan results
     */
    function viewFullResults() {
        if (currentScanId) {
            window.location.href = `/results?scan_id=${currentScanId}`;
        }
    }
    
    /**
     * Update UI to scanning state
     */
    function updateScanningState() {
        // Update scan status
        scanStatus.textContent = 'Scanning';
        scanStatus.className = 'badge bg-warning';
        
        // Show progress container
        scanProgressContainer.classList.remove('d-none');
        
        // Reset progress
        scanProgressBar.style.width = '0%';
        progressText.textContent = '0%';
        scanTimeElement.textContent = 'Time: 0s';
        
        // Hide view results button
        viewFullResultsBtn.classList.add('d-none');
        
        // Reset AI insights
        aiInsights.classList.add('d-none');
        aiAgentPlaceholder.classList.remove('d-none');
        
        // Reset anomalies
        anomaliesContainer.classList.add('d-none');
    }
    
    /**
     * Reset scan UI to initial state
     */
    function resetScanUI() {
        // Reset scan status
        scanStatus.textContent = 'Ready';
        scanStatus.className = 'badge bg-info';
        
        // Hide progress container
        scanProgressContainer.classList.add('d-none');
        
        // Clear intervals
        if (scanProgressInterval) clearInterval(scanProgressInterval);
        if (scanResultsInterval) clearInterval(scanResultsInterval);
        
        // Reset current scan
        currentScanId = null;
        scanStartTime = null;
    }
    
    /**
     * Show alert message
     * @param {string} message - Alert message
     * @param {string} type - Alert type (success, danger, warning, info)
     */
    function showAlert(message, type) {
        // Create alert element
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        
        // Insert alert before the scan form
        scanForm.parentNode.insertBefore(alert, scanForm);
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            if (alert.parentNode) {
                alert.classList.remove('show');
                setTimeout(() => {
                    if (alert.parentNode) alert.parentNode.removeChild(alert);
                }, 150);
            }
        }, 5000);
    }
});
