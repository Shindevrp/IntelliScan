/**
 * Voice command processing for the AI-Powered Scanner
 * Handles recording, processing, and interpreting voice commands
 */

document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const voiceCommandBtn = document.getElementById('voice-command-btn');
    const voiceCommandModal = document.getElementById('voiceCommandModal');
    const startRecordingBtn = document.getElementById('start-recording');
    const stopRecordingBtn = document.getElementById('stop-recording');
    const voiceRecordingStatus = document.getElementById('voice-recording-status');
    const voiceProcessing = document.getElementById('voice-processing');
    const voiceResult = document.getElementById('voice-result');
    const recognizedText = document.getElementById('recognized-text');
    const interpretedCommand = document.getElementById('interpreted-command');
    const applyVoiceCommandBtn = document.getElementById('apply-voice-command');
    
    // Text command elements
    const textCommandBtn = document.getElementById('text-command-btn');
    const textCommandModal = document.getElementById('textCommandModal');
    const textCommandInput = document.getElementById('text-command');
    const processTextCommandBtn = document.getElementById('process-text-command');
    
    // Form elements to update
    const targetsInput = document.getElementById('targets');
    const scanTypeSelect = document.getElementById('scan-type');
    const customPortsInput = document.getElementById('custom-ports');
    
    // Recording variables
    let mediaRecorder = null;
    let audioChunks = [];
    let isRecording = false;
    let commandData = null;
    
    // Bootstrap modals
    const voiceModal = new bootstrap.Modal(voiceCommandModal);
    const textModal = new bootstrap.Modal(textCommandModal);
    
    // Initialize
    initializeVoiceCommands();
    
    /**
     * Initialize voice command functionality
     */
    function initializeVoiceCommands() {
        // Set up voice command button
        voiceCommandBtn.addEventListener('click', openVoiceCommandModal);
        
        // Set up recording buttons
        startRecordingBtn.addEventListener('click', startRecording);
        stopRecordingBtn.addEventListener('click', stopRecording);
        
        // Set up apply command button
        applyVoiceCommandBtn.addEventListener('click', applyVoiceCommand);
        
        // Set up text command
        textCommandBtn.addEventListener('click', openTextCommandModal);
        processTextCommandBtn.addEventListener('click', processTextCommand);
    }
    
    /**
     * Open voice command modal
     */
    function openVoiceCommandModal() {
        // Reset modal state
        resetVoiceModal();
        voiceModal.show();
    }
    
    /**
     * Open text command modal
     */
    function openTextCommandModal() {
        // Reset input
        textCommandInput.value = '';
        textModal.show();
    }
    
    /**
     * Reset voice modal to initial state
     */
    function resetVoiceModal() {
        voiceRecordingStatus.classList.remove('d-none');
        voiceProcessing.classList.add('d-none');
        voiceResult.classList.add('d-none');
        startRecordingBtn.classList.remove('d-none');
        stopRecordingBtn.classList.add('d-none');
        applyVoiceCommandBtn.classList.add('d-none');
        recognizedText.textContent = '';
        interpretedCommand.innerHTML = '';
        commandData = null;
        
        // Stop recording if active
        if (isRecording && mediaRecorder) {
            mediaRecorder.stop();
            isRecording = false;
        }
    }
    
    /**
     * Start voice recording
     */
    function startRecording() {
        // Reset any previous recording
        audioChunks = [];
        
        // Update UI
        startRecordingBtn.classList.add('d-none');
        stopRecordingBtn.classList.remove('d-none');
        stopRecordingBtn.classList.add('recording');
        voiceRecordingStatus.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-mic text-danger mb-3"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
            <p>Recording... Speak your command</p>
            <p class="text-muted small">Click the stop button when finished</p>
        `;
        
        // Request microphone access
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                // Create media recorder
                mediaRecorder = new MediaRecorder(stream);
                
                // Set up event handlers
                mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        audioChunks.push(event.data);
                    }
                };
                
                mediaRecorder.onstop = () => {
                    // Stop all tracks to release microphone
                    stream.getTracks().forEach(track => track.stop());
                    
                    // Process recorded audio
                    processRecordedAudio();
                };
                
                // Start recording
                mediaRecorder.start();
                isRecording = true;
                
                // Auto-stop after 10 seconds
                setTimeout(() => {
                    if (isRecording && mediaRecorder.state === 'recording') {
                        stopRecording();
                    }
                }, 10000);
            })
            .catch(error => {
                console.error('Error accessing microphone:', error);
                voiceRecordingStatus.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-alert-circle text-danger mb-3"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                    <p>Error accessing microphone</p>
                    <p class="text-muted small">Please ensure your browser has permission to use the microphone</p>
                `;
                startRecordingBtn.classList.remove('d-none');
                stopRecordingBtn.classList.add('d-none');
            });
    }
    
    /**
     * Stop voice recording
     */
    function stopRecording() {
        if (!isRecording || !mediaRecorder) return;
        
        // Stop recording
        mediaRecorder.stop();
        isRecording = false;
        
        // Update UI
        stopRecordingBtn.classList.remove('recording');
        stopRecordingBtn.classList.add('d-none');
        voiceRecordingStatus.classList.add('d-none');
        voiceProcessing.classList.remove('d-none');
    }
    
    /**
     * Process recorded audio
     */
    function processRecordedAudio() {
        if (audioChunks.length === 0) {
            showVoiceError("No audio recorded. Please try again.");
            return;
        }
        
        // Create audio blob
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        
        // Create form data
        const formData = new FormData();
        formData.append('audio', audioBlob);
        
        // Send to server for processing
        fetch('/api/voice-command', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                displayVoiceResult(data);
            } else {
                showVoiceError(data.message || "Could not process voice command");
            }
        })
        .catch(error => {
            console.error('Error processing voice command:', error);
            showVoiceError("Error processing voice command. Please try again.");
        });
    }
    
    /**
     * Process text command
     */
    function processTextCommand() {
        const commandText = textCommandInput.value.trim();
        
        if (!commandText) {
            // Show error in modal
            const alertDiv = document.createElement('div');
            alertDiv.className = 'alert alert-danger';
            alertDiv.textContent = 'Please enter a command';
            
            const modalBody = textCommandModal.querySelector('.modal-body');
            modalBody.insertBefore(alertDiv, modalBody.firstChild);
            
            // Remove after 3 seconds
            setTimeout(() => {
                if (alertDiv.parentNode) {
                    alertDiv.parentNode.removeChild(alertDiv);
                }
            }, 3000);
            
            return;
        }
        
        // Show processing indicator
        processTextCommandBtn.innerHTML = `
            <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            Processing...
        `;
        processTextCommandBtn.disabled = true;
        
        // Send to server for processing
        fetch('/api/text-command', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ command: commandText })
        })
        .then(response => response.json())
        .then(data => {
            // Reset button
            processTextCommandBtn.innerHTML = 'Process Command';
            processTextCommandBtn.disabled = false;
            
            if (data.status === 'success') {
                // Close modal
                textModal.hide();
                
                // Apply command to form
                applyCommandToForm(data.scan_params);
                
                // Show success message
                showAlert(`Command processed: ${data.command_text}`, 'success');
            } else {
                // Show error in modal
                const alertDiv = document.createElement('div');
                alertDiv.className = 'alert alert-danger';
                alertDiv.textContent = data.message || "Could not process command";
                
                const modalBody = textCommandModal.querySelector('.modal-body');
                modalBody.insertBefore(alertDiv, modalBody.firstChild);
                
                // Remove after 3 seconds
                setTimeout(() => {
                    if (alertDiv.parentNode) {
                        alertDiv.parentNode.removeChild(alertDiv);
                    }
                }, 3000);
            }
        })
        .catch(error => {
            console.error('Error processing text command:', error);
            
            // Reset button
            processTextCommandBtn.innerHTML = 'Process Command';
            processTextCommandBtn.disabled = false;
            
            // Show error
            const alertDiv = document.createElement('div');
            alertDiv.className = 'alert alert-danger';
            alertDiv.textContent = "Error processing command. Please try again.";
            
            const modalBody = textCommandModal.querySelector('.modal-body');
            modalBody.insertBefore(alertDiv, modalBody.firstChild);
            
            // Remove after 3 seconds
            setTimeout(() => {
                if (alertDiv.parentNode) {
                    alertDiv.parentNode.removeChild(alertDiv);
                }
            }, 3000);
        });
    }
    
    /**
     * Display voice command result
     * @param {Object} data - Voice processing result data
     */
    function displayVoiceResult(data) {
        // Store command data for later use
        commandData = data;
        
        // Update UI
        voiceProcessing.classList.add('d-none');
        voiceResult.classList.remove('d-none');
        applyVoiceCommandBtn.classList.remove('d-none');
        
        // Display recognized text
        recognizedText.textContent = data.command_text;
        
        // Display interpreted command
        interpretedCommand.innerHTML = '';
        
        if (data.scan_params.targets) {
            interpretedCommand.innerHTML += `
                <li class="list-group-item">
                    <strong>Targets:</strong> ${data.scan_params.targets}
                </li>
            `;
        }
        
        interpretedCommand.innerHTML += `
            <li class="list-group-item">
                <strong>Scan Type:</strong> ${data.scan_params.scan_type}
            </li>
        `;
        
        if (data.scan_params.custom_ports) {
            interpretedCommand.innerHTML += `
                <li class="list-group-item">
                    <strong>Custom Ports:</strong> ${data.scan_params.custom_ports}
                </li>
            `;
        }
    }
    
    /**
     * Show voice processing error
     * @param {string} message - Error message
     */
    function showVoiceError(message) {
        voiceProcessing.classList.add('d-none');
        voiceResult.classList.remove('d-none');
        voiceResult.innerHTML = `
            <div class="alert alert-danger mb-3">Error: ${message}</div>
            <button type="button" class="btn btn-primary" onclick="resetVoiceModal()">Try Again</button>
        `;
    }
    
    /**
     * Apply voice command to the scan form
     */
    function applyVoiceCommand() {
        if (!commandData || !commandData.scan_params) return;
        
        applyCommandToForm(commandData.scan_params);
        
        // Show confirmation
        showAlert(`Voice command applied: ${commandData.command_text}`, 'success');
    }
    
    /**
     * Apply command parameters to the scan form
     * @param {Object} params - Scan parameters
     */
    function applyCommandToForm(params) {
        // Update form fields
        if (params.targets) {
            targetsInput.value = params.targets;
        }
        
        if (params.scan_type) {
            scanTypeSelect.value = params.scan_type;
            
            // Trigger change event to show/hide custom ports
            const event = new Event('change');
            scanTypeSelect.dispatchEvent(event);
        }
        
        if (params.custom_ports) {
            customPortsInput.value = params.custom_ports;
        }
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
        
        // Get scan form element
        const scanForm = document.getElementById('scan-form');
        
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
