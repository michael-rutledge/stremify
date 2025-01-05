// UNUSED RIGHT NOW. PREFER STREAMEAST.

import { BrowserScraper } from "~/additional-sources/browser_scraper"
import * as cheerio from 'cheerio';


// No matter the sport, each bilasport catalog entry should have the same id prefix.
export const bilasportIdPrefix = "bilasport:"
const gameIdRegex = new RegExp('\/([0-9]+)')

const bilasportUrlPrefix = 'https://bilasports.org'

// Catalogs for each sport.
export const bilasport_nba_catalog = [
    {
        "id": "bilasport_nba_catalog",
        "type": "tv",
        "name": "Bilasport - NBA",
        "idPrefixes": [bilasportIdPrefix],
    }
]

// Returns the game id stripped from the given game link.
function getGameIdFromLink(gameLink) {
    const matches = gameIdRegex.exec(gameLink)

    // 2 matching groups are expected:
    //   1. leading slash + game id
    //   2. just game id
    if (!matches || matches.length < 2) {
        return null
    }

    return matches[1]
}

// Takes a cheerioed stream entry and returns the host link from it.
function getHostLinkFromStreamEntry($streamEntry) {
    const onClickFunction = $streamEntry.attr('onclick')
    return onClickFunction
}

// Returns a cheerioed game response from the given gameLink.
async function $getGameResponse(gameLink) {
    const gameResponse = await fetch(gameLink)
    const gameResponseText = await gameResponse.text()
    return cheerio.load(gameResponseText)
}

// Returns Bilasport catalog metas for the given sport id.
export async function getCatalogBilasport(sport) {
    const finalLinks = {"metas": []}

    try {
        // First, load the root page for the given sport.
        const listingResponse = await fetch(`${{bilasportUrlPrefix}}/${sport}`)
        const listingText = await listingResponse.text()
        const $ = cheerio.load(listingText)

        // Next, iterate through the game entries and store them to be returned.
        const gameEntries = $('div.col-lg-6')
        for (const gameEntry of gameEntries) {
            const $gameEntry = cheerio.load($(gameEntry).html())
            const gameLink = $gameEntry('a').attr('href')
            const gameTitle = $gameEntry('a').attr('title')
            const posterLink = $gameEntry('div.team img').attr('src')
            const gameId = getGameIdFromLink(gameLink)

            finalLinks.metas.push({
                'id': `${bilasportIdPrefix}${gameId}`,
                'type': 'tv',
                'name': gameTitle,
                'poster': posterLink,
                'posterShape': 'square',
            })
        }
    } catch (err) {
        console.log(`Error in bilasport ${sport} catalog: ${err.message}`)
    } finally {
        return finalLinks
    }
}


// Scrapes Bilasport for streams according to the given ID. Uses other scrapers internally based on
// links served within Bilasport, as Bilasport catalogs content but does not host anything itself.
//
// Supported scrapers so far are:
//   - streameast
//   - 1stream
export async function scrapeBilasport(id) {
    console.log(`Scraping bilasport for ${id}...`)
    // Return early if not a bilasport id.
    if (!id.startsWith(bilasportIdPrefix)) {
        console.log(`Returning early for bad id.`)
        return []
    }

    // Load the game from its id.
    const gameId = id.split(':')[1]
    const gameLink = `${bilasportUrlPrefix}/useless_arg/${gameId}`
    const $gameResponse = await $getGameResponse(gameLink)

    // For each host (up to a certain amount), create a BrowserScraper.
    const hostLinks = $gameResponse('#streams-table tbody tr a')
    for (const hostLink of hostLinks) {
        console.log(`streamEntry host? ${$gameResponse(hostLink).attr('href')}`)
    }

    // Run the BrowserScrapers.

    // Next, create the BrowserScraper.
    let streams = []
    let browserScraper = new BrowserScraper(
        /*provider=*/'bilasport',
        /*streamRegex=*//^https:\/\/.*\.m3u8$/,
        // All URLs allowed for now.
        /*urlRegexesAllowed=*/[/.*/],
        /*urlRegexesDenied=*/[])

    try {
        await browserScraper.init()
    } catch (err) {
        console.log(``)
    } finally {
        await browserScraper.close()
        return streams
    }

}