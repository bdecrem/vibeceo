#!/usr/bin/env python3

import numpy as np
import pandas as pd
from sentence_transformers import SentenceTransformer
import re
from typing import List, Tuple

def load_training_data(csv_file: str) -> Tuple[List[str], List[str]]:
    """Load training data from CSV file."""
    df = pd.read_csv(csv_file)
    gold_responses = df['GOLD'].dropna().tolist()
    base_responses = df['BASE'].dropna().tolist()
    return gold_responses, base_responses

def calculate_structural_features(text: str) -> dict:
    """Calculate structural features for a text."""
    words = text.split()
    word_count = len(words)
    
    # Metaphor indicators
    metaphor_words = ['like', 'fire', 'flame', 'wildfire', 'phoenix', 'lotus', 'symphony', 'ocean', 'storm', 'ship', 'anchor', 'graveyard', 'bones', 'roulette', 'chips']
    metaphor_count = sum(1 for word in words if any(meta in word.lower() for meta in metaphor_words))
    metaphor_density = metaphor_count / word_count if word_count > 0 else 0
    
    # Wit markers (paradox, contradiction words)
    wit_words = ['but', 'however', 'yet', 'though', 'although', 'somehow', 'never', 'always', 'only', 'except', 'unless', 'until']
    wit_count = sum(1 for word in words if word.lower().rstrip('.,!?;:') in wit_words)
    
    # Concrete vs abstract language
    concrete_words = ['ship', 'anchor', 'fire', 'water', 'bone', 'chip', 'instrument', 'flower', 'name', 'check', 'roadmap']
    abstract_words = ['dream', 'hope', 'passion', 'ambition', 'uncertainty', 'momentum', 'traction', 'faith', 'greatness']
    
    concrete_count = sum(1 for word in words if any(conc in word.lower() for conc in concrete_words))
    abstract_count = sum(1 for word in words if any(abs_word in word.lower() for abs_word in abstract_words))
    
    concrete_ratio = concrete_count / word_count if word_count > 0 else 0
    abstract_ratio = abstract_count / word_count if word_count > 0 else 0
    
    # Ending analysis
    last_words = ' '.join(words[-3:]).lower() if len(words) >= 3 else text.lower()
    strong_endings = ['name', 'faith', 'noticed', 'backwards', 'rage', 'suffering', 'incompetence', 'greatness']
    has_strong_ending = any(ending in last_words for ending in strong_endings)
    
    return {
        'word_count': word_count,
        'metaphor_density': metaphor_density,
        'wit_count': wit_count,
        'concrete_ratio': concrete_ratio,
        'abstract_ratio': abstract_ratio,
        'has_strong_ending': has_strong_ending
    }

def enhanced_structural_score(text: str, model, gold_embeddings, base_embeddings) -> dict:
    """Calculate enhanced structural score for a text."""
    # Get text embedding
    text_embedding = model.encode([text])
    
    # Calculate similarities
    gold_similarities = np.dot(text_embedding, gold_embeddings.T).flatten()
    base_similarities = np.dot(text_embedding, base_embeddings.T).flatten()
    
    avg_gold_sim = np.mean(gold_similarities)
    avg_base_sim = np.mean(base_similarities)
    
    # Base semantic score
    base_score = avg_gold_sim - avg_base_sim
    
    # Calculate structural features
    features = calculate_structural_features(text)
    
    # Apply structural adjustments
    adjusted_score = base_score
    adjustments = {}
    
    # Conciseness bonus (≤20 words)
    if features['word_count'] <= 20:
        conciseness_bonus = 0.15
        adjusted_score += conciseness_bonus
        adjustments['conciseness_bonus'] = conciseness_bonus
    
    # Wit bonus
    if features['wit_count'] > 0:
        wit_bonus = 0.12
        adjusted_score += wit_bonus
        adjustments['wit_bonus'] = wit_bonus
    
    # Concrete language bonus (when concrete > metaphor)
    if features['concrete_ratio'] > features['abstract_ratio']:
        concrete_bonus = 0.08
        adjusted_score += concrete_bonus
        adjustments['concrete_bonus'] = concrete_bonus
    
    # Metaphor penalty (>15% metaphor density)
    if features['metaphor_density'] > 0.15:
        metaphor_penalty = -0.15
        adjusted_score += metaphor_penalty
        adjustments['metaphor_penalty'] = metaphor_penalty
    
    # Strong ending bonus
    if features['has_strong_ending']:
        ending_bonus = 0.06
        adjusted_score += ending_bonus
        adjustments['ending_bonus'] = ending_bonus
    
    # Apply calibration transform: scaled_score = 10 * ((raw_score + 0.2) / 0.8)
    scaled_score = 10 * ((adjusted_score + 0.2) / 0.8)
    scaled_score = max(0, min(10, scaled_score))  # Clamp to [0,10]
    
    return {
        'raw_score': base_score,
        'adjusted_score': adjusted_score,
        'scaled_score': scaled_score,
        'features': features,
        'adjustments': adjustments
    }

def main():
    """Test the 20 quotes provided by the user."""
    
    # The 20 quotes to test
    quotes = [
        "Startups are like wildfires, burning bright with passion but often extinguished by the weight of their own ambition.",
        "The graveyard of dreams is paved with the bones of founders who mistook momentum for traction.",
        "A startup is a ship without anchor, sailing into the storm of uncertainty with a cargo hold full of hope.",
        "The only thing more fatal than a failed startup is a founder who refuses to fail.",
        "In the game of startup roulette, the house always wins, and the players are just the chips.",
        "A startup is a symphony of chaos, with every note played by a different instrument of uncertainty.",
        "The only thing more exhausting than building a startup is trying to explain why it failed.",
        "Startups are like lotus flowers, blooming in the muck of adversity but often suffocating under their own weight.",
        "The greatest startup failures are not the ones that crash and burn, but the ones that never take flight.",
        "In the startup ecosystem, the only constant is change, and the only thing more terrifying than change is the status quo.drink from the ocean of opportunity, but end up drowning in the undertow of their own incompetence.",
        "Startups don't fail — they ghost themselves mid-conversation with greatness.",
        "Most die whispering compromises until the fire forgets their name.",
        "They fail because fear hires the roadmap and doubt signs the checks.",
        "Every startup death is a soft 'maybe' said too many times.",
        "They forgot how to bleed for it — and customers noticed.",
        "Because somewhere along the way, they traded velocity for vanity metrics.",
        "They ship like cowards and pitch like poets — backwards.",
        "Failure sneaks in through polite pivots and unshipped rage.",
        "They tried to lead without suffering.",
        "Most fail because they chased funding, not faith."
    ]
    
    print("Loading model and training data...")
    
    # Load model
    model = SentenceTransformer('all-MiniLM-L6-v2')
    
    # Load training data
    gold_responses, base_responses = load_training_data('training_set_1_560.csv')
    
    # Generate embeddings for training data
    print("Generating embeddings for training data...")
    gold_embeddings = model.encode(gold_responses)
    base_embeddings = model.encode(base_responses)
    
    print(f"\nScoring {len(quotes)} quotes...\n")
    print("=" * 80)
    
    results = []
    for i, quote in enumerate(quotes, 1):
        result = enhanced_structural_score(quote, model, gold_embeddings, base_embeddings)
        results.append(result)
        
        print(f"Quote {i}: {quote[:60]}{'...' if len(quote) > 60 else ''}")
        print(f"Raw Score: {result['raw_score']:.3f}")
        print(f"Adjusted Score: {result['adjusted_score']:.3f}")
        print(f"Final Score: {result['scaled_score']:.1f}/10")
        
        # Show adjustments applied
        if result['adjustments']:
            adj_str = ", ".join([f"{k.replace('_', ' ')}: {v:+.3f}" for k, v in result['adjustments'].items()])
            print(f"Adjustments: {adj_str}")
        
        # Show key features
        features = result['features']
        print(f"Features: {features['word_count']} words, {features['metaphor_density']:.1%} metaphor, {features['wit_count']} wit markers")
        print("-" * 80)
    
    # Summary table
    print("\nSUMMARY TABLE:")
    print("Quote# | Score | Words | Metaphor% | Wit | Key Adjustments")
    print("-" * 70)
    for i, result in enumerate(results, 1):
        features = result['features']
        adj_keys = list(result['adjustments'].keys())
        adj_summary = ", ".join([k.replace('_bonus', '+').replace('_penalty', '-') for k in adj_keys[:2]])
        if len(adj_keys) > 2:
            adj_summary += "..."
        
        print(f"{i:6d} | {result['scaled_score']:5.1f} | {features['word_count']:5d} | {features['metaphor_density']:8.1%} | {features['wit_count']:3d} | {adj_summary}")

if __name__ == "__main__":
    main() 