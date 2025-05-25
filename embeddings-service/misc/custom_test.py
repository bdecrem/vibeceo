#!/usr/bin/env python3
"""
Custom Test Script for 20 Founder Completions
Tests specific user-provided completions against GOLD/BASE training data
"""

import requests
import pandas as pd
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
import json
import time

# Configuration
EMBEDDINGS_API_URL = "http://localhost:8000/embeddings"
CSV_FILE = "training_set_1_560.csv"

def get_embeddings(texts, batch_size=10):
    """Get embeddings from our local API with batching"""
    all_embeddings = []
    
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        print(f"   Processing batch {i//batch_size + 1}/{(len(texts) + batch_size - 1)//batch_size}...")
        
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
            print(f"❌ Error processing batch: {e}")
            return None
    
    if all_embeddings:
        return np.vstack(all_embeddings)
    else:
        return None

def calculate_similarity_scores(test_embeddings, gold_embeddings, base_embeddings):
    """Calculate similarity scores against GOLD and BASE training sets"""
    
    # Calculate average similarity to GOLD examples
    gold_similarities = cosine_similarity(test_embeddings, gold_embeddings)
    avg_gold_similarity = np.mean(gold_similarities, axis=1)
    
    # Calculate average similarity to BASE examples  
    base_similarities = cosine_similarity(test_embeddings, base_embeddings)
    avg_base_similarity = np.mean(base_similarities, axis=1)
    
    # Quality score = GOLD similarity - BASE similarity
    quality_scores = avg_gold_similarity - avg_base_similarity
    
    return avg_gold_similarity, avg_base_similarity, quality_scores

def print_results(test_texts, gold_sims, base_sims, quality_scores):
    """Print formatted results"""
    print("\n" + "="*100)
    print("🎯 FOUNDER COMPLETION QUALITY SCORES")
    print("="*100)
    
    # Sort by quality score (best first)
    sorted_indices = np.argsort(quality_scores)[::-1]
    
    for rank, i in enumerate(sorted_indices, 1):
        text = test_texts[i]
        print(f"\n🏆 RANK #{rank}: {text[:80]}...")
        print(f"   📈 GOLD Similarity:  {gold_sims[i]:.3f}")
        print(f"   📉 BASE Similarity:  {base_sims[i]:.3f}")
        print(f"   🎯 Quality Score:   {quality_scores[i]:+.3f}")
        
        if quality_scores[i] > 0.05:
            verdict = "✅ EXCELLENT (GOLD-like)"
        elif quality_scores[i] > 0:
            verdict = "👍 GOOD (slightly GOLD-like)"
        elif quality_scores[i] > -0.05:
            verdict = "😐 NEUTRAL"
        else:
            verdict = "⚠️  GENERIC (BASE-like)"
            
        print(f"   📊 VERDICT: {verdict}")

def main():
    print("🚀 Testing 20 Founder Completions...")
    
    # Step 1: Load training data
    print("\n📚 Loading training data...")
    try:
        df = pd.read_csv(CSV_FILE)
        print(f"✅ Loaded {len(df)} training examples")
    except Exception as e:
        print(f"❌ Error loading CSV: {e}")
        return
    
    # Step 2: Sample training data for reference (smaller sample for stability)
    print("\n🎯 Sampling reference data...")
    sample_size = 25  # Reduced size to avoid API overload
    
    gold_samples = df['GOLD'].dropna().sample(n=min(sample_size, len(df))).tolist()
    base_samples = df['BASE'].dropna().sample(n=min(sample_size, len(df))).tolist()
    
    print(f"✅ Selected {len(gold_samples)} GOLD and {len(base_samples)} BASE examples")
    
    # Step 3: Get embeddings for reference data
    print("\n🔄 Getting embeddings for GOLD examples...")
    gold_embeddings = get_embeddings(gold_samples)
    if gold_embeddings is None:
        return
    
    print("🔄 Getting embeddings for BASE examples...")
    base_embeddings = get_embeddings(base_samples)
    if base_embeddings is None:
        return
    
    print("✅ Reference embeddings ready!")
    
    # Step 4: Define the 20 founder completions
    print("\n🧪 Testing 20 founder completions...")
    
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
    
    # Step 5: Get embeddings for test completions
    test_embeddings = get_embeddings(test_completions)
    if test_embeddings is None:
        return
    
    # Step 6: Calculate similarity scores
    print("📊 Calculating similarity scores...")
    gold_sims, base_sims, quality_scores = calculate_similarity_scores(
        test_embeddings, gold_embeddings, base_embeddings
    )
    
    # Step 7: Print results
    print_results(test_completions, gold_sims, base_sims, quality_scores)
    
    # Step 8: Summary statistics
    print("\n" + "="*100)
    print("📈 SUMMARY STATISTICS")
    print("="*100)
    print(f"Average Quality Score: {np.mean(quality_scores):+.3f}")
    print(f"Quality Score Range: {np.min(quality_scores):+.3f} to {np.max(quality_scores):+.3f}")
    
    excellent_count = sum(1 for score in quality_scores if score > 0.05)
    good_count = sum(1 for score in quality_scores if 0 <= score <= 0.05)
    neutral_count = sum(1 for score in quality_scores if -0.05 <= score < 0)
    generic_count = sum(1 for score in quality_scores if score < -0.05)
    
    print(f"✅ Excellent (GOLD-like): {excellent_count}/20")
    print(f"👍 Good: {good_count}/20")
    print(f"😐 Neutral: {neutral_count}/20") 
    print(f"⚠️  Generic (BASE-like): {generic_count}/20")
    
    print("\n🔥 TOP 5 BEST COMPLETIONS:")
    top_5_indices = np.argsort(quality_scores)[-5:][::-1]
    for i, idx in enumerate(top_5_indices, 1):
        print(f"{i}. Score: {quality_scores[idx]:+.3f} - {test_completions[idx][:60]}...")
    
    print("\n💀 BOTTOM 5 WORST COMPLETIONS:")
    bottom_5_indices = np.argsort(quality_scores)[:5]
    for i, idx in enumerate(bottom_5_indices, 1):
        print(f"{i}. Score: {quality_scores[idx]:+.3f} - {test_completions[idx][:60]}...")
    
    print("\n🎉 Test complete! This shows which Discord bot completions would be filtered out.")

if __name__ == "__main__":
    main() 