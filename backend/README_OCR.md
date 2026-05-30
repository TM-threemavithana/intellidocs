# OCR Module (Week 2-3)

This module provides a minimal OCR service using `tesseract.js` and an upload endpoint for quick testing.

Endpoints
- `POST /ocr/upload` - multipart/form-data with `file` field and optional `lang` field (e.g., `eng`, `sin`, `tam`)

Example cURL
```bash
curl -F "file=@./sample.pdf" -F "lang=eng" http://localhost:3000/ocr/upload
```

Notes
- This is a scaffold for Week 2 work. We'll later move OCR processing to a Bull queue for async processing and per-page extraction.
- `tesseract.js` downloads language data on first run; ensure containers have internet access.

