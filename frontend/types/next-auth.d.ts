import type { Session as NextAuthSession } from "next-auth"

declare module "next-auth" {
  interface Session extends NextAuthSession {
    accessToken: string
    user: {
      email: string
    }
  }
}
