const robotFace = document.querySelector(".robot-face");
const userSpeech = document.getElementById("user-speech");

// 1. Natural blinking animation (only when awake)
function blinkEyes() {
    if (!isActive) return;
    robotFace.classList.add("blink");
    setTimeout(() => robotFace.classList.remove("blink"), 160);
}
setInterval(() => {
    if (Math.random() > 0.2) blinkEyes();
}, 3000);

// 2. Fullscreen on tap / click + Keep Screen Awake
let wakeLock = null;

async function requestWakeLock() {
    try {
        if ("wakeLock" in navigator) {
            wakeLock = await navigator.wakeLock.request("screen");
        }
    } catch (err) {
        console.warn("Wake Lock error:", err);
    }
}

// Re-acquire wake lock if user switches apps and returns
document.addEventListener("visibilitychange", async () => {
    if (wakeLock !== null && document.visibilityState === "visible") {
        await requestWakeLock();
    }
});

function openFullscreen() {
    const doc = document.documentElement;
    if (doc.requestFullscreen) {
        doc.requestFullscreen().catch(() => {});
    } else if (doc.webkitRequestFullscreen) {
        doc.webkitRequestFullscreen();
    }

    // Keep screen from turning off
    requestWakeLock();
}

// 3. Text to Speech (Robot voice) + Realistic animations
function speak(text, onComplete) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.pitch = 1.2;
    utterance.rate = 1.0;

    // Start talking animation
    utterance.onstart = () => {
        robotFace.classList.add("talking");
    };

    function finishSpeaking() {
        robotFace.classList.remove("talking");
        if (onComplete) onComplete();
    }

    utterance.onend = finishSpeaking;
    utterance.onerror = finishSpeaking;

    window.speechSynthesis.speak(utterance);
}

// Wake state: starts sleeping with eyes closed
let isActive = false;
robotFace.classList.add("sleepy");

// Helper to switch wake/sleep expressions
function setWakeState(active) {
    isActive = active;
    if (active) {
        robotFace.classList.remove("sleepy");
    } else {
        robotFace.classList.add("sleepy");
    }
}

// 4. Conversation Rules
function processConversation(userText) {
    const text = userText.toLowerCase();

    // Check for Wake Word: "MAC"
    if (!isActive) {
        if (text.includes("mac") || text.includes("mack") || text.includes("mag")) {
            setWakeState(true);
            return "Yes, I am MAC. How can I help you?";
        }
        // Remain silent if wake word hasn't been spoken
        return null;
    }

    // Check for Sleep phrase: "Thank you"
    if (text.includes("thank you") || text.includes("thanks")) {
        setWakeState(false);
        return "You are welcome! Going to sleep now.";
    }

    // Active conversation responses
    if (text.includes("hi") || text.includes("hello")) {
        return "Hi! How can I help you?";
    }
    if (text.includes("how are you")) {
        return "I am good, what about you?";
    }
    if (text.includes("name") || text.includes("who are you")) {
        return "I am MAC, your mini AI robot companion!";
    }
    if (text.includes("what are you doing") || text.includes("what can you do")) {
        return "I am listening to your voice and talking with you!";
    }
    if (text.includes("bye") || text.includes("goodbye")) {
        setWakeState(false);
        return "Goodbye! Have a wonderful day!";
    }

    return "I heard you say " + userText;
}

// 5. Speech to Text (Voice Capture)
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = false;

    let isListening = false;

    function safeStart() {
        if (!isListening) {
            try {
                recognition.start();
                isListening = true;
            } catch (e) {}
        }
    }

    function safeStop() {
        if (isListening) {
            try {
                recognition.stop();
            } catch (e) {}
            isListening = false;
        }
    }

    recognition.onstart = () => {
        isListening = true;
    };

    recognition.onresult = (event) => {
        const lastIndex = event.results.length - 1;
        const spokenText = event.results[lastIndex][0].transcript.trim();
        console.log("User said:", spokenText);

        const reply = processConversation(spokenText);

        // If robot is sleeping and wake word wasn't said, stay silent
        if (!reply) {
            if (userSpeech) {
                userSpeech.textContent = `Sleeping... Say "MAC" to wake`;
            }
            return;
        }

        if (userSpeech) {
            userSpeech.textContent = `You: "${spokenText}"`;
        }

        // Pause mic while speaking to avoid audio conflict on mobile
        safeStop();
        speak(reply, () => {
            safeStart();
        });
    };

    recognition.onerror = (event) => {
        console.warn("Speech recognition notice:", event.error);
        if (userSpeech && event.error === "not-allowed") {
            userSpeech.textContent = "Mic denied. Enable microphone in browser settings.";
        }
    };

    recognition.onend = () => {
        isListening = false;
        if (!window.speechSynthesis.speaking) {
            setTimeout(safeStart, 300);
        }
    };

    // Tap once to start listening in silent standby mode
    function startVoiceSession() {
        openFullscreen();
        if (userSpeech) {
            userSpeech.textContent = `Say "MAC" to wake me up`;
        }
        safeStart();
    }

    document.addEventListener("click", startVoiceSession, { once: true });
    document.addEventListener("touchstart", startVoiceSession, { once: true });
} else {
    alert("Speech recognition is not supported in this browser. Please use Chrome.");
}
