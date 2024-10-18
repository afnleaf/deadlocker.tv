// index.js

let embed;
let chatVis = true;

function createEmbed(layout) {
    if(embed) {
        embed.destroy();
    }

    embed = new Twitch.Embed("twitch-embed", {
        width: "100%",
        height: "100%",
        channel: "deadlockertv",
        layout: layout,
        autoplay: false,
    });

    embed.addEventListener(Twitch.Embed.VIDEO_READY, () => {
        var player = embed.getPlayer();
        player.play();
    });
}

function toggleChat() {
    chatVis = !chatVis;
    createEmbed(chatVis ? "video-with-chat" : "video");
    document.getElementById("toggle-chat").textContent = chatVis ? "Hide Chat": "Show Chat";
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

/*
function handleResize() {
    const header = document.querySelector("header");
    const footer = document.querySelector("footer");
    const controls = document.getElementById("twitch-controls");
    const embedContainer = document.getElementById("twitch-embed");

    if (embedContainer) {
        const availableHeight = window.innerHeight - header.offsetHeight - footer.offsetHeight - controls.offsetHeight;
        embedContainer.style.height = `${availableHeight}px`;
    }
}
function handleResize() {
    const videoPlayer = document.getElementById("twitch-embed");
    if(videoPlayer) {
        const newHeight = window.innerHeight - document.querySelector("header").offsetHeight - document.querySelector("footer").offsetHeight - document.getElementById("twitch-controls").offsetHeight;
        embedElement.style.height = `${newHeight}px`;i
    }
}
*/

document.addEventListener("DOMContentLoaded", () => {
    createEmbed("video-with-chat");
    document.getElementById("toggle-chat").addEventListener("click", toggleChat);
    handleResize();
    window.addEventListener("resize", handleResize);
});

