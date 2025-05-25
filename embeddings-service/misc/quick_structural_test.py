#!/usr/bin/env python3
"""
Quick Structural Test - Applies structural adjustments to existing scores
Tests the calibration and structural improvements without reprocessing training data
"""

import re
import numpy as np
from collections import Counter

def extract_structural_features(text):
    """Extract structural and linguistic features for dry wit detection"""
    features = {}
    
    # Basic metrics
    words = text.split()
    features['word_count'] = len(words)
    features['char_count'] = len(text)
    features['avg_word_length'] = np.mean([len(w) for w in words]) if words else 0
    
    # Sentence structure
    sentences = re.split(r'[.!?]+', text)
    sentences = [s.strip() for s in sentences if s.strip()]
    features['sentence_count'] = len(sentences)
    features['words_per_sentence'] = len(words) / len(sentences) if sentences else 0
    
    # Punctuation patterns (indicators of wit/emphasis)
    features['comma_density'] = text.count(',') / len(words) if words else 0
    features['dash_count'] = text.count('—') + text.count('--')
    features['question_marks'] = text.count('?')
    features['exclamation_marks'] = text.count('!')
    
    # Ending analysis (twist detection)
    last_sentence = sentences[-1] if sentences else ""
    last_words = last_sentence.split()[-3:] if last_sentence else []
    features['ends_with_noun'] = len(last_words) > 0 and last_words[-1].lower() not in ['and', 'or', 'but', 'so', 'yet']
    features['short_ending'] = len(last_words) <= 3
    
    # Metaphor vs. literal indicators
    metaphor_words = ['like', 'is like', 'are like', 'metaphor', 'symphony', 'warrior', 'phoenix', 'shaman', 'alchemist', 'cartographers', 'tapestry', 'wildfire', 'flames']
    features['metaphor_density'] = sum(1 for word in metaphor_words if word in text.lower()) / len(words) if words else 0
    
    # Concrete vs. abstract language
    concrete_words = ['product', 'money', 'runway', 'table', 'breakfast', 'dinner', 'bug', 'system', 'code', 'mvp', 'futures', 'reality', 'insanity', 'rejection']
    features['concrete_density'] = sum(1 for word in concrete_words if word in text.lower()) / len(words) if words else 0
    
    # Wit indicators (contrasts, paradoxes)
    wit_patterns = ['but', 'yet', 'however', 'still', 'even', 'actually', 'really', 'just', 'somehow', 'wiring', 'refuses']
    features['wit_markers'] = sum(1 for pattern in wit_patterns if pattern in text.lower()) / len(words) if words else 0
    
    return features

def apply_structural_adjustments(base_score, text):
    """Apply structural adjustments to base similarity score"""
    features = extract_structural_features(text)
    structural_adjustments = 0
    
    # Bonus for conciseness (dry wit tends to be tight)
    if features['word_count'] <= 20:
        structural_adjustments += 0.15  # Bonus for tight, punchy delivery
    
    # Bonus for wit markers (dry humor indicators)
    if features['wit_markers'] > 0.02:  # More than 2% wit words
        structural_adjustments += 0.12 * features['wit_markers']
    
    # Bonus for concrete language (vs. abstract metaphors)
    if features['concrete_density'] > features['metaphor_density']:
        structural_adjustments += 0.08  # Prefer concrete over flowery
    
    # Penalty for excessive metaphor density
    if features['metaphor_density'] > 0.15:  # More than 15% metaphor words
        structural_adjustments -= 0.15
    elif features['metaphor_density'] > 0.10:  # More than 10% metaphor words
        structural_adjustments -= 0.08
    
    # Bonus for strong endings (twist detection)
    if features['short_ending'] and features['ends_with_noun']:
        structural_adjustments += 0.06  # Punchy endings
    
    # Penalty for excessive length without structure
    if features['word_count'] > 30 and features['sentence_count'] == 1:
        structural_adjustments -= 0.10  # Run-on sentences
    
    # Bonus for mid-range length with good structure
    if 15 <= features['word_count'] <= 25 and features['sentence_count'] == 1:
        structural_adjustments += 0.05  # Well-structured one-liners
    
    return structural_adjustments, features

def apply_calibration_transform(raw_score):
    """Apply the recommended 1-10 scaling transform"""
    scaled_score = 10 * ((raw_score + 0.2) / 0.8)
    return max(0, min(10, scaled_score))  # Clamp to [0, 10]

def main():
    print("🚀 Quick Structural Test - Enhanced Scoring Analysis")
    print("=" * 65)
    
    # Test completions with original simple_enhanced_scoring results
    test_data = [
        ("Being a founder means waking up every day and convincing the universe that your hallucination deserves a runway.", -0.053),
        ("You are the priest, the pyromaniac, and the prophet — building churches out of code and hope.", +0.584),
        ("It's choosing to be broke, broken, and burning — all in the name of something that doesn't exist yet.", +0.177),
        ("Being a founder is pitching insanity until someone wires you money for it.", -0.075),
        ("You're the bug in the system that refuses to be patched — and somehow, you scale.", +0.074),
        ("It's bleeding on the product so no one else has to.", +0.405),
        ("You become the gravity in a universe that didn't know it was spinning around you.", +0.274),
        ("Founders eat rejection for breakfast and still show up to dinner like they own the table.", +0.032),
        ("It means selling futures with no guarantee of sunrise.", +0.160),
        ("Being a founder is breaking reality with conviction and calling it MVP v1.", -0.100),
        ("Being a founder is like holding a wildfire in your hands, dancing with the flames that will either consume you or set the world ablaze.", +0.010),
        ("Founders are the cartographers of the unknown, charting courses through uncharted territories where the only map is the one etched on their souls.", -0.072),
        ("A founder is a time traveler, leaping through the wormhole of their own imagination, emerging on the other side with a vision that defies the laws of reality.", -0.012),
        ("Being a founder is like being a maestro, conducting the symphony of chaos, orchestrating the harmony of discord, and creating a masterpiece that will be remembered for eternity.", -0.089),
        ("Founders are the alchemists of the digital age, transforming base metals into gold, turning lead into liquid courage, and conjuring the impossible from the ether.", -0.176),
        ("A founder is a warrior, charging into the fray with a battle cry that echoes through the valleys of doubt and fear, leaving a trail of glory in their wake.", +0.085),
        ("Being a founder is like being a poet, weaving a tapestry of words that paint a picture of a world yet to be born, a world where the impossible becomes possible and the future is written in the stars.", -0.100),
        ("Founders are the dreamers, the schemers, the believers, and the doers, all rolled into one — a human dynamo that refuses to be silenced, a force of nature that will not be contained.", +0.058),
        ("A founder is a phoenix, rising from the ashes of failure, reborn from the embers of doubt, and soaring into the skies of possibility.", +0.034),
        ("Being a founder is like being a shaman, communing with the spirits of the digital realm, channeling the energy of the unknown, and bringing forth a vision that will change the world forever.", -0.071)
    ]
    
    # Apply structural adjustments
    results = []
    for i, (text, base_score) in enumerate(test_data):
        structural_adj, features = apply_structural_adjustments(base_score, text)
        enhanced_score = base_score + structural_adj
        calibrated_score = apply_calibration_transform(enhanced_score)
        
        results.append({
            'index': i + 1,
            'text': text,
            'base_score': base_score,
            'structural_adj': structural_adj,
            'enhanced_score': enhanced_score,
            'calibrated_score': calibrated_score,
            'features': features
        })
    
    # Sort by enhanced score
    sorted_results = sorted(results, key=lambda x: x['enhanced_score'], reverse=True)
    
    print("\n📈 ENHANCED SCORES (with Structural Adjustments):")
    print("-" * 80)
    for rank, result in enumerate(sorted_results, 1):
        print(f"{rank:2d}. #{result['index']:2d} | Base: {result['base_score']:+.3f} | Adj: {result['structural_adj']:+.3f} | Enhanced: {result['enhanced_score']:+.3f} | Cal: {result['calibrated_score']:.1f}")
        print(f"    {result['text'][:75]}{'...' if len(result['text']) > 75 else ''}")
        print()
    
    print("📊 ORIGINAL ORDER WITH ENHANCED SCORES:")
    print("-" * 80)
    for result in results:
        print(f"{result['index']:2d}. Base: {result['base_score']:+.3f} | Adj: {result['structural_adj']:+.3f} | Enhanced: {result['enhanced_score']:+.3f} | Cal: {result['calibrated_score']:.1f}")
        print(f"    {result['text'][:75]}{'...' if len(result['text']) > 75 else ''}")
        print()
    
    # Show detailed analysis for key examples
    print("🔍 STRUCTURAL ANALYSIS (Key Examples):")
    print("-" * 60)
    
    # Check specific examples: #1, #2, #10, #11, #15
    key_examples = [0, 1, 9, 10, 14]  # indices for #1, #2, #10, #11, #15
    for idx in key_examples:
        result = results[idx]
        features = result['features']
        print(f"\n#{result['index']}: {result['text'][:50]}...")
        print(f"  Base score: {result['base_score']:+.3f}")
        print(f"  Structural adjustment: {result['structural_adj']:+.3f}")
        print(f"  Enhanced score: {result['enhanced_score']:+.3f}")
        print(f"  Calibrated (1-10): {result['calibrated_score']:.1f}")
        print(f"  Words: {features['word_count']}, Concrete: {features['concrete_density']:.3f}, Metaphor: {features['metaphor_density']:.3f}")
        print(f"  Wit markers: {features['wit_markers']:.3f}, Short ending: {features['short_ending']}")
    
    # Summary of improvements
    print("\n💡 STRUCTURAL IMPROVEMENTS SUMMARY:")
    print("-" * 50)
    
    # Check if #1 and #10 improved
    original_1_rank = next(i for i, r in enumerate(sorted_results) if r['index'] == 1) + 1
    original_10_rank = next(i for i, r in enumerate(sorted_results) if r['index'] == 10) + 1
    
    print(f"• #1 (hallucination/runway): Enhanced score = {results[0]['enhanced_score']:+.3f}, New rank = {original_1_rank}")
    print(f"• #10 (breaking reality/MVP): Enhanced score = {results[9]['enhanced_score']:+.3f}, New rank = {original_10_rank}")
    
    # Check if metaphor-heavy ones were penalized
    metaphor_penalties = [r for r in results if r['structural_adj'] < -0.05]
    print(f"• {len(metaphor_penalties)} completions received metaphor penalties")
    for r in metaphor_penalties:
        print(f"  #{r['index']}: {r['structural_adj']:+.3f} penalty")
    
    print(f"\n• Score range: {sorted_results[-1]['enhanced_score']:+.3f} to {sorted_results[0]['enhanced_score']:+.3f}")
    print(f"• Calibrated range: {min(r['calibrated_score'] for r in results):.1f} to {max(r['calibrated_score'] for r in results):.1f}")

if __name__ == "__main__":
    main() 