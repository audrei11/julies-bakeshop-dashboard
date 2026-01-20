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

    const data = [
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
