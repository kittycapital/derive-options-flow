import React, { useState, useEffect, useCallback, useRef } from 'react';

// Unusual flow detection thresholds - adjust as needed
const THRESHOLDS = {
  minPremiumUSD: 10000,      // Flag trades > $10K premium
  oiPercentage: 2,           // Flag if trade > 2% of open interest
};

// Styling
const styles = {
  container: {
    minHeight: '100vh',
    background: '#000000',
    color: '#e0e0e0',
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    padding: '24px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#ffffff',
    margin: 0,
  },
  subtitle: {
    fontSize: '12px',
    color: '#666',
    marginTop: '4px',
  },
  controls: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  select: {
    background: '#111',
    border: '1px solid #333',
    color: '#fff',
    padding: '10px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  button: {
    background: 'linear-gradient(135deg, #00ff88, #00d4ff)',
    border: 'none',
    color: '#000',
    padding: '10px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  priceBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    background: '#111',
    border: '1px solid #222',
    borderRadius: '8px',
    padding: '10px 16px',
  },
  priceLabel: {
    fontSize: '12px',
    color: '#888',
  },
  priceValue: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#fff',
  },
  priceChange: {
    fontSize: '12px',
    fontWeight: '600',
  },
  connectionStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11px',
    color: '#888',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  statCard: {
    background: '#0a0a0a',
    border: '1px solid #1a1a1a',
    borderRadius: '12px',
    padding: '20px',
  },
  statLabel: {
    fontSize: '11px',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  statValue: {
    fontSize: '28px',
    fontWeight: '700',
    marginTop: '8px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px',
  },
  th: {
    textAlign: 'left',
    padding: '14px 12px',
    borderBottom: '1px solid #222',
    color: '#888',
    fontWeight: '500',
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  td: {
    padding: '14px 12px',
    borderBottom: '1px solid #111',
  },
  unusualRow: {
    background: 'rgba(0, 255, 136, 0.08)',
    borderLeft: '3px solid #00ff88',
  },
  tag: {
    display: 'inline-block',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: '600',
    marginRight: '4px',
  },
  callTag: {
    background: 'rgba(0, 255, 136, 0.2)',
    color: '#00ff88',
  },
  putTag: {
    background: 'rgba(255, 68, 68, 0.2)',
    color: '#ff4444',
  },
  flagTag: {
    background: 'rgba(255, 200, 0, 0.2)',
    color: '#ffc800',
  },
  loader: {
    textAlign: 'center',
    padding: '60px',
    color: '#666',
  },
  error: {
    background: 'rgba(255, 68, 68, 0.1)',
    border: '1px solid rgba(255, 68, 68, 0.3)',
    borderRadius: '8px',
    padding: '16px',
    color: '#ff6b6b',
    marginBottom: '24px',
  },
  timestamp: {
    fontSize: '11px',
    color: '#555',
  },
};

// Helper to format numbers
const formatNumber = (num, decimals = 2) => {
  if (num >= 1000000) return `$${(num / 1000000).toFixed(decimals)}M`;
  if (num >= 1000) return `$${(num / 1000).toFixed(decimals)}K`;
  return `$${num.toFixed(decimals)}`;
};

const formatPrice = (num) => {
  return num.toLocaleString('en-US', { 
    style: 'currency', 
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2 
  });
};

const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

// Parse instrument name: ETH-20240315-3000-C
const parseInstrument = (name) => {
  const parts = name.split('-');
  if (parts.length >= 4) {
    return {
      currency: parts[0],
      expiry: parts[1],
      strike: parts[2],
      type: parts[3] === 'C' ? 'CALL' : 'PUT',
    };
  }
  return { currency: parts[0], expiry: '', strike: '', type: '' };
};

export default function DeriveOptionsFlow() {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCurrency, setSelectedCurrency] = useState('ETH');
  const [lastUpdate, setLastUpdate] = useState(null);
  const [stats, setStats] = useState({ total: 0, unusual: 0, totalPremium: 0 });
  const [spotPrice, setSpotPrice] = useState({ price: 0, change24h: 0, loading: true });
  const [wsConnected, setWsConnected] = useState(false);
  
  const wsRef = useRef(null);
  const requestIdRef = useRef(1);

  // Analyze trade for unusual activity
  const analyzeTrade = useCallback((trade) => {
    const price = parseFloat(trade.trade_price || trade.price || 0);
    const amount = Math.abs(parseFloat(trade.trade_amount || trade.amount || 0));
    const premium = price * amount;
    const flags = [];
    
    // Large premium check
    if (premium >= THRESHOLDS.minPremiumUSD) {
      flags.push({ type: 'LARGE_PREMIUM', label: `${formatNumber(premium)} Premium` });
    }

    return {
      ...trade,
      premium,
      flags,
      isUnusual: flags.length > 0,
      parsed: parseInstrument(trade.instrument_name || ''),
    };
  }, []);

  // Handle incoming WebSocket messages
  const handleWsMessage = useCallback((data) => {
    if (data.error) {
      console.error('API Error:', data.error);
      setError(data.error.message || 'API Error');
      setLoading(false);
      return;
    }

    const result = data.result;
    if (!result) return;

    // Handle trade history response
    if (result.trades) {
      const analyzedTrades = result.trades.map(trade => analyzeTrade(trade));
      
      // Sort: unusual first, then by timestamp
      analyzedTrades.sort((a, b) => {
        if (a.isUnusual && !b.isUnusual) return -1;
        if (!a.isUnusual && b.isUnusual) return 1;
        return (b.timestamp || 0) - (a.timestamp || 0);
      });
      
      setTrades(analyzedTrades);
      setLastUpdate(new Date());
      setLoading(false);
      
      // Calculate stats
      const unusualTrades = analyzedTrades.filter(t => t.isUnusual);
      const totalPremium = analyzedTrades.reduce((sum, t) => sum + t.premium, 0);
      setStats({
        total: analyzedTrades.length,
        unusual: unusualTrades.length,
        totalPremium,
      });
    }

    // Handle ticker response (for spot price)
    if (result.mark_price || result.index_price) {
      const price = parseFloat(result.mark_price || result.index_price || 0);
      const change = parseFloat(result.stats?.price_change || 0);
      setSpotPrice({ price, change24h: change, loading: false });
    }
  }, [analyzeTrade]);

  // Send message via WebSocket
  const sendWsMessage = useCallback((method, params = {}) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected');
      return null;
    }
    
    const id = requestIdRef.current++;
    const message = {
      method,
      params,
      id,
      jsonrpc: '2.0'
    };
    
    wsRef.current.send(JSON.stringify(message));
    return id;
  }, []);

  // Fetch trade history
  const fetchTradeHistory = useCallback((currency) => {
    setLoading(true);
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    
    sendWsMessage('public/get_trade_history', {
      currency,
      instrument_type: 'option',
      from_timestamp: oneDayAgo,
      to_timestamp: now,
      page_size: 100
    });
  }, [sendWsMessage]);

  // Fetch spot price
  const fetchSpotPrice = useCallback((currency) => {
    setSpotPrice(prev => ({ ...prev, loading: true }));
    sendWsMessage('public/get_ticker', {
      instrument_name: `${currency}-PERP`
    });
  }, [sendWsMessage]);

  // WebSocket connection
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.close();
    }

    const ws = new WebSocket('wss://api.derive.xyz/ws');
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      setWsConnected(true);
      setError(null);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleWsMessage(data);
      } catch (e) {
        console.error('Failed to parse WS message:', e);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setError('WebSocket connection error');
      setWsConnected(false);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setWsConnected(false);
      // Reconnect after 3 seconds
      setTimeout(() => {
        if (document.visibilityState !== 'hidden') {
          connectWebSocket();
        }
      }, 3000);
    };
  }, [handleWsMessage]);

  // Refresh data
  const refreshData = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      fetchTradeHistory(selectedCurrency);
      fetchSpotPrice(selectedCurrency);
    }
  }, [selectedCurrency, fetchTradeHistory, fetchSpotPrice]);

  // Connect on mount
  useEffect(() => {
    connectWebSocket();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connectWebSocket]);

  // Fetch data when connected or currency changes
  useEffect(() => {
    if (wsConnected) {
      fetchTradeHistory(selectedCurrency);
      fetchSpotPrice(selectedCurrency);
    }
  }, [selectedCurrency, wsConnected, fetchTradeHistory, fetchSpotPrice]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (wsConnected) {
        refreshData();
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [wsConnected, refreshData]);

  // Refresh spot price every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (wsConnected) {
        fetchSpotPrice(selectedCurrency);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [wsConnected, selectedCurrency, fetchSpotPrice]);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>🐋 고래 온체인 옵션 거래</h1>
          <p style={styles.subtitle}>
            Data from Derive.xyz • {lastUpdate ? `업데이트 ${formatTime(lastUpdate)}` : '로딩 중...'}
          </p>
          <div style={styles.connectionStatus}>
            <div style={{
              ...styles.statusDot,
              background: wsConnected ? '#00ff88' : '#ff4444'
            }} />
            {wsConnected ? '연결됨' : '연결 중...'}
          </div>
        </div>
        <div style={styles.controls}>
          {/* Real-time Price Display */}
          <div style={styles.priceBox}>
            <div>
              <div style={styles.priceLabel}>{selectedCurrency} 현재가</div>
              <div style={styles.priceValue}>
                {spotPrice.loading ? '...' : formatPrice(spotPrice.price)}
              </div>
            </div>
            {!spotPrice.loading && spotPrice.change24h !== 0 && (
              <div style={{
                ...styles.priceChange,
                color: spotPrice.change24h >= 0 ? '#00ff88' : '#ff4444'
              }}>
                {spotPrice.change24h >= 0 ? '▲' : '▼'} {Math.abs(spotPrice.change24h).toFixed(2)}%
              </div>
            )}
          </div>
          
          <select 
            style={styles.select}
            value={selectedCurrency}
            onChange={(e) => setSelectedCurrency(e.target.value)}
          >
            <option value="ETH">ETH Options</option>
            <option value="BTC">BTC Options</option>
            <option value="SOL">SOL Options</option>
          </select>
          <button 
            style={styles.button}
            onClick={refreshData}
            disabled={loading || !wsConnected}
          >
            {loading ? '로딩...' : '↻ 새로고침'}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div style={styles.error}>
          ⚠️ {error}
        </div>
      )}

      {/* Stats Grid */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>총 거래 (24시간)</div>
          <div style={styles.statValue}>{stats.total}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>이상 거래</div>
          <div style={{...styles.statValue, color: '#00ff88'}}>{stats.unusual}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>총 프리미엄</div>
          <div style={styles.statValue}>{formatNumber(stats.totalPremium)}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>감지 기준</div>
          <div style={styles.statValue}>{formatNumber(THRESHOLDS.minPremiumUSD)}</div>
        </div>
      </div>

      {/* Trades Table */}
      <div style={{ overflowX: 'auto' }}>
        {loading && trades.length === 0 ? (
          <div style={styles.loader}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏳</div>
            옵션 거래 데이터 로딩 중...
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>시간</th>
                <th style={styles.th}>종목</th>
                <th style={styles.th}>타입</th>
                <th style={styles.th}>행사가</th>
                <th style={styles.th}>만기</th>
                <th style={styles.th}>수량</th>
                <th style={styles.th}>가격</th>
                <th style={styles.th}>프리미엄</th>
                <th style={styles.th}>플래그</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade, idx) => (
                <tr 
                  key={trade.trade_id || idx}
                  style={trade.isUnusual ? styles.unusualRow : {}}
                >
                  <td style={styles.td}>
                    <span style={styles.timestamp}>
                      {formatTime(trade.timestamp)}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <code style={{ color: '#00d4ff' }}>{trade.instrument_name}</code>
                  </td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.tag,
                      ...(trade.parsed.type === 'CALL' ? styles.callTag : styles.putTag)
                    }}>
                      {trade.parsed.type || '-'}
                    </span>
                  </td>
                  <td style={styles.td}>${trade.parsed.strike || '-'}</td>
                  <td style={styles.td}>{trade.parsed.expiry || '-'}</td>
                  <td style={styles.td}>
                    {Math.abs(parseFloat(trade.trade_amount || trade.amount || 0)).toFixed(2)}
                  </td>
                  <td style={styles.td}>
                    ${parseFloat(trade.trade_price || trade.price || 0).toFixed(2)}
                  </td>
                  <td style={{...styles.td, fontWeight: trade.isUnusual ? '600' : '400'}}>
                    {formatNumber(trade.premium)}
                  </td>
                  <td style={styles.td}>
                    {trade.flags.map((flag, i) => (
                      <span key={i} style={{...styles.tag, ...styles.flagTag}}>
                        {flag.label}
                      </span>
                    ))}
                  </td>
                </tr>
              ))}
              {trades.length === 0 && !loading && (
                <tr>
                  <td colSpan="9" style={{...styles.td, textAlign: 'center', color: '#666'}}>
                    최근 24시간 내 거래가 없습니다
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      <div style={{ marginTop: '32px', textAlign: 'center', color: '#444', fontSize: '11px' }}>
        Data from Derive.xyz API • 기준: 프리미엄 ≥ {formatNumber(THRESHOLDS.minPremiumUSD)}, OI 비율 ≥ {THRESHOLDS.oiPercentage}%
      </div>
    </div>
  );
}
