FROM node:22-alpine
WORKDIR /app
RUN apk add --no-cache unzip
COPY Repere-projet-complet.zip /tmp/repere.zip
RUN unzip -q /tmp/repere.zip -d /tmp/repere && cp -a /tmp/repere/Repere-Partage/. /app/ && rm -rf /tmp/repere /tmp/repere.zip
ENV NODE_ENV=production
EXPOSE 10000
CMD ["npm", "run", "start:render"]
