"""Deep Analysis persistence (iteration 4): POST /api/campaigns/{id}/deep-analysis
persists on the campaign and surfaces on the PUBLIC report endpoint."""
import os
import pytest
import requests
from dotenv import dotenv_values

fe = dotenv_values("/app/frontend/.env")
BASE = (os.environ.get("REACT_APP_BACKEND_URL") or fe.get("REACT_APP_BACKEND_URL")).rstrip("/") + "/api"


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE}/auth/demo", timeout=60)
    assert r.status_code == 200, r.text
    t = r.json().get("access_token")
    assert t
    return t


@pytest.fixture(scope="module")
def auth(token):
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {token}"})
    return s


@pytest.fixture(scope="module")
def campaign_id(auth):
    r = auth.get(f"{BASE}/campaigns", timeout=60)
    assert r.status_code == 200, r.text
    items = r.json()
    assert isinstance(items, list) and items, "demo user has no campaigns"
    return items[0]["id"]


class TestDeepAnalysisPersistence:
    def test_post_requires_auth(self, campaign_id):
        r = requests.post(f"{BASE}/campaigns/{campaign_id}/deep-analysis", timeout=30)
        assert r.status_code in (401, 403), r.status_code

    def test_post_bad_campaign_404(self, auth):
        r = auth.post(f"{BASE}/campaigns/does-not-exist-123/deep-analysis", timeout=90)
        assert r.status_code == 404, r.text

    def test_run_and_persist(self, auth, campaign_id):
        r = auth.post(f"{BASE}/campaigns/{campaign_id}/deep-analysis", timeout=180)
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ("heuristic", "ai", "comparison"):
            assert k in d, f"missing {k}"
        assert isinstance(d["heuristic"]["overall"], int)
        assert isinstance(d["ai"]["overall"], int)
        assert isinstance(d["ai"]["reasons"], list) and d["ai"]["reasons"]
        assert d["comparison"]["agreement"] and d["comparison"]["difference"]
        assert len(d["comparison"]["factor_diffs"]) == 5
        for f in d["comparison"]["factor_diffs"]:
            assert set(("key", "label", "heuristic", "ai")) <= set(f.keys())

        # GET campaign -> persisted
        g = auth.get(f"{BASE}/campaigns/{campaign_id}", timeout=60)
        assert g.status_code == 200, g.text
        c = g.json()
        assert c.get("deep_analysis") is not None
        assert c["deep_analysis"]["ai"]["overall"] == d["ai"]["overall"]
        assert "_id" not in c

        # PUBLIC report (no auth) -> includes deep_analysis
        p = requests.get(f"{BASE}/report/{campaign_id}", timeout=60)
        assert p.status_code == 200, p.text
        rep = p.json()
        assert "_id" not in rep and "user_id" not in rep
        assert rep.get("deep_analysis") is not None
        assert rep["deep_analysis"]["ai"]["overall"] == d["ai"]["overall"]
        assert rep["deep_analysis"]["comparison"]["agreement"] == d["comparison"]["agreement"]

    def test_report_without_deep_analysis_has_none(self, auth):
        """A campaign that never ran deep analysis must not expose one."""
        r = auth.get(f"{BASE}/campaigns", timeout=60)
        fresh = [c for c in r.json() if not c.get("deep_analysis")]
        if not fresh:
            pytest.skip("all demo campaigns already have deep_analysis")
        cid = fresh[0]["id"]
        p = requests.get(f"{BASE}/report/{cid}", timeout=60)
        assert p.status_code == 200
        assert p.json().get("deep_analysis") in (None, {})

    def test_report_bad_id_404(self):
        r = requests.get(f"{BASE}/report/nope-nope-nope", timeout=30)
        assert r.status_code == 404
