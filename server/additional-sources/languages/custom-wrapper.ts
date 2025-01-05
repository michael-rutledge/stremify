import { scrapeFrembed } from "./fr/frembed";
import { scrapeKinokiste } from "./de/kinokiste";
import { scrapeMeinecloud } from "./de/meinecloud";
import { scrapeEurostreaming } from "./it/eurostreaming";
import { scrapeGuardahd } from "./it/guardahd";
import { scrapeVerdahd } from './es/verhdlink'; 
import { scrapeCinehdplus } from './es/cinehdplus';
import { scrapeFrenchcloud } from "./fr/frenchcloud";
import { streameast_nba_catalog, streameast_nfl_catalog, streameastIdPrefix, streameastSportIdPrefix, getCatalogStreameast, scrapeStreameast } from "~/additional-sources/tv/streameast"
import { dramacoolMeta, dramacoolPrefix, dramacool_catalog, scrapeDramacool, scrapefromDramacoolCatalog, searchDramacool } from "./multilang/dramacool";
import { scrapeSmashystreamLang, scrapeSmashystreamOrg } from "./multilang/smashystream"
import { scrapeVidLink } from "./multilang/vidlink"
import { scrapeVidSrc } from "./multilang/vidsrc"
import { gogoanimeMeta, gogoanimePrefix, gogoanime_catalog, scrapeGogoanime, scrapefromGogoanimeCatalog, searchGogoanime } from "./multilang/gogoanime";
import { scrapeBuiltinMovie } from "~/routes/stream/movie/[id]";
import { scrapeBuiltinSeries } from "~/routes/stream/series/[id]";;

import { searchWecima, weCimaPrefix, getWecimaMeta, wecimaCatalogs, scrapeWecima } from "./ar/wecima";
import { scrapeVisioncine, searchVisioncine, visioncineCatalogs, visioncineMeta, visioncinePrefix } from "./pt-br/visioncine";

import 'dotenv/config'
import { getCache, setCache } from "~/functions/caching";
import { timeout } from "~/functions/built_in_wrapper";
import { Manifest } from "stremio-addon-sdk";
import { akwamCatalog, akwamPrefix, getAkwamMeta, scrapeAkwam, searchAkwam } from "./ar/akwam";
const disabled_providers = process.env.disabled_custom_providers || '';
const timeoutTime = parseInt(process.env.provider_timeout) || 10000;
const scrape_custom_providers = process.env.scrape_custom_providers || 'true';
const scrape_built_in = process.env.scrape_built_in || 'true';

const movies: Map<string, (imdbid: string, media?: any) => Promise<any>> = new Map([
    ["frembed", async (imdbid: string) => await scrapeFrembed(imdbid, 0, 0)],
    ["meinecloud", async (imdbid: string) => await scrapeMeinecloud(imdbid)],
    ["guardahd", async (imdbid: string) => await scrapeGuardahd(imdbid)],
    ["verhdlink", async (imdbid: string) => await scrapeVerdahd(imdbid)],
    ["frenchcloud", async (imdbid: string) => await scrapeFrenchcloud(imdbid)],
    //["smashystreamtr", async (imdbid: string) => await scrapeSmashystreamLang(imdbid, '0', '0', "Turkish")],
    //["smashystreamhi", async (imdbid: string) => await scrapeSmashystreamLang(imdbid, '0', '0', "Hindi")],
    ["dramacool_catalog", async (id: string) => await scrapefromDramacoolCatalog(id)],
    ["visioncine", async (id) => await scrapeVisioncine(id)],
    //["smashystream", async (imdbid: string) => await scrapeSmashystreamOrg(imdbid, '0', '0', 1)],
    ["vidlink", async (imdbid: string) => await scrapeVidLink(imdbid, '0', '0', 1)],
    ["vidsrc", async (imdbid: string) => await scrapeVidSrc(imdbid, '0', '0', 1)],
    ["wecima", async (id: string) => await scrapeWecima(id)],
    ["akwam", async (id: string) => await scrapeAkwam(id)],
    //["goquick", async (imdbid: string) => await scrapeGoquick(imdbid, 0, 0)],
]);

const series = new Map<string, (imdbid: string, season: string, episode: string, media?: any) => Promise<any>>([
    ["kinokiste", async (imdbid: string, season: string, episode: string) => await scrapeKinokiste(imdbid, season, episode)],
    ["cinehdplus", async (imdbid: string, season: string, episode: string) => await scrapeCinehdplus(imdbid, season, episode)],
    ["frembed", async (imdbid: string, season: string, episode: string) => await scrapeFrembed(imdbid, season, episode)],
    ["eurostreaming", async (imdbid: string, season: string, episode: string) => await scrapeEurostreaming(imdbid, season, episode)],
    ["dramacool", async (imdbid: string, season: string, episode: string, media?: any) => await scrapeDramacool(imdbid, season, episode, media)],
    //["smashystreamtr", async (imdbid: string, season: string, episode: string) => await scrapeSmashystreamLang(imdbid, season, episode, "Turkish")],
    //["smashystreamhi", async (imdbid: string, season: string, episode: string) => await scrapeSmashystreamLang(imdbid, season, episode, "Hindi")],
    ["gogoanime", async (id: string, season: string, episode: string, media?: any) => await scrapeGogoanime(id, season, episode, media)],
    ["dramacool_catalog", async (id: string) => await scrapefromDramacoolCatalog(id)],
    ["gogoanime_catalog", async (id: string) => await scrapefromGogoanimeCatalog(id)],
    ["wecima", async (id: string, season: string, episode: string, media?: any) => await scrapeWecima(id)],
    ["visioncine", async (id) => await scrapeVisioncine(id)],
    ["akwam", async (id: string) => await scrapeAkwam(id)],
    //["smashystream", async (imdbid: string, season: string, episode: string) => await scrapeSmashystreamOrg(imdbid, season, episode, 1)],
    ["vidlink", async (imdbid: string, season: string, episode: string) => await scrapeVidLink(imdbid, season, episode, 1)],
    ["vidsrc", async (imdbid: string, season: string, episode: string) => await scrapeVidSrc(imdbid, season, episode, 1)],
    //["goquick", async (imdbid: string, season: string, episode: string) => await scrapeGoquick(imdbid, season, episode)],
]);

const info = new Map<string, any>([
    ["frembed", {name: "FRembed", lang_emoji: "🇫🇷"}],
    ["frenchcloud", {name: "Frenchcloud", lang_emoji: "🇫🇷"}],
    ["meinecloud", {name: "Meinecloud", lang_emoji: "🇩🇪"}],
    ["kinokiste", {name: "Kinokiste", lang_emoji: "🇩🇪"}],
    ["cinehdplus", {name: "CineHDplus", lang_emoji: "🇪🇸🇲🇽"}],
    ["verhdlink", {name: "VerHDlink", lang_emoji: "🇪🇸🇲🇽"}],
    ["eurostreaming", {name: "EuroStreaming", lang_emoji: "🇮🇹"}],
    ["guardahd", {name: "GuardaHD", lang_emoji: "🇮🇹"}],
    //["smashystreamtr", {name: "Smashystream TR", lang_emoji: "🇹🇷"}],
    //["smashystreamhi", {name: "Smashystream HI", lang_emoji: "🇮🇳"}],
    ["vidlink", {name: "vidlink", lang_emoji: "🎥 🖥️"}],
    ["vidsrc", {name: "vidsrc", lang_emoji: "🎥 🖥️"}],
    ["visioncine", {name: "Visioncine (Catalog Resolver)", lang_emoji: "🇧🇷"}],
    ["wecima", {name: "WeCima (Catalog Resolver)", lang_emoji: "🇸🇦"}],
    ["akwam", {name: "Akwam (Catalog Resolver)", lang_emoji: "🇸🇦"}],
    //["smashystream", {name: "Smashystream", lang_emoji: "🎥"}],
    ["dramacool", {name: "DramaCool (TMDB/IMDB)", lang_emoji: "🎭"}],
    ["dramacool_catalog", {name: "DramaCool (Catalog Resolver)", lang_emoji: "🎭"}],
    ["gogoanime", {name: "GogoAnime (Kitsu)", lang_emoji: "🌸"}],
    ["gogoanime_catalog", {name: "GogoAnime (Catalog Resolver)", lang_emoji: "🌸"}],
    //["myfilestorage", {name: "Myfilestorage", lang_emoji: "🎥"}],
    //["goquick", {name: "GoQuick", lang_emoji: "🎥"}],
    //["moviesapi", {name: "MoviesAPI", lang_emoji: "🎥"}],
    ["streameast_nba_catalog", {name: "Streameast - NBA (Catalog Resolver + Bespoke Scraper)", lang_emoji: "🏀🖥️"}],
    ["streameast_nfl_catalog", {name: "Streameast - NFL (Catalog Resolver + Bespoke Scraper)", lang_emoji: "🏈🖥️"}],
]);

export const catalogFunctions = new Map<string, any>([
    // Streameast has a custom "sport" field that is set manually here.
    ["streameast_nba_catalog", async (mediaType: 'tv') => await getCatalogStreameast('nba')],
    ["streameast_nfl_catalog", async (mediaType: 'tv') => await getCatalogStreameast('nfl')],
]);

export const catalogSearchFunctions = new Map<string, any>([
    ["wecima", async (query: string, mediaType: 'movie' | 'series') => await searchWecima(query, mediaType)],
    ["dramacool_catalog", async (query: string) => await searchDramacool(query)],
    ["gogoanime_catalog", async (query: string) => await searchGogoanime(query)],
    ["visioncine", async (query: string, mediaType: 'movie' | 'series') => await searchVisioncine(query, mediaType)],
    ["akwam", async (query: string, mediaType: 'movie' | 'series') => await searchAkwam(query, mediaType)],
]);

export const catalogMetaFunctions = new Map<string, any>([
    ["wecima", async (id: string, mediaType: 'movie' | 'series') => await getWecimaMeta(id, mediaType)],
    ["dramacool_catalog", async (query: string, mediaType: 'movie' | 'series') => await dramacoolMeta(query, mediaType)],
    ["gogoanime_catalog", async (query: string, mediaType: 'movie' | 'series') => await gogoanimeMeta(query, mediaType)],
    ["visioncine", async (query: string, mediaType: 'movie' | 'series') => await visioncineMeta(query, mediaType)],
    ["akwam", async (query: string, mediaType: 'movie' | 'series') => await getAkwamMeta(query, mediaType)],
]);

export const catalogManifests = new Map<string, any>([
    ["wecima", {catalogs: wecimaCatalogs, prefix: weCimaPrefix}],
    ["dramacool_catalog", {catalogs: dramacool_catalog, prefix: dramacoolPrefix}],
    ["gogoanime_catalog", {catalogs: gogoanime_catalog, prefix: gogoanimePrefix}],
    ["visioncine", {catalogs: visioncineCatalogs, prefix: visioncinePrefix}],
    ["akwam", {catalogs: akwamCatalog, prefix: akwamPrefix}],
    ["streameast_nba_catalog", {catalogs: streameast_nba_catalog, prefix: streameastSportIdPrefix('nba')}],
    ["streameast_nfl_catalog", {catalogs: streameast_nfl_catalog, prefix: streameastSportIdPrefix('nfl')}],
]);

// Returns the relevant scraping function for the given arguments.
async function getScrapingFunction(source, id, episode) {
    // Any episode information denotes a series being requested.
    if (episode !== 0) {
        return await series.get(source)
    }

    // By default, return movie scraper function.
    return await movies.get(source)
}

export async function scrapeCustomProviders(list, id, season, episode, media? ) {
    console.log(`Scraping for: ${id}`)
    const output: any = {
        streams: []
    };
    let sourcelist: string[] = list.split(',')
    if (list.includes("built-in") && scrape_built_in == "true") {
        try {
            const streams = episode === 0 ? await scrapeBuiltinMovie(id) : await scrapeBuiltinSeries(`${id}:${season}:${episode}`)

            for (const stream of streams) {
                output.streams.push(stream)
            }
        } catch(err) {
            console.log(err)
        }
    }
    if (id.startsWith(streameastIdPrefix)) {
        console.log(`Overriding scrape for bespoke situation.`)
        return await scrapeStreameast(id)
    }
    const promises = sourcelist.map(async (source) => {
        const cached = await getCache(source, id, season, episode) 
        if (cached) { return cached; }
        try {
            return Promise.race([
                (async () => {
                    console.log(`Source checked: ${source}`)
                    if (source == "built-in" && scrape_built_in == "true") {} else if (disabled_providers.includes(source) != true && scrape_custom_providers == "true") {
                        try {
                            const scrapingFunction = await getScrapingFunction(source, id, episode)
                            if (typeof scrapingFunction === 'function') {
                                const mediaResults = await scrapingFunction(id, season, episode, media);
                                if (mediaResults != null && Array.isArray(mediaResults)) {
                                    for (let mediaResult of mediaResults) {
                                        output.streams.push(mediaResult)
                                    }
                                }
                            }
                            setCache(source, id, season, episode)
                        } catch (error) {
                            console.log(`Error in custom scraping function: ${error.message}`)
                            return null;
                        }
                    }
                })(),
                timeout(timeoutTime)
            ])
        } catch {
            return null;
        }
    })
    await Promise.all(promises)
    return (output)
}
export async function buildHTMLselectors() {
    let selector = ''
    if (scrape_built_in == "true") {
        selector = `${selector}       
            <input type="checkbox" id="built-in" name="built-in" value="built-in">
            <label for="built-in">🎥 Built-in Providers</label><br>`
    }
    info.forEach((value, key) => {
        if (disabled_providers.includes(key) != true && scrape_custom_providers == "true") {
            selector = `${selector}       
        <input type="checkbox" id="${key}" name="${key}" value="${key}">
        <label>${value.lang_emoji} ${value.name}</label><br>`
        }
    });
    return (`
        <h3>Configure</h3>
        <p>Any provider noted with 🖥️ uses a real Chrome browser to scrape.
        Browser scraping must be enabled in .env to use these providers.</p>
        <form id="language-form">
        ${selector}
    </form>`)
}

export async function buildManifest(manifest: string, providerlist) {
    let sourcelist: string[] = providerlist.split(',')

    const newManifest: Manifest = JSON.parse(manifest)

    let idPrefixes = []

    for (const source of sourcelist) {
        if (catalogManifests.get(source)) {
            const catalogs = catalogManifests.get(source).catalogs

            for (const catalog of catalogs) {
                newManifest.catalogs.push(catalog);
            }

            idPrefixes.push(catalogManifests.get(source).prefix);
        }
    }

    if (newManifest.catalogs.length != 0) {
        newManifest.resources.push('catalog')
        newManifest.resources.push({
            'name': 'meta',
            'types': ['movie', 'series'],
            idPrefixes
        })

        for (const prefix of idPrefixes) {
            newManifest.idPrefixes.push(prefix)
        }
    }

    return(newManifest)
}

// Handles home page browsing for featured content of a catalog, should it be supported.
export async function handleCatalog(queriedCatalog, type) {
    let catalogResults;

    for (const [key, value] of catalogManifests.entries()) {
        if (value.catalogs) {
            for (const catalog of value.catalogs) {
                if (catalog.id == queriedCatalog) {
                    const catalogFunction = catalogFunctions.get(key)
                    catalogResults = await catalogFunction(type)
                }
            }
        }
    }

    return catalogResults
}

// Handles searching for content within a catalog, should it be supported.
export async function handleSearch(query, queriedCatalog, type) {
    let searchResults;
    for (const [key, value] of catalogManifests.entries()) {
        if (value.catalogs) {
            for (const catalog of value.catalogs) {
                if (catalog.id == queriedCatalog) {
                    const searchFunction = catalogSearchFunctions.get(key)
                    searchResults = await searchFunction(query, type)
                }
            }
        }
    }
    return(searchResults)
}

export async function handleMeta(metaid, type) {
    for (const [key, value] of catalogMetaFunctions.entries()) {
        const meta = await value(metaid, type)
        if (meta && meta.length != 0) {
            return(meta)
        }
    }
}