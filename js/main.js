// ============================================
// MAIN APPLICATION LOGIC
// ============================================

// Global Variables
let autoRefreshInterval = null;
let autoRefreshEnabled = false;
let signalCount = 0;
let signalHistory = [];
let isManualMode = false;
let currentLivePrice = 150.21;
let priceHistory = [];

/**
 * Initialize application on page load
 */
window.onload = function() {
    // Add this line at the very top
    registerCalculatorWindow();
    
    // Try to inject real Jupiter price immediately
    injectJupiterPrice();
    
    // Set up continuous price monitoring from Tampermonkey
    setInterval(injectJupiterPrice, 1000); // Check every second
    
    // Set initial live data (fallback if no Jupiter price)
    fetchLiveData();
    
    // Pre-fill manual inputs for testing
    document.getElementById('currentPrice').value = '150.21';
    document.getElementById('bbUpper').value = '150.37';
    document.getElementById('bbMiddle').value = '149.88';
    document.getElementById('bbLower').value = '149.39';
    document.getElementById('emaValueInput').value = '150.02';
    document.getElementById('rsiValueInput').value = '64.69';
    document.getElementById('macdLineInput').value = '0.2002';
    document.getElementById('signalLineInput').value = '0.0142';
    document.getElementById('histogramInput').value = '0.186';
};

// Initialize price history with some sample data
for (let i = 26; i >= 0; i--) {
    priceHistory.push(150.21 + (Math.random() - 0.5) * 2 - i * 0.02);
}

/**
 * Fetch live data (main function)
 */
async function fetchLiveData() {
    // Try to get real Jupiter price first
    const realDataAvailable = injectJupiterPrice();
    
    if (!realDataAvailable) {
        // Fallback to simulated data if no real price available
        document.getElementById('last-update').textContent = 'Fetching...';
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Generate simulated price and calculate indicators
        const newPrice = generateSimulatedPrice();
        
        // Calculate all indicators from price history
        const bb = calculateBollingerBands(priceHistory);
        const ema = calculateEMA(priceHistory, 20);
        const rsi = calculateRSI(priceHistory);
        const macd = calculateMACD(priceHistory);
        
        // Update live display
        updateLiveDisplay(newPrice, bb, ema, rsi, macd);
        
        document.getElementById('last-update').textContent = new Date().toLocaleTimeString();
    }
    
    // Auto-calculate signal regardless of data source
    if (priceHistory.length >= 26) {
        const bb = calculateBollingerBands(priceHistory);
        const ema = calculateEMA(priceHistory, 20);
        const rsi = calculateRSI(priceHistory);
        const macd = calculateMACD(priceHistory);
        
        const signals = analyzeIndicators(currentLivePrice, bb.upper, bb.middle, bb.lower, ema, rsi, macd.macdLine, macd.signalLine, macd.histogram);
        const overallSignal = generateOverallSignal(signals);
        displayResult(overallSignal, signals, currentLivePrice);
        
        // Update history
        addToSignalHistory(overallSignal.signal, currentLivePrice);
    }
    
    document.getElementById('signal-count').textContent = signalCount;
}

/**
 * Update live display with calculated indicators
 */
function updateLiveDisplay(price, bb, ema, rsi, macd) {
    document.getElementById('live-price').textContent = `$${price.toFixed(2)}`;
    
    // Bollinger Bands
    const bbPosition = ((price - bb.lower) / (bb.upper - bb.lower)) * 100;
    document.getElementById('bb-position').textContent = `${bbPosition.toFixed(0)}%`;
    document.getElementById('bb-upper').textContent = bb.upper.toFixed(2);
    document.getElementById('bb-lower').textContent = bb.lower.toFixed(2);
    
    // EMA
    const emaDiff = ((price - ema) / ema) * 100;
    document.getElementById('ema-diff').textContent = `${emaDiff > 0 ? '+' : ''}${emaDiff.toFixed(2)}%`;
    document.getElementById('ema-value').textContent = ema.toFixed(2);
    
    // RSI
    document.getElementById('rsi-value').textContent = rsi.toFixed(1);
    
    // MACD
    document.getElementById('macd-histogram').textContent = `${macd.histogram > 0 ? '+' : ''}${macd.histogram.toFixed(3)}`;
    document.getElementById('macd-line').textContent = macd.macdLine.toFixed(3);
    document.getElementById('macd-signal').textContent = macd.signalLine.toFixed(3);
    
    // Update indicator statuses
    updateIndicatorStatuses(price, bb, ema, rsi, macd);
}

/**
 * Update indicator status displays
 */
function updateIndicatorStatuses(price, bb, ema, rsi, macd) {
    // BB Status
    const bbPosition = (price - bb.lower) / (bb.upper - bb.lower);
    const bbStatus = document.getElementById('bb-status');
    if (bbPosition > 0.8) {
        bbStatus.textContent = 'BEARISH - Near Upper';
        bbStatus.className = 'indicator-status bearish';
    } else if (bbPosition < 0.2) {
        bbStatus.textContent = 'BULLISH - Near Lower';
        bbStatus.className = 'indicator-status bullish';
    } else {
        bbStatus.textContent = 'NEUTRAL - Middle Range';
        bbStatus.className = 'indicator-status neutral';
    }
    
    // EMA Status
    const emaStatus = document.getElementById('ema-status');
    if (price > ema) {
        emaStatus.textContent = 'BULLISH - Above EMA';
        emaStatus.className = 'indicator-status bullish';
    } else {
        emaStatus.textContent = 'BEARISH - Below EMA';
        emaStatus.className = 'indicator-status bearish';
    }
    
    // RSI Status
    const rsiStatus = document.getElementById('rsi-status');
    if (rsi > 70) {
        rsiStatus.textContent = 'BEARISH - Overbought';
        rsiStatus.className = 'indicator-status bearish';
    } else if (rsi < 30) {
        rsiStatus.textContent = 'BULLISH - Oversold';
        rsiStatus.className = 'indicator-status bullish';
    } else if (rsi > 50) {
        rsiStatus.textContent = 'BULLISH - Strong Momentum';
        rsiStatus.className = 'indicator-status bullish';
    } else {
        rsiStatus.textContent = 'BEARISH - Weak Momentum';
        rsiStatus.className = 'indicator-status bearish';
    }
    
    // MACD Status
    const macdStatus = document.getElementById('macd-status');
    if (macd.macdLine > macd.signalLine && macd.histogram > 0) {
        macdStatus.textContent = 'BULLISH - Strong Signal';
        macdStatus.className = 'indicator-status bullish';
    } else if (macd.macdLine < macd.signalLine && macd.histogram < 0) {
        macdStatus.textContent = 'BEARISH - Strong Signal';
        macdStatus.className = 'indicator-status bearish';
    } else {
        macdStatus.textContent = 'NEUTRAL - Mixed Signal';
        macdStatus.className = 'indicator-status neutral';
    }
}

/**
 * Toggle auto-refresh functionality
 */
function toggleAutoRefresh() {
    const toggle = document.querySelector('.toggle-switch');
    const intervalSpan = document.getElementById('refresh-interval');
    const speedSelect = document.getElementById('refresh-speed');
    
    autoRefreshEnabled = !autoRefreshEnabled;
    toggle.classList.toggle('active');
    
    if (autoRefreshEnabled) {
        const interval = parseInt(speedSelect.value);
        autoRefreshInterval = setInterval(fetchLiveData, interval);
        const seconds = interval / 1000;
        intervalSpan.textContent = `${seconds}s - Active`;
    } else {
        clearInterval(autoRefreshInterval);
        const seconds = parseInt(speedSelect.value) / 1000;
        intervalSpan.textContent = `${seconds}s`;
    }
}

/**
 * Change auto-refresh speed
 */
function changeRefreshSpeed() {
    const speedSelect = document.getElementById('refresh-speed');
    const intervalSpan = document.getElementById('refresh-interval');
    const interval = parseInt(speedSelect.value);
    const seconds = interval / 1000;
    
    if (autoRefreshEnabled) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = setInterval(fetchLiveData, interval);
        intervalSpan.textContent = `${seconds}s - Active`;
    } else {
        intervalSpan.textContent = `${seconds}s`;
    }
}

/**
 * Toggle manual input mode
 */
function toggleManualInputs() {
    const manualInputs = document.getElementById('manual-inputs');
    const button = event.target;
    
    isManualMode = !isManualMode;
    
    if (isManualMode) {
        manualInputs.classList.add('show');
        button.textContent = '📡 Switch to Live Mode';
        // Pre-fill with current live values
        fillManualInputsWithLiveData();
    } else {
        manualInputs.classList.remove('show');
        button.textContent = '🔧 Switch to Manual Input';
    }
}

/**
 * Fill manual inputs with current live data
 */
function fillManualInputsWithLiveData() {
    document.getElementById('currentPrice').value = currentLivePrice.toFixed(2);
    
    // Fill other fields with current calculated values
    const bb = calculateBollingerBands(priceHistory);
    const ema = calculateEMA(priceHistory, 20);
    const rsi = calculateRSI(priceHistory);
    const macd = calculateMACD(priceHistory);
    
    document.getElementById('bbUpper').value = bb.upper.toFixed(2);
    document.getElementById('bbMiddle').value = bb.middle.toFixed(2);
    document.getElementById('bbLower').value = bb.lower.toFixed(2);
    document.getElementById('emaValueInput').value = ema.toFixed(2);
    document.getElementById('rsiValueInput').value = rsi.toFixed(2);
    document.getElementById('macdLineInput').value = macd.macdLine.toFixed(4);
    document.getElementById('signalLineInput').value = macd.signalLine.toFixed(4);
    document.getElementById('histogramInput').value = macd.histogram.toFixed(4);
}

/**
 * Calculate trading signal (main calculation function)
 */
function calculateSignal() {
    let currentPrice, bbUpper, bbMiddle, bbLower, emaValue, rsiValue, macdLine, signalLine, histogram;
    
    if (isManualMode) {
        // Get values from manual inputs
        currentPrice = parseFloat(document.getElementById('currentPrice').value);
        bbUpper = parseFloat(document.getElementById('bbUpper').value);
        bbMiddle = parseFloat(document.getElementById('bbMiddle').value);
        bbLower = parseFloat(document.getElementById('bbLower').value);
        emaValue = parseFloat(document.getElementById('emaValueInput').value);
        rsiValue = parseFloat(document.getElementById('rsiValueInput').value);
        macdLine = parseFloat(document.getElementById('macdLineInput').value);
        signalLine = parseFloat(document.getElementById('signalLineInput').value);
        histogram = parseFloat(document.getElementById('histogramInput').value);
        
        // Validate inputs
        if (isNaN(currentPrice) || isNaN(bbUpper) || isNaN(bbMiddle) || isNaN(bbLower) || 
            isNaN(emaValue) || isNaN(rsiValue) || isNaN(macdLine) || isNaN(signalLine) || isNaN(histogram)) {
            alert('Please fill in all fields with valid numbers');
            return;
        }
    } else {
        // Use live calculated values
        currentPrice = currentLivePrice;
        const bb = calculateBollingerBands(priceHistory);
        const ema = calculateEMA(priceHistory, 20);
        const rsi = calculateRSI(priceHistory);
        const macd = calculateMACD(priceHistory);
        
        bbUpper = bb.upper;
        bbMiddle = bb.middle;
        bbLower = bb.lower;
        emaValue = ema;
        rsiValue = rsi;
        macdLine = macd.macdLine;
        signalLine = macd.signalLine;
        histogram = macd.histogram;
    }

    // Calculate indicator signals
    const signals = analyzeIndicators(currentPrice, bbUpper, bbMiddle, bbLower, emaValue, rsiValue, macdLine, signalLine, histogram);
    
    // Generate overall signal
    const overallSignal = generateOverallSignal(signals);
    
    // Display result
    displayResult(overallSignal, signals, currentPrice);
    
    // Add to history
    addToSignalHistory(overallSignal.signal, currentPrice);
    document.getElementById('signal-count').textContent = signalCount;
}

/**
 * Display trading signal result
 */
function displayResult(overallSignal, signals, currentPrice) {
    const resultDiv = document.getElementById('result');
    
    // Calculate targets for 100x leverage
    const targetPrice = overallSignal.signal.includes('BUY') 
        ? (currentPrice * 1.01).toFixed(2) 
        : (currentPrice * 0.99).toFixed(2);
    const stopPrice = overallSignal.signal.includes('BUY') 
        ? (currentPrice * 0.995).toFixed(2) 
        : (currentPrice * 1.005).toFixed(2);

    resultDiv.className = `result ${overallSignal.color} show`;
    resultDiv.innerHTML = `
        <div style="font-size: 1.6em; margin-bottom: 15px;">
            ${getSignalEmoji(overallSignal.signal)} ${overallSignal.signal}
        </div>
        <div style="font-size: 1em; opacity: 0.9;">
            Confidence: ${overallSignal.confidence} | Price: $${currentPrice.toFixed(2)}
        </div>
        
        <div class="details">
            <h4>📋 Indicator Analysis</h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin-bottom: 15px;">
                <div class="indicator-status ${getIndicatorClass(signals.bb.signal)}">
                    BB: ${signals.bb.signal}
                </div>
                <div class="indicator-status ${getIndicatorClass(signals.ema.signal)}">
                    EMA: ${signals.ema.signal}
                </div>
                <div class="indicator-status ${getIndicatorClass(signals.rsi.signal)}">
                    RSI: ${signals.rsi.signal}
                </div>
                <div class="indicator-status ${getIndicatorClass(signals.macd.signal)}">
                    MACD: ${signals.macd.signal}
                </div>
            </div>
            
            <div style="text-align: left; font-size: 0.9em; color: #a0a0a0;">
                <strong>Reasoning:</strong><br>
                • Bollinger Bands: ${signals.bb.reason}<br>
                • EMA: ${signals.ema.reason}<br>
                • RSI: ${signals.rsi.reason}<br>
                • MACD: ${signals.macd.reason}
            </div>

            ${overallSignal.signal !== 'HOLD / WAIT' ? `
            <div class="targets">
                <div class="target-box">
                    <h5>🎯 Target Price</h5>
                    <div class="value">$${targetPrice}</div>
                    <small>1% move = 100% profit at 100x</small>
                </div>
                <div class="target-box">
                    <h5>🛑 Stop Loss</h5>
                    <div class="value">$${stopPrice}</div>
                    <small>0.5% move = 50% loss at 100x</small>
                </div>
            </div>
            ` : ''}
        </div>

        ${overallSignal.signal !== 'HOLD / WAIT' ? `
        <div class="risk-warning">
            ⚠️ 100x LEVERAGE WARNING: This trade could result in 50-100% account loss within minutes. 
            Only risk what you can afford to lose completely.
        </div>
        ` : ''}
    `;
}

/**
 * Add signal to history
 */
function addToSignalHistory(signal, price) {
    signalCount++;
    const timestamp = new Date().toLocaleTimeString();
    signalHistory.unshift({
        time: timestamp,
        signal: signal,
        price: price.toFixed(2)
    });
    
    // Keep only last 10 signals
    if (signalHistory.length > 10) {
        signalHistory.pop();
    }
    
    updateSignalHistoryDisplay();
}

/**
 * Update signal history display
 */
function updateSignalHistoryDisplay() {
    const historyList = document.getElementById('history-list');
    historyList.innerHTML = '';
    
    if (signalHistory.length === 0) {
        historyList.innerHTML = '<div class="history-item"><span>No signals yet - fetch live data or calculate manually</span><span></span></div>';
        return;
    }
    
    signalHistory.forEach(item => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.innerHTML = `
            <span>${item.time} - ${item.signal}</span>
            <span>$${item.price}</span>
        `;
        historyList.appendChild(historyItem);
    });
}

/**
 * Helper functions
 */
function getSignalEmoji(signal) {
    if (signal.includes('BUY')) return '🚀';
    if (signal.includes('SELL')) return '📉';
    return '⏸️';
}

function getIndicatorClass(signal) {
    if (signal === 'BULLISH') return 'bullish';
    if (signal === 'BEARISH') return 'bearish';
    return 'neutral';
}

/**
 * Initialize application on page load
 */
window.onload = function() {
     registerCalculatorWindow();
    
    // Try to inject real Jupiter price immediately
    injectJupiterPrice();
    
    // Set up continuous price monitoring from Tampermonkey
    setInterval(injectJupiterPrice, 1000); // Check every second
    
    // Set initial live data (fallback if no Jupiter price)
    fetchLiveData();
    
    // Pre-fill manual inputs for testing
    document.getElementById('currentPrice').value = '150.21';
    document.getElementById('bbUpper').value = '150.37';
    document.getElementById('bbMiddle').value = '149.88';
    document.getElementById('bbLower').value = '149.39';
    document.getElementById('emaValueInput').value = '150.02';
    document.getElementById('rsiValueInput').value = '64.69';
    document.getElementById('macdLineInput').value = '0.2002';
    document.getElementById('signalLineInput').value = '0.0142';
    document.getElementById('histogramInput').value = '0.186';
};
