import numpy as np
import soundfile as sf
import subprocess
from mlx_audio.tts.utils import load_model

# Load model (downloads ~3.4GB on first run)
print("Loading model...")
model = load_model("mlx-community/Qwen3-TTS-12Hz-1.7B-CustomVoice-bf16")
print("Model loaded!")

# Available speakers:
# Vivian, Serena, Uncle_Fu, Dylan, Eric (Chinese native)
# Ryan, Aiden (English native)
# Ono_Anna (Japanese native)
# Sohee (Korean native)

# Generate speech
print("Generating speech...")
results = list(model.generate_custom_voice(
    text="I'm so excited to meet you! This is running entirely on my MacBook with Apple Silicon.I'm so excited to meet you! This is running entirely on my MacBook with Apple Silicon.I'm so excited to meet you! This is running entirely on my MacBook with Apple Silicon.I'm so excited to meet you! This is running entirely on my MacBook with Apple Silicon.I'm so excited to meet you! This is running entirely on my MacBook with Apple Silicon.",
    speaker="Ryan",
    language="English",
    instruct="Helpful assistant.",
))

# Save to file
audio = np.array(results[0].audio)
sf.write("output.wav", audio, 24000)
print("Saved to output.wav")

# Play it (macOS)
subprocess.run(["afplay", "output.wav"])