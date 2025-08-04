import "dotenv/config.js"
import Fastify from "fastify"
import cors from "@fastify/cors"
import routes from "./routes/index.js"

const fastify = Fastify({
  logger: true,
  requestTimeout: 30_000,
  exposeHeadRoutes: true,
})

const port = parseInt(process.env.PORT || "3000", 10)

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean)

await fastify.register(cors, {
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) {
      cb(null, true)
    } else {
      cb(new Error(`CORS denied for origin: ${origin}`), false)
    }
  },
  credentials: true,
})

fastify.register(routes, { prefix: "/" })

fastify.listen({ port, host: "0.0.0.0" }, (err, address) => {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
  fastify.log.info(`🚀 Fastify is running at ${address}`)
})
