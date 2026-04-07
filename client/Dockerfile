FROM denoland/deno:alpine-2.0.2
WORKDIR /app
COPY . .
RUN deno install --node-modules-dir=true --allow-scripts=npm:esbuild
RUN deno task build
ENV HOST=0.0.0.0
ENV PORT=4321
EXPOSE 4321
CMD ["deno", "run", "-A", "./dist/server/entry.mjs"]
