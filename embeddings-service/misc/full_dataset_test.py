#!/usr/bin/env python3
"""
Full Dataset Test Script for 20 Founder Completions
Uses ALL 560 GOLD and BASE samples for maximum accuracy
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

def get_embeddings(texts, batch_size=8):
    """Get embeddings from our local API with smaller batches"""
    all_embeddings = []
    total_batches = (len(texts) + batch_size - 1) // batch_size
    
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        batch_num = i // batch_size + 1
        print(f"   Processing batch {batch_num}/{total_batches} ({len(batch)} texts)...")
        
        try:
            response = requests.post(
                EMBEDDINGS_API_URL,
                json={"texts": batch, "normalize": True},
                headers={"Content-Type": "application/json"},
                timeout=60
            )
            response.raise_for_status()
            data = response.json()
            batch_embeddings = np.array(data["embeddings"])
            all_embeddings.append(batch_embeddings)
            time.sleep(0.2)  # Longer delay for stability
        except Exception as e:
            print(f"❌ Error processing batch {batch_num}: {e}")
            return None
    
    if all_embeddings:
        return np.vstack(all_embeddings)
    else:
        return None

def calculate_similarity_scores(test_embeddings, gold_embeddings, base_embeddings):
    """Calculate similarity scores against FULL GOLD and BASE training sets"""
    
    print("   Calculating GOLD similarities...")
    # Calculate average similarity to ALL GOLD examples
    gold_similarities = cosine_similarity(test_embeddings, gold_embeddings)
    avg_gold_similarity = np.mean(gold_similarities, axis=1)
    
    print("   Calculating BASE similarities...")
    # Calculate average similarity to ALL BASE examples  
    base_similarities = cosine_similarity(test_embeddings, base_embeddings)
    avg_base_similarity = np.mean(base_similarities, axis=1)
    
    # Quality score = GOLD similarity - BASE similarity
    quality_scores = avg_gold_similarity - avg_base_similarity
    
    return avg_gold_similarity, avg_base_similarity, quality_scores

def print_results(test_texts, gold_sims, base_sims, quality_scores, trusted_scores):
    """Print formatted results with comparison to trusted scorer"""
    print("\n" + "="*120)
    print("🎯 FULL DATASET SIMILARITY SCORES vs TRUSTED SCORER")
    print("="*120)
    
    # Sort by quality score (best first)
    sorted_indices = np.argsort(quality_scores)[::-1]
    
    for rank, i in enumerate(sorted_indices, 1):
        text = test_texts[i]
        print(f"\n🏆 RANK #{rank}: {text[:80]}...")
        print(f"   📈 GOLD Similarity:  {gold_sims[i]:.3f}")
        print(f"   📉 BASE Similarity:  {base_sims[i]:.3f}")
        print(f"   🎯 Our Score:       {quality_scores[i]:+.3f}")
        print(f"   ⭐ Trusted Score:   {trusted_scores[i]:.1f}/10")
        
        # Calculate correlation
        score_diff = abs(quality_scores[i] - (trusted_scores[i] - 7.5) / 5)  # Normalize trusted score
        if score_diff < 0.05:
            correlation = "🎯 PERFECT MATCH"
        elif score_diff < 0.1:
            correlation = "✅ GOOD MATCH"
        elif score_diff < 0.2:
            correlation = "👍 FAIR MATCH"
        else:
            correlation = "⚠️  POOR MATCH"
            
        print(f"   📊 Correlation:     {correlation}")

def main():
    print("🚀 Testing with FULL DATASET (All 560 GOLD + BASE samples)...")
    
    # Trusted scorer results (from your image)
    trusted_scores = [
        10.0, 10.0, 9.5, 10.0, 9.0, 9.0, 9.0, 9.5, 10.0, 9.0,  # Donte Gold (1-10)
        7.5, 6.0, 6.5, 6.5, 6.0, 6.5, 5.5, 5.0, 5.5, 6.5       # Model Generated (11-20)
    ]
    
    # Step 1: Load training data
    print("\n📚 Loading FULL training dataset...")
    try:
        df = pd.read_csv(CSV_FILE)
        print(f"✅ Loaded {len(df)} training examples")
    except Exception as e:
        print(f"❌ Error loading CSV: {e}")
        return
    
    # Step 2: Use ALL training data (no sampling!)
    print("\n🎯 Using ALL training data for maximum accuracy...")
    
    gold_samples = df['GOLD'].dropna().tolist()
    base_samples = df['BASE'].dropna().tolist()
    
    print(f"✅ Using ALL {len(gold_samples)} GOLD examples")
    print(f"✅ Using ALL {len(base_samples)} BASE examples")
    
    # Step 3: Get embeddings for ALL reference data
    print(f"\n🔄 Getting embeddings for {len(gold_samples)} GOLD examples...")
    gold_embeddings = get_embeddings(gold_samples)
    if gold_embeddings is None:
        return
    
    print(f"🔄 Getting embeddings for {len(base_samples)} BASE examples...")
    base_embeddings = get_embeddings(base_samples)
    if base_embeddings is None:
        return
    
    print("✅ Full reference embeddings ready!")
    
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
    print("\n📊 Calculating similarity scores against FULL dataset...")
    gold_sims, base_sims, quality_scores = calculate_similarity_scores(
        test_embeddings, gold_embeddings, base_embeddings
    )
    
    # Step 7: Print results with trusted score comparison
    print_results(test_completions, gold_sims, base_sims, quality_scores, trusted_scores)
    
    # Step 8: Enhanced statistics
    print("\n" + "="*120)
    print("📈 COMPARISON ANALYSIS")
    print("="*120)
    
    # Split into groups
    donte_scores = quality_scores[:10]
    model_scores = quality_scores[10:]
    trusted_donte = trusted_scores[:10] 
    trusted_model = trusted_scores[10:]
    
    print(f"📊 DONTE GOLD (1-10):")
    print(f"   Our Avg Score:     {np.mean(donte_scores):+.3f}")
    print(f"   Trusted Avg:       {np.mean(trusted_donte):.1f}/10")
    print(f"   Our Range:         {np.min(donte_scores):+.3f} to {np.max(donte_scores):+.3f}")
    print(f"   Trusted Range:     {np.min(trusted_donte):.1f} to {np.max(trusted_donte):.1f}")
    
    print(f"\n📊 MODEL GENERATED (11-20):")
    print(f"   Our Avg Score:     {np.mean(model_scores):+.3f}")
    print(f"   Trusted Avg:       {np.mean(trusted_model):.1f}/10")
    print(f"   Our Range:         {np.min(model_scores):+.3f} to {np.max(model_scores):+.3f}")
    print(f"   Trusted Range:     {np.min(trusted_model):.1f} to {np.max(trusted_model):.1f}")
    
    # Gap analysis
    our_gap = np.mean(donte_scores) - np.mean(model_scores)
    trusted_gap = np.mean(trusted_donte) - np.mean(trusted_model)
    
    print(f"\n🎯 GAP ANALYSIS:")
    print(f"   Our Separation:    {our_gap:+.3f}")
    print(f"   Trusted Separation: {trusted_gap:.1f} points")
    print(f"   Gap Ratio:         {abs(our_gap / (trusted_gap / 5)):.2f}x (should be ~1.0)")
    
    print("\n🎉 Full dataset test complete! This should match your trusted scorer much better.")

if __name__ == "__main__":
    main() 