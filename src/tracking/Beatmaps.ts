import { Fetcher } from "@src/class/api/osu/Fetcher";
import { RulesetIds } from "@src/class/api/osu/types/MiscTypes";
import { Event, EventFactory, EventType } from "@src/class/database/Events";
import { Logger } from "@src/class/Logger";
import { TextRenderer } from "@src/class/renderer/Text";
import { HandleAsync } from "@src/Utils";
import { Channel, Client, EmbedBuilder, MessageCreateOptions } from "discord.js";


let fetcher: Fetcher

async function initFetcher() {
    if (!fetcher) fetcher = await Fetcher.Create(null)
}

export async function BeatmapTrackingLoop(client: Client) {
    await HandleAsync(initFetcher())


    const [events, eventsErr] = await HandleAsync(EventFactory.GetEvents([EventType.QualifiedBeatmaps, EventType.RankedBeatmaps]))
    if (eventsErr) {
        Logger.Error(eventsErr)
        return
    }

    const threads = [
        RunBeatmapType(events.find(e => e.name === EventType.QualifiedBeatmaps), "qualified", client),
        RunBeatmapType(events.find(e => e.name === EventType.RankedBeatmaps), "ranked", client)
    ]

    await Promise.all(threads)


}

async function RunBeatmapType(event: Event, type: string, client: Client) {
    const lastCheck = event.lastCheck

    const [maps, mapsErr] = await HandleAsync(fetcher.SearchBeatmaps({
        query: null,
        type: type,
        gamemode: null
    }))
    if (mapsErr) {
        Logger.Error(mapsErr)
        return
    }

    const newMaps = maps.beatmapsets.filter(el => el.RankedDate > lastCheck)
    if (!newMaps.length) return

    event.lastCheck = new Date(Math.max(...maps.beatmapsets.map(el => el.RankedDate.getTime())))
    await event.Save()

    Logger.Info(`Found ${newMaps.length} new ${type} beatmaps`)

    const channels = event.channels

    const rendered: [RulesetIds[], MessageCreateOptions][] = newMaps.map(map => {
        const data = {
            map: {
                ...map,
                url: map.Url,
                creator_url: map.CreatorUrl,
                length: map.beatmaps[0].Length.asTime(),
                drain: map.beatmaps[0].Drain.asTime(),
                bpm: map.beatmaps[0].bpm,
                download: map.Download,
                download_novid: map.DownloadNovid,
            },
            diffs: map.beatmaps.map(el => ({
                emoji: el.DifficultyEmoji,
                version: el.version,
                stars: el.difficulty_rating
            }))
        }
        const modes = new Set(map.beatmaps.map(b => b.mode_int))
        const description = TextRenderer.render("tracking/beatmap", data)
        const embed = new EmbedBuilder()
            .setDescription(description)
            .setAuthor({
                name: event.name == EventType.RankedBeatmaps ? "New Ranked Beatmaps" : "New Qualified Beatmaps"
            })
            .setThumbnail(map.BgPreview)
        return [[...modes], {
            embeds: [embed]
        }]
    })

    const promises = channels.map(async chnl => {
        const channel: Channel|null = client.channels.cache.get(chnl.id) ?? await client.channels.fetch(chnl.id).catch(err => {
            Logger.Error(err, chnl.id)
            return null
        })

        if (!channel) {
            Logger.Error("Channel not found", chnl.id)
        }

        if (!channel.isTextBased()) {
            console.error(channel.id, channel.name, "is not text based in", event.name)
            return
        }

        if (channel.isDMBased()) {
            console.error(channel.id, "is a dm in", event.name)
            return
        }

        if (!channel.permissionsFor(client.user).has("SendMessages")) {
            console.error(channel.id, "no SEND_MESSAGES perm in", event.name)
            return
        }

        const [_, err] = await HandleAsync(Promise.all(rendered.map(r => {
            const [modes, msg] = r
            if (chnl.modes.some((el: RulesetIds) => modes.includes(el))) {
                return channel.send(msg)
            }
                
        })))
        if (err) {
            Logger.Error(err)
        }
    })

    const [_, err] = await HandleAsync(Promise.all(promises))
    if (err) {
        Logger.Error(err)
    }


}