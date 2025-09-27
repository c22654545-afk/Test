// Configuration file for the portfolio feedback system
// Client-side configuration only - NEVER include sensitive data like webhook URLs

window.PORTFOLIO_CONFIG = {
    // Form validation and UI settings only
    MAX_NAME_LENGTH: 100,
    MAX_EMAIL_LENGTH: 254,
    MAX_FEEDBACK_LENGTH: 2000,
    
    // Form validation settings
    EMAIL_VALIDATION: {
        REQUIRED: true,
        PATTERN: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    },
    
    // UI configuration
    ENABLE_REAL_TIME_VALIDATION: true,
    AUTO_HIDE_STATUS_DELAY: 5000
};

// Instructions for secure hosting:
// 1. For server-side hosting: Set DISCORD_WEBHOOK_URL as an environment variable (NEVER in public files)
// 2. Upload all files (index.html, style.css, script.js, config.js, server.py) to your hosting platform
// 3. For client-only hosting: You MUST set up a server-side relay/proxy (serverless function)
//    that accepts form data and forwards to Discord securely
// 4. SECURITY WARNING: Never put Discord webhook URLs in client-side code or config files!
