# Voice samples for choosing the app's voice (Kokoro-82M, Apache-2.0, runs on CPU in GitHub Actions).
import os, subprocess
import numpy as np
import soundfile as sf
from kokoro import KPipeline

TEXT = ("Hi! It's nice to meet you. Let's learn some English together. "
        "The company's annual performance evaluation helps employees identify their strengths and weaknesses.")
VOICES = [
    ("1-heart", "a", "af_heart"),
    ("2-bella", "a", "af_bella"),
    ("3-nicole", "a", "af_nicole"),
    ("4-sarah", "a", "af_sarah"),
    ("5-aoede", "a", "af_aoede"),
    ("6-emma-british", "b", "bf_emma"),
]
os.makedirs("samples", exist_ok=True)
pipes = {}
for name, lang, voice in VOICES:
    pipe = pipes.setdefault(lang, KPipeline(lang_code=lang))
    audio = np.concatenate([a for _, _, a in pipe(TEXT, voice=voice, speed=0.95)])
    wav = f"samples/{name}.wav"
    sf.write(wav, audio, 24000)
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", wav, "-ac", "1", "-b:a", "64k", f"samples/{name}.mp3"], check=True)
    os.remove(wav)
    print("done", name)
