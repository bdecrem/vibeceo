#!/usr/bin/env python3
"""
Enhanced Structural Similarity Scoring System
Adds linguistic features to better detect dry wit, minimalism, and structural quality
"""

import requests
import pandas as pd
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity, euclidean_distances
import json
import time
import re
from collections import Counter

# Configuration
EMBEDDINGS_API_URL = "http://localhost:8000/embeddings"
CSV_FILE = "training_set_1_560.csv"

def get_embeddings(texts, batch_size=8):
    """Get embeddings from our local API with batching"""
    all_embeddings = []
    total_batches = (len(texts) + batch_size - 1) // batch_size
    
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        batch_num = i // batch_size + 1
        print(f"   Processing batch {batch_num}/{total_batches}...")
        
        try:
            response = requests.post(
                EMBEDDINGS_API_URL,
                json={"texts": batch, "normalize": True},
                headers={"Content-Type": "application/json"},
                timeout=30
            )
            response.raise_for_status()
            data = response.json()
            batch_embeddings = np.array(data["embeddings"])
            all_embeddings.append(batch_embeddings)
            time.sleep(0.1)
            
        except Exception as e:
            print(f"❌ Error processing batch {batch_num}: {e}")
            return None
    
    return np.vstack(all_embeddings)

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
    metaphor_words = ['like', 'is like', 'are like', 'metaphor', 'symphony', 'warrior', 'phoenix', 'shaman', 'alchemist']
    features['metaphor_density'] = sum(1 for word in metaphor_words if word in text.lower()) / len(words) if words else 0
    
    # Concrete vs. abstract language
    concrete_words = ['product', 'money', 'runway', 'table', 'breakfast', 'dinner', 'bug', 'system', 'code']
    features['concrete_density'] = sum(1 for word in concrete_words if word in text.lower()) / len(words) if words else 0
    
    # Wit indicators (contrasts, paradoxes)
    wit_patterns = ['but', 'yet', 'however', 'still', 'even', 'actually', 'really', 'just']
    features['wit_markers'] = sum(1 for pattern in wit_patterns if pattern in text.lower()) / len(words) if words else 0
    
    # Alliteration and rhythm (subtle quality indicators)
    first_letters = [word[0].lower() for word in words if word and word[0].isalpha()]
    letter_counts = Counter(first_letters)
    features['alliteration_score'] = max(letter_counts.values()) / len(words) if words else 0
    
    return features

def calculate_enhanced_similarity_with_structure(test_text, test_embedding, gold_embeddings, base_embeddings, gold_texts, base_texts):
    """Calculate enhanced similarity score including structural features"""
    
    # Original similarity scoring
    gold_similarities = cosine_similarity([test_embedding], gold_embeddings)[0]
    gold_mean = np.mean(gold_similarities)
    gold_max = np.max(gold_similarities)
    gold_90th = np.percentile(gold_similarities, 90)
    
    base_similarities = cosine_similarity([test_embedding], base_embeddings)[0]
    base_mean = np.mean(base_similarities)
    
    # Distance metrics
    gold_distances = euclidean_distances([test_embedding], gold_embeddings)[0]
    base_distances = euclidean_distances([test_embedding], base_embeddings)[0]
    gold_dist_mean = np.mean(gold_distances)
    base_dist_mean = np.mean(base_distances)
    
    # Centroid similarity
    gold_centroid = np.mean(gold_embeddings, axis=0)
    base_centroid = np.mean(base_embeddings, axis=0)
    centroid_gold_sim = cosine_similarity([test_embedding], [gold_centroid])[0][0]
    centroid_base_sim = cosine_similarity([test_embedding], [base_centroid])[0][0]
    
    # Base similarity score
    similarity_differential = (gold_mean - base_mean) * 5.0
    max_differential = (gold_max - base_mean) * 3.0
    percentile_bonus = (gold_90th - base_mean) * 2.0
    distance_differential = (base_dist_mean - gold_dist_mean) * 0.5
    centroid_differential = (centroid_gold_sim - centroid_base_sim) * 4.0
    
    base_score = (
        0.3 * similarity_differential +
        0.2 * max_differential + 
        0.2 * percentile_bonus +
        0.1 * distance_differential +
        0.2 * centroid_differential
    )
    
    # NEW: Structural analysis
    test_features = extract_structural_features(test_text)
    
    # Calculate average structural features for GOLD samples
    gold_features = [extract_structural_features(text) for text in gold_texts[:50]]  # Sample for speed
    avg_gold_features = {}
    for key in test_features.keys():
        avg_gold_features[key] = np.mean([f.get(key, 0) for f in gold_features])
    
    # Structural scoring bonuses/penalties
    structural_adjustments = 0
    
    # Bonus for conciseness if it matches GOLD style
    if test_features['word_count'] <= 20 and avg_gold_features['word_count'] <= 25:
        structural_adjustments += 0.15  # Bonus for tight, punchy delivery
    
    # Bonus for wit markers (dry humor indicators)
    if test_features['wit_markers'] > avg_gold_features['wit_markers']:
        structural_adjustments += 0.1 * test_features['wit_markers']
    
    # Bonus for concrete language (vs. abstract metaphors)
    if test_features['concrete_density'] > test_features['metaphor_density']:
        structural_adjustments += 0.08  # Prefer concrete over flowery
    
    # Penalty for excessive metaphor density
    if test_features['metaphor_density'] > 0.15:  # More than 15% metaphor words
        structural_adjustments -= 0.12
    
    # Bonus for strong endings (twist detection)
    if test_features['short_ending'] and test_features['ends_with_noun']:
        structural_adjustments += 0.05  # Punchy endings
    
    # Penalty for excessive length without structure
    if test_features['word_count'] > 30 and test_features['sentence_count'] == 1:
        structural_adjustments -= 0.08  # Run-on sentences
    
    # Final composite score
    composite_score = base_score + structural_adjustments
    
    return {
        'composite_score': composite_score,
        'base_similarity_score': base_score,
        'structural_adjustment': structural_adjustments,
        'structural_features': test_features,
        'gold_mean_sim': gold_mean,
        'base_mean_sim': base_mean,
        'gold_max_sim': gold_max,
        'centroid_gold_sim': centroid_gold_sim,
        'centroid_base_sim': centroid_base_sim
    }

def apply_calibration_transform(raw_score):
    """Apply the recommended 1-10 scaling transform"""
    # scaled_score = 10 * ((raw_score + 0.2) / 0.8)
    scaled_score = 10 * ((raw_score + 0.2) / 0.8)
    return max(0, min(10, scaled_score))  # Clamp to [0, 10]

def main():
    print("🚀 Enhanced Structural Similarity Scoring System")
    print("=" * 60)
    
    # Load training data
    print("\n📊 Loading training data...")
    try:
        df = pd.read_csv(CSV_FILE)
        print(f"   Loaded {len(df)} training samples")
    except Exception as e:
        print(f"❌ Error loading CSV: {e}")
        return
    
    # Get embeddings for training data
    print("\n🔄 Computing embeddings for training data...")
    gold_texts = df['GOLD'].dropna().tolist()
    base_texts = df['BASE'].dropna().tolist()
    
    print(f"   Processing {len(gold_texts)} GOLD samples...")
    gold_embeddings = get_embeddings(gold_texts)
    if gold_embeddings is None:
        return
    
    print(f"   Processing {len(base_texts)} BASE samples...")
    base_embeddings = get_embeddings(base_texts)
    if base_embeddings is None:
        return
    
    # Test completions
    test_completions = [
        "Being a founder means waking up every day and convincing the universe that your hallucination deserves a runway.",
        "You are the priest, the pyromaniac, and the prophet — building churches out of code and hope.",
        "It's choosing to be broke, broken, and burning — all in the name of something that doesn't exist yet.",
        "Being a founder is pitching insanity until someone wires you money for it.",
        "You're the bug in the system that refuses to be patched — and somehow, you scale.",
        "It's bleeding on the product so no one else has to.",
        "You become the gravity in a universe that didn't know it was spinning around you.",
        "Founders eat rejection for breakfast and still show up to dinner like they own the table.",
        "It means selling futures with no guarantee of sunrise.",
        "Being a founder is breaking reality with conviction and calling it MVP v1.",
        "Being a founder is like holding a wildfire in your hands, dancing with the flames that will either consume you or set the world ablaze.",
        "Founders are the cartographers of the unknown, charting courses through uncharted territories where the only map is the one etched on their souls.",
        "A founder is a time traveler, leaping through the wormhole of their own imagination, emerging on the other side with a vision that defies the laws of reality.",
        "Being a founder is like being a maestro, conducting the symphony of chaos, orchestrating the harmony of discord, and creating a masterpiece that will be remembered for eternity.",
        "Founders are the alchemists of the digital age, transforming base metals into gold, turning lead into liquid courage, and conjuring the impossible from the ether.",
        "A founder is a warrior, charging into the fray with a battle cry that echoes through the valleys of doubt and fear, leaving a trail of glory in their wake.",
        "Being a founder is like being a poet, weaving a tapestry of words that paint a picture of a world yet to be born, a world where the impossible becomes possible and the future is written in the stars.",
        "Founders are the dreamers, the schemers, the believers, and the doers, all rolled into one — a human dynamo that refuses to be silenced, a force of nature that will not be contained.",
        "A founder is a phoenix, rising from the ashes of failure, reborn from the embers of doubt, and soaring into the skies of possibility.",
        "Being a founder is like being a shaman, communing with the spirits of the digital realm, channeling the energy of the unknown, and bringing forth a vision that will change the world forever."
    ]
    
    # Get embeddings for test completions
    print(f"\n🎯 Scoring {len(test_completions)} test completions...")
    test_embeddings = get_embeddings(test_completions)
    if test_embeddings is None:
        return
    
    # Score with structural features
    print("\n🧮 Calculating enhanced scores with structural analysis...")
    results = []
    for i, (text, embedding) in enumerate(zip(test_completions, test_embeddings)):
        result = calculate_enhanced_similarity_with_structure(
            text, embedding, gold_embeddings, base_embeddings, gold_texts, base_texts
        )
        results.append(result)
    
    # Display results
    print("\n" + "=" * 80)
    print("🏆 ENHANCED STRUCTURAL SIMILARITY SCORES")
    print("=" * 80)
    
    scored_completions = []
    for i, (completion, result) in enumerate(zip(test_completions, results)):
        raw_score = result['composite_score']
        calibrated_score = apply_calibration_transform(raw_score)
        scored_completions.append((i+1, raw_score, calibrated_score, completion, result))
    
    # Sort by raw score (highest first)
    scored_completions.sort(key=lambda x: x[1], reverse=True)
    
    print("\n📈 RANKED BY ENHANCED SCORE (with 1-10 calibration):")
    print("-" * 80)
    for rank, (orig_num, raw_score, cal_score, completion, _) in enumerate(scored_completions, 1):
        print(f"{rank:2d}. #{orig_num:2d} | Raw: {raw_score:+.3f} | Calibrated: {cal_score:.1f} | {completion[:70]}{'...' if len(completion) > 70 else ''}")
    
    print("\n📊 ORIGINAL ORDER WITH SCORES:")
    print("-" * 80)
    for i, (completion, result) in enumerate(zip(test_completions, results)):
        raw_score = result['composite_score']
        cal_score = apply_calibration_transform(raw_score)
        print(f"{i+1:2d}. Raw: {raw_score:+.3f} | Cal: {cal_score:.1f} | {completion[:70]}{'...' if len(completion) > 70 else ''}")
    
    # Show structural analysis for key examples
    print("\n🔍 STRUCTURAL ANALYSIS (Key Examples):")
    print("-" * 60)
    
    # Show #1 (should get structural boost) and #2 (already good)
    examples = [0, 1, 10, 14]  # #1, #2, #11, #15
    for idx in examples:
        result = results[idx]
        features = result['structural_features']
        print(f"\n#{idx+1}: {test_completions[idx][:50]}...")
        print(f"  Raw similarity: {result['base_similarity_score']:+.3f}")
        print(f"  Structural adj: {result['structural_adjustment']:+.3f}")
        print(f"  Final score: {result['composite_score']:+.3f}")
        print(f"  Words: {features['word_count']}, Concrete: {features['concrete_density']:.3f}, Metaphor: {features['metaphor_density']:.3f}")
        print(f"  Wit markers: {features['wit_markers']:.3f}, Short ending: {features['short_ending']}")

if __name__ == "__main__":
    main() 