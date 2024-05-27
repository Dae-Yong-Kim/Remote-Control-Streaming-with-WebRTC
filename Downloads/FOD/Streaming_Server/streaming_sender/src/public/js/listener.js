const socket = io();

const peerFace = document.getElementById("peerFace");
const statusMessage = document.getElementById("statusMessage");

let myPeerConnection;
let roomName;

const welcome = document.getElementById("welcome");
const welcomeForm = welcome.querySelector("form");

async function initCall() {
    welcome.hidden = true;
    makeConnection();
}

async function handleWelcomeSubmit(event) {
    event.preventDefault();
    const input = welcomeForm.querySelector("input");
    await initCall();
    socket.emit("join_room", input.value);
    roomName = input.value;
    input.value = "";
}

welcomeForm.addEventListener("submit", handleWelcomeSubmit);

socket.on("offer", async (offer) => {
    console.log("received the offer");
    myPeerConnection.setRemoteDescription(offer);
    const answer = await myPeerConnection.createAnswer();
    myPeerConnection.setLocalDescription(answer);
    socket.emit("answer", answer, roomName);
    console.log("sent the answer");
});

// socket.on("answer", (answer) => {
//     console.log("received the answer");
//     myPeerConnection.setRemoteDescription(answer);
// });

socket.on("ice", (ice) => {
    console.log("received candidate");
    myPeerConnection.addIceCandidate(ice);
});

socket.on("no_offer", () => {
    const offlineMessage = document.createElement("p");
    offlineMessage.textContent = `Vehicle ${roomName} is offline`;
    offlineMessage.style.textAlign = "center";
    offlineMessage.style.fontSize = "30px";
    offlineMessage.style.fontWeight = "bold";
    offlineMessage.style.color = "red";
    document.body.appendChild(offlineMessage);
});

function makeConnection() {
    myPeerConnection = new RTCPeerConnection({
        iceServers: [
            {
                urls: [
                    "stun:stun.l.google.com:19302",
                    "stun:stun1.l.google.com:19302",
                    "stun:stun2.l.google.com:19302",
                    "stun:stun3.l.google.com:19302",
                    "stun:stun4.l.google.com:19302",
                ],
            },
        ],
    });
    myPeerConnection.addEventListener("icecandidate", handleIce);
    myPeerConnection.addEventListener("addstream", handleAddStream);
}

function handleIce(data) {
    console.log("sent candidate");
    socket.emit("ice", data.candidate, roomName);
}

function handleAddStream(data) {
    peerFace.srcObject = data.stream;
}
