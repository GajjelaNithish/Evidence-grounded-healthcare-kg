import os
import logging
from typing import Tuple
import pymupdf  # PyMuPDF

logger = logging.getLogger(__name__)

def extract_text_from_file(file_path: str) -> Tuple[str, str]:
    """
    Extracts plain text from PDF, TXT, or MD files.
    Falls back to OCR for scanned documents if pytesseract is installed.
    Returns (extracted_text, extraction_method).
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    ext = os.path.splitext(file_path)[1].lower()

    if ext in (".txt", ".md", ".csv"):
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            text = f.read()
        return text.strip(), "plain_text"

    elif ext == ".pdf":
        return _extract_from_pdf(file_path)

    elif ext in (".png", ".jpg", ".jpeg", ".tiff", ".bmp"):
        return _extract_from_image(file_path)

    else:
        raise ValueError(f"Unsupported file format: {ext}")

def _extract_from_pdf(pdf_path: str) -> Tuple[str, str]:
    doc = pymupdf.open(pdf_path)
    full_text = []
    total_pages = len(doc)
    scanned_pages = 0

    for page_num in range(total_pages):
        page = doc[page_num]
        text = page.get_text().strip()
        if len(text) < 30:
            scanned_pages += 1
        full_text.append(text)

    # If more than half the pages have almost no text, attempt OCR
    if total_pages > 0 and (scanned_pages / total_pages) > 0.5:
        logger.info(f"PDF {pdf_path} appears scanned ({scanned_pages}/{total_pages} low text). Attempting OCR...")
        ocr_text = _attempt_ocr_pdf(doc)
        if ocr_text:
            doc.close()
            return ocr_text, "pdf_ocr"

    doc.close()
    return "\n\n".join(full_text).strip(), "pdf_digital"

def _attempt_ocr_pdf(doc) -> str:
    try:
        import pytesseract
        from PIL import Image
        import io

        extracted = []
        for page_num in range(len(doc)):
            page = doc[page_num]
            pix = page.get_pixmap(dpi=200)
            img = Image.open(io.BytesIO(pix.tobytes()))
            page_text = pytesseract.image_to_string(img)
            extracted.append(page_text.strip())
        return "\n\n".join(extracted).strip()
    except Exception as e:
        logger.warning(f"OCR failed or pytesseract not configured: {e}")
        return ""

def _extract_from_image(img_path: str) -> Tuple[str, str]:
    try:
        import pytesseract
        from PIL import Image
        img = Image.open(img_path)
        text = pytesseract.image_to_string(img)
        return text.strip(), "image_ocr"
    except Exception as e:
        logger.warning(f"Image OCR failed: {e}")
        return f"[Image document uploaded: {os.path.basename(img_path)} - OCR unavailable]", "image_fallback"
