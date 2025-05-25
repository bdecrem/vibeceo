#!/usr/bin/env python3
"""
Simple Enhanced Similarity Scoring System
Focuses on robust similarity metrics without complex feature engineering
"""

import requests
import pandas as pd
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity, euclidean_distances
from sklearn.preprocessing import StandardScaler
import json
import time

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
            time.sleep(0.1)  # Small delay between batches
            
        except Exception as e:
            print(f"❌ Error processing batch {batch_num}: {e}")
            return None
    
    return np.vstack(all_embeddings)

def calculate_enhanced_similarity(test_embedding, gold_embeddings, base_embeddings):
    """Calculate enhanced similarity score using multiple robust metrics"""
    
    # 1. Cosine similarity to GOLD samples
    gold_similarities = cosine_similarity([test_embedding], gold_embeddings)[0]
    gold_mean = np.mean(gold_similarities)
    gold_max = np.max(gold_similarities)
    gold_90th = np.percentile(gold_similarities, 90)
    
    # 2. Cosine similarity to BASE samples  
    base_similarities = cosine_similarity([test_embedding], base_embeddings)[0]
    base_mean = np.mean(base_similarities)
    base_max = np.max(base_similarities)
    
    # 3. Distance-based metrics (inverted for similarity interpretation)
    gold_distances = euclidean_distances([test_embedding], gold_embeddings)[0]
    base_distances = euclidean_distances([test_embedding], base_embeddings)[0]
    
    gold_dist_mean = np.mean(gold_distances)
    base_dist_mean = np.mean(base_distances)
    
    # 4. Centroid-based similarity
    gold_centroid = np.mean(gold_embeddings, axis=0)
    base_centroid = np.mean(base_embeddings, axis=0)
    
    centroid_gold_sim = cosine_similarity([test_embedding], [gold_centroid])[0][0]
    centroid_base_sim = cosine_similarity([test_embedding], [base_centroid])[0][0]
    
    # 5. Calculate composite score
    # Higher GOLD similarity = positive score
    # Higher BASE similarity = negative score
    
    similarity_differential = (gold_mean - base_mean) * 5.0  # Amplify differences
    max_differential = (gold_max - base_max) * 3.0
    percentile_bonus = (gold_90th - base_mean) * 2.0
    distance_differential = (base_dist_mean - gold_dist_mean) * 0.5  # Smaller distance to GOLD is better
    centroid_differential = (centroid_gold_sim - centroid_base_sim) * 4.0
    
    # Weighted ensemble score
    composite_score = (
        0.3 * similarity_differential +
        0.2 * max_differential + 
        0.2 * percentile_bonus +
        0.1 * distance_differential +
        0.2 * centroid_differential
    )
    
    return {
        'composite_score': composite_score,
        'gold_mean_sim': gold_mean,
        'base_mean_sim': base_mean,
        'gold_max_sim': gold_max,
        'gold_90th_sim': gold_90th,
        'centroid_gold_sim': centroid_gold_sim,
        'centroid_base_sim': centroid_base_sim,
        'similarity_differential': similarity_differential
    }

def main():
    print("🚀 Simple Enhanced Similarity Scoring System")
    print("=" * 60)
    
    # Load training data
    print("\n📊 Loading training data...")
    try:
        df = pd.read_csv(CSV_FILE)
        print(f"   Loaded {len(df)} training samples")
    except Exception as e:
        print(f"❌ Error loading CSV: {e}")
        return
    
    # Get embeddings for ALL training data
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
    
    # Test completions (your 20 founder quotes)
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
    
    # Score the completions
    print("\n🧮 Calculating enhanced similarity scores...")
    results = []
    for i, embedding in enumerate(test_embeddings):
        result = calculate_enhanced_similarity(embedding, gold_embeddings, base_embeddings)
        results.append(result)
    
    # Display results
    print("\n" + "=" * 80)
    print("🏆 SIMPLE ENHANCED SIMILARITY SCORES")
    print("=" * 80)
    
    scored_completions = []
    for i, (completion, result) in enumerate(zip(test_completions, results)):
        scored_completions.append((i+1, result['composite_score'], completion, result))
    
    # Sort by score (highest first)
    scored_completions.sort(key=lambda x: x[1], reverse=True)
    
    print("\n📈 RANKED BY ENHANCED SIMILARITY SCORE:")
    print("-" * 80)
    for rank, (orig_num, score, completion, _) in enumerate(scored_completions, 1):
        print(f"{rank:2d}. #{orig_num:2d} | Score: {score:+.3f} | {completion[:75]}{'...' if len(completion) > 75 else ''}")
    
    print("\n📊 ORIGINAL ORDER WITH SCORES:")
    print("-" * 80)
    for i, (completion, result) in enumerate(zip(test_completions, results)):
        score = result['composite_score']
        print(f"{i+1:2d}. Score: {score:+.3f} | {completion[:75]}{'...' if len(completion) > 75 else ''}")
    
    # Show detailed breakdown for top 5
    print("\n🔍 DETAILED BREAKDOWN (Top 5):")
    print("-" * 60)
    for rank, (orig_num, score, completion, result) in enumerate(scored_completions[:5], 1):
        print(f"\n#{rank} (Original #{orig_num}) - Score: {score:+.3f}")
        print(f"  GOLD similarity: {result['gold_mean_sim']:.3f} (max: {result['gold_max_sim']:.3f})")
        print(f"  BASE similarity: {result['base_mean_sim']:.3f}")
        print(f"  Differential: {result['similarity_differential']:+.3f}")
        print(f"  Centroid GOLD: {result['centroid_gold_sim']:.3f}")
        print(f"  Centroid BASE: {result['centroid_base_sim']:.3f}")
    
    # Compare with previous results 
    print("\n💡 INSIGHTS:")
    print("-" * 40)
    print(f"Score range: {results[0]['composite_score']:.3f} to {results[-1]['composite_score']:.3f}")
    print(f"Average GOLD similarity: {np.mean([r['gold_mean_sim'] for r in results]):.3f}")
    print(f"Average BASE similarity: {np.mean([r['base_mean_sim'] for r in results]):.3f}")
    print(f"System is {'working well' if abs(scored_completions[0][1] - scored_completions[-1][1]) > 0.1 else 'showing small differences'}")

if __name__ == "__main__":
    main() 