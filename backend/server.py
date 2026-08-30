from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import logging
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient

import auth as auth_mod
import virality
import llm_service
import seed as seed_mod
from models import (
    UserCreate, UserLogin, AudienceProfileCreate, AudienceProfile,
    GenerateRequest, CampaignCreate, OutcomeOverride, new_id, now_iso,
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="LaunchLoop AI")
api = APIRouter(prefix="/api")

get_current_user = auth_mod.make_current_user_dep(db)


async def _resolve_audience(user_id, audience_id, audience_inline):
    if audience_id:
        aud = await db.audience_profiles.find_one({"id": audience_id, "user_id": user_id}, {"_id": 0})
        if aud:
            return aud
    if audience_inline:
        return audience_inline
    return {"name": "General audience", "pain_points": [], "desires": []}


@api.get("/")
async def root():
    return {"message": "LaunchLoop AI API", "status": "ok"}


# ---------------- auth ----------------
@api.post("/auth/register")
async def register(payload: UserCreate):
    email = payload.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = new_id()
    name = payload.name or email.split("@")[0].title()
    await db.users.insert_one({
        "id": user_id, "email": email,
        "password_hash": auth_mod.hash_password(payload.password),
        "name": name, "is_demo": False, "created_at": now_iso(),
    })
    token = auth_mod.create_access_token(user_id, email)
    return {"access_token": token, "user": {"id": user_id, "email": email, "name": name, "is_demo": False}}


@api.post("/auth/login")
async def login(payload: UserLogin):
    email = payload.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not auth_mod.verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = auth_mod.create_access_token(user["id"], email)
    return {"access_token": token, "user": {"id": user["id"], "email": email, "name": user["name"], "is_demo": user.get("is_demo", False)}}


@api.post("/auth/demo")
async def demo_login():
    user = await db.users.find_one({"email": seed_mod.DEMO_EMAIL})
    if not user:
        raise HTTPException(status_code=500, detail="Demo user not seeded")
    token = auth_mod.create_access_token(user["id"], user["email"])
    return {"access_token": token, "user": {"id": user["id"], "email": user["email"], "name": user["name"], "is_demo": True}}


@api.get("/auth/me")
async def me(current=Depends(get_current_user)):
    return current


# ---------------- audience DNA ----------------
@api.get("/audiences")
async def list_audiences(current=Depends(get_current_user)):
    return await db.audience_profiles.find({"user_id": current["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)


@api.post("/audiences")
async def create_audience(payload: AudienceProfileCreate, current=Depends(get_current_user)):
    profile = AudienceProfile(user_id=current["id"], **payload.model_dump())
    await db.audience_profiles.insert_one(profile.model_dump())
    return profile.model_dump()


@api.put("/audiences/{audience_id}")
async def update_audience(audience_id: str, payload: AudienceProfileCreate, current=Depends(get_current_user)):
    existing = await db.audience_profiles.find_one({"id": audience_id, "user_id": current["id"]})
    if not existing:
        raise HTTPException(status_code=404, detail="Audience not found")
    update = payload.model_dump()
    update["updated_at"] = now_iso()
    await db.audience_profiles.update_one({"id": audience_id}, {"$set": update})
    return await db.audience_profiles.find_one({"id": audience_id}, {"_id": 0})


@api.delete("/audiences/{audience_id}")
async def delete_audience(audience_id: str, current=Depends(get_current_user)):
    res = await db.audience_profiles.delete_one({"id": audience_id, "user_id": current["id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Audience not found")
    return {"ok": True}


@api.post("/audiences/refresh")
async def refresh_audience(payload: dict, current=Depends(get_current_user)):
    name = payload.get("name", "your audience")
    out = {
        "motivations": list(dict.fromkeys((payload.get("motivations") or []) + ["quick visible wins", "peer credibility"]))[:6],
        "pain_points": list(dict.fromkeys((payload.get("pain_points") or []) + [f"hard to reach {name} at scale", "trust barrier for new tools"]))[:6],
        "interests": list(dict.fromkeys((payload.get("interests") or []) + ["case studies", "AI tools"]))[:6],
        "desires": list(dict.fromkeys((payload.get("desires") or []) + ["fast results", "social proof"]))[:6],
        "content_triggers": list(dict.fromkeys((payload.get("content_triggers") or []) + ["real numbers", "honest stories"]))[:6],
        "channels": list(dict.fromkeys((payload.get("channels") or []) + ["Twitter/X"]))[:6],
        "note": f"Sharpen the tone for {name}: lead with a concrete outcome and one proof point.",
    }
    return out


# ---------------- generate (Launch Twin) ----------------
@api.post("/generate")
async def generate(payload: GenerateRequest, current=Depends(get_current_user)):
    audience = await _resolve_audience(current["id"], payload.audience_id, payload.audience_inline)
    result = await llm_service.generate_angles(
        db, payload.product_name, payload.product_description,
        payload.goal, payload.platforms, audience,
    )
    angles = []
    for a in result["angles"]:
        score = virality.score_angle(a["headline"], a["body"], audience, a.get("channel"))
        angles.append({**a, "id": a.get("id") or new_id(), "score": score})
    return {"angles": angles, "cached": result["cached"], "source": result["source"], "audience": audience}


@api.post("/score")
async def score_text(payload: dict, current=Depends(get_current_user)):
    return virality.score_angle(payload.get("headline", ""), payload.get("body", ""),
                                payload.get("audience"), payload.get("platform"))


def _build_comparison(heuristic, ai):
    hf = {k: heuristic["factors"][k]["score"] for k in heuristic["factors"]}
    af = ai["factors"]
    factor_diffs = []
    for k in hf:
        factor_diffs.append({"key": k, "label": heuristic["factors"][k]["label"],
                             "heuristic": hf[k], "ai": af.get(k, hf[k]), "diff": af.get(k, hf[k]) - hf[k]})
    agree = [d for d in factor_diffs if d["heuristic"] >= 70 and d["ai"] >= 70 and abs(d["diff"]) <= 12]
    if agree:
        names = " and ".join(d["label"] for d in agree[:2])
        agreement = f"Both methods strongly agree that {names} {'are' if len(agree) > 1 else 'is'} strong."
    else:
        close = [d for d in factor_diffs if abs(d["diff"]) <= 10]
        agreement = (f"Both methods land within a few points on {', '.join(d['label'] for d in close[:2])}."
                     if close else "The two methods take noticeably different views across the board.")
    biggest = max(factor_diffs, key=lambda d: abs(d["diff"]))
    if biggest["diff"] < 0:
        difference = f"AI is less confident in {biggest['label']} (heuristic {biggest['heuristic']} vs AI {biggest['ai']}) — the message may be too broad."
    elif biggest["diff"] > 0:
        difference = f"AI rates {biggest['label']} higher than the heuristic (heuristic {biggest['heuristic']} vs AI {biggest['ai']})."
    else:
        difference = "AI and the heuristic are closely aligned on every factor."
    return {"overall_diff": ai["overall"] - heuristic["overall"], "agreement": agreement,
            "difference": difference, "factor_diffs": factor_diffs}


@api.post("/deep-analysis")
async def deep_analysis_ep(payload: dict, current=Depends(get_current_user)):
    headline = payload.get("headline", "")
    body = payload.get("body", "")
    audience = payload.get("audience")
    goal = payload.get("goal", "awareness")
    platform = payload.get("platform")
    heuristic = payload.get("heuristic")
    if not isinstance(heuristic, dict) or len(heuristic.get("factors", {})) != 5:
        heuristic = virality.score_angle(headline, body, audience, platform)
    ai = await llm_service.deep_analysis(headline, body, audience, goal, platform, heuristic)
    return {"heuristic": heuristic, "ai": ai, "comparison": _build_comparison(heuristic, ai)}


@api.post("/rewrite")
async def rewrite_ep(payload: dict, current=Depends(get_current_user)):
    headline = payload.get("headline", "")
    body = payload.get("body", "")
    weak_factor = payload.get("weak_factor", "hook")
    audience = payload.get("audience")
    goal = payload.get("goal", "awareness")
    platform = payload.get("platform")
    before = payload.get("before_score") or virality.score_angle(headline, body, audience, platform)
    rw = await llm_service.rewrite_angle(headline, body, weak_factor, audience, goal, platform)
    after = virality.score_angle(rw["headline"], rw["body"], audience, platform)
    return {
        "weak_factor": weak_factor, "source": rw["source"], "what_changed": rw["what_changed"],
        "original": {"headline": headline, "body": body, "score": before},
        "improved": {"headline": rw["headline"], "body": rw["body"], "score": after},
    }


# ---------------- campaigns ----------------
@api.post("/campaigns")
async def create_campaign(payload: CampaignCreate, current=Depends(get_current_user)):
    audience = payload.audience_snapshot or await _resolve_audience(current["id"], payload.audience_id, None)
    angle = payload.angle
    score = angle.get("score") or virality.score_angle(angle["headline"], angle["body"], audience, angle.get("channel"))
    cid = new_id()
    prediction = virality.predict_metrics(score["overall"], cid)
    outcome = virality.synthetic_outcome(prediction, cid)
    delta = virality.compute_delta(prediction, outcome)
    learning = virality.learning_note(delta, score)
    doc = {
        "id": cid, "user_id": current["id"],
        "product_name": payload.product_name, "product_description": payload.product_description,
        "goal": payload.goal, "platforms": payload.platforms,
        "audience_id": payload.audience_id, "audience_snapshot": audience,
        "angle": angle, "score": score, "prediction": prediction,
        "outcome": outcome, "outcome_source": "synthetic",
        "delta": delta, "learning": learning, "created_at": now_iso(),
    }
    await db.campaigns.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/campaigns")
async def list_campaigns(current=Depends(get_current_user)):
    return await db.campaigns.find({"user_id": current["id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)


@api.get("/campaigns/{campaign_id}")
async def get_campaign(campaign_id: str, current=Depends(get_current_user)):
    doc = await db.campaigns.find_one({"id": campaign_id, "user_id": current["id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return doc


@api.post("/campaigns/{campaign_id}/outcome")
async def set_outcome(campaign_id: str, payload: OutcomeOverride, current=Depends(get_current_user)):
    doc = await db.campaigns.find_one({"id": campaign_id, "user_id": current["id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Campaign not found")
    outcome = payload.model_dump()
    delta = virality.compute_delta(doc["prediction"], outcome)
    learning = virality.learning_note(delta, doc["score"])
    await db.campaigns.update_one({"id": campaign_id}, {"$set": {
        "outcome": outcome, "outcome_source": "real", "delta": delta, "learning": learning}})
    return await db.campaigns.find_one({"id": campaign_id}, {"_id": 0})


@api.post("/campaigns/{campaign_id}/resynth")
async def resynth_outcome(campaign_id: str, current=Depends(get_current_user)):
    doc = await db.campaigns.find_one({"id": campaign_id, "user_id": current["id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Campaign not found")
    import uuid
    outcome = virality.synthetic_outcome(doc["prediction"], campaign_id + uuid.uuid4().hex[:6])
    delta = virality.compute_delta(doc["prediction"], outcome)
    learning = virality.learning_note(delta, doc["score"])
    await db.campaigns.update_one({"id": campaign_id}, {"$set": {
        "outcome": outcome, "outcome_source": "synthetic", "delta": delta, "learning": learning}})
    return await db.campaigns.find_one({"id": campaign_id}, {"_id": 0})


@api.post("/campaigns/{campaign_id}/deep-analysis")
async def campaign_deep_analysis(campaign_id: str, current=Depends(get_current_user)):
    doc = await db.campaigns.find_one({"id": campaign_id, "user_id": current["id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Campaign not found")
    heuristic = doc.get("score")
    angle = doc.get("angle")
    if not heuristic or not angle:
        raise HTTPException(status_code=400, detail="Campaign has no scored angle")
    ai = await llm_service.deep_analysis(
        angle["headline"], angle["body"], doc.get("audience_snapshot"),
        doc.get("goal", "awareness"), angle.get("channel"), heuristic,
    )
    payload = {"heuristic": heuristic, "ai": ai, "comparison": _build_comparison(heuristic, ai)}
    await db.campaigns.update_one({"id": campaign_id}, {"$set": {"deep_analysis": payload}})
    return payload


@api.delete("/campaigns/{campaign_id}")
async def delete_campaign(campaign_id: str, current=Depends(get_current_user)):
    res = await db.campaigns.delete_one({"id": campaign_id, "user_id": current["id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return {"ok": True}


# ---------------- shareable report (public) ----------------
@api.get("/report/{campaign_id}")
async def public_report(campaign_id: str):
    doc = await db.campaigns.find_one({"id": campaign_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Report not found")
    owner = await db.users.find_one({"id": doc["user_id"]}, {"_id": 0, "name": 1})
    doc.pop("_id", None)
    doc.pop("user_id", None)
    doc["founder"] = owner.get("name", "A founder") if owner else "A founder"
    return doc


# ---------------- leaderboard ----------------
def _mine_entry(c, name):
    oc = c.get("outcome") or {}
    return {
        "id": c["id"], "product_name": c["product_name"], "founder": name,
        "headline": c["angle"]["headline"], "channel": c["angle"]["channel"],
        "score": c["score"]["overall"], "impressions": oc.get("impressions", 0),
        "shares": oc.get("shares", 0), "conversions": oc.get("conversions", 0), "mine": True,
    }


@api.get("/leaderboard")
async def leaderboard(scope: str = "global", current=Depends(get_current_user)):
    entries = []
    if scope == "mine":
        camps = await db.campaigns.find({"user_id": current["id"]}, {"_id": 0}).to_list(500)
        entries = [_mine_entry(c, current["name"]) for c in camps]
    else:
        seeds = await db.leaderboard_seed.find({}, {"_id": 0}).to_list(200)
        entries = [{**s, "mine": False} for s in seeds]
        camps = await db.campaigns.find({"user_id": current["id"]}, {"_id": 0}).to_list(500)
        entries += [_mine_entry(c, current["name"]) for c in camps]
    entries.sort(key=lambda e: e["score"], reverse=True)
    for i, e in enumerate(entries):
        e["rank"] = i + 1
    return entries


# ---------------- analytics ----------------
@api.get("/analytics")
async def analytics(current=Depends(get_current_user)):
    camps = await db.campaigns.find({"user_id": current["id"]}, {"_id": 0}).sort("created_at", 1).to_list(500)
    if not camps:
        return {"empty": True}

    score_trend = [{"name": c["product_name"], "date": c["created_at"][:10], "score": c["score"]["overall"]} for c in camps]

    pred_vs_real, accuracy_trend = [], []
    for c in camps:
        if c.get("delta"):
            imp = c["delta"]["impressions"]
            acc = max(0, round(100 - abs(c["delta"]["_summary"]["avg_pct"]), 1))
            accuracy_trend.append({"name": c["product_name"], "date": c["created_at"][:10], "accuracy": acc})
            pred_vs_real.append({"name": c["product_name"][:12], "predicted": imp["predicted"], "actual": imp["actual"]})

    top_angles = sorted(camps, key=lambda c: c["score"]["overall"], reverse=True)[:5]
    top = [{"headline": c["angle"]["headline"], "channel": c["angle"]["channel"],
            "score": c["score"]["overall"], "id": c["id"]} for c in top_angles]

    factor_keys = ["hook", "emotion", "audience_fit", "shareability", "platform_fit"]
    factor_avg = {}
    for k in factor_keys:
        vals = [c["score"]["factors"][k]["score"] for c in camps if k in c["score"]["factors"]]
        factor_avg[k] = round(sum(vals) / len(vals)) if vals else 0

    # best platform by avg impressions
    plat_stats = {}
    for c in camps:
        ch = c["angle"]["channel"]
        oc = c.get("outcome") or {}
        plat_stats.setdefault(ch, []).append(oc.get("impressions", 0))
    platform_perf = [{"platform": ch, "impressions": round(sum(v) / len(v))} for ch, v in plat_stats.items()]
    platform_perf.sort(key=lambda p: p["impressions"], reverse=True)
    best_platform = platform_perf[0]["platform"] if platform_perf else None

    best_angle = top[0] if top else None
    avg_score = round(sum(c["score"]["overall"] for c in camps) / len(camps))
    avg_acc = round(sum(a["accuracy"] for a in accuracy_trend) / len(accuracy_trend)) if accuracy_trend else 0
    total_impressions = sum((c.get("outcome") or {}).get("impressions", 0) for c in camps)

    return {
        "empty": False,
        "totals": {"campaigns": len(camps), "avg_score": avg_score,
                   "avg_accuracy": avg_acc, "total_impressions": total_impressions,
                   "best_platform": best_platform},
        "score_trend": score_trend,
        "accuracy_trend": accuracy_trend,
        "pred_vs_real": pred_vs_real,
        "top_angles": top,
        "best_angle": best_angle,
        "platform_perf": platform_perf,
        "factor_avg": [{"factor": {"hook": "Hook", "emotion": "Emotion", "audience_fit": "Audience Fit",
                                   "shareability": "Shareability", "platform_fit": "Platform Fit"}[k],
                        "value": factor_avg[k]} for k in factor_keys],
    }


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await seed_mod.seed_all(db)
    logger.info("LaunchLoop AI startup complete")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
