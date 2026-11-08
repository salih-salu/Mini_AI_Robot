const robotFace = document.querySelector(".robot-face");
const userSpeech = document.getElementById("user-speech");
const eyesContainer = document.querySelector(".eyes-container");

// Wake state: starts sleeping
let isActive = false;
robotFace.classList.add("sleepy");

// 1. Smooth Blinking & Glances
function blinkEyes() {
    if (!isActive) return;
    robotFace.classList.add("blink");
    setTimeout(() => robotFace.classList.remove("blink"), 120);
}

let glanceTimeout = null;
function randomGlance() {
    if (!isActive || robotFace.classList.contains("talking") || !eyesContainer) return;
    const x = (Math.random() - 0.5) * 18;
    const y = (Math.random() - 0.5) * 10;
    eyesContainer.style.transform = `translate3d(${x}px, ${y}px, 0)`;

    clearTimeout(glanceTimeout);
    glanceTimeout = setTimeout(() => {
        if (eyesContainer) eyesContainer.style.transform = "translate3d(0, 0, 0)";
    }, 1000);
}

setInterval(() => {
    if (!isActive) return;
    const rand = Math.random();
    if (rand > 0.4) blinkEyes();
    if (rand > 0.6) randomGlance();
}, 2600);

// 2. Fullscreen & Wake Lock
let wakeLock = null;

async function requestWakeLock() {
    try {
        if ("wakeLock" in navigator && !wakeLock) {
            wakeLock = await navigator.wakeLock.request("screen");
            wakeLock.addEventListener("release", () => { wakeLock = null; });
        }
    } catch (e) {}
}

document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") requestWakeLock();
});

function openFullscreen() {
    const doc = document.documentElement;
    const rfs = doc.requestFullscreen || doc.webkitRequestFullscreen;
    if (rfs) rfs.call(doc).catch(() => {});
    requestWakeLock();
}

// 3. Text to Speech with Smooth Eased Transitions
function speak(text, onComplete) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.pitch = 1.2;
    utterance.rate = 1.05;

    utterance.onstart = () => {
        robotFace.classList.remove("settling");
        robotFace.classList.add("talking");
    };

    function finish() {
        robotFace.classList.remove("talking");
        robotFace.classList.add("settling");

        setTimeout(() => {
            robotFace.classList.remove("settling");
            if (eyesContainer) eyesContainer.style.transform = "translate3d(0, 0, 0)";
        }, 350);

        if (onComplete) onComplete();
    }

    utterance.onend = finish;
    utterance.onerror = finish;
    window.speechSynthesis.speak(utterance);
}

// 4. Wake / Sleep Toggle
function setWakeState(active) {
    isActive = active;
    if (active) {
        robotFace.classList.remove("sleepy");
    } else {
        robotFace.classList.add("sleepy");
        if (eyesContainer) eyesContainer.style.transform = "translate3d(0, 0, 0)";
    }
}

// 5. Query Local LangChain Ollama Backend
async function askLangChain(question) {
    try {
        const response = await fetch("/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question: question })
        });
        const data = await response.json();
        return data.reply || "I am here, how can I help?";
    } catch (error) {
        console.error("LangChain fetch error:", error);
        return "Sorry, I had trouble connecting to my mind.";
    }
}

// 6. Speech Recognition
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = false;

    let isListening = false;
    let restartTimer = null;

    function safeStart() {
        if (isListening) return;
        try {
            recognition.start();
            isListening = true;
        } catch (e) {}
    }

    function safeStop() {
        if (!isListening) return;
        try {
            recognition.stop();
        } catch (e) {}
        isListening = false;
    }

    recognition.onstart = () => { isListening = true; };

    recognition.onresult = async (event) => {
        const lastIndex = event.results.length - 1;
        const spokenText = event.results[lastIndex][0].transcript.trim();
        const lowerText = spokenText.toLowerCase();

        // Check for Wake Word: "MAC"
        if (!isActive) {
            if (lowerText.includes("mac") || lowerText.includes("mack") || lowerText.includes("mag")) {
                setWakeState(true);
                safeStop();
                if (userSpeech) userSpeech.textContent = `You: "${spokenText}"`;
                speak("Yes, I am MAC. How can I help you?", () => {
                    safeStart();
                });
            } else {
                if (userSpeech) userSpeech.textContent = 'Sleeping... Say "MAC" to wake';
            }
            return;
        }

        // Check for Sleep Command: "Thank you", "Thanks", "Goodbye"
        if (lowerText.includes("thank you") || lowerText.includes("thanks") || lowerText.includes("bye") || lowerText.includes("goodbye")) {
            setWakeState(false);
            safeStop();
            if (userSpeech) userSpeech.textContent = `You: "${spokenText}"`;
            speak("You are welcome! Going to sleep now.", () => {
                if (userSpeech) userSpeech.textContent = 'Sleeping... Say "MAC" to wake';
                safeStart();
            });
            return;
        }

        // Active conversation: Query the LangChain Ollama model
        if (userSpeech) userSpeech.textContent = `You: "${spokenText}"`;
        safeStop();

        const aiReply = await askLangChain(spokenText);

        speak(aiReply, () => {
            safeStart();
        });
    };

    recognition.onerror = (event) => {
        if (userSpeech && event.error === "not-allowed") {
            userSpeech.textContent = "Mic denied. Enable microphone in browser settings.";
        }
    };

    recognition.onend = () => {
        isListening = false;
        clearTimeout(restartTimer);
        if (!window.speechSynthesis.speaking) {
            restartTimer = setTimeout(safeStart, 250);
        }
    };

    function startVoiceSession() {
        openFullscreen();
        if (userSpeech) userSpeech.textContent = 'Say "MAC" to wake me up';
        safeStart();
    }

    document.addEventListener("click", startVoiceSession, { once: true });
    document.addEventListener("touchstart", startVoiceSession, { once: true });
}
