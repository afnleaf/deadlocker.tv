// index.js

let embed;
let chatVis = true;
let embedVis = true;
let currentChannelIndex = -1;
const channels = ["deadlockertv", "mikaels1", "piggyxdd", "y4mz", "vegas"];

async function createEmbed(layout, channelIndex = 0) {
    if(embed) {
        embed.destroy();
    }

    currentChannelIndex = channelIndex;
    const channel = channels[currentChannelIndex];
    console.log(`${channel} test.`);
   
    const isOnline = await checkChannelOnline(channel);
    console.log(`${isOnline}`);
    if(!isOnline) {
        console.log(`${channel} is offline.`);
        //goNextChannel(layout);
    }

    embed = new Twitch.Embed("twitch-embed", {
        width: "100%",
        height: "100%",
        channel: channel,
        layout: layout,
        autoplay: false,
    });

    embed.addEventListener(Twitch.Embed.VIDEO_READY, () => {
        var player = embed.getPlayer();
        player.play();
    });

    embed.addEventListener(Twitch.Embed.VIDEO_ERROR, () => {
        console.log(`${channel} error.`);
        return;                
    });
}

function checkChannelOnline(channel) {
    return new Promise((resolve) => {
        console.log(`check if ${channel} online.`);
        // create fake html
        const t = document.createElement('div');
        t.style.display = 'none';
        t.id = 't';
        document.body.appendChild(t);

        // create test embed component
        const tE = new Twitch.Embed("t", {
            width: 10,
            height: 10,
            channel: channel,
            layout: "video"
        });

        // prevent hanging
        const timeout = setTimeout(() => {
            t.remove();
            resolve(false);
        }, 20000);

        tE.addEventListener(Twitch.Embed.OFFLINE, () => {
            console.log(`${channel} offline`)
            clearTimeout(timeout);
            t.remove();
            resolve(false);
        });

        tE.addEventListener(Twitch.Embed.ONLINE, () => {
            console.log(`${channel} online`)
            clearTimeout(timeout);
            t.remove();
            resolve(true);
        });

        tE.addEventListener(Twitch.Embed.VIDEO_ERROR, () => {
            console.log(`${channel} error`)
            clearTimeout(timeout);
            t.remove();
            resolve(false);
        });
    });
}

/*
async function findOnlineChannel() {
    let i = 0;
    channels.forEach(async (channel) => {
        const isOnline = await checkChannelOnline(channel);
        if(isOnline) {
            return i;
        } else {
            console.log(`${channel} is offline.`);
        }
        i++;
    });
    return -1;
}
*/

async function findOnlineChannel() {
    for (let i = 0; i < channels.length; i++) {
        const isOnline = await checkChannelOnline(channels[i]);
        if(isOnline) {
            return i;
        }
        console.log(`${channels[i]} is offline.`);
    }
    return -1;
}

async function goNextChannel(layout) {
    const startIndex = currentChannelIndex;
    let nextIndex = (currentChannelIndex + 1) % channels.length;
    
    // Try each channel until we find one that's online or we've tried them all
    while (nextIndex !== startIndex) {
        const isOnline = await checkChannelOnline(channels[nextIndex]);
        if (isOnline) {
            createEmbed(layout, nextIndex);
            return;
        }
        nextIndex = (nextIndex + 1) % channels.length;
    }
    
    console.log('No channels are currently live.');
}

function toggleChat() {
    chatVis = !chatVis;
    createEmbed(chatVis ? "video-with-chat" : "video", currentChannelIndex);
    document.getElementById("toggle-chat").textContent = chatVis ? "Hide Chat": "Show Chat";
}

function toggleEmbed() {
    embedVis = !embedVis;
    const container = document.querySelector(".video-container");
    container.style.display = embedVis ? "flex" : "none";
    document.getElementById("toggle-embed").innerHTML = embedVis ? "&#9650;" : "&#9660;";
}

function handleResize() {
    const embedContainer = document.getElementById("twitch-embed");
    const controls = document.getElementById("twitch-controls");
    
    if (embedContainer) {
        const containerRect = embedContainer.parentElement.getBoundingClientRect();
        const availableHeight = containerRect.height - controls.offsetHeight;
        embedContainer.style.height = `${availableHeight}px`;
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    currentChannelIndex = await findOnlineChannel();
    console.log(currentChannelIndex);
    if(currentChannelIndex >= 0) {
        createEmbed("video-with-chat", currentChannelIndex);
    } else {
        createEmbed("video-with-chat");
        toggleEmbed();
    }
    document.getElementById("toggle-chat").addEventListener("click", toggleChat);
    document.getElementById("toggle-embed").addEventListener("click", toggleEmbed);
    handleResize();
    window.addEventListener("resize", handleResize);
});

