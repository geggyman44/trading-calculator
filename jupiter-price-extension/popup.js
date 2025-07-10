// Jupiter Price Bridge - Popup Script
document.addEventListener('DOMContentLoaded', function() {
    const priceDisplay = document.getElementById('price-display');
    const timestampDisplay = document.getElementById('timestamp');
    const jupiterStatus = document.getElementById('jupiter-status');
    const calculatorStatus = document.getElementById('calculator-status');
    const jupiterIndicator = document.getElementById('jupiter-indicator');
    const calculatorIndicator = document.getElementById('calculator-indicator');
    const refreshBtn = document.getElementById('refresh-btn');
    const testBtn = document.getElementById('test-btn');
    
    // Update display with current data
    function updateDisplay() {
        chrome.storage.local.get(['sol_price'], (result) => {
            if (result.sol_price) {
                const { price, timestamp } = result.sol_price;
                const age = Date.now() - timestamp;
                
                priceDisplay.textContent = `$${price.toFixed(2)}`;
                timestampDisplay.textContent = `Updated ${Math.floor(age/1000)}s ago`;
                
                if (age < 10000) {
                    jupiterStatus.textContent = 'Active';
                    jupiterIndicator.className = 'indicator active';
                } else {
                    jupiterStatus.textContent = 'Stale data';
                    jupiterIndicator.className = 'indicator inactive';
                }
            } else {
                priceDisplay.textContent = '$---';
                timestampDisplay.textContent = 'No data yet';
                jupiterStatus.textContent = 'No data';
                jupiterIndicator.className = 'indicator inactive';
            }
        });
        
        // Check if calculator tabs are open
        chrome.tabs.query({}, (tabs) => {
            const calculatorTabs = tabs.filter(tab => 
                tab.url && (tab.url.includes('localhost') || tab.url.includes('github.io'))
            );
            
            if (calculatorTabs.length > 0) {
                calculatorStatus.textContent = `${calculatorTabs.length} tab(s) open`;
                calculatorIndicator.className = 'indicator active';
            } else {
                calculatorStatus.textContent = 'No calculator tabs';
                calculatorIndicator.className = 'indicator inactive';
            }
        });
    }
    
    // Refresh button
    refreshBtn.addEventListener('click', () => {
        refreshBtn.textContent = '🔄 Refreshing...';
        
        // Send refresh message to all tabs
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                if (tab.url && tab.url.includes('jup.ag')) {
                    chrome.tabs.sendMessage(tab.id, { type: 'FORCE_REFRESH' });
                }
            });
        });
        
        setTimeout(() => {
            refreshBtn.textContent = '🔄 Force Refresh';
            updateDisplay();
        }, 2000);
    });
    
    // Test button
    testBtn.addEventListener('click', () => {
        testBtn.textContent = '🧪 Testing...';
        
        // Send test price to calculator
        const testPrice = {
            price: 155.53,
            timestamp: Date.now(),
            source: 'test'
        };
        
        chrome.storage.local.set({ 'sol_price': testPrice });
        
        setTimeout(() => {
            testBtn.textContent = '🧪 Test Connection';
            updateDisplay();
        }, 1000);
    });
    
    // Update display initially and every 2 seconds
    updateDisplay();
    setInterval(updateDisplay, 2000);
    
    // Listen for storage changes
    chrome.storage.onChanged.addListener(() => {
        updateDisplay();
    });
});