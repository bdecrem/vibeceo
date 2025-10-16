#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import math
import os
import unicodedata
import re
import shlex
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from html import unescape
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple

def _load_env_file(path: str) -> None:
    try:
        with open(path, "r", encoding="utf-8") as handle:
            for raw in handle:
                line = raw.strip()
                if not line or line.startswith('#'):
                    continue
                if '=' not in line:
                    continue
                key, value = line.split('=', 1)
                key = key.strip()
                value = value.strip()
                if not key:
                    continue
                if value and value[0] == value[-1] and value[0] in {'"', '\''}:
                    value = value[1:-1]
                os.environ.setdefault(key, value)
    except FileNotFoundError:
        return
    except OSError:
        return

_load_env_file('.env')
_load_env_file('.env.local')


try:
    import requests  # type: ignore
except ImportError:
    requests = None  # type: ignore

try:
    from zoneinfo import ZoneInfo
except ImportError:  # pragma: no cover
    ZoneInfo = None  # type: ignore


@dataclass
class CityLookupResult:
    query: str
    name: str
    display_name: str
    lat: float
    lon: float
    bounding_box: Tuple[float, float, float, float]
    country: Optional[str]


@dataclass
class WeatherSummary:
    condition: str
    phrase: str
    precip_probability: float
    temperature_f: Optional[float]
    target_time: datetime
    timezone: str

    @property
    def rainy(self) -> bool:
        return self.condition in {"rainy", "showers", "storm"}

    @property
    def clear(self) -> bool:
        return self.condition in {"clear", "partly"}

    def describe(self) -> str:
        bits: List[str] = [self.phrase]
        if self.precip_probability:
            bits.append(f"{int(self.precip_probability)}% precip")
        if self.temperature_f is not None:
            bits.append(f"{round(self.temperature_f)}F")
        return ", ".join(bits)


@dataclass
class Place:
    id: str
    name: str
    categories: Tuple[str, ...]
    type: str
    description: str
    vibe_tags: Tuple[str, ...]
    budgets: Tuple[str, ...]
    diets: Tuple[str, ...]
    indoor: str
    accessible: Optional[bool]
    distance: str
    rating: float
    review_count: int
    novelty: int
    time_slots: Tuple[str, ...]
    neighborhood: str
    party_range: Tuple[int, int] = (1, 6)
    wildcard: bool = False
    source: str = "google_places"

    def __post_init__(self) -> None:
        self.categories = tuple(x.lower() for x in self.categories)
        self.vibe_tags = tuple(x.lower() for x in self.vibe_tags)
        self.budgets = tuple(self.budgets)
        self.diets = tuple(x.lower() for x in self.diets)
        self.time_slots = tuple(x.lower() for x in self.time_slots)
        self.indoor = self.indoor.lower()
        self.distance = self.distance.lower()


@dataclass
class CityProfile:
    name: str
    lat: float
    lon: float
    timezone: str
    places: Tuple[Place, ...]


@dataclass
class ParsedInput:
    intent: str
    raw: str
    mode: str = "general"
    city: Optional[str] = None
    filters: Dict[str, str] = field(default_factory=dict)
    index: Optional[int] = None
    refine_filters: Dict[str, str] = field(default_factory=dict)


@dataclass
class SessionContext:
    last_city: Optional[str] = None
    last_mode: str = "general"
    last_filters: Dict[str, str] = field(default_factory=dict)
    last_results: List[Place] = field(default_factory=list)
    last_weather: Optional[WeatherSummary] = None




def session_to_dict(session: SessionContext) -> Dict[str, Any]:
    """Serialize session context for persistence."""
    return {
        "last_city": session.last_city,
        "last_mode": session.last_mode,
        "last_filters": dict(session.last_filters),
    }


def session_from_dict(data: Optional[Dict[str, Any]]) -> SessionContext:
    """Rehydrate session context from persistent data."""
    session = SessionContext()
    if not isinstance(data, dict):
        return session

    last_city = data.get("last_city")
    if isinstance(last_city, str) and last_city.strip():
        session.last_city = last_city.strip()

    last_mode = data.get("last_mode")
    if isinstance(last_mode, str) and last_mode.strip():
        session.last_mode = last_mode.strip()

    last_filters = data.get("last_filters")
    if isinstance(last_filters, dict):
        session.last_filters = {
            str(key): str(value)
            for key, value in last_filters.items()
            if isinstance(key, str) and isinstance(value, str)
        }

    return session

WEATHER_CODE_MAP: Dict[int, Tuple[str, str]] = {
    0: ("clear", "Clear sky"),
    1: ("partly", "Mainly clear"),
    2: ("partly", "Partly cloudy"),
    3: ("cloudy", "Overcast"),
    45: ("cloudy", "Foggy"),
    48: ("cloudy", "Foggy"),
    51: ("showers", "Light drizzle"),
    53: ("showers", "Drizzle"),
    55: ("showers", "Steady drizzle"),
    56: ("showers", "Icy drizzle"),
    57: ("showers", "Icy drizzle"),
    61: ("rainy", "Light rain"),
    63: ("rainy", "Rain"),
    65: ("rainy", "Heavy rain"),
    66: ("rainy", "Freezing rain"),
    67: ("rainy", "Freezing rain"),
    71: ("snow", "Snow"),
    73: ("snow", "Snow"),
    75: ("snow", "Heavy snow"),
    77: ("snow", "Snow grains"),
    80: ("showers", "Rain showers"),
    81: ("showers", "Rain showers"),
    82: ("showers", "Downpour"),
    85: ("snow", "Snow showers"),
    86: ("snow", "Snow showers"),
    95: ("storm", "Thunderstorm"),
    96: ("storm", "Storm with hail"),
    99: ("storm", "Storm with hail"),
}

DISTANCE_ORDER = {"walkable": 0, "short": 1, "any": 2}

HELP_TEXT = """Explore - find cool things to do.

Usage:
  explore <city>
  explore [category] <city> [optional filters]

Categories: food, outdoors, hidden, date
Optional filters:
  vibe=chill|romantic|adventure|party|nerdy|family
  budget=$|$$|$$$|$$$$
  time=now|tonight|tomorrow|this_weekend
  diet=vegan|vegetarian|halal|kosher|gluten-free
  party=2|3|4...
  distance=walkable|short|any|<=3mi
  indoor=true|false
  accessible=true|false

Feedback:
  refine k=v
"""

class CommandParser:
    MODES = {"food", "outdoors", "hidden", "date"}

    def parse(self, text: str) -> ParsedInput:
        try:
            tokens = shlex.split(text)
        except ValueError:
            tokens = text.strip().split()
        if not tokens:
            return ParsedInput(intent="noop", raw=text)
        head = tokens[0].lower()
        if head == "explore":
            if len(tokens) == 2 and tokens[1].lower() == "help":
                return ParsedInput(intent="help", raw=text)
            idx = 1
            mode = "general"
            if idx < len(tokens) and tokens[idx].lower() in self.MODES:
                mode = tokens[idx].lower()
                idx += 1
            city_tokens: List[str] = []
            filters: Dict[str, str] = {}
            while idx < len(tokens):
                token = tokens[idx]
                if "=" in token:
                    key, value = token.split("=", 1)
                    filters[key.lower()] = value.lower()
                else:
                    city_tokens.append(token)
                idx += 1
            city = " ".join(city_tokens).strip(", ")
            if not city:
                return ParsedInput(intent="error", raw=text)
            return ParsedInput(intent="explore", raw=text, mode=mode, city=city, filters=filters)
        if head == "refine" and len(tokens) >= 2:
            filters: Dict[str, str] = {}
            for token in tokens[1:]:
                if "=" in token:
                    key, value = token.split("=", 1)
                    filters[key.lower()] = value.lower()
            return ParsedInput(intent="refine", raw=text, refine_filters=filters)
        return ParsedInput(intent="unknown", raw=text)

class GeocodingService:
    URL = "https://nominatim.openstreetmap.org/search"

    def __init__(self) -> None:
        self.session = requests.Session() if requests else None

    def _latinize(self, value: str) -> str:
        normalized = unicodedata.normalize('NFKD', value) if value else ''
        ascii_only = ''.join(ch for ch in normalized if 32 <= ord(ch) < 127)
        return ascii_only.strip()

    def geocode(self, city: str) -> Optional[CityLookupResult]:
        if self.session is None:
            return None
        params = {
            "q": city,
            "format": "jsonv2",
            "addressdetails": 1,
            "limit": 3,
        }
        headers = {"User-Agent": "ExploreAgent/1.0 (+https://example.com)"}
        try:
            resp = self.session.get(self.URL, params=params, headers=headers, timeout=6)
            resp.raise_for_status()
            data = resp.json()
        except Exception:
            return None
        best = None
        for item in data:
            item_type = item.get("type", "")
            if item_type in {"city", "town", "village", "borough", "municipality"}:
                best = item
                break
        if best is None and data:
            best = data[0]
        if not best:
            return None
        try:
            lat = float(best["lat"])
            lon = float(best["lon"])
            bbox_raw = best.get("boundingbox") or []
            if len(bbox_raw) == 4:
                south, north, west, east = map(float, bbox_raw)
            else:
                south = north = lat
                west = east = lon
        except (ValueError, KeyError):
            return None
        display_name = best.get("display_name", city)
        address = best.get("address", {})
        canonical = address.get("city") or address.get("town") or address.get("municipality") or display_name.split(",")[0]
        canonical_ascii = self._latinize(canonical)
        if not canonical_ascii:
            canonical_ascii = self._latinize(city) or city
        country = address.get("country")
        return CityLookupResult(
            query=city,
            name=canonical_ascii,
            display_name=display_name,
            lat=lat,
            lon=lon,
            bounding_box=(south, west, north, east),
            country=country,
        )

class WeatherService:
    URL = "https://api.open-meteo.com/v1/forecast"

    def __init__(self) -> None:
        self.session = requests.Session() if requests else None

    def get_summary(
        self,
        lat: float,
        lon: float,
        time_filter: Optional[str],
    ) -> Optional[WeatherSummary]:
        if self.session is None:
            return None
        params = {
            "latitude": lat,
            "longitude": lon,
            "hourly": "temperature_2m,weathercode,precipitation_probability",
            "current_weather": "true",
            "forecast_days": 3,
            "timezone": "auto",
        }
        try:
            resp = self.session.get(self.URL, params=params, timeout=6)
            resp.raise_for_status()
            data = resp.json()
        except Exception:
            return None
        timezone_name = data.get("timezone", "UTC")
        tzinfo = self._zoneinfo(timezone_name)
        now = datetime.now(tz=tzinfo) if tzinfo else datetime.now(timezone.utc)
        target = self._resolve_target_time(now, time_filter)
        hourly = data.get("hourly") or {}
        times = hourly.get("time") or []
        parsed_times: List[datetime] = []
        for item in times:
            try:
                dt = datetime.fromisoformat(item)
            except ValueError:
                continue
            if dt.tzinfo is None:
                if tzinfo:
                    dt = dt.replace(tzinfo=tzinfo)
                else:
                    dt = dt.replace(tzinfo=timezone.utc)
            parsed_times.append(dt)
        if not parsed_times:
            current = data.get("current_weather") or {}
            code = int(current.get("weathercode", 0))
            temp_c = current.get("temperature")
            temp_f = (temp_c * 9 / 5 + 32) if temp_c is not None else None
            precip = float(current.get("precipitation", 0.0))
            condition, phrase = WEATHER_CODE_MAP.get(code, ("cloudy", "Shifting skies"))
            return WeatherSummary(
                condition=condition,
                phrase=phrase,
                precip_probability=precip,
                temperature_f=temp_f,
                target_time=now,
                timezone=timezone_name,
            )
        target_idx = min(range(len(parsed_times)), key=lambda i: abs(parsed_times[i] - target))
        code_list = hourly.get("weathercode") or []
        precip_list = hourly.get("precipitation_probability") or []
        temp_list = hourly.get("temperature_2m") or []
        code = int(code_list[target_idx]) if target_idx < len(code_list) else int(data.get("current_weather", {}).get("weathercode", 0))
        precip = float(precip_list[target_idx]) if target_idx < len(precip_list) else float(data.get("current_weather", {}).get("precipitation", 0.0))
        temp_c = temp_list[target_idx] if target_idx < len(temp_list) else data.get("current_weather", {}).get("temperature")
        temp_f = (temp_c * 9 / 5 + 32) if temp_c is not None else None
        condition, phrase = WEATHER_CODE_MAP.get(code, ("cloudy", "Shifting skies"))
        return WeatherSummary(
            condition=condition,
            phrase=phrase,
            precip_probability=precip,
            temperature_f=temp_f,
            target_time=parsed_times[target_idx],
            timezone=timezone_name,
        )

    def _resolve_target_time(self, now: datetime, time_filter: Optional[str]) -> datetime:
        if not time_filter:
            return now
        key = time_filter.lower().replace("_", " ")
        if key == "now":
            return now
        if key == "tonight":
            target = now.replace(hour=20, minute=0, second=0, microsecond=0)
            if target <= now:
                target += timedelta(days=1)
            return target
        if key == "tomorrow":
            return (now + timedelta(days=1)).replace(hour=12, minute=0, second=0, microsecond=0)
        if key in {"this weekend", "weekend"}:
            days_ahead = (5 - now.weekday()) % 7
            return (now + timedelta(days=days_ahead)).replace(hour=11, minute=0, second=0, microsecond=0)
        return now

    @staticmethod
    def _zoneinfo(name: str) -> Optional[datetime.tzinfo]:
        if ZoneInfo is None:
            return None
        try:
            return ZoneInfo(str(name))
        except Exception:
            return None

class WikivoyageService:
    API_URL = "https://en.wikivoyage.org/w/api.php"

    def __init__(self) -> None:
        self.session = requests.Session() if requests else None

    def resolve_page(self, city: str) -> Optional[Tuple[int, str]]:
        if self.session is None:
            return None
        params = {
            "action": "query",
            "list": "search",
            "srsearch": city,
            "format": "json",
            "srlimit": 1,
            "srnamespace": 0,
        }
        headers = {"User-Agent": "ExploreAgent/1.0 (+https://example.com)"}
        try:
            resp = self.session.get(self.API_URL, params=params, headers=headers, timeout=6)
            resp.raise_for_status()
            data = resp.json()
        except Exception:
            return None
        search = data.get("query", {}).get("search", [])
        if not search:
            return None
        entry = search[0]
        pageid = entry.get("pageid")
        title = entry.get("title")
        if pageid is None or not title:
            return None
        return int(pageid), str(title)

    def section_index(self, pageid: int) -> Dict[str, int]:
        if self.session is None:
            return {}
        params = {
            "action": "parse",
            "pageid": pageid,
            "prop": "sections",
            "format": "json",
        }
        headers = {"User-Agent": "ExploreAgent/1.0 (+https://example.com)"}
        try:
            resp = self.session.get(self.API_URL, params=params, headers=headers, timeout=6)
            resp.raise_for_status()
            data = resp.json()
        except Exception:
            return {}
        sections = data.get("parse", {}).get("sections", [])
        results: Dict[str, int] = {}
        for section in sections:
            name = section.get("line", "")
            index = section.get("index")
            if not name or not index:
                continue
            results[name.lower()] = int(index)
        return results

    def fetch_section_html(self, pageid: int, section_id: int) -> str:
        if self.session is None:
            return ""
        params = {
            "action": "parse",
            "pageid": pageid,
            "section": section_id,
            "prop": "text",
            "format": "json",
        }
        headers = {"User-Agent": "ExploreAgent/1.0 (+https://example.com)"}
        try:
            resp = self.session.get(self.API_URL, params=params, headers=headers, timeout=6)
            resp.raise_for_status()
            data = resp.json()
        except Exception:
            return ""
        html = data.get("parse", {}).get("text", {}).get("*", "")
        return str(html)

    def pageid_for_title(self, title: str) -> Optional[int]:
        if self.session is None:
            return None
        params = {
            "action": "query",
            "format": "json",
            "titles": title,
        }
        headers = {"User-Agent": "ExploreAgent/1.0 (+https://example.com)"}
        try:
            resp = self.session.get(self.API_URL, params=params, headers=headers, timeout=6)
            resp.raise_for_status()
            data = resp.json()
        except Exception:
            return None
        pages = data.get("query", {}).get("pages", {})
        for page_id, info in pages.items():
            try:
                pid = int(info.get("pageid", int(page_id)))
            except (TypeError, ValueError):
                continue
            if pid != -1:
                return pid
        return None

class WikiGeoService:
    URL = "https://en.wikipedia.org/w/api.php"

    def __init__(self) -> None:
        self.session = requests.Session() if requests else None

    def nearby(self, lat: float, lon: float, limit: int = 10) -> List[Dict[str, str]]:
        if self.session is None:
            return []
        params = {
            "action": "query",
            "list": "geosearch",
            "gscoord": f"{lat}|{lon}",
            "gsradius": 4000,
            "gslimit": limit,
            "format": "json",
        }
        headers = {"User-Agent": "ExploreAgent/1.0 (+https://example.com)"}
        try:
            resp = self.session.get(self.URL, params=params, headers=headers, timeout=6)
            resp.raise_for_status()
            data = resp.json()
        except Exception:
            return []
        results = data.get("query", {}).get("geosearch", [])
        items: List[Dict[str, str]] = []
        for item in results:
            title = item.get("title")
            if not title:
                continue
            dist = float(item.get("dist", 0.0))
            items.append(
                {
                    "title": str(title),
                    "distance": dist,
                    "pageid": str(item.get("pageid", "")),
                }
            )
        return items

    def short_description(self, title: str) -> Optional[str]:
        if self.session is None:
            return None
        params = {
            "action": "query",
            "prop": "description",
            "titles": title,
            "format": "json",
        }
        headers = {"User-Agent": "ExploreAgent/1.0 (+https://example.com)"}
        try:
            resp = self.session.get(self.URL, params=params, headers=headers, timeout=6)
            resp.raise_for_status()
            data = resp.json()
        except Exception:
            return None
        pages = data.get("query", {}).get("pages", {})
        for info in pages.values():
            desc = info.get("description")
            if desc:
                return str(desc)
        return None

class GooglePlacesService:
    TEXT_SEARCH_URL = "https://maps.googleapis.com/maps/api/place/textsearch/json"
    DETAILS_URL = "https://maps.googleapis.com/maps/api/place/details/json"
    DEFAULT_QUERIES = [
        "best restaurants in {city}",
        "top attractions in {city}",
        "art museums in {city}",
        "cool cafes in {city}",
        "beautiful parks in {city}",
        "cocktail bars in {city}",
    ]
    TYPE_CATEGORY_MAP = {
        "restaurant": ("Restaurant", ("food", "general", "date")),
        "cafe": ("Cafe", ("food", "general")),
        "coffee_shop": ("Cafe", ("food", "general")),
        "bakery": ("Bakery", ("food", "hidden")),
        "bar": ("Bar", ("hidden", "date", "general")),
        "night_club": ("Nightlife", ("hidden", "date")),
        "tourist_attraction": ("Attraction", ("general", "hidden")),
        "museum": ("Museum", ("general", "nerdy")),
        "art_gallery": ("Gallery", ("general", "nerdy")),
        "park": ("Park", ("outdoors", "general")),
        "zoo": ("Zoo", ("general", "family")),
        "aquarium": ("Aquarium", ("general", "family")),
        "shopping_mall": ("Shopping", ("hidden", "general")),
        "spa": ("Spa", ("hidden", "date")),
        "lodging": ("Hotel", ("general",)),
    }
    PRICE_MAP = {
        0: ("$",),
        1: ("$",),
        2: ("$$",),
        3: ("$$$",),
        4: ("$$$$",),
    }
    MIN_RATING = 4.2
    MIN_REVIEWS = 150
    MAX_CANDIDATES = 40

    def __init__(self) -> None:
        self.api_key = os.getenv("GOOGLE_PLACES_API_KEY")
        self.session = requests.Session() if requests else None

    @property
    def available(self) -> bool:
        return bool(self.api_key and self.session is not None)

    def fetch_places(self, city: CityLookupResult, offset_minutes: Optional[int] = None) -> List[Place]:
        if not self.available:
            return []
        candidates: Dict[str, Dict[str, object]] = {}
        for query in self._queries_for_city(city):
            for item in self._text_search(query, city):
                place_id = item["place_id"]
                if place_id in candidates:
                    continue
                candidates[place_id] = item
                if len(candidates) >= self.MAX_CANDIDATES:
                    break
            if len(candidates) >= self.MAX_CANDIDATES:
                break
        places: List[Place] = []
        for item in candidates.values():
            place = self._fetch_detail(item, city, offset_minutes)
            if place:
                places.append(place)
        places.sort(key=lambda p: (p.rating, p.review_count), reverse=True)
        return places

    def _queries_for_city(self, city: CityLookupResult) -> List[str]:
        city_bit = city.name
        return [query.format(city=city_bit) for query in self.DEFAULT_QUERIES]

    def _text_search(self, query: str, city: CityLookupResult) -> List[Dict[str, object]]:
        params = {"query": query, "key": self.api_key}
        if city.country:
            params["region"] = city.country.lower()
        try:
            resp = self.session.get(self.TEXT_SEARCH_URL, params=params, timeout=8)
            resp.raise_for_status()
            data = resp.json()
        except Exception:
            return []
        results: List[Dict[str, object]] = []
        for entry in data.get("results", []):
            rating = float(entry.get("rating", 0.0) or 0.0)
            reviews = int(entry.get("user_ratings_total", 0) or 0)
            if rating < self.MIN_RATING or reviews < self.MIN_REVIEWS:
                continue
            if entry.get("business_status") and entry["business_status"] != "OPERATIONAL":
                continue
            place_id = entry.get("place_id")
            if not place_id:
                continue
            results.append(
                {
                    "place_id": str(place_id),
                    "types": entry.get("types", []),
                    "rating": rating,
                    "reviews": reviews,
                }
            )
        return results

    def _fetch_detail(
        self,
        item: Dict[str, object],
        city: CityLookupResult,
        offset_minutes: Optional[int] = None,
    ) -> Optional[Place]:
        place_id = str(item["place_id"])
        params = {
            "place_id": place_id,
            "fields": "name,formatted_address,types,price_level,rating,user_ratings_total,opening_hours,editorial_summary,business_status",
            "key": self.api_key,
        }
        try:
            resp = self.session.get(self.DETAILS_URL, params=params, timeout=8)
            resp.raise_for_status()
            data = resp.json()
        except Exception:
            return None
        result = data.get("result") or {}
        if result.get("business_status") and result["business_status"] != "OPERATIONAL":
            return None
        name = result.get("name")
        address = result.get("formatted_address")
        if not name or not address:
            return None
        types = result.get("types", [])
        place_type, categories = self._classify_types(types)
        if not categories:
            return None
        rating = float(result.get("rating", item.get("rating", 0.0)) or 0.0)
        reviews = int(result.get("user_ratings_total", item.get("reviews", 0)) or 0)
        price_level = result.get("price_level")
        budgets = self.PRICE_MAP.get(price_level, ("$", "$$"))
        raw_offset = result.get("utc_offset_minutes")
        if raw_offset is None:
            raw_offset = result.get("utcOffsetMinutes")
        try:
            result_offset = int(raw_offset) if raw_offset is not None else None
        except (TypeError, ValueError):
            result_offset = None
        effective_offset = offset_minutes if offset_minutes is not None else result_offset
        today_hours, time_slots = self._extract_today_hours(
            result.get("opening_hours", {}),
            effective_offset,
        )
        editorial = (result.get("editorial_summary") or {}).get("overview", "")
        description_parts: List[str] = []
        if editorial:
            description_parts.append(editorial.strip())
        if rating and reviews:
            description_parts.append(f"Rated {rating:.1f}★ by {reviews} visitors")
        if today_hours:
            description_parts.append(f"Open today {today_hours}")
        description = " ".join(description_parts).strip()
        if not description:
            description = f"Popular {place_type.lower()} with strong reviews."
        address_first = address.split(",")[0].strip()
        vibe_tags = self._infer_vibes(types, price_level)
        indoor = self._infer_indoor(types)
        novelty = 3 if any(t in ("tourist_attraction", "museum", "art_gallery", "park") for t in types) else 2
        party_range = (2, 6) if place_type in {"Restaurant", "Bar", "Nightlife", "Cafe"} else (1, 6)
        place = Place(
            id=place_id,
            name=name,
            categories=tuple(categories),
            type=place_type,
            description=description,
            vibe_tags=tuple(vibe_tags),
            budgets=tuple(budgets),
            diets=("any",),
            indoor=indoor,
            accessible=None,
            distance="any",
            rating=rating or 4.5,
            review_count=reviews or 200,
            novelty=novelty,
            time_slots=tuple(time_slots),
            neighborhood=address_first,
            party_range=party_range,
            wildcard=False,
            source="google_places",
        )
        return place

    def _classify_types(self, types: Sequence[str]) -> Tuple[str, Tuple[str, ...]]:
        for t in types:
            if t in self.TYPE_CATEGORY_MAP:
                kind, categories = self.TYPE_CATEGORY_MAP[t]
                return kind, categories
        if "point_of_interest" in types:
            return "Spot", ("general",)
        return "Spot", ("general",)

    def _infer_vibes(self, types: Sequence[str], price_level: Optional[int]) -> List[str]:
        vibes: List[str] = []
        lowered = set(types)
        if any(t in lowered for t in {"bar", "night_club", "casino"}):
            vibes.extend(["party", "romantic"])
        if any(t in lowered for t in {"restaurant", "cafe", "coffee_shop", "bakery"}):
            vibes.append("chill")
        if any(t in lowered for t in {"museum", "art_gallery"}):
            vibes.append("nerdy")
        if any(t in lowered for t in {"park", "zoo", "aquarium"}):
            vibes.append("adventure")
        if price_level and price_level >= 3:
            vibes.append("romantic")
        if not vibes:
            vibes.append("chill")
        return list(dict.fromkeys(vibes))

    def _infer_indoor(self, types: Sequence[str]) -> str:
        lowered = set(types)
        if any(t in lowered for t in {"park", "zoo", "aquarium", "campground"}):
            return "outdoor"
        if any(t in lowered for t in {"restaurant", "cafe", "bar", "art_gallery", "museum"}):
            return "indoor"
        return "mixed"

    def _extract_today_hours(
        self,
        opening: Dict[str, object],
        offset_minutes: Optional[int],
    ) -> Tuple[Optional[str], Tuple[str, ...]]:
        if not opening:
            return None, ("any",)
        now_utc = datetime.now(timezone.utc)
        effective_offset = offset_minutes if offset_minutes is not None else 0
        local_now = now_utc + timedelta(minutes=effective_offset)
        weekday = local_now.weekday()
        weekday_text = opening.get("weekday_text") or []
        today_text: Optional[str] = None
        if isinstance(weekday_text, list) and weekday < len(weekday_text):
            line = weekday_text[weekday]
            if ": " in line:
                today_text = line.split(": ", 1)[1].strip()
            else:
                today_text = line.strip()
        periods = opening.get("periods") or []
        slots = {"any"}
        for period in periods:
            open_info = period.get("open") or {}
            close_info = period.get("close") or {}
            if open_info.get("day") != weekday:
                continue
            open_time = self._parse_time(open_info.get("time"))
            close_time = self._parse_time(close_info.get("time")) if close_info else None
            if open_time is not None and open_time <= 1400:
                slots.add("day")
            if close_time is None or close_time >= 1700:
                slots.add("tonight")
            if close_time and close_time >= 2300:
                slots.add("night")
        return today_text, tuple(sorted(slots))

    @staticmethod
    def _parse_time(value: Optional[str]) -> Optional[int]:
        if not value or not value.isdigit():
            return None
        try:
            return int(value[:2]) * 100 + int(value[2:])
        except Exception:
            return None

class LLMSuggester:
    def __init__(self, model: str = "gpt-4o-mini") -> None:
        self.model = model
        self.api_key = os.getenv("OPENAI_API_KEY")
        self.session = requests.Session() if requests else None

    def generate(
        self,
        city: CityProfile,
        mode: str,
        filters: Dict[str, str],
        weather: Optional[WeatherSummary],
        candidates: Sequence[Place],
    ) -> Optional[str]:
        if not self.api_key or self.session is None:
            return None
        if not candidates:
            return None
        weather_line = weather.describe() if weather else "unknown"
        filter_bits = [f"{key}={value}" for key, value in filters.items()]
        filter_line = ", ".join(filter_bits) if filter_bits else "none"
        candidate_lines: List[str] = []
        for idx, place in enumerate(candidates, start=1):
            location_parts = [part.strip() for part in (place.neighborhood, city.name) if part and part.strip()]
            location = ', '.join(location_parts) if location_parts else city.name
            vibes = ', '.join(place.vibe_tags) if place.vibe_tags else 'varied'
            budgets = '/'.join(place.budgets) if place.budgets else 'varied'
            description = re.sub(r'(?i)wikivoyage', '', place.description or '')
            description = re.sub(r'\s+', ' ', description).strip()
            candidate_lines.append(
                f"{idx}. name={place.name} | location={location} | type={place.type} | description={description} | vibes={vibes} | budgets={budgets} | indoor={place.indoor}"
            )
        prompt_lines = [
            f"City: {city.name}",
            f"Mode: {mode}",
            f"Weather: {weather_line}",
            f"Filters: {filter_line}",
            "You are preparing SMS-ready tips for someone new to the city.",
            "Reply with numbered lines exactly matching this style:",
            '"<number>. <Name> (<Location>) - <one to two crisp sentences about why to go.>"',
            "Include neighborhood and city in the location when available; otherwise use the city.",
            "Highlight timing, vibe, or weather fit when relevant. Keep each line under 200 characters.",
            "Do not mention Wikivoyage, Wikipedia, or other sources. Do not add or reorder places.",
            "Candidates:",
        ]
        prompt = "\n".join(prompt_lines + candidate_lines + ["Return only the rewritten list."])
        payload = {
            "model": self.model,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are Explore, a concise city concierge. Keep answers tight, upbeat, and follow the user's formatting rules."
                    ),
                },
                {
                    "role": "user",
                    "content": prompt,
                },
            ],
            "temperature": 0.6,
        }
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        try:
            resp = self.session.post(
                "https://api.openai.com/v1/chat/completions",
                json=payload,
                headers=headers,
                timeout=20,
            )
            resp.raise_for_status()
            data = resp.json()
            content = data.get("choices", [{}])[0].get("message", {}).get("content")
            if content:
                return content.strip()
        except Exception:
            return None
        return None

class WikivoyagePlaceAssembler:
    SECTION_ROLES = {
        "see": ("sight", ("general", "hidden")),
        "do": ("activity", ("general", "outdoors", "hidden")),
        "eat": ("restaurant", ("food",)),
        "drink": ("bar", ("hidden", "date", "general")),
        "nightlife": ("nightlife", ("hidden", "date")),
        "buy": ("shopping", ("hidden",)),
        "learn": ("experience", ("general", "nerdy")),
    }

    def __init__(self, wikivoyage: WikivoyageService) -> None:
        self.wikivoyage = wikivoyage

    def fetch_places(self, city: CityLookupResult) -> List[Place]:
        resolved = self.wikivoyage.resolve_page(city.query)
        if not resolved:
            return []
        page_id, title = resolved
        sections = self.wikivoyage.section_index(page_id)
        seen_ids: set[str] = set()
        items: List[Place] = []
        items.extend(self._collect_section_places(city, title, page_id, sections, seen_ids))
        for district_title in self._district_titles(title, page_id, sections):
            district_id = self.wikivoyage.pageid_for_title(district_title)
            if district_id is None:
                continue
            district_sections = self.wikivoyage.section_index(district_id)
            items.extend(self._collect_section_places(city, district_title, district_id, district_sections, seen_ids))
        return items

    def _collect_section_places(
        self,
        city: CityLookupResult,
        page_title: str,
        page_id: int,
        sections: Dict[str, int],
        seen_ids: set[str],
    ) -> List[Place]:
        collected: List[Place] = []
        for raw_name, (place_type, categories) in self.SECTION_ROLES.items():
            is_root_page = page_title.lower() == city.name.lower()
            if is_root_page and raw_name in {'drink', 'buy'}:
                continue
            section_id = self._locate_section(raw_name, sections)
            if section_id is None:
                continue
            html = self.wikivoyage.fetch_section_html(page_id, section_id)
            if not html:
                continue
            for entry in self._extract_list_items(html):
                place = self._build_place(city, page_title, raw_name, place_type, categories, entry)
                if place and place.id not in seen_ids:
                    collected.append(place)
                    seen_ids.add(place.id)
        return collected

    def _district_titles(
        self,
        city_title: str,
        page_id: int,
        sections: Dict[str, int],
    ) -> List[str]:
        titles: List[str] = []
        section_id = self._locate_section("districts", sections)
        if section_id is None:
            return titles
        html = self.wikivoyage.fetch_section_html(page_id, section_id)
        if not html:
            return titles
        base_slug = city_title.split('(')[0].strip().lower().replace(' ', '_')
        prefixes = [city_title.lower().replace(' ', '_'), base_slug]
        for match in re.findall(r'href="/wiki/([^"]+)"', html):
            slug = match.lower()
            if not any(prefix and slug.startswith(prefix + '/') for prefix in prefixes):
                continue
            title = match.replace('_', ' ')
            if title not in titles:
                titles.append(title)
            if len(titles) >= 6:
                break
        return titles

    def _locate_section(self, name: str, sections: Dict[str, int]) -> Optional[int]:
        if name in sections:
            return sections[name]
        for key, index in sections.items():
            if name in key:
                return index
        return None



    def _extract_list_items(self, html: str) -> List[str]:
        snippets = re.findall(r'<li>(.*?)</li>', html, flags=re.S)
        cleaned: List[str] = []
        for snippet in snippets:
            snippet = re.sub(r'<span class="noprint listing-coordinates".*?</span>', '', snippet, flags=re.S)
            name_match = re.search(r'class="[^\"]*listing-name[^\"]*"[^>]*>(.*?)<', snippet)
            if not name_match:
                continue
            content_match = re.search(r'class="listing-content"[^>]*>(.*?)</span>', snippet, flags=re.S)
            if content_match:
                desc_source = content_match.group(1)
            else:
                desc_source = snippet[name_match.end():]
            desc_text = re.sub(r'<[^>]+>', '', desc_source)
            desc_text = unescape(desc_text)
            desc_text = re.sub(r'^\s*\d{1,3}\.\d+\s*[-\u2013]\s*\d{1,3}\.\d+\s*', '', desc_text)
            desc_text = ''.join(ch if 31 < ord(ch) < 127 else ' ' for ch in desc_text)
            desc_text = re.sub(r'\s+', ' ', desc_text).strip().strip('/')
            desc_text = desc_text.lstrip(': ,')
            desc_text = desc_text.replace('span>', '').replace('span:', '')
            desc_text = desc_text.lstrip('. ')
            if not desc_text or 'individual listings' in desc_text.lower():
                continue
            name_text = unescape(re.sub(r'<[^>]+>', '', name_match.group(1))).strip()
            if not name_text:
                continue
            text_item = f"{name_text} - {desc_text}" if desc_text else name_text
            cleaned.append(text_item)
        return cleaned

    def _split_name_description(self, text: str) -> Tuple[str, str]:
        separators = [' – ', ' — ', ' - ', ': ']
        for sep in separators:
            if sep in text:
                name, desc = text.split(sep, 1)
                return name.strip(" *-"), desc.strip()
        parts = text.split(".", 1)
        if len(parts) == 2:
            name, rest = parts
            return name.strip(" *-"), rest.strip()
        return text.strip(" *-"), ""

    def _build_place(
        self,
        city: CityLookupResult,
        page_title: str,
        section_name: str,
        place_type: str,
        categories: Sequence[str],
        text: str,
    ) -> Optional[Place]:
        name, description = self._split_name_description(text)
        if not name:
            return None
        slug_seed = f"{city.name}-{name}-{page_title}-{section_name}"
        slug = hashlib.sha1(slug_seed.encode('utf-8')).hexdigest()[:12]
        vibe_tags = self._infer_vibes(section_name, description)
        budgets = self._infer_budgets(description)
        diets = self._infer_diets(description)
        indoor = self._infer_indoor(section_name, description)
        accessible = self._infer_accessible(description)
        time_slots = self._infer_time_slots(section_name, description)
        novelty = self._infer_novelty(section_name, description)
        rating, review_count = self._approximate_popularity(slug_seed)
        neighborhood = self._infer_neighborhood(description)
        party_range = self._infer_party_range(description, section_name)
        wildcard = self._infer_wildcard(description)
        if self._looks_like_event(name, description):
            return None
        if not self._looks_like_place(name, description, categories, section_name):
            return None
        return Place(
            id=slug,
            name=name,
            categories=tuple(categories),
            type=place_type,
            description=description,
            vibe_tags=vibe_tags,
            budgets=budgets,
            diets=diets,
            indoor=indoor,
            accessible=accessible,
            distance="any",
            rating=rating,
            review_count=review_count,
            novelty=novelty,
            time_slots=time_slots,
            neighborhood=neighborhood,
            party_range=party_range,
            wildcard=wildcard,
            source="wikivoyage",
        )

    def _infer_vibes(self, section: str, description: str) -> Tuple[str, ...]:
        tags: List[str] = []
        desc = description.lower()
        if section in {"drink", "nightlife"}:
            tags.append("party")
        if any(word in desc for word in ["romantic", "candle", "date", "sunset", "intimate"]):
            tags.append("romantic")
        if any(word in desc for word in ["family", "kids", "children", "families"]):
            tags.append("family")
        if any(word in desc for word in ["museum", "gallery", "history", "science", "exhibit"]):
            tags.append("nerdy")
        if any(word in desc for word in ["hike", "trail", "kayak", "climb", "adventure"]):
            tags.append("adventure")
        if any(word in desc for word in ["live music", "dj", "dance", "late-night"]):
            tags.append("party")
        if not tags:
            tags.append("chill")
        return tuple(dict.fromkeys(tags))

    def _infer_budgets(self, description: str) -> Tuple[str, ...]:
        desc = description
        if "$$$$" in desc:
            return ("$$$$",)
        if "$$$" in desc:
            return ("$$$",)
        if "$$" in desc:
            return ("$$",)
        if "$" in desc:
            return ("$",)
        return ("$", "$$")

    def _infer_diets(self, description: str) -> Tuple[str, ...]:
        desc = description.lower()
        diets: List[str] = []
        if "vegan" in desc:
            diets.append("vegan")
        if "vegetarian" in desc:
            diets.append("vegetarian")
        if "gluten" in desc:
            diets.append("gluten-free")
        if "halal" in desc:
            diets.append("halal")
        if "kosher" in desc:
            diets.append("kosher")
        if not diets:
            diets.append("any")
        return tuple(diets)

    def _infer_indoor(self, section: str, description: str) -> str:
        desc = description.lower()
        if any(word in desc for word in ["park", "garden", "trail", "beach", "mountain", "outdoor", "boat", "river"]):
            return "outdoor"
        if section in {"see", "do"} and any(word in desc for word in ["museum", "gallery", "indoor", "inside"]):
            return "indoor"
        if section in {"eat", "drink", "nightlife"}:
            return "indoor"
        return "mixed"

    def _infer_accessible(self, description: str) -> Optional[bool]:
        desc = description.lower()
        if "wheelchair" in desc or "accessible" in desc:
            return True
        if "stairs" in desc or "steep" in desc:
            return False
        return None

    def _infer_time_slots(self, section: str, description: str) -> Tuple[str, ...]:
        slots: List[str] = ["any"]
        desc = description.lower()
        if section in {"eat", "drink", "nightlife"}:
            slots.extend(["tonight", "night"])
        if section in {"see", "do"}:
            slots.extend(["day", "weekend"])
        if "breakfast" in desc or "morning" in desc:
            slots.append("day")
        if "sunset" in desc or "evening" in desc:
            slots.append("tonight")
        return tuple(dict.fromkeys(slots))

    def _infer_novelty(self, section: str, description: str) -> int:
        score = 2 if section in {"see", "do"} else 1
        desc = description.lower()
        if any(word in desc for word in ["hidden", "offbeat", "secret", "locals"]):
            score += 1
        if any(word in desc for word in ["iconic", "famous", "landmark"]):
            score -= 1
        return max(score, 1)

    def _approximate_popularity(self, seed: str) -> Tuple[float, int]:
        digest = hashlib.sha1(seed.encode('utf-8')).hexdigest()
        rating = 4.2 + (int(digest[:2], 16) / 255) * 0.6
        reviews = 300 + (int(digest[2:6], 16) % 1200)
        return round(rating, 1), reviews

    def _infer_neighborhood(self, description: str) -> str:
        match = re.search(r"\(([^)]+)\)", description)
        if match:
            candidate = match.group(1)
            if len(candidate.split()) <= 4:
                return candidate
        return ""

    def _infer_party_range(self, description: str, section: str) -> Tuple[int, int]:
        desc = description.lower()
        if any(word in desc for word in ['solo', 'alone', 'intimate']):
            return (1, 2)
        if any(word in desc for word in ['group', 'groups', 'friends', 'families', 'large']):
            return (2, 8)
        if section in {'drink', 'nightlife'}:
            return (2, 6)
        return (1, 6)

    def _looks_like_event(self, name: str, description: str) -> bool:
        text = f"{name} {description}".lower()
        sports_team_terms = {
            'basketball team', 'baseball team', 'football team', 'soccer team', 'hockey team',
            'nba', 'mlb', 'nfl', 'nhl', 'mls', 'wnba', 'minor league', 'major league', 'ncaa'
        }
        if any(term in text for term in sports_team_terms):
            return True
        event_keywords = {
            'season opener', 'home game', 'home games', 'doubleheader', 'playoffs', 'tournament', 'championship',
            'race', 'marathon', 'half marathon', 'triathlon', 'regatta', 'festival', 'fair', 'parade', 'celebration',
            'derby', 'kickoff', 'tipoff', 'matchday', 'game day', 'gameday', 'race day'
        }
        if any(keyword in text for keyword in event_keywords):
            return True
        schedule_keywords = {'season', 'schedule', 'fixtures', 'matches', 'competitions'}
        month_pattern = re.compile(r"\b(january|february|march|april|may|june|july|august|september|october|november|december)\b")
        if month_pattern.search(text) and any(keyword in text for keyword in schedule_keywords):
            return True
        if 'annual ' in text or 'held every' in text or 'each year' in text:
            return True
        return False

    def _looks_like_place(self, name: str, description: str, categories: Sequence[str], section: str) -> bool:
        if not description:
            return False
        name_lower = name.lower()
        desc = description.lower()
        venue_keywords = [
            'park', 'museum', 'gallery', 'center', 'centre', 'garden', 'club', 'bar', 'cafe', 'restaurant',
            'brewery', 'pub', 'hotel', 'trail', 'bridge', 'market', 'theatre', 'theater', 'hall', 'plaza',
            'square', 'pier', 'beach', 'bay', 'island', 'zoo', 'aquarium', 'library', 'tower', 'observatory',
            'harbor', 'harbour', 'campground', 'campus', 'arena', 'stadium', 'ship', 'boat', 'ferry', 'mall',
            'boutique', 'brewpub', 'taproom', 'winery', 'farm', 'bakery', 'diner', 'bistro', 'lounge',
            'speakeasy', 'patio', 'trailhead', 'waterfront', 'marketplace', 'arcade', 'escape', 'studio'
        ]
        sports_terms = [
            'mascot', 'ncaa', 'league', 'season', 'roster', 'players', 'football', 'baseball', 'basketball',
            'soccer', 'hockey', 'team', 'teams', 'franchise'
        ]
        location_terms = [
            'stadium', 'arena', 'ballpark', 'field', 'park', 'center', 'centre', 'hall', 'club', 'bar', 'cafe',
            'restaurant', 'brewery', 'pub', 'trail', 'museum', 'gallery', 'bridge', 'market', 'campus', 'theatre',
            'theater', 'hotel', 'campground', 'pier', 'square', 'garden', 'bay', 'lake', 'river', 'harbor',
            'harbour', 'island', 'station', 'library', 'observatory', 'tower', 'zoo', 'aquarium', 'plaza', 'mall'
        ]
        dish_terms = [
            'dish', 'dessert', 'pie', 'clam', 'clams', 'sandwich', 'roll', 'cuisine', 'specialty', 'speciality',
            'drink', 'cocktail', 'beer', 'wine', 'seafood', 'snack', 'milkshake', 'fish', 'cod'
        ]
        food_venue_words = [
            'restaurant', 'bar', 'cafe', 'pub', 'tavern', 'grill', 'house', 'kitchen', 'deli', 'bakery',
            'diner', 'pizzeria', 'bistro', 'izakaya', 'ramen', 'sushi', 'steakhouse', 'tea house', 'coffee', 'eatery'
        ]
        if any(term in name_lower for term in dish_terms) and not any(word in name_lower for word in food_venue_words):
            return False
        if any(term in desc for term in dish_terms) and not any(word in name_lower for word in food_venue_words) and not any(word in desc for word in food_venue_words):
            return False
        if any(term in desc for term in sports_terms) and not any(loc in desc for loc in location_terms):
            return False
        if any(keyword in name_lower for keyword in venue_keywords) or any(keyword in desc for keyword in venue_keywords):
            return True
        loc_phrases = [' located ', ' at ', ' on ', ' near ', ' inside ', ' overlooking ', ' steps from ', ' in the ']
        if any(phrase in desc for phrase in loc_phrases):
            return True
        return False

    def _infer_wildcard(self, description: str) -> bool:
        desc = description.lower()
        return any(word in desc for word in ['quirky', 'speakeasy', 'immersive', 'unexpected', 'underground', 'pop-up'])

class ExploreAgent:
    def __init__(self) -> None:
        self.parser = CommandParser()
        self.llm = LLMSuggester()
        self.session = SessionContext()
        self.weather_service = WeatherService()
        self.geocoder = GeocodingService()
        self.google_places = GooglePlacesService()
        self.wikivoyage_service = WikivoyageService()
        self.place_assembler = WikivoyagePlaceAssembler(self.wikivoyage_service)
        self.wiki_geo = WikiGeoService()
        self.city_lookup_cache: Dict[str, CityLookupResult] = {}
        self.place_cache: Dict[str, List[Place]] = {}

    def _dispatch(self, text: str) -> str:
        parsed = self.parser.parse(text)
        if parsed.intent == "noop":
            return "Say 'explore <city>' to get started."
        if parsed.intent == "help":
            return HELP_TEXT
        if parsed.intent == "error":
            return "I need a city name after 'explore'."
        if parsed.intent == "unknown":
            return "I did not catch that. Try 'explore help' for the syntax."
        if parsed.intent == "refine":
            return self._handle_refine(parsed.refine_filters)
        if parsed.intent == "explore":
            return self._handle_explore(parsed)
        return "Let me know a city with 'explore <city>'."

    def handle(self, text: str) -> str:
        return self._sanitize_output(self._dispatch(text))

    def _handle_explore(self, parsed: ParsedInput) -> str:
        city_info = self._lookup_city(parsed.city)
        if city_info is None:
            return f"I could not locate {parsed.city}. Try a different city or check the spelling."
        filters = dict(parsed.filters)
        weather = self.weather_service.get_summary(city_info.lat, city_info.lon, filters.get("time"))
        timezone_name = weather.timezone if weather else "UTC"
        offset_minutes = self._timezone_offset_minutes(timezone_name)
        places = self._get_places(city_info, offset_minutes)
        if not places:
            return f"I couldn't find fresh picks for {city_info.name} right now. Try another city or check your API access."
        city_profile = CityProfile(
            name=city_info.name,
            lat=city_info.lat,
            lon=city_info.lon,
            timezone=timezone_name,
            places=tuple(places),
        )
        _, places_used, relaxed = self._build_recommendations(city_profile, parsed.mode, filters, weather)
        if not places_used:
            return f"No matches yet for that combo in {city_info.name}. Try relaxing a filter."
        display_places = list(places_used[:6])
        self.session.last_city = city_info.name
        self.session.last_mode = parsed.mode
        self.session.last_filters = filters
        self.session.last_results = display_places
        self.session.last_weather = weather

        status_line = f'Exploring "{city_info.name}"...'
        llm_text = self.llm.generate(city_profile, parsed.mode, filters, weather, display_places)
        planning_line = self._planning_thought(city_profile, weather, filters, parsed.mode, relaxed)
        refine_line = self._refine_hints(len(display_places), filters)
        body_lines: List[str]
        if llm_text:
            body_lines = [planning_line]
            stripped_lines = [line.strip() for line in llm_text.strip().splitlines() if line.strip()]
            body_lines.extend(stripped_lines)
        else:
            body_lines = self._format_output(city_profile, display_places, filters, weather, parsed.mode, relaxed)
        body_lines.append(refine_line)
        output = "\n".join([status_line, *body_lines])
        return self._sanitize_output(output)

    def _handle_refine(self, refine_filters: Dict[str, str]) -> str:
        if not self.session.last_city:
            return "Run an explore search first so I know the city."
        merged = dict(self.session.last_filters)
        merged.update(refine_filters)
        parsed = ParsedInput(
            intent="explore",
            raw="refine",
            mode=self.session.last_mode,
            city=self.session.last_city,
            filters=merged,
        )
        return self._handle_explore(parsed)

    def _lookup_city(self, city: Optional[str]) -> Optional[CityLookupResult]:
        if not city:
            return None
        key = self._normalize(city)
        if key in self.city_lookup_cache:
            return self.city_lookup_cache[key]
        result = self.geocoder.geocode(city)
        if result:
            self.city_lookup_cache[key] = result
        return result

    def _get_places(self, city: CityLookupResult, offset_minutes: Optional[int]) -> List[Place]:
        key = self._normalize(city.name)
        if key in self.place_cache:
            return self.place_cache[key]
        primary = self.google_places.fetch_places(city, offset_minutes)
        places: List[Place] = list(primary)
        if len(places) < 5:
            fallback = self.place_assembler.fetch_places(city)
            for place in fallback:
                if all(place.name.lower() != existing.name.lower() for existing in places):
                    places.append(place)
                    if len(places) >= 20:
                        break
        seen: set[str] = set()
        ordered: List[Place] = []
        for place in places:
            key_name = place.name.lower()
            if key_name in seen:
                continue
            seen.add(key_name)
            ordered.append(place)
        trimmed = ordered[:60]
        if len(trimmed) < 7:
            trimmed.extend(self._geo_supplements(city, trimmed, 7 - len(trimmed)))
        self.place_cache[key] = trimmed
        return trimmed

    def _geo_supplements(self, city: CityLookupResult, existing: List[Place], limit: int) -> List[Place]:
        if limit <= 0:
            return []
        existing_names = {place.name.lower() for place in existing}
        extras: List[Place] = []
        results = self.wiki_geo.nearby(city.lat, city.lon, limit=limit * 2)
        for item in results:
            title = item.get("title", "").strip()
            if not title or title.lower() in existing_names:
                continue
            description = self.wiki_geo.short_description(title) or "Nearby highlight"
            slug_seed = f"{city.name}-{title}-geosearch"
            slug = hashlib.sha1(slug_seed.encode("utf-8")).hexdigest()[:12]
            place = Place(
                id=slug,
                name=title,
                categories=("general",),
                type="Landmark",
                description=description,
                vibe_tags=("chill",),
                budgets=("$",),
                diets=("any",),
                indoor="mixed",
                accessible=None,
                distance="any",
                rating=4.3,
                review_count=400,
                novelty=2,
                time_slots=("any", "day"),
                neighborhood="",
                party_range=(1, 6),
                wildcard=True,
                source="wikipedia",
            )
            extras.append(place)
            existing_names.add(title.lower())
            if len(extras) >= limit:
                break
        return extras

    def _timezone_offset_minutes(self, timezone_name: str) -> Optional[int]:
        if not timezone_name or ZoneInfo is None:
            return None
        try:
            tz = ZoneInfo(timezone_name)
        except Exception:
            return None
        now_utc = datetime.now(timezone.utc)
        offset = tz.utcoffset(now_utc)
        if offset is None:
            return None
        return int(offset.total_seconds() // 60)

    @staticmethod
    def _normalize(value: str) -> str:
        return "".join(ch for ch in value.lower() if ch.isalnum() or ch.isspace()).strip()


    def _build_recommendations(
        self,
        city: CityProfile,
        mode: str,
        filters: Dict[str, str],
        weather: Optional[WeatherSummary],
    ) -> Tuple[str, List[Place], bool]:
        filters_used = dict(filters)
        candidates = self._filter_candidates(city, mode, filters_used)
        relaxed = False
        if len(candidates) < 5 and ("vibe" in filters_used or "diet" in filters_used):
            relaxed = True
            filters_used = {k: v for k, v in filters_used.items() if k not in {"vibe", "diet"}}
            candidates = self._filter_candidates(city, mode, filters_used)
        if not candidates:
            return "", [], relaxed
        scored = sorted(
            ((self._score_place(place, filters, weather, mode), place) for place in candidates),
            key=lambda item: item[0],
            reverse=True,
        )
        target_total = 6 if mode == "general" else 7
        min_food_required = 3 if mode == "general" else 0
        picked: List[Place] = []
        picked_ids: set[str] = set()
        category_counts: Dict[str, int] = {}

        def category_limit(primary: str) -> Optional[int]:
            if mode != "general":
                return None
            if primary == "food":
                return None
            return 2

        def add_place(place: Place, force: bool = False) -> bool:
            if place.id in picked_ids:
                return False
            primary = place.categories[0] if place.categories else "general"
            limit = category_limit(primary)
            if not force and limit is not None and category_counts.get(primary, 0) >= limit:
                return False
            picked.append(place)
            picked_ids.add(place.id)
            category_counts[primary] = category_counts.get(primary, 0) + 1
            return True

        if min_food_required:
            available_food = sum(1 for _, place in scored if self._is_food(place))
            required_food = min(min_food_required, available_food)
            food_added = 0
            for _, place in scored:
                if food_added >= required_food or len(picked) >= target_total:
                    break
                if not self._is_food(place):
                    continue
                if add_place(place, force=True):
                    food_added += 1

        for _, place in scored:
            if len(picked) >= target_total:
                break
            add_place(place)

        if len(picked) < target_total:
            for _, place in scored:
                if len(picked) >= target_total:
                    break
                if place.id in picked_ids:
                    continue
                add_place(place, force=True)

        if mode != "general" and len(picked) < 5:
            for _, place in scored:
                if len(picked) >= 5:
                    break
                if place.id in picked_ids:
                    continue
                add_place(place, force=True)

        wildcard = next((p for p in city.places if p.wildcard and p.id not in picked_ids), None)
        if wildcard and len(picked) >= 4 and len(picked) < target_total:
            add_place(wildcard, force=True)

        if len(picked) > target_total:
            picked = picked[:target_total]

        lines = self._format_output(city, picked, filters, weather, mode, relaxed)
        text = "\n".join(lines)
        return text, picked, relaxed
    def _filter_candidates(self, city: CityProfile, mode: str, filters: Dict[str, str]) -> List[Place]:
        matches: List[Place] = []
        for place in city.places:
            if not self._mode_matches(place, mode):
                continue
            if not self._filters_match(place, filters):
                continue
            matches.append(place)
        return matches

    def _mode_matches(self, place: Place, mode: str) -> bool:
        if mode == "general":
            return True
        return mode in place.categories

    def _is_food(self, place: Place) -> bool:
        categories = set(place.categories)
        if "food" in categories:
            return True
        place_type = place.type.lower()
        return place_type in {"restaurant", "cafe", "bakery", "bar", "nightlife"}

    def _filters_match(self, place: Place, filters: Dict[str, str]) -> bool:
        for key, raw_value in filters.items():
            value = raw_value.lower()
            if key == "vibe" and value not in place.vibe_tags:
                return False
            if key == "budget":
                budget_values = [b.lower() for b in place.budgets]
                if value not in budget_values:
                    return False
            if key == "diet":
                diets = set(place.diets)
                if "any" not in diets and value not in diets:
                    return False
            if key == "indoor":
                wants_indoor = value in {"true", "yes", "1"}
                if wants_indoor and place.indoor == "outdoor":
                    return False
                if not wants_indoor and place.indoor == "indoor":
                    return False
            if key == "accessible":
                wants_accessible = value in {"true", "yes", "1"}
                if place.accessible is not None:
                    if wants_accessible and not place.accessible:
                        return False
                    if not wants_accessible and place.accessible:
                        continue
            if key == "distance":
                desired = value
                if desired in DISTANCE_ORDER:
                    place_rank = DISTANCE_ORDER.get(place.distance, 2)
                    desired_rank = DISTANCE_ORDER[desired]
                    if place_rank > desired_rank:
                        return False
                elif desired.startswith("<="):
                    if place.distance not in {"walkable", "short"}:
                        return False
            if key == "party":
                try:
                    party_size = int(value)
                except ValueError:
                    continue
                low, high = place.party_range
                if party_size < low or party_size > high:
                    return False
            if key == "time":
                slot = self._normalize_time(value)
                slots = set(place.time_slots)
                if slot and slot not in slots and "any" not in slots:
                    return False
        return True

    def _score_place(
        self,
        place: Place,
        filters: Dict[str, str],
        weather: Optional[WeatherSummary],
        mode: str,
    ) -> float:
        score = place.rating
        score += math.log(place.review_count + 1) * 0.05
        score += place.novelty * 0.2
        if place.type == 'restaurant':
            score += 0.5
        elif place.type in {'sight', 'experience'}:
            score += 0.3
        if weather:
            if weather.rainy:
                if place.indoor == "indoor":
                    score += 0.6
                elif place.indoor == "mixed":
                    score += 0.3
                else:
                    score -= 0.8
            elif weather.clear and place.indoor == "outdoor":
                score += 0.5
            elif weather.condition == "snow" and place.indoor == "outdoor":
                score -= 1.0
        vibe = filters.get("vibe")
        if vibe:
            if vibe in place.vibe_tags:
                score += 0.8
            else:
                score -= 0.5
        budget = filters.get("budget")
        if budget:
            budgets_lower = [b.lower() for b in place.budgets]
            if budget in budgets_lower:
                score += 0.3
            else:
                score -= 0.6
        diet = filters.get("diet")
        if diet and ("any" not in place.diets and diet not in place.diets):
            score -= 0.4
        if filters.get("time"):
            slot = self._normalize_time(filters["time"])
            slots = set(place.time_slots)
            if slot in slots:
                score += 0.2
            elif "any" not in slots:
                score -= 0.4
        if place.type == 'activity':
            desc_lower = place.description.lower()
            event_signals = {
                'home game', 'home games', 'regular season', 'season opener', 'playoffs', 'tournament',
                'championship', 'race', 'marathon', 'triathlon', 'regatta', 'festival', 'fair', 'derby',
                'meet', 'matchday', 'gameday', 'kickoff', 'tipoff'
            }
            if any(term in desc_lower for term in event_signals):
                score -= 1.2
            else:
                month_match = re.search(r"\b(january|february|march|april|may|june|july|august|september|october|november|december)\b", desc_lower)
                if month_match and any(term in desc_lower for term in {'season', 'festival', 'fair', 'race', 'marathon'}):
                    score -= 0.8
        if place.wildcard:
            score += 0.1
        if mode == "hidden" and place.novelty >= 3:
            score += 0.6
        if mode == "outdoors" and place.indoor == "outdoor":
            score += 0.4
        if mode == "date" and "romantic" in place.vibe_tags:
            score += 0.4
        return score

    def _format_output(
        self,
        city: CityProfile,
        places: List[Place],
        filters: Dict[str, str],
        weather: Optional[WeatherSummary],
        mode: str,
        relaxed: bool,
    ) -> List[str]:
        lines: List[str] = [self._planning_thought(city, weather, filters, mode, relaxed)]
        def clean_description(raw: str) -> str:
            cleaned = re.sub(r'(?i)wikivoyage', '', raw or '')
            cleaned = re.sub(r'\s+', ' ', cleaned).strip()
            return cleaned
        def ensure_sentence(text: str) -> str:
            text = text.strip()
            if not text:
                return ''
            if text[-1] not in '.!?':
                text += '.'
            return text
        for idx, place in enumerate(places, start=1):
            location_bits = [part.strip() for part in (place.neighborhood, city.name) if part and part.strip()]
            location = ', '.join(location_bits) if location_bits else city.name
            description = clean_description(place.description)
            summary_parts: List[str] = []
            if description:
                summary_parts.append(ensure_sentence(description))
            else:
                summary_parts.append('Local favorite worth a first visit.')
            vibe_focus = filters.get('vibe')
            if vibe_focus and vibe_focus in place.vibe_tags:
                summary_parts.append(f'Perfect for {vibe_focus} vibes.')
            elif place.vibe_tags:
                summary_parts.append(f"Great for {', '.join(place.vibe_tags[:2])} vibes.")
            summary = ' '.join(part for part in summary_parts if part).strip()
            if len(summary) > 220:
                clipped = summary[:220].rsplit(' ', 1)[0]
                summary = clipped + '...'
            lines.append(f"{idx}. {place.name} ({location}) - {summary}")
        return lines

    def _planning_thought(
        self,
        city: CityProfile,
        weather: Optional[WeatherSummary],
        filters: Dict[str, str],
        mode: str,
        relaxed: bool,
    ) -> str:
        notes: List[str] = [city.name]
        if weather:
            notes.append(weather.describe().lower())
            if weather.rainy:
                notes.append("favoring cozy indoor balance")
            elif weather.clear:
                notes.append("adding open-air looks")
        else:
            notes.append("no live weather, blending indoor and outdoor")
        if filters.get("vibe"):
            notes.append(f"chasing {filters['vibe']} vibe")
        if filters.get("budget"):
            notes.append(f"budget {filters['budget']}")
        if mode == "hidden":
            notes.append("prioritizing locals-only gems")
        if mode == "outdoors":
            notes.append("keeping fresh-air forward")
        if mode == "date":
            notes.append("date-night energy")
        if relaxed:
            if filters.get("vibe"):
                notes.append("softened vibe filter to broaden picks")
            else:
                notes.append("lightly relaxed filters for variety")
        return "Planning thought: " + "; ".join(notes)

    def _compose_reason(
        self,
        place: Place,
        filters: Dict[str, str],
        weather: Optional[WeatherSummary],
    ) -> str:
        reasons: List[str] = []
        if weather:
            if weather.rainy and place.indoor != "outdoor":
                reasons.append("rain safe")
            elif weather.clear and place.indoor == "outdoor":
                reasons.append("skyline friendly")
        vibe = filters.get("vibe")
        if vibe and vibe in place.vibe_tags:
            reasons.append(f"vibe {vibe}")
        if filters.get("budget"):
            budgets_lower = [b.lower() for b in place.budgets]
            if filters["budget"] in budgets_lower:
                reasons.append(f"budget {filters['budget']}")
        if filters.get("diet") and filters["diet"] in place.diets:
            reasons.append(filters["diet"])
        if filters.get("time"):
            slot = self._normalize_time(filters["time"])
            if slot in place.time_slots:
                reasons.append(slot)
        if place.accessible and filters.get("accessible") in {"true", "yes", "1"}:
            reasons.append("accessible")
        if place.wildcard:
            reasons.append("wildcard")
        if place.novelty >= 3 and "wildcard" not in reasons:
            reasons.append("local gem")
        if not reasons:
            reasons.append("crowd loved")
        return " + ".join(reasons)

    def _refine_hints(self, count: int, filters: Dict[str, str]) -> str:
        if count == 0:
            return "Refine: explore <city> to begin."
        sample_filters: List[str] = []
        if "budget" in filters:
            sample_filters.append(f"budget={filters['budget']}")
        else:
            sample_filters.append("budget=$$")
        if "vibe" in filters:
            sample_filters.append(f"vibe={filters['vibe']}")
        else:
            sample_filters.append("vibe=romantic")
        if "time" not in filters:
            sample_filters.append("time=tonight")
        hint = "refine " + " ".join(sample_filters)
        return "Refine: " + hint

    @staticmethod
    def _normalize_time(value: str) -> str:
        key = value.lower().replace("-", " ")
        mapping = {
            "now": "now",
            "tonight": "tonight",
            "today": "day",
            "day": "day",
            "tomorrow": "tomorrow",
            "weekend": "weekend",
            "this weekend": "weekend",
            "this_weekend": "weekend",
            "night": "tonight",
        }
        return mapping.get(key, key)

    @staticmethod
    def _sanitize_output(text: str) -> str:
        normalized = unicodedata.normalize('NFKD', text)
        cleaned_chars: List[str] = []
        for ch in normalized:
            if ch in '\n\r\t':
                cleaned_chars.append(ch)
                continue
            code = ord(ch)
            if 32 <= code < 127:
                cleaned_chars.append(ch)
        cleaned = ''.join(cleaned_chars)
        lines = [re.sub(r'\s+$', '', line) for line in cleaned.splitlines()]
        return '\n'.join(lines)


def build_agent() -> ExploreAgent:
    return ExploreAgent()


