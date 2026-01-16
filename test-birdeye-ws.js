#!/usr/bin/env node
/**
 * Test script to verify Birdeye WebSocket connection through devprnt backend
 */

const WebSocket = require('ws');

const BIRDEYE_WS_URL = 'ws://localhost:3001/ws/birdeye?chain=solana';
const SOL_ADDRESS = 'So11111111111111111111111111111111111111112';

console.log('🧪 Testing Birdeye WebSocket connection through devprnt backend...\n');
console.log(`📡 Connecting to: ${BIRDEYE_WS_URL}\n`);

const ws = new WebSocket(BIRDEYE_WS_URL);

ws.on('open', () => {
    console.log('✅ WebSocket connected!\n');

    // Test 1: Subscribe to token stats (existing functionality)
    console.log('📊 Test 1: Subscribing to TOKEN_STATS for SOL...');
    ws.send(JSON.stringify({
        type: 'SUBSCRIBE_TOKEN_STATS',
        data: {
            address: SOL_ADDRESS
        }
    }));

    // Test 2: Subscribe to transactions (new functionality)
    setTimeout(() => {
        console.log('💱 Test 2: Subscribing to TXS for SOL...');
        ws.send(JSON.stringify({
            type: 'SUBSCRIBE_TXS',
            data: {
                queryType: 'simple',
                address: SOL_ADDRESS,
                txsType: 'swap'
            }
        }));
    }, 1000);
});

ws.on('message', (data) => {
    try {
        const message = JSON.parse(data.toString());

        if (message.type === 'TOKEN_STATS_DATA') {
            console.log(`\n✅ Received TOKEN_STATS_DATA:`);
            console.log(`   Price: $${message.data.price}`);
            console.log(`   24h Change: ${message.data.priceChange24h}%`);
            console.log(`   Volume: $${(message.data.volume24h / 1e6).toFixed(2)}M`);
        }

        if (message.type === 'TXS_DATA') {
            console.log(`\n✅ Received TXS_DATA (real-time transaction):`);
            console.log(`   Price: $${message.data.price}`);
            console.log(`   Side: ${message.data.side}`);
            console.log(`   Volume: $${message.data.volumeUSD?.toFixed(2) || 'N/A'}`);
            console.log(`   Source: ${message.data.source || 'unknown'}`);
        }
    } catch (err) {
        console.error('❌ Error parsing message:', err.message);
    }
});

ws.on('error', (error) => {
    console.error('\n❌ WebSocket error:', error.message);
    process.exit(1);
});

ws.on('close', () => {
    console.log('\n🔌 WebSocket closed');
    process.exit(0);
});

// Run for 30 seconds then close
setTimeout(() => {
    console.log('\n⏱️  Test duration reached (30s), closing connection...');
    ws.close();
}, 30000);
