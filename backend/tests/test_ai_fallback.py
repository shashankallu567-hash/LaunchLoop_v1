"""Unit tests: graceful degradation of deep_analysis / rewrite_angle with NO external API key."""
import sys
import asyncio
import pytest

sys.path.insert(0, "/app/backend")
import llm_service  # noqa: E402
import virality  # noqa: E402

FACTOR_KEYS = ["hook", "emotion", "audience_fit", "shareability", "platform_fit"]
AUD = {"name": "Indie founders", "pain_points": ["no time for marketing"], "desires": ["ship faster"]}
HL = "Update"
BODY = "We changed some things."


@pytest.fixture
def no_key(monkeypatch):
    monkeypatch.setattr(llm_service, "EMERGENT_LLM_KEY", None)


def test_deep_analysis_fallback(no_key):
    heur = virality.score_angle(HL, BODY, AUD, "Twitter/X")
    res = asyncio.get_event_loop().run_until_complete(
        llm_service.deep_analysis(HL, BODY, AUD, "awareness", "Twitter/X", heur))
    assert res["source"] == "fallback"
    assert 0 <= res["overall"] <= 100
    assert set(res["factors"]) == set(FACTOR_KEYS)
    assert len(res["reasons"]) >= 2
    # deterministic
    res2 = asyncio.get_event_loop().run_until_complete(
        llm_service.deep_analysis(HL, BODY, AUD, "awareness", "Twitter/X", heur))
    assert res2 == res


def test_deep_analysis_llm_error_falls_back(monkeypatch):
    monkeypatch.setattr(llm_service, "EMERGENT_LLM_KEY", "bogus-key")

    async def boom(*a, **k):
        raise RuntimeError("simulated LLM outage")
    monkeypatch.setattr(llm_service, "_gemini_json", boom)
    heur = virality.score_angle(HL, BODY, AUD, "Twitter/X")
    res = asyncio.get_event_loop().run_until_complete(
        llm_service.deep_analysis(HL, BODY, AUD, "awareness", "Twitter/X", heur))
    assert res["source"] == "fallback"
    assert set(res["factors"]) == set(FACTOR_KEYS)


@pytest.mark.parametrize("factor", FACTOR_KEYS)
def test_rewrite_fallback_lifts_factor(no_key, factor):
    res = asyncio.get_event_loop().run_until_complete(
        llm_service.rewrite_angle(HL, BODY, factor, AUD, "awareness", "Twitter/X"))
    assert res["source"] == "fallback"
    assert res["headline"] and res["headline"] != HL
    assert res["what_changed"]
    before = virality.score_angle(HL, BODY, AUD, "Twitter/X")["factors"][factor]["score"]
    after = virality.score_angle(res["headline"], res["body"], AUD, "Twitter/X")["factors"][factor]["score"]
    print(f"fallback {factor}: {before} -> {after} | {res['headline']}")
    assert after >= before, f"fallback rewrite for {factor} lowered it: {before} -> {after}"


def test_rewrite_llm_error_falls_back(monkeypatch):
    monkeypatch.setattr(llm_service, "EMERGENT_LLM_KEY", "bogus-key")

    async def boom(*a, **k):
        raise RuntimeError("simulated LLM outage")
    monkeypatch.setattr(llm_service, "_gemini_json", boom)
    res = asyncio.get_event_loop().run_until_complete(
        llm_service.rewrite_angle(HL, BODY, "hook", AUD, "awareness", "Twitter/X"))
    assert res["source"] == "fallback"
