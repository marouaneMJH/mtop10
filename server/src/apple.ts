import axios from "axios";
import { Track } from "./track";

const APPLE_RSS_URL =
    "https://rss.applemarketingtools.com/api/v2/us/music/most-played/10/songs.json?genre=7";
const ITUNES_LOOKUP_BASE_URL = "https://itunes.apple.com/lookup";

interface AppleRSSEntry {
    // Legacy feed.entry shape
    id:
        | {
              attributes: {
                  "im:id": string;
              };
          }
        | string;
    "im:name"?: {
        label: string;
    };
    "im:artist"?: {
        label: string;
    };
    "im:collection"?: {
        "im:name": {
            label: string;
        };
    };
    "im:image"?: Array<{
        label: string;
        attributes: {
            height: string;
        };
    }>;
    "im:releaseDate"?: {
        attributes: {
            label: string;
        };
    };
    category?: {
        attributes: {
            label: string;
        };
    };

    // Current feed.results shape
    name?: string;
    artistName?: string;
    artworkUrl100?: string;
    releaseDate?: string;
    genres?: Array<{
        name: string;
    }>;
}

interface AppleRSSFeed {
    feed: {
        entry?: AppleRSSEntry[];
        results?: AppleRSSEntry[];
    };
}

interface iTunesLookupResult {
    trackId: number;
    trackName: string;
    artistName: string;
    collectionName: string;
    artworkUrl100: string;
    previewUrl: string;
    primaryGenreName: string;
    releaseDate: string;
    trackTimeMillis: number;
}

interface iTunesLookupResponse {
    results: iTunesLookupResult[];
}

/**
 * Fetches the Apple RSS feed for US Top 10 Electronic tracks
 * Returns array of track IDs and basic metadata
 */
async function fetchAppleRSS(): Promise<
    { trackId: number; rank: number; basicData: AppleRSSEntry }[]
> {
    try {
        const response = await axios.get<AppleRSSFeed>(APPLE_RSS_URL, {
            timeout: 10000,
            headers: {
                "User-Agent": "Music-Top10-Dashboard/1.0",
            },
        });

        const entries = response.data?.feed?.entry;
        const results = response.data?.feed?.results;

        if (Array.isArray(entries) && entries.length > 0) {
            return entries.map((entry, index) => ({
                trackId: parseInt(
                    (entry.id as { attributes: { "im:id": string } })
                        .attributes["im:id"],
                    10,
                ),
                rank: index + 1,
                basicData: entry,
            }));
        }

        if (Array.isArray(results) && results.length > 0) {
            return results.map((entry, index) => ({
                trackId: parseInt(String(entry.id), 10),
                rank: index + 1,
                basicData: entry,
            }));
        }

        const feedKeys = response.data?.feed
            ? Object.keys(response.data.feed).join(", ")
            : "none";
        throw new Error(
            `Invalid RSS feed response structure (feed keys: ${feedKeys})`,
        );
    } catch (error) {
        console.error("Failed to fetch Apple RSS feed:", error);
        throw new Error(
            `Apple RSS fetch failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
    }
}

/**
 * Enriches track data using iTunes Lookup API
 * Fetches preview URLs and additional metadata for all tracks in one batch call
 */
async function enrichWithiTunes(
    trackIds: number[],
): Promise<Map<number, iTunesLookupResult>> {
    if (trackIds.length === 0) {
        return new Map();
    }

    try {
        const idsParam = trackIds.join(",");
        const response = await axios.get<iTunesLookupResponse>(
            ITUNES_LOOKUP_BASE_URL,
            {
                params: {
                    id: idsParam,
                    entity: "song",
                },
                timeout: 15000,
                headers: {
                    "User-Agent": "Music-Top10-Dashboard/1.0",
                },
            },
        );

        const resultsMap = new Map<number, iTunesLookupResult>();

        if (response.data?.results) {
            response.data.results.forEach((result) => {
                if (result.trackId) {
                    resultsMap.set(result.trackId, result);
                }
            });
        }

        return resultsMap;
    } catch (error) {
        console.error("Failed to fetch iTunes lookup data:", error);
        throw new Error(
            `iTunes lookup failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
    }
}

/**
 * Converts artwork URL from 100x100 to 600x600 for better quality
 */
function enhanceArtworkUrl(url: string): string {
    return url.replace(/100x100/, "600x600");
}

/**
 * Merges RSS data with iTunes lookup data to create complete Track objects
 */
function mergeTracks(
    rssData: { trackId: number; rank: number; basicData: AppleRSSEntry }[],
    iTunesData: Map<number, iTunesLookupResult>,
): Track[] {
    const now = new Date();

    return rssData.map(({ trackId, rank, basicData }) => {
        const iTunesInfo = iTunesData.get(trackId);

        // Fallback to RSS data if iTunes lookup fails for this track
        const name =
            iTunesInfo?.trackName ||
            basicData["im:name"]?.label ||
            basicData.name ||
            "Unknown Track";
        const artist =
            iTunesInfo?.artistName ||
            basicData["im:artist"]?.label ||
            basicData.artistName ||
            "Unknown Artist";
        const album =
            iTunesInfo?.collectionName ||
            basicData["im:collection"]?.["im:name"]?.label ||
            "";
        const genre =
            iTunesInfo?.primaryGenreName ||
            basicData.category?.attributes?.label ||
            basicData.genres?.[0]?.name ||
            "Electronic";

        // Get artwork URL - prefer iTunes (higher quality), fallback to RSS
        let artworkUrl: string;
        if (iTunesInfo?.artworkUrl100) {
            artworkUrl = enhanceArtworkUrl(iTunesInfo.artworkUrl100);
        } else if (basicData.artworkUrl100) {
            artworkUrl = enhanceArtworkUrl(basicData.artworkUrl100);
        } else {
            // Find highest resolution image from RSS feed
            const images = basicData["im:image"] || [];
            const bestImage =
                images.find((img) => img.attributes.height === "170") ||
                images[images.length - 1];
            artworkUrl = bestImage?.label || "";
        }

        // Preview URL only comes from iTunes
        const previewUrl = iTunesInfo?.previewUrl || "";

        // Duration from iTunes or default to 0
        const trackTimeMillis = iTunesInfo?.trackTimeMillis || 0;

        // Release date
        const releaseDate =
            iTunesInfo?.releaseDate ||
            basicData["im:releaseDate"]?.attributes?.label ||
            basicData.releaseDate ||
            "";

        return {
            trackId,
            rank,
            name,
            artist,
            album,
            artworkUrl,
            previewUrl,
            genre,
            releaseDate,
            trackTimeMillis,
            fetchedAt: now,
        };
    });
}

/**
 * Main function to fetch and enrich Apple Top 10 Electronic tracks
 * Combines RSS feed data with iTunes Lookup API for complete Track objects
 */
export async function fetchAppleTracks(): Promise<Track[]> {
    console.log("Fetching Apple Top 10 Electronic tracks...");

    try {
        // Step 1: Fetch RSS feed
        const rssData = await fetchAppleRSS();
        console.log(`Fetched RSS data for ${rssData.length} tracks`);

        // Step 2: Extract track IDs for iTunes lookup
        const trackIds = rssData.map((item) => item.trackId);

        // Step 3: Enrich with iTunes lookup
        const iTunesData = await enrichWithiTunes(trackIds);
        console.log(`Enriched ${iTunesData.size} tracks with iTunes data`);

        // Step 4: Merge and create final Track objects
        const tracks = mergeTracks(rssData, iTunesData);

        console.log(`Successfully processed ${tracks.length} tracks`);
        return tracks;
    } catch (error) {
        console.error("Error fetching Apple tracks:", error);
        throw error;
    }
}
