import sys
import os
from docx import Document
from docx.shared import Inches
from docx.enum.text import WD_PARAGRAPH_ALIGNMENT

def generate_docx(input_file, logo_path=None, image_paths=[]):
    doc = Document()

    # Insert logo if provided
    if logo_path and os.path.exists(logo_path):
        logo = doc.add_picture(logo_path, width=Inches(2.5))
        last_paragraph = doc.paragraphs[-1]
        last_paragraph.alignment = WD_PARAGRAPH_ALIGNMENT.CENTER
        doc.add_paragraph()  # Add space after logo

    # Add the listing text
    with open(input_file, 'r', encoding='utf-8') as f:
        text = f.read()
    doc.add_paragraph(text)

    # Insert property images if provided
    if image_paths:
        doc.add_paragraph()  # Spacer
        doc.add_paragraph("Property Images:")
        for img_path in image_paths:
            if os.path.exists(img_path):
                doc.add_picture(img_path, width=Inches(3))
                doc.add_paragraph()  # Space between images

    doc.save("/tmp/PromptAgentHQ_Listing.docx")

if __name__ == "__main__":
    args = sys.argv[1:]
    input_file = args[0]
    logo = args[1] if len(args) > 1 else None
    images = args[2:] if len(args) > 2 else []
    generate_docx(input_file, logo, images)
