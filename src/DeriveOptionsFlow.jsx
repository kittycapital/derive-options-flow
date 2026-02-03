import React, { useState, useEffect, useCallback, useRef } from 'react';

// Unusual flow detection thresholds
const THRESHOLDS = {
  minPremiumUSD: 10000,
  oiPercentage: 2,
};

// Filter options
const TIME_OPTIONS = [
  { value: 1, label: '1시간' },
  { value: 6, label: '6시간' },
  { value: 12, label: '12시간' },
  { value: 24, label: '24시간' },
];

const PREMIUM_OPTIONS = [
  { value: 0, label: '전체' },
  { value: 1000, label: '$1K+' },
  { value: 5000, label: '$5K+' },
  { value: 10000, label: '$10K+' },
  { value: 50000, label: '$50K+' },
];

const TYPE_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'CALL', label: 'CALL' },
  { value: 'PUT', label: 'PUT' },
];

// Explanations content
const EXPLANATIONS = [
  { term: 'CALL 옵션', desc: '특정 가격에 살 수 있는 권리. 가격 상승을 예상할 때 매수합니다.' },
  { term: 'PUT 옵션', desc: '특정 가격에 팔 수 있는 권리. 가격 하락을 예상할 때 매수합니다.' },
  { term: '프리미엄', desc: '옵션 계약을 사기 위해 지불하는 가격입니다. (가격 × 수량)' },
  { term: '행사가 (Strike)', desc: '옵션을 행사할 때 거래되는 기준 가격입니다.' },
  { term: '만기 (Expiry)', desc: '옵션 계약이 만료되는 날짜입니다.' },
  { term: '고래 거래', desc: '대규모 거래를 의미합니다. 큰 손들의 움직임을 추적할 수 있습니다.' },
  { term: '이상 거래 (Unusual)', desc: '평소보다 큰 규모의 거래로, 시장 방향성의 힌트가 될 수 있습니다.' },
];

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
    flexWrap: 'wrap',
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
  // Explanation box
  explanationBox: {
    background: '#0a0a0a',
    border: '1px solid #1a1a1a',
    borderRadius: '8px',
    marginBottom: '16px',
    overflow: 'hidden',
  },
  explanationHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    cursor: 'pointer',
    userSelect: 'none',
  },
  explanationTitle: {
    fontSize: '14px',
    color: '#888',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  explanationToggle: {
    fontSize: '12px',
    color: '#666',
  },
  explanationContent: {
    padding: '0 16px 16px 16px',
    borderTop: '1px solid #1a1a1a',
  },
  explanationItem: {
    padding: '8px 0',
    borderBottom: '1px solid #111',
    fontSize: '13px',
  },
  explanationTerm: {
    color: '#00d4ff',
    fontWeight: '600',
    marginBottom: '4px',
  },
  explanationDesc: {
    color: '#888',
    lineHeight: '1.5',
  },
  // Filters
  filtersContainer: {
    display: 'flex',
    gap: '16px',
    marginBottom: '24px',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  filterLabel: {
    fontSize: '12px',
    color: '#666',
  },
  filterSelect: {
    background: '#111',
    border: '1px solid #333',
    color: '#fff',
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  // Top 5
  top5Container: {
    marginBottom: '24px',
  },
  top5Title: {
    fontSize: '14px',
    color: '#888',
    marginBottom: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  top5Grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '12px',
  },
  top5Card: {
    background: '#0a0a0a',
    border: '1px solid #1a1a1a',
    borderRadius: '8px',
    padding: '12px',
    position: 'relative',
  },
  top5Rank: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    fontSize: '11px',
    color: '#444',
    fontWeight: '700',
  },
  top5Instrument: {
    fontSize: '11px',
    color: '#00d4ff',
    marginBottom: '4px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  top5Amount: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#fff',
  },
  top5Premium: {
    fontSize: '11px',
    color: '#888',
    marginTop: '4px',
  },
  // Stats
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
  // Table
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

// Helpers
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
  const [spotPrice, setSpotPrice] = useState({ price: 0, change24h: 0, loading: true });
  const [wsConnected, setWsConnected] = useState(false);
  
  // Filters
  const [filterType, setFilterType] = useState('all');
  const [filterPremium, setFilterPremium] = useState(0);
  const [filterTime, setFilterTime] = useState(24);
  
  // Explanation box
  const [explanationOpen, setExplanationOpen] = useState(false);
  
  const wsRef = useRef(null);
  const requestIdRef = useRef(1);

  // Analyze trade
  const analyzeTrade = useCallback((trade) => {
    const price = parseFloat(trade.trade_price || trade.price || 0);
    const amount = Math.abs(parseFloat(trade.trade_amount || trade.amount || 0));
    const premium = price * amount;
    const flags = [];
    
    if (premium >= THRESHOLDS.minPremiumUSD) {
      flags.push({ type: 'LARGE_PREMIUM', label: `${formatNumber(premium)} Premium` });
    }

    return {
      ...trade,
      premium,
      amount,
      flags,
      isUnusual: flags.length > 0,
      parsed: parseInstrument(trade.instrument_name || ''),
    };
  }, []);

  // Handle WS messages
  const handleWsMessage = useCallback((data) => {
    if (data.error) {
      console.error('API Error:', data.error);
      setError(data.error.message || 'API Error');
      setLoading(false);
      return;
    }

    const result = data.result;
    if (!result) return;

    if (result.trades) {
      const analyzedTrades = result.trades.map(trade => analyzeTrade(trade));
      
      analyzedTrades.sort((a, b) => {
        if (a.isUnusual && !b.isUnusual) return -1;
        if (!a.isUnusual && b.isUnusual) return 1;
        return (b.timestamp || 0) - (a.timestamp || 0);
      });
      
      setTrades(analyzedTrades);
      setLastUpdate(new Date());
      setLoading(false);
    }

    if (result.mark_price || result.index_price) {
      const price = parseFloat(result.mark_price || result.index_price || 0);
      const change = parseFloat(result.stats?.price_change || 0);
      setSpotPrice({ price, change24h: change, loading: false });
    }
  }, [analyzeTrade]);

  // Send WS message
  const sendWsMessage = useCallback((method, params = {}) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) return null;
    
    const id = requestIdRef.current++;
    wsRef.current.send(JSON.stringify({ method, params, id, jsonrpc: '2.0' }));
    return id;
  }, []);

  // Fetch trade history
  const fetchTradeHistory = useCallback((currency, hours = 24) => {
    setLoading(true);
    const now = Date.now();
    const fromTime = now - hours * 60 * 60 * 1000;
    
    sendWsMessage('public/get_trade_history', {
      currency,
      instrument_type: 'option',
      from_timestamp: fromTime,
      to_timestamp: now,
      page_size: 100
    });
  }, [sendWsMessage]);

  // Fetch spot price
  const fetchSpotPrice = useCallback((currency) => {
    setSpotPrice(prev => ({ ...prev, loading: true }));
    sendWsMessage('public/get_ticker', { instrument_name: `${currency}-PERP` });
  }, [sendWsMessage]);

  // Connect WebSocket
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.close();
    }

    const ws = new WebSocket('wss://api.lyra.finance/ws');
    wsRef.current = ws;

    ws.onopen = () => {
      setWsConnected(true);
      setError(null);
    };

    ws.onmessage = (event) => {
      try {
        handleWsMessage(JSON.parse(event.data));
      } catch (e) {
        console.error('Parse error:', e);
      }
    };

    ws.onerror = () => {
      setError('WebSocket connection error');
      setWsConnected(false);
    };

    ws.onclose = () => {
      setWsConnected(false);
      setTimeout(() => {
        if (document.visibilityState !== 'hidden') connectWebSocket();
      }, 3000);
    };
  }, [handleWsMessage]);

  // Refresh
  const refreshData = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      fetchTradeHistory(selectedCurrency, filterTime);
      fetchSpotPrice(selectedCurrency);
    }
  }, [selectedCurrency, filterTime, fetchTradeHistory, fetchSpotPrice]);

  // Effects
  useEffect(() => {
    connectWebSocket();
    return () => wsRef.current?.close();
  }, [connectWebSocket]);

  useEffect(() => {
    if (wsConnected) {
      fetchTradeHistory(selectedCurrency, filterTime);
      fetchSpotPrice(selectedCurrency);
    }
  }, [selectedCurrency, filterTime, wsConnected, fetchTradeHistory, fetchSpotPrice]);

  useEffect(() => {
    const interval = setInterval(() => wsConnected && refreshData(), 60000);
    return () => clearInterval(interval);
  }, [wsConnected, refreshData]);

  useEffect(() => {
    const interval = setInterval(() => wsConnected && fetchSpotPrice(selectedCurrency), 10000);
    return () => clearInterval(interval);
  }, [wsConnected, selectedCurrency, fetchSpotPrice]);

  // Filter trades
  const filteredTrades = trades.filter(trade => {
    if (filterType !== 'all' && trade.parsed.type !== filterType) return false;
    if (trade.premium < filterPremium) return false;
    return true;
  });

  // Top 5 by quantity
  const top5Trades = [...trades]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  // Filtered stats
  const filteredStats = {
    total: filteredTrades.length,
    unusual: filteredTrades.filter(t => t.isUnusual).length,
    totalPremium: filteredTrades.reduce((sum, t) => sum + t.premium, 0),
  };

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
            <div style={{ ...styles.statusDot, background: wsConnected ? '#00ff88' : '#ff4444' }} />
            {wsConnected ? '연결됨' : '연결 중...'}
          </div>
        </div>
        <div style={styles.controls}>
          <div style={styles.priceBox}>
            <div>
              <div style={styles.priceLabel}>{selectedCurrency} 현재가</div>
              <div style={styles.priceValue}>
                {spotPrice.loading ? '...' : formatPrice(spotPrice.price)}
              </div>
            </div>
            {!spotPrice.loading && spotPrice.change24h !== 0 && (
              <div style={{ ...styles.priceChange, color: spotPrice.change24h >= 0 ? '#00ff88' : '#ff4444' }}>
                {spotPrice.change24h >= 0 ? '▲' : '▼'} {Math.abs(spotPrice.change24h).toFixed(2)}%
              </div>
            )}
          </div>
          
          <select style={styles.select} value={selectedCurrency} onChange={(e) => setSelectedCurrency(e.target.value)}>
            <option value="ETH">ETH Options</option>
            <option value="BTC">BTC Options</option>
            <option value="SOL">SOL Options</option>
          </select>
          <button style={styles.button} onClick={refreshData} disabled={loading || !wsConnected}>
            {loading ? '로딩...' : '↻ 새로고침'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && <div style={styles.error}>⚠️ {error}</div>}

      {/* Explanation Box */}
      <div style={styles.explanationBox}>
        <div style={styles.explanationHeader} onClick={() => setExplanationOpen(!explanationOpen)}>
          <div style={styles.explanationTitle}>
            📚 용어 설명
          </div>
          <div style={styles.explanationToggle}>
            {explanationOpen ? '▲ 접기' : '▼ 펼치기'}
          </div>
        </div>
        {explanationOpen && (
          <div style={styles.explanationContent}>
            {EXPLANATIONS.map((item, idx) => (
              <div key={idx} style={{ ...styles.explanationItem, borderBottom: idx === EXPLANATIONS.length - 1 ? 'none' : '1px solid #111' }}>
                <div style={styles.explanationTerm}>{item.term}</div>
                <div style={styles.explanationDesc}>{item.desc}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filters */}
      <div style={styles.filtersContainer}>
        <div style={styles.filterGroup}>
          <span style={styles.filterLabel}>타입:</span>
          <select style={styles.filterSelect} value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            {TYPE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div style={styles.filterGroup}>
          <span style={styles.filterLabel}>프리미엄:</span>
          <select style={styles.filterSelect} value={filterPremium} onChange={(e) => setFilterPremium(Number(e.target.value))}>
            {PREMIUM_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div style={styles.filterGroup}>
          <span style={styles.filterLabel}>기간:</span>
          <select style={styles.filterSelect} value={filterTime} onChange={(e) => setFilterTime(Number(e.target.value))}>
            {TIME_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Top 5 */}
      {top5Trades.length > 0 && (
        <div style={styles.top5Container}>
          <div style={styles.top5Title}>
            🏆 Top 5 거래량 ({selectedCurrency})
          </div>
          <div style={styles.top5Grid}>
            {top5Trades.map((trade, idx) => (
              <div key={trade.trade_id || idx} style={styles.top5Card}>
                <div style={styles.top5Rank}>#{idx + 1}</div>
                <div style={styles.top5Instrument}>{trade.instrument_name}</div>
                <div style={styles.top5Amount}>{trade.amount.toFixed(2)}</div>
                <div style={styles.top5Premium}>{formatNumber(trade.premium)}</div>
                <span style={{ ...styles.tag, ...(trade.parsed.type === 'CALL' ? styles.callTag : styles.putTag) }}>
                  {trade.parsed.type || '-'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>총 거래 ({filterTime}시간)</div>
          <div style={styles.statValue}>{filteredStats.total}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>이상 거래</div>
          <div style={{ ...styles.statValue, color: '#00ff88' }}>{filteredStats.unusual}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>총 프리미엄</div>
          <div style={styles.statValue}>{formatNumber(filteredStats.totalPremium)}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>감지 기준</div>
          <div style={styles.statValue}>{formatNumber(THRESHOLDS.minPremiumUSD)}</div>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        {loading && filteredTrades.length === 0 ? (
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
              {filteredTrades.map((trade, idx) => (
                <tr key={trade.trade_id || idx} style={trade.isUnusual ? styles.unusualRow : {}}>
                  <td style={styles.td}>
                    <span style={styles.timestamp}>{formatTime(trade.timestamp)}</span>
                  </td>
                  <td style={styles.td}>
                    <code style={{ color: '#00d4ff' }}>{trade.instrument_name}</code>
                  </td>
                  <td style={styles.td}>
                    <span style={{ ...styles.tag, ...(trade.parsed.type === 'CALL' ? styles.callTag : styles.putTag) }}>
                      {trade.parsed.type || '-'}
                    </span>
                  </td>
                  <td style={styles.td}>${trade.parsed.strike || '-'}</td>
                  <td style={styles.td}>{trade.parsed.expiry || '-'}</td>
                  <td style={styles.td}>{trade.amount.toFixed(2)}</td>
                  <td style={styles.td}>${parseFloat(trade.trade_price || trade.price || 0).toFixed(2)}</td>
                  <td style={{ ...styles.td, fontWeight: trade.isUnusual ? '600' : '400' }}>
                    {formatNumber(trade.premium)}
                  </td>
                  <td style={styles.td}>
                    {trade.flags.map((flag, i) => (
                      <span key={i} style={{ ...styles.tag, ...styles.flagTag }}>{flag.label}</span>
                    ))}
                  </td>
                </tr>
              ))}
              {filteredTrades.length === 0 && !loading && (
                <tr>
                  <td colSpan="9" style={{ ...styles.td, textAlign: 'center', color: '#666' }}>
                    조건에 맞는 거래가 없습니다
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
