#!/usr/bin/env python3
"""
Similarity Test Script for VibeCEO Training Data
Tests if embeddings can distinguish between GOLD and BASE quality responses
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

def get_embeddings(texts):
    """Get embeddings from our local API"""
    try:
        response = requests.post(
            EMBEDDINGS_API_URL,
            json={"texts": texts, "normalize": True},
            headers={"Content-Type": "application/json"}
        )
        response.raise_for_status()
        data = response.json()
        return np.array(data["embeddings"])
    except Exception as e:
        print(f"❌ Error getting embeddings: {e}")
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
    print("\n" + "="*80)
    print("🎯 SIMILARITY TEST RESULTS")
    print("="*80)
    
    for i, text in enumerate(test_texts):
        print(f"\n📝 Test #{i+1}: {text[:60]}...")
        print(f"   📈 GOLD Similarity:  {gold_sims[i]:.3f}")
        print(f"   📉 BASE Similarity:  {base_sims[i]:.3f}")
        print(f"   🎯 Quality Score:   {quality_scores[i]:+.3f}")
        
        if quality_scores[i] > 0.1:
            verdict = "✅ EXCELLENT (GOLD-like)"
        elif quality_scores[i] > 0:
            verdict = "👍 GOOD (slightly GOLD-like)"
        elif quality_scores[i] > -0.1:
            verdict = "😐 NEUTRAL"
        else:
            verdict = "⚠️  GENERIC (BASE-like)"
            
        print(f"   📊 VERDICT: {verdict}")

def main():
    print("🚀 Starting VibeCEO Similarity Test...")
    
    # Step 1: Load training data
    print("\n📚 Loading training data...")
    try:
        df = pd.read_csv(CSV_FILE)
        print(f"✅ Loaded {len(df)} training examples")
    except Exception as e:
        print(f"❌ Error loading CSV: {e}")
        return
    
    # Step 2: Sample training data for reference
    print("\n🎯 Sampling reference data...")
    sample_size = 20  # Use 20 examples each for speed
    
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
    
    # Step 4: Define test completions (mix of styles)
    print("\n🧪 Testing new completions...")
    
    test_completions = [
        # Should score high (GOLD-like)
        "Series A isn't a raise, it's a resurrection. Walk in like the deck's a scripture.",
        "No is runway. Collect them like receipts.",
        "Equity is blood. Spill just enough to bring them close.",
        
        # Should score low (BASE-like)  
        "Fuel the fire, not the flames, because a Series A is not a sprint, it's a marathon of momentum!",
        "NO is just a speed bump on the highway to YES, baby - you gotta rev up your engine!",
        "Give up the keys, not the kingdom - 10% is the new 20!",
        
        # Mixed/Test cases
        "Focus on product-market fit and customer validation.",
        "Build fast, ship faster, iterate fastest.",
        "Your startup is your legacy in motion."
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
    print("\n" + "="*80)
    print("📈 SUMMARY STATISTICS")
    print("="*80)
    print(f"Average Quality Score: {np.mean(quality_scores):+.3f}")
    print(f"Quality Score Range: {np.min(quality_scores):+.3f} to {np.max(quality_scores):+.3f}")
    
    excellent_count = sum(1 for score in quality_scores if score > 0.1)
    generic_count = sum(1 for score in quality_scores if score < -0.1)
    
    print(f"✅ Excellent responses: {excellent_count}/{len(test_completions)}")
    print(f"⚠️  Generic responses: {generic_count}/{len(test_completions)}")
    
    print("\n🎉 Test complete! Embeddings can distinguish quality levels.")

if __name__ == "__main__":
    main() 