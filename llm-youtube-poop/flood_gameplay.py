#!/usr/bin/env python3
"""
FLOOD Gameplay Video Generator
================================
Generates a pixel-perfect recreation of the Flood game UI,
simulates an actual game being played with smart AI moves,
and renders it as a polished gameplay video with cursor animation.
"""

import os
import math
import random
import struct
import wave
import subprocess
import colorsys
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from collections import deque

# --- Config ---
W, H = 720, 1280  # Mobile portrait (9:16)
FPS = 30
OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "frames")
AUDIO_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "audio.wav")
VIDEO_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "flood_gameplay.mp4")

os.makedirs(OUT_DIR, exist_ok=True)

# --- Game constants (matching the real game) ---
GRID_SIZE = 10
MAX_MOVES = 20

PALETTE = [
    '#FF6B6B',  # red
    '#FECA57',  # yellow
    '#48DBFB',  # sky blue
    '#A55EEA',  # purple
    '#FF9FF3',  # pink
    '#1DD1A1',  # green
]

COLORS = {
    'bg': '#FFF8F0',
    'surface': '#FFF0E0',
    'primary': '#FF6B6B',
    'secondary': '#A55EEA',
    'text': '#2D3436',
    'muted': '#999999',
    'error': '#FF4757',
    'gold': '#FECA57',
    'accent': '#48DBFB',
    'white': '#FFFFFF',
}


def hex_to_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))


def rgb_blend(c1, c2, t):
    """Blend two RGB tuples by factor t (0=c1, 1=c2)."""
    return tuple(int(a + (b - a) * t) for a, b in zip(c1, c2))


# Pre-convert palette
PAL_RGB = [hex_to_rgb(c) for c in PALETTE]
COL_RGB = {k: hex_to_rgb(v) for k, v in COLORS.items()}


def get_font(size):
    """Get a clean sans-serif font."""
    for name in [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    ]:
        if os.path.exists(name):
            return ImageFont.truetype(name, size)
    return ImageFont.load_default()


def get_font_regular(size):
    for name in [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ]:
        if os.path.exists(name):
            return ImageFont.truetype(name, size)
    return ImageFont.load_default()


# --- Game logic (port from TypeScript) ---

def generate_grid(seed=None):
    if seed is not None:
        random.seed(seed)
    return [[random.choice(PALETTE) for _ in range(GRID_SIZE)] for _ in range(GRID_SIZE)]


def get_flooded_set(grid):
    """Find all cells connected to top-left with same color."""
    color = grid[0][0]
    visited = set()
    stack = [(0, 0)]
    while stack:
        r, c = stack.pop()
        if (r, c) in visited:
            continue
        if r < 0 or r >= GRID_SIZE or c < 0 or c >= GRID_SIZE:
            continue
        if grid[r][c] != color:
            continue
        visited.add((r, c))
        stack.extend([(r-1, c), (r+1, c), (r, c-1), (r, c+1)])
    return visited


def flood_fill(grid, new_color):
    """Flood fill from top-left, returns new grid + animation order."""
    old_color = grid[0][0]
    if old_color == new_color:
        return grid, [], 0
    new_grid = [row[:] for row in grid]
    queue = deque([(0, 0)])
    visited = set()
    order = []
    while queue:
        r, c = queue.popleft()
        if (r, c) in visited:
            continue
        if r < 0 or r >= GRID_SIZE or c < 0 or c >= GRID_SIZE:
            continue
        if new_grid[r][c] != old_color:
            continue
        visited.add((r, c))
        new_grid[r][c] = new_color
        order.append((r, c))
        queue.extend([(r-1, c), (r+1, c), (r, c-1), (r, c+1)])
    return new_grid, order, len(order)


def calc_score(moves_used):
    if moves_used > MAX_MOVES:
        return 0
    total = 100
    moves_saved = MAX_MOVES - moves_used
    bonus = 50
    for _ in range(moves_saved):
        total += bonus
        bonus += 50
    return total


# --- AI player: greedy strategy ---

def ai_pick_color(grid):
    """Pick the color that maximizes flooded area."""
    current_color = grid[0][0]
    best_color = None
    best_count = -1
    for color in PALETTE:
        if color == current_color:
            continue
        new_grid, _, count = flood_fill(grid, color)
        flooded = len(get_flooded_set(new_grid))
        if flooded > best_count:
            best_count = flooded
            best_color = color
    return best_color


# --- Drawing functions ---

def draw_rounded_rect(draw, bbox, radius, fill=None, outline=None, width=1):
    """Draw a rounded rectangle."""
    x0, y0, x1, y1 = bbox
    if fill:
        # Fill the main body
        draw.rectangle([x0 + radius, y0, x1 - radius, y1], fill=fill)
        draw.rectangle([x0, y0 + radius, x1, y1 - radius], fill=fill)
        # Four corners
        draw.pieslice([x0, y0, x0 + 2*radius, y0 + 2*radius], 180, 270, fill=fill)
        draw.pieslice([x1 - 2*radius, y0, x1, y0 + 2*radius], 270, 360, fill=fill)
        draw.pieslice([x0, y1 - 2*radius, x0 + 2*radius, y1], 90, 180, fill=fill)
        draw.pieslice([x1 - 2*radius, y1 - 2*radius, x1, y1], 0, 90, fill=fill)


def draw_cursor(draw, x, y, size=20, clicking=False):
    """Draw a simple pointer cursor."""
    # Cursor shape (triangle pointer)
    color = (255, 255, 255) if not clicking else (255, 200, 100)
    outline_color = (40, 40, 40)
    s = size
    # Main triangle
    points = [
        (x, y),
        (x, y + s),
        (x + s * 0.35, y + s * 0.75),
        (x + s * 0.55, y + s * 1.1),
        (x + s * 0.7, y + s * 1.0),
        (x + s * 0.5, y + s * 0.65),
        (x + s * 0.75, y + s * 0.55),
    ]
    draw.polygon(points, fill=color, outline=outline_color)

    # Click ripple
    if clicking:
        for r in range(3):
            radius = 8 + r * 6
            alpha = 180 - r * 60
            draw.ellipse([x - radius, y - radius, x + radius, y + radius],
                        outline=(*COL_RGB['primary'], alpha), width=2)


def render_start_screen(t):
    """Render the start screen with animation."""
    img = Image.new('RGB', (W, H), COL_RGB['bg'])
    draw = ImageDraw.Draw(img)

    center_x = W // 2
    center_y = H // 2 - 60

    # Title - "FLOOD"
    font_title = get_font(72)
    title = "FLOOD"
    bbox = draw.textbbox((0, 0), title, font=font_title)
    tw = bbox[2] - bbox[0]
    # Slide in from top
    y_offset = max(0, int((1 - min(1, t * 3)) * -100))
    draw.text((center_x - tw // 2, center_y - 60 + y_offset), title,
              fill=COL_RGB['primary'], font=font_title)

    # Subtitle
    if t > 0.3:
        font_sub = get_font(20)
        sub = "Flood the zone."
        bbox = draw.textbbox((0, 0), sub, font=font_sub)
        tw = bbox[2] - bbox[0]
        alpha = min(1, (t - 0.3) * 4)
        color = rgb_blend(COL_RGB['bg'], COL_RGB['secondary'], alpha)
        draw.text((center_x - tw // 2, center_y + 20), sub, fill=color, font=font_sub)

    # START button
    if t > 0.5:
        font_btn = get_font(24)
        btn_text = "START"
        bbox = draw.textbbox((0, 0), btn_text, font=font_btn)
        tw = bbox[2] - bbox[0]
        btn_w = tw + 80
        btn_h = 56
        btn_x = center_x - btn_w // 2
        btn_y = center_y + 100

        scale = min(1, (t - 0.5) * 5)
        if scale < 1:
            shrink = int((1 - scale) * 20)
            btn_x += shrink
            btn_y += shrink
            btn_w -= shrink * 2
            btn_h -= shrink * 2

        draw_rounded_rect(draw, [btn_x, btn_y, btn_x + btn_w, btn_y + btn_h],
                         btn_h // 2, fill=COL_RGB['primary'])
        draw.text((center_x - tw // 2, btn_y + (btn_h - (bbox[3] - bbox[1])) // 2),
                 btn_text, fill=(255, 255, 255), font=font_btn)

    # pixelpit arcade branding
    if t > 0.6:
        font_brand = get_font_regular(14)
        brand_y = center_y + 200
        draw.text((center_x - 60, brand_y), "pixel", fill=hex_to_rgb('#22d3ee'), font=font_brand)
        draw.text((center_x - 15, brand_y), "pit", fill=hex_to_rgb('#a855f7'), font=font_brand)
        draw.text((center_x + 10, brand_y), " arcade", fill=(180, 180, 180), font=font_brand)

    return img


def render_playing_screen(grid, moves_left, filled_pct, streak, magic_color,
                          anim_cells=None, anim_color=None, anim_progress=0,
                          cursor_pos=None, clicking=False, highlight_btn=None):
    """Render the playing screen matching the real game UI."""
    img = Image.new('RGB', (W, H), COL_RGB['bg'])
    draw = ImageDraw.Draw(img)

    # Layout
    margin = 40
    grid_top = 220
    grid_size_px = W - margin * 2  # Square grid
    cell_size = (grid_size_px - 3 * 2 - 3 * (GRID_SIZE - 1)) // GRID_SIZE
    # Recalc actual grid width
    actual_grid_w = cell_size * GRID_SIZE + 3 * (GRID_SIZE - 1) + 6
    grid_left = (W - actual_grid_w) // 2

    # --- Stats bar ---
    stats_y = 140
    font_label = get_font(13)
    font_value = get_font(32)

    # MOVES
    draw.text((grid_left + 20, stats_y), "MOVES", fill=COL_RGB['muted'], font=font_label)
    moves_color = COL_RGB['error'] if moves_left <= 3 else COL_RGB['text']
    draw.text((grid_left + 20, stats_y + 18), str(moves_left), fill=moves_color, font=font_value)

    # FILLED
    draw.text((grid_left + 130, stats_y), "FILLED", fill=COL_RGB['muted'], font=font_label)
    draw.text((grid_left + 130, stats_y + 18), f"{filled_pct}%", fill=COL_RGB['secondary'], font=font_value)

    # STREAK (if > 0)
    if streak > 0:
        draw.text((grid_left + 270, stats_y), "STREAK", fill=COL_RGB['muted'], font=font_label)
        draw.text((grid_left + 270, stats_y + 18), str(streak), fill=hex_to_rgb('#1DD1A1'), font=font_value)

    # Magic color indicator
    magic_rgb = hex_to_rgb(magic_color)
    mc_x = grid_left + actual_grid_w - 60
    mc_y = stats_y + 10
    draw_rounded_rect(draw, [mc_x, mc_y, mc_x + 55, mc_y + 32], 16, fill=(255, 255, 255))
    font_emoji = get_font(16)
    draw.text((mc_x + 5, mc_y + 6), "F", fill=(255, 100, 0), font=font_emoji)  # fire stand-in
    draw.ellipse([mc_x + 26, mc_y + 5, mc_x + 48, mc_y + 27], fill=magic_rgb)

    # --- Grid ---
    # White background with rounded corners
    draw_rounded_rect(draw,
                     [grid_left, grid_top, grid_left + actual_grid_w, grid_top + actual_grid_w],
                     16, fill=(255, 255, 255))

    # Build set of cells currently being animated
    animating_set = set()
    if anim_cells and anim_color:
        n_visible = int(anim_progress * len(anim_cells))
        for i in range(n_visible):
            animating_set.add(anim_cells[i])

    # Draw cells
    for row in range(GRID_SIZE):
        for col in range(GRID_SIZE):
            cx = grid_left + 3 + col * (cell_size + 3)
            cy = grid_top + 3 + row * (cell_size + 3)

            if (row, col) in animating_set:
                cell_color = hex_to_rgb(anim_color)
            else:
                cell_color = hex_to_rgb(grid[row][col])

            # Small rounded rect per cell
            draw_rounded_rect(draw, [cx, cy, cx + cell_size, cy + cell_size],
                            4, fill=cell_color)

    # --- Color buttons ---
    btn_y = grid_top + actual_grid_w + 30
    btn_size = 52
    total_btn_w = len(PALETTE) * btn_size + (len(PALETTE) - 1) * 12
    btn_start_x = (W - total_btn_w) // 2

    current_color = grid[0][0]
    # Check if any animated cells changed the effective current color
    if anim_cells and anim_color and len(animating_set) > 0:
        # During animation the "current" is the target color
        pass

    for i, color in enumerate(PALETTE):
        bx = btn_start_x + i * (btn_size + 12)
        by = btn_y
        is_current = (color == current_color)
        rgb = hex_to_rgb(color)

        # Highlight effect on the button being "clicked"
        if highlight_btn == color:
            # Pressed state — slightly smaller, darker
            shrink = 3
            draw.ellipse([bx + shrink, by + shrink, bx + btn_size - shrink, by + btn_size - shrink],
                        fill=rgb, outline=COL_RGB['text'], width=3)
        elif is_current:
            # Disabled state
            faded = rgb_blend(rgb, COL_RGB['bg'], 0.7)
            draw.ellipse([bx, by, bx + btn_size, by + btn_size],
                        fill=faded, outline=COL_RGB['text'], width=3)
        else:
            draw.ellipse([bx, by, bx + btn_size, by + btn_size], fill=rgb)

    # Store button positions for cursor targeting
    btn_positions = {}
    for i, color in enumerate(PALETTE):
        bx = btn_start_x + i * (btn_size + 12) + btn_size // 2
        by = btn_y + btn_size // 2
        btn_positions[color] = (bx, by)

    # --- Cursor ---
    if cursor_pos:
        draw_cursor(draw, cursor_pos[0], cursor_pos[1], clicking=clicking)

    return img, btn_positions


def render_gameover_screen(score, moves_used, streak, cumulative, magic_bonus, t):
    """Render the game over / win screen."""
    img = Image.new('RGB', (W, H), COL_RGB['bg'])
    draw = ImageDraw.Draw(img)

    center_x = W // 2
    y = 280

    # "YOU WIN!"
    font_win = get_font(28)
    text = "YOU WIN!"
    bbox = draw.textbbox((0, 0), text, font=font_win)
    tw = bbox[2] - bbox[0]
    scale = min(1, t * 4)
    color = rgb_blend(COL_RGB['bg'], hex_to_rgb('#1DD1A1'), scale)
    draw.text((center_x - tw // 2, y), text, fill=color, font=font_win)

    # Score
    if t > 0.2:
        font_score = get_font(80)
        score_text = str(cumulative)
        bbox = draw.textbbox((0, 0), score_text, font=font_score)
        tw = bbox[2] - bbox[0]
        draw.text((center_x - tw // 2, y + 60), score_text,
                 fill=COL_RGB['primary'], font=font_score)

    # "Solved in X moves!"
    if t > 0.3:
        font_msg = get_font(16)
        msg = f"Solved in {moves_used} moves!"
        bbox = draw.textbbox((0, 0), msg, font=font_msg)
        tw = bbox[2] - bbox[0]
        draw.text((center_x - tw // 2, y + 155), msg,
                 fill=COL_RGB['muted'], font=font_msg)

    # Magic bonus
    if magic_bonus and t > 0.4:
        font_bonus = get_font(18)
        bonus_text = "+500 MAGIC COLOR BONUS!"
        bbox = draw.textbbox((0, 0), bonus_text, font=font_bonus)
        tw = bbox[2] - bbox[0]
        draw.text((center_x - tw // 2, y + 185), bonus_text,
                 fill=COL_RGB['gold'], font=font_bonus)

    # Streak pill
    if streak > 0 and t > 0.5:
        font_streak = get_font(16)
        pill_y = y + 230
        pill_w = 280
        pill_h = 40
        pill_x = center_x - pill_w // 2
        draw_rounded_rect(draw, [pill_x, pill_y, pill_x + pill_w, pill_y + pill_h],
                         pill_h // 2, fill=(255, 255, 255))
        draw.text((pill_x + 20, pill_y + 9), f"STREAK {streak}",
                 fill=hex_to_rgb('#1DD1A1'), font=font_streak)
        draw.text((pill_x + 150, pill_y + 9), f"TOTAL {cumulative}",
                 fill=COL_RGB['secondary'], font=font_streak)

    # "play again" button
    if t > 0.6:
        font_btn = get_font(20)
        btn_text = "play again"
        bbox = draw.textbbox((0, 0), btn_text, font=font_btn)
        tw = bbox[2] - bbox[0]
        btn_w = tw + 60
        btn_h = 50
        btn_x = center_x - btn_w // 2
        btn_y = y + 310
        draw_rounded_rect(draw, [btn_x, btn_y, btn_x + btn_w, btn_y + btn_h],
                         btn_h // 2, fill=COL_RGB['primary'])
        draw.text((center_x - tw // 2, btn_y + 12), btn_text,
                 fill=(255, 255, 255), font=font_btn)

    # pixelpit branding
    font_brand = get_font_regular(14)
    brand_y = H - 80
    draw.text((center_x - 60, brand_y), "pixel", fill=hex_to_rgb('#22d3ee'), font=font_brand)
    draw.text((center_x - 15, brand_y), "pit", fill=hex_to_rgb('#a855f7'), font=font_brand)
    draw.text((center_x + 10, brand_y), " arcade", fill=(180, 180, 180), font=font_brand)

    return img


# --- Cursor animation helpers ---

def ease_in_out(t):
    """Smooth easing function."""
    return t * t * (3 - 2 * t)


def lerp_pos(p1, p2, t):
    t = ease_in_out(max(0, min(1, t)))
    return (int(p1[0] + (p2[0] - p1[0]) * t), int(p1[1] + (p2[1] - p1[1]) * t))


# --- Audio ---

def generate_audio(moves_data, total_frames):
    """Generate game sounds synced to moves."""
    sample_rate = 44100
    duration_sec = total_frames / FPS
    n_samples = int(sample_rate * duration_sec)
    audio = np.zeros(n_samples, dtype=np.float64)

    def add_pop(time_sec, freq, duration=0.08, vol=0.12):
        start = int(time_sec * sample_rate)
        length = int(duration * sample_rate)
        end = min(start + length, n_samples)
        if start >= n_samples or start < 0:
            return
        seg_t = np.linspace(0, duration, end - start)
        wave = vol * np.sin(2 * np.pi * freq * seg_t) * np.exp(-seg_t * 30)
        audio[start:end] += wave

    # For each move, add cascade pops
    for move in moves_data:
        frame_start = move['frame_start']
        tile_count = move['tiles_changed']
        time_start = frame_start / FPS

        count = min(tile_count, 30)
        for i in range(count):
            t_frac = i / max(count - 1, 1)
            freq = 880 + 720 * t_frac
            delay = i * 0.05
            add_pop(time_start + delay, freq)

    # Win fanfare at end
    if moves_data:
        last_move = moves_data[-1]
        win_time = (last_move['frame_start'] + 60) / FPS
        for i, freq in enumerate([784, 988, 1175, 1568]):
            add_pop(win_time + i * 0.08, freq, duration=0.15, vol=0.15)

    # Subtle background ambient
    t = np.linspace(0, duration_sec, n_samples)
    ambient = 0.02 * np.sin(2 * np.pi * 220 * t) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.5 * t))
    audio += ambient

    # Normalize
    peak = np.max(np.abs(audio))
    if peak > 0:
        audio = audio / peak * 0.8

    audio_16 = (audio * 32767).astype(np.int16)
    with wave.open(AUDIO_FILE, 'w') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(audio_16.tobytes())

    print(f"  Audio: {AUDIO_FILE}")


# --- Main sequence ---

def main():
    print("=" * 50)
    print("  FLOOD Gameplay Video Generator")
    print("=" * 50)

    # Generate a game and play it with AI
    random.seed(77)  # Reproducible, nice-looking game
    grid = generate_grid()
    magic_color_candidates = [c for c in PALETTE if c != grid[0][0]]
    magic_color = random.choice(magic_color_candidates)

    # Play the game with AI
    moves = []
    current_grid = [row[:] for row in grid]
    for move_num in range(MAX_MOVES):
        color = ai_pick_color(current_grid)
        if color is None:
            break
        new_grid, order, tiles_changed = flood_fill(current_grid, color)
        flooded = get_flooded_set(new_grid)
        pct = round(len(flooded) / (GRID_SIZE * GRID_SIZE) * 100)

        moves.append({
            'color': color,
            'order': order,
            'tiles_changed': tiles_changed,
            'grid_before': [row[:] for row in current_grid],
            'grid_after': [row[:] for row in new_grid],
            'pct': pct,
            'moves_left': MAX_MOVES - (move_num + 1),
        })

        current_grid = new_grid
        if pct == 100:
            break

    moves_used = len(moves)
    final_score = calc_score(moves_used)
    got_magic = moves[-1]['color'] == magic_color if moves else False
    if got_magic:
        final_score += 500

    print(f"  AI solved in {moves_used} moves, score: {final_score}")
    print(f"  Magic color bonus: {got_magic}")

    # --- Build frame timeline ---
    frames = []
    frame_num = 0

    # Phase 1: Start screen (2 seconds)
    START_FRAMES = FPS * 2
    for f in range(START_FRAMES):
        t = f / START_FRAMES
        frames.append(('start', {'t': t}))
    frame_num += START_FRAMES

    # Pause on start screen (0.5s)
    for f in range(FPS // 2):
        frames.append(('start', {'t': 1.0}))
    frame_num += FPS // 2

    # Phase 2: Playing — each move has phases:
    #   - cursor moves to button (0.4s)
    #   - click (0.1s)
    #   - flood animation (variable, ~0.5-1.5s based on tiles)
    #   - pause (0.3s)

    cursor_pos = (W // 2, H // 2)  # Start cursor at center
    btn_positions = None  # Will be computed from first render
    streak = 0
    moves_audio_data = []

    for move_idx, move in enumerate(moves):
        grid_display = move['grid_before']
        filled_pct = round(len(get_flooded_set(grid_display)) / (GRID_SIZE * GRID_SIZE) * 100)
        moves_left = MAX_MOVES - move_idx

        # We need button positions — do a dummy render to get them
        _, bp = render_playing_screen(grid_display, moves_left, filled_pct, streak,
                                       magic_color)
        if bp:
            btn_positions = bp

        target_btn_pos = btn_positions.get(move['color'], (W // 2, 900))

        # Cursor movement (0.4s)
        move_frames = int(FPS * 0.4)
        start_cursor = cursor_pos
        for f in range(move_frames):
            t = f / move_frames
            cp = lerp_pos(start_cursor, target_btn_pos, t)
            frames.append(('playing', {
                'grid': grid_display,
                'moves_left': moves_left,
                'filled_pct': filled_pct,
                'streak': streak,
                'magic_color': magic_color,
                'cursor_pos': cp,
                'clicking': False,
                'highlight_btn': None,
            }))
        cursor_pos = target_btn_pos

        # Click (0.1s)
        click_frames = int(FPS * 0.1)
        for f in range(click_frames):
            frames.append(('playing', {
                'grid': grid_display,
                'moves_left': moves_left,
                'filled_pct': filled_pct,
                'streak': streak,
                'magic_color': magic_color,
                'cursor_pos': cursor_pos,
                'clicking': True,
                'highlight_btn': move['color'],
            }))

        # Record audio timing
        anim_start_frame = len(frames)
        moves_audio_data.append({
            'frame_start': anim_start_frame,
            'tiles_changed': move['tiles_changed'],
        })

        # Flood animation (proportional to tiles, 0.3s to 1.5s)
        anim_duration = min(1.5, max(0.3, move['tiles_changed'] * 0.04))
        anim_frames = int(FPS * anim_duration)
        new_moves_left = moves_left - 1
        for f in range(anim_frames):
            t = f / anim_frames
            # During animation, show the grid transitioning
            new_pct = move['pct'] if t > 0.8 else filled_pct + int((move['pct'] - filled_pct) * t)
            frames.append(('playing', {
                'grid': grid_display,  # Base grid (pre-flood)
                'moves_left': new_moves_left,
                'filled_pct': new_pct,
                'streak': streak,
                'magic_color': magic_color,
                'cursor_pos': cursor_pos,
                'clicking': False,
                'highlight_btn': None,
                'anim_cells': move['order'],
                'anim_color': move['color'],
                'anim_progress': t,
            }))

        # Post-animation: show completed grid (0.3s pause)
        pause_frames = int(FPS * 0.3)
        for f in range(pause_frames):
            frames.append(('playing', {
                'grid': move['grid_after'],
                'moves_left': new_moves_left,
                'filled_pct': move['pct'],
                'streak': streak,
                'magic_color': magic_color,
                'cursor_pos': cursor_pos,
                'clicking': False,
                'highlight_btn': None,
            }))

    # Phase 3: Win screen (3 seconds)
    streak = 1
    cumulative = final_score
    WIN_FRAMES = FPS * 3
    for f in range(WIN_FRAMES):
        t = f / WIN_FRAMES
        frames.append(('gameover', {
            't': t,
            'score': final_score,
            'moves_used': moves_used,
            'streak': streak,
            'cumulative': cumulative,
            'magic_bonus': got_magic,
        }))

    total_frames = len(frames)
    print(f"  Total frames: {total_frames} ({total_frames / FPS:.1f}s)")

    # Generate audio
    print("\n[1/3] Generating audio...")
    generate_audio(moves_audio_data, total_frames)

    # Render frames
    print("\n[2/3] Rendering frames...")
    for i, (scene, params) in enumerate(frames):
        if i % FPS == 0:
            print(f"  Frame {i}/{total_frames} ({i/FPS:.0f}s)")

        if scene == 'start':
            img = render_start_screen(params['t'])
        elif scene == 'playing':
            img, _ = render_playing_screen(
                params['grid'],
                params['moves_left'],
                params['filled_pct'],
                params['streak'],
                params['magic_color'],
                anim_cells=params.get('anim_cells'),
                anim_color=params.get('anim_color'),
                anim_progress=params.get('anim_progress', 0),
                cursor_pos=params.get('cursor_pos'),
                clicking=params.get('clicking', False),
                highlight_btn=params.get('highlight_btn'),
            )
        elif scene == 'gameover':
            img = render_gameover_screen(
                params['score'],
                params['moves_used'],
                params['streak'],
                params['cumulative'],
                params['magic_bonus'],
                params['t'],
            )

        img.save(os.path.join(OUT_DIR, f"frame_{i:05d}.png"))

    # Compile video
    print("\n[3/3] Compiling video...")
    cmd = [
        "ffmpeg", "-y",
        "-framerate", str(FPS),
        "-i", os.path.join(OUT_DIR, "frame_%05d.png"),
        "-i", AUDIO_FILE,
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "18",
        "-c:a", "aac",
        "-b:a", "192k",
        "-pix_fmt", "yuv420p",
        "-shortest",
        VIDEO_FILE,
    ]
    subprocess.run(cmd, check=True)

    # Cleanup
    import glob
    for f in glob.glob(os.path.join(OUT_DIR, "frame_*.png")):
        os.remove(f)
    try:
        os.rmdir(OUT_DIR)
    except OSError:
        pass
    if os.path.exists(AUDIO_FILE):
        os.remove(AUDIO_FILE)

    print(f"\n{'=' * 50}")
    print(f"  Video: {VIDEO_FILE}")
    print(f"  Duration: {total_frames / FPS:.1f}s @ {FPS}fps")
    print(f"  Game: Solved in {moves_used} moves, score {final_score}")
    print(f"{'=' * 50}")


if __name__ == "__main__":
    main()
