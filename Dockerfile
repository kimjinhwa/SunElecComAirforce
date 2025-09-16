FROM node:18.19

# 시간대 설정
ENV TZ=Asia/Seoul
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# RUN npm ci --only=production
# 필요한 시스템 패키지 설치

RUN apt-get update && apt-get install -y \
    udev \
    usbutils \
    && rm -rf /var/lib/apt/lists/* \
    && adduser node dialout

WORKDIR /src

COPY package* ./
RUN npm install && \
    npm install serialport && \
    npm install -g nodemon && \
    npm install jsmodbus

# RUN npm ci --only=production
RUN npm ci 

COPY . .

CMD ["npm", "start"]