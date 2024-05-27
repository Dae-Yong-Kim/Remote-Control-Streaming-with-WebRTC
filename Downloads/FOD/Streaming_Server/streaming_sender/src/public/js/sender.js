const socket = io();

const camerasSelect = document.getElementById("cameras");
const call = document.getElementById("call");
const welcome = document.getElementById("welcome");

call.hidden = true;

let myStream;
let roomName;
let myPeerConnection;

async function getCameras() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter((device) => device.kind === "videoinput");
        cameras.forEach((camera) => {
            const option = document.createElement("option");
            option.value = camera.deviceId;
            option.innerText = camera.label;
            camerasSelect.appendChild(option);
        });
    } catch (e) {
        console.log(e);
    }
}

async function getMedia(deviceId) {
    const initialConstrains = {
        audio: true,
        video: { facingMode: "user" },
    };
    const cameraConstraints = {
        audio: true,
        video: { deviceId: { exact: deviceId } },
    };
    try {
        myStream = await navigator.mediaDevices.getUserMedia(
            deviceId ? cameraConstraints : initialConstrains
        );
        if (!deviceId) {
            await getCameras();
        }
    } catch (e) {
        console.log(e);
    }
}

async function handleCameraChange() {
    await getMedia(camerasSelect.value);
    if (myPeerConnection) {
        const videoTrack = myStream.getVideoTracks()[0];
        const videoSender = myPeerConnection
            .getSenders()
            .find((sender) => sender.track.kind === "video");
        videoSender.replaceTrack(videoTrack);
    }
}

camerasSelect.addEventListener("input", handleCameraChange);

async function initCall() {
    welcome.hidden = true;
    call.hidden = false;
    await getMedia();
    makeConnection();
}

function joinRoom(roomName) {
    initCall();
    socket.emit("join_room", roomName);
}

function getRoomNameFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("vid");
}

document.addEventListener("DOMContentLoaded", () => {
    const roomNameFromURL = getRoomNameFromURL();
    if (roomNameFromURL) {
        roomName = roomNameFromURL;
        joinRoom(roomName);
    } else {
        const welcomeForm = welcome.querySelector("form");

        async function handleWelcomeSubmit(event) {
            event.preventDefault();
            const input = welcomeForm.querySelector("input");
            roomName = input.value;
            joinRoom(roomName);
            input.value = "";
        }

        welcomeForm.addEventListener("submit", handleWelcomeSubmit);
    }
});

socket.on("welcome", async () => {
    const offer = await myPeerConnection.createOffer();
    myPeerConnection.setLocalDescription(offer);
    console.log("sent the offer");
    socket.emit("offer", offer, roomName);
});

// socket.on("offer", async (offer) => {
//     console.log("received the offer");
//     myPeerConnection.setRemoteDescription(offer);
//     const answer = await myPeerConnection.createAnswer();
//     myPeerConnection.setLocalDescription(answer);
//     socket.emit("answer", answer, roomName);
//     console.log("sent the answer");
// });

socket.on("answer", (answer) => {
    console.log("received the answer");
    myPeerConnection.setRemoteDescription(answer);
});

socket.on("ice", (ice) => {
    console.log("received candidate");
    myPeerConnection.addIceCandidate(ice);
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
    myStream
        .getTracks()
        .forEach((track) => myPeerConnection.addTrack(track, myStream));
}

function handleIce(data) {
    console.log("sent candidate");
    socket.emit("ice", data.candidate, roomName);
}

function handleAddStream(data) {
    console.log('Stream added', data.stream);
}
