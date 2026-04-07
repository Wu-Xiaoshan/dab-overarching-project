FROM denoland/deno:alpine-2.0.2
WORKDIR /app
COPY . .
RUN deno cache app-run.js
CMD ["run", "--allow-net", "--allow-env", "--watch", "app-run.js"]
