// ========================================
// JULIE'S BAKESHOP - AUTHENTICATION SYSTEM
// ========================================

// USER DATABASE
const USERS = {
    'jeanvie@julies.com': { password: 'jeanvie0211', role: 'admin', cluster: 'all', name: 'Jeanvie' },
    'blum@julies.com': { password: 'blum9843', role: 'cluster', cluster: 'blumentrit', name: 'Blumentrit Manager' },
    'bali@julies.com': { password: 'bali7501', role: 'cluster', cluster: 'balicbalic', name: 'Balicbalic Manager' },
    'kalen@julies.com': { password: 'kale2849', role: 'cluster', cluster: 'kalentong', name: 'Kalentong Manager' },
    'paco@julies.com': { password: 'paco5316', role: 'cluster', cluster: 'paco', name: 'Paco Manager' }
};

// Get session from localStorage - STRICT validation
function getSession() {
    try {
        var data = localStorage.getItem('julies_session');
        if (data) {
            var session = JSON.parse(data);
            // STRICT CHECK: Must have email and role to be valid
            if (!session || !session.email || !session.role) {
                localStorage.removeItem('julies_session');
                return null;
            }
            return session;
        }
    } catch (e) {
        localStorage.removeItem('julies_session');
    }
    return null;
}

// Save session to localStorage
function saveSession(email, role, cluster, name) {
    var session = {
        email: email,
        role: role,
        cluster: cluster,
        name: name
    };
    localStorage.setItem('julies_session', JSON.stringify(session));
    // Store role directly for reliable access
    localStorage.setItem('role', role);
    return session;
}

// Clear session
function clearSession() {
    localStorage.removeItem('julies_session');
    localStorage.removeItem('role');
}

// Login function - returns user data or null
function login(email, password) {
    var emailLower = email.toLowerCase().trim();
    var user = USERS[emailLower];

    if (user && user.password === password) {
        saveSession(emailLower, user.role, user.cluster, user.name);
        return {
            email: emailLower,
            role: user.role,
            cluster: user.cluster,
            name: user.name
        };
    }
    return null;
}

// Logout function
function logout() {
    clearSession();
    window.location.href = 'login.html';
}

// Check if logged in
function isLoggedIn() {
    return getSession() !== null;
}

// Check if admin
function isAdmin() {
    var session = getSession();
    return session && session.role === 'admin';
}

// Get redirect URL for user
function getRedirectUrl(user) {
    if (user.role === 'admin') {
        return 'index.html';
    } else {
        return 'cluster.html?cluster=' + user.cluster;
    }
}

// Protect cluster page - call this on cluster.html
function protectClusterPage(requestedCluster) {
    var session = getSession();

    // Not logged in
    if (!session) {
        window.location.href = 'login.html';
        return false;
    }

    // Admin can access any cluster
    if (session.role === 'admin') {
        return true;
    }

    // Cluster user can only access their own cluster
    if (session.cluster === requestedCluster) {
        return true;
    }

    // Wrong cluster - redirect to correct one
    window.location.href = 'cluster.html?cluster=' + session.cluster;
    return false;
}

// Protect dashboard page - call this on index.html
function protectDashboard() {
    var session = getSession();

    // Not logged in
    if (!session) {
        window.location.href = 'login.html';
        return false;
    }

    // Only admin can access dashboard
    if (session.role === 'admin') {
        return true;
    }

    // Cluster user - redirect to their cluster
    window.location.href = 'cluster.html?cluster=' + session.cluster;
    return false;
}

// Update greeting with user name
function updateGreeting() {
    var session = getSession();
    if (session) {
        var greeting = document.querySelector('.greeting-name');
        if (greeting) {
            greeting.textContent = 'Hello, ' + session.name + '!';
        }
    }
}

// Hide cluster navigation for non-admin, force-show for admin
function hideClusterNav() {
    var role = localStorage.getItem('role');
    if (!role) {
        var session = getSession();
        role = session ? session.role : null;
    }

    var nav = document.querySelector('.cluster-nav');
    var backBtn = document.getElementById('back-btn');

    if (role === 'admin') {
        // Admin: always force visibility
        if (nav) nav.style.display = 'flex';
        if (backBtn) backBtn.style.display = 'flex';
    } else {
        // Non-admin: hide cluster nav and back button
        if (nav) nav.style.display = 'none';
        if (backBtn) backBtn.style.display = 'none';
    }
}

// Fallback: ensure admin nav is always visible after DOM is ready
function ensureAdminNav() {
    var role = localStorage.getItem('role');
    if (!role) {
        var session = getSession();
        role = session ? session.role : null;
    }
    if (role === 'admin') {
        var nav = document.querySelector('.cluster-nav');
        var backBtn = document.getElementById('back-btn');
        if (nav) nav.style.display = 'flex';
        if (backBtn) backBtn.style.display = 'flex';
    }
}

// Export
window.JuliesAuth = {
    USERS: USERS,
    getSession: getSession,
    saveSession: saveSession,
    clearSession: clearSession,
    login: login,
    logout: logout,
    isLoggedIn: isLoggedIn,
    isAdmin: isAdmin,
    getRedirectUrl: getRedirectUrl,
    protectClusterPage: protectClusterPage,
    protectDashboard: protectDashboard,
    updateGreeting: updateGreeting,
    hideClusterNav: hideClusterNav,
    ensureAdminNav: ensureAdminNav
};
