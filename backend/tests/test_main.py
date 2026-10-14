
import pymupdf
from fastapi.testclient import TestClient
from main import app
from unittest.mock import patch
import requests
import pytest
import main

client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_document_state():
    # Clear document data before each test
    main.document_chunks = []
    main.document_pages = []
    main.vectorizer = None
    main.document_vectors = None
    main.uploaded_pdf = None

    yield

    # Clear document data after each test
    main.document_chunks = []
    main.document_pages = []
    main.vectorizer = None
    main.document_vectors = None
    main.uploaded_pdf = None




def test_home():
    response = client.get("/")

    assert response.status_code == 200
    assert "message" in response.json()


def test_reject_non_pdf():
    response = client.post(
        "/upload",
        files={
            "file": (
                "notes.txt",
                b"This is a text file, not a PDF.",
                "text/plain"
            )
        }
    )

    assert response.status_code == 400


def test_upload_valid_pdf():
    # Create a PDF in memory
    pdf = pymupdf.open()
    page = pdf.new_page()

    page.insert_text(
        (72, 72),
        "DocuMind is an AI document intelligence platform."
    )

    pdf_bytes = pdf.tobytes()
    pdf.close()

    # Upload the PDF to FastAPI
    response = client.post(
        "/upload",
        files={
            "file": (
                "test.pdf",
                pdf_bytes,
                "application/pdf"
            )
        }
    )

    # Verify successful processing
    assert response.status_code == 200

    data = response.json()

    assert data["pages"] == 1
    assert data["characters"] > 0


def test_reject_oversized_pdf():
    # Create a file larger than 10 MB
    large_file = b"%PDF-1.4\n" + b"0" * (10 * 1024 * 1024)

    response = client.post(
        "/upload",
        files={
            "file": (
                "large.pdf",
                large_file,
                "application/pdf"
            )
        }
    )

    assert response.status_code == 413
    assert "10 MB" in response.json()["detail"]


def test_ask_question_with_mocked_ollama():
    # Create a sample PDF
    pdf = pymupdf.open()
    page = pdf.new_page()

    page.insert_text(
        (72, 72),
        "Python is a programming language used for software development."
    )

    pdf_bytes = pdf.tobytes()
    pdf.close()

    # Upload the PDF
    upload_response = client.post(
        "/upload",
        files={
            "file": (
                "python.pdf",
                pdf_bytes,
                "application/pdf"
            )
        }
    )

    assert upload_response.status_code == 200

    # Replace the real Ollama response with a fake response
    with patch("main.requests.post") as mock_post:
        mock_post.return_value.json.return_value = {
            "response": "Python is used for software development."
        }

        # Ask a question
        response = client.post(
            "/ask",
            json={
                "question": "What is Python used for?"
            }
        )

    # Verify the API response
    assert response.status_code == 200

    data = response.json()

    assert data["answer"] == (
        "Python is used for software development."
    )

    assert data["sources"] == [1]
    mock_post.assert_called_once()



def test_ollama_connection_failure():
    # Create a PDF for this test
    pdf = pymupdf.open()
    page = pdf.new_page()

    page.insert_text(
        (72, 72),
        "Python is used for software development."
    )

    pdf_bytes = pdf.tobytes()
    pdf.close()

    # Upload the PDF
    upload_response = client.post(
        "/upload",
        files={
            "file": (
                "test.pdf",
                pdf_bytes,
                "application/pdf"
            )
        }
    )

    assert upload_response.status_code == 200

    # Simulate Ollama being unavailable
    with patch("main.requests.post") as mock_post:
        mock_post.side_effect = requests.exceptions.ConnectionError(
            "Ollama is unavailable"
        )

        response = client.post(
            "/ask",
            json={
                "question": "What is Python used for?"
            }
        )

    assert response.status_code == 502

    assert response.json()["detail"] == (
        "Could not communicate with Ollama."
    )

    mock_post.assert_called_once()
