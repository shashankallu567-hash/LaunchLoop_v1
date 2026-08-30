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
        session_id=f"launchloop-{hashlib.md5(product_name.encode()).hexdigest()[:8]}",
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
