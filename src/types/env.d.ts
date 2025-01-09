declare global {
    namespace NodeJS {
        interface ProcessEnv {
            NODE_ENV: "development" | "production" | "test"
            DATABASE_URL: string
            DATABASE_NAME: string
            DISCORD_TOKEN: string
            OSU_REDIRECT_URL: string
            OSU_ID: number
            OSU_CLIENT_SECRET: string
            PORT: number
            PREFIX: string
            LOG_GUILD: string
            LOG_CHANNEL: string
            APPLICATION_ID: string
            DIFFICULTY_EMOTES_SERVER: string
            ASSETS_PATH: string
            PERFORMANCE_CALCULATOR: string
            BEATMAP_CACHE: string
            DISABLE_TRACKING?: number
            PREFIX_FORCE?: string
        }
    }
}

export { }