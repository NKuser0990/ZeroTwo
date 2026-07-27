import { createRequire } from 'module';
import { GatewayDispatchEvents } from 'discord.js';
import { logger } from '../../utils/logger.js';
import lavalinkConfig from '../../config/music/lavalink.js';
import { setupPlayerHandler } from './playerHandler.js';

const require = createRequire(import.meta.url);
const { Riffy } = require('riffy');

export function initializeMusic(client) {
    console.log("STEP 1");
    if (!lavalinkConfig.nodes?.length) {
        logger.error('No Lavalink nodes configured. Add lavalink/nodes.json, set LAVALINK_NODES, or set LAVALINK_HOST in your environment.');
        return;
    }

    logger.info("===== Lavalink Config =====");
    console.log(lavalinkConfig.nodes);
    logger.info("===========================");
    
    client.riffy = new Riffy(client, lavalinkConfig.nodes, {
        send: (payload) => {
            const guild = client.guilds.cache.get(payload.d.guild_id);
            if (guild) {
                guild.shard.send(payload);
            }
        },
        defaultSearchPlatform: lavalinkConfig.defaultSearchPlatform,
        restVersion: lavalinkConfig.restVersion,
        bypassChecks: {
            nodeFetchInfo: true,
        },
    });
    console.log("===== RIFFY DEBUG =====");
logger.info("Creating Riffy...");
logger.info(`Node count: ${client.riffy.nodes?.size}`);

setTimeout(() => {
    console.log("===== RIFFY STATUS =====");
    console.log(`Nodes: ${client.riffy.nodes?.size}`);

    if (!client.riffy.nodes?.size) {
        logger.warn("No Lavalink nodes registered.");
        return;
    }

    for (const [name, node] of client.riffy.nodes) {
        logger.info(
            `${name} | connected=${node.connected} | session=${node.sessionId || "none"}`
        );
    }
}, 5000);
    logger.info("STEP 2");

    setupPlayerHandler(client);

    logger.info("STEP 3");

    client.riffy.on("nodeConnect", node => {
    logger.info(`✅ Connected to Lavalink: ${node.name}`);
});

client.riffy.on("nodeDisconnect", (node, reason) => {
    logger.warn(`❌ Lavalink disconnected: ${node.name}`);
    logger.warn(reason);
});

client.riffy.on("nodeError", (node, error) => {
    logger.error(`Lavalink error: ${node.name}`);
    logger.error(error);
});

    client.on('raw', (packet) => {
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

    client.riffy.on('playerError', (player, error) => {
        logger.error(`Music player error in guild ${player.guildId}:`, error);
    });

    logger.info(`Music initialized with ${lavalinkConfig.nodes.length} Lavalink node(s).`);
}

export function initRiffyAfterReady(client) {
    if (client.riffy && client.user?.id) {
        client.riffy.init(client.user.id);
        logger.info('Riffy voice connection manager initialized.');
    } else {
        logger.warn("client.riffy tidak ada");
    }
}
