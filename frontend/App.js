import React, { useState, useEffect, useRef } from 'react';

// 구글 엔지니어링 원칙 적용:
// 1. 가독성: 컴포넌트, 함수, 변수명에 명확한 의미를 부여합니다.
// 2. 단순성: 각 함수는 단일 책임 원칙을 따릅니다.
// 3. 유지보수성: 상태 관리(useState)와 효과(useEffect)를 명확하게 분리합니다.

const App = () => {
  // 상태 변수 정의
  const [ticker, setTicker] = useState('AAPL');
  const [tradingAction, setTradingAction] = useState('HOLD');
  const [isTrading, setIsTrading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('시작 버튼을 눌러 트레이딩을 시작하세요.');
  const [tradingData, setTradingData] = useState({ price: 0, ma: 0, rsi: 0 });
  const [backtestResult, setBacktestResult] = useState(null);
  const [isBacktesting, setIsBacktesting] = useState(false);
  const [log, setLog] = useState([]);
  
  const intervalRef = useRef(null);

  // 백엔드 API URL
  const API_BASE_URL = 'http://localhost:5000/api';

  //-------------------------------------------------------------------------------------
  // 프런트엔드 로직 (이제 백엔드 API를 호출합니다)
  //-------------------------------------------------------------------------------------
  
  // 가상의 실시간 데이터(이제 프런트엔드에서만 관리)
  const [priceHistory, setPriceHistory] = useState([]);
  const calculateMA = (data) => {
      if (data.length < 10) return 0;
      const last10 = data.slice(-10);
      const sum = last10.reduce((acc, val) => acc + val, 0);
      return sum / 10;
  };

  const calculateRSI = (data) => {
      if (data.length < 15) return 50;
      const last14 = data.slice(-14);
      let gains = 0;
      let losses = 0;
      for (let i = 1; i < last14.length; i++) {
          const diff = last14[i] - last14[i-1];
          if (diff > 0) {
              gains += diff;
          } else {
              losses -= diff;
          }
      }
      const avgGain = gains / 14;
      const avgLoss = losses / 14;
      if (avgLoss === 0) return 100;
      const rs = avgGain / avgLoss;
      return 100 - (100 / (1 + rs));
  };
  
  // 실시간 트레이딩 시작 함수
  const startTrading = () => {
    if (isTrading) {
      clearInterval(intervalRef.current);
      setIsTrading(false);
      setStatusMessage('트레이딩이 중단되었습니다.');
      return;
    }
    
    setIsTrading(true);
    setStatusMessage('실시간 트레이딩 시작...');

    let currentPrice = 150.0;
    const newPriceHistory = [...priceHistory];

    intervalRef.current = setInterval(async () => {
      const priceChange = (Math.random() - 0.5) * 5;
      currentPrice += priceChange;
      newPriceHistory.push(currentPrice);
      
      if (newPriceHistory.length > 100) {
        newPriceHistory.shift();
      }
      setPriceHistory([...newPriceHistory]);

      const ma = calculateMA(newPriceHistory);
      const rsi = calculateRSI(newPriceHistory);
      setTradingData({ price: currentPrice, ma, rsi });

      // 백엔드 API 호출
      try {
        const response = await fetch(`${API_BASE_URL}/trade-decision`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ close_price: currentPrice, moving_average: ma, rsi_value: rsi })
        });
        
        if (!response.ok) {
          throw new Error('네트워크 응답이 올바르지 않습니다.');
        }

        const data = await response.json();
        setTradingAction(data.action);
        
      } catch (error) {
        console.error("API 호출 중 오류 발생:", error);
        setStatusMessage("API 연결 오류. 백엔드 서버를 확인하세요.");
        clearInterval(intervalRef.current);
        setIsTrading(false);
      }
    }, 2000);
  };
  
  // 백테스팅 실행 함수
  const runBacktest = async () => {
    setIsBacktesting(true);
    setBacktestResult(null);
    setLog([]);
    const newLog = [];

    newLog.push(`[${new Date().toLocaleTimeString()}] 백엔드에 백테스팅 요청...`);
    setLog([...newLog]);
    
    try {
      const response = await fetch(`${API_BASE_URL}/backtest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: ticker })
      });

      if (!response.ok) {
        throw new Error('네트워크 응답이 올바르지 않습니다.');
      }
      
      const result = await response.json();
      
      newLog.push(`[${new Date().toLocaleTimeString()}] 백엔드로부터 결과 수신 완료.`);
      setLog([...newLog]);
      
      setBacktestResult(result);

    } catch (error) {
      newLog.push(`[${new Date().toLocaleTimeString()}] 백엔드 API 호출 중 오류: ${error.message}`);
      setLog([...newLog]);
    }
    
    setIsBacktesting(false);
  };
  
  // 컴포넌트 언마운트 시 인터벌 정리
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);
  
  // UI 렌더링
  const getActionColor = () => {
    if (tradingAction === 'BUY') return 'text-green-500';
    if (tradingAction === 'SELL') return 'text-red-500';
    return 'text-gray-500';
  };
  
  return (
    <div className="bg-gray-900 text-white min-h-screen p-4 sm:p-8 flex flex-col items-center">
      <div className="w-full max-w-2xl bg-gray-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-center mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
          AI 트레이딩 시스템 (프런트엔드)
        </h1>
        
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <input
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            placeholder="종목 코드를 입력하세요 (예: AAPL)"
            className="flex-1 bg-gray-700 text-white placeholder-gray-400 border border-gray-600 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          />
          <button
            onClick={startTrading}
            className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold transition-all transform hover:scale-105 ${
              isTrading
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {isTrading ? '트레이딩 중단' : '트레이딩 시작'}
          </button>
        </div>

        <div className="mb-6 text-center text-sm sm:text-base font-semibold">
          <p className="text-gray-400">{statusMessage}</p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center">
          <div className="bg-gray-700 p-6 rounded-2xl shadow-inner">
            <h2 className="text-gray-300 text-lg sm:text-xl font-medium mb-2">현재 데이터</h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-white mb-1">
              {ticker.toUpperCase()}
            </p>
            <p className="text-xl sm:text-2xl text-blue-400">
              가격: ${tradingData.price.toFixed(2)}
            </p>
            <p className="text-base sm:text-lg text-gray-400">
              MA: {tradingData.ma.toFixed(2)} | RSI: {tradingData.rsi.toFixed(2)}
            </p>
          </div>

          <div className={`p-6 rounded-2xl shadow-inner transition-colors ${
            tradingAction === 'BUY' ? 'bg-green-800' :
            tradingAction === 'SELL' ? 'bg-red-800' :
            'bg-gray-700'
          }`}>
            <h2 className="text-gray-300 text-lg sm:text-xl font-medium mb-2">매매 결정</h2>
            <p className={`text-5xl sm:text-6xl font-black ${getActionColor()}`}>
              {tradingAction}
            </p>
            <p className="text-sm text-gray-400 mt-2">
              (백엔드 API)
            </p>
          </div>
        </div>

        <div className="mt-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4 text-teal-400">백테스팅</h2>
            <button
                onClick={runBacktest}
                disabled={isBacktesting}
                className={`w-full px-6 py-3 rounded-xl font-bold transition-all transform hover:scale-105 ${
                isBacktesting
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-teal-600 hover:bg-teal-700'
                }`}
            >
                {isBacktesting ? '분석 중...' : '백테스팅 실행'}
            </button>
        </div>

        {backtestResult && (
          <div className="mt-6 bg-gray-700 p-6 rounded-2xl mb-6 shadow-inner transition-opacity duration-500 opacity-100">
            <h2 className="text-xl sm:text-2xl font-bold text-teal-400 mb-4">분석 결과 (Gemini API)</h2>
            <p className="text-base sm:text-lg mb-2">
              <span className="font-semibold text-gray-300">추천 전략:</span> {backtestResult.recommendation}
            </p>
            <p className="text-base sm:text-lg mb-2">
              <span className="font-semibold text-gray-300">신뢰도:</span> {(backtestResult.confidence * 100).toFixed(0)}%
            </p>
            <p className="text-sm text-gray-400">
              <span className="font-semibold text-gray-300">근거:</span> {backtestResult.reasoning}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
