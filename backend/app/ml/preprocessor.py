import re
from typing import List
from app.config import settings

def clean_text(text: str) -> str:
    """Preprocess and clean input text."""
    if not text:
        return ""
    # Normalize multiple whitespaces and excessive newlines
    text = re.sub(r'\r\n|\r', '\n', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r'[ \t]{2,}', ' ', text)
    # Strip leading/trailing whitespaces
    return text.strip()

def chunk_text(text: str, max_words_per_chunk: int = 350, overlap_words: int = 50) -> List[str]:
    """
    Split long documents into overlapping semantic chunks based on paragraphs and sentences
    so transformer context length (e.g. 512 tokens) is never exceeded.
    """
    cleaned = clean_text(text)
    words = cleaned.split()
    
    if len(words) <= max_words_per_chunk:
        return [cleaned]
    
    # Split by paragraphs first
    paragraphs = [p.strip() for p in cleaned.split("\n\n") if p.strip()]
    chunks: List[str] = []
    current_chunk: List[str] = []
    current_word_count = 0
    
    for para in paragraphs:
        para_words = para.split()
        if current_word_count + len(para_words) <= max_words_per_chunk:
            current_chunk.append(para)
            current_word_count += len(para_words)
        else:
            if current_chunk:
                chunks.append("\n\n".join(current_chunk))
            
            # If a single paragraph is too large, break by sentences
            if len(para_words) > max_words_per_chunk:
                sentences = re.split(r'(?<=[.!?])\s+', para)
                sub_chunk: List[str] = []
                sub_count = 0
                for sent in sentences:
                    s_words = sent.split()
                    if sub_count + len(s_words) <= max_words_per_chunk:
                        sub_chunk.append(sent)
                        sub_count += len(s_words)
                    else:
                        if sub_chunk:
                            chunks.append(" ".join(sub_chunk))
                        sub_chunk = [sent]
                        sub_count = len(s_words)
                if sub_chunk:
                    current_chunk = sub_chunk
                    current_word_count = sub_count
                else:
                    current_chunk = []
                    current_word_count = 0
            else:
                current_chunk = [para]
                current_word_count = len(para_words)
                
    if current_chunk:
        chunks.append("\n\n".join(current_chunk))
        
    return chunks if chunks else [cleaned]
