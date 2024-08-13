// Socket.io Setup
const socket = io();
const messagebox = document.getElementById("messagebox");
const chatform = document.getElementById("chatform");
const messageContainer = document.getElementById("message-container");
let room;

// WebRTC Variables
let localStream;
let remoteStream;
let peerConnection;
let inCall = false;
const localVideo = document.getElementById("local-video");
const remoteVideo = document.getElementById("remote-video");

const rtcSettings = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

// Event Listeners
chatform.addEventListener("submit", (event) => {
  event.preventDefault();
  socket.emit("send-message", { room, message: messagebox.value });
  attachMessage(messagebox.value);
  messagebox.value = "";
 
});

document.querySelector("#video-call-btn").addEventListener("click", () => {
  socket.emit("startVideoCall", { room });
});

document.querySelector("#accept-call").addEventListener("click", () => {
  document.querySelector("#incoming-call").classList.add("hidden");
  initializeWebRTC();
  socket.emit("acceptCall", { room });
});

document.querySelector("#reject-call").addEventListener("click", () => {
  document.querySelector("#incoming-call").classList.add("hidden");
  socket.emit("rejectCall", { room });
});

document.querySelector("#hangup").addEventListener("click", handleHangup);

// Socket.io Events
socket.emit("join-room");

socket.on("joined", (roomName) => {
  room = roomName;
  document.querySelector(".nobody").classList.add("hidden");
});

socket.on("new-message", (message) => {
  receiveMessage(message);
});

socket.on("incomingCall", () => {
  document.querySelector("#incoming-call").classList.remove("hidden");
});

socket.on("callAccepted", () => {
  initializeWebRTC();
  document.querySelector(".videoblock").classList.remove("hidden");
});

socket.on("callRejected", () => {
  alert("Call rejected by other user");
});

socket.on("signalingMessage", (data) => {
  handleSignalingMessage(data);
});

// Chat Functions


function attachMessage(message) {
  const userMessageContainer = document.createElement('div');
  userMessageContainer.classList.add('flex', 'my-2', 'justify-end');

  const userMessageDiv = document.createElement('div');
  userMessageDiv.classList.add('bg-blue-500', 'text-white', 'p-3', 'rounded-lg', 'max-w-xs');

  const userMessageText = document.createElement('p');
  userMessageText.textContent = message;

  userMessageDiv.appendChild(userMessageText);

  userMessageContainer.appendChild(userMessageDiv);

  document.getElementById('message-container').appendChild(userMessageContainer);

  document.querySelector("#message-container").scrollTop = document.querySelector("#message-container").scrollHeight;
}

function receiveMessage(message) {
  const messageContainer = document.createElement('div');
  messageContainer.classList.add('flex', 'my-2', 'justify-start');

  const messageDiv = document.createElement('div');
  messageDiv.classList.add('bg-gray-300', 'text-gray-800', 'p-3', 'rounded-lg', 'max-w-xs');

  const messageText = document.createElement('p');
  messageText.textContent = message;

  messageDiv.appendChild(messageText);

  messageContainer.appendChild(messageDiv);

  document.getElementById('message-container').appendChild(messageContainer);
  document.querySelector("#message-container").scrollTop = document.querySelector("#message-container").scrollHeight;
}


// WebRTC Functions
const initializeWebRTC = async () => {
  try {
    // Get user media (audio and video)
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });

    // Set the source object of the local video element to the local stream
    localVideo.srcObject = localStream;
    localVideo.style.display = "block";
    document.querySelector(".videoblock").classList.remove("hidden");
    inCall = true;
    initiateOffer();
  } catch (error) {
    console.log("Rejected by browser", error);
  }
};

const initiateOffer = async () => {
  try {
    await createPeerConnection();
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    socket.emit("signalingMessage", {
      room,
      message: JSON.stringify({
        type: "offer",
        offer,
      }),
    });
  } catch (error) {
    console.log(error);
  }
};

const createPeerConnection = () => {
  peerConnection = new RTCPeerConnection(rtcSettings);
  remoteStream = new MediaStream();

  remoteVideo.srcObject = remoteStream;
  remoteVideo.style.display = "block";
  localVideo.classList.add("smallFrame");

  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });

  peerConnection.ontrack = (event) => {
    event.streams[0].getTracks().forEach((track) => {
      remoteStream.addTrack(track);
    });
  };

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("signalingMessage", {
        room,
        message: JSON.stringify({
          type: "candidate",
          candidate: event.candidate,
        }),
      });
    }
  };

  peerConnection.onconnectionstatechange = () => {
    console.log("Connection state changed");
  };
};

const handleSignalingMessage = async (message) => {
  const { type, offer, answer, candidate } = JSON.parse(message);
  if (type === "offer") await handleOffer(offer);
  else if (type === "answer") await handleAnswer(answer);
  else if (type === "candidate" && peerConnection) {
    try {
      await peerConnection.addIceCandidate(candidate);
    } catch (error) {
      console.log(error);
    }
  } else if (type === "hangup") {
    handleHangup();
  }
};

const handleOffer = async (offer) => {
  if (!peerConnection) await createPeerConnection();
  try {
    if (peerConnection.signalingState !== "stable") {
      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(offer)
      );
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      socket.emit("signalingMessage", {
        room,
        message: JSON.stringify({
          type: "answer",
          answer: peerConnection.localDescription,
        }),
      });
      inCall = true;
    }
  } catch (error) {
    console.log("Failed to handle offer " + error);
  }
};

const handleAnswer = async (answer) => {
  try {
    if (peerConnection.signalingState === "have-local-offer") {
      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(answer)
      );
    }
  } catch (error) {
    console.log("Failed to handle answer " + error);
  }
};

function handleHangup() {
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
  if (remoteVideo) {
    remoteVideo.srcObject = null;
    remoteVideo.style.display = "none";
  }
  if (localVideo) {
    localVideo.classList.remove("smallFrame");
  }
  inCall = false;
}
