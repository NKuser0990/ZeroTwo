import { createRequire } from "module";
import { GatewayDispatchEvents } from "discord.js";
import { logger } from "../../utils/logger.js";
import lavalinkConfig from "../../config/music/lavalink.js";
import { setupPlayerHandler } from "./playerHandler.js";

const require = createRequire(import.meta.url);
const { Riffy } = require("riffy");

let riffyVersion = "Unknown";
try {
    riffyVersion = require("riffy/package.json").version;
} catch {}

export function initializeMusic(client) {
    console.log("========== MUSIC INIT ==========");
    console.log("Riffy Version:", riffyVersion);

    if (!lavalinkConfig.nodes?.length) {
        logger.error("No Lavalink nodes configured.");
        return;
    }

    console.log("========== LAVALINK CONFIG ==========");
    console.log(lavalinkConfig.nodes);

    try {
        client.riffy = new Riffy(client, lavalinkConfig.nodes, {
            send: (payload) => {
                const guild = client.guilds.cache.get(payload.d.guild_id);
                if (guild) guild.shard.send(payload);
            },
            defaultSearchPlatform: lavalinkConfig.defaultSearchPlatform,
            restVersion: lavalinkConfig.restVersion,
            bypassChecks: {
                nodeFetchInfo: true,
            },
        });
    } catch (err) {
        console.error("FAILED TO CREATE RIFFY");
        console.error(err);
        return;
    }

    console.log("========== RIFFY OBJECT ==========");
    console.log("Constructor:", client.riffy.constructor?.name);
    console.log("Keys:", Object.keys(client.riffy));

    console.log("Has nodes:", "nodes" in client.riffy);
    console.log("Has nodeManager:", "nodeManager" in client.riffy);
    console.log("Has managers:", "managers" in client.riffy);
    console.log("Has players:", "players" in client.riffy);

    console.dir(client.riffy, { depth: 2 });

    setTimeout(() => {
        console.log("========== RIFFY STATUS ==========");

        console.log("nodes =", client.riffy.nodes);
        console.log("nodeManager =", client.riffy.nodeManager);
        console.log("players =", client.riffy.players);

        if (client.riffy.nodes instanceof Map) {
            console.log("Node count:", client.riffy.nodes.size);

            for (const [name, node] of client.riffy.nodes) {
                console.log({
                    name,
                    connected: node.connected,
                    sessionId: node.sessionId,
                    state: node.state,
                });
            }
        }

        console.log("==================================");
    }, 5000);

    setupPlayerHandler(client);

    client.riffy.on("nodeConnect", (node) => {
        console.log("NODE CONNECT:", node.name);
        logger.info(`Connected to Lavalink: ${node.name}`);
    });

    client.riffy.on("nodeDisconnect", (node, reason) => {
        console.log("NODE DISCONNECT:", node.name);
        console.log(reason);
        logger.warn(`Disconnected: ${node.name}`);
    });

    client.riffy.on("nodeError", (node, error) => {
        console.log("NODE ERROR:", node.name);
        console.error(error);
        logger.error(`Node error: ${node.name}`);
    });

    client.on("raw", (packet) => {
        if (
            ![
                GatewayDispatchEvents.VoiceStateUpdate,
                GatewayDispatchEvents.VoiceServerUpdate,
            ].includes(packet.t)
        ) {
            return;
        }

        client.riffy.updateVoiceState(packet);
    });

    client.riffy.on("playerError", (player, error) => {
        console.error("PLAYER ERROR:", player.guildId);
        console.error(error);
    });

    logger.info(
        `Music initialized with ${lavalinkConfig.nodes.length} Lavalink node(s).`
    );
}

export function initRiffyAfterReady(client) {
    console.log("========== INIT RIFFY ==========");

    if (!client.riffy) {
        console.log("client.riffy = undefined");
        return;
    }

    if (!client.user) {
        console.log("client.user = undefined");
        return;
    }

    console.log("Bot ID:", client.user.id);

    try {
        client.riffy.init(client.user.id);
        console.log("client.riffy.init() SUCCESS");
        console.log(client.riffy.nodes);
        console.log(Array.isArray(client.riffy.nodes));

        console.log(client.riffy.nodeMap);
        console.log(client.riffy.nodeMap?.size);
    } catch (err) {
        console.log("client.riffy.init() FAILED");
        console.error(err);
    }
}
