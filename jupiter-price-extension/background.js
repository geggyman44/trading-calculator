// Jupiter Price Bridge - Background Script
console.log('🔧 Jupiter Price Bridge background script loaded');

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'PRICE_UPDATE') {
        console.log('📨 Received price update:', message.data);
        
        // Store the price data
        chrome.storage.local.set({ 'sol_price': message.data });
        
        // Broadcast to all tabs with calculator
        broadcastToCalculatorTabs(message.data);
    }
});

// Broadcast price to all calculator tabs
function broadcastToCalculatorTabs(priceData) {
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
            if (tab.url && (tab.url.includes('localhost') || tab.url.includes('github.io'))) {
                chrome.tabs.sendMessage(tab.id, {
                    type: 'PRICE_BROADCAST',
                    data: priceData
                }).catch(() => {
                    // Ignore errors for tabs that can't receive messages
                });
            }
        });
    });
}

// Clean up old price data periodically
setInterval(() => {
    chrome.storage.local.get(['sol_price'], (result) => {
        if (result.sol_price) {
            const age = Date.now() - result.sol_price.timestamp;
            if (age > 30000) { // 30 seconds old
                console.log('🗑️ Cleaning up old price data');
                chrome.storage.local.remove('sol_price');
            }
        }
    });
}, 10000); // Check every 10 seconds
