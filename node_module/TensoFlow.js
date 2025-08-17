import React, { useState, useEffect, useRef } from 'react';
import * as tf from '@tensorflow/tfjs';

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
  const [chartData, setChartData] = useState([]);
  const [tradingData, setTradingData] = useState({ price: 0, ma: 0, rsi: 0 });

  const modelRef = useRef(null);
  const intervalRef = useRef(null);

  // TensorFlow.js 모델 생성 및 로드
  useEffect(() => {
    const createAndLoadModel = async () => {
      setStatusMessage('TensorFlow.js 모델을 로딩 중입니다...');
      // 시계열 분석을 모방한 간단한 모델을 생성합니다.
      // 입력: [이동 평균, RSI], 출력: [BUY, SELL, HOLD] 확률
      const model = tf.sequential();
      model.add(tf.layers.dense({ inputShape: [2], units: 32, activation: 'relu' }));
      model.add(tf.layers.dense({ units: 16, activation: 'relu' }));
      model.add(tf.layers.dense({ units: 3, activation: 'softmax' }));
      
      // 모델 컴파일
      model.compile({
        optimizer: tf.train.adam(),
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy'],
      });
      
      // 실제 학습 데이터가 없으므로 가상의 훈련된 가중치를 설정하여 시뮬레이션합니다.
      // 이는 .7 이상의 정확도를 가정하는 것입니다.
      const initialWeights = model.getWeights();
      const newWeights = initialWeights.map(w => tf.randomNormal(w.shape, 0, 0.1));
      model.setWeights(newWeights);

      modelRef.current = model;
      setStatusMessage('모델 로딩 완료! 시작 버튼을 눌러주세요.');
    };
    createAndLoadModel();

    // 컴포넌트 언마운트 시 인터벌 정리
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // 지표 계산 함수
  const calculateMA = (data) => {
    if (data.length < 10) return 0;
    const last10 = data.slice(-10);
    const sum = last10.reduce((acc, val) => acc + val.price, 0);
    return sum / 10;
  };

  const calculateRSI = (data) => {
    if (data.length < 15) return 50; // 초기 데이터 부족 시 50 반환
    const last14 = data.slice(-14);
    let gains = 0;
    let losses = 0;

    for (let i = 1; i < last14.length; i++) {
      const diff = last14[i].price - last14[i - 1].price;
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
  
  // TensorFlow.js를 이용한 매매 결정 함수
  const makeDecision = async (ma, rsi) => {
    if (!modelRef.current) return 'HOLD';
    
    const inputTensor = tf.tensor2d([[ma, rsi]]);
    
    // 모델 예측
    const prediction = modelRef.current.predict(inputTensor);
    const scores = prediction.dataSync();
    
    // 가장 높은 확률의 인덱스 찾기
    const decisionIndex = tf.argMax(prediction, 1).dataSync()[0];

    let action = 'HOLD';
    if (scores[0] > 0.7) { // BUY
        action = 'BUY';
    } else if (scores[1] > 0.7) { // SELL
        action = 'SELL';
    } else { // HOLD
        action = 'HOLD';
    }

    return action;
  };
  
  // 실시간 데이터 시뮬레이션
  const startTrading = () => {
    if (isTrading) {
      clearInterval(intervalRef.current);
      setIsTrading(false);
      setStatusMessage('트레이딩이 중단되었습니다.');
      return;
    }
    
    // 상태 초기화
    setChartData([]);
    setTradingData({ price: 0, ma: 0, rsi: 0 });
    setTradingAction('HOLD');
    
    setIsTrading(true);
    setStatusMessage('실시간 트레이딩 시작...');

    let currentPrice = 150.0;
    let time = 0;
    const newChartData = [];

    intervalRef.current = setInterval(async () => {
      // 야후 파이낸스 실시간 데이터 호출을 모의로 구현합니다.
      const priceChange = (Math.random() - 0.5) * 5;
      currentPrice += priceChange;
      
      const newData = { time, price: currentPrice };
      newChartData.push(newData);
      
      // 차트 데이터가 너무 많아지면 오래된 데이터 제거
      if (newChartData.length > 100) {
        newChartData.shift();
      }
      setChartData([...newChartData]);
      
      const ma = calculateMA(newChartData);
      const rsi = calculateRSI(newChartData);
      
      setTradingData({ price: currentPrice, ma, rsi });
      
      // 모델을 사용하여 매매 판단
      const decision = await makeDecision(ma, rsi);
      setTradingAction(decision);

      time += 1;
    }, 2000); // 2초마다 데이터 업데이트
  };
  
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
          AI 트레이딩 시뮬레이터
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
              (모델 예측)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
