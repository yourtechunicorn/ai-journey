# ElevenLabs Model Latency Comparison

A Python script that benchmarks ElevenLabs text-to-speech response time across three models: Multilingual v2, Turbo v2.5, and Flash v2.5.

Built to understand the latency tradeoffs when choosing a model for real-time vs. quality-first use cases.

---

## Models Tested

| Model | Use Case |
|---|---|
| `eleven_multilingual_v2` | Highest quality, 29+ languages, slower |
| `eleven_turbo_v2_5` | Low latency, optimized for real-time |
| `eleven_flash_v2_5` | Fastest, best for sub-second response needs |

---

## Setup

```bash
git clone https://github.com/YOUR_USERNAME/elevenlabs-model-comparison
cd elevenlabs-model-comparison
pip install -r requirements.txt
cp .env.example .env
```

Add your ElevenLabs API key to `.env`:

```
ELEVENLABS_API_KEY=your_api_key_here
```

Get your key from: https://elevenlabs.io/app/settings/api-keys

---

## Run

```bash
python main.py
```

Audio files are saved to `/output` as `.mp3` files, one per model.

---

## Sample Output

```
Running comparison across 3 models...

Testing eleven_multilingual_v2...
  Generated in 2.84s -- saved to output/eleven_multilingual_v2.mp3
Testing eleven_turbo_v2_5...
  Generated in 1.12s -- saved to output/eleven_turbo_v2_5.mp3
Testing eleven_flash_v2_5...
  Generated in 0.61s -- saved to output/eleven_flash_v2_5.mp3

--- Latency Results (fastest to slowest) ---
  eleven_flash_v2_5: 0.61s [OK]
  eleven_turbo_v2_5: 1.12s [OK]
  eleven_multilingual_v2: 2.84s [OK]

  Fastest: eleven_flash_v2_5 (0.61s)
  Slowest: eleven_multilingual_v2 (2.84s)
  Difference: 2.23s
```

---

## Why This Matters

A 2-3 second response time is the difference between a voice agent that feels natural and one that feels broken. This script makes that tradeoff measurable so you can choose the right model for your use case.

---

*Built by Pam Baroro | [yourtechunicorn.com](https://yourtechunicorn.com)*