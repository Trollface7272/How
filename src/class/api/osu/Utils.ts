import { createWriteStream } from "fs"
import { BitModsShort } from "./Consts"
import axios from "axios"
import { Logger } from "@src/class/Logger"

export const toBitMods = (mods: string[]) => {
  if (typeof mods !== "object") return mods
  let bit = 0
  for (const mod of mods) {
    bit |= BitModsShort[mod]
  }
  return bit
}

export const Clamp = (num: number, min: number, max: number) => {
  return Math.min(Math.max(num, min), max)
}

const downloading: { url: string, hasFinished: Promise<unknown> }[] = []
export const DownloadFile = async (url: string, path: string) => {
  const progress = downloading.find(el => el?.url === url)
  if (progress) return progress.hasFinished
  console.log(`Downloading -> ${url} -> ${path}`)
  const promise = new Promise(async (resolve, reject) => {
    try {
      const writer = createWriteStream(path)
      const resp = await axios.get(url, { responseType: "stream" })
      console.log(resp.headers)
      writer.on("finish", () => {
        delete downloading[downloading.findIndex(el => el?.url === url)]
        return resolve(true)
      })
      writer.on("error", (err) => {
        delete downloading[downloading.findIndex(el => el?.url === url)]
        Logger.Error(`Downloading file -> writer on error`)
        reject(err)
      })
      resp.data.pipe(writer)
    } catch (err) {
      Logger.Error(`Downloading file -> catch at bottom`)
      resolve(err)
    }
  })
  downloading.push({ url, hasFinished: promise })
  return promise
}

export const DisplayCombo = (combo: number, maxCombo: number, mode: number | string): string => {
  if (mode === 3 || mode === "mania") return `x${combo}`
  return `x${combo}/${maxCombo}`
}