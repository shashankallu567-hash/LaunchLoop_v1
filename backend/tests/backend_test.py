"""LaunchLoop AI — backend API regression tests (pytest)."""
import os
import uuid

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/")
API = f"{BASE_URL}/api"

DEMO_EMAIL = os.environ.get("DEMO_EMAIL", "demo@launchloop.ai")
DEMO_PASSWORD = os.environ.get("DEMO_PASSWORD", "demo1234")

FACTORS = ["hook", "emotion", "audience_fit", "shareability", "platform_fit"]


# ---------------- fixtures ----------------
@pytest.fixture(scope="session")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def demo_token(client):
    r = client.post(f"{API}/auth/demo")
    if r.status_code != 200:
        pytest.fail(f"demo login failed {r.status_code}: {r.text[:300]}")
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def auth(demo_token):
    return {"Authorization": f"Bearer {demo_token}", "Content-Type": "application/json"}


# ---------------- health ----------------
class TestHealth:
    def test_root(self, client):
        r = client.get(f"{API}/")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"


# ---------------- auth ----------------
class TestAuth:
    def test_demo_login(self, client):
        r = client.post(f"{API}/auth/demo")
        assert r.status_code == 200
        d = r.json()
        assert d["user"]["email"] == DEMO_EMAIL
        assert d["user"]["is_demo"] is True
        assert isinstance(d["access_token"], str) and len(d["access_token"]) > 20

    def test_me(self, client, auth):
        r = client.get(f"{API}/auth/me", headers=auth)
        assert r.status_code == 200
        d = r.json()
        assert d["email"] == DEMO_EMAIL
        assert "password_hash" not in d
        assert "_id" not in d

    def test_me_no_token(self, client):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_me_bad_token(self, client):
        r = requests.get(f"{API}/auth/me", headers={"Authorization": "Bearer notatoken"})
        assert r.status_code == 401

    def test_demo_login_via_password(self, client):
        r = client.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD})
        assert r.status_code == 200
        assert r.json()["user"]["email"] == DEMO_EMAIL

    def test_register_login_flow(self, client):
        email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        pwd = "Str0ngPass!23"
        r = client.post(f"{API}/auth/register", json={"email": email, "password": pwd, "name": "TEST User"})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["user"]["email"] == email
        assert d["user"]["name"] == "TEST User"
        token = d["access_token"]

        me = client.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert me.status_code == 200
        assert me.json()["email"] == email

        li = client.post(f"{API}/auth/login", json={"email": email, "password": pwd})
        assert li.status_code == 200

        bad = client.post(f"{API}/auth/login", json={"email": email, "password": "wrongpass"})
        assert bad.status_code == 401

        dup = client.post(f"{API}/auth/register", json={"email": email, "password": pwd})
        assert dup.status_code == 400

    def test_register_invalid_email(self, client):
        r = client.post(f"{API}/auth/register", json={"email": "notanemail", "password": "x"})
        assert r.status_code == 422

    def test_bcrypt_hash_format(self):
        import sys
        from dotenv import load_dotenv
        load_dotenv("/app/backend/.env")
        sys.path.insert(0, "/app/backend")
        import auth as auth_mod
        h = auth_mod.hash_password("demo1234")
        assert h.startswith("$2b$"), f"unexpected hash prefix: {h[:6]}"
        assert auth_mod.verify_password("demo1234", h)


# ---------------- audiences ----------------
class TestAudiences:
    created = []

    def test_seeded_audiences(self, client, auth):
        r = client.get(f"{API}/audiences", headers=auth)
        assert r.status_code == 200
        items = r.json()
        names = [a["name"] for a in items]
        # Seeded audiences can be mutated/deleted by earlier UI test runs, so assert
        # structural validity + at least one seeded profile survives instead of exact names.
        assert len(items) >= 1
        assert any(n in names for n in ("Indie SaaS Founders", "Growth Marketers"))
        for a in items:
            assert "_id" not in a
            for f in ["motivations", "pain_points", "interests", "content_triggers", "channels"]:
                assert isinstance(a.get(f), list) and len(a[f]) > 0, f"{a['name']} missing {f}"
            assert a.get("sharing_behavior")

    def test_audience_crud(self, client, auth):
        payload = {
            "name": "TEST_Audience", "description": "desc", "demographics": "25-35",
            "motivations": ["growth"], "pain_points": ["no time"], "interests": ["AI"],
            "desires": ["speed"], "content_triggers": ["numbers"], "channels": ["Twitter/X"],
            "sharing_behavior": "shares threads", "tone": "bold",
        }
        r = client.post(f"{API}/audiences", json=payload, headers=auth)
        assert r.status_code == 200, r.text
        created = r.json()
        aid = created["id"]
        TestAudiences.created.append(aid)
        assert created["name"] == "TEST_Audience"
        assert "_id" not in created

        listing = client.get(f"{API}/audiences", headers=auth).json()
        assert aid in [a["id"] for a in listing]

        payload["name"] = "TEST_Audience_Updated"
        u = client.put(f"{API}/audiences/{aid}", json=payload, headers=auth)
        assert u.status_code == 200
        assert u.json()["name"] == "TEST_Audience_Updated"
        assert "_id" not in u.json()

        listing = client.get(f"{API}/audiences", headers=auth).json()
        assert "TEST_Audience_Updated" in [a["name"] for a in listing]

        d = client.delete(f"{API}/audiences/{aid}", headers=auth)
        assert d.status_code == 200
        TestAudiences.created.remove(aid)
        listing = client.get(f"{API}/audiences", headers=auth).json()
        assert aid not in [a["id"] for a in listing]

    def test_update_missing_audience_404(self, client, auth):
        r = client.put(f"{API}/audiences/{uuid.uuid4()}", json={"name": "x"}, headers=auth)
        assert r.status_code == 404

    def test_delete_missing_audience_404(self, client, auth):
        r = client.delete(f"{API}/audiences/{uuid.uuid4()}", headers=auth)
        assert r.status_code == 404

    def test_refresh_suggestions(self, client, auth):
        r = client.post(f"{API}/audiences/refresh", json={"name": "Indie hackers"}, headers=auth)
        assert r.status_code == 200
        d = r.json()
        for k in ["motivations", "pain_points", "interests", "desires", "content_triggers", "channels"]:
            assert isinstance(d[k], list) and len(d[k]) > 0
        assert "Indie hackers" in d["note"]

    def test_audiences_requires_auth(self, client):
        assert requests.get(f"{API}/audiences").status_code == 401


# ---------------- generate ----------------
class TestGenerate:
    def test_generate_and_cache(self, client, auth):
        auds = client.get(f"{API}/audiences", headers=auth).json()
        aud_id = auds[0]["id"]
        payload = {
            "product_name": "TEST_ScoreBot",
            "product_description": "An AI that scores your launch copy before you post it.",
            "goal": "awareness", "platforms": ["Twitter/X", "LinkedIn"],
            "audience_id": aud_id,
        }
        r = client.post(f"{API}/generate", json=payload, headers=auth, timeout=120)
        assert r.status_code == 200, r.text
        d = r.json()
        assert len(d["angles"]) == 4, f"expected 4 angles got {len(d['angles'])}"
        for a in d["angles"]:
            assert a["headline"] and a["body"] and a["id"]
            s = a["score"]
            assert 0 <= s["overall"] <= 100
            assert s["grade"] in ["A", "B", "C", "D"]
            for f in FACTORS:
                assert 0 <= s["factors"][f]["score"] <= 100
                assert len(s["factors"][f]["reasons"]) > 0
        assert d["source"] in ["ai", "llm", "synthetic", "cache"]

        r2 = client.post(f"{API}/generate", json=payload, headers=auth, timeout=120)
        assert r2.status_code == 200
        assert r2.json()["cached"] is True, "second identical generate should be cached"

    def test_generate_deterministic_score(self, client, auth):
        body = {"headline": "How we got 3,000 users in 30 days", "body": "A free playbook you can steal.",
                "platform": "Twitter/X"}
        a = client.post(f"{API}/score", json=body, headers=auth).json()
        b = client.post(f"{API}/score", json=body, headers=auth).json()
        assert a["overall"] == b["overall"]
        assert set(a["factors"].keys()) == set(FACTORS)

    def test_generate_requires_auth(self, client):
        assert requests.post(f"{API}/generate", json={"product_name": "x", "product_description": "y"}).status_code == 401


# ---------------- campaigns + loop ----------------
class TestCampaigns:
    def _make(self, client, auth):
        angle = {
            "id": str(uuid.uuid4()),
            "headline": "How we hit 3,000 signups in 30 days",
            "body": "Here is the free framework we used. Steal it.",
            "channel": "Twitter/X", "format": "thread",
        }
        payload = {
            "product_name": "TEST_Campaign", "product_description": "Testing the loop",
            "goal": "signups", "platforms": ["Twitter/X"], "angle": angle,
        }
        r = client.post(f"{API}/campaigns", json=payload, headers=auth)
        assert r.status_code == 200, r.text
        return r.json()

    def test_campaign_full_loop(self, client, auth):
        c = self._make(client, auth)
        cid = c["id"]
        try:
            assert "_id" not in c
            for k in ["impressions", "engagement", "shares", "conversions"]:
                assert c["prediction"][k] > 0
                assert k in c["outcome"]
                assert set(c["delta"][k].keys()) >= {"predicted", "actual", "diff", "pct"}
            assert c["delta"]["_summary"]["verdict"] in ["OVERPERFORMED", "MATCHED", "UNDERPERFORMED"]
            assert isinstance(c["learning"], str) and len(c["learning"]) > 30
            assert c["outcome_source"] == "synthetic"

            # list + get
            lst = client.get(f"{API}/campaigns", headers=auth).json()
            assert cid in [x["id"] for x in lst]
            one = client.get(f"{API}/campaigns/{cid}", headers=auth)
            assert one.status_code == 200
            assert one.json()["product_name"] == "TEST_Campaign"

            # real outcome
            real = {"impressions": 12345, "engagement": 900, "shares": 210, "conversions": 75}
            ro = client.post(f"{API}/campaigns/{cid}/outcome", json=real, headers=auth)
            assert ro.status_code == 200, ro.text
            rd = ro.json()
            assert "_id" not in rd
            assert rd["outcome_source"] == "real"
            assert rd["outcome"]["impressions"] == 12345
            assert rd["delta"]["impressions"]["actual"] == 12345
            assert rd["learning"] != c["learning"] or rd["delta"] != c["delta"]

            persisted = client.get(f"{API}/campaigns/{cid}", headers=auth).json()
            assert persisted["outcome"]["shares"] == 210
            assert persisted["outcome_source"] == "real"

            # resynth
            rs = client.post(f"{API}/campaigns/{cid}/resynth", headers=auth)
            assert rs.status_code == 200
            rsd = rs.json()
            assert rsd["outcome_source"] == "synthetic"
            assert rsd["outcome"]["impressions"] != 12345
            assert "_id" not in rsd

            # public report (no auth)
            rep = requests.get(f"{API}/report/{cid}")
            assert rep.status_code == 200, rep.text
            repd = rep.json()
            assert repd["id"] == cid
            assert repd["founder"]
            assert "user_id" not in repd and "_id" not in repd
        finally:
            dl = client.delete(f"{API}/campaigns/{cid}", headers=auth)
            assert dl.status_code == 200
            assert client.get(f"{API}/campaigns/{cid}", headers=auth).status_code == 404

    def test_campaign_404s(self, client, auth):
        rid = str(uuid.uuid4())
        assert client.get(f"{API}/campaigns/{rid}", headers=auth).status_code == 404
        assert client.post(f"{API}/campaigns/{rid}/resynth", headers=auth).status_code == 404
        assert client.delete(f"{API}/campaigns/{rid}", headers=auth).status_code == 404
        assert requests.get(f"{API}/report/{rid}").status_code == 404

    def test_seeded_campaigns_exist(self, client, auth):
        lst = client.get(f"{API}/campaigns", headers=auth).json()
        assert len(lst) >= 3, f"expected >=3 seeded campaigns, got {len(lst)}"

    def test_outcome_validation(self, client, auth):
        c = self._make(client, auth)
        try:
            r = client.post(f"{API}/campaigns/{c['id']}/outcome",
                            json={"impressions": "abc"}, headers=auth)
            assert r.status_code == 422
        finally:
            client.delete(f"{API}/campaigns/{c['id']}", headers=auth)


# ---------------- leaderboard ----------------
class TestLeaderboard:
    def test_global(self, client, auth):
        r = client.get(f"{API}/leaderboard?scope=global", headers=auth)
        assert r.status_code == 200
        e = r.json()
        assert len([x for x in e if not x["mine"]]) == 10, "expected 10 seeded leaderboard entries"
        assert any(x["mine"] for x in e), "user campaigns should appear in global"
        scores = [x["score"] for x in e]
        assert scores == sorted(scores, reverse=True)
        assert [x["rank"] for x in e] == list(range(1, len(e) + 1))
        for x in e:
            assert "_id" not in x
            assert x["product_name"] and x["headline"] and x["founder"]

    def test_mine(self, client, auth):
        r = client.get(f"{API}/leaderboard?scope=mine", headers=auth)
        assert r.status_code == 200
        e = r.json()
        assert len(e) > 0
        assert all(x["mine"] for x in e)

    def test_requires_auth(self):
        assert requests.get(f"{API}/leaderboard").status_code == 401


# ---------------- analytics ----------------
class TestAnalytics:
    def test_analytics(self, client, auth):
        r = client.get(f"{API}/analytics", headers=auth)
        assert r.status_code == 200
        d = r.json()
        assert d["empty"] is False
        t = d["totals"]
        for k in ["campaigns", "avg_score", "avg_accuracy", "total_impressions", "best_platform"]:
            assert k in t
        assert t["campaigns"] > 0
        assert t["total_impressions"] > 0
        assert t["best_platform"]
        assert len(d["score_trend"]) == t["campaigns"]
        assert len(d["accuracy_trend"]) > 0
        assert len(d["pred_vs_real"]) > 0
        assert len(d["top_angles"]) > 0
        assert d["best_angle"]["score"] == max(a["score"] for a in d["top_angles"])
        assert len(d["factor_avg"]) == 5
        labels = [f["factor"] for f in d["factor_avg"]]
        assert labels == ["Hook", "Emotion", "Audience Fit", "Shareability", "Platform Fit"]
        assert len(d["platform_perf"]) > 0

    def test_analytics_empty_for_new_user(self, client):
        email = f"test_empty_{uuid.uuid4().hex[:8]}@example.com"
        reg = client.post(f"{API}/auth/register", json={"email": email, "password": "Str0ngPass!23"})
        assert reg.status_code == 200
        tok = reg.json()["access_token"]
        r = client.get(f"{API}/analytics", headers={"Authorization": f"Bearer {tok}"})
        assert r.status_code == 200
        assert r.json().get("empty") is True

    def test_requires_auth(self):
        assert requests.get(f"{API}/analytics").status_code == 401


# ---------------- cross-user isolation ----------------
class TestIsolation:
    def test_other_user_cannot_read_demo_campaign(self, client, auth):
        camps = client.get(f"{API}/campaigns", headers=auth).json()
        cid = camps[0]["id"]
        email = f"test_iso_{uuid.uuid4().hex[:8]}@example.com"
        tok = client.post(f"{API}/auth/register", json={"email": email, "password": "Str0ngPass!23"}).json()["access_token"]
        h = {"Authorization": f"Bearer {tok}"}
        assert client.get(f"{API}/campaigns/{cid}", headers=h).status_code == 404
        assert client.get(f"{API}/audiences", headers=h).json() == []
