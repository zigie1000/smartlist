import sys
from docx import Document

def generate_docx(input_file):
    with open(input_file, 'r', encoding='utf-8') as f:
        text = f.read()

    doc = Document()
    doc.add_paragraph(text)  # ✅ Use a single paragraph block
    doc.save('/tmp/PromptAgentHQ_Listing.docx')

if __name__ == "__main__":
    generate_docx(sys.argv[1])
