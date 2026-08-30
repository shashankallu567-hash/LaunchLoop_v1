"""Iteration 7 targeted regression tests for code-review fixes:
- seed.py env-based demo credentials (demo login must still work)
- llm_service.py md5->sha256 session ids (caching behaviour unchanged)
- server.py _build_comparison `difference` default always present/non-empty
- virality.learning_note sign-consistency vs delta.impressions.pct
"""
import os
import re
import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/")

DEMO_EMAIL = "demo@launchloop.ai"
DEMO_PASSWORD = "demo1234"


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def auth(client):
    r = client.post(f"{BASE_URL}/api/auth/demo", timeout=60)
    assert r.status_code == 200, r.text
    tok = r.json().get("access_token")
    assert tok
    return {"Authorization": f"Bearer {tok}"}


# ---------- seed.py env credential change ----------
class TestDemoCredentials:
    def test_demo_endpoint_returns_token(self, client):
        r = client.post(f"{BASE_URL}/api/auth/demo", timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        assert isinstance(d.get("access_token"), str) and len(d["access_token"]) > 20
        assert d["user"]["email"] == DEMO_EMAIL
        assert d["user"].get("is_demo") is True

    def test_demo_password_login_still_works(self, client):
        r = client.post(f"{BASE_URL}/api/auth/login",
                        json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD}, timeout=60)
        assert r.status_code == 200, r.text
        assert r.json()["user"]["email"] == DEMO_EMAIL

    def test_demo_wrong_password_rejected(self, client):
        r = client.post(f"{BASE_URL}/api/auth/login",
                        json={"email": DEMO_EMAIL, "password": "wrong-pass"}, timeout=60)
        assert r.status_code in (400, 401), r.text

    def test_seeded_demo_data_intact(self, client, auth):
        a = client.get(f"{BASE_URL}/api/audiences", headers=auth, timeout=60)
        c = client.get(f"{BASE_URL}/api/campaigns", headers=auth, timeout=60)
        assert a.status_code == 200 and c.status_code == 200
        assert len(a.json()) >= 2
        assert len(c.json()) >= 3


# ---------- llm_service sha256 session ids: caching unchanged ----------
class TestGenerationCaching:
    def test_repeat_generate_is_cached(self, client, auth):
        payload = {"product_name": "TEST_CacheProbe7",
                   "product_description": "A deterministic caching probe product for sha256 session id regression.",
                   "goal": "awareness", "platforms": ["Twitter/X"]}
        r1 = client.post(f"{BASE_URL}/api/generate", json=payload, headers=auth, timeout=180)
        assert r1.status_code == 200, r1.text
        d1 = r1.json()
        assert len(d1["angles"]) == 4
        for a in d1["angles"]:
            assert set(a["score"]["factors"].keys()) == {
                "hook", "emotion", "audience_fit", "shareability", "platform_fit"}

        r2 = client.post(f"{BASE_URL}/api/generate", json=payload, headers=auth, timeout=180)
        assert r2.status_code == 200, r2.text
        d2 = r2.json()
        assert d2.get("cached") is True, f"second identical call not cached: {d2.get('cached')}"
        assert [a["headline"] for a in d2["angles"]] == [a["headline"] for a in d1["angles"]]


# ---------- _build_comparison difference default ----------
COMPARISON_CASES = [
    {"headline": "How we grew 10x", "body": "A story about growth", "platform": "Twitter/X"},
    {"headline": "", "body": "", "platform": "Twitter/X"},
    {"headline": "x", "body": "", "platform": None},
    {"headline": "Stop losing deals to messy pipelines. Here is the free proven fix you need now.",
     "body": "Amazing shocking results — steal our framework. Why nobody tells you this.",
     "platform": "LinkedIn"},
]


class TestDeepAnalysisComparison:
    @pytest.mark.parametrize("case", COMPARISON_CASES)
    def test_comparison_always_has_difference_and_agreement(self, client, auth, case):
        r = client.post(f"{BASE_URL}/api/deep-analysis", json={
            "headline": case["headline"], "body": case["body"],
            "goal": "awareness", "platform": case["platform"]}, headers=auth, timeout=180)
        assert r.status_code == 200, r.text
        d = r.json()
        assert set(["heuristic", "ai", "comparison"]).issubset(d.keys())
        comp = d["comparison"]
        assert isinstance(comp.get("agreement"), str) and comp["agreement"].strip()
        assert isinstance(comp.get("difference"), str) and comp["difference"].strip()
        assert isinstance(comp.get("overall_diff"), int)
        assert len(comp["factor_diffs"]) == 5

    def test_campaign_deep_analysis_comparison(self, client, auth):
        camps = client.get(f"{BASE_URL}/api/campaigns", headers=auth, timeout=60).json()
        cid = camps[0]["id"]
        r = client.post(f"{BASE_URL}/api/campaigns/{cid}/deep-analysis", headers=auth, timeout=180)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["comparison"]["difference"].strip()
        assert d["comparison"]["agreement"].strip()
        # persisted and exposed via public report
        rep = requests.get(f"{BASE_URL}/api/report/{cid}", timeout=60)
        assert rep.status_code == 200
        da = rep.json().get("deep_analysis")
        assert da and da["comparison"]["difference"].strip()


# ---------- learning note sign consistency ----------
def _assert_learning_consistent(learning: str, imp_pct: float):
    beat = "beat the forecast" in learning
    fell = "fell short of the forecast" in learning
    tracked = "tracked the forecast closely" in learning
    assert beat or fell or tracked, f"no impressions clause in learning: {learning}"
    if imp_pct >= 5:
        assert beat, f"imp_pct={imp_pct} but learning says: {learning}"
    elif imp_pct <= -5:
        assert fell, f"imp_pct={imp_pct} but learning says: {learning}"
    else:
        assert tracked, f"imp_pct={imp_pct} but learning says: {learning}"
    # no contradictory percentage sign in the impressions clause
    m = re.search(r"Impressions (beat the forecast by|fell short of the forecast by) (\d+)%", learning)
    if m:
        assert abs(round(abs(imp_pct))) - int(m.group(2)) in (-1, 0, 1), \
            f"reported pct {m.group(2)} vs actual {imp_pct}: {learning}"


class TestLearningNoteConsistency:
    created = []

    @pytest.mark.parametrize("idx,real", [
        (0, None),                                                   # synthetic
        (1, {"impressions": 1000, "engagement": 900, "shares": 800, "conversions": 700}),   # imp crash
        (2, {"impressions": 900000, "engagement": 100, "shares": 50, "conversions": 5}),    # imp spike
        (3, {"impressions": 20000, "engagement": 1500, "shares": 700, "conversions": 250}), # mixed
    ])
    def test_learning_sign_matches_impressions_delta(self, client, auth, idx, real):
        payload = {
            "product_name": f"TEST_Learning7_{idx}",
            "product_description": "Sign consistency probe for learning notes.",
            "goal": "awareness", "platforms": ["Twitter/X"],
            "angle": {"headline": "How we cut churn by 40% — the honest story",
                      "body": "You can steal our free framework. Here is why it worked.",
                      "channel": "Twitter/X", "format": "Thread"},
        }
        r = client.post(f"{BASE_URL}/api/campaigns", json=payload, headers=auth, timeout=120)
        assert r.status_code in (200, 201), r.text
        camp = r.json()
        assert "_id" not in camp
        cid = camp["id"]
        TestLearningNoteConsistency.created.append(cid)

        assert camp["prediction"] and camp["outcome"] and camp["delta"]
        assert camp["delta"]["_summary"]["verdict"] in ("OVERPERFORMED", "UNDERPERFORMED", "MATCHED")
        _assert_learning_consistent(camp["learning"], camp["delta"]["impressions"]["pct"])

        if real:
            r2 = client.post(f"{BASE_URL}/api/campaigns/{cid}/outcome",
                             json=real, headers=auth, timeout=120)
            assert r2.status_code == 200, r2.text
            d2 = r2.json()
            assert d2["outcome_source"] == "real"
            assert d2["outcome"]["impressions"] == real["impressions"]
            _assert_learning_consistent(d2["learning"], d2["delta"]["impressions"]["pct"])
            # verify persistence
            g = client.get(f"{BASE_URL}/api/campaigns/{cid}", headers=auth, timeout=60)
            assert g.status_code == 200
            gd = g.json()
            assert gd["learning"] == d2["learning"]
            assert gd["delta"]["impressions"]["pct"] == d2["delta"]["impressions"]["pct"]

    def test_resynth_learning_consistent(self, client, auth):
        assert TestLearningNoteConsistency.created, "no campaign created"
        cid = TestLearningNoteConsistency.created[0]
        r = client.post(f"{BASE_URL}/api/campaigns/{cid}/resynth", headers=auth, timeout=120)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["outcome_source"] == "synthetic"
        _assert_learning_consistent(d["learning"], d["delta"]["impressions"]["pct"])


@pytest.fixture(scope="module", autouse=True)
def cleanup(client, auth):
    yield
    for cid in TestLearningNoteConsistency.created:
        requests.delete(f"{BASE_URL}/api/campaigns/{cid}", headers=auth, timeout=60)
