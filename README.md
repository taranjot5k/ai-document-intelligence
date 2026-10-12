# DocuMind — AI Document Intelligence Platform

An AI-powered document assistant that allows users to upload PDF documents and ask questions about their contents using a locally hosted language model.

## Features

- **PDF Upload & Processing:** Upload PDF documents and extract text for analysis.
- **AI-Powered Question Answering:** Ask natural-language questions about uploaded documents.
- **Retrieval-Augmented Generation (RAG):** Retrieve relevant document excerpts using TF-IDF and cosine similarity.
- **Document Summarization:** Identify key topics and generate summaries of uploaded documents.
- **Source References:** Display supporting PDF page numbers alongside AI-generated responses.
- **Local AI Inference:** Run the Llama 3.2 model locally through Ollama.
- **Interactive Interface:** Responsive chat interface built with React and TypeScript.

## Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | React, TypeScript, Vite, CSS |
| Backend | Python, FastAPI |
| AI Model | Llama 3.2 (3B), Ollama |
| Retrieval | TF-IDF, cosine similarity, scikit-learn |
| PDF Processing | PyMuPDF |
| Version Control | Git, GitHub |

## How It Works

1. A user uploads a PDF document.
2. The backend extracts the document's text and divides it into searchable chunks.
3. TF-IDF converts the chunks into numerical representations.
4. When the user asks a question, the application retrieves relevant document content.
5. The retrieved context and question are sent to the local language model.
6. The application displays the generated answer and supporting page references.

## Getting Started

### Prerequisites

- Python 3
- Node.js and npm
- Ollama
- Llama 3.2 (3B) installed through Ollama

### Backend

From the project root:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install fastapi uvicorn python-multipart pymupdf scikit-learn requests
python -m uvicorn main:app --reload --port 8000
```

### Local AI Model

```bash
ollama pull llama3.2:3b
ollama serve
```

If Ollama is already running, you do not need to start another instance.

### Frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL displayed by Vite, usually `http://localhost:5173`.

## Future Improvements

- Support for multiple uploaded documents
- Semantic retrieval using embeddings and a vector database
- Persistent document storage
- Automated testing and deployment

## Project Status

Active development — core PDF processing and AI question-answering functionality implemented.