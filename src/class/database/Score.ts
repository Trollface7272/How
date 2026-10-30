import { Document, Filter, ObjectId, Sort } from "mongodb";
import { db } from "./Main";

interface altPpValues {
    aim: number
    speed: number
    accuracy: number
    flashlight: number
    effective_miss_count: number
    pp: number
    [key: string]: number
}

interface altDifficulty {
    star_rating: number
    max_combo: number
    aim_difficulty: number
    speed_difficulty: number
    speed_note_count: number
    flashlight_difficulty: number
    slider_factor: number
    approach_rate: number
    overall_difficulty: number
    [key: string]: number
}

class AltPp {
    difficulty: altDifficulty
    normal: altPpValues
    fc: altPpValues
    ss: altPpValues

    difference: number

    name: string
    version: string

    constructor(altPp: AltPp) {
        Object.assign(this, altPp)
    }

}

export class ScoreBeatmap {
    id: number
    setId: number

    mods: string[]
    modsRaw: number
    approved: -2|-1|0|1|2|3|4
    submitted: Date
    updated: Date
    ranked: Date
    artist: string
    bpm: number
    mapper: string
    mapperId: number
    source: string
    title: string
    version: string
    md5: string
    mode: 0|1|2|3
    tags: string
    favourites: number
    rating: number
    playcount: number
    pascount: number
    storyboard: boolean
    video: boolean
    downloadAvailable: boolean
    audioAvailable: boolean
    packId: string
    genreId: number
    languageId: number

    objects: {
        circles: number
        sliders: number
        spinners: number
    }

    difficulty: {
        stars: {
            total: number
            aim: number
            speed: number
            fl: number
            sliderFactor: number
            speedNoteCount: number
        }
        combo: number
        ar: number
        originalAr: number
        od: number
        originalOd: number
        cs: number
        originalCs: number
        hp: number
        originalHp: number
    }

    length: {
        total: number
        drain: number
    }

    get url() {
        return `https://osu.ppy.sh/b/${this.id}`
    }
    constructor(beatmap?: Document) {
        if (!beatmap) return
        // `url` is a getter. Documents saved from a class instance can still
        // carry it as data, and Object.assign would throw.
        const { url: _url, ...rest } = beatmap as Document & { url?: string }
        Object.assign(this, rest)
    }
}

export class Score {
    public _id: ObjectId

    beatmap: ScoreBeatmap
    userId: number
    accuracy: number
    combo: number

    counts : {
        "50": number
        "100": number
        "300": number
        misses: number
    }
    hasReplay: boolean

    mods : string[]
    modsRaw: number
    perfect: boolean
    pp: number
    rank: string
    score: number
    setAt: Date
    fcPp: number
    ssPp: number

    ppVer: string
    altPp: {[key: string]: AltPp}

    get improvedPp() {
        if (!this.fcPp && !this.ssPp) return this.pp
        return this.isFullCombo ? this.fcPp : this.ssPp
    }

    get objects() {
        return this.beatmap.objects.circles + this.beatmap.objects.sliders + this.beatmap.objects.spinners
    }

    get isFullCombo() {
        if (this.counts.misses > 0) return false

        const diff = this.beatmap.difficulty.combo - this.combo
        if (diff === 0) return true

        const countNonPerfect = this.counts[50] + this.counts[100]
        if (countNonPerfect < diff) return false
        
        if (diff > this.objects * 0.05) return false

        return true
    }

    constructor(score?: Document) {
        Object.assign(this, score)
        this.beatmap = new ScoreBeatmap(score.beatmap)
        Object.keys(this.altPp ?? []).forEach(key => {
            this.altPp[key] = new AltPp(this.altPp[key])
        })
    }

    public async Save() {
        return db.collection("scores").updateOne({
            _id: this._id
        }, {
            $set: {
                beatmap: this.beatmap,
                userId: this.userId,
                accuracy: this.accuracy,
                combo: this.combo,
                counts: this.counts,
                hasReplay: this.hasReplay,
                mods: this.mods,
                modsRaw: this.modsRaw,
                perfect: this.perfect,
                pp: this.pp,
                rank: this.rank,
                score: this.score,
                setAt: this.setAt,
                fcPp: this.fcPp,
                ssPp: this.ssPp
            }
        }, { upsert: true })
    }
}

export class ScoreQueryResult {
    public scores: Score[]
    public total: number
    public randomOffset: number
    constructor(scores: Score[], total: number, randomOffset?: number) {
        this.scores = scores
        this.total = total
        this.randomOffset = randomOffset
    }

}

class cScoreFactory {
    constructor() { }
    public async GetScoresByUser(userId: number, filters: Filter<Score>, sort: Sort, limit: number, offset: number, Random: boolean): Promise<ScoreQueryResult> {
        const query: Filter<Document> = { ...filters }
        if (userId !== -1) query.userId = userId
        return this.GetAllScores(query, sort, limit, offset, Random)
    }
    public async GetAllScores(filters: Filter<Score>, sort: Sort, limit: number, offset: number, Random: boolean): Promise<ScoreQueryResult> {
        if (Random) {
            const cursor = db.collection("scores").find(filters).sort(sort).limit(limit)
            const count = await db.collection("scores").countDocuments(filters)
            const rand = Math.floor(Math.random() * count)
            const query = cursor.skip(rand).toArray()
            return new ScoreQueryResult((await query).map(score => new Score(score)), count, rand)
        }

        const cursor = db.collection("scores").find(filters).sort(sort).limit(limit).skip(offset).toArray()
        const count = db.collection("scores").countDocuments(filters)
        return new ScoreQueryResult((await cursor).map(score => new Score(score)), await count)
    }
}

export const ScoreFactory = new cScoreFactory()