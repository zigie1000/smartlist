import sys
from docx import Document

def generate_docx(input_file):
    with open(input_file, 'r') as f:
        text = f.read()
    doc = Document()
    doc.add_paragraph(text)
    doc.save('/tmp/agency-listing.docx')

if __name__ == "__main__":
    generate_docx(sys.argv[1])