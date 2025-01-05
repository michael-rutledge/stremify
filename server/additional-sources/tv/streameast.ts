import { BrowserScraper } from "~/additional-sources/browser_scraper"
import * as cheerio from 'cheerio';


// Different id prefixes are required for each sport catalog.
export const streameastIdPrefix = "streameast:"
export function streameastSportIdPrefix(sport: string) {
    return `${streameastIdPrefix}${sport}:`
}

const streameastUrlPrefix = 'https://www.streameast.gd'

// Catalogs for each sport.
export const streameast_nba_catalog = [
    {
        "id": "streameast_nba_catalog",
        "type": "tv",
        "name": "Streameast - NBA",
        "idPrefixes": [streameastSportIdPrefix('nba')],
    }
]
export const streameast_nfl_catalog = [
    {
        "id": "streameast_nfl_catalog",
        "type": "tv",
        "name": "Streameast - NFL",
        "idPrefixes": [streameastSportIdPrefix('nfl')],
    }
]

// Returns the game id stripped from the given game link.
function getGameIdFromLink(gameLink) {
    const tokens = gameLink.split('/')
    return tokens[tokens.length - 1]
}

// Returns the first available team photo for the catalog entry.
function getFirstTeamPhoto(gameTitle, $teamEntries) {
    const teamNames = gameTitle.split(' vs ')

    if (!teamNames || teamNames.length < 1) {
        return null
    }

    // Only the first team in title will be matched, for consistency.
    const teamName = teamNames[0]
    for (const $teamEntry of $teamEntries) {
        const teamEntryName = $teamEntry('a span.d-md-inline').text().trim()
        if (teamName.includes(teamEntryName)) {
            return $teamEntry('a img').attr('src')
        }
    }

    return null
}

// Returns a cheerioed game response from the given gameLink.
async function $getGameResponse(gameLink) {
    const gameResponse = await fetch(gameLink)
    const gameResponseText = await gameResponse.text()
    return cheerio.load(gameResponseText)
}

// Returns streameast catalog metas for the given sport id.
export async function getCatalogStreameast(sport) {
    const finalLinks = {"metas": []}

    try {
        // Load the root page for the given sport.
        const listingResponse = await fetch(`${streameastUrlPrefix}/${sport}-streams`)
        const listingText = await listingResponse.text()
        const $ = cheerio.load(listingText)

        // Store team entries which can be used for game poster calculation.
        const teamEntries = $('div.col-lg-3 ul#GelecekMaclar li')
        let $teamEntries = []
        for (const teamEntry of teamEntries) {
            const $teamEntry = cheerio.load($(teamEntry).html())
            $teamEntries.push($teamEntry)
        }

        // Iterate through the game entries and store them to be returned.
        const gameEntries = $('div.col-lg-9 ul#GelecekMaclar li')
        for (const gameEntry of gameEntries) {
            const $gameEntry = cheerio.load($(gameEntry).html())
            const gameLink = $gameEntry('a').attr('href')
            const gameTitle = $gameEntry('a span.d-md-inline').text().trim()
            const gameId = getGameIdFromLink(gameLink)
            console.log(`Added gameid: ${gameId}`)

            finalLinks.metas.push({
                'id': `${streameastSportIdPrefix(sport)}${gameId}`,
                'type': 'tv',
                'name': gameTitle,
                'poster': getFirstTeamPhoto(gameTitle, $teamEntries),
                'posterShape': 'square',
            })
        }
    } catch (err) {
        console.log(`Error in streameast ${sport} catalog: ${err.message}`)
    } finally {
        return finalLinks
    }
}


// Scrapes streameast for streams according to the given ID.
export async function scrapeStreameast(id) {
    console.log(`Scraping streameast for ${id}...`)
    let streams = []

    // Return early if not a streameast id.
    if (!id.startsWith(streameastIdPrefix)) {
        console.log(`Returning early for bad streameast id.`)
        return streams
    }

    // Create the BrowserScraper.
    let browserScraper = new BrowserScraper(
        /*provider=*/'streameast',
        /*streamRegex=*//^https:\/\/.*\.m3u8$/,
        // All URLs allowed for now.
        /*urlRegexesAllowed=*/[/.*/],
        /*urlRegexesDenied=*/[])

    // Load the game from its id.
    const gameId = id.split(':')[2]
    const gameLink = `${streameastUrlPrefix}/game/useless_arg/${gameId}`

    // TODO: implement actual scraping.
    console.log(`Would have scraped ${gameLink}`)

    try {
        await browserScraper.init()
    } catch (err) {
        console.log(`Streameast scrape failed unexpectedly: ${err.message}`)
    } finally {
        await browserScraper.close()
        return streams
    }

}