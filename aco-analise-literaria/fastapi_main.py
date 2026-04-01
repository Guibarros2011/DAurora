"""
ACO · Serviço de Análise Literária
FastAPI que replica o notebook analise_literaria_pt.ipynb
Deploy: Render.com (Free tier)
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import tempfile, os, re, json
import numpy as np
from collections import Counter
from itertools import combinations
import urllib.request

app = FastAPI(title="ACO Análise Literária", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Inicialização lazy (evita timeout no cold start) ──────────
_nlp = None
_sia = None
_pyphen_dic = None

def get_nlp():
    global _nlp
    if _nlp is None:
        import spacy
        _nlp = spacy.load("pt_core_news_lg")
        _nlp.max_length = 2_000_000
    return _nlp

def get_sia():
    global _sia
    if _sia is None:
        # Baixa LeIA se não estiver instalado
        try:
            from leia import SentimentIntensityAnalyzer
        except ImportError:
            base = "https://raw.githubusercontent.com/rafjaa/LeIA/master"
            import site
            dist = site.getsitepackages()[0]
            urllib.request.urlretrieve(f"{base}/leia.py", f"{dist}/leia.py")
            os.makedirs(f"{dist}/lexicons", exist_ok=True)
            for fname in ["vader_lexicon_ptbr.txt","booster.txt","negate.txt","emoji_utf8_lexicon_ptbr.txt"]:
                urllib.request.urlretrieve(f"{base}/lexicons/{fname}", f"{dist}/lexicons/{fname}")
            from leia import SentimentIntensityAnalyzer
        _sia = SentimentIntensityAnalyzer()
    return _sia

def get_pyphen():
    global _pyphen_dic
    if _pyphen_dic is None:
        import pyphen
        _pyphen_dic = pyphen.Pyphen(lang="pt_BR")
    return _pyphen_dic

def convert_numpy(obj):
    """Converte tipos numpy para Python nativo."""
    if isinstance(obj, np.integer): return int(obj)
    if isinstance(obj, np.floating): return float(obj)
    if isinstance(obj, np.ndarray): return obj.tolist()
    if isinstance(obj, dict): return {k: convert_numpy(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)): return [convert_numpy(e) for e in obj]
    return obj

# ── Extração de texto ─────────────────────────────────────────
def extrair_texto(conteudo: bytes, nome: str) -> str:
    ext = nome.lower().split(".")[-1]
    if ext in ("txt", "md"):
        texto = conteudo.decode("utf-8", errors="replace")
    elif ext == "docx":
        import mammoth
        with tempfile.NamedTemporaryFile(suffix=".docx", delete=False) as f:
            f.write(conteudo)
            tmp = f.name
        try:
            result = mammoth.extract_raw_text(tmp)
            texto = result.value
        finally:
            os.unlink(tmp)
    else:
        raise ValueError(f"Formato não suportado: .{ext}. Use .docx, .txt ou .md")
    texto = re.sub(r" {2,}", " ", texto)
    texto = re.sub(r"\n{3,}", "\n\n", texto)
    return texto.strip()

# ── Pipeline de análise ───────────────────────────────────────
def analisar(texto: str, nome_arquivo: str) -> dict:
    import pandas as pd
    from nltk.corpus import stopwords
    import nltk
    nltk.download("stopwords", quiet=True)
    nltk.download("punkt", quiet=True)

    nlp = get_nlp()
    sia = get_sia()
    dic = get_pyphen()

    stop_pt = set(stopwords.words("portuguese"))
    paragraphs = [p.strip() for p in texto.split("\n\n") if len(p.strip()) > 30]

    print(f"Processando {len(paragraphs)} parágrafos com spaCy...")
    doc = nlp(texto)

    tokens_all     = [t for t in doc if not t.is_space]
    tokens_words   = [t for t in tokens_all if t.is_alpha]
    tokens_content = [t for t in tokens_words
                      if t.lemma_.lower() not in stop_pt
                      and t.pos_ in ("NOUN","VERB","ADJ","ADV")]
    sentences = list(doc.sents)

    # ── Superfície ───────────────────────────────────────────
    n_tokens    = len(tokens_words)
    n_types     = len(set(t.lemma_.lower() for t in tokens_words))
    n_sentences = len(sentences)
    n_paragraphs= len(paragraphs)
    n_chars     = sum(len(t.text) for t in tokens_words)

    sent_lengths = [len([t for t in s if t.is_alpha]) for s in sentences]
    word_lengths = [len(t.text) for t in tokens_words]
    avg_sent_len = float(np.mean(sent_lengths)) if sent_lengths else 0
    avg_word_len = float(np.mean(word_lengths)) if word_lengths else 0
    median_sent  = float(np.median(sent_lengths)) if sent_lengths else 0
    ttr = n_types / n_tokens if n_tokens > 0 else 0

    freq_counter = Counter(t.lemma_.lower() for t in tokens_words)
    freq_of_freq = Counter(freq_counter.values())
    M1 = sum(v * f for v, f in freq_of_freq.items())
    M2 = sum(v**2 * f for v, f in freq_of_freq.items())
    yules_k = 10000 * (M2 - M1) / (M1**2) if M1 > 0 else 0
    density = len(tokens_content) / n_tokens if n_tokens > 0 else 0

    surface = {
        "total_tokens":        n_tokens,
        "total_types":         n_types,
        "total_sentences":     n_sentences,
        "total_paragraphs":    n_paragraphs,
        "avg_sentence_length": round(avg_sent_len, 2),
        "median_sentence_len": round(median_sent, 2),
        "avg_word_length":     round(avg_word_len, 2),
        "type_token_ratio":    round(ttr, 4),
        "yules_k":             round(yules_k, 2),
        "lexical_density":     round(density, 4),
        "sentence_lengths":    sent_lengths,
        "word_lengths":        word_lengths,
    }

    # ── Legibilidade ─────────────────────────────────────────
    def count_syl(w):
        return max(1, dic.inserted(w).count("-") + 1)

    syllable_counts = [count_syl(t.text.lower()) for t in tokens_words]
    total_syl  = sum(syllable_counts)
    polysyl    = sum(1 for s in syllable_counts if s >= 3)
    ASL = avg_sent_len
    ASW = total_syl / n_tokens if n_tokens else 0
    pct_poly = (polysyl / n_tokens * 100) if n_tokens else 0

    flesch_pt  = round(206.835 - 1.015*ASL - 0.846*ASW*100/100, 2)
    gunning    = round(0.4*(ASL + pct_poly), 2)
    L = (n_chars / n_tokens * 100) if n_tokens else 0
    S = (n_sentences / n_tokens * 100) if n_tokens else 0
    coleman    = round(0.0588*L - 0.296*S - 15.8, 2)
    ari        = round(4.71*(n_chars/n_tokens if n_tokens else 0) + 0.5*ASL - 21.43, 2)

    def flesch_label(s):
        if s >= 75: return "Muito fácil"
        if s >= 60: return "Fácil"
        if s >= 45: return "Moderado"
        if s >= 30: return "Difícil"
        return "Muito difícil"

    readability = {
        "flesch_pt":             flesch_pt,
        "flesch_label":          flesch_label(flesch_pt),
        "gunning_fog":           gunning,
        "coleman_liau":          coleman,
        "ari":                   ari,
        "avg_syllables_per_word": round(ASW, 2),
        "pct_polysyllabic_words": round(pct_poly, 2),
    }

    # ── Morfossintaxe ────────────────────────────────────────
    POS_MAP = {"NOUN":"Substantivo","VERB":"Verbo","ADJ":"Adjetivo","ADV":"Advérbio",
               "PRON":"Pronome","DET":"Artigo/Det","ADP":"Preposição","CCONJ":"Conj. Coord.",
               "SCONJ":"Conj. Sub.","PROPN":"Nome Próprio","NUM":"Numeral",
               "PUNCT":"Pontuação","AUX":"Auxiliar"}

    pos_counts = dict(Counter(t.pos_ for t in tokens_all if not t.is_space))
    top_verbs  = dict(Counter(t.lemma_.lower() for t in tokens_words
                              if t.pos_=="VERB" and t.lemma_.lower() not in stop_pt).most_common(20))
    top_adjs   = dict(Counter(t.lemma_.lower() for t in tokens_words
                              if t.pos_=="ADJ").most_common(20))
    top_nouns  = dict(Counter(t.lemma_.lower() for t in tokens_words
                              if t.pos_=="NOUN" and t.lemma_.lower() not in stop_pt).most_common(20))

    morphosyntax = {
        "pos_distribution": pos_counts,
        "top_verbs":        top_verbs,
        "top_adjectives":   top_adjs,
        "top_nouns":        top_nouns,
    }

    # ── NER ──────────────────────────────────────────────────
    entities = [(e.text.strip(), e.label_) for e in doc.ents if len(e.text.strip()) > 1]
    persons  = [e[0] for e in entities if e[1] in ("PER","PERSON")]
    places   = [e[0] for e in entities if e[1] in ("LOC","GPE")]
    orgs     = [e[0] for e in entities if e[1] == "ORG"]
    ent_dist = dict(Counter(e[1] for e in entities))

    ner = {
        "top_persons":              dict(Counter(persons).most_common(20)),
        "top_places":               dict(Counter(places).most_common(15)),
        "entity_type_distribution": ent_dist,
    }

    # ── Sentimento ───────────────────────────────────────────
    print("Calculando sentimento...")
    sentiment_scores = [sia.polarity_scores(p)["compound"] for p in paragraphs]
    window   = max(3, len(sentiment_scores) // 20)
    smoothed = list(np.convolve(sentiment_scores, np.ones(window)/window, mode="valid"))
    avg_s    = float(np.mean(sentiment_scores)) if sentiment_scores else 0
    n_pos    = sum(1 for s in sentiment_scores if s > 0.05)
    n_neg    = sum(1 for s in sentiment_scores if s < -0.05)
    n_neu    = len(sentiment_scores) - n_pos - n_neg
    pk_pos   = int(np.argmax(sentiment_scores)) if sentiment_scores else 0
    pk_neg   = int(np.argmin(sentiment_scores)) if sentiment_scores else 0

    sentiment = {
        "avg_compound_sentiment":  round(avg_s, 4),
        "n_positive_paragraphs":   n_pos,
        "n_negative_paragraphs":   n_neg,
        "n_neutral_paragraphs":    n_neu,
        "peak_positive_paragraph": pk_pos,
        "peak_negative_paragraph": pk_neg,
        "sentiment_curve":         [round(s, 4) for s in sentiment_scores],
        "sentiment_curve_smooth":  [round(s, 4) for s in smoothed],
    }

    # ── Rede de personagens ───────────────────────────────────
    import networkx as nx
    person_freq = Counter(persons)
    valid_chars = {p for p, c in person_freq.items() if c >= 2}
    co_occur = Counter()
    for sent in sentences:
        chars_in = set(e.text.strip() for e in sent.ents
                       if e.label_ in ("PER","PERSON") and e.text.strip() in valid_chars)
        for pair in combinations(sorted(chars_in), 2):
            co_occur[pair] += 1

    G = nx.Graph()
    for ch, freq in person_freq.items():
        if ch in valid_chars:
            G.add_node(ch, weight=freq)
    for (a, b), w in co_occur.items():
        G.add_edge(a, b, weight=w)

    deg_cent  = nx.degree_centrality(G) if G.number_of_nodes() > 1 else {}
    between   = nx.betweenness_centrality(G, weight="weight") if G.number_of_nodes() > 1 else {}

    network = {
        "n_character_nodes":      G.number_of_nodes(),
        "n_edges":                G.number_of_edges(),
        "top_central_characters": dict(sorted(deg_cent.items(), key=lambda x:-x[1])[:10]),
        "betweenness_centrality": {k: round(v,4) for k,v in
                                   sorted(between.items(), key=lambda x:-x[1])[:10]},
        "edges": [{"source":u,"target":v,"weight":d["weight"]}
                  for u,v,d in G.edges(data=True)],
    }

    # ── Tópicos LDA ──────────────────────────────────────────
    from gensim import corpora, models
    print("Treinando LDA...")

    def para_tokens(p):
        d = nlp(p)
        return [t.lemma_.lower() for t in d
                if t.is_alpha and t.pos_ in ("NOUN","VERB","ADJ","PROPN")
                and t.lemma_.lower() not in stop_pt and len(t.lemma_) > 2]

    corpus_tokens = [para_tokens(p) for p in paragraphs if len(p) > 50]
    corpus_tokens = [t for t in corpus_tokens if t]

    NUM_TOPICS = 5
    topics_data, dominant_topics, topic_dist = [], [], {}

    if len(corpus_tokens) >= NUM_TOPICS:
        dictionary = corpora.Dictionary(corpus_tokens)
        dictionary.filter_extremes(no_below=2, no_above=0.85)
        bow_corpus = [dictionary.doc2bow(t) for t in corpus_tokens]
        lda = models.LdaModel(bow_corpus, num_topics=NUM_TOPICS,
                              id2word=dictionary, passes=15,
                              random_state=42, alpha="auto")
        for i in range(NUM_TOPICS):
            words = lda.show_topic(i, topn=10)
            topics_data.append({"id":i,"top_words":[(w,round(p,4)) for w,p in words]})
        for bow in bow_corpus:
            td = lda.get_document_topics(bow)
            dom = max(td, key=lambda x:x[1])[0] if td else -1
            dominant_topics.append(dom)
        topic_dist = dict(Counter(dominant_topics))

    topics = {
        "num_topics":                 NUM_TOPICS,
        "topics":                     topics_data,
        "dominant_topic_per_paragraph": dominant_topics,
        "topic_distribution":         {str(k):v for k,v in topic_dist.items()},
    }

    import datetime
    return convert_numpy({
        "meta": {
            "source_file": nome_arquivo,
            "analyzed_at": str(datetime.datetime.now()),
        },
        "surface":      surface,
        "readability":  readability,
        "morphosyntax": morphosyntax,
        "ner":          ner,
        "sentiment":    sentiment,
        "network":      network,
        "topics":       topics,
    })

# ── Endpoints ─────────────────────────────────────────────────
@app.get("/")
def root():
    return {"status": "ok", "service": "ACO Análise Literária"}

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/analisar")
async def analisar_endpoint(file: UploadFile = File(...)):
    conteudo = await file.read()
    if not conteudo:
        raise HTTPException(400, "Arquivo vazio")
    try:
        texto = extrair_texto(conteudo, file.filename)
    except ValueError as e:
        raise HTTPException(400, str(e))
    try:
        resultado = analisar(texto, file.filename)
        return resultado
    except Exception as e:
        raise HTTPException(500, f"Erro na análise: {str(e)}")

@app.get("/debug")
def debug_endpoint():
    import traceback
    try:
        texto = "Dipé caminhou pelo Promontório Silenciado. Aldric observava o horizonte. O mar estava calmo naquela manhã fria. Sefa preparava o café enquanto Korsano dormia ainda."
        resultado = analisar(texto, "debug.txt")
        return {"status": "ok", "keys": list(resultado.keys())}
    except Exception as e:
        return {"status": "error", "erro": str(e), "traceback": traceback.format_exc()}
