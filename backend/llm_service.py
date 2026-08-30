"""AI angle generation via Gemini 3 Flash (Emergent Universal Key) with caching.

Falls back to deterministic synthetic templates so the full flow works with
no external API available (demo-safe).
"""
import os
import json
import hashlib
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")

GOAL_LABELS = {
    "awareness": "brand awareness & reach",
    "signups": "waitlist / signups",
    "sales": "paid conversions / sales",
    "engagement": "community engagement & discussion",
    "launch": "a big launch-day splash",
}


def _cache_key(product_name, product_desc, goal, platforms, audience) -> str:
    raw = json.dumps({"n": product_name, "d": product_desc, "g": goal,
                      "p": sorted(platforms or []), "a": audience}, sort_keys=True)
    return hashlib.sha256(raw.encode()).hexdigest()


def _synthetic_angles(product_name, product_desc, goal, platforms, audience) -> List[Dict[str, Any]]:
    aud = audience.get("name", "your audience")
    pain = (audience.get("pain_points") or ["wasting time"])[0]
    desire = (audience.get("desires") or ["move faster"])[0]
    plats = platforms or ["Twitter/X", "LinkedIn", "Product Hunt", "Email"]
    templates = [
        {"headline": f"How we built {product_name} to kill {pain} for good",
         "body": f"{product_name} helps {aud} {desire} without the usual grind. Here's the story and the numbers in a short thread.",
         "channel": plats[0 % len(plats)], "format": "Thread"},
        {"headline": f"Stop {pain}. {product_name} does it for you.",
         "body": f"We kept hearing the same problem from {aud}. {product_name} is our answer — {product_desc[:80]}.",
         "channel": plats[1 % len(plats)], "format": "Post"},
        {"headline": f"{product_name} — {desire} in minutes, not weeks",
         "body": f"Launching today: {product_name}. Built for {aud} who want to {desire}. Free to try, no credit card.",
         "channel": plats[2 % len(plats)], "format": "Launch Post"},
        {"headline": f"The {product_name} playbook we wish we had sooner",
         "body": f"3 honest lessons from building {product_name} for {aud}. Steal this framework for your own launch.",
         "channel": plats[3 % len(plats)], "format": "Newsletter"},
    ]
    return templates


async def generate_angles(db, product_name, product_desc, goal, platforms, audience) -> Dict[str, Any]:
    key = _cache_key(product_name, product_desc, goal, platforms, audience)
    cached = await db.angle_cache.find_one({"key": key}, {"_id": 0})
    if cached:
        return {"angles": cached["angles"], "cached": True, "source": cached.get("source", "ai")}

    angles: Optional[List[Dict[str, Any]]] = None
    source = "ai"
    if EMERGENT_LLM_KEY:
        try:
            angles = await _call_llm(product_name, product_desc, goal, platforms, audience)
        except Exception as e:  # noqa
            logger.warning(f"LLM generation failed, using synthetic fallback: {e}")
            angles = None
    if not angles:
        angles = _synthetic_angles(product_name, product_desc, goal, platforms, audience)
        source = "synthetic"

    await db.angle_cache.insert_one({"key": key, "angles": angles, "source": source})
    return {"angles": angles, "cached": False, "source": source}


async def _call_llm(product_name, product_desc, goal, platforms, audience) -> List[Dict[str, Any]]:
    from emergentintegrations.llm.chat import LlmChat, UserMessage

    system = ("You are a world-class growth marketer and launch strategist. "
              "You write punchy, shareable launch angles. "
              "Return ONLY valid JSON, no markdown fences.")
    aud_str = json.dumps(audience, ensure_ascii=False)
    plats = platforms or ["Twitter/X", "LinkedIn", "Product Hunt", "Email"]
    goal_label = GOAL_LABELS.get(goal, goal)
    prompt = f"""Generate 4 distinct launch angles for this product.

Product name: {product_name}
Product description: {product_desc}
Primary goal: {goal_label}
Target platforms: {", ".join(plats)}
Target audience (Audience DNA): {aud_str}

For each angle return: headline (max 12 words, scroll-stopping hook tailored to the platform), body (1-2 sentences of copy), channel (MUST be one of the target platforms), format (e.g. Thread, Post, Launch Post, Newsletter, Story).

Distribute angles across the chosen platforms. Speak to the audience's pain points and desires. Optimise the tone for the primary goal.

Return JSON exactly like:
{{"angles": [{{"headline": "...", "body": "...", "channel": "...", "format": "..."}}]}}"""

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"launchloop-{hashlib.sha256(product_name.encode()).hexdigest()[:8]}",
        system_message=system,
    ).with_model("gemini", "gemini-3-flash-preview")

    resp = await chat.send_message(UserMessage(text=prompt))
    text = (resp if isinstance(resp, str) else str(resp)).strip()
    if text.startswith("```"):
        text = text.split("```", 2)[1]
        if text.startswith("json"):
            text = text[4:]
        text = text.strip("` \n")
    data = json.loads(text)
    cleaned = []
    for a in data.get("angles", [])[:4]:
        cleaned.append({
            "headline": str(a.get("headline", "")).strip(),
            "body": str(a.get("body", "")).strip(),
            "channel": str(a.get("channel", plats[0])).strip(),
            "format": str(a.get("format", "Post")).strip(),
        })
    if not cleaned:
        raise ValueError("Empty angles from LLM")
    return cleaned


# ============================================================
# Deep Analysis (AI second opinion) + Angle Rewrite
# ============================================================
FACTOR_LABELS = {
    "hook": "Hook Strength", "emotion": "Emotional Trigger",
    "audience_fit": "Audience Fit", "shareability": "Shareability",
    "platform_fit": "Platform Fit",
}
FACTOR_KEYS = ["hook", "emotion", "audience_fit", "shareability", "platform_fit"]


async def _gemini_json(system: str, prompt: str, session: str) -> dict:
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=session, system_message=system).with_model(
        "gemini", "gemini-3-flash-preview")
    resp = await chat.send_message(UserMessage(text=prompt))
    text = (resp if isinstance(resp, str) else str(resp)).strip()
    if text.startswith("```"):
        text = text.split("```", 2)[1]
        if text.startswith("json"):
            text = text[4:]
        text = text.strip("` \n")
    return json.loads(text)


def _clamp(v):
    try:
        return max(0, min(100, int(round(float(v)))))
    except Exception:
        return 50


async def deep_analysis(headline, body, audience, goal, platform, heuristic) -> dict:
    """AI second-opinion score. Falls back to a deterministic estimate near the heuristic."""
    weights = heuristic.get("weights", {})
    if EMERGENT_LLM_KEY:
        try:
            system = ("You are a brutally honest senior growth strategist giving a second-opinion "
                      "virality assessment. Return ONLY valid JSON, no markdown.")
            prompt = f"""Independently judge this launch angle for virality. Do NOT just agree with anyone.

Headline: {headline}
Body: {body}
Goal: {goal}
Platform: {platform}
Audience: {json.dumps(audience, ensure_ascii=False)}

Score each factor 0-100: hook, emotion, audience_fit, shareability, platform_fit.
Then give an overall 0-100 and 2-3 concise reasons (each under 20 words).

Return JSON exactly:
{{"overall": 0, "factors": {{"hook":0,"emotion":0,"audience_fit":0,"shareability":0,"platform_fit":0}}, "reasons": ["..."]}}"""
            data = await _gemini_json(system, prompt, f"deep-{hashlib.sha256(headline.encode()).hexdigest()[:8]}")
            factors = {k: _clamp(data.get("factors", {}).get(k, 50)) for k in FACTOR_KEYS}
            overall = _clamp(data.get("overall", sum(factors[k] * weights.get(k, 0.2) for k in FACTOR_KEYS)))
            reasons = [str(r).strip() for r in (data.get("reasons") or [])][:3] or ["AI assessment complete."]
            return {"overall": overall, "factors": factors, "reasons": reasons, "source": "ai"}
        except Exception as e:  # noqa
            logger.warning(f"deep_analysis LLM failed, fallback: {e}")

    # deterministic fallback — a plausible independent opinion near the heuristic
    factors = {}
    for k in FACTOR_KEYS:
        base = heuristic.get("factors", {}).get(k, {}).get("score", 50)
        offset = int((_h01(headline + k) - 0.5) * 24)  # ±12
        factors[k] = _clamp(base + offset)
    overall = _clamp(sum(factors[k] * weights.get(k, 0.2) for k in FACTOR_KEYS))
    strong = max(factors, key=factors.get)
    weak = min(factors, key=factors.get)
    reasons = [
        f"Strongest signal is {FACTOR_LABELS[strong]} — it carries the angle.",
        f"{FACTOR_LABELS[weak]} is the biggest risk and drags virality down.",
    ]
    return {"overall": overall, "factors": factors, "reasons": reasons, "source": "fallback"}


def _h01(seed: str) -> float:
    return int(hashlib.sha256(seed.encode()).hexdigest()[:8], 16) / 0xFFFFFFFF


async def rewrite_angle(headline, body, weak_factor, audience, goal, platform) -> dict:
    """Rewrite ONLY to improve the selected weak factor, preserving product/audience/goal/platform."""
    if EMERGENT_LLM_KEY:
        try:
            system = ("You are an elite launch copywriter. Rewrite a launch angle to specifically improve "
                      "ONE named weakness while preserving product, audience, goal and platform. "
                      "Return ONLY valid JSON, no markdown.")
            prompt = f"""Rewrite this launch angle to specifically improve its {FACTOR_LABELS.get(weak_factor, weak_factor)}.

Original headline: {headline}
Original body: {body}
Goal: {goal}
Platform: {platform}
Audience: {json.dumps(audience, ensure_ascii=False)}

Keep the same product, audience, goal and platform. Improve ONLY {FACTOR_LABELS.get(weak_factor, weak_factor)}.
Headline max 12 words.

Return JSON exactly:
{{"headline":"...","body":"...","what_changed":"one sentence on what you changed"}}"""
            data = await _gemini_json(system, prompt, f"rw-{hashlib.sha256((headline+weak_factor).encode()).hexdigest()[:8]}")
            return {"headline": str(data.get("headline", headline)).strip(),
                    "body": str(data.get("body", body)).strip(),
                    "what_changed": str(data.get("what_changed", "Refined the copy.")).strip(),
                    "source": "ai"}
        except Exception as e:  # noqa
            logger.warning(f"rewrite LLM failed, fallback: {e}")

    return _fallback_rewrite(headline, body, weak_factor, audience, platform)


def _fallback_rewrite(headline, body, weak_factor, audience, platform):
    aud = audience or {}
    name = aud.get("name", "Founders")
    pain = (aud.get("pain_points") or ["wasting time"])[0]
    desire = (aud.get("desires") or ["move faster"])[0]
    hl = headline.strip().rstrip(".")
    if weak_factor == "audience_fit":
        new_hl = f"{name}: stop {pain}"
        changed = f"Added a specific audience identity ({name}) and their pain point ({pain})."
    elif weak_factor == "hook":
        new_hl = f"How we fixed {pain} in 3 steps"
        changed = "Added a curiosity 'How' opener and a concrete number to sharpen the hook."
    elif weak_factor == "emotion":
        new_hl = f"You're not failing — {hl.lower()} is the honest fix"
        changed = "Spoke directly to 'you' and added an honest, emotional framing."
    elif weak_factor == "shareability":
        new_hl = f"How to {desire} — the free playbook"
        changed = "Framed it as a save-worthy 'how' guide with a free hook to drive shares."
    else:  # platform_fit
        cue = {"Twitter/X": "a thread", "LinkedIn": "the lessons", "Product Hunt": "launching today",
               "Email": "inside", "Reddit": "an honest story"}.get(platform, "the breakdown")
        new_hl = f"{hl} — {cue}"
        changed = f"Added a {platform or 'platform'}-native cue to fit where it's posted."
    new_body = f"{name} who want to {desire}: {body.strip()}"
    return {"headline": new_hl[:90], "body": new_body, "what_changed": changed, "source": "fallback"}
