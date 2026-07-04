import re
from yake import KeywordExtractor

_STOP_WORDS = {
    'the', 'of', 'and', 'to', 'in', 'is', 'for', 'that', 'on', 'with',
    'as', 'by', 'an', 'at', 'this', 'from', 'it', 'which', 'or', 'be',
    'are', 'was', 'were', 'has', 'have', 'had', 'been', 'but', 'not',
    'we', 'they', 'our', 'their', 'more', 'about', 'can', 'will', 'would',
    'should', 'other', 'some', 'than', 'into', 'its', 'these', 'those',
    'also', 'such', 'only', 'new', 'first', 'two', 'has', 'more', 'how',
    'any', 'who', 'very', 'many'
}


_NON_TITLE_START = re.compile(
    r'^(page|isbn|volume|issn|doi|arxiv|abstract|introduction|keywords|references|'
    r'conclusion|acknowledgements|appendix|figure|table|contents|chapter|'
    r'http|https|www\.|email|corresponding)',
    re.I
)

_SECTION_HEADING = re.compile(
    r'^(abstract|introduction|keywords|references|conclusion|acknowledgements|'
    r'appendix|methodology|results|discussion|related work|background|'
    r'literature review|method|experiment|proposed)',
    re.I
)

_AUTHOR_PATTERN = re.compile(
    r'^[A-Z][a-zA-Z.\-]+(?:(?:\s|,\s*)[A-Z][a-zA-Z.\-]+)*'
    r'(?:\s*(?:and|&)\s*[A-Z][a-zA-Z.\-]+(?:(?:\s|,\s*)[A-Z][a-zA-Z.\-]+)*)*$'
)


def _clean_author_line(line: str) -> str:
    """Remove superscript numbers, special chars, collapse whitespace."""
    cleaned = re.sub(r'[\d\*†‡§¶\u00B9-\u00BE\u2070-\u209F\u2122]+', '', line)
    cleaned = re.sub(r'\s{2,}', ' ', cleaned).strip()
    return cleaned


def _is_author_line(line: str) -> bool:
    cleaned = _clean_author_line(line)
    if len(cleaned) < 8 or len(cleaned) > 200:
        return False
    if _SECTION_HEADING.search(cleaned):
        return False
    if re.match(
        r'^(department|university|college|school|institute|laboratory|lab|'
        r'email|http|www\.|corresponding)',
        cleaned, re.I
    ):
        return False
    if re.match(r'^[\d\s\-—_]+$', cleaned):
        return False
    if not _AUTHOR_PATTERN.match(cleaned):
        return False
    return True


def extract_title(text: str) -> str | None:
    lines = [l.strip() for l in text.split('\n') if l.strip()]

    # Find abstract heading first
    abstract_idx = -1
    for idx, ln in enumerate(lines):
        stripped = re.sub(r'^[\d\s\.\#\*\+†‡§¶\-—]+', '', ln).strip()
        if re.match(r'^(abstract|summary|executive summary)\s*:?\s*$', stripped, re.I):
            abstract_idx = idx
            break

    # Only search within lines before the abstract
    search_lines = lines[:abstract_idx] if abstract_idx >= 0 else lines[:15]

    best_score = -10
    best_title = None

    for i, line in enumerate(search_lines[:15]):
        starts_with_digit = bool(re.match(r'^\d', line))
        raw = re.sub(r'^(title|paper|topic|report|article|research)\s*:\s*', '', line, flags=re.I).strip()
        cleaned = re.sub(r'^[\d\s\.\#\*\+†‡§¶\-—·•●]+', '', raw).strip()
        if len(cleaned) < 5 or len(cleaned) > 200:
            continue
        if _NON_TITLE_START.match(cleaned):
            continue
        if _SECTION_HEADING.match(cleaned):
            continue
        if re.match(r'^[\d\s\-—_]+$', cleaned):
            continue
        if re.match(r'^---\s', cleaned):
            continue
        if re.match(r'^[\w.-]+@[\w.-]+\.\w+', cleaned):
            continue
        if re.match(r'^https?://', cleaned, re.I):
            continue
        if not re.search(r'\s', cleaned) and len(cleaned) < 8:
            continue

        score = 0
        if starts_with_digit:
            score -= 2
        if re.match(r'^[A-Z]', cleaned):
            score += 5
        if ' ' in cleaned:
            score += 4
        if len(cleaned) > 25:
            score += 4
        elif len(cleaned) > 15:
            score += 2
        if not cleaned.endswith('.'):
            score += 1
        if cleaned == cleaned.lower():
            score -= 5
        if i == 0:
            score += 2
        elif i == 1:
            score += 1
        if re.search(r'\b(authors?|by|keywords|corresponding)\s*:', cleaned, re.I):
            score -= 10
        if re.match(r'^(first|second|third|next|last|page|line|section|part|introduction)\b', cleaned, re.I):
            score -= 5
        if cleaned == cleaned.upper() and re.search(
            r'\b(CONFERENCE|PROCEEDINGS|JOURNAL|WORKSHOP|SYMPOSIUM|TRANSACTIONS)\b', cleaned, re.I
        ):
            score -= 8

        if score > best_score:
            best_score = score
            best_title = cleaned

    # Fallback: first capitalized multi-word line
    if best_title is None:
        for ln in search_lines:
            c = re.sub(r'^[\d\s\.\#\*\+†‡§¶\-—·•●]+', '', ln).strip()
            if len(c) >= 8 and ' ' in c and re.match(r'^[A-Z]', c):
                return c
    return best_title


def extract_authors(text: str) -> str | None:
    lines = [l.strip() for l in text.split('\n') if l.strip()]

    # Find abstract heading to limit search region
    abstract_idx = -1
    for idx, ln in enumerate(lines):
        stripped = re.sub(r'^[\d\s\.\#\*\+†‡§¶\-—]+', '', ln).strip()
        if re.match(r'^(abstract|summary|executive summary)\s*:?\s*$', stripped, re.I):
            abstract_idx = idx
            break

    author_region = lines[:abstract_idx] if abstract_idx >= 0 else lines[:12]

    # First try labeled pattern
    for ln in lines:
        if re.match(r'^(?:author|by|creator)s?\s*:', ln, re.I):
            m = re.match(
                r'^(?:author|by|creator)s?\s*:?\s*([A-Z][a-zA-Z.\s,&\-]{3,80})',
                ln, re.I
            )
            if m:
                return m.group(1).strip()

    # Find title position
    title = extract_title(text)
    title_idx = -1
    if title:
        cleaned_title = re.sub(r'^[\d\s\.\#\*\+†‡§¶\-—·•●]+', '', title).strip()
        for idx, ln in enumerate(author_region):
            if re.sub(r'^[\d\s\.\#\*\+†‡§¶\-—·•●]+', '', ln).strip() == cleaned_title:
                title_idx = idx
                break

    start = title_idx + 1 if title_idx >= 0 else 0
    end = min(len(author_region), start + 8)

    for i in range(start, end):
        line = author_region[i]
        cleaned = re.sub(r'[\d\*†‡§¶\u00B9-\u00BE\u2070-\u209F\u2122]+', '', line)
        cleaned = re.sub(r'\s{2,}', ' ', cleaned).strip()
        if len(cleaned) < 6 or len(cleaned) > 200:
            continue
        if re.match(
            r'^(abstract|introduction|keywords|references|conclusion|acknowledgements|'
            r'appendix|methodology|results|discussion|department|university|college|'
            r'school|institute|laboratory|lab|email|http|www\.|corresponding)',
            cleaned, re.I
        ):
            continue
        if re.match(r'^[\d\s\-—_]+$', cleaned):
            continue
        if re.match(r'^---\s', cleaned):
            continue
        if _AUTHOR_PATTERN.match(cleaned):
            return cleaned

    return None


def extract_abstract(text: str) -> str | None:
    lines = [l.strip() for l in text.split('\n') if l.strip()]

    abstract_idx = -1
    for idx, ln in enumerate(lines):
        stripped = re.sub(r'^[\d\s\.\#\*\+†‡§¶\-—]+', '', ln).strip()
        if re.match(r'^(abstract|summary|executive summary)\s*:?\s*$', stripped, re.I):
            abstract_idx = idx
            break

    if abstract_idx >= 0 and abstract_idx + 1 < len(lines):
        abs_lines = []
        for j in range(abstract_idx + 1, min(len(lines), abstract_idx + 15)):
            ln = lines[j]
            if re.match(
                r'^(introduction|keywords|references|conclusion|acknowledgements|'
                r'methodology|results|discussion|related work|background)', ln, re.I
            ):
                break
            if re.match(r'^[\d\s\.\#\*\+†‡§¶\-—]+$', ln):
                continue
            abs_lines.append(ln)
        if abs_lines:
            abstract = ' '.join(abs_lines)[:500].strip()
            if len(abstract) >= 20:
                return abstract

    m = re.search(
        r'(?:^|\n)(?:abstract|summary)\s*:?\s*\n+([\s\S]{50,1500}?)(?=\n\s*\n|\n(?:[A-Z][A-Z\s]{2,40}:?\s*\n)|$)',
        text, re.I | re.M | re.DOTALL
    )
    if m:
        abstract = m.group(1).strip()
        return abstract[:500].strip()
    first = re.sub(r'\s+', ' ', text[:300]).strip()
    if len(first) >= 300:
        return first + '...'
    return first if first else None


def extract_keywords(text: str) -> list[str]:
    kw_extractor = KeywordExtractor(lan="en", top=5, dedupLim=0.9)
    try:
        keywords = kw_extractor.extract_keywords(text[:5000])
        return [kw[0] for kw in keywords]
    except Exception:
        pass
    words = re.findall(r'[a-zA-Z]{5,}', text.lower())
    freq = {}
    for w in words:
        if w not in _STOP_WORDS:
            freq[w] = freq.get(w, 0) + 1
    sorted_words = sorted(freq.items(), key=lambda x: -x[1])
    return [w for w, _ in sorted_words[:5]]


DEPARTMENT_KEYWORDS: dict[str, list[str]] = {
    'Computer Science and Engineering': ['cse', 'computer science', 'software', 'algorithm', 'programming', 'data structure', 'machine learning', 'artificial intelligence', 'deep learning', 'neural network', 'database', 'operating system', 'computer network', 'cybersecurity', 'web', 'mobile app', 'cloud computing', 'big data', 'data mining', 'software engineering', 'compiler', 'computer vision', 'natural language processing', 'blockchain', 'iot', 'internet of things'],
    'Information Science and Library Management': ['islm', 'information science', 'library', 'information management', 'knowledge management', 'catalogu', 'classification', 'information retrieval', 'digitization', 'archives', 'record management', 'bibliometric', 'librar', 'information system', 'metadata'],
    'Electrical and Electronic Engineering': ['eee', 'electrical', 'electronic', 'circuit', 'power system', 'signal processing', 'telecommunication', 'embedded system', 'vlsi', 'microcontroller', 'arduino', 'raspberry pi', 'solar', 'renewable energy', 'control system', 'microprocessor'],
    'Genetic Engineering': ['ge', 'genetic', 'gene', 'dna', 'rna', 'genome', 'bioinformatics', 'molecular', 'biotechnology', 'genomics', 'protein', 'cell', 'mutation', 'crispr', 'cloning', 'transgenic'],
    'Mathematics': ['math', 'mathematics', 'statistics', 'calculus', 'algebra', 'geometry', 'probability', 'differential', 'linear algebra', 'number theory', 'topology', 'optimization', 'numerical', 'discrete math'],
    'Physics': ['physics', 'quantum', 'mechanics', 'thermodynamics', 'electromagnetism', 'optics', 'relativity', 'nuclear', 'particle', 'condensed matter', 'astrophysics', 'classical mechanics', 'fluid dynamics', 'wave'],
    'Chemistry': ['chemistry', 'chemical', 'organic', 'inorganic', 'biochemistry', 'analytical', 'physical chemistry', 'polymer', 'molecule', 'compound', 'reaction', 'spectroscopy', 'laboratory', 'synthesis'],
    'Business Administration': ['ba', 'business', 'management', 'marketing', 'finance', 'accounting', 'entrepreneurship', 'economics', 'human resource', 'organizational', 'strategy', 'supply chain', 'operations', 'leadership', 'commerce'],
}

_DEPARTMENT_ABBREVIATIONS: dict[str, str] = {
    'cse': 'Computer Science and Engineering',
    'islm': 'Information Science and Library Management',
    'eee': 'Electrical and Electronic Engineering',
    'ge': 'Genetic Engineering',
    'math': 'Mathematics',
    'physics': 'Physics',
    'chemistry': 'Chemistry',
    'ba': 'Business Administration',
}


def extract_department_heuristic(text: str) -> str | None:
    lower = text[:3000].lower()
    for abbr, dept in _DEPARTMENT_ABBREVIATIONS.items():
        if re.search(rf'\b{abbr}\b', lower):
            return dept
    for dept, kws in DEPARTMENT_KEYWORDS.items():
        for kw in kws:
            if kw in lower:
                return dept
    return None
