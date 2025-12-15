// Voice Drawing Application

// Handle global errors
window.onerror = function(msg, url, lineNo, columnNo, error) {
    console.error('Error: ' + msg + '\nURL: ' + url + '\nLine: ' + lineNo);
    return false;
};

// Global variables
let mic;
let micStarted = false;
let x, y;
let angle = 0;
let speed = 0.5; // Drawing speed
let backgroundColor;
let drawing = false;

// Line colors
let hue = 0;

// Speech recognition
let recognition;
let isRecognizing = false;
let currentDirection = 'stop'; // 'right', 'left', 'up', 'down', 'stop'
let currentLanguage = 'en-US';

// Audio analysis for volume indicator
let audioContext;
let analyser;
let microphone;
let dataArray;

/**
 * p5.js setup function
 */
function setup() {
    // Create fullscreen canvas
    let canvas = createCanvas(windowWidth, windowHeight);
    canvas.parent('sketch-holder');
    colorMode(HSB, 360, 100, 100, 100);
    backgroundColor = color(0, 0, 100);
    background(backgroundColor);

    // Start position in center
    x = width / 2;
    y = height / 2;

    // Draw starting point
    stroke(0, 100, 50); // Red color
    strokeWeight(10);
    point(x, y);

    // Initialize speech recognition
    setupSpeechRecognition();

    strokeWeight(3);
    noFill();
}

/**
 * Setup speech recognition
 */
function setupSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        console.warn('⚠️ Speech recognition not supported');
        document.getElementById('status').textContent = '⚠️ Use Safari or Chrome';
        return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = currentLanguage;
    recognition.continuous = true;
    recognition.interimResults = true; // Enable interim results for fast response
    recognition.maxAlternatives = 3;

    recognition.onresult = (event) => {
        // Get last result for quick response
        const last = event.results.length - 1;
        const transcript = event.results[last][0].transcript.trim().toLowerCase();
        const isFinal = event.results[last].isFinal;

        console.log(`🎤 ${isFinal ? 'Final' : 'Interim'}:`, transcript);

        // Update top panel with recognized text
        document.getElementById('recognizedCommand').textContent = `"${transcript}"`;

        // Check diagonal commands first (more specific)
        if (transcript.match(/up.*right|right.*up/i)) {
            currentDirection = 'upright';
            drawing = true;
            console.log('↗️ UP-RIGHT');
            updateStatusWithCommand('↗️ UP-RIGHT');
        } else if (transcript.match(/up.*left|left.*up/i)) {
            currentDirection = 'upleft';
            drawing = true;
            console.log('↖️ UP-LEFT');
            updateStatusWithCommand('↖️ UP-LEFT');
        } else if (transcript.match(/down.*right|right.*down/i)) {
            currentDirection = 'downright';
            drawing = true;
            console.log('↘️ DOWN-RIGHT');
            updateStatusWithCommand('↘️ DOWN-RIGHT');
        } else if (transcript.match(/down.*left|left.*down/i)) {
            currentDirection = 'downleft';
            drawing = true;
            console.log('↙️ DOWN-LEFT');
            updateStatusWithCommand('↙️ DOWN-LEFT');
        }
        // Simple directions
        else if (transcript.match(/right|write|rite|wright/i)) {
            currentDirection = 'right';
            drawing = true;
            console.log('➡️ RIGHT');
            updateStatusWithCommand('➡️ RIGHT');
        } else if (transcript.match(/left|lef/i)) {
            currentDirection = 'left';
            drawing = true;
            console.log('⬅️ LEFT');
            updateStatusWithCommand('⬅️ LEFT');
        } else if (transcript.match(/up|app|op/i)) {
            currentDirection = 'up';
            drawing = true;
            console.log('⬆️ UP');
            updateStatusWithCommand('⬆️ UP');
        } else if (transcript.match(/down|town|dawn/i)) {
            currentDirection = 'down';
            drawing = true;
            console.log('⬇️ DOWN');
            updateStatusWithCommand('⬇️ DOWN');
        } else if (transcript.match(/stop|top/i)) {
            currentDirection = 'stop';
            drawing = false;
            console.log('🛑 STOP');
            updateStatusWithCommand('🛑 STOP');
        } else if (transcript.match(/start|go|begin/i)) {
            drawing = true;
            console.log('▶️ START');
            updateStatusWithCommand('▶️ START');
        }
    };

    recognition.onerror = (event) => {
        console.error('❌ Recognition error:', event.error);

        // Ignore "aborted" and "no-speech" errors - they are normal
        if (event.error === 'aborted' || event.error === 'no-speech') {
            console.log('⚠️ Error ignored, continuing...');
            return;
        }

        // For other errors show message
        if (event.error === 'not-allowed' || event.error === 'audio-capture') {
            document.getElementById('status').textContent = '❌ No microphone access. Allow in Safari settings!';
            alert('❌ Safari cannot access microphone.\n\nInstructions:\n1. Open Safari settings (Safari → Settings)\n2. Go to "Websites" tab\n3. Select "Microphone" in left menu\n4. Find this site and select "Allow"\n5. Refresh the page');

            isRecognizing = false;
            drawing = false;
            const startBtn = document.getElementById('startBtn');
            startBtn.innerHTML = '<span>🎤 Start Microphone</span>';
            startBtn.classList.remove('active');
        }
    };

    recognition.onend = () => {
        console.log('🔄 Recognition ended');
        if (isRecognizing) {
            // Restart with small delay
            setTimeout(() => {
                if (isRecognizing) {
                    try {
                        recognition.start();
                        console.log('🔄 Restarting recognition...');
                    } catch (e) {
                        console.error('Restart error:', e);
                    }
                }
            }, 100);
        }
    };

    console.log('✅ Speech recognition configured (English)');
}

/**
 * Window resize handler
 */
function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    // Keep current cursor position relative to window size
    x = constrain(x, 0, width);
    y = constrain(y, 0, height);
}

/**
 * Main p5.js draw loop
 */
function draw() {
    if (isRecognizing && drawing && currentDirection !== 'stop') {
        // Change color over time for beauty
        hue = (hue + 1) % 360;
        stroke(hue, 80, 80, 90);

        // Calculate new position based on command
        let newX = x;
        let newY = y;

        switch (currentDirection) {
            case 'right':
                newX = x + speed;
                break;
            case 'left':
                newX = x - speed;
                break;
            case 'up':
                newY = y - speed;
                break;
            case 'down':
                newY = y + speed;
                break;
            case 'upright':
                newX = x + speed;
                newY = y - speed;
                break;
            case 'upleft':
                newX = x - speed;
                newY = y - speed;
                break;
            case 'downright':
                newX = x + speed;
                newY = y + speed;
                break;
            case 'downleft':
                newX = x - speed;
                newY = y + speed;
                break;
        }

        // Draw line
        strokeWeight(3);
        line(x, y, newX, newY);

        // Update position
        x = newX;
        y = newY;

        // If going out of bounds, wrap to other side
        if (x < 0) x = width;
        if (x > width) x = 0;
        if (y < 0) y = height;
        if (y > height) y = 0;

        // Debug
        if (frameCount % 30 === 0) { // Every 30 frames (approx. every 0.5 sec)
            console.log(`📍 Position: (${Math.round(x)}, ${Math.round(y)}) | Direction: ${currentDirection}`);
        }
    }

    // Always draw current cursor position
    stroke(0, 100, 50); // Red color
    strokeWeight(15);
    point(x, y);

    // Update volume indicator
    updateVolumeIndicator();
}

/**
 * Update volume indicator
 */
function updateVolumeIndicator() {
    if (analyser && dataArray) {
        analyser.getByteFrequencyData(dataArray);

        // Calculate average volume level
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
        }
        let average = sum / dataArray.length;

        // Increase sensitivity - normalize from 0 to 100 with boost
        let volumePercent = Math.min(100, (average / 64) * 100); // Was /128, now /64 - 2x more sensitive

        // Update visual indicator
        const volumeBar = document.getElementById('volumeBar');
        if (volumeBar) {
            volumeBar.style.width = volumePercent + '%';
        }
    }
}

/**
 * Toggle recognition language
 */
function toggleLanguage() {
    const wasRecognizing = isRecognizing;

    // Stop recognition if running
    if (isRecognizing) {
        isRecognizing = false;
        drawing = false;
        try {
            recognition.stop();
        } catch (e) {
            console.log('Recognition already stopped');
        }
    }

    // Switch language
    if (currentLanguage === 'he-IL') {
        currentLanguage = 'en-US';
        document.getElementById('langBtn').innerHTML = '<span>🌐 English</span>';
        document.getElementById('commandsTitle').textContent = 'Voice Commands:';
        console.log('🌐 Switched to English');
    } else {
        currentLanguage = 'he-IL';
        document.getElementById('langBtn').innerHTML = '<span>🌐 עברית</span>';
        document.getElementById('commandsTitle').textContent = ':פקודות קוליות';
        console.log('🌐 Switched to Hebrew');
    }

    // Update language in recognition
    if (recognition) {
        recognition.lang = currentLanguage;
    }

    // Restart recognition if it was active
    if (wasRecognizing) {
        setTimeout(() => {
            toggleMic();
        }, 500);
    }
}

/**
 * Start microphone for volume analysis
 */
async function startMicrophone() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        // Create Web Audio API context
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        microphone = audioContext.createMediaStreamSource(stream);

        analyser.fftSize = 256;
        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);

        microphone.connect(analyser);

        // Show volume indicator
        document.getElementById('volumeIndicator').style.display = 'block';

        console.log('🎤 Microphone started for audio analysis');
    } catch (error) {
        console.error('❌ Microphone access error:', error);
    }
}

/**
 * Stop microphone
 */
function stopMicrophone() {
    if (microphone) {
        microphone.disconnect();
        microphone = null;
    }
    if (audioContext) {
        audioContext.close();
        audioContext = null;
    }
    analyser = null;
    dataArray = null;

    // Hide volume indicator
    document.getElementById('volumeIndicator').style.display = 'none';
    document.getElementById('volumeBar').style.width = '0%';

    console.log('🎤 Microphone stopped');
}

/**
 * Toggle speech recognition on/off
 */
function toggleMic() {
    if (!isRecognizing) {
        if (!recognition) {
            alert('❌ Speech recognition not supported.\n\nUse Safari or Chrome.');
            return;
        }

        console.log(`🎤 Starting speech recognition...`);
        document.getElementById('status').textContent = '⏳ Starting...';
        document.getElementById('micStatus').textContent = 'Starting...';

        // Start microphone for volume analysis
        startMicrophone();

        try {
            isRecognizing = true;
            drawing = true; // Auto-start drawing

            recognition.start();

            const startBtn = document.getElementById('startBtn');
            startBtn.innerHTML = '<span>🔴 Stop Mic</span>';
            startBtn.classList.add('active');

            document.getElementById('status').textContent = '✅ Speak commands!';
            document.getElementById('micStatus').textContent = 'Microphone ON';
            document.getElementById('micIcon').classList.add('active');
            console.log('💡 Commands: right, left, up, down, stop');

            console.log('✅ Recognition started');

        } catch (error) {
            console.error('❌ Error:', error);

            // If "already started" error, it's ok
            if (error.message && error.message.includes('already')) {
                console.log('✅ Recognition already running');
                const startBtn = document.getElementById('startBtn');
                startBtn.innerHTML = '<span>🔴 Stop Mic</span>';
                startBtn.classList.add('active');
                document.getElementById('status').textContent = '✅ Speak commands!';
                document.getElementById('micStatus').textContent = 'Microphone ON';
                document.getElementById('micIcon').classList.add('active');
            } else {
                alert('❌ Failed to start recognition.\n\nCheck browser permissions.');
                document.getElementById('status').textContent = '❌ Start error';
                document.getElementById('micStatus').textContent = 'Error';
                isRecognizing = false;
                drawing = false;
            }
        }
    } else {
        console.log('🛑 Stopping recognition...');
        isRecognizing = false;
        drawing = false;
        currentDirection = 'stop';

        try {
            recognition.stop();
        } catch (e) {
            console.log('Recognition already stopped');
        }

        // Stop microphone
        stopMicrophone();

        const startBtn = document.getElementById('startBtn');
        startBtn.innerHTML = '<span>🎤 Start Mic</span>';
        startBtn.classList.remove('active');
        document.getElementById('status').textContent = 'Microphone OFF';
        document.getElementById('micStatus').textContent = 'Microphone OFF';
        document.getElementById('micIcon').classList.remove('active');
        document.getElementById('recognizedCommand').textContent = 'Say a command...';
    }
}

/**
 * Update status with command
 */
function updateStatusWithCommand(command) {
    let directionText = '';
    switch (currentDirection) {
        case 'right':
            directionText = '➡️ Right';
            break;
        case 'left':
            directionText = '⬅️ Left';
            break;
        case 'up':
            directionText = '⬆️ Up';
            break;
        case 'down':
            directionText = '⬇️ Down';
            break;
        case 'stop':
            directionText = '🛑 Stop';
            break;
    }

    document.getElementById('status').textContent = `${directionText} | "${command}"`;
}

/**
 * Clear canvas
 */
function clearCanvas() {
    background(backgroundColor);
    x = width / 2;
    y = height / 2;
    angle = 0;

    // Draw starting point in center
    stroke(0, 100, 50); // Red color
    strokeWeight(10);
    point(x, y);
    strokeWeight(3); // Return to normal line thickness
}

/**
 * Save drawing
 */
function saveDrawing() {
    saveCanvas('voice-drawing', 'png');
}

/**
 * Reset on spacebar press
 */
function keyPressed() {
    if (key === ' ') {
        clearCanvas();
    }
}
