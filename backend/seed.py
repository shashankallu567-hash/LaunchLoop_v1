"""Idempotent seeding: demo user, audience profiles, sample campaigns, leaderboard."""
import os
import logging
from datetime import datetime, timezone, timedelta
from auth import hash_password, verify_password
from models import new_id, now_iso
import virality

logger = logging.getLogger(__name__)

# Demo account credentials (public by design; overridable via env for non-demo deployments).
DEMO_EMAIL = os.environ.get("DEMO_EMAIL", "demo@launchloop.ai")
DEMO_PASSWORD = os.environ.get("DEMO_PASSWORD", "demo1234")

LEADERBOARD_SEED = [
    ("Notion AI Autopilot", "How we automated 80% of our docs — and the results shocked us", "Twitter/X", 92),
    ("Linear for Sales", "Stop losing deals to messy pipelines. Here's the fix.", "LinkedIn", 88),
    ("Cursor for Designers", "The design tool that writes its own components", "Product Hunt", 85),
    ("Superhuman Rivals", "Why we deleted our inbox and built this instead", "Twitter/X", 83),
    ("Retool Weekend Hack", "We shipped an internal tool in 47 minutes. Steal our playbook.", "Email", 79),
    ("Framer Motion Kit", "The animation framework everyone's copying", "Reddit", 76),
    ("Vercel Ship Fast", "0 to production in one coffee. New template drop.", "Product Hunt", 74),
    ("Posthog Growth Loop", "The growth metric nobody tracks (but should)", "LinkedIn", 71),
    ("Raycast Extensions", "10 shortcuts that gave me back 6 hours a week", "Twitter/X", 68),
    ("Supabase Launch Week", "We open-sourced our entire backend. Here's why.", "Reddit", 64),
]


async def seed_all(db) -> None:
    try:
        await db.users.create_index("email", unique=True)
        await db.users.create_index("id", unique=True)
        await db.campaigns.create_index("user_id")
        await db.audience_profiles.create_index("user_id")
        await db.angle_cache.create_index("key", unique=True)
    except Exception as e:  # noqa
        logger.warning(f"index creation: {e}")

    user = await db.users.find_one({"email": DEMO_EMAIL})
    if not user:
        user_id = new_id()
        await db.users.insert_one({
            "id": user_id, "email": DEMO_EMAIL,
            "password_hash": hash_password(DEMO_PASSWORD),
            "name": "Demo Founder", "is_demo": True, "created_at": now_iso(),
        })
        logger.info("Seeded demo user")
    else:
        user_id = user["id"]
        # idempotently refresh the demo password hash if the env value changed
        if not verify_password(DEMO_PASSWORD, user["password_hash"]):
            await db.users.update_one({"id": user_id}, {"$set": {"password_hash": hash_password(DEMO_PASSWORD)}})
            logger.info("Refreshed demo user password hash")

    if await db.audience_profiles.count_documents({"user_id": user_id}) == 0:
        profiles = [
            {
                "id": new_id(), "user_id": user_id,
                "name": "Indie SaaS Founders",
                "description": "Solo & small-team founders shipping B2B SaaS on nights and weekends.",
                "demographics": "25-40, technical, US/EU, Twitter-native",
                "motivations": ["build in public", "financial freedom", "prove the idea works"],
                "pain_points": ["no time for marketing", "launches that flop", "no audience yet"],
                "interests": ["indie hacking", "no-code", "growth experiments", "AI tools"],
                "desires": ["ship faster", "get first 100 users", "recurring revenue"],
                "content_triggers": ["revenue screenshots", "build logs", "honest failures"],
                "channels": ["Twitter/X", "Product Hunt", "Reddit"],
                "sharing_behavior": "Retweets tactical threads and transparent revenue/build stories.",
                "tone": "confident, no-fluff",
                "created_at": now_iso(), "updated_at": now_iso(),
            },
            {
                "id": new_id(), "user_id": user_id,
                "name": "Growth Marketers",
                "description": "In-house growth & product marketing leads at Series A-B startups.",
                "demographics": "28-45, data-driven, LinkedIn active",
                "motivations": ["career credibility", "hit growth targets", "look ahead of peers"],
                "pain_points": ["proving ROI", "channel saturation", "creative fatigue"],
                "interests": ["attribution", "lifecycle marketing", "case studies", "benchmarks"],
                "desires": ["repeatable growth loops", "lower CAC", "standout campaigns"],
                "content_triggers": ["benchmark data", "teardown posts", "contrarian takes"],
                "channels": ["LinkedIn", "Email", "Newsletter"],
                "sharing_behavior": "Shares data-backed teardowns and frameworks with their network.",
                "tone": "analytical, credible",
                "created_at": now_iso(), "updated_at": now_iso(),
            },
        ]
        await db.audience_profiles.insert_many([dict(p) for p in profiles])
        first_audience = {k: v for k, v in profiles[0].items()}
        logger.info("Seeded audience profiles")
    else:
        first_audience = await db.audience_profiles.find_one({"user_id": user_id}, {"_id": 0})

    if await db.campaigns.count_documents({"user_id": user_id}) == 0:
        samples = [
            ("DevFlow", "AI pair-programmer that reviews your PRs in seconds",
             "How we cut PR review time by 70% — a thread", "Twitter/X", "Thread", "awareness"),
            ("InboxZero AI", "An assistant that clears your inbox while you sleep",
             "Stop drowning in email. InboxZero AI does it for you.", "LinkedIn", "Post", "signups"),
            ("ShipKit", "Production-ready SaaS boilerplate for indie founders",
             "0 to launch in one weekend — new ShipKit template drop", "Product Hunt", "Launch Post", "launch"),
        ]
        for i, (name, desc, headline, channel, fmt, goal) in enumerate(samples):
            aud = {k: v for k, v in (first_audience or {}).items() if k != "_id"}
            angle = {"id": new_id(), "headline": headline,
                     "body": f"{desc}. Built for founders who want results.",
                     "channel": channel, "format": fmt}
            score = virality.score_angle(angle["headline"], angle["body"], aud, channel)
            seed = f"sample-{i}-{name}"
            prediction = virality.predict_metrics(score["overall"], seed)
            outcome = virality.synthetic_outcome(prediction, seed)
            delta = virality.compute_delta(prediction, outcome)
            learning = virality.learning_note(delta, score)
            created = (datetime.now(timezone.utc) - timedelta(days=(len(samples) - i) * 4)).isoformat()
            await db.campaigns.insert_one({
                "id": new_id(), "user_id": user_id,
                "product_name": name, "product_description": desc,
                "goal": goal, "platforms": [channel],
                "audience_id": aud.get("id"), "audience_snapshot": aud,
                "angle": angle, "score": score, "prediction": prediction,
                "outcome": outcome, "outcome_source": "synthetic",
                "delta": delta, "learning": learning, "created_at": created,
            })
        logger.info("Seeded sample campaigns")

    if await db.leaderboard_seed.count_documents({}) == 0:
        docs = []
        founders = ["Alex R.", "Priya S.", "Marcus T.", "Lena K.", "Dev P.",
                    "Sara M.", "Tom W.", "Nina B.", "Omar F.", "Chloe D."]
        for i, (product, headline, channel, base) in enumerate(LEADERBOARD_SEED):
            seed = f"lb-{i}-{product}"
            prediction = virality.predict_metrics(base, seed)
            outcome = virality.synthetic_outcome(prediction, seed)
            docs.append({
                "id": new_id(), "product_name": product, "founder": founders[i % len(founders)],
                "headline": headline, "channel": channel, "score": base,
                "impressions": outcome["impressions"], "shares": outcome["shares"],
                "conversions": outcome["conversions"],
                "created_at": (datetime.now(timezone.utc) - timedelta(days=i)).isoformat(),
            })
        await db.leaderboard_seed.insert_many(docs)
        logger.info("Seeded leaderboard")
