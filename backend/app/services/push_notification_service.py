from typing import Iterable
import requests


EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"
MAX_MESSAGES_PER_REQUEST = 100


def chunked(items: list[dict], size: int) -> Iterable[list[dict]]:
    for i in range(0, len(items), size):
        yield items[i:i + size]


def send_expo_push_notifications(
    tokens: list[str],
    title: str,
    message: str,
    data: dict | None = None,
) -> dict:
    """
    Sends push notifications to Expo Push API in batches of 100.
    Returns a summary dict with success_count, failed_tokens, and raw responses.
    """
    if not tokens:
        return {
            "success_count": 0,
            "failed_tokens": [],
            "raw_responses": []
        }

    payloads = [
        {
            "to": token,
            "title": title,
            "body": message,
            "sound": "default",
            "data": data or {}
        }
        for token in tokens
    ]

    headers = {
        "Accept": "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
    }

    success_count = 0
    failed_tokens: list[str] = []
    raw_responses: list[dict] = []

    for batch in chunked(payloads, MAX_MESSAGES_PER_REQUEST):
        response = requests.post(
            EXPO_PUSH_URL,
            json=batch,
            headers=headers,
            timeout=20
        )
        response.raise_for_status()

        body = response.json()
        raw_responses.append(body)

        data_items = body.get("data", [])
        # Reason: use zip() instead of enumerate() + batch[index] to guard
        # against the Expo API returning more response items than tokens in
        # the current batch. zip() stops at the shorter iterable, preventing
        # an IndexError when the final batch is smaller than MAX_MESSAGES_PER_REQUEST.
        for token_payload, item in zip(batch, data_items):
            status = item.get("status")
            token = token_payload["to"]

            if status == "ok":
                success_count += 1
            else:
                failed_tokens.append(token)

    return {
        "success_count": success_count,
        "failed_tokens": failed_tokens,
        "raw_responses": raw_responses
    }