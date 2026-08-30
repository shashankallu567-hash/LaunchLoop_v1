"""Regression: POST /api/deep-analysis must not 500 on malformed 'heuristic' payloads.
Server recomputes the heuristic when factors != 5."""
import os

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/")


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{BASE_URL}/api/auth/demo", timeout=30)
    if r.status_code != 200:
        pytest.fail(f"demo login failed {r.status_code}: {r.text[:300]}")
    token = r.json().get("access_token")
    assert token
    s.headers.update({"Authorization": f"Bearer {token}"})
    return s


MALFORMED = [
    {"bad": "data"},
    {},
    {"factors": {}},
    {"factors": {"hook": {"score": 50}}},
    "not-a-dict",
    None,
    123,
]


@pytest.mark.parametrize("heur", MALFORMED)
def test_deep_analysis_malformed_heuristic_no_500(client, heur):
    r = client.post(
        f"{BASE_URL}/api/deep-analysis",
        json={"headline": "x", "body": "y", "heuristic": heur},
        timeout=90,
    )
    assert r.status_code == 200, f"got {r.status_code}: {r.text[:400]}"
    data = r.json()
    assert set(["heuristic", "ai", "comparison"]).issubset(data.keys())
    assert len(data["heuristic"]["factors"]) == 5
    assert 0 <= data["heuristic"]["overall"] <= 100
    assert "overall" in data["ai"] and "agreement" in data["comparison"]
    assert "_id" not in str(data)


def test_deep_analysis_valid_heuristic_is_preserved(client):
    sc = client.post(
        f"{BASE_URL}/api/score",
        json={"headline": "Ship faster with LaunchLoop", "body": "Predict virality before you post."},
        timeout=30,
    )
    assert sc.status_code == 200, sc.text[:300]
    heur = sc.json()
    assert len(heur["factors"]) == 5
    r = client.post(
        f"{BASE_URL}/api/deep-analysis",
        json={
            "headline": "Ship faster with LaunchLoop",
            "body": "Predict virality before you post.",
            "heuristic": heur,
        },
        timeout=90,
    )
    assert r.status_code == 200, r.text[:400]
    assert r.json()["heuristic"]["overall"] == heur["overall"]


def test_deep_analysis_requires_auth():
    r = requests.post(
        f"{BASE_URL}/api/deep-analysis", json={"headline": "a", "body": "b"}, timeout=30
    )
    assert r.status_code in (401, 403)
