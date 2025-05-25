#!/usr/bin/env python3
"""
Enhanced ML-Powered Similarity Scoring System
Uses multiple techniques to match trusted scorer performance
"""

import requests
import pandas as pd
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity, euclidean_distances
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.linear_model import Ridge
from sklearn.decomposition import PCA
from sklearn.model_selection import cross_val_score
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

def extract_advanced_features(embedding, reference_embeddings):
    """Extract advanced features from embeddings for ML training"""
    features = []
    
    # 1. Basic similarity metrics
    cos_similarities = cosine_similarity([embedding], reference_embeddings)[0]
    features.extend([
        np.mean(cos_similarities),      # Mean similarity
        np.max(cos_similarities),       # Max similarity  
        np.std(cos_similarities),       # Similarity variance
        np.percentile(cos_similarities, 90)  # 90th percentile
    ])
    
    # 2. Distance metrics
    euclidean_dists = euclidean_distances([embedding], reference_embeddings)[0]
    features.extend([
        np.mean(euclidean_dists),
        np.min(euclidean_dists),
        np.std(euclidean_dists)
    ])
    
    # 3. Embedding statistics
    features.extend([
        np.mean(embedding),             # Mean activation
        np.std(embedding),              # Activation variance
        np.max(embedding),              # Max activation
        np.min(embedding),              # Min activation
        np.sum(embedding > 0),          # Positive activations
        np.linalg.norm(embedding)       # L2 norm
    ])
    
    # 4. Semantic consistency (how well it fits the reference distribution)
    mean_ref = np.mean(reference_embeddings, axis=0)
    features.extend([
        cosine_similarity([embedding], [mean_ref])[0][0],  # Similarity to centroid
        euclidean_distances([embedding], [mean_ref])[0][0]  # Distance to centroid
    ])
    
    return np.array(features)

class EnhancedQualityScorer:
    def __init__(self):
        self.models = {}
        self.scaler = StandardScaler()
        self.feature_names = [
            'mean_cos_sim', 'max_cos_sim', 'std_cos_sim', 'p90_cos_sim',
            'mean_euclidean', 'min_euclidean', 'std_euclidean',
            'mean_activation', 'std_activation', 'max_activation', 'min_activation',
            'positive_activations', 'l2_norm',
            'centroid_cos_sim', 'centroid_euclidean'
        ]
        
    def train(self, gold_embeddings, base_embeddings):
        """Train ML models on GOLD vs BASE quality differences"""
        print("🧠 Training Enhanced Quality Scorer...")
        
        # Create training data
        print("   Extracting features from GOLD samples...")
        gold_features = []
        for i, emb in enumerate(gold_embeddings):
            if i % 50 == 0:
                print(f"      Processing GOLD sample {i+1}/{len(gold_embeddings)}")
            features = extract_advanced_features(emb, gold_embeddings)
            gold_features.append(features)
        
        print("   Extracting features from BASE samples...")
        base_features = []
        for i, emb in enumerate(base_embeddings):
            if i % 50 == 0:
                print(f"      Processing BASE sample {i+1}/{len(base_embeddings)}")
            features = extract_advanced_features(emb, gold_embeddings)  # Compare to GOLD reference
            base_features.append(features)
        
        # Prepare training data
        X_gold = np.array(gold_features)
        X_base = np.array(base_features)
        X = np.vstack([X_gold, X_base])
        
        # Labels: 1.0 for GOLD, 0.0 for BASE
        y = np.hstack([np.ones(len(X_gold)), np.zeros(len(X_base))])
        
        # Scale features
        X_scaled = self.scaler.fit_transform(X)
        
        # Train multiple models
        self.models = {
            'random_forest': RandomForestRegressor(n_estimators=100, random_state=42),
            'gradient_boost': GradientBoostingRegressor(n_estimators=100, random_state=42),
            'ridge': Ridge(alpha=1.0, random_state=42)
        }
        
        print("   Training models...")
        for name, model in self.models.items():
            model.fit(X_scaled, y)
            score = cross_val_score(model, X_scaled, y, cv=5).mean()
            print(f"      {name}: CV Score = {score:.3f}")
        
        # Store reference embeddings for future scoring
        self.gold_reference = gold_embeddings
        
        print("✅ Training complete!")
        
    def predict_quality(self, test_embeddings):
        """Predict quality scores for test embeddings"""
        results = []
        
        for embedding in test_embeddings:
            # Extract features
            features = extract_advanced_features(embedding, self.gold_reference)
            features_scaled = self.scaler.transform([features])
            
            # Get predictions from all models
            predictions = {}
            for name, model in self.models.items():
                pred = model.predict(features_scaled)[0]
                predictions[name] = pred
            
            # Ensemble prediction (weighted average)
            ensemble_score = (
                0.4 * predictions['random_forest'] +
                0.4 * predictions['gradient_boost'] + 
                0.2 * predictions['ridge']
            )
            
            results.append({
                'ensemble_score': ensemble_score,
                'individual_scores': predictions,
                'features': features
            })
        
        return results

def main():
    print("🚀 Enhanced ML-Powered Quality Scoring System")
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
    
    # Train the enhanced scorer
    scorer = EnhancedQualityScorer()
    scorer.train(gold_embeddings, base_embeddings)
    
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
    results = scorer.predict_quality(test_embeddings)
    
    # Display results
    print("\n" + "=" * 80)
    print("🏆 ENHANCED ML-POWERED QUALITY SCORES")
    print("=" * 80)
    
    scored_completions = []
    for i, (completion, result) in enumerate(zip(test_completions, results)):
        scored_completions.append((i+1, result['ensemble_score'], completion))
    
    # Sort by score (highest first)
    scored_completions.sort(key=lambda x: x[1], reverse=True)
    
    print("\n📈 RANKED BY ENHANCED ML SCORE:")
    print("-" * 80)
    for rank, (orig_num, score, completion) in enumerate(scored_completions, 1):
        print(f"{rank:2d}. #{orig_num:2d} | Score: {score:+.3f} | {completion[:80]}{'...' if len(completion) > 80 else ''}")
    
    print("\n📊 ORIGINAL ORDER WITH SCORES:")
    print("-" * 80)
    for i, (completion, result) in enumerate(zip(test_completions, results)):
        score = result['ensemble_score']
        print(f"{i+1:2d}. Score: {score:+.3f} | {completion[:80]}{'...' if len(completion) > 80 else ''}")
    
    # Show model breakdown for top 3
    print("\n🔍 MODEL BREAKDOWN (Top 3):")
    print("-" * 50)
    for rank, (orig_num, score, completion) in enumerate(scored_completions[:3], 1):
        result = results[orig_num-1]
        print(f"\n#{rank} (Original #{orig_num}):")
        print(f"  Ensemble: {result['ensemble_score']:+.3f}")
        for model_name, model_score in result['individual_scores'].items():
            print(f"  {model_name}: {model_score:+.3f}")

if __name__ == "__main__":
    main() 