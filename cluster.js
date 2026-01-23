// ==================== CLUSTER CONFIGURATION ====================
// Cluster definitions with their cost center codes and display names
const CLUSTER_CONFIG = {
    blumentrit: {
        name: 'Blumentrit',
        displayName: 'PCF Blumentrit',
        costCenterCode: '22348',
        costCenterName: 'Jbs 22348 blumentrit',
        color: '#C41E3A'
    },
    balicbalic: {
        name: 'Balicbalic',
        displayName: 'PCF Balicbalic',
        costCenterCode: '22349',
        costCenterName: 'Jbs 22349 balicbalic',
        color: '#1565C0'
    },
    kalentong: {
        name: 'Kalentong',
        displayName: 'PCF Kalentong',
        costCenterCode: '22350',
        costCenterName: 'Jbs 22350 kalentong',
        color: '#43A047'
    },
    paco: {
        name: 'Paco',
        displayName: 'PCF Paco',
        costCenterCode: '22351',
        costCenterName: 'Jbs 22351 paco',
        color: '#FB8C00'
    },
    deca: {
        name: 'Deca',
        displayName: 'PCF Deca',
        costCenterCode: '23582',
        costCenterName: 'Jbs 23582 deca',
        color: '#F5A623'
    },
    walter: {
        name: 'Walter',
        displayName: 'PCF Walter',
        costCenterCode: '24723',
        costCenterName: 'Jbs 24723 walter',
        color: '#E8721C'
    },
    gagalangin: {
        name: 'Gagalangin',
        displayName: 'PCF Gagalangin',
        costCenterCode: '23974',
        costCenterName: 'Jbs 23974 gagalangin',
        color: '#8B4513'
    },
    fajardo: {
        name: 'Fajardo',
        displayName: 'PCF Fajardo',
        costCenterCode: '22755',
        costCenterName: 'Jbs 22755 fajardo',
        color: '#D0021B'
    }
};

// Get current cluster from URL
function getCurrentCluster() {
    const urlParams = new URLSearchParams(window.location.search);
    const clusterParam = urlParams.get('cluster');
    return clusterParam && CLUSTER_CONFIG[clusterParam] ? clusterParam : 'blumentrit';
}

// Current cluster key
const currentClusterKey = getCurrentCluster();
const currentCluster = CLUSTER_CONFIG[currentClusterKey];

// ==================== GOOGLE SHEETS INTEGRATION ====================
const SHEET_ID = '1Iw76w4c0Jp8xwSj1UgukZlkFRGOclkvJk9TeaZzuiw0';
const SHEET_NAME = 'Sheet1';
const SHEET_BASE_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${SHEET_NAME}`;

// Store fetched data
let sheetData = [];
let clusterData = [];
let lastFetchTime = null;

// Fetch data from Google Sheets
async function fetchSheetData() {
    const refreshIndicator = document.getElementById('refresh-indicator');

    try {
        if (lastFetchTime) {
            refreshIndicator.classList.add('show');
        }

        const cacheBuster = new Date().getTime();
        const SHEET_URL = `${SHEET_BASE_URL}&_cb=${cacheBuster}`;

        const response = await fetch(SHEET_URL);
        const text = await response.text();

        const jsonString = text.substring(47, text.length - 2);
        const data = JSON.parse(jsonString);

        const rows = data.table.rows;
        const cols = data.table.cols;

        const headers = cols.map((col, idx) => col.label || col.id || `col${idx}`);

        sheetData = rows.map(row => {
            const rowData = {};
            row.c.forEach((cell, index) => {
                const header = headers[index] || `col${index}`;
                rowData[header] = cell ? (cell.v !== null ? cell.v : '') : '';
                if (cell && cell.f) {
                    rowData[header + '_formatted'] = cell.f;
                }
            });
            return rowData;
        });

        // Filter data for current cluster
        filterClusterData();

        // Update the dashboard
        updateDashboard();

        lastFetchTime = new Date();

        setTimeout(() => {
            refreshIndicator.classList.remove('show');
        }, 1000);

    } catch (error) {
        console.error('Error fetching sheet data:', error);
        refreshIndicator.classList.remove('show');

        const container = document.getElementById('transactions-container');
        if (container && !sheetData.length) {
            container.innerHTML = `
                <div class="error-message">
                    <p>Unable to load data from Google Sheets.</p>
                    <p style="font-size: 12px; margin-top: 10px;">Make sure the sheet is publicly accessible</p>
                </div>
            `;
        }
    }
}

// Filter data for current cluster
function filterClusterData() {
    clusterData = sheetData.filter(row => {
        const costCenterStr = (row['Cost center'] || row['cost center'] || row['Cost Center'] || '').toLowerCase();
        const clusterStr = (row['Cluster'] || row['cluster'] || '').toLowerCase();

        // Match by cost center code or cluster name
        return costCenterStr.includes(currentCluster.costCenterCode) ||
               costCenterStr.includes(currentCluster.name.toLowerCase()) ||
               clusterStr.includes(currentCluster.name.toLowerCase());
    });

    console.log(`Filtered ${clusterData.length} transactions for ${currentCluster.name}`);
}

// Update dashboard with cluster data
function updateDashboard() {
    if (!clusterData || clusterData.length === 0) {
        document.getElementById('transactions-container').innerHTML =
            '<div class="loading-message">No transactions found for this cluster</div>';
        updateStatCards({ totalBalance: 0, thisWeek: 0, thisMonth: 0, thisYear: 0, transactionCount: 0 });
        return;
    }

    const stats = calculateStats(clusterData);
    updateStatCards(stats);
    updateTransactionsTable(clusterData);
    updateBreakdownChart(clusterData);
    updateClusterSummary(clusterData, stats);
}

// Calculate statistics
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
        const amount = parseFloat(
            row['AMT W/ VAt'] || row['AMT W/ VAT'] || row['Amount'] || 0
        ) || 0;

        const dateStr = row['Date'] || row['date'] || '';
        let rowDate = parseDate(dateStr);

        totalBalance += amount;

        if (rowDate >= startOfWeek) thisWeek += amount;
        if (rowDate >= startOfMonth) thisMonth += amount;
        if (rowDate >= startOfYear) thisYear += amount;
    });

    return {
        totalBalance,
        thisWeek,
        thisMonth,
        thisYear,
        transactionCount: data.length
    };
}

// Parse date helper
function parseDate(dateStr) {
    if (!dateStr) return new Date();

    if (typeof dateStr === 'number') {
        return new Date((dateStr - 25569) * 86400 * 1000);
    } else if (typeof dateStr === 'string' && dateStr.startsWith('Date(')) {
        const match = dateStr.match(/Date\((\d+),(\d+),(\d+)\)/);
        if (match) {
            return new Date(parseInt(match[1]), parseInt(match[2]), parseInt(match[3]));
        }
    }

    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
}

// Format date helper
function formatDate(dateStr) {
    const date = parseDate(dateStr);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Update stat cards
function updateStatCards(stats) {
    const formatCurrency = (num) => '₱' + num.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

    document.getElementById('total-balance').textContent = formatCurrency(stats.totalBalance);
    document.getElementById('this-week').textContent = formatCurrency(stats.thisWeek);
    document.getElementById('this-month').textContent = formatCurrency(stats.thisMonth);
    document.getElementById('this-year').textContent = formatCurrency(stats.thisYear);

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
    const recentTransactions = data.slice(-10).reverse();

    if (recentTransactions.length === 0) {
        container.innerHTML = '<div class="loading-message">No transactions to display</div>';
        return;
    }

    const categoryIcons = ['yellow', 'blue', 'red'];

    const transactionsHTML = recentTransactions.map((row, index) => {
        const date = row['Date'] || row['date'] || '';
        const expenseDesc = row['Expense description'] || row['Expense Description'] || '';
        const accountName = row['Account Name'] || row['Account name'] || '';
        const vendor = row['vendor name'] || row['Vendor'] || '';
        const amount = row['AMT W/ VAt'] || row['AMT W/ VAT'] || row['Amount'] || 0;
        const category = getExpenseCategory(accountName);

        const formattedDate = formatDate(date);
        const formattedAmount = '₱' + parseFloat(amount || 0).toLocaleString('en-PH');
        const iconColor = categoryIcons[index % 3];

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
                    <strong>${category}</strong><br>
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

// Get expense category from account name
function getExpenseCategory(accountName) {
    if (!accountName) return 'Other';
    const accountLower = accountName.toLowerCase();

    if (accountLower.includes('bakery') && accountLower.includes('consumable')) return 'Bakery Supplies';
    if (accountLower.includes('bakery') && accountLower.includes('durable')) return 'Bakery Equipment';
    if (accountLower.includes('bakery')) return 'Bakery Supplies';
    if (accountLower.includes('perishable') || accountLower.includes('ingredient')) return 'Ingredients';
    if (accountLower.includes('packaging')) return 'Packaging';
    if (accountLower.includes('cleaning')) return 'Cleaning';
    if (accountLower.includes('transport')) return 'Transportation';
    if (accountLower.includes('utilities')) return 'Utilities';
    if (accountLower.includes('maint') || accountLower.includes('repair')) return 'Maintenance';
    if (accountLower.includes('insurance')) return 'Insurance';

    return 'Other';
}

// Store categories for chart
let chartCategories = [];

// Expense Category Colors
const expenseCategoryColors = [
    '#C41E3A', '#1565C0', '#43A047', '#FB8C00', '#F5A623',
    '#E8721C', '#8B4513', '#D0021B', '#00ACC1', '#9C27B0'
];

// Update breakdown chart
function updateBreakdownChart(data) {
    const categories = {};

    data.forEach(row => {
        const accountName = row['Account Name'] || row['Account name'] || 'Other';
        const amount = parseFloat(row['AMT W/ VAt'] || row['AMT W/ VAT'] || row['Amount'] || 0) || 0;
        const category = getExpenseCategory(accountName);

        categories[category] = (categories[category] || 0) + amount;
    });

    const sortedCategories = Object.entries(categories)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6);

    chartCategories = sortedCategories.map(([name, value], index) => ({
        name,
        value,
        color: expenseCategoryColors[index % expenseCategoryColors.length]
    }));

    drawDonutChart();
}

// Draw 3D Pie Chart
function drawDonutChart() {
    const canvas = document.getElementById('donutChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
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

    const data = chartCategories.length > 0 ? chartCategories : [
        { value: 100, color: '#E0E0E0', name: 'No Data' }
    ];

    const total = data.reduce((sum, item) => sum + item.value, 0);
    let startAngle = -Math.PI / 2;

    ctx.clearRect(0, 0, chartSize, chartSize);

    // 3D shadow effect
    const depthHeight = 15;
    for (let i = depthHeight; i > 0; i--) {
        ctx.beginPath();
        ctx.ellipse(centerX, centerY + i, radius, radius * 0.3, 0, 0, 2 * Math.PI);
        ctx.fillStyle = `rgba(0, 0, 0, ${0.03 * (depthHeight - i) / depthHeight})`;
        ctx.fill();
    }

    const labelPositions = [];

    // Draw pie segments
    data.forEach((item, index) => {
        const sliceAngle = (item.value / total) * 2 * Math.PI;
        const endAngle = startAngle + sliceAngle;
        const midAngle = startAngle + sliceAngle / 2;

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();

        // Glossy gradient
        const gradient = ctx.createLinearGradient(centerX, centerY - radius, centerX, centerY + radius);
        gradient.addColorStop(0, lightenColor(item.color, 30));
        gradient.addColorStop(0.3, lightenColor(item.color, 15));
        gradient.addColorStop(0.5, item.color);
        gradient.addColorStop(0.7, shadeColor(item.color, -10));
        gradient.addColorStop(1, shadeColor(item.color, -25));

        ctx.fillStyle = gradient;
        ctx.fill();

        // Highlight arc
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 0.85, startAngle + 0.05, endAngle - 0.05);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = radius * 0.15;
        ctx.stroke();

        // Segment border
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Label position
        const labelRadius = radius + 35;
        const labelX = centerX + Math.cos(midAngle) * labelRadius;
        const labelY = centerY + Math.sin(midAngle) * labelRadius;
        const percentage = Math.round((item.value / total) * 100);

        labelPositions.push({
            x: labelX, y: labelY, name: item.name,
            percentage: percentage, color: item.color, midAngle: midAngle
        });

        startAngle = endAngle;
    });

    // Center highlight
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

    updatePieChartLabels(labelPositions, chartSize);
    updateBreakdownLegend(data, total);
}

// Update pie chart labels
function updatePieChartLabels(positions, chartSize) {
    const labelsContainer = document.getElementById('pie-chart-labels');
    if (!labelsContainer) return;

    const wrapperOffset = (320 - chartSize) / 2;

    labelsContainer.innerHTML = positions.map(pos => {
        let adjustedX = pos.x + wrapperOffset;
        let adjustedY = pos.y + wrapperOffset;

        const isRight = pos.midAngle > -Math.PI / 2 && pos.midAngle < Math.PI / 2;
        const textAlign = isRight ? 'left' : 'right';
        const xOffset = isRight ? 5 : -5;

        return `
            <div class="pie-label" style="left: ${adjustedX + xOffset}px; top: ${adjustedY}px; text-align: ${textAlign}; transform: translate(${isRight ? '0' : '-100%'}, -50%);">
                <span class="pie-label-name" style="color: ${pos.color};">${pos.name.toUpperCase()}</span>
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
                <span class="legend-label">${item.name}</span>
                <span class="legend-value">${percentage}%</span>
            </div>
        `;
    }).join('');
}

// Update cluster summary
function updateClusterSummary(data, stats) {
    // Total transactions
    document.getElementById('total-transactions').textContent = stats.transactionCount;

    // Average transaction
    const avg = stats.transactionCount > 0 ? stats.totalBalance / stats.transactionCount : 0;
    document.getElementById('avg-transaction').textContent = '₱' + Math.round(avg).toLocaleString('en-PH');

    // Top category
    if (chartCategories.length > 0) {
        document.getElementById('top-category').textContent = chartCategories[0].name;
    }

    // Last update
    if (data.length > 0) {
        const lastDate = data.reduce((latest, row) => {
            const date = parseDate(row['Date'] || row['date'] || '');
            return date > latest ? date : latest;
        }, new Date(0));

        if (lastDate.getTime() > 0) {
            document.getElementById('last-update').textContent = lastDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
    }
}

// Color helper functions
function lightenColor(color, percent) {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, (num >> 8 & 0x00FF) + amt);
    const B = Math.min(255, (num & 0x0000FF) + amt);
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

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

// ==================== UI INITIALIZATION ====================

// Update page with cluster info
function initializeClusterUI() {
    // Update cluster name displays
    document.getElementById('cluster-name').textContent = currentCluster.displayName;
    document.getElementById('cluster-greeting').textContent = currentCluster.displayName;
    document.getElementById('section-cluster-name').textContent = currentCluster.name;
    document.getElementById('pcf-modal-subtitle').textContent = `PCF DAILY ${currentCluster.name.toUpperCase()}`;
    document.getElementById('transactions-modal-subtitle').textContent = `Transaction history for ${currentCluster.name}`;

    // Set page title
    document.title = `Julie's Bakeshop - ${currentCluster.displayName}`;

    // Update cluster badge color
    const clusterBadge = document.getElementById('cluster-badge');
    if (clusterBadge) {
        clusterBadge.style.borderColor = currentCluster.color;
    }

    // Highlight active nav item
    document.querySelectorAll('.cluster-nav-item').forEach(item => {
        if (item.dataset.cluster === currentClusterKey) {
            item.classList.add('active');
        }
    });

    // Set PCF cluster input
    const pcfClusterInput = document.getElementById('pcf-cluster');
    if (pcfClusterInput) {
        pcfClusterInput.value = currentCluster.name;
    }

    // Populate cost center dropdown
    const costCenterSelect = document.getElementById('pcf-cost-center');
    if (costCenterSelect) {
        costCenterSelect.innerHTML = `
            <option value="">Select an option ...</option>
            <option value="${currentClusterKey}" selected>${currentCluster.costCenterName}</option>
        `;
    }
}

// Update time and date
function updateDateTime() {
    const now = new Date();

    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const timeString = `${hours}:${minutes}:${seconds} ${ampm}`;

    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateString = now.toLocaleDateString('en-US', options);

    document.getElementById('current-time').textContent = timeString;
    document.getElementById('current-date').textContent = dateString;
}

// ==================== EVENT HANDLERS ====================

// Setup refresh button
function setupRefreshButton() {
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            refreshBtn.classList.add('loading');
            await fetchSheetData();
            setTimeout(() => {
                refreshBtn.classList.remove('loading');
            }, 500);
        });
    }
}

// Setup back button
function setupBackButton() {
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }
}

// Setup logout button
function setupLogoutButton() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            window.location.href = 'login.html';
        });
    }
}

// ==================== MODALS ====================

// PCF Modal
const addPcfBtn = document.getElementById('add-pcf-btn');
const pcfModal = document.getElementById('pcf-modal');
const pcfModalClose = document.getElementById('pcf-modal-close');
const pcfForm = document.getElementById('pcf-form');

if (addPcfBtn && pcfModal) {
    addPcfBtn.addEventListener('click', () => {
        pcfModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    });

    pcfModalClose.addEventListener('click', () => {
        pcfModal.classList.remove('active');
        document.body.style.overflow = '';
    });

    pcfModal.addEventListener('click', (e) => {
        if (e.target === pcfModal) {
            pcfModal.classList.remove('active');
            document.body.style.overflow = '';
        }
    });

    pcfForm.addEventListener('submit', (e) => {
        e.preventDefault();
        alert('PCF Entry submitted successfully!');
        pcfForm.reset();
        document.getElementById('pcf-cluster').value = currentCluster.name;
        pcfModal.classList.remove('active');
        document.body.style.overflow = '';
    });
}

// Transactions Modal
const viewAllBtn = document.getElementById('view-all-btn');
const transactionsModal = document.getElementById('transactions-modal');
const transactionsModalClose = document.getElementById('transactions-modal-close');
const transactionSearch = document.getElementById('transaction-search');

if (viewAllBtn && transactionsModal) {
    viewAllBtn.addEventListener('click', () => {
        transactionsModal.classList.add('active');
        document.body.style.overflow = 'hidden';
        displayAllTransactions();
    });

    transactionsModalClose.addEventListener('click', () => {
        transactionsModal.classList.remove('active');
        document.body.style.overflow = '';
    });

    transactionsModal.addEventListener('click', (e) => {
        if (e.target === transactionsModal) {
            transactionsModal.classList.remove('active');
            document.body.style.overflow = '';
        }
    });

    if (transactionSearch) {
        transactionSearch.addEventListener('input', displayAllTransactions);
    }
}

// Display all transactions in modal
function displayAllTransactions() {
    const container = document.getElementById('all-transactions-container');
    const searchTerm = transactionSearch ? transactionSearch.value.toLowerCase() : '';

    if (!clusterData || clusterData.length === 0) {
        container.innerHTML = '<div class="loading-message">No transactions available</div>';
        return;
    }

    let filteredTransactions = [...clusterData];

    if (searchTerm) {
        filteredTransactions = filteredTransactions.filter(row => {
            const expenseDesc = (row['Expense description'] || '').toLowerCase();
            const accountName = (row['Account Name'] || '').toLowerCase();
            const vendor = (row['vendor name'] || '').toLowerCase();

            return expenseDesc.includes(searchTerm) ||
                   accountName.includes(searchTerm) ||
                   vendor.includes(searchTerm);
        });
    }

    filteredTransactions.reverse();

    if (filteredTransactions.length === 0) {
        container.innerHTML = '<div class="loading-message">No transactions match your search</div>';
        return;
    }

    const transactionsHTML = filteredTransactions.map((row) => {
        const date = row['Date'] || row['date'] || '';
        const expenseDesc = row['Expense description'] || row['Expense Description'] || '';
        const accountName = row['Account Name'] || row['Account name'] || '';
        const vendor = row['vendor name'] || row['Vendor'] || '';
        const amount = row['AMT W/ VAt'] || row['AMT W/ VAT'] || row['Amount'] || 0;
        const category = getExpenseCategory(accountName);

        const formattedDate = formatDate(date);
        const formattedAmount = '₱' + parseFloat(amount || 0).toLocaleString('en-PH');

        return `
            <div class="transaction-modal-row">
                <span class="date-cell">${formattedDate}</span>
                <span class="cluster-cell">${category}</span>
                <span class="description-cell">${expenseDesc || 'N/A'}</span>
                <span class="account-cell">${accountName || 'N/A'}</span>
                <span class="vendor-cell">${vendor || 'N/A'}</span>
                <span class="amount-cell">${formattedAmount}</span>
            </div>
        `;
    }).join('');

    container.innerHTML = transactionsHTML;
}

// Escape key handler
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (pcfModal && pcfModal.classList.contains('active')) {
            pcfModal.classList.remove('active');
            document.body.style.overflow = '';
        }
        if (transactionsModal && transactionsModal.classList.contains('active')) {
            transactionsModal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }
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

if (chatbotToggle && chatbotWindow) {
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
}

function sendMessage(message) {
    if (!message.trim()) return;

    addMessage(message, 'user');
    chatbotInput.value = '';

    showTypingIndicator();

    setTimeout(() => {
        removeTypingIndicator();
        const response = getBotResponse(message);
        addMessage(response, 'bot');
    }, 1000 + Math.random() * 1000);
}

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

function removeTypingIndicator() {
    const typingMessage = chatbotMessages.querySelector('.typing');
    if (typingMessage) {
        typingMessage.remove();
    }
}

function getBotResponse(message) {
    const lowerMessage = message.toLowerCase();
    const clusterName = currentCluster.name;

    if (lowerMessage.includes('balance') || lowerMessage.includes('total')) {
        const total = document.getElementById('total-balance').textContent;
        return `The total expenses for ${clusterName} cluster is <strong>${total}</strong>! 📊`;
    }

    if (lowerMessage.includes('transaction') || lowerMessage.includes('recent')) {
        return `I can see the recent transactions for ${clusterName}. Check the table below or click "View All" for the complete history! 📋`;
    }

    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
        return `Hello! 👋 Welcome to the ${clusterName} PCF Dashboard. How can I help you today?`;
    }

    return `I'm here to help with ${clusterName} finances! Ask about your balance, transactions, or any financial questions. 🥐`;
}

if (chatbotSend) {
    chatbotSend.addEventListener('click', () => {
        sendMessage(chatbotInput.value);
    });
}

if (chatbotInput) {
    chatbotInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage(chatbotInput.value);
        }
    });
}

suggestionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        sendMessage(btn.dataset.message);
    });
});

// ==================== INITIALIZATION ====================

// Initialize on load
window.addEventListener('load', () => {
    initializeClusterUI();
    drawDonutChart();
    fetchSheetData();
});

// Setup event handlers
setupRefreshButton();
setupBackButton();
setupLogoutButton();

// Update time every second
setInterval(updateDateTime, 1000);
updateDateTime();

// Redraw chart on resize
window.addEventListener('resize', () => {
    drawDonutChart();
});
