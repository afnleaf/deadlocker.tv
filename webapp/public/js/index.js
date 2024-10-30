// index.js

let embed;
let chatVis = true;
let embedVis = true;

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

