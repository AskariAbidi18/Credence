from __future__ import annotations

import json
import os
import re
from pathlib import Path

from dotenv import load_dotenv
from openai import AsyncOpenAI
from pypdf import PdfReader


load_dotenv()


MODEL_NAME = "qwen/qwen3.6-27b"
GROQ_BASE_URL = "https://api.groq.com/openai/v1"


class LLMServiceError(RuntimeError):
    """Raised when the LLM service cannot process a request."""


def _get_client() -> AsyncOpenAI:
    api_key = os.getenv("GROQ_API_KEY")

    if not api_key:
        raise LLMServiceError(
            "GROQ_API_KEY is not configured."
        )

    return AsyncOpenAI(
        api_key=api_key,
        base_url=GROQ_BASE_URL,
    )


def _extract_pdf_text(file_path: str | Path) -> str:
    path = Path(file_path)

    if not path.exists():
        raise LLMServiceError(f"Document not found: {path}")

    if path.suffix.lower() != ".pdf":
        raise LLMServiceError(
            f"Unsupported document type: {path.suffix}"
        )

    try:
        reader = PdfReader(str(path))
        pages = []

        for page in reader.pages:
            text = page.extract_text() or ""
            pages.append(text)

        text = "\n\n".join(pages).strip()

    except Exception as exc:
        raise LLMServiceError(
            f"Failed to read PDF '{path.name}': {exc}"
        ) from exc

    if not text:
        raise LLMServiceError(
            f"No extractable text found in '{path.name}'."
        )

    return text


def _strip_thinking(response: str) -> str:
    """
    Remove Qwen reasoning blocks if they are returned alongside the answer.
    """
    response = re.sub(
        r"<think>.*?</think>",
        "",
        response,
        flags=re.DOTALL | re.IGNORECASE,
    )

    return response.strip()


def extract_json(response: str) -> dict:
    """
    Extract the first valid JSON object from an LLM response.

    Handles responses containing:
    - markdown fences
    - <think>...</think> blocks
    - surrounding explanatory text
    """

    cleaned = _strip_thinking(response)

    # First try the entire cleaned response.
    try:
        payload = json.loads(cleaned)

        if not isinstance(payload, dict):
            raise ValueError("Expected a JSON object.")

        return payload

    except json.JSONDecodeError:
        pass

    # Then search for a JSON object embedded in the response.
    decoder = json.JSONDecoder()

    for match in re.finditer(r"\{", cleaned):
        try:
            payload, _ = decoder.raw_decode(cleaned[match.start():])

            if isinstance(payload, dict):
                return payload

        except json.JSONDecodeError:
            continue

    raise ValueError(
        f"Could not extract a JSON object from LLM response: {response!r}"
    )


async def analyze_document(
    file_path: str | Path,
    prompt: str,
) -> str:
    """
    Send an extracted document to the LLM and return its raw response.

    The agent layer is responsible for interpreting and validating the
    returned structure against its Pydantic contract.
    """

    document_text = _extract_pdf_text(file_path)

    client = _get_client()

    try:
        response = await client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a document analysis component in "
                        "the Credence loan-document processing system. "
                        "Follow the user's output format exactly. "
                        "Do not invent information."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"{prompt}\n\n"
                        "DOCUMENT CONTENT:\n"
                        "-----------------\n"
                        f"{document_text}"
                    ),
                },
            ],
            temperature=0,
        )

    except Exception as exc:
        raise LLMServiceError(
            f"LLM request failed: {exc}"
        ) from exc

    content = response.choices[0].message.content

    if not content:
        raise LLMServiceError(
            "LLM returned an empty response."
        )

    return content
