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


def extract_title(text: str) -> str | None:
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    for line in lines[:5]:
        cleaned = re.sub(r'[^\w\s\-\'\":;,.!?()/]', '', line).strip()
        if len(cleaned) < 10 or len(cleaned) > 120:
            continue
        if re.search(
            r'^(page|isbn|volume|author|date|published|abstract|introduction|http|keywords|chapter|table|figure|contents|references)',
            cleaned, re.I
        ):
            continue
        if re.search(r'\d{4}', cleaned):
            continue
        return cleaned
    return None


def extract_authors(text: str) -> str | None:
    first_2000 = text[:2000]
    m = re.search(
        r'(?:author|by|creator)s?\s*:?\s*([A-Z][a-zA-Z.\s\-]{3,80})',
        first_2000[:500], re.I
    )
    if m:
        return m.group(1).strip()
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    for i, line in enumerate(lines[1:5], 1):
        if re.match(r'^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2}$', line):
            if not re.match(
                r'^(abstract|introduction|keywords|contents|references|acknowledgements)',
                line, re.I
            ):
                return line
    return None


def extract_abstract(text: str) -> str | None:
    m = re.search(
        r'(?:^|\n)(?:abstract|summary|introduction|executive\s*summary)\s*:?\s*\n+([\s\S]{50,1500}?)(?=\n\s*\n|\n(?:[A-Z][A-Z\s]{2,40}:?\s*\n)|$)',
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
