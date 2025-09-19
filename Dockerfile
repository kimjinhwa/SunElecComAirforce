FROM node:18.19 AS base 

# 시간대 설정
ENV TZ=Asia/Seoul
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone
# 빌드 도구 설치
RUN apt-get update && apt-get install -y python3 make g++ gcc

RUN corepack enable && corepack prepare pnpm@9.15.1 --activate

WORKDIR /src

FROM base AS development
COPY package.json ./
# 필요한 시스템 패키지 설치
RUN pnpm install
RUN npm install -g bcrypt
RUN npm install -g nodemon 
RUN apt-get install -y udev usbutils


# 의존성 설치 (캐시 최적화)
COPY package*.json ./

# 소스 코드 복사
COPY . .

CMD ["npm", "start"]