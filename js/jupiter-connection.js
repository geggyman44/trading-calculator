// ============================================
// JUPITER CONNECTION AND PRICE MANAGEMENT
// ============================================
// Add this at the very top of jupiter-connection.js
window.addEventListener('message', function(event) {
    // Listen for Tampermonkey messages
    if (event.data && event.data.type === 'JUPITER_PRICE_FROM_TM') {
        const price = parseFloat(event.data.price);
        if (!isNaN(price)) {
            console.log('🎉 Received price from Tampermonkey:', price);
            handleJupiterPriceUpdate(price);
        }
    }
});

let jupiterPriceReceived = false;
let jupiterWindow = null;

/**
 * Connect to Jupiter by opening a new window
 */
function connectToJupiter() {
    // Close existing window if open
    if (jupiterWindow && !jupiterWindow.closed) {
        jupiterWindow.close();
    }
    
    // Open Jupiter in a new window that we can communicate with
    jupiterWindow = window.open('https://jup.ag/perp/SOL-PERP', 'jupiterPerp', 'width=800,height=600');
    
    if (jupiterWindow) {
        document.getElementById('data-source').textContent = "Connecting to Jupiter...";
        
        // Listen for messages from the Jupiter window
        const messageListener = function(event) {
            if (event.source === jupiterWindow && event.data && event.data.type === 'JUPITER_PRICE_UPDATE') {
                const price = parseFloat(event.data.price);
                if (!isNaN(price)) {
                    handleJupiterPriceUpdate(price);
                }
            }
        };
        
        window.addEventListener('message', messageListener);
        
        // Check if window is closed
        const checkWindow = setInterval(() => {
            if (jupiterWindow.closed) {
                window.removeEventListener('message', messageListener);
                document.getElementById('data-source').textContent = "Jupiter Disconnected";
                jupiterPriceReceived = false;
                clearInterval(checkWindow);
            }
        }, 1000);
        
        alert('Jupiter window opened! Make sure Tampermonkey script is running on that page.');
    } else {
        alert('Failed to open Jupiter window. Please allow popups for this site.');
    }
}

/**
 * Handle price update from Jupiter
 * @param {number} price - Price received from Jupiter
 */
function handleJupiterPriceUpdate(price) {
    currentLivePrice = price;
    jupiterPriceReceived = true;
    
    // Update price history
    priceHistory.push(price);
    if (priceHistory.length > 50) {
        priceHistory.shift();
    }
    
    // Update UI
    document.getElementById('live-price').textContent = `$${price.toFixed(2)}`;
    document.getElementById('data-source').textContent = "Jupiter (Connected)";
    document.getElementById('last-update').textContent = new Date().toLocaleTimeString();
    
    // Auto-calculate with real data
    if (priceHistory.length >= 26) {
        const bb = calculateBollingerBands(priceHistory);
        const ema = calculateEMA(priceHistory, 20);
        const rsi = calculateRSI(priceHistory);
        const macd = calculateMACD(priceHistory);
        
        updateLiveDisplay(price, bb, ema, rsi, macd);
        updateIndicatorStatuses(price, bb, ema, rsi, macd);
        
        const signals = analyzeIndicators(price, bb.upper, bb.middle, bb.lower, ema, rsi, macd.macdLine, macd.signalLine, macd.histogram);
        const overallSignal = generateOverallSignal(signals);
        displayResult(overallSignal, signals, price);
        addToSignalHistory(overallSignal.signal, price);
        document.getElementById('signal-count').textContent = signalCount;
    }
}

/**
 * Try to inject price from localStorage (fallback method)
 * @returns {boolean} - Success status
 */
function injectJupiterPrice() {
    const jupiterPrice = localStorage.getItem('JUPITER_SOL_PERP_PRICE');
    if (jupiterPrice) {
        const price = parseFloat(jupiterPrice);
        currentLivePrice = price;
        jupiterPriceReceived = true;
        
        // Update price history for calculations
        priceHistory.push(price);
        if (priceHistory.length > 50) {
            priceHistory.shift();
        }
        
        // Update UI
        document.getElementById('live-price').textContent = `$${price.toFixed(2)}`;
        document.getElementById('data-source').textContent = "Jupiter (LocalStorage)";
        document.getElementById('last-update').textContent = new Date().toLocaleTimeString();
        
        // Calculate indicators with real price data
        if (priceHistory.length >= 26) {
            const bb = calculateBollingerBands(priceHistory);
            const ema = calculateEMA(priceHistory, 20);
            const rsi = calculateRSI(priceHistory);
            const macd = calculateMACD(priceHistory);
            
            updateLiveDisplay(price, bb, ema, rsi, macd);
            updateIndicatorStatuses(price, bb, ema, rsi, macd);
        }
        
        return true; // Successfully updated
    } else {
        if (!jupiterPriceReceived) {
            console.warn("Jupiter price not found in localStorage - using simulated data");
            document.getElementById('data-source').textContent = "Simulated API";
        }
        return false; // Fallback to simulated
    }
}

// Add this function to register the calculator window
function registerCalculatorWindow() {
    // Store reference so Tampermonkey can find us
    window.name = 'tradingCalculator';
    window.localStorage.setItem('CALCULATOR_WINDOW_READY', 'true');
    console.log('📡 Calculator registered for price updates');
}

/**
 * Generate simulated price for testing (when no real data available)
 * @returns {number} - Simulated price
 */
function generateSimulatedPrice() {
    // Simulate realistic price movement
    const lastPrice = priceHistory[priceHistory.length - 1];
    const change = (Math.random() - 0.5) * 0.4; // ±0.2% max change
    const newPrice = lastPrice + change;
    
    priceHistory.push(newPrice);
    if (priceHistory.length > 50) {
        priceHistory.shift(); // Keep only last 50 prices
    }
    
    currentLivePrice = newPrice;
    return newPrice;
}
