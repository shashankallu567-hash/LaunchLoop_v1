"""Deterministic, explainable virality scoring heuristic for LaunchLoop AI.

Five explainable factors (each 0-100 with human-readable reasons):
  Hook Strength · Emotional Trigger · Audience Fit · Shareability · Platform Fit

Same input always yields the same score (demo-stable, no randomness).
Prediction metrics: impressions, engagement, shares, conversions.
"""
import re
import hashlib
from typing import Dict, List, Any, Optional

WEIGHTS = {
    "hook": 0.25,
    "emotion": 0.20,
    "audience_fit": 0.20,
    "shareability": 0.20,
    "platform_fit": 0.15,
}

FACTOR_LABELS = {
    "hook": "Hook Strength",
    "emotion": "Emotional Trigger",
    "audience_fit": "Audience Fit",
    "shareability": "Shareability",
    "platform_fit": "Platform Fit",
}

METRIC_KEYS = ["impressions", "engagement", "shares", "conversions"]

POWER_WORDS = ["you", "your", "free", "now", "new", "instantly", "proven", "secret",
               "stop", "never", "finally", "unlock", "discover", "how", "why"]
EMOTION_WORDS = ["love", "hate", "fear", "amazing", "shocking", "incredible", "surprising",
                 "frustrating", "painful", "dream", "struggle", "win", "fail", "regret",
                 "excited", "worried", "obsessed", "hidden", "brutal", "honest"]
SHARE_WORDS = ["free", "new", "secret", "how", "why", "results", "hack", "tip", "guide",
               "vs", "best", "worst", "mistake", "story", "thread", "steal", "template",
               "framework", "breakdown", "lessons"]
CURIOSITY_STARTERS = ["how", "why", "what", "the", "stop", "here", "i", "we", "everyone",
                      "nobody", "most"]

# platform -> (preferred signal words, ideal max words, style note)
PLATFORM_PROFILES = {
    "Twitter/X": (["thread", "how", "why", "steal", "story", "stop"], 14,
                  "punchy hooks, threads and questions"),
    "LinkedIn": (["lessons", "story", "team", "growth", "why", "learned"], 22,
                 "credible professional storytelling"),
    "Product Hunt": (["launching", "launch", "new", "free", "today", "introducing"], 16,
                     "clear launch framing and a free offer"),
    "Email": (["how", "why", "secret", "free", "guide", "inside"], 12,
              "curiosity-driven subject lines"),
    "Newsletter": (["how", "why", "lessons", "playbook", "guide", "framework"], 18,
                   "value-first educational framing"),
    "Reddit": (["story", "honest", "lessons", "mistake", "learned", "we"], 20,
               "authentic, non-salesy discussion"),
    "Instagram": ["how", "results", "before", "after", "story"],
    "TikTok": ["how", "watch", "results", "hack", "story"],
}


def _words(text: str) -> List[str]:
    return re.findall(r"[a-zA-Z']+", text.lower())


def _score_hook(headline: str) -> Dict[str, Any]:
    reasons, score = [], 30
    hl = headline.strip()
    words = _words(hl)
    first = words[0] if words else ""
    if first in CURIOSITY_STARTERS:
        score += 18
        reasons.append(f'Opens with a curiosity trigger word "{first}".')
    else:
        reasons.append("Opening word is not a strong curiosity trigger.")
    if any(c.isdigit() for c in hl):
        score += 16
        reasons.append("Contains a number — specificity boosts click-through.")
    else:
        reasons.append("No numbers — a specific figure would sharpen it.")
    if "?" in hl:
        score += 10
        reasons.append("Poses a question, inviting the reader to answer.")
    power_hits = sorted(set(w for w in words if w in POWER_WORDS))
    if power_hits:
        score += min(20, len(power_hits) * 7)
        reasons.append(f'Uses power words: {", ".join(power_hits)}.')
    else:
        reasons.append("Lacks power words like 'you', 'free', 'proven'.")
    if 5 <= len(words) <= 12:
        score += 8
        reasons.append("Length sits in the scannable 5–12 word sweet spot.")
    elif len(words) > 12:
        reasons.append("Headline is long — tighten it for a punchier hook.")
    return {"score": min(100, score), "reasons": reasons}


def _score_emotion(text: str) -> Dict[str, Any]:
    reasons, score = [], 25
    words = _words(text)
    hits = sorted(set(w for w in words if w in EMOTION_WORDS))
    if hits:
        score += min(50, len(hits) * 14)
        reasons.append(f'Emotional language present: {", ".join(hits)}.')
    else:
        reasons.append("No strong emotional words — reads neutral/informational.")
    if "!" in text:
        score += 10
        reasons.append("Exclamation adds energy and urgency.")
    if any(w in words for w in ["you", "your"]):
        score += 15
        reasons.append("Speaks directly to 'you' — personal and engaging.")
    else:
        reasons.append("Not directly addressing the reader ('you').")
    return {"score": min(100, score), "reasons": reasons}


def _score_audience_fit(text: str, audience: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    reasons, score = [], 35
    audience = audience or {}
    words = set(_words(text))
    signal_terms = []
    for field in ["pain_points", "desires", "interests", "motivations", "content_triggers"]:
        for item in (audience.get(field) or []):
            signal_terms += _words(str(item))
    signal_terms = set(signal_terms) - {"a", "the", "to", "of", "for", "and", "no", "at"}
    overlap = sorted(words & signal_terms)
    if not audience or not signal_terms:
        score = 55
        reasons.append("No detailed audience profile — using a neutral fit estimate.")
    elif overlap:
        score += min(45, len(overlap) * 12)
        reasons.append(f'Echoes audience language: {", ".join(overlap[:5])}.')
    else:
        score -= 5
        reasons.append("Copy doesn't yet mirror this audience's pains or desires.")
    tone = (audience.get("tone") or "").split(",")[0].strip()
    if tone and tone.split()[0] in text.lower():
        score += 8
        reasons.append(f'Matches the audience tone ("{tone}").')
    return {"score": max(0, min(100, score)), "reasons": reasons}


def _score_shareability(text: str) -> Dict[str, Any]:
    reasons, score = [], 30
    words = _words(text)
    hits = sorted(set(w for w in words if w in SHARE_WORDS))
    if hits:
        score += min(45, len(hits) * 12)
        reasons.append(f'Shareability keywords: {", ".join(hits)}.')
    else:
        reasons.append("Missing shareable keywords (how, free, results, story...).")
    if any(w in words for w in ["how", "why", "guide", "template", "framework"]):
        score += 15
        reasons.append("Framed as useful/save-worthy — drives shares.")
    if any(w in words for w in ["vs", "best", "worst", "mistake"]):
        score += 10
        reasons.append("Comparison/opinion angle sparks debate & reposts.")
    return {"score": min(100, score), "reasons": reasons}


def _score_platform_fit(headline: str, body: str, platform: Optional[str]) -> Dict[str, Any]:
    reasons, score = [], 45
    platform = platform or ""
    profile = PLATFORM_PROFILES.get(platform)
    words = _words(f"{headline} {body}")
    hl_len = len(_words(headline))
    if not profile:
        reasons.append("No specific platform selected — generic fit assumed.")
        return {"score": 60, "reasons": reasons}
    if isinstance(profile, tuple):
        prefs, ideal_max, note = profile
    else:
        prefs, ideal_max, note = profile, 16, "platform-native phrasing"
    hits = sorted(set(w for w in words if w in prefs))
    if hits:
        score += min(35, len(hits) * 12)
        reasons.append(f'{platform}-native signals present: {", ".join(hits)}.')
    else:
        reasons.append(f"Add {platform}-native cues ({note}).")
    if hl_len <= ideal_max:
        score += 20
        reasons.append(f"Headline length fits {platform} (≤{ideal_max} words).")
    else:
        score -= 10
        reasons.append(f"Headline is long for {platform} (aim ≤{ideal_max} words).")
    return {"score": max(0, min(100, score)), "reasons": reasons}


def score_angle(headline: str, body: str,
                audience: Optional[Dict[str, Any]] = None,
                platform: Optional[str] = None) -> Dict[str, Any]:
    full = f"{headline}. {body}"
    factors = {
        "hook": _score_hook(headline),
        "emotion": _score_emotion(full),
        "audience_fit": _score_audience_fit(full, audience),
        "shareability": _score_shareability(full),
        "platform_fit": _score_platform_fit(headline, body, platform),
    }
    overall = round(sum(factors[k]["score"] * WEIGHTS[k] for k in WEIGHTS))
    if overall >= 80:
        grade, verdict = "A", "Highly shareable — strong on every factor."
    elif overall >= 65:
        grade, verdict = "B", "Solid launch angle with room to sharpen."
    elif overall >= 50:
        grade, verdict = "C", "Average — tighten the hook and audience fit."
    else:
        grade, verdict = "D", "Weak virality — rework before launching."
    return {
        "overall": overall, "grade": grade, "verdict": verdict, "weights": WEIGHTS,
        "factors": {
            k: {"key": k, "label": FACTOR_LABELS[k], "score": factors[k]["score"],
                "weight": WEIGHTS[k], "reasons": factors[k]["reasons"]}
            for k in WEIGHTS
        },
    }


def _seed_float(seed: str) -> float:
    h = hashlib.sha256(seed.encode()).hexdigest()
    return int(h[:8], 16) / 0xFFFFFFFF


def predict_metrics(score: int, seed: str) -> Dict[str, int]:
    base = 2000 + int(score * 320)
    jitter = 0.85 + _seed_float(seed + "imp") * 0.3
    impressions = int(base * jitter)
    engagement = int(impressions * (0.02 + (score / 100) * 0.08))
    shares = int(impressions * (0.005 + (score / 100) * 0.045))
    conversions = int(impressions * (0.002 + (score / 100) * 0.016))
    return {"impressions": impressions, "engagement": engagement,
            "shares": shares, "conversions": conversions}


def synthetic_outcome(prediction: Dict[str, int], seed: str) -> Dict[str, int]:
    def nudge(val: int, key: str) -> int:
        factor = 0.7 + _seed_float(seed + key) * 0.7
        return max(0, int(val * factor))
    return {k: nudge(prediction[k], k[0]) for k in METRIC_KEYS}


def compute_delta(prediction: Dict[str, int], outcome: Dict[str, int]) -> Dict[str, Any]:
    delta = {}
    for k in METRIC_KEYS:
        pred, real = prediction.get(k, 0), outcome.get(k, 0)
        diff = real - pred
        pct = round((diff / pred) * 100, 1) if pred else 0.0
        delta[k] = {"predicted": pred, "actual": real, "diff": diff, "pct": pct}
    avg_pct = round(sum(delta[k]["pct"] for k in METRIC_KEYS) / len(METRIC_KEYS), 1)
    if avg_pct >= 10:
        verdict = "OVERPERFORMED"
    elif avg_pct <= -10:
        verdict = "UNDERPERFORMED"
    else:
        verdict = "MATCHED"
    delta["_summary"] = {"avg_pct": avg_pct, "verdict": verdict}
    return delta


def learning_note(delta: Dict[str, Any], score: Dict[str, Any]) -> str:
    verdict = delta["_summary"]["verdict"]
    avg_pct = delta["_summary"]["avg_pct"]
    imp_pct = delta["impressions"]["pct"]
    shares_pct = delta["shares"]["pct"]
    conv_pct = delta["conversions"]["pct"]
    weakest = min(score["factors"].items(), key=lambda kv: kv[1]["score"])
    strongest = max(score["factors"].items(), key=lambda kv: kv[1]["score"])

    if verdict == "OVERPERFORMED":
        head = f"Overall this launch OVERPERFORMED — averaging {avg_pct:+.0f}% versus prediction across metrics."
    elif verdict == "UNDERPERFORMED":
        head = f"Overall this launch UNDERPERFORMED — averaging {avg_pct:+.0f}% versus prediction across metrics."
    else:
        head = f"Overall this launch MATCHED the prediction — averaging {avg_pct:+.0f}% across metrics."

    # impressions described with the correct sign
    if imp_pct >= 5:
        imp_note = f" Impressions beat the forecast by {imp_pct:.0f}%."
    elif imp_pct <= -5:
        imp_note = f" Impressions fell short of the forecast by {abs(imp_pct):.0f}%."
    else:
        imp_note = f" Impressions tracked the forecast closely ({imp_pct:+.0f}%)."

    if shares_pct >= 20:
        mid = " Shares outperformed, so the shareability angle landed."
    elif shares_pct <= -20:
        mid = " Shares lagged — the content wasn't repost-worthy enough."
    elif conv_pct >= 20:
        mid = " Conversions beat expectations — the offer resonated."
    else:
        mid = ""

    tip = (f" Next run: double down on your strongest factor ({strongest[1]['label']}, "
           f"{strongest[1]['score']}) and fix the weakest ({weakest[1]['label']}, "
           f"{weakest[1]['score']}).")
    return head + imp_note + mid + tip
