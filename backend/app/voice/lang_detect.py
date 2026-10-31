import re

def detect_language(text: str) -> str:
    """
    Detect if text contains Devanagari script, Romanized Hindi (Hinglish), or English.
    Returns: 'hi-IN', 'hinglish', or 'en-IN'
    """
    # Check for Devanagari Unicode block
    if re.search(r'[\u0900-\u097F]', text):
        return "hi-IN"

    # Hinglish common token indicators
    hinglish_markers = {
        "kya", "kaise", "batao", "aaj", "kal", "kar", "karo", "raha", "rahi", "hai",
        "haan", "nahi", "shukriya", "dost", "yaar", "theek", "kaam", "mera", "meri", "hum"
    }
    tokens = set(re.findall(r'\b[a-zA-Z]+\b', text.lower()))
    if len(tokens.intersection(hinglish_markers)) >= 1:
        return "hinglish"

    return "en-IN"

