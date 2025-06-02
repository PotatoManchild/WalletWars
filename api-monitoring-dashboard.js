// api-monitoring-dashboard.js
// Real-time API usage monitoring and alerts

console.log('📊 Loading API Monitoring Dashboard...');

class APIMonitoringDashboard {
    constructor() {
        this.metrics = {
            totalCalls: 0,
            callsPerMinute: [],
            callsByProvider: {},
            failuresByProvider: {},
            lastReset: Date.now(),
            alerts: []
        };
        
        this.thresholds = {
            warningPercent: 70,
            criticalPercent: 90,
            maxCallsPerMinute: 20,
            maxFailuresPerMinute: 5
        };
        
        this.monitoring = false;
        this.dashboardInterval = null;
        
        this.interceptAPICalls();
    }
    
    /**
     * Intercept all wallet service API calls for monitoring
     */
    interceptAPICalls() {
        if (!window.enhancedWalletService) {
            console.warn('⚠️ Enhanced wallet service not found, monitoring disabled');
            return;
        }
        
        const service = window.enhancedWalletService;
        const dashboard = this;
        
        // Wrap getWalletBalance
        const originalGetBalance = service.getWalletBalance;
        service.getWalletBalance = async function(...args) {
            const startTime = Date.now();
            const provider = 'unknown';
            
            try {
                const result = await originalGetBalance.apply(this, args);
                dashboard.recordSuccess('getWalletBalance', result.provider, Date.now() - startTime);
                return result;
            } catch (error) {
                dashboard.recordFailure('getWalletBalance', provider, error.message);
                throw error;
            }
        };
        
        // Wrap getFullWalletSnapshot
        const originalGetSnapshot = service.getFullWalletSnapshot;
        service.getFullWalletSnapshot = async function(...args) {
            const startTime = Date.now();
            const provider = 'unknown';
            
            try {
                const result = await originalGetSnapshot.apply(this, args);
                dashboard.recordSuccess('getFullWalletSnapshot', result.provider, Date.now() - startTime);
                return result;
            } catch (error) {
                dashboard.recordFailure('getFullWalletSnapshot', provider, error.message);
                throw error;
            }
        };
        
        console.log('✅ API call interception active');
    }
    
    /**
     * Record successful API call
     */
    recordSuccess(method, provider, responseTime) {
        this.metrics.totalCalls++;
        
        // Track by provider
        if (!this.metrics.callsByProvider[provider]) {
            this.metrics.callsByProvider[provider] = 0;
        }
        this.metrics.callsByProvider[provider]++;
        
        // Track calls per minute
        const now = Date.now();
        this.metrics.callsPerMinute.push({
            timestamp: now,
            provider,
            method,
            responseTime,
            success: true
        });
        
        // Clean old entries (keep last 5 minutes)
        this.metrics.callsPerMinute = this.metrics.callsPerMinute.filter(
            call => now - call.timestamp < 5 * 60 * 1000
        );
        
        // Check thresholds
        this.checkThresholds();
    }
    
    /**
     * Record failed API call
     */
    recordFailure(method, provider, error) {
        this.metrics.totalCalls++;
        
        // Track failures
        if (!this.metrics.failuresByProvider[provider]) {
            this.metrics.failuresByProvider[provider] = 0;
        }
        this.metrics.failuresByProvider[provider]++;
        
        // Track in calls per minute
        const now = Date.now();
        this.metrics.callsPerMinute.push({
            timestamp: now,
            provider,
            method,
            error,
            success: false
        });
        
        // Add alert
        this.addAlert('error', `API call failed: ${method} - ${error}`);
        
        // Check thresholds
        this.checkThresholds();
    }
    
    /**
     * Check if any thresholds are exceeded
     */
    checkThresholds() {
        const now = Date.now();
        const oneMinuteAgo = now - 60000;
        
        // Count calls in last minute
        const recentCalls = this.metrics.callsPerMinute.filter(
            call => call.timestamp > oneMinuteAgo
        );
        
        const callsLastMinute = recentCalls.length;
        const failuresLastMinute = recentCalls.filter(call => !call.success).length;
        
        // Check call rate
        if (callsLastMinute > this.thresholds.maxCallsPerMinute) {
            this.addAlert('critical', `High API usage: ${callsLastMinute} calls/minute (limit: ${this.thresholds.maxCallsPerMinute})`);
        } else if (callsLastMinute > this.thresholds.maxCallsPerMinute * 0.8) {
            this.addAlert('warning', `Approaching API limit: ${callsLastMinute} calls/minute`);
        }
        
        // Check failure rate
        if (failuresLastMinute > this.thresholds.maxFailuresPerMinute) {
            this.addAlert('critical', `High failure rate: ${failuresLastMinute} failures/minute`);
        }
    }
    
    /**
     * Add an alert
     */
    addAlert(level, message) {
        const alert = {
            level,
            message,
            timestamp: Date.now()
        };
        
        this.metrics.alerts.unshift(alert);
        
        // Keep only last 50 alerts
        if (this.metrics.alerts.length > 50) {
            this.metrics.alerts = this.metrics.alerts.slice(0, 50);
        }
        
        // Log critical alerts
        if (level === 'critical') {
            console.error(`🚨 CRITICAL ALERT: ${message}`);
        }
    }
    
    /**
     * Start real-time monitoring
     */
    startMonitoring(intervalMs = 5000) {
        if (this.monitoring) {
            console.log('📊 Monitoring already active');
            return;
        }
        
        this.monitoring = true;
        this.dashboardInterval = setInterval(() => {
            this.displayDashboard();
        }, intervalMs);
        
        console.log(`✅ Real-time monitoring started (updates every ${intervalMs/1000}s)`);
        this.displayDashboard();
    }
    
    /**
     * Stop monitoring
     */
    stopMonitoring() {
        if (this.dashboardInterval) {
            clearInterval(this.dashboardInterval);
            this.dashboardInterval = null;
        }
        this.monitoring = false;
        console.log('🛑 Monitoring stopped');
    }
    
    /**
     * Display dashboard in console
     */
    displayDashboard() {
        console.clear();
        const now = Date.now();
        const oneMinuteAgo = now - 60000;
        
        // Calculate current metrics
        const recentCalls = this.metrics.callsPerMinute.filter(
            call => call.timestamp > oneMinuteAgo
        );
        
        const callsLastMinute = recentCalls.length;
        const successfulCalls = recentCalls.filter(call => call.success).length;
        const failedCalls = recentCalls.filter(call => !call.success).length;
        const avgResponseTime = recentCalls
            .filter(call => call.responseTime)
            .reduce((sum, call) => sum + call.responseTime, 0) / (successfulCalls || 1);
        
        // Header
        console.log('🎯 WalletWars API Monitoring Dashboard');
        console.log('=====================================');
        console.log(`📅 ${new Date().toLocaleString()}`);
        console.log('');
        
        // Current Status
        const statusEmoji = callsLastMinute > this.thresholds.maxCallsPerMinute ? '🔴' :
                          callsLastMinute > this.thresholds.maxCallsPerMinute * 0.8 ? '🟡' : '🟢';
        
        console.log(`${statusEmoji} Status: ${callsLastMinute > this.thresholds.maxCallsPerMinute ? 'CRITICAL' : 
                                         callsLastMinute > this.thresholds.maxCallsPerMinute * 0.8 ? 'WARNING' : 'HEALTHY'}`);
        console.log('');
        
        // Key Metrics
        console.log('📊 Last Minute Statistics:');
        console.log(`  • API Calls: ${callsLastMinute}/${this.thresholds.maxCallsPerMinute} (${Math.round(callsLastMinute/this.thresholds.maxCallsPerMinute*100)}%)`);
        console.log(`  • Success Rate: ${successfulCalls}/${callsLastMinute} (${Math.round(successfulCalls/callsLastMinute*100)||0}%)`);
        console.log(`  • Failures: ${failedCalls}`);
        console.log(`  • Avg Response Time: ${Math.round(avgResponseTime)}ms`);
        console.log('');
        
        // Provider Breakdown
        console.log('🔗 Provider Usage:');
        Object.entries(this.metrics.callsByProvider).forEach(([provider, count]) => {
            const failures = this.metrics.failuresByProvider[provider] || 0;
            console.log(`  • ${provider}: ${count} calls (${failures} failures)`);
        });
        console.log('');
        
        // Recent Alerts
        if (this.metrics.alerts.length > 0) {
            console.log('⚠️ Recent Alerts:');
            this.metrics.alerts.slice(0, 5).forEach(alert => {
                const icon = alert.level === 'critical' ? '🚨' : 
                           alert.level === 'warning' ? '⚠️' : 'ℹ️';
                const timeAgo = Math.round((now - alert.timestamp) / 1000);
                console.log(`  ${icon} [${timeAgo}s ago] ${alert.message}`);
            });
            console.log('');
        }
        
        // Usage Graph (simple ASCII)
        console.log('📈 API Usage Timeline (last 5 minutes):');
        this.displayUsageGraph();
        console.log('');
        
        // Commands
        console.log('💡 Commands:');
        console.log('  • apiDashboard.stopMonitoring() - Stop dashboard');
        console.log('  • apiDashboard.getReport() - Generate detailed report');
        console.log('  • apiDashboard.reset() - Reset all metrics');
        console.log('  • apiDashboard.exportMetrics() - Export data');
    }
    
    /**
     * Display simple usage graph
     */
    displayUsageGraph() {
        const now = Date.now();
        const buckets = [];
        const bucketSize = 30000; // 30 second buckets
        
        // Create buckets for last 5 minutes
        for (let i = 9; i >= 0; i--) {
            const bucketStart = now - (i + 1) * bucketSize;
            const bucketEnd = now - i * bucketSize;
            
            const callsInBucket = this.metrics.callsPerMinute.filter(
                call => call.timestamp >= bucketStart && call.timestamp < bucketEnd
            ).length;
            
            buckets.push({
                time: new Date(bucketEnd).toLocaleTimeString().substr(0, 5),
                calls: callsInBucket
            });
        }
        
        // Find max for scaling
        const maxCalls = Math.max(...buckets.map(b => b.calls), 1);
        const scale = 20 / maxCalls;
        
        // Draw graph
        for (let row = 20; row >= 0; row--) {
            let line = row === 0 ? '  └' : '   ';
            
            buckets.forEach(bucket => {
                const height = Math.round(bucket.calls * scale);
                line += height >= row ? '█' : ' ';
            });
            
            if (row % 5 === 0) {
                line = `${Math.round(row / scale)}`.padStart(3, ' ') + line.substr(3);
            }
            
            console.log(line);
        }
        
        // Time labels
        console.log('    ' + buckets.map(b => b.time.substr(3)).join(''));
    }
    
    /**
     * Generate detailed report
     */
    getReport() {
        const now = Date.now();
        const duration = (now - this.metrics.lastReset) / 1000 / 60; // minutes
        
        const report = {
            generatedAt: new Date().toISOString(),
            monitoringDuration: `${Math.round(duration)} minutes`,
            totalAPICalls: this.metrics.totalCalls,
            averageCallsPerMinute: Math.round(this.metrics.totalCalls / duration),
            providerBreakdown: this.metrics.callsByProvider,
            failures: this.metrics.failuresByProvider,
            recentAlerts: this.metrics.alerts.slice(0, 10),
            currentCallsPerMinute: this.metrics.callsPerMinute.filter(
                call => call.timestamp > now - 60000
            ).length
        };
        
        console.log('📋 API Usage Report');
        console.log('==================');
        console.log(JSON.stringify(report, null, 2));
        
        return report;
    }
    
    /**
     * Reset all metrics
     */
    reset() {
        this.metrics = {
            totalCalls: 0,
            callsPerMinute: [],
            callsByProvider: {},
            failuresByProvider: {},
            lastReset: Date.now(),
            alerts: []
        };
        console.log('✅ All metrics reset');
    }
    
    /**
     * Export metrics for analysis
     */
    exportMetrics() {
        const data = {
            exported: new Date().toISOString(),
            metrics: this.metrics,
            thresholds: this.thresholds
        };
        
        // Create downloadable file
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `api-metrics-${Date.now()}.json`;
        a.click();
        
        console.log('✅ Metrics exported');
        return data;
    }
    
    /**
     * Set custom thresholds
     */
    setThresholds(thresholds) {
        this.thresholds = { ...this.thresholds, ...thresholds };
        console.log('✅ Thresholds updated:', this.thresholds);
    }
}

// Create global dashboard instance
window.apiDashboard = new APIMonitoringDashboard();

// Utility functions for quick access
window.startAPIMonitoring = () => window.apiDashboard.startMonitoring();
window.stopAPIMonitoring = () => window.apiDashboard.stopMonitoring();
window.apiReport = () => window.apiDashboard.getReport();

console.log('✅ API Monitoring Dashboard loaded!');
console.log('📊 Commands:');
console.log('  • startAPIMonitoring() - Start real-time dashboard');
console.log('  • stopAPIMonitoring() - Stop dashboard');
console.log('  • apiReport() - Generate usage report');
console.log('  • apiDashboard.setThresholds({maxCallsPerMinute: 30}) - Adjust limits');