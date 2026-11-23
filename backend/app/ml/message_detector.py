import re
import unicodedata
from typing import Dict, List, Any, Optional

EMOJI_FRIENDLY_NAMES: Dict[str, str] = {
    "rocket": "Launch / High Speed Progress",
    "party popper": "Celebration / Milestone",
    "hundred points": "100% / Perfection / Full Agreement",
    "thumbs up": "Approval / Agreement",
    "thumbs down": "Disapproval / Rejection",
    "fire": "Trending / High Energy / Hot",
    "police cars revolving light": "Urgent Alert / Emergency",
    "warning": "Warning / Caution Required",
    "clapping hands": "Applause / Appreciation",
    "sparkles": "Innovation / Polish / Quality",
    "heart": "Love / Strong Appreciation",
    "red heart": "Love / Strong Appreciation",
    "smiling face with heart-eyes": "Enthusiastic Admiration",
    "face with tears of joy": "Humor / Amusement",
    "thinking face": "Contemplation / Consideration",
    "person with folded hands": "Gratitude / Polite Request",
    "calendar": "Scheduling / Date & Time",
    "handshake": "Agreement / Partnership",
    "light bulb": "Idea / Insight",
    "electric light bulb": "Idea / Insight",
    "check mark": "Completed / Verified",
    "heavy check mark": "Completed / Verified",
    "cross mark": "Rejected / Cancelled",
    "hourglass": "Pending / In Progress",
    "hourglass done": "Completed / Time Up",
    "trophy": "Victory / Achievement",
    "gem stone": "Premium / High Value",
    "bullseye": "Target / Goal Reached",
    "chart increasing": "Growth / Positive Trend",
    "chart decreasing": "Decline / Drop",
    "money bag": "Financial / Revenue",
    "speech balloon": "Discussion / Communication",
    "eyes": "Attention / Looking into it",
    "raised fist": "Solidarity / Determination",
    "flexed biceps": "Strength / Hard Work",
    "waving hand": "Greeting / Hello",
    "saluting face": "Respect / Acknowledged",
}

def is_emoji(char: str) -> bool:
    """Detect if a character is a Unicode emoji."""
    if not char:
        return False
    cat = unicodedata.category(char)
    code = ord(char)
    return (
        cat in ("So", "Sk")
        or (0x1F300 <= code <= 0x1FAFF)
        or (0x2600 <= code <= 0x27BF)
        or (0x1F900 <= code <= 0x1F9FF)
        or (0x1F600 <= code <= 0x1F64F)
        or (0x1F680 <= code <= 0x1F6FF)
    )

def get_emoji_description(char: str) -> str:
    """Returns a clean, human-readable name for an emoji."""
    try:
        raw_name = unicodedata.name(char).lower()
        cleaned = re.sub(r' (sign|symbol|selector|modifier).*$', '', raw_name).strip()
        return cleaned
    except ValueError:
        return "emoji"

def extract_emojis(text: str) -> List[str]:
    """Extracts all individual emojis from text, preserving order."""
    return [c for c in text if is_emoji(c)]

def demojize_text(text: str) -> str:
    """
    Converts raw emojis into semantic natural language descriptions,
    e.g. '🚀' -> '(rocket)' so transformers can understand the meaning.
    """
    result = []
    for c in text:
        if is_emoji(c):
            desc = get_emoji_description(c)
            result.append(f" ({desc}) ")
        else:
            result.append(c)
    return re.sub(r'\s+', ' ', "".join(result)).strip()

def detect_message_profile(text: str) -> Dict[str, Any]:
    """
    Analyzes any message (small, medium, large, massive, or pure emojis) and returns:
    - category / detected_type: emoji_only, short_chat, medium_message, large_document, massive_text
    - type_label: human-friendly label
    - emoji details (count, meanings)
    - tone & sentiment
    - word & character counts
    - reading time
    """
    cleaned = text.strip()
    words = cleaned.split()
    word_count = len(words)
    char_count = len(cleaned)

    emojis = extract_emojis(cleaned)
    unique_emojis = list(dict.fromkeys(emojis))
    emoji_count = len(emojis)

    # Clean text without emojis or punctuation to test if it's emoji-only
    text_without_emojis_or_punct = re.sub(r'[\s\W_]+', '', "".join([c for c in cleaned if not is_emoji(c)]))
    is_emoji_only = emoji_count > 0 and len(text_without_emojis_or_punct) == 0

    # Categorize message type
    if is_emoji_only:
        detected_type = "emoji_only"
        type_label = "Emoji Reaction"
    elif word_count <= 15 or char_count <= 80:
        detected_type = "short_chat"
        type_label = "Short Chat / Note"
    elif word_count <= 120:
        detected_type = "medium_message"
        type_label = "Standard Paragraph"
    elif word_count <= 2500:
        detected_type = "large_document"
        type_label = "Long Document"
    else:
        detected_type = "massive_text"
        type_label = "Massive Text"

    # Emoji meanings
    meanings = []
    for e in unique_emojis:
        raw_desc = get_emoji_description(e)
        friendly = EMOJI_FRIENDLY_NAMES.get(raw_desc, raw_desc.title())
        meanings.append(f"{e} {friendly}")

    # Tone detection
    lower = cleaned.lower()
    is_question = "?" in cleaned or any(lower.startswith(w) for w in ["why", "what", "how", "when", "where", "can we", "could we", "is it", "should we"])
    
    if any(e in emojis for e in ["🎉", "🚀", "🥳", "🔥", "💯", "🏆"]) or any(w in lower for w in ["congrats", "awesome", "great news", "excited", "celebrate", "milestone", "won"]):
        tone = "Celebratory & Enthusiastic"
    elif any(e in emojis for e in ["🚨", "⚠️", "🔥", "🛑"]) or any(w in lower for w in ["crashed", "urgent", "down", "emergency", "fatal", "broken", "critical", "failed"]):
        tone = "Urgent Alert / Critical"
    elif is_question:
        tone = "Inquisitive / Question"
    elif any(e in emojis for e in ["👍", "❤️", "🙌", "👏", "🙏"]) or any(w in lower for w in ["thanks", "thank you", "appreciate", "good job", "perfect"]):
        tone = "Appreciative / Positive"
    else:
        tone = "Informative / Neutral"

    reading_time_sec = round(max(1.0, (word_count / 200.0) * 60.0), 1) if word_count > 0 else 0.0

    return {
        "detected_type": detected_type,
        "type_label": type_label,
        "is_emoji_only": is_emoji_only,
        "has_emojis": emoji_count > 0,
        "emoji_count": emoji_count,
        "emojis": unique_emojis,
        "emoji_meanings": meanings,
        "tone": tone,
        "is_question": is_question,
        "word_count": word_count,
        "char_count": char_count,
        "reading_time_sec": reading_time_sec
    }

def synthesize_emoji_summary(profile: Dict[str, Any], text: str) -> str:
    """Instant (< 1ms) semantic interpretation for pure emoji messages."""
    meanings = profile["emoji_meanings"]
    emojis_str = " ".join(profile["emojis"])
    tone = profile["tone"]

    if not meanings:
        return f"{text.strip()} (Emoji expression with {tone} tone)"

    if len(meanings) == 1:
        return f"{emojis_str} Expresses: {meanings[0]}. Tone: {tone}."
    else:
        items = ", ".join(meanings)
        return f"{emojis_str} Combined Expression: {items}. Tone: {tone}."

def synthesize_short_chat_summary(text: str, profile: Dict[str, Any]) -> str:
    """Instant (< 1ms) crisp, fact-preserving takeaway for short chat messages/notes."""
    cleaned = text.strip()
    emojis_str = " ".join(profile["emojis"]) if profile["emojis"] else ""
    meanings_str = ", ".join(profile["emoji_meanings"]) if profile["emoji_meanings"] else ""
    lower = cleaned.lower()

    # Formulate crisp summary based on intent using word boundaries
    if profile["is_question"]:
        res = f"Inquiry: {cleaned}"
    elif re.search(r'\b(crashed|urgent|down|emergency|fatal|broken|critical|bug|outage|failed)\b', lower):
        res = f"Urgent Alert: {cleaned}"
    elif re.search(r'\b(target|revenue|launched|reached|shipped|milestone|great news|users|congrats|won|celebrate)\b', lower):
        res = f"Milestone Update: {cleaned}"
    elif re.search(r'\b(meeting|schedule|reschedule|call|zoom|tomorrow|yesterday|pm|am)\b', lower):
        res = f"Schedule Note: {cleaned}"
    elif re.search(r'\b(thanks|thank you|great job|awesome|perfect|appreciate)\b', lower):
        res = f"Appreciation: {cleaned}"
    else:
        res = f"Key Message: {cleaned}"

    if profile["has_emojis"] and meanings_str:
        res += f" [{meanings_str}]"
    return res
