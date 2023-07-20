import { Gamemode } from "./MiscTypes";

export namespace Endpoints {
    export const self = (Gamemode: Gamemode) => `/me/${Gamemode}`
    export const profile = (Gamemode: Gamemode, Username: string) => `/users/${Username}/${Gamemode}`
    export const userScores = (Id: number, Type: "best" | "recent" | "firsts" | "pinned") => `/users/${Id}/scores/${Type}`
}