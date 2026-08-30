"""Tests for iteration-2 AI features: POST /api/deep-analysis and POST /api/rewrite."""
import os
import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/")
API = f"{BASE_URL}/api"

FACTOR_KEYS = ["hook", "emotion", "audience_fit", "shareability", "platform_fit"]

SAMPLE = {
    "headline": "We shipped a tool nobody asked for",
    "body": "It turns out indie founders hate writing launch copy. So we built LaunchLoop to do it in one click.",
    "audience": {"name": "Indie SaaS founders", "pain_points": ["no time for marketing"],
                 "desires": ["ship faster"], "channels": ["Twitter/X"],
                 "content_triggers": ["real numbers"]},
    "goal": "signups",
    "platform": "Twitter/X",
}


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def auth(client):
    r = client.post(f"{API}/auth/demo", timeout=30)
    if r.status_code != 200:
        pytest.fail(f"demo login failed {r.status_code}: {r.text[:300]}")
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture(scope="module")
def heuristic(client, auth):
    r = client.post(f"{API}/score", json={"headline": SAMPLE["headline"], "body": SAMPLE["body"],
                                          "audience": SAMPLE["audience"], "platform": SAMPLE["platform"]},
                    headers=auth, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()


# ---------------- /api/deep-analysis ----------------
class TestDeepAnalysis:
    def test_requires_auth(self, client):
        r = client.post(f"{API}/deep-analysis", json=SAMPLE, timeout=30)
        assert r.status_code in (401, 403)

    def test_deep_analysis_shape(self, client, auth, heuristic):
        payload = {**SAMPLE, "heuristic": heuristic}
        r = client.post(f"{API}/deep-analysis", json=payload, headers=auth, timeout=120)
        assert r.status_code == 200, r.text
        d = r.json()
        assert set(["heuristic", "ai", "comparison"]).issubset(d.keys())
        assert d["heuristic"]["overall"] == heuristic["overall"]

        ai = d["ai"]
        assert ai["source"] in ("ai", "fallback")
        assert isinstance(ai["overall"], int) and 0 <= ai["overall"] <= 100
        assert set(ai["factors"].keys()) == set(FACTOR_KEYS)
        for k in FACTOR_KEYS:
            assert 0 <= ai["factors"][k] <= 100, k
        assert isinstance(ai["reasons"], list) and 1 <= len(ai["reasons"]) <= 3
        assert all(isinstance(x, str) and x.strip() for x in ai["reasons"])

        cmp_ = d["comparison"]
        assert cmp_["overall_diff"] == ai["overall"] - heuristic["overall"]
        assert isinstance(cmp_["agreement"], str) and cmp_["agreement"].strip()
        assert isinstance(cmp_["difference"], str) and cmp_["difference"].strip()
        assert len(cmp_["factor_diffs"]) == 5
        for fd in cmp_["factor_diffs"]:
            assert set(["key", "label", "heuristic", "ai", "diff"]).issubset(fd.keys())
            assert fd["diff"] == fd["ai"] - fd["heuristic"]
            assert fd["heuristic"] == heuristic["factors"][fd["key"]]["score"]
        print(f"deep-analysis source={ai['source']} heur={heuristic['overall']} ai={ai['overall']}")

    def test_deep_analysis_without_heuristic_computes_it(self, client, auth, heuristic):
        payload = {k: SAMPLE[k] for k in ("headline", "body", "audience", "goal", "platform")}
        r = client.post(f"{API}/deep-analysis", json=payload, headers=auth, timeout=120)
        assert r.status_code == 200, r.text
        d = r.json()
        # deterministic heuristic => same overall as /score
        assert d["heuristic"]["overall"] == heuristic["overall"]
        assert len(d["comparison"]["factor_diffs"]) == 5

    def test_deep_analysis_empty_body_no_500(self, client, auth):
        r = client.post(f"{API}/deep-analysis", json={}, headers=auth, timeout=120)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["ai"]["source"] in ("ai", "fallback")
        assert len(d["comparison"]["factor_diffs"]) == 5

    def test_no_mongo_id_leak(self, client, auth, heuristic):
        r = client.post(f"{API}/deep-analysis", json={**SAMPLE, "heuristic": heuristic},
                        headers=auth, timeout=120)
        assert "_id" not in r.text


# ---------------- /api/rewrite ----------------
class TestRewrite:
    def test_requires_auth(self, client):
        r = client.post(f"{API}/rewrite", json={**SAMPLE, "weak_factor": "hook"}, timeout=30)
        assert r.status_code in (401, 403)

    @pytest.mark.parametrize("factor", FACTOR_KEYS)
    def test_rewrite_each_factor(self, client, auth, heuristic, factor):
        payload = {**SAMPLE, "weak_factor": factor, "before_score": heuristic}
        r = client.post(f"{API}/rewrite", json=payload, headers=auth, timeout=120)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["weak_factor"] == factor
        assert d["source"] in ("ai", "fallback")
        assert isinstance(d["what_changed"], str) and d["what_changed"].strip()

        orig, imp = d["original"], d["improved"]
        assert orig["headline"] == SAMPLE["headline"]
        assert orig["score"]["overall"] == heuristic["overall"]
        # improved must be a full deterministic re-score
        assert set(imp["score"]["factors"].keys()) == set(FACTOR_KEYS)
        assert isinstance(imp["score"]["overall"], int)
        for k in FACTOR_KEYS:
            f = imp["score"]["factors"][k]
            assert 0 <= f["score"] <= 100
            assert isinstance(f["reasons"], list) and f["reasons"]
        assert imp["headline"].strip() and imp["headline"] != ""
        before = orig["score"]["factors"][factor]["score"]
        after = imp["score"]["factors"][factor]["score"]
        print(f"rewrite {factor}: {before} -> {after} (source={d['source']}) '{imp['headline']}'")

    def test_rewrite_rescore_is_deterministic(self, client, auth, heuristic):
        payload = {**SAMPLE, "weak_factor": "hook", "before_score": heuristic}
        r1 = client.post(f"{API}/rewrite", json=payload, headers=auth, timeout=120).json()
        # re-score improved headline through /score, must match improved.score
        r2 = client.post(f"{API}/score", json={"headline": r1["improved"]["headline"],
                                               "body": r1["improved"]["body"],
                                               "audience": SAMPLE["audience"],
                                               "platform": SAMPLE["platform"]},
                         headers=auth, timeout=30).json()
        assert r2["overall"] == r1["improved"]["score"]["overall"]

    def test_rewrite_lifts_weak_factor_majority(self, client, auth):
        """Rewriting for a weak factor should generally raise that factor's score."""
        weak_headline = "Update"
        body = "We changed some things."
        improved_count = 0
        results = {}
        for factor in FACTOR_KEYS:
            r = client.post(f"{API}/rewrite", json={
                "headline": weak_headline, "body": body, "weak_factor": factor,
                "audience": SAMPLE["audience"], "goal": "awareness", "platform": "Twitter/X",
            }, headers=auth, timeout=120)
            assert r.status_code == 200, r.text
            d = r.json()
            b = d["original"]["score"]["factors"][factor]["score"]
            a = d["improved"]["score"]["factors"][factor]["score"]
            results[factor] = (b, a, d["source"])
            if a >= b:
                improved_count += 1
        print(f"weak-factor lift results: {results}")
        assert improved_count >= 3, f"Only {improved_count}/5 factors improved: {results}"

    def test_rewrite_unknown_factor_no_500(self, client, auth):
        r = client.post(f"{API}/rewrite", json={**SAMPLE, "weak_factor": "not_a_factor"},
                        headers=auth, timeout=120)
        assert r.status_code == 200, r.text
        assert r.json()["weak_factor"] == "not_a_factor"

    def test_rewrite_empty_payload_no_500(self, client, auth):
        r = client.post(f"{API}/rewrite", json={}, headers=auth, timeout=120)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "improved" in d and "original" in d
