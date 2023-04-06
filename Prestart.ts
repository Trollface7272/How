import { config } from "dotenv"
export const Prestart = () => {
    config({
        path: "/.env.development"
    })
}