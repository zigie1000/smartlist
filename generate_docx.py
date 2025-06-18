import sys
from docx import Document

def generate_docx(input_file):
    # Read the text (including any “Agent:” line prepended by server.js)
    with open(input_file, 'r') as f:
        text = f.read()
    doc = Document()
    for line in text.split('\n'):
        doc.add_paragraph(line)
    # Save to the exact filename server.js will look for
    doc.save('/tmp/PromptAgentHQ_Listing.docx')

if __name__ == "__main__":
    generate_docx(sys.argv[1])
