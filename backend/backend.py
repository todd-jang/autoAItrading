# 파일명: backend.py
# 이 코드는 Flask를 사용하여 AI 트레이더의 백엔드 API를 구축합니다.
# 모든 핵심 로직과 AI 모델 추론은 여기서 처리됩니다.

from flask import Flask, jsonify, request
import time
import random
import json

# Flask 애플리케이션 초기화
app = Flask(__name__)

#-------------------------------------------------------------------------------------
# AI 트레이딩 로직 (이전 예시에서 가져옴)
#-------------------------------------------------------------------------------------

def determine_trading_action(
    close_price: float,
    moving_average: float,
    rsi_value: float,
    rsi_overbought_threshold: int = 70,
    rsi_oversold_threshold: int = 30
) -> str:
    """
    주어진 기술 지표를 기반으로 매수(BUY), 매도(SELL), 또는 유지(HOLD)를 결정합니다.
    이 함수는 백엔드에서만 실행되며, 프런트엔드는 이 함수의 결과만 받습니다.
    """
    if close_price > moving_average and rsi_value < rsi_oversold_threshold:
        return 'BUY'
    elif close_price < moving_average and rsi_value > rsi_overbought_threshold:
        return 'SELL'
    else:
        return 'HOLD'

#-------------------------------------------------------------------------------------
# 가상의 Gemini API 호출 및 백테스팅 로직
#-------------------------------------------------------------------------------------

def simulate_gemini_api_call(prompt):
    """
    실제 Gemini API 호출을 시뮬레이션합니다.
    Gemini는 시장 펀더멘털과 구글 트렌드를 분석하여 헷징 전략을 제공합니다.
    """
    # 응답을 시뮬레이션하기 위해 잠시 지연시킵니다.
    time.sleep(2)
    
    # 딥시크의 헷징 전략 조언을 모의로 반환합니다.
    mock_response = {
        "recommendation": "partial_hedge",
        "confidence": random.uniform(0.7, 0.95),
        "reasoning": "최근 긍정적인 기술 뉴스가 있었지만, 시장 트렌드 검색량 감소로 인해 부분적인 헷징이 필요합니다."
    }
    return mock_response

#-------------------------------------------------------------------------------------
# REST API 엔드포인트 정의
#-------------------------------------------------------------------------------------

@app.route('/api/trade-decision', methods=['POST'])
def trade_decision():
    """
    실시간 거래 결정을 제공하는 API 엔드포인트입니다.
    프런트엔드로부터 기술 지표를 받아 매매 결정을 반환합니다.
    """
    data = request.json
    if not data:
        return jsonify({"error": "No JSON data provided"}), 400

    close_price = data.get('close_price')
    moving_average = data.get('moving_average')
    rsi_value = data.get('rsi_value')

    if None in [close_price, moving_average, rsi_value]:
        return jsonify({"error": "Missing required parameters"}), 400
    
    action = determine_trading_action(close_price, moving_average, rsi_value)
    
    # AI 모델의 소프트맥스 분류 결과(가상)를 포함시킵니다.
    probabilities = { 'BUY': 0, 'SELL': 0, 'HOLD': 0 }
    if action == 'BUY':
        probabilities['BUY'] = 0.8
    elif action == 'SELL':
        probabilities['SELL'] = 0.8
    else:
        probabilities['HOLD'] = 0.9

    response = {
        "action": action,
        "confidence": probabilities[action]
    }
    return jsonify(response)

@app.route('/api/backtest', methods=['POST'])
def backtest():
    """
    백테스팅을 실행하고 결과를 제공하는 API 엔드포인트입니다.
    """
    data = request.json
    if not data or 'ticker' not in data:
        return jsonify({"error": "Missing ticker parameter"}), 400

    ticker = data.get('ticker')
    
    # 가상의 프롬프트를 생성하여 Gemini API 호출을 시뮬레이션합니다.
    prompt = f"Analyze market data and trends for {ticker}..."
    result = simulate_gemini_api_call(prompt)
    
    return jsonify(result)

if __name__ == '__main__':
    # 개발 목적으로만 실행하며, 실제 환경에서는 Gunicorn 등의 WSGI 서버를 사용합니다.
    app.run(debug=True, port=5000)
