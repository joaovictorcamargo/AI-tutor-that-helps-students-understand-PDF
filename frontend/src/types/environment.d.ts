declare global {
  namespace NodeJS {
    interface ProcessEnv {
      readonly NEXT_PUBLIC_API_URL: string
      readonly NEXTAUTH_SECRET: string
      readonly NEXTAUTH_URL: string
      readonly DATABASE_URL: string
    }
  }
}

export {}
