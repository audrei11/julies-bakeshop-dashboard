// ==================== GOOGLE SHEETS INTEGRATION ====================
// Google Sheets Configuration
const SHEET_ID = '1Iw76w4c0Jp8xwSj1UgukZlkFRGOclkvJk9TeaZzuiw0';
const SHEET_NAME = 'Sheet1'; // Change if your sheet has a different name
const API_KEY = ''; // Optional: Add your Google API key for higher limits

// Construct the Google Sheets URL (using CSV export for public sheets)
// Note: We'll add a cache-buster parameter when fetching
const SHEET_BASE_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${SHEET_NAME}`;

// Manual refresh only - no automatic syncing

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

    // Update cost center charts
    calculateCostCenterTotals();
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
            } else if (typeof dateStr === 'string' && dateStr.startsWith('Date(')) {
                // Google Sheets Date format: "Date(2026,0,21)" - month is 0-indexed
                const match = dateStr.match(/Date\((\d+),(\d+),(\d+)\)/);
                if (match) {
                    rowDate = new Date(parseInt(match[1]), parseInt(match[2]), parseInt(match[3]));
                } else {
                    rowDate = new Date();
                }
            } else {
                rowDate = new Date(dateStr);
            }
        } else {
            rowDate = new Date(); // Default to today if no date
        }

        // Validate date - if invalid, default to today
        if (isNaN(rowDate.getTime())) {
            rowDate = new Date();
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

    // Get the most recent 5 transactions
    const recentTransactions = data.slice(-5).reverse();

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
                // Excel serial date
                dateObj = new Date((date - 25569) * 86400 * 1000);
            } else if (typeof date === 'string' && date.startsWith('Date(')) {
                // Google Sheets Date format: "Date(2026,0,21)" - month is 0-indexed
                const match = date.match(/Date\((\d+),(\d+),(\d+)\)/);
                if (match) {
                    dateObj = new Date(parseInt(match[1]), parseInt(match[2]), parseInt(match[3]));
                }
            } else {
                dateObj = new Date(date);
            }

            // Only format if we have a valid date
            if (dateObj && !isNaN(dateObj.getTime())) {
                const month = dateObj.toLocaleString('en-US', { month: 'short' });
                const day = dateObj.getDate();
                const year = dateObj.getFullYear();
                formattedDate = `${month} ${day}<br>${year}`;
            } else {
                formattedDate = 'N/A';
            }
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
    // Initial fetch only - no automatic refresh
    fetchSheetData();
}

// Manual refresh button handler
function setupRefreshButton() {
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            // Add spinning animation
            refreshBtn.classList.add('loading');
            await fetchSheetData();
            // Remove spinning animation after fetch
            setTimeout(() => {
                refreshBtn.classList.remove('loading');
            }, 500);
        });
    }
}

// Logout button handler
function setupLogoutButton() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            window.location.href = 'login.html';
        });
    }
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

// Setup refresh button
setupRefreshButton();

// Setup logout button
setupLogoutButton();

// 3D Pie Chart Colors (matching reference image)
const pieChart3DColors = [
    '#1565C0', // Deep Blue
    '#00ACC1', // Teal/Cyan
    '#43A047', // Green
    '#FDD835', // Yellow
    '#FB8C00', // Orange
    '#E53935'  // Red
];

// Draw 3D Pie Chart
function drawDonutChart() {
    const canvas = document.getElementById('donutChart');
    const ctx = canvas.getContext('2d');

    // Fixed size for 3D chart
    const chartSize = 280;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = chartSize * dpr;
    canvas.height = chartSize * dpr;
    canvas.style.width = chartSize + 'px';
    canvas.style.height = chartSize + 'px';
    ctx.scale(dpr, dpr);

    const centerX = chartSize / 2;
    const centerY = chartSize / 2;
    const radius = (chartSize / 2) - 25;

    // Use actual data from sheet, or defaults if not loaded yet
    const data = chartCategories.length > 0
        ? chartCategories.map((cat, idx) => ({
            value: cat.value,
            color: pieChart3DColors[idx % pieChart3DColors.length],
            name: cat.name
        }))
        : [
            { value: 35, color: '#1565C0', name: 'Blumentrit' },
            { value: 20, color: '#00ACC1', name: 'Deca' },
            { value: 15, color: '#FB8C00', name: 'Walter' },
            { value: 15, color: '#43A047', name: 'Gagalangin' },
            { value: 15, color: '#FDD835', name: 'Fajardo' }
        ];

    const total = data.reduce((sum, item) => sum + item.value, 0);
    let startAngle = -Math.PI / 2;

    // Clear canvas
    ctx.clearRect(0, 0, chartSize, chartSize);

    // Draw 3D depth/shadow effect at bottom
    const depthHeight = 15;
    ctx.save();
    for (let i = depthHeight; i > 0; i--) {
        ctx.beginPath();
        ctx.ellipse(centerX, centerY + i, radius, radius * 0.3, 0, 0, 2 * Math.PI);
        ctx.fillStyle = `rgba(0, 0, 0, ${0.03 * (depthHeight - i) / depthHeight})`;
        ctx.fill();
    }
    ctx.restore();

    // Store label positions for later
    const labelPositions = [];

    // Draw pie segments with 3D glossy effect
    data.forEach((item, index) => {
        const sliceAngle = (item.value / total) * 2 * Math.PI;
        const endAngle = startAngle + sliceAngle;
        const midAngle = startAngle + sliceAngle / 2;

        // Draw main segment
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();

        // Create glossy gradient (lighter at top, darker at bottom)
        const gradient = ctx.createLinearGradient(
            centerX, centerY - radius,
            centerX, centerY + radius
        );
        gradient.addColorStop(0, lightenColor(item.color, 30));
        gradient.addColorStop(0.3, lightenColor(item.color, 15));
        gradient.addColorStop(0.5, item.color);
        gradient.addColorStop(0.7, shadeColor(item.color, -10));
        gradient.addColorStop(1, shadeColor(item.color, -25));

        ctx.fillStyle = gradient;
        ctx.fill();

        // Add white highlight arc at top of each segment for glossy effect
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 0.85, startAngle + 0.05, endAngle - 0.05);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = radius * 0.15;
        ctx.stroke();

        // Add segment border
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Calculate label position
        const labelRadius = radius + 35;
        const labelX = centerX + Math.cos(midAngle) * labelRadius;
        const labelY = centerY + Math.sin(midAngle) * labelRadius;
        const percentage = Math.round((item.value / total) * 100);

        labelPositions.push({
            x: labelX,
            y: labelY,
            name: item.name,
            percentage: percentage,
            color: item.color,
            midAngle: midAngle
        });

        startAngle = endAngle;
    });

    // Add center highlight for 3D depth
    const centerGradient = ctx.createRadialGradient(
        centerX - radius * 0.2, centerY - radius * 0.2, 0,
        centerX, centerY, radius * 0.4
    );
    centerGradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
    centerGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.4, 0, 2 * Math.PI);
    ctx.fillStyle = centerGradient;
    ctx.fill();

    // Update labels container
    updatePieChartLabels(labelPositions, chartSize);

    // Update legend
    updateBreakdownLegend(data, total);
}

// Update pie chart labels around the chart
function updatePieChartLabels(positions, chartSize) {
    const labelsContainer = document.getElementById('pie-chart-labels');
    if (!labelsContainer) return;

    const wrapperOffset = (320 - chartSize) / 2; // Center offset

    labelsContainer.innerHTML = positions.map(pos => {
        // Adjust position based on angle
        let adjustedX = pos.x + wrapperOffset;
        let adjustedY = pos.y + wrapperOffset;

        // Determine text alignment based on position
        const isRight = pos.midAngle > -Math.PI / 2 && pos.midAngle < Math.PI / 2;
        const textAlign = isRight ? 'left' : 'right';
        const xOffset = isRight ? 5 : -5;

        return `
            <div class="pie-label" style="left: ${adjustedX + xOffset}px; top: ${adjustedY}px; text-align: ${textAlign}; transform: translate(${isRight ? '0' : '-100%'}, -50%);">
                <span class="pie-label-name" style="color: ${pos.color};">${pos.name.split(' ')[0].toUpperCase()}</span>
                <span class="pie-label-value">${pos.percentage}%</span>
            </div>
        `;
    }).join('');
}

// Update breakdown legend
function updateBreakdownLegend(data, total) {
    const legendContainer = document.getElementById('breakdown-legend');
    if (!legendContainer) return;

    legendContainer.innerHTML = data.map(item => {
        const percentage = Math.round((item.value / total) * 100);
        return `
            <div class="legend-item">
                <span class="legend-color" style="background: linear-gradient(135deg, ${lightenColor(item.color, 20)}, ${item.color});"></span>
                <span class="legend-label">${item.name ? item.name.split(' ')[0] : 'Unknown'}</span>
                <span class="legend-value">${percentage}%</span>
            </div>
        `;
    }).join('');
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

// Cost Center Data
let costCenterData = {
    blumentrit: { total: 0, count: 0, transactions: [], categories: {} },
    deca: { total: 0, count: 0, transactions: [], categories: {} },
    walter: { total: 0, count: 0, transactions: [], categories: {} },
    gagalangin: { total: 0, count: 0, transactions: [], categories: {} },
    fajardo: { total: 0, count: 0, transactions: [], categories: {} }
};

// Cost Center Colors
const costCenterColors = {
    blumentrit: '#C41E3A',
    deca: '#F5A623',
    walter: '#E8721C',
    gagalangin: '#8B4513',
    fajardo: '#D0021B'
};

// Cost Center Names
const costCenterNames = {
    blumentrit: 'Blumentrit (22348)',
    deca: 'Deca (23582)',
    walter: 'Walter (24723)',
    gagalangin: 'Gagalangin (23974)',
    fajardo: 'Fajardo (22755)'
};

// Expense Category Colors (for pie chart slices)
const expenseCategoryColors = [
    '#C41E3A', '#F5A623', '#E8721C', '#8B4513', '#D0021B',
    '#4CAF50', '#2196F3', '#9C27B0', '#FF5722', '#607D8B',
    '#795548', '#009688', '#3F51B5', '#E91E63', '#CDDC39'
];

// Get cost center key from string
function getCostCenterKey(costCenterStr) {
    const str = costCenterStr.toLowerCase();
    if (str.includes('blumentrit') || str.includes('22348')) return 'blumentrit';
    if (str.includes('deca') || str.includes('23582')) return 'deca';
    if (str.includes('walter') || str.includes('24723')) return 'walter';
    if (str.includes('gagalangin') || str.includes('23974')) return 'gagalangin';
    if (str.includes('fajardo') || str.includes('22755')) return 'fajardo';
    return null;
}

// Get expense category from account name
function getExpenseCategory(accountName) {
    if (!accountName) return 'Other';
    const accountLower = accountName.toLowerCase();

    if (accountLower.includes('bakery') && accountLower.includes('consumable')) return 'Bakery Supplies (Consumable)';
    if (accountLower.includes('bakery') && accountLower.includes('durable')) return 'Bakery Supplies (Durable)';
    if (accountLower.includes('bakery')) return 'Bakery Supplies';
    if (accountLower.includes('perishable') || accountLower.includes('ingredient')) return 'Ingredients';
    if (accountLower.includes('packaging')) return 'Packaging';
    if (accountLower.includes('cleaning')) return 'Cleaning Supplies';
    if (accountLower.includes('transport')) return 'Transportation';
    if (accountLower.includes('insurance')) return 'Insurance';
    if (accountLower.includes('license')) return 'Licenses';
    if (accountLower.includes('medical')) return 'Medical';
    if (accountLower.includes('utilities')) return 'Utilities';
    if (accountLower.includes('equipment') || accountLower.includes('maint')) return 'Maintenance';
    if (accountLower.includes('stationary') || accountLower.includes('supplies')) return 'Office Supplies';
    if (accountLower.includes('printing') || accountLower.includes('photocopy')) return 'Printing';
    if (accountLower.includes('mobile') || accountLower.includes('data')) return 'Communications';
    if (accountLower.includes('meeting')) return 'Meeting Expenses';
    if (accountLower.includes('donation')) return 'Donations';
    if (accountLower.includes('legal')) return 'Legal Fees';

    return 'Other';
}

// Calculate Cost Center Totals from sheet data
function calculateCostCenterTotals() {
    // Reset totals
    costCenterData = {
        blumentrit: { total: 0, count: 0, transactions: [], categories: {} },
        deca: { total: 0, count: 0, transactions: [], categories: {} },
        walter: { total: 0, count: 0, transactions: [], categories: {} },
        gagalangin: { total: 0, count: 0, transactions: [], categories: {} },
        fajardo: { total: 0, count: 0, transactions: [], categories: {} }
    };

    if (!sheetData || sheetData.length === 0) {
        console.log('No sheet data available for cost center calculation');
        return;
    }

    console.log('Calculating cost center totals from', sheetData.length, 'rows');
    console.log('Sample row:', sheetData[0]);

    sheetData.forEach((row, index) => {
        const costCenterStr = row['Cost center'] || row['cost center'] || row['Cost Center'] || '';
        const amount = parseFloat(row['AMT W/ VAt'] || row['AMT W/ VAT'] || row['AMOUNT WITH VAT'] || row['Amount'] || 0) || 0;
        const accountName = row['Account Name'] || row['Account name'] || row['account name'] || '';
        const key = getCostCenterKey(costCenterStr);

        // Log first few rows to debug
        if (index < 3) {
            console.log(`Row ${index}: Cost Center="${costCenterStr}" -> Key="${key}", Amount=${amount}, Account="${accountName}"`);
        }

        if (key && costCenterData[key]) {
            costCenterData[key].total += amount;
            costCenterData[key].count++;
            costCenterData[key].transactions.push(row);

            // Group by expense category
            const category = getExpenseCategory(accountName);
            if (!costCenterData[key].categories[category]) {
                costCenterData[key].categories[category] = { total: 0, count: 0, transactions: [] };
            }
            costCenterData[key].categories[category].total += amount;
            costCenterData[key].categories[category].count++;
            costCenterData[key].categories[category].transactions.push(row);
        }
    });

    // Draw individual cost center charts
    drawAllCostCenterCharts();

    // Update breakdown chart with cost center data
    updateBreakdownWithCostCenters();

    // Show all expenses by default
    showCostCenterExpenses('all');
}

// Update breakdown chart with cost center data (sorted by expense)
function updateBreakdownWithCostCenters() {
    // Sort cost centers by total expense (highest first)
    const sortedCenters = Object.entries(costCenterData)
        .map(([key, data], idx) => ({
            key,
            name: costCenterNames[key],
            total: data.total,
            color: pieChart3DColors[idx % pieChart3DColors.length]
        }))
        .sort((a, b) => b.total - a.total);

    // Update chart categories for 3D donut chart
    chartCategories = sortedCenters.map((center, idx) => ({
        name: center.name,
        value: center.total,
        color: pieChart3DColors[idx % pieChart3DColors.length]
    }));

    // Redraw 3D donut chart (legend is updated inside drawDonutChart)
    drawDonutChart();
}

// Show expense details for selected cost center
function showCostCenterExpenses(centerKey) {
    const totalEl = document.getElementById('selected-center-total');
    const countEl = document.getElementById('selected-center-count');
    const listEl = document.getElementById('expense-list');

    let transactions = [];
    let total = 0;
    let count = 0;

    if (centerKey === 'all') {
        // Combine all transactions
        Object.values(costCenterData).forEach(data => {
            transactions = transactions.concat(data.transactions);
            total += data.total;
            count += data.count;
        });
    } else if (costCenterData[centerKey]) {
        transactions = costCenterData[centerKey].transactions;
        total = costCenterData[centerKey].total;
        count = costCenterData[centerKey].count;
    }

    // Update summary
    if (totalEl) totalEl.textContent = '₱' + total.toLocaleString('en-PH');
    if (countEl) countEl.textContent = count;

    // Sort by date (newest first)
    transactions.sort((a, b) => {
        const dateA = parseTransactionDate(a['Date'] || a['date'] || '');
        const dateB = parseTransactionDate(b['Date'] || b['date'] || '');
        return dateB - dateA;
    });

    // Limit to 20 most recent
    const recentTransactions = transactions.slice(0, 20);

    // Update expense list
    if (listEl) {
        if (recentTransactions.length === 0) {
            listEl.innerHTML = '<div class="loading-message">No transactions found</div>';
        } else {
            listEl.innerHTML = recentTransactions.map(row => {
                const desc = row['Expense description'] || row['Expense Description'] || 'No description';
                const amount = parseFloat(row['AMT W/ VAt'] || row['AMT W/ VAT'] || row['Amount'] || 0) || 0;
                const date = formatTransactionDate(row['Date'] || row['date'] || '');
                return `
                    <div class="expense-item">
                        <div class="expense-info">
                            <div class="expense-desc">${desc}</div>
                            <div class="expense-date">${date}</div>
                        </div>
                        <div class="expense-amount">₱${amount.toLocaleString('en-PH')}</div>
                    </div>
                `;
            }).join('');
        }
    }
}

// Parse transaction date helper
function parseTransactionDate(dateStr) {
    if (!dateStr) return new Date(0);
    if (typeof dateStr === 'number') {
        return new Date((dateStr - 25569) * 86400 * 1000);
    } else if (typeof dateStr === 'string' && dateStr.startsWith('Date(')) {
        const match = dateStr.match(/Date\((\d+),(\d+),(\d+)\)/);
        if (match) {
            return new Date(parseInt(match[1]), parseInt(match[2]), parseInt(match[3]));
        }
    }
    return new Date(dateStr);
}

// Format transaction date helper
function formatTransactionDate(dateStr) {
    const date = parseTransactionDate(dateStr);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Draw all cost center pie charts
function drawAllCostCenterCharts() {
    const centers = ['blumentrit', 'deca', 'walter', 'gagalangin', 'fajardo'];

    console.log('Drawing all cost center charts...');
    console.log('Cost center data:', costCenterData);

    centers.forEach(centerKey => {
        drawCostCenterPieChart(centerKey);
    });
}

// Draw initial placeholder charts on page load
function drawPlaceholderCharts() {
    const centers = ['blumentrit', 'deca', 'walter', 'gagalangin', 'fajardo'];

    centers.forEach(centerKey => {
        const canvas = document.getElementById(`chart-${centerKey}`);
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const chartSize = 140;
        const dpr = window.devicePixelRatio || 1;

        canvas.width = chartSize * dpr;
        canvas.height = chartSize * dpr;
        canvas.style.width = chartSize + 'px';
        canvas.style.height = chartSize + 'px';
        ctx.scale(dpr, dpr);

        const centerX = chartSize / 2;
        const centerY = chartSize / 2;
        const radius = (chartSize / 2) - 10;
        const innerRadius = radius * 0.5;

        // Draw 3D effect - bottom shadow
        ctx.beginPath();
        ctx.ellipse(centerX, centerY + 8, radius, radius * 0.3, 0, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fill();

        // Draw outer ring with gradient (loading state - light gray)
        const gradient = ctx.createLinearGradient(0, centerY - radius, 0, centerY + radius);
        gradient.addColorStop(0, '#F0F0F0');
        gradient.addColorStop(0.5, '#E0E0E0');
        gradient.addColorStop(1, '#D0D0D0');

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Draw inner circle with gradient
        const innerGradient = ctx.createRadialGradient(centerX, centerY - 5, 0, centerX, centerY, innerRadius);
        innerGradient.addColorStop(0, '#FFFFFF');
        innerGradient.addColorStop(0.7, '#FFF9E6');
        innerGradient.addColorStop(1, '#F5EED6');

        ctx.beginPath();
        ctx.arc(centerX, centerY, innerRadius, 0, 2 * Math.PI);
        ctx.fillStyle = innerGradient;
        ctx.fill();

        // Add "Loading..." text
        ctx.fillStyle = '#999';
        ctx.font = '600 10px Poppins, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Loading...', centerX, centerY);

        // Update center value
        const centerEl = document.getElementById(`center-${centerKey}`);
        if (centerEl) {
            centerEl.textContent = '...';
            centerEl.style.display = 'none';
        }

        // Update total
        const totalEl = document.getElementById(`total-${centerKey}`);
        if (totalEl) totalEl.textContent = 'Loading...';

        // Update legend
        const legendEl = document.getElementById(`legend-${centerKey}`);
        if (legendEl) {
            legendEl.innerHTML = '<div style="color: #999; font-size: 11px; text-align: center;">Loading data...</div>';
        }
    });
}

// Draw individual cost center pie chart with 3D effect
function drawCostCenterPieChart(centerKey) {
    const canvas = document.getElementById(`chart-${centerKey}`);
    if (!canvas) {
        console.log(`Canvas not found for ${centerKey}`);
        return;
    }

    const ctx = canvas.getContext('2d');
    const centerData = costCenterData[centerKey];

    // Use fixed dimensions (140x140 as set in HTML)
    const chartSize = 140;
    const dpr = window.devicePixelRatio || 1;

    // Set canvas internal size for high DPI
    canvas.width = chartSize * dpr;
    canvas.height = chartSize * dpr;

    // Set display size
    canvas.style.width = chartSize + 'px';
    canvas.style.height = chartSize + 'px';

    // Scale context for high DPI
    ctx.scale(dpr, dpr);

    const centerX = chartSize / 2;
    const centerY = chartSize / 2;
    const radius = (chartSize / 2) - 10;
    const innerRadius = radius * 0.5;

    // Clear the canvas
    ctx.clearRect(0, 0, chartSize, chartSize);

    // Update total display
    const totalEl = document.getElementById(`total-${centerKey}`);
    const centerEl = document.getElementById(`center-${centerKey}`);
    const legendEl = document.getElementById(`legend-${centerKey}`);

    if (totalEl && centerData) {
        totalEl.textContent = '₱' + centerData.total.toLocaleString('en-PH');
    }
    if (centerEl && centerData) {
        centerEl.textContent = '₱' + centerData.total.toLocaleString('en-PH', { maximumFractionDigits: 0 });
    }

    // Get sorted categories for this cost center
    let categories = [];
    if (centerData && centerData.categories) {
        categories = Object.entries(centerData.categories)
            .map(([name, data]) => ({ name, total: data.total, count: data.count }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 5); // Limit to top 5 categories
    }

    if (categories.length === 0 || !centerData || centerData.total === 0) {
        // Draw empty state 3D donut
        // Shadow
        ctx.beginPath();
        ctx.ellipse(centerX, centerY + 8, radius, radius * 0.3, 0, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fill();

        // Outer ring
        const emptyGradient = ctx.createLinearGradient(0, centerY - radius, 0, centerY + radius);
        emptyGradient.addColorStop(0, '#E8E8E8');
        emptyGradient.addColorStop(0.5, '#D0D0D0');
        emptyGradient.addColorStop(1, '#B8B8B8');

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.fillStyle = emptyGradient;
        ctx.fill();

        // Inner circle with gradient
        const innerGradient = ctx.createLinearGradient(0, centerY - innerRadius, 0, centerY + innerRadius);
        innerGradient.addColorStop(0, '#FFFFFF');
        innerGradient.addColorStop(1, '#F5F5F5');

        ctx.beginPath();
        ctx.arc(centerX, centerY, innerRadius, 0, 2 * Math.PI);
        ctx.fillStyle = innerGradient;
        ctx.fill();

        // No Data text
        ctx.fillStyle = '#999';
        ctx.font = '600 11px Poppins, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('No Data', centerX, centerY);

        if (centerEl) centerEl.style.display = 'none';

        // Update legend with empty state
        if (legendEl) {
            legendEl.innerHTML = '<div style="color: #999; font-size: 11px; text-align: center;">No expenses recorded</div>';
        }
        return;
    }

    if (centerEl) centerEl.style.display = 'block';

    console.log(`Drawing ${categories.length} categories for ${centerKey}`);

    const total = categories.reduce((sum, cat) => sum + cat.total, 0);
    let startAngle = -Math.PI / 2;

    // Draw 3D effect shadow first (ellipse at bottom)
    ctx.beginPath();
    ctx.ellipse(centerX, centerY + 8, radius, radius * 0.3, 0, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
    ctx.fill();

    // Draw pie segments with 3D gradient effect
    categories.forEach((cat, idx) => {
        const sliceAngle = (cat.total / total) * 2 * Math.PI;
        const endAngle = startAngle + sliceAngle;
        const color = expenseCategoryColors[idx % expenseCategoryColors.length];

        // Draw segment
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();

        // Create 3D gradient effect - lighter at top, darker at bottom
        const gradient = ctx.createLinearGradient(0, centerY - radius, 0, centerY + radius);
        gradient.addColorStop(0, lightenColor(color, 20));
        gradient.addColorStop(0.5, color);
        gradient.addColorStop(1, shadeColor(color, -25));

        ctx.fillStyle = gradient;
        ctx.fill();

        // Add segment border for separation
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 2;
        ctx.stroke();

        startAngle = endAngle;
    });

    // Draw inner circle (donut hole) with gradient for 3D depth
    const holeGradient = ctx.createRadialGradient(centerX, centerY - 5, 0, centerX, centerY, innerRadius);
    holeGradient.addColorStop(0, '#FFFFFF');
    holeGradient.addColorStop(0.7, '#FFF9E6');
    holeGradient.addColorStop(1, '#F5EED6');

    ctx.beginPath();
    ctx.arc(centerX, centerY, innerRadius, 0, 2 * Math.PI);
    ctx.fillStyle = holeGradient;
    ctx.fill();

    // Add subtle inner shadow
    ctx.beginPath();
    ctx.arc(centerX, centerY, innerRadius, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Update legend with category data
    if (legendEl) {
        legendEl.innerHTML = categories.map((cat, idx) => {
            const color = expenseCategoryColors[idx % expenseCategoryColors.length];
            const shortName = cat.name.length > 15 ? cat.name.substring(0, 15) + '...' : cat.name;
            return `
                <div class="chart-legend-item">
                    <span class="chart-legend-color" style="background: ${color};"></span>
                    <span class="chart-legend-label" title="${cat.name}">${shortName}</span>
                    <span class="chart-legend-value">₱${cat.total.toLocaleString('en-PH', { maximumFractionDigits: 0 })}</span>
                </div>
            `;
        }).join('');
    }
}

// Helper function to lighten colors
function lightenColor(color, percent) {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, (num >> 8 & 0x00FF) + amt);
    const B = Math.min(255, (num & 0x0000FF) + amt);
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

// Setup chart initialization
function setupChartClickHandlers() {
    // Charts are now display-only, no click handlers needed
}

// Initialize charts on load
window.addEventListener('load', () => {
    drawDonutChart();
    drawPlaceholderCharts(); // Show placeholder charts while loading
    setupChartClickHandlers();
});

// Redraw on resize
window.addEventListener('resize', () => {
    drawDonutChart();
    if (sheetData && sheetData.length > 0) {
        drawAllCostCenterCharts();
    } else {
        drawPlaceholderCharts();
    }
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

// ==================== VIEW ALL TRANSACTIONS MODAL ====================
const viewAllBtn = document.getElementById('view-all-btn');
const transactionsModal = document.getElementById('transactions-modal');
const transactionsModalClose = document.getElementById('transactions-modal-close');
const transactionSearch = document.getElementById('transaction-search');
const costCenterFilter = document.getElementById('cost-center-filter');

// Open transactions modal
viewAllBtn.addEventListener('click', () => {
    transactionsModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    // Reset filters
    if (transactionSearch) transactionSearch.value = '';
    if (costCenterFilter) costCenterFilter.value = 'all';
    displayAllTransactions();
});

// Close transactions modal
transactionsModalClose.addEventListener('click', () => {
    transactionsModal.classList.remove('active');
    document.body.style.overflow = '';
});

// Close modal when clicking outside
transactionsModal.addEventListener('click', (e) => {
    if (e.target === transactionsModal) {
        transactionsModal.classList.remove('active');
        document.body.style.overflow = '';
    }
});

// Update Escape key handler to include transactions modal
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (transactionsModal.classList.contains('active')) {
            transactionsModal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }
});

// Search input handler
if (transactionSearch) {
    transactionSearch.addEventListener('input', () => {
        displayAllTransactions();
    });
}

// Cost center filter handler
if (costCenterFilter) {
    costCenterFilter.addEventListener('change', () => {
        displayAllTransactions();
    });
}

// Display all transactions in modal with search and filter
function displayAllTransactions() {
    const container = document.getElementById('all-transactions-container');
    const searchTerm = transactionSearch ? transactionSearch.value.toLowerCase() : '';
    const filterCenter = costCenterFilter ? costCenterFilter.value : 'all';

    if (!sheetData || sheetData.length === 0) {
        container.innerHTML = '<div class="loading-message">No transactions available. Click Refresh to load data.</div>';
        return;
    }

    // Filter transactions
    let filteredTransactions = [...sheetData];

    // Apply cost center filter
    if (filterCenter !== 'all') {
        filteredTransactions = filteredTransactions.filter(row => {
            const costCenter = (row['Cost center'] || row['cost center'] || row['Cost Center'] || '').toLowerCase();
            return getCostCenterKey(costCenter) === filterCenter;
        });
    }

    // Apply search filter
    if (searchTerm) {
        filteredTransactions = filteredTransactions.filter(row => {
            const cluster = (row['Cluster'] || row['cluster'] || '').toLowerCase();
            const expenseDesc = (row['Expense description'] || row['Expense Description'] || '').toLowerCase();
            const accountName = (row['Account Name'] || row['Account name'] || '').toLowerCase();
            const vendor = (row['vendor name'] || row['Vendor'] || '').toLowerCase();
            const costCenter = (row['Cost center'] || row['cost center'] || '').toLowerCase();

            return cluster.includes(searchTerm) ||
                   expenseDesc.includes(searchTerm) ||
                   accountName.includes(searchTerm) ||
                   vendor.includes(searchTerm) ||
                   costCenter.includes(searchTerm);
        });
    }

    // Sort by date (newest first)
    filteredTransactions.reverse();

    if (filteredTransactions.length === 0) {
        container.innerHTML = '<div class="loading-message">No transactions match your search criteria</div>';
        return;
    }

    const transactionsHTML = filteredTransactions.map((row) => {
        // Get values matching Google Sheet column names
        const date = row['Date'] || row['date'] || row['DATE'] || '';
        const cluster = row['Cluster'] || row['cluster'] || '';
        const expenseDesc = row['Expense description'] || row['Expense Description'] || row['expense description'] || '';
        const accountName = row['Account Name'] || row['Account name'] || row['account name'] || '';
        const vendor = row['vendor name'] || row['Vendor'] || row['vendor'] || row['Submitted'] || '';
        const amount = row['AMT W/ VAt'] || row['AMT W/ VAT'] || row['AMOUNT WITH VAT'] || row['Amount'] || 0;

        // Format date
        let formattedDate = 'N/A';
        if (date) {
            let dateObj;
            if (typeof date === 'number') {
                dateObj = new Date((date - 25569) * 86400 * 1000);
            } else if (typeof date === 'string' && date.startsWith('Date(')) {
                const match = date.match(/Date\((\d+),(\d+),(\d+)\)/);
                if (match) {
                    dateObj = new Date(parseInt(match[1]), parseInt(match[2]), parseInt(match[3]));
                }
            } else {
                dateObj = new Date(date);
            }

            if (dateObj && !isNaN(dateObj.getTime())) {
                formattedDate = dateObj.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                });
            }
        }

        // Format amount
        const formattedAmount = '₱' + parseFloat(amount || 0).toLocaleString('en-PH');

        return `
            <div class="transaction-modal-row">
                <span class="date-cell">${formattedDate}</span>
                <span class="cluster-cell">${cluster || 'N/A'}</span>
                <span class="description-cell">${expenseDesc || 'N/A'}</span>
                <span class="account-cell">${accountName || 'N/A'}</span>
                <span class="vendor-cell">${vendor || 'N/A'}</span>
                <span class="amount-cell">${formattedAmount}</span>
            </div>
        `;
    }).join('');

    container.innerHTML = transactionsHTML || '<div class="loading-message">No transactions to display</div>';
}
