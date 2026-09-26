FROM node:20-alpine
WORKDIR /srv
COPY server.js .
ENV PORT=8080 DATA=/data APP=/app
EXPOSE 8080
CMD ["node","server.js"]
