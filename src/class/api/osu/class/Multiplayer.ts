import { Beatmap } from "./Beatmap"
import { Profile } from "./Profile"
import { Score } from "./Score"

export namespace Multiplayer {
    export class PlaylistItem {
        id: number
        room_id: number
        beatmap_id: number
        ruleset_id: 0 | 1 | 2 | 3
        allowed_mods: Score.BaseMod[]
        required_mods: Score.BaseMod[]
        expired: boolean
        owner_id: number
        playlist_order: unknown
        played_at: Date
        beatmap: Beatmap.Base

        constructor(data: PlaylistItem) {
            Object.assign(this, data)
            this.played_at = new Date(data.played_at)
            this.allowed_mods = this.allowed_mods.map(el => new Score.BaseMod(el))
            this.required_mods = this.required_mods.map(el => new Score.BaseMod(el))
            this.beatmap = new Beatmap.Base(data.beatmap, new Score.ModList(this.required_mods))
        }
    }
    export class GetRooms {
        id: number
        name: string
        category: string
        type: string
        user_id: number
        starts_at: Date
        ends_at: Date
        max_attempts: number
        participant_count: number
        channel_id: number
        active: boolean
        has_password: boolean
        queue_mode: string
        auto_skip: boolean
        current_playlist_item: PlaylistItem
        difficulty_range: {
            max: number
            min: number
        }
        host: Profile.Compact
        playlist_item_stats: {
            count_active: number
            count_total: number
            ruleset_ids: (0 | 1 | 2 | 3)[]
        }
        recent_participants: Profile.Compact[]

        constructor(data: GetRooms) {
            Object.assign(this, data)
            this.ends_at = new Date(data.ends_at)
            this.starts_at = new Date(data.starts_at)
            this.recent_participants = this.recent_participants.map(el => new Profile.Compact(el))
            this.host = new Profile.Compact(this.host)
            this.current_playlist_item = new PlaylistItem(data.current_playlist_item)
        }

    }

    export class GetPlaylistScores {
        params: {
            limit: number
            sort: string
        }
        scores: Score.MultiplayerScore[]
        total: number
        user_score?: Score.MultiplayerScore
        user: Profile.Compact
        position?: number
        cursor: {
            total_score: number,
            score_id: number
        }
        cursor_string: string

        constructor(data: GetPlaylistScores) {
            Object.assign(this, data)
            this.scores = this.scores.map(el => new Score.MultiplayerScore(el))
            this.user = new Profile.Compact(this.user)
            if (this.user_score) this.user_score = new Score.MultiplayerScore(this.user_score)
        } 
    }
}