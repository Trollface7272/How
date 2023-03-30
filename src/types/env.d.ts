declare global {
    namespace NodeJS {
        interface ProcessEnv {
            NODE_ENV: "development" | "production" | "test"
            DATABASE_URL: string
            DISCORD_TOKEN: string
            OSU_REDDIRECT_URL: string
            OSU_ID: number
            OSU_CLIENT_SECRET: string
            PORT: number
            PREFIX: string
            LOG_GUILD: string
            LOG_CHANNEL: string
            APPLICATION_ID: string
            DIFFICULTY_EMOTES_SERVER: string
        }
    }
}

export { }