FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package.json ./
COPY backend ./backend
COPY frontend ./frontend
COPY shared ./shared
COPY data/.gitkeep ./data/.gitkeep

EXPOSE 3000
CMD ["npm", "start"]
