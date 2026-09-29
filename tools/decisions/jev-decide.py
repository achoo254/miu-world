#!/usr/bin/env python3
"""Decide plan-validation questions with TypeSafe Jev and apply a stakes-based escalation policy.

Input JSON (argv[1]):
  {
    "state": {...},                       # shared context sent to Jev
    "questions": {
      "<id>": {
        "stakes": "low" | "medium" | "high",
        "instructions": "...",            # full meaning; ids are not sent to the model
        "criteria": {"<option_key>": "<description>", ...}
      }
    }
  }
Output JSON (stdout): per question -> choice, confidence, probabilities, decision ("auto" | "escalate").

API key: env TYPESAFE_API_KEY, else the `api.typesafe.ai` entry of the token file at env
TYPESAFE_TOKEN_FILE. The key is never printed.
"""
import json
import os
import sys
import time
import urllib.error
import urllib.request

API_URL = "https://api.typesafe.ai/v1/systemone"
MODEL = "jev-latest"
# Minimum confidence to act without a human, by consequence of a wrong decision.
# High-stakes questions are project-level decisions reserved for the human owner.
AUTO_THRESHOLD = {"low": 0.6, "medium": 0.8, "high": None}


def load_api_key() -> str:
    key = os.environ.get("TYPESAFE_API_KEY")
    if key:
        return key
    token_file = os.environ.get("TYPESAFE_TOKEN_FILE")
    if not token_file:
        sys.exit("Set TYPESAFE_API_KEY or TYPESAFE_TOKEN_FILE")
    with open(token_file, encoding="utf-8") as fh:
        entries = json.load(fh).get("tokens", [])
    for entry in entries:
        if entry.get("service") == "api.typesafe.ai" and entry.get("token"):
            return entry["token"]
    sys.exit("No api.typesafe.ai token found in TYPESAFE_TOKEN_FILE")


def call_jev(api_key: str, state: object, questions: dict) -> dict:
    body = json.dumps({"state": state, "model": MODEL, "questions": questions}).encode("utf-8")
    request = urllib.request.Request(
        API_URL,
        data=body,
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST",
    )
    for attempt in range(4):
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                return json.load(response)
        except urllib.error.HTTPError as err:
            # 429 rate limit / 529 overload are retryable; everything else is a caller error.
            if err.code in (429, 529) and attempt < 3:
                time.sleep(2 ** attempt)
                continue
            sys.exit(f"TypeSafe API error {err.code}: {err.read().decode('utf-8', 'replace')[:500]}")
    sys.exit("TypeSafe API retries exhausted")


def main() -> None:
    with open(sys.argv[1], encoding="utf-8") as fh:
        spec = json.load(fh)
    questions = spec["questions"]
    api_questions = {
        qid: {"type": "choice", "instructions": q["instructions"], "criteria": q["criteria"]}
        for qid, q in questions.items()
    }
    response = call_jev(load_api_key(), spec["state"], api_questions)

    results = {}
    for qid, q in questions.items():
        answer = response["answers"][qid]
        threshold = AUTO_THRESHOLD[q["stakes"]]
        confidence = answer.get("confidence", 0.0)
        auto = threshold is not None and confidence >= threshold
        results[qid] = {
            "stakes": q["stakes"],
            "choice": answer["choice"],
            "confidence": round(confidence, 3),
            "probabilities": {k: round(v, 3) for k, v in answer.get("probabilities", {}).items()},
            "decision": "auto" if auto else "escalate",
        }
    print(json.dumps({"model": response.get("model"), "usage": response.get("usage"), "results": results},
                     ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
