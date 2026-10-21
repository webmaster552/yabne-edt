FROM node:22-alpine
WORKDIR /app
RUN apk add --no-cache unzip findutils
COPY Repere-projet-complet.zip /tmp/repere.zip
RUN unzip -q /tmp/repere.zip -d /tmp/repere \
 && ROOT="$(find /tmp/repere -type f -name package.json -printf '%h\\n' | head -n 1)" \
 && test -n "$ROOT" \
 && cp -a "$ROOT"/. /app/ \
 && rm -rf /tmp/repere /tmp/repere.zip
ENV NODE_ENV=production
EXPOSE 10000
CMD ["npm", "run", "start:render"]
