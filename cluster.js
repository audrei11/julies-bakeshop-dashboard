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
        costCenterCode: '23326',
        costCenterName: 'Jbs 23326 Kalentong',
        costCenters: [
            { code: '23326', name: 'Jbs 23326 Kalentong' },
            { code: '23757', name: 'Jbs 23757 SM Megamall' },
            { code: '23605', name: 'Jbs 23605 SM Hypermarket Mandaluyong' },
            { code: '23745', name: 'Jbs 23745 SM Cherry Shaw' }
        ],
        color: '#43A047'
    },
    paco: {
        name: 'Paco',
        displayName: 'PCF Paco',
        costCenterCode: '23252',
        costCenterName: 'Jbs 23252 Paco',
        costCenters: [
            { code: '23252', name: 'Jbs 23252 Paco' },
            { code: '24711', name: 'Jbs 24711 SM Manila' }
        ],
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
// Cluster-specific Google Sheet IDs
const CLUSTER_SHEETS = {
    blumentrit: '1Iw76w4c0Jp8xwSj1UgukZlkFRGOclkvJk9TeaZzuiw0',
    balicbalic: '1Ssha1noo1nSpDdOr9hOmq3FDmF_cOZur3XMqrvNZTqI',
    paco: '1AHW0frOcBk1JUF7MdVpazdHQBUgKFXM0I-JBUKsmCNY',
    kalentong: '1FXWoiZEehsHpfY-fa1S5nufWKgN-4gnFXpqguRSZMN8'
};

// Cluster-specific webhook URLs for form submission
const CLUSTER_WEBHOOKS = {
    paco: 'https://n8n.srv868353.hstgr.cloud/webhook/dd11259d-c7a0-437d-8660-b25950f04a6e',
    kalentong: 'https://n8n.srv868353.hstgr.cloud/webhook/74c91f03-a3a6-469d-9fad-944d44ba5874'
};

// Default sheet for other clusters (dummy/existing data)
const DEFAULT_SHEET_ID = '1Iw76w4c0Jp8xwSj1UgukZlkFRGOclkvJk9TeaZzuiw0';

// Get sheet ID for current cluster (fallback to default)
const SHEET_ID = CLUSTER_SHEETS[currentClusterKey] || DEFAULT_SHEET_ID;
const SHEET_NAME = 'Sheet1';
const SHEET_BASE_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${SHEET_NAME}`;

// DEBUG: Log cluster and sheet configuration
console.log('========== CLUSTER DATA SOURCE ==========');
console.log('Selected Cluster:', currentClusterKey);
console.log('Cluster Config:', currentCluster);
console.log('Available CLUSTER_SHEETS keys:', Object.keys(CLUSTER_SHEETS));
console.log('Lookup result for "' + currentClusterKey + '":', CLUSTER_SHEETS[currentClusterKey]);
console.log('Resolved Sheet ID:', SHEET_ID);
console.log('Has Dedicated Sheet?:', CLUSTER_SHEETS.hasOwnProperty(currentClusterKey));
console.log('Webhook URL:', CLUSTER_WEBHOOKS[currentClusterKey] || 'None');
console.log('Full Sheet URL:', SHEET_BASE_URL);
console.log('==========================================');

// Store fetched data
let sheetData = [];
let clusterData = [];
let lastFetchTime = null;

// Fetch data from Google Sheets
async function fetchSheetData() {
    const refreshIndicator = document.getElementById('refresh-indicator');

    console.log('========== FETCH STARTING ==========');
    console.log('Previous sheetData length:', sheetData ? sheetData.length : 'undefined');
    console.log('Previous clusterData length:', clusterData ? clusterData.length : 'undefined');

    // IMPORTANT: Clear all cached data before fetching to ensure fresh data
    sheetData = [];
    clusterData = [];
    costCenterTotals = {};
    chartCategories = [];

    console.log('Data arrays cleared. Starting fetch...');

    try {
        if (lastFetchTime) {
            refreshIndicator.classList.add('show');
        }

        // Use cache-busting URL parameters (headers cause CORS issues with Google Sheets)
        const cacheBuster = new Date().getTime();
        const randomSeed = Math.random().toString(36).substring(7);
        const SHEET_URL = `${SHEET_BASE_URL}&_cb=${cacheBuster}&_r=${randomSeed}`;

        console.log('Fetching URL:', SHEET_URL);

        // Simple fetch - no custom headers (they cause CORS errors with Google Sheets)
        const response = await fetch(SHEET_URL);
        const text = await response.text();

        // DEBUG: Log raw response length
        console.log('========== RAW FETCH DEBUG ==========');
        console.log('Fetch Time:', new Date().toISOString());
        console.log('Response length:', text.length);
        console.log('Response preview:', text.substring(0, 200));

        const jsonString = text.substring(47, text.length - 2);
        const data = JSON.parse(jsonString);

        const rows = data.table.rows;
        const cols = data.table.cols;

        // DEBUG: Log raw rows count BEFORE any processing
        console.log('Raw rows count from Google:', rows ? rows.length : 'NULL');
        console.log('Raw cols count from Google:', cols ? cols.length : 'NULL');

        // Build headers with normalization for tolerance
        const headers = cols.map((col, idx) => {
            const label = col.label || col.id || `col${idx}`;
            return label.toString().trim();
        });

        // Create normalized header map: normalizedKey -> originalHeader
        const headerMap = {};
        headers.forEach((header, idx) => {
            const normKey = normalizeKey(header);
            if (normKey) {
                headerMap[normKey] = header;
            }
        });

        // DEBUG: Log resolved headers and normalized map
        console.log('Resolved Headers:', headers);
        console.log('Header indexes:', headers.map((h, i) => `${i}: "${h}"`));
        console.log('Normalized Header Map:', headerMap);

        sheetData = rows.map(row => {
            const rowData = {};
            const normalizedData = {}; // Store normalized key -> value

            row.c.forEach((cell, index) => {
                const header = headers[index] || `col${index}`;
                const value = cell ? (cell.v !== null ? cell.v : '') : '';

                // Store with original key
                rowData[header] = value;

                // Store with normalized key for fast lookup
                const normKey = normalizeKey(header);
                if (normKey) {
                    normalizedData[normKey] = value;
                }

                // Also store formatted value if available
                if (cell && cell.f) {
                    rowData[header + '_formatted'] = cell.f;
                }
            });

            // Attach normalized data for fast lookup
            rowData._normalized = normalizedData;
            return rowData;
        });

        // DEBUG: Log processed data
        console.log('========== SHEET DATA PROCESSED ==========');
        console.log('Total Rows after parsing:', sheetData.length);
        console.log('First Row Sample:', sheetData[0]);
        console.log('All keys in first row:', sheetData[0] ? Object.keys(sheetData[0]).filter(k => k !== '_normalized') : 'NO DATA');
        console.log('Normalized keys in first row:', sheetData[0] ? Object.keys(sheetData[0]._normalized || {}) : 'NO DATA');
        console.log('==========================================');

        // Filter data for current cluster
        filterClusterData();

        // Update the dashboard
        updateDashboard();

        lastFetchTime = new Date();

        setTimeout(() => {
            refreshIndicator.classList.remove('show');
        }, 1000);

    } catch (error) {
        console.error('========== FETCH ERROR ==========');
        console.error('Error fetching sheet data:', error);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        console.error('=================================');
        refreshIndicator.classList.remove('show');

        // Show error message in UI but DON'T reset stats to zero
        // This allows debugging partial data issues
        const container = document.getElementById('transactions-container');
        if (container) {
            container.innerHTML = `
                <div class="error-message">
                    <p>Unable to load data from Google Sheets.</p>
                    <p style="font-size: 12px; margin-top: 10px;">Error: ${error.message}</p>
                    <p style="font-size: 12px;">Check console for details</p>
                </div>
            `;
        }

        // TEMPORARILY DISABLED: Don't reset stats to zero so we can debug
        // updateStatCards({ totalBalance: 0, thisWeek: 0, thisMonth: 0, thisYear: 0, transactionCount: 0 });
        // drawDonutChart();
    }
}

// Filter data for current cluster
function filterClusterData() {
    const clusterName = currentCluster.name.toLowerCase();
    const nameVariations = [clusterName, clusterName.replace('-', ''), clusterName.split('-')[0]];
    const hasDedicatedSheet = CLUSTER_SHEETS.hasOwnProperty(currentClusterKey);

    console.log('========== FILTERING DATA ==========');
    console.log('Looking for cluster:', clusterName);
    console.log('Has dedicated sheet?:', hasDedicatedSheet);
    console.log('Name variations:', nameVariations);
    console.log('Cost center code:', currentCluster.costCenterCode);

    // If cluster has dedicated sheet, use ALL data from that sheet
    if (hasDedicatedSheet) {
        console.log('Using ALL data from dedicated sheet (no filtering)');
        clusterData = [...sheetData];
    } else {
        // Filter shared sheet data by cluster name/code
        clusterData = sheetData.filter(row => {
            // Use normalized lookup for cost center and cluster
            let costCenterStr = '';
            let clusterStr = '';

            if (row._normalized) {
                costCenterStr = (row._normalized['costcenter'] || '').toString().toLowerCase();
                clusterStr = (row._normalized['cluster'] || '').toString().toLowerCase();
            } else {
                costCenterStr = (row['Cost center'] || row['cost center'] || row['Cost Center'] || '').toLowerCase();
                clusterStr = (row['Cluster'] || row['cluster'] || '').toLowerCase();
            }

            return costCenterStr.includes(currentCluster.costCenterCode) ||
                   nameVariations.some(name => costCenterStr.includes(name)) ||
                   nameVariations.some(name => clusterStr.includes(name));
        });
    }

    console.log('Final rows for', currentCluster.name + ':', clusterData.length);
    if (clusterData.length > 0) {
        console.log('Sample row:', clusterData[0]);
        console.log('Sample row keys:', Object.keys(clusterData[0]));
    } else {
        console.log('WARNING: clusterData is EMPTY after filtering!');
        console.log('sheetData length was:', sheetData.length);
    }
    console.log('=====================================');
}

// Update dashboard with cluster data
function updateDashboard() {
    if (!clusterData || clusterData.length === 0) {
        document.getElementById('transactions-container').innerHTML =
            '<div class="loading-message">No transactions found for this cluster</div>';
        updateStatCards({ totalBalance: 0, thisWeek: 0, thisMonth: 0, thisYear: 0, transactionCount: 0 });
        // IMPORTANT: Also update charts with empty data to clear old visuals
        updateBreakdownChart([]);
        updateClusterSummary([], { totalBalance: 0, thisWeek: 0, thisMonth: 0, thisYear: 0, transactionCount: 0 });
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
        // Use normalized lookup for amount
        let amountRaw = 0;
        if (row._normalized) {
            amountRaw = row._normalized['amtwvat'] || row._normalized['amtwithvat'] ||
                        row._normalized['amount'] || 0;
        } else {
            amountRaw = row['AMT W/ VAt'] || row['AMT W/ VAT'] || row['Amount'] || 0;
        }
        const amount = parseFloat(amountRaw) || 0;

        // Use normalized lookup for date
        let dateStr = '';
        if (row._normalized) {
            dateStr = row._normalized['date'] || '';
        } else {
            dateStr = row['Date'] || row['date'] || '';
        }
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
    const recentTransactions = data.slice(-5).reverse();

    if (recentTransactions.length === 0) {
        container.innerHTML = '<div class="loading-message">No transactions to display</div>';
        return;
    }

    const categoryIcons = ['yellow', 'blue', 'red'];

    const transactionsHTML = recentTransactions.map((row, index) => {
        // Use normalized lookups for all fields
        const n = row._normalized || {};
        const date = n['date'] || row['Date'] || row['date'] || '';
        const expenseDesc = n['expensedescription'] || row['Expense description'] || row['Expense Description'] || '';
        const accountName = n['accountname'] || row['Account Name'] || row['Account name'] || '';
        const vendor = n['vendorname'] || n['vendor'] || row['Vendor Name'] || row['vendor name'] || row['Vendor'] || '';
        const amount = n['amtwvat'] || n['amount'] || row['AMT W/ VAt'] || row['AMT W/ VAT'] || row['Amount'] || 0;
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

// Store cost center data for charts
let costCenterTotals = {};

// Expense Category Colors
const expenseCategoryColors = [
    '#C41E3A', '#1565C0', '#43A047', '#FB8C00', '#F5A623',
    '#E8721C', '#8B4513', '#D0021B', '#00ACC1', '#9C27B0'
];

// Cost Center Colors (distinct from expense colors)
const costCenterColors = [
    '#C41E3A', '#1565C0', '#43A047', '#FB8C00', '#9C27B0',
    '#00ACC1', '#F5A623', '#E8721C', '#8B4513', '#D0021B'
];

// Normalize a header/key string for comparison
// Removes ALL non-alphanumeric characters and converts to lowercase
// Examples: "Cost Center", "Cost Center ", "cost center", "COST CENTER", "Cost_Center" -> "costcenter"
function normalizeKey(key) {
    if (!key) return '';
    return key.toString()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, ''); // Remove ALL non-alphanumeric characters
}

// Standard normalized key names for common columns
const NORMALIZED_KEYS = {
    costcenter: 'costcenter',
    accountname: 'accountname',
    amtwvat: 'amtwvat',
    amtwithvat: 'amtwvat',
    amount: 'amount',
    date: 'date',
    expensedescription: 'expensedescription',
    vendorname: 'vendorname',
    vendor: 'vendor',
    cluster: 'cluster'
};

// Get value from row using normalized key lookup
// Row data now includes _normalized object with normalized keys
function getRowValue(row, targetKeys) {
    if (!row || typeof row !== 'object') return null;

    // If row has _normalized data, use it for fast lookup
    if (row._normalized) {
        for (const key of targetKeys) {
            const normKey = normalizeKey(key);
            if (row._normalized[normKey] !== undefined && row._normalized[normKey] !== null && row._normalized[normKey] !== '') {
                return row._normalized[normKey];
            }
        }
    }

    // Fallback: try exact matches on original keys
    for (const key of targetKeys) {
        if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
            return row[key];
        }
    }

    // Fallback: try normalized matching against all row keys
    const normalizedTargets = targetKeys.map(k => normalizeKey(k));
    const rowKeys = Object.keys(row).filter(k => k !== '_normalized');

    for (const rowKey of rowKeys) {
        const normalizedRowKey = normalizeKey(rowKey);
        if (!normalizedRowKey) continue;

        for (const target of normalizedTargets) {
            if (!target) continue;
            if (normalizedRowKey === target) {
                const value = row[rowKey];
                if (value !== undefined && value !== null && value !== '') {
                    return value;
                }
            }
        }
    }

    return null;
}

// Extract cost center code from cost center string
function extractCostCenterCode(costCenterStr) {
    if (!costCenterStr) return 'unknown';
    const str = costCenterStr.toString();
    const match = str.match(/\d{5}/);
    return match ? match[0] : str;
}

// Get cost center display name
function getCostCenterDisplayName(costCenterStr) {
    if (!costCenterStr) return 'Unknown';
    // Clean up the name - capitalize properly
    return costCenterStr.toString().replace(/jbs/i, 'JBS').trim();
}

// Get cost center from row data with fallback to cluster config
function getCostCenterFromRow(row) {
    // Direct normalized lookup - "costcenter" matches "Cost Center", "Cost Center ", "cost center", etc.
    let costCenterStr = null;

    // First try direct normalized lookup (fastest)
    if (row._normalized) {
        costCenterStr = row._normalized['costcenter'] || row._normalized['costcentername'] || null;
    }

    // Fallback to getRowValue for edge cases
    if (!costCenterStr) {
        costCenterStr = getRowValue(row, ['Cost Center', 'costcenter']);
    }

    // Debug: Log what we found (only on first few rows to avoid spam)
    if (!costCenterStr && row._normalized) {
        console.log('Cost Center not found. Normalized keys available:', Object.keys(row._normalized));
    }

    // If found, use it
    if (costCenterStr && costCenterStr.toString().trim() !== '') {
        return {
            code: extractCostCenterCode(costCenterStr),
            name: getCostCenterDisplayName(costCenterStr)
        };
    }

    // Fallback: Use the cluster's configured cost center
    // For clusters with multiple cost centers, try to detect from other fields
    if (currentCluster.costCenters && currentCluster.costCenters.length > 0) {
        // Try to match cost center from any field that might contain the code
        const rowStr = JSON.stringify(row).toLowerCase();
        for (const cc of currentCluster.costCenters) {
            if (rowStr.includes(cc.code) || rowStr.includes(cc.name.toLowerCase())) {
                return {
                    code: cc.code,
                    name: cc.name
                };
            }
        }
        // Default to first cost center if can't detect
        return {
            code: currentCluster.costCenters[0].code,
            name: currentCluster.costCenters[0].name
        };
    }

    // Single cost center cluster - use the configured cost center
    return {
        code: currentCluster.costCenterCode,
        name: currentCluster.costCenterName
    };
}

// Update breakdown chart - now shows cost centers in big pie
function updateBreakdownChart(data) {
    // Group data by cost center
    const costCenters = {};

    // Debug: Log first row to see actual column names and normalized keys
    if (data.length > 0) {
        console.log('========== BREAKDOWN CHART DEBUG ==========');
        console.log('Total rows to process:', data.length);
        console.log('Original columns:', Object.keys(data[0]).filter(k => k !== '_normalized'));
        console.log('Normalized keys:', data[0]._normalized ? Object.keys(data[0]._normalized) : 'NONE');
        console.log('Cost Center value (normalized):', data[0]._normalized ? data[0]._normalized['costcenter'] : 'N/A');
        console.log('Amount value (normalized):', data[0]._normalized ? (data[0]._normalized['amtwvat'] || data[0]._normalized['amount']) : 'N/A');
        console.log('============================================');
    } else {
        console.log('========== BREAKDOWN CHART DEBUG ==========');
        console.log('WARNING: No data to process for breakdown chart!');
        console.log('============================================');
    }

    data.forEach(row => {
        const costCenterInfo = getCostCenterFromRow(row);
        const costCenterCode = costCenterInfo.code;
        const costCenterName = costCenterInfo.name;

        // Use direct normalized lookup for amount (faster and more reliable)
        let amountRaw = null;
        if (row._normalized) {
            // Try common normalized keys for amount
            amountRaw = row._normalized['amtwvat'] || row._normalized['amtwithvat'] ||
                        row._normalized['amount'] || row._normalized['amountwithvat'] || null;
        }
        if (!amountRaw) {
            amountRaw = getRowValue(row, ['AMT W/ VAt', 'AMT W/ VAT', 'Amount']);
        }
        const amount = parseFloat(amountRaw || 0) || 0;

        // Use direct normalized lookup for account name
        let accountName = null;
        if (row._normalized) {
            accountName = row._normalized['accountname'] || null;
        }
        if (!accountName) {
            accountName = getRowValue(row, ['Account Name', 'AccountName']) || 'Other';
        }
        const category = getExpenseCategory(accountName);

        if (!costCenters[costCenterCode]) {
            costCenters[costCenterCode] = {
                name: getCostCenterDisplayName(costCenterName),
                total: 0,
                count: 0,
                categories: {}
            };
        }

        costCenters[costCenterCode].total += amount;
        costCenters[costCenterCode].count++;

        // Track categories within this cost center
        if (!costCenters[costCenterCode].categories[category]) {
            costCenters[costCenterCode].categories[category] = 0;
        }
        costCenters[costCenterCode].categories[category] += amount;
    });

    // Store for small pie charts
    costCenterTotals = costCenters;

    // Sort cost centers by total (highest first)
    const sortedCostCenters = Object.entries(costCenters)
        .map(([code, data]) => ({
            code,
            name: data.name,
            value: data.total,
            count: data.count
        }))
        .filter(cc => cc.value > 0)
        .sort((a, b) => b.value - a.value);

    console.log('Cost Center breakdown:', sortedCostCenters);

    // Update chartCategories for the big donut chart (now shows cost centers)
    chartCategories = sortedCostCenters.map((cc, index) => ({
        name: cc.name,
        value: cc.value,
        color: costCenterColors[index % costCenterColors.length]
    }));

    // Draw main chart (cost center comparison)
    drawDonutChart();

    // Draw small charts (category breakdown per cost center)
    updateCostCenterBreakdownCharts();
}

// Update small pie charts for each cost center
function updateCostCenterBreakdownCharts() {
    const container = document.getElementById('cost-center-charts-container');
    if (!container) return;

    const costCenterEntries = Object.entries(costCenterTotals)
        .filter(([code, data]) => data.total > 0)
        .sort((a, b) => b[1].total - a[1].total);

    if (costCenterEntries.length === 0) {
        container.innerHTML = '<div class="no-data-message">No cost center data available</div>';
        return;
    }

    // Generate HTML for cost center cards
    container.innerHTML = costCenterEntries.map(([code, data], index) => `
        <div class="cost-center-card">
            <div class="cost-center-card-header">
                <h3 class="cost-center-card-title">${data.name}</h3>
                <span class="cost-center-card-total">₱${data.total.toLocaleString('en-PH', { maximumFractionDigits: 0 })}</span>
            </div>
            <div class="cost-center-card-body">
                <div class="cost-center-chart-wrapper">
                    <canvas id="cc-chart-${code}" width="120" height="120"></canvas>
                    <div class="cost-center-chart-center" id="cc-center-${code}">
                        ${data.count}
                        <small>items</small>
                    </div>
                </div>
                <div class="cost-center-legend" id="cc-legend-${code}"></div>
            </div>
        </div>
    `).join('');

    // Draw each small pie chart
    costCenterEntries.forEach(([code, data]) => {
        drawCostCenterPieChart(code, data);
    });
}

// Draw a small pie chart for a single cost center
function drawCostCenterPieChart(code, data) {
    const canvas = document.getElementById(`cc-chart-${code}`);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const chartSize = 120;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = chartSize * dpr;
    canvas.height = chartSize * dpr;
    canvas.style.width = chartSize + 'px';
    canvas.style.height = chartSize + 'px';
    ctx.scale(dpr, dpr);

    const centerX = chartSize / 2;
    const centerY = chartSize / 2;
    const radius = (chartSize / 2) - 8;
    const innerRadius = radius * 0.55;

    ctx.clearRect(0, 0, chartSize, chartSize);

    // Get sorted categories for this cost center
    const categories = Object.entries(data.categories)
        .map(([name, total]) => ({ name, total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

    if (categories.length === 0) {
        // Draw empty state
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.fillStyle = '#E0E0E0';
        ctx.fill();
        return;
    }

    const total = categories.reduce((sum, cat) => sum + cat.total, 0);
    let startAngle = -Math.PI / 2;

    // Draw 3D shadow effect
    ctx.beginPath();
    ctx.ellipse(centerX, centerY + 6, radius, radius * 0.25, 0, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fill();

    // Draw pie segments
    categories.forEach((cat, idx) => {
        const sliceAngle = (cat.total / total) * 2 * Math.PI;
        const endAngle = startAngle + sliceAngle;
        const color = expenseCategoryColors[idx % expenseCategoryColors.length];

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();

        const gradient = ctx.createLinearGradient(0, centerY - radius, 0, centerY + radius);
        gradient.addColorStop(0, lightenColor(color, 20));
        gradient.addColorStop(0.5, color);
        gradient.addColorStop(1, shadeColor(color, -20));

        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        startAngle = endAngle;
    });

    // Draw inner circle (donut hole)
    const holeGradient = ctx.createRadialGradient(centerX, centerY - 3, 0, centerX, centerY, innerRadius);
    holeGradient.addColorStop(0, '#FFFFFF');
    holeGradient.addColorStop(0.7, '#FFF9E6');
    holeGradient.addColorStop(1, '#F5EED6');

    ctx.beginPath();
    ctx.arc(centerX, centerY, innerRadius, 0, 2 * Math.PI);
    ctx.fillStyle = holeGradient;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(centerX, centerY, innerRadius, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.06)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Update legend
    const legendEl = document.getElementById(`cc-legend-${code}`);
    if (legendEl) {
        legendEl.innerHTML = categories.map((cat, idx) => {
            const color = expenseCategoryColors[idx % expenseCategoryColors.length];
            const percentage = Math.round((cat.total / total) * 100);
            const shortName = cat.name.length > 12 ? cat.name.substring(0, 12) + '...' : cat.name;
            return `
                <div class="cc-legend-item">
                    <span class="cc-legend-color" style="background: ${color};"></span>
                    <span class="cc-legend-label" title="${cat.name}">${shortName}</span>
                    <span class="cc-legend-value">${percentage}%</span>
                </div>
            `;
        }).join('');
    }
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

    // Top category - reset if no data
    const topCategoryEl = document.getElementById('top-category');
    if (topCategoryEl) {
        topCategoryEl.textContent = chartCategories.length > 0 ? chartCategories[0].name : 'N/A';
    }

    // Last update - reset if no data
    const lastUpdateEl = document.getElementById('last-update');
    if (lastUpdateEl) {
        if (data.length > 0) {
            const lastDate = data.reduce((latest, row) => {
                const date = parseDate(row['Date'] || row['date'] || '');
                return date > latest ? date : latest;
            }, new Date(0));

            if (lastDate.getTime() > 0) {
                lastUpdateEl.textContent = lastDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            } else {
                lastUpdateEl.textContent = 'N/A';
            }
        } else {
            lastUpdateEl.textContent = 'N/A';
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
    // Safety check - don't run if cluster config not loaded
    if (!currentCluster) return;

    // Update cluster name displays (with null checks)
    const clusterNameEl = document.getElementById('cluster-name');
    if (clusterNameEl) clusterNameEl.textContent = currentCluster.displayName;

    const clusterGreetingEl = document.getElementById('cluster-greeting');
    if (clusterGreetingEl) clusterGreetingEl.textContent = currentCluster.displayName;

    const sectionClusterNameEl = document.getElementById('section-cluster-name');
    if (sectionClusterNameEl) sectionClusterNameEl.textContent = currentCluster.name;

    const pcfModalSubtitleEl = document.getElementById('pcf-modal-subtitle');
    if (pcfModalSubtitleEl) pcfModalSubtitleEl.textContent = `PCF DAILY ${currentCluster.name.toUpperCase()}`;

    const transactionsModalSubtitleEl = document.getElementById('transactions-modal-subtitle');
    if (transactionsModalSubtitleEl) transactionsModalSubtitleEl.textContent = `Transaction history for ${currentCluster.name}`;

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
        // Check if cluster has multiple cost centers
        if (currentCluster.costCenters && currentCluster.costCenters.length > 0) {
            const options = currentCluster.costCenters.map(cc =>
                `<option value="${cc.code}">${cc.name}</option>`
            ).join('');
            costCenterSelect.innerHTML = `
                <option value="">Select an option ...</option>
                ${options}
            `;
        } else {
            // Single cost center
            costCenterSelect.innerHTML = `
                <option value="">Select an option ...</option>
                <option value="${currentCluster.costCenterCode}" selected>${currentCluster.costCenterName}</option>
            `;
        }
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

    const timeEl = document.getElementById('current-time');
    if (timeEl) timeEl.textContent = timeString;

    const dateEl = document.getElementById('current-date');
    if (dateEl) dateEl.textContent = dateString;
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
            // Only admins can go back to main dashboard
            if (window.JuliesAuth && JuliesAuth.isAdmin()) {
                window.location.href = 'index.html';
            } else {
                // Non-admin users stay on their cluster or go to login
                window.location.href = 'login.html';
            }
        });
    }
}

// Setup logout button
function setupLogoutButton() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (window.JuliesAuth) {
                JuliesAuth.logout();
            } else {
                window.location.href = 'login.html';
            }
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

    pcfForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Collect form data
        const dateInput = document.getElementById('pcf-date').value;
        const dateParts = dateInput.split('-'); // yyyy-mm-dd
        const formattedDate = `${dateParts[1]}/${dateParts[2]}/${dateParts[0]}`; // mm/dd/yyyy

        const costCenterSelect = document.getElementById('pcf-cost-center');
        const costCenterText = costCenterSelect.options[costCenterSelect.selectedIndex]?.text || '';

        const accountNameSelect = document.getElementById('pcf-account-name');
        const accountNameText = accountNameSelect.options[accountNameSelect.selectedIndex]?.text || '';

        const formData = {
            submittedAt: new Date().toISOString(),
            date: formattedDate,
            cluster: document.getElementById('pcf-cluster').value.toLowerCase(),
            expense_description: document.getElementById('pcf-expense-desc').value,
            cost_center: costCenterText,
            vendor: document.getElementById('pcf-vendor').value,
            tin: document.getElementById('pcf-tin').value,
            or_si: document.getElementById('pcf-or-si').value,
            amount_with_vat: parseFloat(document.getElementById('pcf-amount-vat').value) || 0,
            ex_vat: parseFloat(document.getElementById('pcf-exvat').value) || 0,
            account_name: accountNameText,
            vat: parseFloat(document.getElementById('pcf-vat').value) || 0
        };

        // Check if cluster has webhook configured
        const webhookUrl = CLUSTER_WEBHOOKS[currentClusterKey];

        if (webhookUrl) {
            // Submit to webhook
            const submitBtn = pcfForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Submitting...';
            submitBtn.disabled = true;

            try {
                console.log('Submitting to webhook:', webhookUrl);
                console.log('Form data:', formData);

                const response = await fetch(webhookUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });

                if (response.ok) {
                    alert('PCF Entry submitted successfully!');
                    pcfForm.reset();
                    document.getElementById('pcf-cluster').value = currentCluster.name;
                    // Refresh data after successful submission
                    fetchSheetData();
                } else {
                    alert('Error submitting entry. Please try again.');
                }
            } catch (error) {
                console.error('Webhook error:', error);
                alert('Error submitting entry: ' + error.message);
            } finally {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        } else {
            // No webhook - just show success (for other clusters)
            alert('PCF Entry submitted successfully!');
            pcfForm.reset();
            document.getElementById('pcf-cluster').value = currentCluster.name;
        }

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
            const n = row._normalized || {};
            const expenseDesc = (n['expensedescription'] || row['Expense description'] || '').toLowerCase();
            const accountName = (n['accountname'] || row['Account Name'] || '').toLowerCase();
            const vendor = (n['vendorname'] || n['vendor'] || row['vendor name'] || '').toLowerCase();

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
        // Use normalized lookups
        const n = row._normalized || {};
        const date = n['date'] || row['Date'] || row['date'] || '';
        const expenseDesc = n['expensedescription'] || row['Expense description'] || row['Expense Description'] || '';
        const accountName = n['accountname'] || row['Account Name'] || row['Account name'] || '';
        const vendor = n['vendorname'] || n['vendor'] || row['Vendor Name'] || row['vendor name'] || row['Vendor'] || '';
        const amount = n['amtwvat'] || n['amount'] || row['AMT W/ VAt'] || row['AMT W/ VAT'] || row['Amount'] || 0;
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

// Only initialize if we're on the cluster page (check for key element)
function initClusterPage() {
    // Check if we're on cluster.html by looking for a unique element
    const clusterBadge = document.getElementById('cluster-badge');
    if (!clusterBadge) {
        // Not on cluster page, don't initialize
        return;
    }

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
}

// Run initialization
initClusterPage();
