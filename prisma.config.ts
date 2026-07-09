import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // `prisma migrate` / `prisma db push` use the direct (unpooled) connection.
    url: env("DATABASE_URL_UNPOOLED"),
  },
});
