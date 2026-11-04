"""AI layer: LLM wrapper, embeddings, vector store, chunking, language detection.

Provider-agnostic on purpose. Callers (`services/chat_service.py`) only use
`llm.generate`, `embeddings.embed_*`, `vector_store.*` and `language.detect`,
so a provider can be swapped here without touching the service or routes.
"""
