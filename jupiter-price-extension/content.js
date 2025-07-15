// Jupiter Price Bridge - Content Script
console.log('🚀 Jupiter Price Bridge loaded on:', window.location.hostname);

// Check if we're on Jupiter or Calculator
const isJupiter = window.location.hostname.includes('jup.ag');
const isCalculator = window.location.hostname.includes('localhost') || 
                   window.location.hostname.includes('github.io');

if (isJupiter) {
    console.log('📊 Running on Jupiter - Starting price scraper');
    startJupiterPriceScraper();
} else if (isCalculator) {
    console.log('🧮 Running on Calculator - Starting price receiver');
    startCalculatorPriceReceiver();
}

/**
 * Jupiter Side - Scrape and store price
 */
function startJupiterPriceScraper() {
    function scrapeSolPrice() {
    try {
        let price = null;
        
        // Method 1: Look for perp price elements with specific classes
        const perpPriceElements = document.querySelectorAll('span[class*="text-v3-perps-"]');
        for (const element of perpPriceElements) {
            const text = element.textContent?.trim().replace(/"/g, ''); // Remove quotes
            const numPrice = parseFloat(text);
            if (!isNaN(numPrice) && numPrice > 100 && numPrice < 300) {
                price = numPrice;
                console.log('Found perp price via class:', price);
                break;
            }
        }
        
        // Method 2: Look for font-mono elements (backup)
        if (!price) {
            const monoElements = document.querySelectorAll('span.font-mono');
            for (const element of monoElements) {
                const text = element.textContent?.trim().replace(/"/g, '');
                const numPrice = parseFloat(text);
                if (!isNaN(numPrice) && numPrice > 100 && numPrice < 300) {
                    price = numPrice;
                    console.log('Found perp price via font-mono:', price);
                    break;
                }
            }
        }
        
        if (price) {
            // Store price using Chrome extension storage
            const priceData = {
                price: price,
                timestamp: Date.now(),
                source: 'jupiter-extension'
            };
            
            chrome.storage.local.set({ 'sol_price': priceData }, () => {
                console.log('💾 Stored SOL perp price:', price);
            });
            
            // Also send message to background script
            chrome.runtime.sendMessage({
                type: 'PRICE_UPDATE',
                data: priceData
            });
        } else {
            console.warn('⚠️ Could not find SOL perp price on page');
        }
    } catch (error) {
        console.error('❌ Error scraping price:', error);
    }
}
}
    

/**
 * Calculator Side - Receive and inject price
 */
function startCalculatorPriceReceiver() {
    // Listen for price updates from storage
    function checkForPriceUpdate() {
        chrome.storage.local.get(['sol_price'], (result) => {
            if (result.sol_price) {
                const { price, timestamp, source } = result.sol_price;
                const now = Date.now();
                
                // Only use price if it's less than 10 seconds old
                if (now - timestamp < 10000) {
                    injectPriceIntoCalculator(price, timestamp);
                } else {
                    console.log('⏰ Price data is too old, waiting for fresh data...');
                }
            }
        });
    }
    
    // Inject price into calculator
    function injectPriceIntoCalculator(price, timestamp) {
        try {
            // Update live price display
            const livePriceElement = document.getElementById('live-price');
            if (livePriceElement) {
                livePriceElement.textContent = `$${price.toFixed(2)}`;
            }
            
            // Update data source
            const dataSourceElement = document.getElementById('data-source');
            if (dataSourceElement) {
                dataSourceElement.textContent = 'Jupiter (Extension)';
            }
            
            // Update timestamp
            const lastUpdateElement = document.getElementById('last-update');
            if (lastUpdateElement) {
                lastUpdateElement.textContent = new Date(timestamp).toLocaleTimeString();
            }
            
            // If calculator has global functions, use them
            if (typeof window.handleJupiterPriceUpdate === 'function') {
                window.handleJupiterPriceUpdate(price);
                console.log('🎉 Injected price via global function:', price);
            } else if (typeof window.currentLivePrice !== 'undefined') {
                window.currentLivePrice = price;
                console.log('🎉 Updated global price variable:', price);
            } else {
                console.log('💉 Updated price display elements:', price);
            }
            
            // Trigger custom event for calculator to listen to
            window.dispatchEvent(new CustomEvent('jupiterPriceUpdate', {
                detail: { price, timestamp }
            }));
            
        } catch (error) {
            console.error('❌ Error injecting price:', error);
        }
    }
    
    // Listen for storage changes (real-time updates)
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes.sol_price) {
            const newPrice = changes.sol_price.newValue;
            if (newPrice) {
                console.log('🔄 Received price update:', newPrice.price);
                injectPriceIntoCalculator(newPrice.price, newPrice.timestamp);
            }
        }
    });
    
    // Check for existing price on load
    setTimeout(checkForPriceUpdate, 1000);
    
    // Fallback: check periodically
    setInterval(checkForPriceUpdate, 3000);
}