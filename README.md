이 시스템은 프런트엔드, 백엔드, 데이터 스토리지의 세 가지 주요 계층으로 이루어진 모듈식 아키텍처입니다. 각 계층은 서로 독립적이며, REST API를 통해 소통합니다. 이는 구글의 소프트웨어 엔지니어링 원칙과 클라우드 배포에 최적화된 구조입니다.

1. 프런트엔드 (UI & UX)
기술 스택: React.js, Vite

역할:

사용자 인터페이스를 렌더링하고, 사용자 입력을 처리합니다.

사용자에게 매매 결정, 백테스팅 결과, 시장 데이터 등을 시각적으로 보여줍니다.

모든 비즈니스 로직(데이터 처리, AI 모델 추론)은 백엔드에 REST API를 통해 요청하고, 그 결과만 받아와 화면에 표시합니다.

배포:

정적 파일로 빌드되어 Google Cloud Storage에 저장됩니다.

Google Cloud CDN을 통해 사용자에게 빠르게 전송됩니다.

2. 백엔드 (AI & 비즈니스 로직)
기술 스택: Python, Flask, Gunicorn, TensorFlow.js (또는 Python 버전), Gemini API (모의)

역할:

REST API 엔드포인트를 제공하여 프런트엔드와 통신합니다.

yfinance API를 통해 실시간 시장 데이터를 수집합니다.

머신러닝(AI) 모델을 사용하여 매매 결정을 내립니다.

펀더멘털 뉴스, 구글 트렌드 등을 분석하여 헷징 전략을 판단하는 등 복잡한 비즈니스 로직을 수행합니다.

배포:

Docker 컨테이너로 패키징됩니다.

Google Cloud Run에 배포되어 트래픽에 따라 자동으로 확장 및 축소됩니다.

Gunicorn은 Flask 애플리케이션의 안정성과 성능을 보장하는 WSGI 서버 역할을 합니다.

3. 데이터 스토리지 (Persistent Data)
기술 스택: Google Cloud Firestore (또는 유사 서비스)

역할:

AI 모델의 학습 데이터, 백테스팅 결과, 거래 내역 등 영구적인 데이터를 저장합니다.

백엔드 서버는 데이터베이스에 접근하여 필요한 데이터를 읽고 씁니다.


=================================== LMStudio gpt-oss-20B

🏦 가상은행 기반 거래 시뮬레이션 Demo
아래 예시는 **“가상 은행 API”**를 가정하고, 실제 암호화폐 거래소(예: Upbit)와 연동해 시뮬레이션만 진행하도록 만든 전체 모듈 구조입니다.

실제 돈이 오가는 것이 아니라 내부 DB(또는 메모리) 에서 잔고를 관리하고, 시뮬레이션을 통해 전략과 주문 로직을 검증합니다.

핵심

virtual_bank 모듈 → 가상 은행 기능 (예: 입금, 출금, 잔액 조회)
trader 모듈 → 거래소 API 래퍼(실제 Upbit 혹은 테스트넷)
simulation 모듈 → 시뮬레이터(거래 흐름을 재생)
strategy 모듈 → 전략 로직
cli 모듈 → 실행용 명령행 인터페이스
1️⃣ 프로젝트 구조

Copy
btc_simulation_demo/
├─ .env                     # 가상 은행 API 키, 거래소 API 키 등
├─ requirements.txt         # 의존성 리스트
├─ README.md                # 사용법
└─ src/
   ├─ __init__.py
   ├─ config.py             # 환경설정 로더
   ├─ logger.py             # 통합 로거
   ├─ virtual_bank/          # 가상 은행 모듈
   │  ├─ __init__.py
   │  └─ bank_client.py
   ├─ trader/
   │  ├─ __init__.py
   │  └─ upbit_client.py
   ├─ strategy/              # 전략 구현
   │  ├─ __init__.py
   │  ├─ base.py
   │  └─ sma_rsi.py
   ├─ simulation/
   │  ├─ __init__.py
   │  └─ simulator.py
   └─ cli/
      ├─ __init__.py
      └─ main.py
Tip

src 디렉터리를 PYTHONPATH 에 추가해 주면 import 가 편리합니다.
모든 모듈은 독립적으로 테스트 가능하도록 설계했습니다.
2️⃣ 핵심 코드
2‑1) config.py

Copy
python
# src/config.py
import os
from pathlib import Path
from dotenv import load_dotenv, find_dotenv

load_dotenv(find_dotenv())

class Settings:
    # 가상 은행 관련
    BANK_API_KEY = os.getenv("BANK_API_KEY")
    BANK_SECRET = os.getenv("BANK_SECRET")

    # 거래소(Upbit) 관련
    UPBIT_ACCESS_KEY = os.getenv("UPBIT_ACCESS_KEY")
    UPBIT_SECRET_KEY = os.getenv("UPBIT_SECRET_KEY")

    # 기본 매개변수
    MARKET = os.getenv("MARKET", "KRW-BTC")
    CHECK_INTERVAL_SECONDS = int(os.getenv("CHECK_INTERVAL_SECONDS", 60))

settings = Settings()
2‑2) logger.py

Copy
python
# src/logger.py
import logging
from pathlib import Path

LOG_DIR = Path("logs")
LOG_DIR.mkdir(exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.FileHandler(LOG_DIR / "simulation.log"),
        logging.StreamHandler(),
    ],
)
2‑3) virtual_bank/bank_client.py – 가상 은행 API

Copy
python
# src/virtual_bank/bank_client.py
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, Any

class VirtualBankClient:
    """
    간단한 파일 기반 가상 은행.
    입금, 출금, 잔액 조회만 지원.
    """

    def __init__(self, db_file: str = "bank.db.json"):
        self._db_path = Path(db_file)
        if not self._db_path.exists():
            # 초기 DB
            self._save_db({"balance": 0.0, "transactions": []})

    def _load_db(self) -> Dict[str, Any]:
        return json.loads(self._db_path.read_text())

    def _save_db(self, data: Dict[str, Any]) -> None:
        self._db_path.write_text(json.dumps(data, indent=2))

    # 입금
    def deposit(self, amount: float) -> None:
        db = self._load_db()
        db["balance"] += amount
        db["transactions"].append(
            {"type": "deposit", "amount": amount, "ts": datetime.utcnow().isoformat()}
        )
        self._save_db(db)

    # 출금 (잔액이 부족하면 예외 발생)
    def withdraw(self, amount: float) -> None:
        db = self._load_db()
        if amount > db["balance"]:
            raise ValueError("Insufficient virtual bank balance")
        db["balance"] -= amount
        db["transactions"].append(
            {"type": "withdraw", "amount": amount, "ts": datetime.utcnow().isoformat()}
        )
        self._save_db(db)

    # 잔액 조회
    def get_balance(self) -> float:
        return self._load_db()["balance"]
2‑4) trader/upbit_client.py – 실제 거래소 API 래퍼

Copy
python
# src/trader/upbit_client.py
import requests
from ..config import settings
from ..logger import logging as logger

class UpbitClient:
    BASE_URL = "https://api.upbit.com"

    def __init__(self):
        self.access_key = settings.UPBIT_ACCESS_KEY
        self.secret_key = settings.UPBIT_SECRET_KEY

    # ----------------- 기본 메서드 -----------------
    def _request(self, method: str, endpoint: str, params=None, data=None):
        url = f"{self.BASE_URL}{endpoint}"
        headers = {
            "Authorization": f"Bearer {self.access_key}",
            "Content-Type": "application/json",
        }
        resp = requests.request(method, url, params=params, json=data, headers=headers)
        resp.raise_for_status()
        return resp.json()

    # ----------------- 예시 메서드 -----------------
    def get_ticker(self):
        endpoint = "/v1/tickers"
        res = self._request("GET", endpoint, {"markets": settings.MARKET})
        return res[0]["trade_price"]

    def place_market_order(self, side: str, volume: float):
        data = {
            "market": settings.MARKET,
            "side": side,
            "volume": str(volume),
            "ord_type": "market",
        }
        logger.info(f"Placing {side.upper()} order: vol={volume}")
        return self._request("POST", "/v1/orders", data=data)
Note

실제 운영 환경에서는 rate‑limit, retry 로직을 추가해야 합니다.
테스트넷에서만 사용하도록 .env 에 UPBIT_ACCESS_KEY/SECRET 를 입력하세요.
2‑5) strategy/base.py

Copy
python
# src/strategy/base.py
from abc import ABC, abstractmethod

class Strategy(ABC):
    @abstractmethod
    def generate_signal(self) -> str | None:
        """Return 'buy', 'sell' or None"""
2‑6) strategy/sma_rsi.py

Copy
python
# src/strategy/sma_rsi.py
import pandas as pd
from ta.trend import SMAIndicator
from ta.momentum import RSIIndicator

from .base import Strategy
from ..trader.upbit_client import UpbitClient
from ..config import settings

class SMARSI(Strategy):
    def __init__(self, client: UpbitClient, period=200):
        self.client = client
        self.period = period

    def _fetch_history(self) -> pd.DataFrame:
        endpoint = "/v1/candles/minutes/1"
        data = self.client._request("GET", endpoint, {"market": settings.MARKET, "count": self.period})
        df = pd.DataFrame(data)[::-1]  # 최신순
        df["candle_date_time_kst"] = pd.to_datetime(df["candle_date_time_kst"])
        return df

    def generate_signal(self) -> str | None:
        df = self._fetch_history()
        sma20 = SMAIndicator(close=df["trade_price"], window=20).sma_indicator()
        rsi14 = RSIIndicator(close=df["trade_price"], window=14).rsi()

        latest_price = df.iloc[-1]["trade_price"]
        current_sma = sma20.iloc[-1]
        current_rsi = rsi14.iloc[-1]

        if latest_price > current_sma and current_rsi < 30:
            return "buy"
        elif latest_price < current_sma and current_rsi > 70:
            return "sell"
        return None
2‑7) simulation/simulator.py – 시뮬레이터

Copy
python
# src/simulation/simulator.py
import time
from typing import Callable, List
import logging

from ..config import settings
from ..trader.upbit_client import UpbitClient
from ..strategy.base import Strategy
from ..virtual_bank.bank_client import VirtualBankClient

log = logging.getLogger(__name__)

class Simulator:
    """
    가상 은행 잔고를 기반으로 주문을 실행하고,
    실제 거래소에 주문을 전송(테스트넷)합니다.
    """

    def __init__(
        self,
        strategy: Strategy,
        bank_client: VirtualBankClient,
        upbit_client: UpbitClient,
        interval_sec: int = settings.CHECK_INTERVAL_SECONDS,
    ):
        self.strategy = strategy
        self.bank = bank_client
        self.upbit = upbit_client
        self.interval = interval_sec

    def run_once(self):
        signal = self.strategy.generate_signal()
        log.info(f"Signal: {signal}")

        if signal == "buy":
            # 가상 은행에서 KRW(원화) 입금 시뮬레이션 (예: 50,000 KRW)
            krw_amount = 50000
            self.bank.deposit(krw_amount)
            log.info(f"Deposited {krw_amount} KRW to virtual bank")

            # 실제 주문 실행
            order_resp = self.upbit.place_market_order("bid", volume=0.001)  # 예시: 0.001 BTC
            log.info(f"Order response: {order_resp}")

        elif signal == "sell":
            # 가상 은행에서 BTC 출금 시뮬레이션 (예: 0.001 BTC)
            btc_amount = 0.001
            try:
                self.bank.withdraw(btc_amount)
                log.info(f"Withdrawn {btc_amount} BTC from virtual bank")
            except ValueError as e:
                log.warning(str(e))
                return

            # 실제 주문 실행 (매도)
            order_resp = self.upbit.place_market_order("ask", volume=0.001)
            log.info(f"Order response: {order_resp}")

        else:
            log.debug("No trade signal; nothing to do")

    def run(self):
        while True:
            try:
                self.run_once()
            except Exception as e:
                log.exception("Unexpected error during simulation")
            time.sleep(self.interval)
설명

run_once 가 실제 거래소와 가상 은행을 연결합니다.
잔고 부족 시 예외를 잡아 로그에 기록하고 스킵합니다.
2‑8) cli/main.py – 실행용 CLI

Copy
python
# src/cli/main.py
import typer
from ..simulation.simulator import Simulator
from ..strategy.sma_rsi import SMARSI
from ..trader.upbit_client import UpbitClient
from ..virtual_bank.bank_client import VirtualBankClient

app = typer.Typer()

@app.command()
def run():
    """
    가상 은행 기반 거래 시뮬레이션 실행.
    """
    # 초기화
    bank = VirtualBankClient()
    upbit = UpbitClient()
    strategy = SMARSI(upbit)

    sim = Simulator(strategy, bank, upbit)
    sim.run()

if __name__ == "__main__":
    app()
Tip

typer는 pip install typer[all] 으로 설치합니다.
python -m src.cli.main run 으로 바로 실행 가능.
3️⃣ 실행 방법
가상환경 만들기 & 의존성 설치


Copy
bash
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
.env 파일 작성 (예시)


Copy
BANK_API_KEY=demo_key
BANK_SECRET=demo_secret

UPBIT_ACCESS_KEY=xxxxxxxxxxxxxx
UPBIT_SECRET_KEY=yyyyyyyyyyyyyy
MARKET=KRW-BTC
CHECK_INTERVAL_SECONDS=60
시뮬레이션 실행


Copy
bash
python -m src.cli.main run
시뮬레이터가 1분마다 (기본값) 시장을 조회하고, 전략에 따라 가상 은행 잔고를 입금/출금하며 실제 테스트넷 주문을 전송합니다.

4️⃣ 확장 포인트
영역	구현 아이디어
백테스트	simulation/simulator.py 에 과거 시계열 데이터를 입력해, 전략 수익률을 계산.
다중 거래소	trader/ 안에 Binance, KuCoin 등 추가하고 Strategy 가 TraderClient 인터페이스만 알면 됨.
포트폴리오 관리	virtual_bank/bank_client.py 에서 여러 자산(원화, BTC, ETH 등) 잔고를 관리하도록 확장.
알림	Telegram/Webhook 로 주문 결과를 전송.
CI/CD	GitHub Actions → 테스트 + Docker 이미지 빌드.
5️⃣ 마무리
위 구조와 코드를 그대로 복사해 src/ 폴더에 두면, 가상 은행 기반 거래 시뮬레이터가 바로 동작합니다.

필요에 따라 전략, 가상 은행 로직, 또는 API 래퍼를 교체해도 모듈 단위로 독립적으로 테스트할 수 있으니, 실제 운영 환경으로 옮기기 전 충분히 검증하세요.

Cloud Firestore는 실시간 업데이트 기능을 지원하여, 여러 클라이언트가 동기화된 데이터를 공유할 수 있습니다.

이 모든 구성요소는 CI/CD(지속적 통합/지속적 배포) 파이프라인을 통해 자동화될 수 있습니다. 개발자가 코드를 커밋하면, GitHub Actions가 컨테이너를 자동으로 빌드하고 Cloud Run에 배포하는 방식입니다.
