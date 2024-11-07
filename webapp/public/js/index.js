// index.js

let embed;
let chatVis = true;
let embedVis = true;
let currentChannelIndex = 0;
const channels = ["deadlockertv", "mikaels1", "piggyxdd", "y4mz"];

function createEmbed(layout, channelIndex = 0) {
    if(embed) {
        embed.destroy();
    }

    currentChannelIndex = channelIndex;
    const channel = channels[currentChannelIndex];
    console.log(`${channel} test.`);

    embed = new Twitch.Embed("twitch-embed", {
        width: "100%",
        height: "100%",
        channel: channel,
        layout: layout,
        autoplay: false,
    });
    
    embed.addEventListener(Twitch.Embed.OFFLINE, () => {
        console.log(`${channel} is offline.`);
        goNextChannel(layout);
    });

    embed.addEventListener(Twitch.Embed.VIDEO_READY, () => {
        var player = embed.getPlayer();
        player.play();
    });

    embed.addEventListener(Twitch.Embed.VIDEO_ERROR, () => {
        console.log(`${channel} error.`);
        goNextChannel(layout);                
    });
}

function goNextChannel(layout) {
    const nextIndex = (currentChannelIndex + 1) % channels.length;
    if(nextIndex !== currentChannelIndex) {
        createEmbed(layout, nextIndex);
    } 
}

function toggleChat() {
    chatVis = !chatVis;
    createEmbed(chatVis ? "video-with-chat" : "video");
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

document.addEventListener("DOMContentLoaded", () => {
    createEmbed("video-with-chat");
    document.getElementById("toggle-chat").addEventListener("click", toggleChat);
    document.getElementById("toggle-embed").addEventListener("click", toggleEmbed);
    handleResize();
    window.addEventListener("resize", handleResize);
});

