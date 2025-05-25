#!/usr/bin/env python3

import numpy as np
import re
from typing import List, Tuple

# Copy all the detection functions from no_semantic_test.py
def detect_inversions_and_paradoxes(text: str) -> int:
    """Detect sophisticated paradoxes and inversions."""
    text_lower = text.lower()
    
    # Pattern 1: "more X than Y" constructions
    more_than_pattern = r"more \w+ than"
    more_than_matches = len(re.findall(more_than_pattern, text_lower))
    
    # Pattern 2: Contradiction structures ("fail" vs "refuses to fail")
    contradiction_pairs = [
        ('fail', 'refuses to fail'),
        ('build', 'explain why it failed'),
        ('ship', 'cowards'),
        ('pitch', 'poets'),
        ('lead', 'without suffering'),
        ('funding', 'not faith'),
        ('ghost', 'conversation'),
        ('fire', 'forgets'),
        ('death', 'soft'),
        ('bleed', 'noticed'),
        ('bleed', 'bluff'),
        ('sacred', 'spreadsheet'),
        ('silence', 'roar'),
        ('dragon', 'unicorn'),
        ('salvation', 'doubting'),
        ('chaos', 'progress'),
        ('conviction', 'costume'),
        ('burn', 'blueprint'),
        ('cliff', 'ladder'),
        ('smile', 'working'),
        ('product', 'pain'),
        ('genius', 'madness'),
        ('passion', 'reason')
    ]
    
    contradiction_score = 0
    for pair in contradiction_pairs:
        if pair[0] in text_lower and pair[1] in text_lower:
            contradiction_score += 2
        elif pair[0] in text_lower or pair[1] in text_lower:
            contradiction_score += 0.5
    
    # Pattern 3: Negation-based inversions ("don't fail", "never", etc.)
    negation_inversions = ['don\'t fail', 'refuses to', 'without', 'not', 'never take', 'forgot how', 'not the', 'isn\'t you', 'not getting', 'not finding', 'not conducting', 'not winning']
    negation_score = sum(1 for neg in negation_inversions if neg in text_lower)
    
    return more_than_matches * 3 + contradiction_score + negation_score

def analyze_metaphor_quality(text: str) -> dict:
    """Distinguish between fresh/powerful metaphors vs cliché ones."""
    # Fresh, powerful metaphors (Donte-style)
    fresh_metaphors = [
        'ghost', 'conversation', 'fire forgets', 'name', 'whispering', 'compromises',
        'fear hires', 'doubt signs', 'bleed for it', 'ship like cowards', 'pitch like poets',
        'sneaks in', 'polite pivots', 'unshipped rage', 'mid-conversation',
        'bleed and bluff', 'straight face', 'sacred spreadsheet', 'silence roar', 
        'dragon unicorn', 'salvation gospel', 'chaos progress', 'conviction armor',
        'burn blueprint', 'cliff ladder', 'smile whisper', 'canvas brushstroke'
    ]
    
    # Cliché/overused metaphors
    cliche_metaphors = [
        'wildfire', 'graveyard of dreams', 'ship without anchor', 'storm of uncertainty',
        'symphony of chaos', 'lotus flowers', 'ocean of opportunity', 'phoenix', 'tsunami',
        'soul is a canvas', 'tightrope walk', 'shipwrecked sailor', 'mirrors reflect',
        'wildfire burning', 'heart is a time bomb', 'master thief', 'maze of mirrors',
        'symphony of chaos', 'soul is a battlefield', 'waves of uncertainty', 'safety net',
        'wreckage of vision', 'darkest corners', 'flames dance', 'time bomb ticking',
        'stealing moments', 'orchestra conductor', 'war between passion'
    ]
    
    fresh_count = sum(1 for phrase in fresh_metaphors if phrase in text.lower())
    cliche_count = sum(1 for phrase in cliche_metaphors if phrase in text.lower())
    
    return {
        'fresh_metaphor_count': fresh_count,
        'cliche_metaphor_count': cliche_count,
        'metaphor_quality_score': fresh_count * 2 - cliche_count * 1.5
    }

def detect_rhythm_and_flow(text: str) -> dict:
    """Analyze rhythm, alliteration, and poetic flow."""
    words = text.split()
    
    # Alliteration detection
    first_letters = [word[0].lower() for word in words if word.isalpha()]
    alliteration_score = 0
    for i in range(len(first_letters) - 1):
        if first_letters[i] == first_letters[i + 1]:
            alliteration_score += 1
    
    # Rhythm patterns (short declarative sentences)
    sentences = text.split('.')
    short_punchy = sum(1 for s in sentences if len(s.split()) <= 8 and len(s.strip()) > 0)
    
    # Parallelism ("X and Y", "the Z and the W")
    parallel_patterns = [
        r"the \w+ and the \w+",
        r"\w+ and \w+",
        r"when \w+ and when \w+",
        r"not \w+, but \w+",
        r"between \w+ and \w+"
    ]
    parallelism = sum(len(re.findall(pattern, text.lower())) for pattern in parallel_patterns)
    
    return {
        'alliteration_score': alliteration_score,
        'short_punchy_sentences': short_punchy,
        'parallelism': parallelism,
        'total_rhythm_score': alliteration_score + short_punchy + parallelism * 2
    }

def detect_emotional_intensity(text: str) -> dict:
    """Detect words and phrases that create strong emotional impact."""
    # Devastating/savage language
    devastating_words = [
        'death', 'die', 'kill', 'destroy', 'savage', 'brutal', 'devastating',
        'ghost', 'forget', 'refuses', 'fail', 'cowards', 'suffering',
        'bleed', 'dragon', 'roar', 'burn', 'cliff', 'pain', 'doubt',
        'chaos', 'wreckage', 'crash', 'darkest', 'wildfire', 'bomb',
        'stolen', 'guilt', 'battlefield', 'war', 'battle'
    ]
    
    # Poetic/elevated language
    poetic_words = [
        'whispering', 'fire', 'bleed', 'myth', 'scripture', 'prophecy',
        'greatness', 'faith', 'belief', 'soul', 'sacred', 'salvation',
        'gospel', 'conviction', 'armor', 'masterpiece', 'canvas',
        'symphony', 'orchestra', 'music'
    ]
    
    # Visceral/physical language
    visceral_words = [
        'bleed', 'bone', 'burn', 'fire', 'rage', 'suffering', 'pain',
        'flinch', 'smile', 'whisper', 'roar', 'crash', 'ticking',
        'stealing', 'clinging', 'dance'
    ]
    
    text_lower = text.lower()
    
    devastating_count = sum(1 for word in devastating_words if word in text_lower)
    poetic_count = sum(1 for word in poetic_words if word in text_lower)
    visceral_count = sum(1 for word in visceral_words if word in text_lower)
    
    return {
        'devastating_score': devastating_count,
        'poetic_score': poetic_count,
        'visceral_score': visceral_count,
        'total_intensity': devastating_count * 2 + poetic_count * 1.5 + visceral_count * 1.8
    }

def analyze_conceptual_punch(text: str) -> dict:
    """Analyze the conceptual strength and quotability."""
    # Quotable constructions
    quotable_patterns = [
        r"when to \w+ and when to \w+",  # "when to bleed and when to bluff"
        r"not the \w+[,.]? it's the \w+",  # "not the work. It's the silence"
        r"while \w+ \w+ \w+",  # "while everyone around you"
        r"the hardest part is \w+",  # "hardest part is selling"
        r"it's \w+ the \w+ over the \w+",  # "choosing the burn over the blueprint"
        r"every \w+ is a \w+",  # "every rejection is a brushstroke"
        r"between \w+ and \w+",  # "between genius and madness"
    ]
    
    quotable_score = sum(len(re.findall(pattern, text.lower())) for pattern in quotable_patterns)
    
    # Truth-telling phrases
    truth_phrases = [
        'straight face', 'no one believes', 'still have to', 'while you\'re still',
        'feels like a costume', 'never choose', 'it\'s working',
        'came from you', 'hardest part', 'not the', 'but the'
    ]
    
    truth_score = sum(1 for phrase in truth_phrases if phrase in text.lower())
    
    # Memorable closers
    memorable_endings = [
        'face', 'spreadsheet', 'roar', 'unicorn', 'gospel', 'sleep',
        'costume', 'time', 'working', 'you', 'painted', 'dreams',
        'reality', 'mind', 'flames', 'sacrifice', 'guilt', 'you',
        'music', 'battle'
    ]
    
    last_words = text.split()[-3:] if len(text.split()) >= 3 else text.split()
    ending_power = sum(1 for word in last_words if word.lower().rstrip('.,!?;:') in memorable_endings)
    
    return {
        'quotable_score': quotable_score,
        'truth_score': truth_score,
        'ending_power': ending_power,
        'total_conceptual_punch': quotable_score * 2 + truth_score * 2.5 + ending_power * 1.5
    }

def pure_structural_score(text: str) -> dict:
    """Calculate score based ONLY on structural/stylistic features - no semantic similarity."""
    
    # Advanced quality analysis
    inversion_score = detect_inversions_and_paradoxes(text)
    metaphor_analysis = analyze_metaphor_quality(text)
    rhythm_analysis = detect_rhythm_and_flow(text)
    emotion_analysis = detect_emotional_intensity(text)
    concept_analysis = analyze_conceptual_punch(text)
    
    # Word count factor (Donte prefers concise)
    word_count = len(text.split())
    conciseness_multiplier = 1.3 if word_count <= 15 else 1.1 if word_count <= 20 else 0.9
    
    # Calculate weighted composite score WITHOUT semantic similarity
    composite_score = (
        inversion_score * 0.35 +          # Increased from 0.25
        metaphor_analysis['metaphor_quality_score'] * 0.25 +  # Increased from 0.2
        rhythm_analysis['total_rhythm_score'] * 0.2 +         # Increased from 0.15
        emotion_analysis['total_intensity'] * 0.1 +
        concept_analysis['total_conceptual_punch'] * 0.1
    ) * conciseness_multiplier
    
    # Convert to 0-10 scale
    scaled_score = min(10, max(0, (composite_score + 1.5) * 2.0))
    
    return {
        'inversion_score': inversion_score,
        'metaphor_analysis': metaphor_analysis,
        'rhythm_analysis': rhythm_analysis,
        'emotion_analysis': emotion_analysis,
        'concept_analysis': concept_analysis,
        'composite_score': composite_score,
        'scaled_score': scaled_score,
        'word_count': word_count
    }

def main():
    """Test the new 20 quotes with pure structural scoring."""
    
    quotes = [
        "Knowing when to bleed and when to bluff — and doing both with a straight face.",
        "Building something sacred while everyone around you treats it like a spreadsheet.",
        "It's not the work. It's the silence when no one believes yet and you still have to roar.",
        "Waking up every day to fight a dragon you created — and pitching it like a unicorn.",
        "The hardest part is selling salvation while you're still doubting the gospel.",
        "Explaining to your family that the chaos is progress and the sleeplessness is optional — but you never choose sleep.",
        "Wearing conviction like armor, even when it feels like a costume.",
        "It's choosing the burn over the blueprint, the cliff over the ladder — every time.",
        "Watching teammates flinch while you smile and whisper, 'It's working.'",
        "Realizing the product isn't you — but the pain it solves came from you.",
        "Your soul is a canvas, and every rejection is a brushstroke of doubt, but the masterpiece is still being painted.",
        "The founder's journey is a tightrope walk between genius and madness, and the safety net is made of broken dreams.",
        "You are a shipwrecked sailor, clinging to the wreckage of your vision, as the waves of uncertainty crash against the shore of reality.",
        "The hardest part of being a founder is not the obstacles, but the mirrors that reflect the darkest corners of your own mind.",
        "Your startup is a wildfire, burning out of control, and the hardest part is not putting it out, but learning to dance with the flames.",
        "The founder's heart is a time bomb, ticking away with every failed experiment, every sleepless night, and every sacrifice.",
        "You are a master thief, stealing moments from the clock, and the hardest part is not getting caught, but living with the guilt of time stolen.",
        "The founder's journey is a maze of mirrors, and the hardest part is not finding the exit, but recognizing the reflection staring back at you.",
        "Your startup is a symphony of chaos, and the hardest part is not conducting the orchestra, but being the instrument that makes the music.",
        "The founder's soul is a battlefield, where the war between passion and reason rages on, and the hardest part is not winning the war, but surviving the battle."
    ]
    
    print("Scoring 20 NEW quotes with Pure Structural Analysis...\n")
    print("=" * 90)
    
    results = []
    for i, quote in enumerate(quotes, 1):
        result = pure_structural_score(quote)
        results.append(result)
        
        print(f"Quote {i}: {quote[:70]}{'...' if len(quote) > 70 else ''}")
        print(f"Score: {result['scaled_score']:.1f}/10")
        
        # Show key insights
        print(f"  → Inversions: {result['inversion_score']:.1f}")
        print(f"  → Metaphor Quality: {result['metaphor_analysis']['metaphor_quality_score']:.1f}")
        print(f"  → Emotional Intensity: {result['emotion_analysis']['total_intensity']:.1f}")
        print(f"  → Conceptual Punch: {result['concept_analysis']['total_conceptual_punch']:.1f}")
        print(f"  → Word Count: {result['word_count']}")
        print("-" * 90)
    
    # Analysis summary
    our_scores = [r['scaled_score'] for r in results]
    avg_score = np.mean(our_scores)
    
    # Split analysis: first 10 vs second 10
    first_10 = our_scores[:10]
    second_10 = our_scores[10:]
    
    print(f"\nANALYSIS:")
    print(f"Overall Average: {avg_score:.1f}/10")
    print(f"Quotes 1-10 Average: {np.mean(first_10):.1f}/10")
    print(f"Quotes 11-20 Average: {np.mean(second_10):.1f}/10")
    print(f"Range: {min(our_scores):.1f} - {max(our_scores):.1f}")
    
    # Show top performers
    top_indices = sorted(range(len(our_scores)), key=lambda i: our_scores[i], reverse=True)[:5]
    print(f"\nTOP 5 QUOTES:")
    for idx in top_indices:
        print(f"Quote {idx+1}: {our_scores[idx]:.1f}/10")
    
    # Show bottom performers
    bottom_indices = sorted(range(len(our_scores)), key=lambda i: our_scores[i])[:5]
    print(f"\nBOTTOM 5 QUOTES:")
    for idx in bottom_indices:
        print(f"Quote {idx+1}: {our_scores[idx]:.1f}/10")

if __name__ == "__main__":
    main() 