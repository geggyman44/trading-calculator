// ============================================
// TECHNICAL INDICATORS CALCULATIONS
// ============================================

/**
 * Calculate Simple Moving Average
 * @param {Array} prices - Array of price values
 * @param {number} period - Number of periods for calculation
 * @returns {number} - SMA value
 */
function calculateSMA(prices, period) {
    const slice = prices.slice(-period);
    return slice.reduce((sum, price) => sum + price, 0) / slice.length;
}

/**
 * Calculate Exponential Moving Average
 * @param {Array} prices - Array of price values
 * @param {number} period - Number of periods for calculation
 * @returns {number} - EMA value
 */
function calculateEMA(prices, period) {
    const k = 2 / (period + 1);
    let ema = prices[0];
    
    for (let i = 1; i < prices.length; i++) {
        ema = (prices[i] * k) + (ema * (1 - k));
    }
    
    return ema;
}

/**
 * Calculate Relative Strength Index
 * @param {Array} prices - Array of price values
 * @param {number} period - Number of periods for calculation (default: 14)
 * @returns {number} - RSI value (0-100)
 */
function calculateRSI(prices, period = 14) {
    let gains = 0;
    let losses = 0;
    
    for (let i = 1; i <= period; i++) {
        const change = prices[prices.length - i] - prices[prices.length - i - 1];
        if (change > 0) gains += change;
        else losses -= change;
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    const rs = avgGain / avgLoss;
    
    return 100 - (100 / (1 + rs));
}

/**
 * Calculate Bollinger Bands
 * @param {Array} prices - Array of price values
 * @param {number} period - Number of periods for calculation (default: 20)
 * @param {number} stdDev - Standard deviation multiplier (default: 2)
 * @returns {Object} - {upper, middle, lower}
 */
function calculateBollingerBands(prices, period = 20, stdDev = 2) {
    const sma = calculateSMA(prices, period);
    const slice = prices.slice(-period);
    
    const variance = slice.reduce((sum, price) => {
        return sum + Math.pow(price - sma, 2);
    }, 0) / period;
    
    const std = Math.sqrt(variance);
    
    return {
        upper: sma + (std * stdDev),
        middle: sma,
        lower: sma - (std * stdDev)
    };
}

/**
 * Calculate MACD (Moving Average Convergence Divergence)
 * @param {Array} prices - Array of price values
 * @returns {Object} - {macdLine, signalLine, histogram}
 */
function calculateMACD(prices) {
    const ema12 = calculateEMA(prices, 12);
    const ema26 = calculateEMA(prices, 26);
    const macdLine = ema12 - ema26;
    
    // Simplified signal line calculation (normally would be 9-period EMA of MACD line)
    const signalLine = macdLine * 0.8; // Approximation for demonstration
    const histogram = macdLine - signalLine;
    
    return { macdLine, signalLine, histogram };
}

/**
 * Analyze all indicators and generate individual signals
 * @param {number} price - Current price
 * @param {number} bbUpper - Bollinger Band upper value
 * @param {number} bbMiddle - Bollinger Band middle value
 * @param {number} bbLower - Bollinger Band lower value
 * @param {number} ema - EMA value
 * @param {number} rsi - RSI value
 * @param {number} macd - MACD line value
 * @param {number} signal - MACD signal line value
 * @param {number} histogram - MACD histogram value
 * @returns {Object} - Individual indicator signals
 */
function analyzeIndicators(price, bbUpper, bbMiddle, bbLower, ema, rsi, macd, signal, histogram) {
    const signals = {};

    // Bollinger Bands Analysis
    const bbPosition = (price - bbLower) / (bbUpper - bbLower);
    if (bbPosition > 0.8) {
        signals.bb = { signal: 'BEARISH', strength: 'STRONG', reason: 'Near upper band (overbought)' };
    } else if (bbPosition < 0.2) {
        signals.bb = { signal: 'BULLISH', strength: 'STRONG', reason: 'Near lower band (oversold)' };
    } else if (bbPosition > 0.6) {
        signals.bb = { signal: 'BEARISH', strength: 'WEAK', reason: 'Above middle, approaching upper' };
    } else if (bbPosition < 0.4) {
        signals.bb = { signal: 'BULLISH', strength: 'WEAK', reason: 'Below middle, approaching lower' };
    } else {
        signals.bb = { signal: 'NEUTRAL', strength: 'NEUTRAL', reason: 'In middle range' };
    }

    // EMA Analysis
    const emaDiff = ((price - ema) / ema) * 100;
    if (emaDiff > 0.2) {
        signals.ema = { signal: 'BULLISH', strength: 'STRONG', reason: `${emaDiff.toFixed(2)}% above EMA` };
    } else if (emaDiff < -0.2) {
        signals.ema = { signal: 'BEARISH', strength: 'STRONG', reason: `${Math.abs(emaDiff).toFixed(2)}% below EMA` };
    } else if (emaDiff > 0) {
        signals.ema = { signal: 'BULLISH', strength: 'WEAK', reason: `${emaDiff.toFixed(2)}% above EMA` };
    } else if (emaDiff < 0) {
        signals.ema = { signal: 'BEARISH', strength: 'WEAK', reason: `${Math.abs(emaDiff).toFixed(2)}% below EMA` };
    } else {
        signals.ema = { signal: 'NEUTRAL', strength: 'NEUTRAL', reason: 'At EMA level' };
    }

    // RSI Analysis
    if (rsi > 70) {
        signals.rsi = { signal: 'BEARISH', strength: 'STRONG', reason: `RSI ${rsi.toFixed(1)} - Overbought` };
    } else if (rsi < 30) {
        signals.rsi = { signal: 'BULLISH', strength: 'STRONG', reason: `RSI ${rsi.toFixed(1)} - Oversold` };
    } else if (rsi > 60) {
        signals.rsi = { signal: 'BULLISH', strength: 'WEAK', reason: `RSI ${rsi.toFixed(1)} - Bullish momentum` };
    } else if (rsi < 40) {
        signals.rsi = { signal: 'BEARISH', strength: 'WEAK', reason: `RSI ${rsi.toFixed(1)} - Bearish momentum` };
    } else {
        signals.rsi = { signal: 'NEUTRAL', strength: 'NEUTRAL', reason: `RSI ${rsi.toFixed(1)} - Neutral zone` };
    }

    // MACD Analysis
    if (macd > signal && histogram > 0) {
        signals.macd = { signal: 'BULLISH', strength: 'STRONG', reason: 'MACD above signal with positive histogram' };
    } else if (macd < signal && histogram < 0) {
        signals.macd = { signal: 'BEARISH', strength: 'STRONG', reason: 'MACD below signal with negative histogram' };
    } else if (macd > signal) {
        signals.macd = { signal: 'BULLISH', strength: 'WEAK', reason: 'MACD above signal line' };
    } else if (macd < signal) {
        signals.macd = { signal: 'BEARISH', strength: 'WEAK', reason: 'MACD below signal line' };
    } else {
        signals.macd = { signal: 'NEUTRAL', strength: 'NEUTRAL', reason: 'MACD near signal line' };
    }

    return signals;
}

/**
 * Generate overall trading signal based on individual indicator signals
 * @param {Object} signals - Individual indicator signals
 * @returns {Object} - Overall signal with confidence level
 */
function generateOverallSignal(signals) {
    let bullishCount = 0;
    let bearishCount = 0;
    let strongBullishCount = 0;
    let strongBearishCount = 0;

    Object.values(signals).forEach(signal => {
        if (signal.signal === 'BULLISH') {
            bullishCount++;
            if (signal.strength === 'STRONG') strongBullishCount++;
        } else if (signal.signal === 'BEARISH') {
            bearishCount++;
            if (signal.strength === 'STRONG') strongBearishCount++;
        }
    });

    // Determine overall signal based on indicator alignment
    if (strongBullishCount >= 2 && bullishCount >= 3) {
        return { signal: 'STRONG BUY', confidence: 'HIGH', color: 'strong-buy' };
    } else if (strongBearishCount >= 2 && bearishCount >= 3) {
        return { signal: 'STRONG SELL', confidence: 'HIGH', color: 'strong-sell' };
    } else if (bullishCount >= 3) {
        return { signal: 'BUY', confidence: 'MEDIUM', color: 'buy' };
    } else if (bearishCount >= 3) {
        return { signal: 'SELL', confidence: 'MEDIUM', color: 'sell' };
    } else if (bullishCount > bearishCount) {
        return { signal: 'WEAK BUY', confidence: 'LOW', color: 'buy' };
    } else if (bearishCount > bullishCount) {
        return { signal: 'WEAK SELL', confidence: 'LOW', color: 'sell' };
    } else {
        return { signal: 'HOLD / WAIT', confidence: 'NEUTRAL', color: 'hold' };
    }
}