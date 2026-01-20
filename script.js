// ==================== GOOGLE SHEETS INTEGRATION ====================
// Google Sheets Configuration
const SHEET_ID = '1Iw76w4c0Jp8xwSj1UgukZlkFRGOclkvJk9TeaZzuiw0';
const SHEET_NAME = 'Sheet1'; // Change if your sheet has a different name
const API_KEY = ''; // Optional: Add your Google API key for higher limits

// Construct the Google Sheets URL (using CSV export for public sheets)
// Note: We'll add a cache-buster parameter when fetching
const SHEET_BASE_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${SHEET_NAME}`;

// Data refresh interval (30 seconds)
const REFRESH_INTERVAL = 30000;

// Store fetched data globally
let sheetData = [];
let lastFetchTime = null;

// Fetch data from Google Sheets
async function fetchSheetData() {
    const refreshIndicator = document.getElementById('refresh-indicator');

    try {
        // Show refresh indicator
        if (lastFetchTime) {
            refreshIndicator.classList.add('show');
        }

        // Add cache-busting parameter to force fresh data
        const cacheBuster = new Date().getTime();
        const SHEET_URL = `${SHEET_BASE_URL}&_cb=${cacheBuster}`;

        const response = await fetch(SHEET_URL);
        const text = await response.text();

        // Parse the JSONP response
        const jsonString = text.substring(47, text.length - 2);
        const data = JSON.parse(jsonString);

        // Extract rows from the response
        const rows = data.table.rows;
        const cols = data.table.cols;

        // Get column headers - also try 'id' field if label is empty
        const headers = cols.map((col, idx) => {
            // Try label first, then id, then generate a default
            return col.label || col.id || `col${idx}`;
        });
        console.log('Column headers from sheet:', headers);
        console.log('Raw column data:', cols);

        // Parse data rows
        sheetData = rows.map(row => {
            const rowData = {};
            row.c.forEach((cell, index) => {
                const header = headers[index] || `col${index}`;
                rowData[header] = cell ? (cell.v !== null ? cell.v : '') : '';
                // Also store formatted value if available
                if (cell && cell.f) {
                    rowData[header + '_formatted'] = cell.f;
                }
            });
            return rowData;
        });

        console.log('Fetched data:', sheetData);
        console.log('Total rows fetched:', sheetData.length);

        // Update the dashboard with new data
        updateDashboard(sheetData);

        lastFetchTime = new Date();

        // Hide refresh indicator
        setTimeout(() => {
            refreshIndicator.classList.remove('show');
        }, 1000);

    } catch (error) {
        console.error('Error fetching sheet data:', error);
        refreshIndicator.classList.remove('show');

        // Show error in transactions container
        const container = document.getElementById('transactions-container');
        if (container && !sheetData.length) {
            container.innerHTML = `
                <div class="error-message">
                    <p>Unable to load data from Google Sheets.</p>
                    <p style="font-size: 12px; margin-top: 10px;">Make sure the sheet is publicly accessible (Share > Anyone with the link can view)</p>
                </div>
            `;
        }
    }
}

// Update dashboard with sheet data
function updateDashboard(data) {
    if (!data || data.length === 0) {
        document.getElementById('transactions-container').innerHTML =
            '<div class="loading-message">No transactions found</div>';
        return;
    }

    // Calculate statistics from the data
    const stats = calculateStats(data);

    // Update stat cards
    updateStatCards(stats);

    // Update transactions table
    updateTransactionsTable(data);

    // Update breakdown chart
    updateBreakdownChart(data);
}

// Calculate statistics from data
function calculateStats(data) {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    let totalBalance = 0;
    let thisWeek = 0;
    let thisMonth = 0;
    let thisYear = 0;

    data.forEach(row => {
        // Try to get amount from various possible column names
        // Your sheet uses "AMT W/ VAt" as the column name
        const amount = parseFloat(
            row['AMT W/ VAt'] ||
            row['AMT W/ VAT'] ||
            row['AMT W/ Vat'] ||
            row['AMOUNT WITH VAT'] ||
            row['Amount'] ||
            row['amount'] ||
            row['AMOUNT'] ||
            row['Amount with VAT'] ||
            0
        ) || 0;

        // Try to get date from various possible column names
        const dateStr = row['Date'] || row['date'] || row['DATE'] || '';
        let rowDate;

        if (dateStr) {
            // Handle different date formats
            if (typeof dateStr === 'number') {
                // Excel serial date
                rowDate = new Date((dateStr - 25569) * 86400 * 1000);
            } else {
                rowDate = new Date(dateStr);
            }
        } else {
            rowDate = new Date(); // Default to today if no date
        }

        // Add to totals
        totalBalance += amount;

        if (rowDate >= startOfWeek) {
            thisWeek += amount;
        }
        if (rowDate >= startOfMonth) {
            thisMonth += amount;
        }
        if (rowDate >= startOfYear) {
            thisYear += amount;
        }
    });

    return {
        totalBalance,
        thisWeek,
        thisMonth,
        thisYear,
        transactionCount: data.length
    };
}

// Update stat cards with calculated values
function updateStatCards(stats) {
    // Format currency
    const formatCurrency = (num) => '₱' + num.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

    document.getElementById('total-balance').textContent = formatCurrency(stats.totalBalance);
    document.getElementById('this-week').textContent = formatCurrency(stats.thisWeek);
    document.getElementById('this-month').textContent = formatCurrency(stats.thisMonth);
    document.getElementById('this-year').textContent = formatCurrency(stats.thisYear);

    // Update change indicators
    document.getElementById('balance-change').innerHTML = `
        <span class="change-icon">✦</span>
        <span>${stats.transactionCount} transactions</span>
    `;
    document.getElementById('week-change').innerHTML = `
        <span class="change-icon">✦</span>
        <span>this week</span>
    `;
    document.getElementById('month-change').innerHTML = `
        <span class="change-icon">✦</span>
        <span>this month</span>
    `;
    document.getElementById('year-change').innerHTML = `
        <span class="change-icon">✦</span>
        <span>year to date</span>
    `;
}

// Update transactions table
function updateTransactionsTable(data) {
    const container = document.getElementById('transactions-container');

    // Get the most recent 10 transactions
    const recentTransactions = data.slice(-10).reverse();

    if (recentTransactions.length === 0) {
        container.innerHTML = '<div class="loading-message">No transactions to display</div>';
        return;
    }

    const clusterIcons = ['yellow', 'blue', 'red'];

    const transactionsHTML = recentTransactions.map((row, index) => {
        // Log first row to see actual keys
        if (index === 0) {
            console.log('Row keys:', Object.keys(row));
            console.log('First row data:', row);
        }

        // Get values matching your Google Sheet column names
        const date = row['Date'] || row['date'] || row['DATE'] || '';
        const cluster = row['Cluster'] || row['cluster'] || '';
        const expenseDesc = row['Expense description'] || row['Expense Description'] || row['expense description'] || '';
        const accountName = row['Account Name'] || row['Account name'] || row['account name'] || '';
        const vendor = row['vendor name'] || row['Vendor'] || row['vendor'] || row['Submitted'] || '';
        const amount = row['AMT W/ VAt'] || row['AMT W/ VAT'] || row['AMOUNT WITH VAT'] || row['Amount'] || 0;

        // Format date
        let formattedDate = '';
        if (date) {
            let dateObj;
            if (typeof date === 'number') {
                dateObj = new Date((date - 25569) * 86400 * 1000);
            } else {
                dateObj = new Date(date);
            }
            const month = dateObj.toLocaleString('en-US', { month: 'short' });
            const day = dateObj.getDate();
            const year = dateObj.getFullYear();
            formattedDate = `${month} ${day}<br>${year}`;
        }

        // Format amount
        const formattedAmount = '₱' + parseFloat(amount || 0).toLocaleString('en-PH');

        // Cycle through cluster icon colors
        const iconColor = clusterIcons[index % 3];

        return `
            <div class="transaction-row">
                <span class="date-cell">${formattedDate}</span>
                <span class="cluster-cell">
                    <div class="cluster-icon ${iconColor}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <rect x="3" y="3" width="7" height="7" rx="1"/>
                            <rect x="14" y="3" width="7" height="7" rx="1"/>
                            <rect x="3" y="14" width="7" height="7" rx="1"/>
                            <rect x="14" y="14" width="7" height="7" rx="1"/>
                        </svg>
                    </div>
                </span>
                <span class="description-cell">
                    <strong>${cluster || 'N/A'}</strong><br>
                    <small>${expenseDesc || ''}</small>
                </span>
                <span class="account-cell">${accountName || 'N/A'}</span>
                <span class="submitted-cell">${vendor || ''}</span>
                <span class="amount-cell">${formattedAmount}</span>
            </div>
        `;
    }).join('');

    container.innerHTML = transactionsHTML;
}

// Store categories globally for donut chart
let chartCategories = [];

// Update breakdown chart with categorized data
function updateBreakdownChart(data) {
    // Categorize by account name
    const categories = {};

    data.forEach(row => {
        const accountName = row['Account Name'] || row['Account name'] || 'Other';
        const amount = parseFloat(row['AMT W/ VAt'] || row['AMT W/ VAT'] || row['Amount'] || 0) || 0;

        // Simplify category name
        let category = 'Other';
        const accountLower = accountName.toLowerCase();

        if (accountLower.includes('bakery') || accountLower.includes('consumable')) {
            category = 'Bakery Supplies';
        } else if (accountLower.includes('perishable') || accountLower.includes('ingredient')) {
            category = 'Ingredients';
        } else if (accountLower.includes('packaging')) {
            category = 'Packaging';
        } else if (accountLower.includes('utilities')) {
            category = 'Utilities';
        }

        categories[category] = (categories[category] || 0) + amount;
    });

    const colors = ['#F5A623', '#E8721C', '#D0021B', '#8B0000'];
    const sortedCategories = Object.entries(categories).sort((a, b) => b[1] - a[1]).slice(0, 4);

    // Store for donut chart
    chartCategories = sortedCategories.map(([name, value], index) => ({
        name,
        value,
        color: colors[index]
    }));

    // Update legend
    const legendContainer = document.querySelector('.breakdown-legend');
    if (legendContainer && sortedCategories.length > 0) {
        legendContainer.innerHTML = sortedCategories.map(([name, amount], index) => `
            <div class="legend-item">
                <span class="legend-color" style="background: ${colors[index]}"></span>
                <span class="legend-value">₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 0 })}</span>
                <span class="legend-label">${name}</span>
            </div>
        `).join('');
    }

    // Redraw donut chart with new data
    drawDonutChart();
}

// Initialize data fetching
function initDataFetch() {
    // Initial fetch
    fetchSheetData();

    // Set up periodic refresh
    setInterval(fetchSheetData, REFRESH_INTERVAL);
}

// Update time and date
function updateDateTime() {
    const now = new Date();

    // Format time
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const timeString = `${hours}:${minutes}:${seconds} ${ampm}`;

    // Format date
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateString = now.toLocaleDateString('en-US', options);

    document.getElementById('current-time').textContent = timeString;
    document.getElementById('current-date').textContent = dateString;
}

// Update every second
setInterval(updateDateTime, 1000);
updateDateTime();

// Initialize data fetch on page load
initDataFetch();

// Draw Donut Chart
function drawDonutChart() {
    const canvas = document.getElementById('donutChart');
    const ctx = canvas.getContext('2d');

    // High DPI support
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const radius = Math.min(centerX, centerY) - 10;
    const innerRadius = radius * 0.55;

    // Use actual data from sheet, or defaults if not loaded yet
    const data = chartCategories.length > 0
        ? chartCategories.map(cat => ({ value: cat.value, color: cat.color }))
        : [
            { value: 12000, color: '#F5A623' },
            { value: 6500, color: '#E8721C' },
            { value: 4000, color: '#D0021B' },
            { value: 3000, color: '#8B0000' }
        ];

    const total = data.reduce((sum, item) => sum + item.value, 0);
    let startAngle = -Math.PI / 2;

    // Draw segments with gradient and shadow
    data.forEach((item, index) => {
        const sliceAngle = (item.value / total) * 2 * Math.PI;
        const endAngle = startAngle + sliceAngle;

        // Create gradient for each segment
        const gradient = ctx.createRadialGradient(centerX, centerY, innerRadius, centerX, centerY, radius);
        gradient.addColorStop(0, item.color);
        gradient.addColorStop(1, shadeColor(item.color, -20));

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();

        // Add shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        ctx.fillStyle = gradient;
        ctx.fill();

        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        startAngle = endAngle;
    });

    // Draw inner circle (donut hole)
    const holeGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, innerRadius);
    holeGradient.addColorStop(0, '#FFFFFF');
    holeGradient.addColorStop(1, '#F8F8F8');

    ctx.beginPath();
    ctx.arc(centerX, centerY, innerRadius, 0, 2 * Math.PI);
    ctx.fillStyle = holeGradient;
    ctx.fill();

    // Add subtle inner shadow
    ctx.beginPath();
    ctx.arc(centerX, centerY, innerRadius, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.lineWidth = 3;
    ctx.stroke();
}

// Helper function to shade colors
function shadeColor(color, percent) {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (0x1000000 +
        (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
        (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
        (B < 255 ? B < 1 ? 0 : B : 255)
    ).toString(16).slice(1);
}

// Draw Trend Chart
function drawTrendChart() {
    const canvas = document.getElementById('trendChart');
    const ctx = canvas.getContext('2d');

    // High DPI support
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';

    const width = rect.width;
    const height = rect.height;
    const padding = 20;

    // Data points
    const points = [
        { x: padding, y: height - 20 },
        { x: width * 0.35, y: height - 30 },
        { x: width * 0.65, y: height - 40 },
        { x: width - padding, y: height - 25 }
    ];

    // Draw the line with gradient
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    // Smooth curve through points
    for (let i = 0; i < points.length - 1; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2;
        const yc = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }
    ctx.quadraticCurveTo(
        points[points.length - 1].x,
        points[points.length - 1].y,
        points[points.length - 1].x,
        points[points.length - 1].y
    );

    ctx.strokeStyle = '#E8E8E8';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Draw points
    points.forEach((point, index) => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = index === 2 ? '#C41E3A' : '#D0D0D0';
        ctx.fill();

        if (index === 2) {
            // Highlight point with glow
            ctx.beginPath();
            ctx.arc(point.x, point.y, 8, 0, 2 * Math.PI);
            ctx.strokeStyle = 'rgba(196, 30, 58, 0.3)';
            ctx.lineWidth = 3;
            ctx.stroke();
        }
    });
}

// Initialize charts on load
window.addEventListener('load', () => {
    drawDonutChart();
    drawTrendChart();
});

// Redraw on resize
window.addEventListener('resize', () => {
    drawDonutChart();
    drawTrendChart();
});

// Filter tab functionality
document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', function() {
        document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
        this.classList.add('active');
    });
});

// Add hover effects to transaction rows
document.querySelectorAll('.transaction-row').forEach(row => {
    row.addEventListener('mouseenter', function() {
        this.style.backgroundColor = '#FFF9E6';
        this.style.transition = 'background-color 0.3s ease';
    });

    row.addEventListener('mouseleave', function() {
        this.style.backgroundColor = 'transparent';
    });
});

// Animate numbers on load
function animateValue(element, start, end, duration) {
    const range = end - start;
    const increment = end > start ? 1 : -1;
    const stepTime = Math.abs(Math.floor(duration / range));
    let current = start;

    const timer = setInterval(() => {
        current += increment * Math.ceil(range / 50);
        if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
            current = end;
            clearInterval(timer);
        }
        element.textContent = '₱' + current.toLocaleString();
    }, stepTime);
}

// Trigger animation when stat cards are visible
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const valueElement = entry.target.querySelector('.stat-value');
            if (valueElement && !valueElement.dataset.animated) {
                const text = valueElement.textContent;
                const value = parseInt(text.replace(/[₱,]/g, ''));
                valueElement.dataset.animated = 'true';
                animateValue(valueElement, 0, value, 1000);
            }
        }
    });
}, { threshold: 0.5 });

document.querySelectorAll('.stat-card').forEach(card => {
    observer.observe(card);
});

// ==================== CHATBOT ====================
const chatbotToggle = document.getElementById('chatbot-toggle');
const chatbotWindow = document.getElementById('chatbot-window');
const chatbotClose = document.getElementById('chatbot-close');
const chatbotMessages = document.getElementById('chatbot-messages');
const chatbotInput = document.getElementById('chatbot-input');
const chatbotSend = document.getElementById('chatbot-send');
const suggestionBtns = document.querySelectorAll('.suggestion-btn');
const chatbotBadge = document.querySelector('.chatbot-badge');

// Toggle chatbot window
chatbotToggle.addEventListener('click', () => {
    chatbotWindow.classList.toggle('active');
    if (chatbotWindow.classList.contains('active')) {
        chatbotBadge.style.display = 'none';
        chatbotInput.focus();
    }
});

chatbotClose.addEventListener('click', () => {
    chatbotWindow.classList.remove('active');
});

// Send message function
function sendMessage(message) {
    if (!message.trim()) return;

    // Add user message
    addMessage(message, 'user');
    chatbotInput.value = '';

    // Show typing indicator
    showTypingIndicator();

    // Simulate bot response
    setTimeout(() => {
        removeTypingIndicator();
        const response = getBotResponse(message);
        addMessage(response, 'bot');
    }, 1000 + Math.random() * 1000);
}

// Add message to chat
function addMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${sender}`;

    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    if (sender === 'bot') {
        messageDiv.innerHTML = `
            <img src="julies-logo.png" alt="Julie's" class="message-avatar">
            <div class="message-content">
                <p>${text}</p>
                <span class="message-time">${timeString}</span>
            </div>
        `;
    } else {
        messageDiv.innerHTML = `
            <div class="message-avatar">J</div>
            <div class="message-content">
                <p>${text}</p>
                <span class="message-time">${timeString}</span>
            </div>
        `;
    }

    chatbotMessages.appendChild(messageDiv);
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
}

// Show typing indicator
function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'chat-message bot typing';
    typingDiv.innerHTML = `
        <img src="julies-logo.png" alt="Julie's" class="message-avatar">
        <div class="message-content">
            <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `;
    chatbotMessages.appendChild(typingDiv);
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
}

// Remove typing indicator
function removeTypingIndicator() {
    const typingMessage = chatbotMessages.querySelector('.typing');
    if (typingMessage) {
        typingMessage.remove();
    }
}

// Bot responses
function getBotResponse(message) {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('balance') || lowerMessage.includes('total')) {
        return "Your current total balance is <strong>₱75,300</strong>! 🎉 That's an increase of ₱3,200 this month. Great job managing your finances!";
    }

    if (lowerMessage.includes('transaction') || lowerMessage.includes('recent')) {
        return "Your recent transactions include:<br>• ₱546 - Bakery Supplies (Jan 20)<br>• ₱544 - Perishable Ingredients (Jan 18)<br>• ₱4,586 - Consumable Items (Jan 18)<br><br>Would you like more details?";
    }

    if (lowerMessage.includes('budget') || lowerMessage.includes('help')) {
        return "I can help with budget planning! 📊 Based on your spending:<br>• Food & Dining: ₱12,000<br>• Shopping: ₱6,500<br>• Transport: ₱4,000<br><br>Would you like tips to optimize your budget?";
    }

    if (lowerMessage.includes('week')) {
        return "This week you've spent <strong>₱3,550</strong>, which is ₱550 more than last week. Your main expenses were in bakery supplies.";
    }

    if (lowerMessage.includes('month')) {
        return "This month's total is <strong>₱28,500</strong>. That's ₱3,000 less than last month - you're doing great at saving! 👏";
    }

    if (lowerMessage.includes('year')) {
        return "Your yearly total is <strong>₱218,000</strong> with a positive change of ₱25,200! Your bakeshop is doing well! 🥐";
    }

    if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
        return "Hello Jeanvie! 👋 How can I assist you with Julie's Bakeshop finances today?";
    }

    if (lowerMessage.includes('thank')) {
        return "You're welcome! 😊 Feel free to ask if you need anything else. I'm always here to help with your bakeshop finances!";
    }

    if (lowerMessage.includes('pcf') || lowerMessage.includes('petty cash')) {
        return "To add a new PCF (Petty Cash Fund) entry, click the <strong>Add PCF</strong> button on the dashboard. I can guide you through the process if needed!";
    }

    // Default response
    const defaultResponses = [
        "I'm here to help with your Julie's Bakeshop finances! You can ask about your balance, transactions, budget, or any financial questions. 🥐",
        "I can help you with balance inquiries, transaction history, budget planning, and more! What would you like to know?",
        "Feel free to ask about your weekly, monthly, or yearly finances. I'm your friendly bakeshop assistant! 😊"
    ];

    return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
}

// Event listeners
chatbotSend.addEventListener('click', () => {
    sendMessage(chatbotInput.value);
});

chatbotInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage(chatbotInput.value);
    }
});

// Suggestion buttons
suggestionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const message = btn.dataset.message;
        sendMessage(message);
    });
});

// ==================== PCF MODAL ====================
const addPcfBtn = document.getElementById('add-pcf-btn');
const pcfModal = document.getElementById('pcf-modal');
const pcfModalClose = document.getElementById('pcf-modal-close');
const pcfForm = document.getElementById('pcf-form');

// Open modal
addPcfBtn.addEventListener('click', () => {
    pcfModal.classList.add('active');
    document.body.style.overflow = 'hidden';
});

// Close modal
pcfModalClose.addEventListener('click', () => {
    pcfModal.classList.remove('active');
    document.body.style.overflow = '';
});

// Close modal when clicking outside
pcfModal.addEventListener('click', (e) => {
    if (e.target === pcfModal) {
        pcfModal.classList.remove('active');
        document.body.style.overflow = '';
    }
});

// Close modal with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && pcfModal.classList.contains('active')) {
        pcfModal.classList.remove('active');
        document.body.style.overflow = '';
    }
});

// Handle form submission
pcfForm.addEventListener('submit', (e) => {
    e.preventDefault();

    // Collect form data
    const formData = {
        date: document.getElementById('pcf-date').value,
        cluster: document.getElementById('pcf-cluster').value,
        expenseDesc: document.getElementById('pcf-expense-desc').value,
        costCenter: document.getElementById('pcf-cost-center').value,
        vendor: document.getElementById('pcf-vendor').value,
        tin: document.getElementById('pcf-tin').value,
        orSi: document.getElementById('pcf-or-si').value,
        amountWithVat: document.getElementById('pcf-amount-vat').value,
        exvat: document.getElementById('pcf-exvat').value,
        accountName: document.getElementById('pcf-account-name').value,
        vat: document.getElementById('pcf-vat').value
    };

    console.log('PCF Form Submitted:', formData);

    // Show success message
    alert('PCF Entry submitted successfully!');

    // Reset form and close modal
    pcfForm.reset();
    pcfModal.classList.remove('active');
    document.body.style.overflow = '';
});
