/**
 * Visualization functionality for scan results
 * Handles results page, charts, and detailed scan result display
 */

document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const resultsLoading = document.getElementById('results-loading');
    const noResults = document.getElementById('no-results');
    const resultsContainer = document.getElementById('results-container');
    const totalTargetsEl = document.getElementById('total-targets');
    const openPortsEl = document.getElementById('open-ports');
    const scanDurationEl = document.getElementById('scan-duration');
    const servicesChartEl = document.getElementById('services-chart');
    const fullResultsTable = document.getElementById('full-results-table');
    const statisticsList = document.getElementById('statistics-list');
    const commonServicesList = document.getElementById('common-services-list');
    const securityRecommendationsAccordion = document.getElementById('security-recommendations-accordion');
    const anomaliesAccordion = document.getElementById('anomalies-accordion');
    const anomaliesDetailsContainer = document.getElementById('anomalies-details-container');
    const scanIdEl = document.getElementById('scan-id');
    const startTimeEl = document.getElementById('start-time');
    const endTimeEl = document.getElementById('end-time');
    const scanTypeInfoEl = document.getElementById('scan-type-info');
    const portsScannedEl = document.getElementById('ports-scanned');
    
    // Charts
    let servicesChart = null;
    
    // Get scan ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const scanId = urlParams.get('scan_id');
    
    // Initialize
    initializeResultsPage();
    
    /**
     * Initialize the results page
     */
    function initializeResultsPage() {
        if (!scanId) {
            showNoResults("No scan ID provided");
            return;
        }
        
        // Load scan results
        loadScanResults(scanId);
    }
    
    /**
     * Load scan results from the API
     * @param {string} scanId - The ID of the scan to load
     */
    function loadScanResults(scanId) {
        fetch(`/api/scan/${scanId}/results`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data && data.results) {
                    displayScanResults(data);
                } else if (data && data.status === 'error') {
                    showNoResults(data.message || "Failed to load scan results");
                } else {
                    showNoResults("Invalid scan results format");
                }
            })
            .catch(error => {
                console.error('Error loading scan results:', error);
                showNoResults("Error loading scan results");
            });
    }
    
    /**
     * Show message when no results are available
     * @param {string} message - Error message to display
     */
    function showNoResults(message) {
        resultsLoading.classList.add('d-none');
        noResults.classList.remove('d-none');
        resultsContainer.classList.add('d-none');
        
        // Add message to no results element
        const messageEl = noResults.querySelector('p');
        if (messageEl) {
            messageEl.textContent = message || "No scan results found. Please run a scan first.";
        }
    }
    
    /**
     * Display scan results
     * @param {Object} data - The scan results data
     */
    function displayScanResults(data) {
        // Hide loading and show results
        resultsLoading.classList.add('d-none');
        noResults.classList.add('d-none');
        resultsContainer.classList.remove('d-none');
        
        // Display summary metrics
        displaySummaryMetrics(data);
        
        // Display scan details
        displayScanDetails(data);
        
        // Display results table
        displayResultsTable(data);
        
        // Display services chart
        createServicesChart(data);
        
        // Display AI insights
        displayAIInsights(data);
    }
    
    /**
     * Display summary metrics
     * @param {Object} data - The scan results data
     */
    function displaySummaryMetrics(data) {
        // Count total targets
        const targetCount = Array.isArray(data.targets) ? data.targets.length : 1;
        totalTargetsEl.textContent = targetCount;
        
        // Count open ports
        let openPortsCount = 0;
        for (const target in data.results) {
            for (const port in data.results[target].ports) {
                if (data.results[target].ports[port].status === 'open') {
                    openPortsCount++;
                }
            }
        }
        openPortsEl.textContent = openPortsCount;
        
        // Format scan duration
        if (data.duration) {
            const duration = data.duration.toFixed(2);
            scanDurationEl.textContent = `${duration}s`;
        } else {
            scanDurationEl.textContent = 'N/A';
        }
    }
    
    /**
     * Display scan details
     * @param {Object} data - The scan results data
     */
    function displayScanDetails(data) {
        // Scan ID
        scanIdEl.textContent = data.scan_id || scanId;
        
        // Start and end time
        if (data.start_time) {
            const startDate = new Date(data.start_time * 1000);
            startTimeEl.textContent = startDate.toLocaleString();
        } else {
            startTimeEl.textContent = 'N/A';
        }
        
        if (data.end_time) {
            const endDate = new Date(data.end_time * 1000);
            endTimeEl.textContent = endDate.toLocaleString();
        } else {
            endTimeEl.textContent = 'N/A';
        }
        
        // Scan type
        const scanTypes = {
            'quick': 'Quick Scan',
            'standard': 'Standard Scan',
            'comprehensive': 'Comprehensive Scan',
            'custom': 'Custom Scan'
        };
        scanTypeInfoEl.textContent = scanTypes[data.scan_type] || data.scan_type || 'Standard';
        
        // Ports scanned
        if (Array.isArray(data.ports)) {
            if (data.ports.length > 10) {
                portsScannedEl.textContent = `${data.ports.length} ports`;
                
                // Add tooltip with some of the ports
                const portsTooltip = document.createElement('span');
                portsTooltip.className = 'custom-tooltip';
                portsTooltip.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-info"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                    <span class="tooltip-text">${data.ports.slice(0, 20).join(', ')}${data.ports.length > 20 ? '...' : ''}</span>
                `;
                portsScannedEl.appendChild(portsTooltip);
            } else {
                portsScannedEl.textContent = data.ports.join(', ');
            }
        } else {
            portsScannedEl.textContent = 'N/A';
        }
    }
    
    /**
     * Display results table
     * @param {Object} data - The scan results data
     */
    function displayResultsTable(data) {
        // Clear table
        fullResultsTable.innerHTML = '';
        
        // Get all results and sort by target, then port
        const allResults = [];
        
        for (const target in data.results) {
            for (const port in data.results[target].ports) {
                const portData = data.results[target].ports[port];
                allResults.push({
                    target,
                    port: parseInt(port),
                    status: portData.status,
                    service: portData.service || `Unknown (${port})`
                });
            }
        }
        
        // Sort by target, status (open first), then port
        allResults.sort((a, b) => {
            // First by target
            const targetCompare = a.target.localeCompare(b.target);
            if (targetCompare !== 0) return targetCompare;
            
            // Then by status (open first)
            if (a.status === 'open' && b.status !== 'open') return -1;
            if (a.status !== 'open' && b.status === 'open') return 1;
            
            // Then by port
            return a.port - b.port;
        });
        
        // Add results to table
        if (allResults.length === 0) {
            fullResultsTable.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center">No scan results available</td>
                </tr>
            `;
            return;
        }
        
        allResults.forEach(result => {
            const row = document.createElement('tr');
            
            // Set row class based on status
            if (result.status === 'open') {
                row.classList.add('table-success', 'bg-opacity-25');
            }
            
            // Set status class
            const statusClass = result.status === 'open' ? 'port-open' : 
                               (result.status === 'closed' ? 'port-closed' : 'port-filtered');
            
            row.innerHTML = `
                <td>${result.target}</td>
                <td>${result.port}</td>
                <td class="${statusClass}">${result.status}</td>
                <td>${result.service}</td>
            `;
            
            fullResultsTable.appendChild(row);
        });
    }
    
    /**
     * Create services chart
     * @param {Object} data - The scan results data
     */
    function createServicesChart(data) {
        // Count services
        const servicesCounts = {};
        let totalOpenPorts = 0;
        
        for (const target in data.results) {
            for (const port in data.results[target].ports) {
                const portData = data.results[target].ports[port];
                if (portData.status === 'open') {
                    const service = portData.service || `Unknown (${port})`;
                    servicesCounts[service] = (servicesCounts[service] || 0) + 1;
                    totalOpenPorts++;
                }
            }
        }
        
        // Convert to arrays for chart
        const services = Object.keys(servicesCounts);
        
        // If no open ports, show a message
        if (services.length === 0) {
            servicesChartEl.parentNode.innerHTML = `
                <div class="text-center py-4">
                    <p class="text-muted">No open ports found</p>
                </div>
            `;
            return;
        }
        
        // Sort services by count
        services.sort((a, b) => servicesCounts[b] - servicesCounts[a]);
        
        // Limit to top 8 services, group others
        let chartLabels, chartData, chartColors;
        
        if (services.length > 8) {
            const topServices = services.slice(0, 7);
            const otherServices = services.slice(7);
            
            // Sum counts for other services
            const otherCount = otherServices.reduce((sum, service) => sum + servicesCounts[service], 0);
            
            chartLabels = [...topServices, 'Other'];
            chartData = [...topServices.map(service => servicesCounts[service]), otherCount];
        } else {
            chartLabels = services;
            chartData = services.map(service => servicesCounts[service]);
        }
        
        // Generate colors
        chartColors = [
            'rgba(75, 192, 192, 0.8)',
            'rgba(54, 162, 235, 0.8)',
            'rgba(153, 102, 255, 0.8)',
            'rgba(255, 159, 64, 0.8)',
            'rgba(255, 99, 132, 0.8)',
            'rgba(255, 206, 86, 0.8)',
            'rgba(199, 199, 199, 0.8)',
            'rgba(83, 102, 255, 0.8)'
        ];
        
        // Create chart
        if (servicesChart) {
            servicesChart.destroy();
        }
        
        const ctx = servicesChartEl.getContext('2d');
        servicesChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: chartLabels,
                datasets: [{
                    data: chartData,
                    backgroundColor: chartColors,
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: '#eee'
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const percentage = Math.round((value / totalOpenPorts) * 100);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    /**
     * Display AI insights
     * @param {Object} data - The scan results data
     */
    function displayAIInsights(data) {
        if (!data.insights || data.insights.length === 0) {
            return;
        }
        
        // Process each insight
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
        statisticsList.innerHTML = `
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <span>Total Targets</span>
                <span class="badge bg-primary rounded-pill">${insight.total_targets}</span>
            </li>
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <span>Total Ports Scanned</span>
                <span class="badge bg-secondary rounded-pill">${insight.total_ports_scanned}</span>
            </li>
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <span>Open Ports</span>
                <span class="badge bg-success rounded-pill">${insight.open_ports}</span>
            </li>
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <span>Closed Ports</span>
                <span class="badge bg-danger rounded-pill">${insight.closed_ports}</span>
            </li>
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <span>Errors</span>
                <span class="badge bg-warning rounded-pill">${insight.error_ports}</span>
            </li>
        `;
    }
    
    /**
     * Display common services insight
     * @param {Object} insight - Common services insight data
     */
    function displayServicesInsight(insight) {
        if (!insight.services || insight.services.length === 0) {
            return;
        }
        
        commonServicesList.innerHTML = '';
        
        insight.services.forEach(service => {
            commonServicesList.innerHTML += `
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    <span>${service.service}</span>
                    <span class="badge bg-info rounded-pill">${service.count}</span>
                </li>
            `;
        });
    }
    
    /**
     * Display security recommendations insight
     * @param {Object} insight - Security recommendations insight data
     */
    function displayRecommendationsInsight(insight) {
        if (!insight.recommendations || insight.recommendations.length === 0) {
            return;
        }
        
        securityRecommendationsAccordion.innerHTML = '';
        
        insight.recommendations.forEach((recommendation, index) => {
            const severityClass = recommendation.severity === 'high' ? 'text-danger' : 
                                 (recommendation.severity === 'medium' ? 'text-warning' : 'text-info');
            
            securityRecommendationsAccordion.innerHTML += `
                <div class="accordion-item bg-dark">
                    <h2 class="accordion-header" id="recommendation-heading-${index}">
                        <button class="accordion-button collapsed bg-dark text-light" type="button" data-bs-toggle="collapse" data-bs-target="#recommendation-collapse-${index}" aria-expanded="false" aria-controls="recommendation-collapse-${index}">
                            <div class="d-flex align-items-center">
                                <span class="badge ${severityClass}-bg me-2">${recommendation.severity}</span>
                                <span>${recommendation.service}</span>
                            </div>
                        </button>
                    </h2>
                    <div id="recommendation-collapse-${index}" class="accordion-collapse collapse" aria-labelledby="recommendation-heading-${index}" data-bs-parent="#security-recommendations-accordion">
                        <div class="accordion-body">
                            <p><strong>Issue:</strong> ${recommendation.description}</p>
                            <p><strong>Recommendation:</strong> ${recommendation.recommendation}</p>
                        </div>
                    </div>
                </div>
            `;
        });
    }
    
    /**
     * Display anomalies insight
     * @param {Object} insight - Anomalies insight data
     */
    function displayAnomaliesInsight(insight) {
        if (!insight.details || insight.details.length === 0) {
            return;
        }
        
        // Show anomalies container
        anomaliesDetailsContainer.classList.remove('d-none');
        
        // Clear previous anomalies
        anomaliesAccordion.innerHTML = '';
        
        // Add anomalies to accordion
        insight.details.forEach((anomaly, index) => {
            const severityClass = anomaly.severity === 'high' ? 'text-danger' : 
                                 (anomaly.severity === 'medium' ? 'text-warning' : 'text-info');
            
            let targetDisplay = '';
            if (anomaly.target) {
                targetDisplay = `<strong>Target:</strong> ${anomaly.target}`;
            } else if (anomaly.targets && anomaly.targets.length > 0) {
                targetDisplay = `<strong>Targets:</strong> ${anomaly.targets.slice(0, 3).join(', ')}${anomaly.targets.length > 3 ? '...' : ''}`;
            }
            
            let portDisplay = '';
            if (anomaly.port) {
                portDisplay = `<br><strong>Port:</strong> ${anomaly.port}`;
            } else if (anomaly.ports && anomaly.ports.length > 0) {
                portDisplay = `<br><strong>Ports:</strong> ${anomaly.ports.join(', ')}`;
            }
            
            anomaliesAccordion.innerHTML += `
                <div class="accordion-item bg-dark">
                    <h2 class="accordion-header" id="anomaly-heading-${index}">
                        <button class="accordion-button collapsed bg-dark text-light" type="button" data-bs-toggle="collapse" data-bs-target="#anomaly-collapse-${index}" aria-expanded="false" aria-controls="anomaly-collapse-${index}">
                            <div class="d-flex align-items-center">
                                <span class="badge ${severityClass}-bg me-2">${anomaly.severity}</span>
                                <span>${anomaly.type.replace(/_/g, ' ')}</span>
                            </div>
                        </button>
                    </h2>
                    <div id="anomaly-collapse-${index}" class="accordion-collapse collapse" aria-labelledby="anomaly-heading-${index}" data-bs-parent="#anomalies-accordion">
                        <div class="accordion-body">
                            <p>${anomaly.description}</p>
                            <p>${targetDisplay}${portDisplay}</p>
                            <p><strong>Confidence:</strong> ${(anomaly.confidence * 100).toFixed(0)}%</p>
                        </div>
                    </div>
                </div>
            `;
        });
    }
});
