# frontend/Dockerfile
# 이 파일은 React/Vite 프런트엔드 애플리케이션을 위한 컨테이너 이미지를 빌드합니다.

# 1. Node.js 18 버전을 기반 이미지로 사용합니다.
FROM node:18-slim

# 2. 작업 디렉토리를 /app으로 설정합니다.
WORKDIR /app

# 3. package.json과 package-lock.json 파일을 복사합니다.
#    이는 종속성 설치를 위해 필요합니다.
COPY package*.json ./

# 4. Node.js 종속성을 설치합니다.
RUN npm install

# 5. 모든 소스 코드를 컨테이너의 /app 디렉토리로 복사합니다.
COPY . .

# 6. Vite 개발 서버의 기본 포트인 3000번 포트를 노출합니다.
EXPOSE 3000

# 7. 컨테이너가 시작될 때 Vite 개발 서버를 실행합니다.
#    --host: 0.0.0.0은 컨테이너 외부에서 접근 가능하도록 합니다.
CMD ["npm", "run", "dev", "--", "--host"]
