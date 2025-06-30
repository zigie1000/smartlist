import sys
import os
from docx import Document
from docx.shared import Inches
from docx.enum.text import WD_PARAGRAPH_ALIGNMENT

def generate_docx(input_file, output_file, logo_path=None, image_paths=[]):
    doc = Document()

    # Insert logo if provided
    if logo_path and os.path.exists(logo_path):
        doc.add_picture(logo_path, width=Inches(2.5))
        doc.paragraphs[-1].alignment = WD_PARAGRAPH_ALIGNMENT.CENTER
        doc.add_paragraph("")  # Spacer after logo

    # Add the listing text
    with open(input_file, 'r', encoding='utf-8') as f:
        text = f.read()
    doc.add_paragraph(text)
    doc.add_paragraph("")  # Spacer after text

    # Insert up to 3 property images
    image_count = 0
    for image_path in image_paths:
        if os.path.exists(image_path):
            try:
                doc.add_picture(image_path, width=Inches(5))
                doc.add_paragraph("")  # Spacer after image
                image_count += 1
                if image_count >= 3:
                    break
            except Exception as e:
                doc.add_paragraph(f"[Error loading image: {image_path}]")

    # Save the file
    doc.save(output_file)

if __name__ == "__main__":
    args = sys.argv[1:]
    if len(args) < 2:
        print("Usage: python script.py input.txt output.docx [logo_path] [image1 image2 image3...]")
    else:
        input_file = args[0]
        output_file = args[1]
        logo = args[2] if len(args) > 2 else None
        images = args[3:] if len(args) > 3 else []
        generate_docx(input_file, output_file, logo, images)
