import requests
import time
import os
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("ELEVENLABS_API_KEY")
VOICE_ID = "EXAVITQu4vr4xnSDxMaL"  # Sarah -- Mature, Reassuring, Confident

MODELS = [
    "eleven_multilingual_v2",
    "eleven_turbo_v2_5",
    "eleven_flash_v2_5",
]

TEXT = (
    "Welcome to ElevenLabs. This is a test of response time and audio quality "
    "across three available models: Multilingual, Turbo, and Flash."
)


def generate_audio(text, model_id, voice_id):
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    headers = {
        "xi-api-key": API_KEY,
        "Content-Type": "application/json",
    }
    payload = {
        "text": text,
        "model_id": model_id,
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.75,
        },
    }

    start = time.time()
    response = requests.post(url, headers=headers, json=payload)
    elapsed = round(time.time() - start, 2)

    return response, elapsed


def handle_error(status_code, body):
    messages = {
        401: "Authentication failed. Check that your ELEVENLABS_API_KEY is set correctly in your .env file.",
        422: "Validation error. The request payload may be malformed.",
        429: "Rate limit hit. Wait a moment and try again.",
        403: "Quota exceeded or access denied. Check your subscription limits.",
    }
    return messages.get(status_code, f"Unexpected error {status_code}: {body}")


def main():
    if not API_KEY:
        print("ERROR: ELEVENLABS_API_KEY not found. Copy .env.example to .env and add your key.")
        return

    os.makedirs("output", exist_ok=True)
    results = []

    print(f"Running comparison across {len(MODELS)} models...\n")

    for model in MODELS:
        print(f"Testing {model}...")
        response, elapsed = generate_audio(TEXT, model, VOICE_ID)

        if response.status_code == 200:
            filename = f"output/{model}.mp3"
            with open(filename, "wb") as f:
                f.write(response.content)
            print(f"  Generated in {elapsed}s -- saved to {filename}")
            results.append({"model": model, "latency": elapsed, "status": "success"})
        else:
            error_msg = handle_error(response.status_code, response.text)
            print(f"  FAILED -- {error_msg}")
            results.append({"model": model, "latency": elapsed, "status": "failed"})

    print("\n--- Latency Results (fastest to slowest) ---")
    sorted_results = sorted(results, key=lambda x: x["latency"])
    for r in sorted_results:
        status_label = "OK" if r["status"] == "success" else "FAILED"
        print(f"  {r['model']}: {r['latency']}s [{status_label}]")

    successful = [r for r in sorted_results if r["status"] == "success"]
    if len(successful) > 1:
        fastest = successful[0]
        slowest = successful[-1]
        diff = round(slowest["latency"] - fastest["latency"], 2)
        print(f"\n  Fastest: {fastest['model']} ({fastest['latency']}s)")
        print(f"  Slowest: {slowest['model']} ({slowest['latency']}s)")
        print(f"  Difference: {diff}s")

    print("\nDone. Audio files saved to /output")


if __name__ == "__main__":
    main()