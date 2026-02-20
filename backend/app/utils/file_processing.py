"""
File Processing Utilities
Automatic compression for images (Pillow) and PDFs (pypdf).
Applied transparently after file upload to reduce storage.
"""

import os
import io
from PIL import Image
from app.utils.logger import get_logger

logger = get_logger(__name__)

# ── Configuration ──────────────────────────────────────────
IMAGE_MAX_DIMENSION = 1920       # Max width or height in pixels
IMAGE_QUALITY = 85               # JPEG quality (1-100)
IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff', '.tif'}
PDF_EXTENSIONS = {'.pdf'}


def is_compressible_image(filename):
    """Check if the file is a compressible image."""
    ext = os.path.splitext(filename or '')[1].lower()
    return ext in IMAGE_EXTENSIONS


def is_compressible_pdf(filename):
    """Check if the file is a PDF."""
    ext = os.path.splitext(filename or '')[1].lower()
    return ext in PDF_EXTENSIONS


def compress_image(file_path, max_dimension=IMAGE_MAX_DIMENSION, quality=IMAGE_QUALITY):
    """
    Compress an image file in place.
    - Resizes if any dimension exceeds max_dimension (maintains aspect ratio)
    - Converts to JPEG (except PNGs with transparency → keep as PNG)
    - Returns (original_size, new_size) tuple
    """
    try:
        original_size = os.path.getsize(file_path)

        with Image.open(file_path) as img:
            # Auto-rotate based on EXIF
            try:
                from PIL import ImageOps
                img = ImageOps.exif_transpose(img)
            except Exception:
                pass

            original_format = img.format
            has_alpha = img.mode in ('RGBA', 'LA', 'PA') or (
                img.mode == 'P' and 'transparency' in img.info
            )

            # Resize if needed
            w, h = img.size
            if w > max_dimension or h > max_dimension:
                ratio = min(max_dimension / w, max_dimension / h)
                new_size = (int(w * ratio), int(h * ratio))
                img = img.resize(new_size, Image.LANCZOS)
                logger.info(f"📐 Redimensionado: {w}x{h} → {new_size[0]}x{new_size[1]}")

            # Determine output format
            if has_alpha:
                # Keep PNG for transparency
                output_format = 'PNG'
                save_kwargs = {'optimize': True}
            else:
                # Convert to JPEG for max compression
                output_format = 'JPEG'
                if img.mode != 'RGB':
                    img = img.convert('RGB')
                save_kwargs = {'quality': quality, 'optimize': True}

            # Save compressed version
            buffer = io.BytesIO()
            img.save(buffer, format=output_format, **save_kwargs)
            compressed_data = buffer.getvalue()

            # Only replace if smaller
            if len(compressed_data) < original_size:
                # If format changed (e.g. PNG → JPEG), update extension
                new_ext = '.png' if output_format == 'PNG' else '.jpg'
                name_without_ext = os.path.splitext(file_path)[0]
                new_path = name_without_ext + new_ext

                # Write compressed file
                with open(new_path, 'wb') as f:
                    f.write(compressed_data)

                # Remove original if extension changed
                if new_path != file_path and os.path.exists(file_path):
                    os.remove(file_path)

                new_size = len(compressed_data)
                reduction = ((original_size - new_size) / original_size) * 100
                logger.info(
                    f"🗜️ Imagem comprimida: {_format_size(original_size)} → "
                    f"{_format_size(new_size)} (-{reduction:.0f}%)"
                )
                return new_path, original_size, new_size
            else:
                logger.info(f"📄 Imagem já optimizada, sem alteração ({_format_size(original_size)})")
                return file_path, original_size, original_size

    except Exception as e:
        logger.warning(f"⚠️ Erro ao comprimir imagem {file_path}: {e}")
        return file_path, 0, 0


def compress_pdf(file_path):
    """
    Compress a PDF file in place using pypdf.
    - Compresses content streams
    - Removes duplicate objects
    - Returns (original_size, new_size) tuple
    """
    try:
        from pypdf import PdfReader, PdfWriter
    except ImportError:
        logger.warning("⚠️ pypdf não instalado — PDF não comprimido")
        return file_path, 0, 0

    try:
        original_size = os.path.getsize(file_path)

        reader = PdfReader(file_path)
        writer = PdfWriter()

        for page in reader.pages:
            page.compress_content_streams()
            writer.add_page(page)

        # Copy metadata
        if reader.metadata:
            writer.add_metadata(reader.metadata)

        # Remove identical objects
        writer.compress_identical_objects(remove_identicals=True, remove_orphans=True)

        # Write to buffer first to compare sizes
        buffer = io.BytesIO()
        writer.write(buffer)
        compressed_data = buffer.getvalue()

        if len(compressed_data) < original_size:
            with open(file_path, 'wb') as f:
                f.write(compressed_data)

            new_size = len(compressed_data)
            reduction = ((original_size - new_size) / original_size) * 100
            logger.info(
                f"🗜️ PDF comprimido: {_format_size(original_size)} → "
                f"{_format_size(new_size)} (-{reduction:.0f}%)"
            )
            return file_path, original_size, new_size
        else:
            logger.info(f"📄 PDF já optimizado, sem alteração ({_format_size(original_size)})")
            return file_path, original_size, original_size

    except Exception as e:
        logger.warning(f"⚠️ Erro ao comprimir PDF {file_path}: {e}")
        return file_path, 0, 0


def process_uploaded_file(file_path, filename=None):
    """
    Main entry point: automatically compress file based on type.
    Returns (final_path, original_size, compressed_size).
    """
    if filename is None:
        filename = os.path.basename(file_path)

    if is_compressible_image(filename):
        return compress_image(file_path)
    elif is_compressible_pdf(filename):
        return compress_pdf(file_path)
    else:
        # Not compressible, return as-is
        size = os.path.getsize(file_path) if os.path.exists(file_path) else 0
        return file_path, size, size


def _format_size(size_bytes):
    """Format bytes to human-readable string."""
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    else:
        return f"{size_bytes / (1024 * 1024):.1f} MB"
